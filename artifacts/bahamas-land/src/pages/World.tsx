import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import {
  KeyboardControls,
  useKeyboardControls,
  Text,
  Sky,
  OrbitControls,
  Billboard,
} from "@react-three/drei";
import * as THREE from "three";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useUsername, useCoins } from "@/lib/store";
import { useLetters, generateLetter } from "@/lib/inbox";

import m3kkyImg from "@assets/m3kky_1777028672745.png";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import postOfficeImg from "@assets/generated_images/bld_postoffice.png";
import palaceImg from "@/assets/postoffice/po_palace_building.png";
import studioImg from "@/assets/postoffice/po_studio_building.png";
import deadLetterImg from "@/assets/postoffice/po_deadletter_bin.png";
import mapImg from "@/assets/postoffice/po_map_ground.png";


/* ------------------------------------------------------------------ */
/*  Controls                                                          */
/* ------------------------------------------------------------------ */

const Controls = {
  forward: "forward",
  back: "back",
  left: "left",
  right: "right",
  run: "run",
  action: "action",
} as const;
type ControlsKey = (typeof Controls)[keyof typeof Controls];

const keyMap = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW", "KeyZ"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA", "KeyQ"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
  { name: Controls.run, keys: ["ShiftLeft", "ShiftRight"] },
  { name: Controls.action, keys: ["Space", "KeyE"] },
];

/* ------------------------------------------------------------------ */
/*  Game state (shared via refs to avoid per-frame re-renders)        */
/* ------------------------------------------------------------------ */

type TargetId = "nattoun" | "m3kky" | "bin";
type GameStatus = "ready" | "playing" | "over";

const TARGET_POSITIONS: Record<TargetId, [number, number, number]> = {
  nattoun: [-14, 0, -14],
  m3kky: [14, 0, -14],
  bin: [0, 0, -22],
};
const TARGET_LABEL: Record<TargetId, string> = {
  nattoun: "PALACE",
  m3kky: "STUDIO",
  bin: "DEAD LETTER BIN",
};

type Letter3D = {
  id: string;
  target: TargetId;
  pos: THREE.Vector3;
  rotY: number;
  pickedUp: boolean;
};

function randomTarget(): TargetId {
  const r = Math.random();
  if (r < 0.4) return "nattoun";
  if (r < 0.75) return "m3kky";
  return "bin";
}

/* ------------------------------------------------------------------ */
/*  Hand-drawn / sketchy material helpers                             */
/* ------------------------------------------------------------------ */

const PAPER = "#fffdf6";
const INK = "#111111";

function SketchOutline({
  args,
  scale = 1.04,
  color = INK,
}: {
  args: [number, number, number];
  scale?: number;
  color?: string;
}) {
  // back-face shell to fake an outline
  return (
    <mesh scale={scale}>
      <boxGeometry args={args} />
      <meshBasicMaterial color={color} side={THREE.BackSide} />
    </mesh>
  );
}

function SketchSphereOutline({ r, scale = 1.06 }: { r: number; scale?: number }) {
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[r, 18, 14]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  );
}

function PaperBox(props: {
  args: [number, number, number];
  position?: [number, number, number];
  color?: string;
  outline?: boolean;
}) {
  const { args, position = [0, 0, 0], color = PAPER, outline = true } = props;
  return (
    <group position={position}>
      {outline && <SketchOutline args={args} />}
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Image-based sprite (billboard) — characters & buildings          */
/* ------------------------------------------------------------------ */

function useSpriteTex(url: string) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  return tex;
}

/** Always-faces-camera image plane (Paper-Mario style). */
function SpriteBillboard({
  url,
  width,
  height,
  position = [0, 0, 0] as [number, number, number],
  bobAmp = 0,
  bobSpeed = 0,
}: {
  url: string;
  width: number;
  height: number;
  position?: [number, number, number];
  bobAmp?: number;
  bobSpeed?: number;
}) {
  const tex = useSpriteTex(url);
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    if (bobAmp > 0) {
      ref.current.position.y =
        position[1] + Math.abs(Math.sin(state.clock.getElapsedTime() * bobSpeed)) * bobAmp;
    }
  });
  return (
    <group ref={ref} position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            map={tex}
            transparent
            alphaTest={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
      {/* shadow blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2 + 0.02, 0]}>
        <circleGeometry args={[Math.max(0.4, width * 0.35), 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

/** Y-axis only billboard (flips left/right toward camera but stays upright).
 *  Good for buildings so they don't tilt when camera pitches. */
function FacadeBillboard({
  url,
  width,
  height,
  position = [0, 0, 0] as [number, number, number],
}: {
  url: string;
  width: number;
  height: number;
  position?: [number, number, number];
}) {
  const tex = useSpriteTex(url);
  return (
    <group position={position}>
      <Billboard follow lockX lockZ>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            map={tex}
            transparent
            alphaTest={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
function PostOfficeBuilding({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Image building */}
      <FacadeBillboard
        url={postOfficeImg}
        width={9}
        height={9}
        position={[0, 4.5, 0]} // center it properly
      />

      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[3.2, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Player — M3kky-style with walk/run animation                      */
/* ------------------------------------------------------------------ */

type PlayerHandle = {
  group: THREE.Group;
  isMoving: boolean;
  isRunning: boolean;
  carrying: Letter3D | null;
};

function PlayerCharacter({
  playerRef,
  onActionPress,
}: {
  playerRef: React.MutableRefObject<PlayerHandle | null>;
  onActionPress: (pos: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null!);
  const leftLeg = useRef<THREE.Mesh>(null!);
  const rightLeg = useRef<THREE.Mesh>(null!);
  const leftArm = useRef<THREE.Mesh>(null!);
  const rightArm = useRef<THREE.Mesh>(null!);
  const carriedRef = useRef<THREE.Group>(null!);

  const [, getControls] = useKeyboardControls<ControlsKey>();
  const velocity = useRef(new THREE.Vector3());
  const animTime = useRef(0);
  const facing = useRef(0); // radians around Y
  const lastAction = useRef(false);

  useEffect(() => {
    if (!group.current) return;
    if (!playerRef.current) {
      playerRef.current = {
        group: group.current,
        isMoving: false,
        isRunning: false,
        carrying: null,
      };
    } else {
      playerRef.current.group = group.current;
    }
  }, [playerRef]);

  useFrame((state, dt) => {
    if (!group.current) return;
    const c = getControls();
    const dir = new THREE.Vector3(
      (c.right ? 1 : 0) - (c.left ? 1 : 0),
      0,
      (c.back ? 1 : 0) - (c.forward ? 1 : 0)
    );
    const moving = dir.lengthSq() > 0.0001;
    const running = !!c.run && moving;
    const speed = running ? 9 : 5;

    if (moving) {
      dir.normalize();
      velocity.current.lerp(dir.multiplyScalar(speed), 0.25);
      facing.current = Math.atan2(dir.x, dir.z);
    } else {
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), 0.3);
    }

    // move
    group.current.position.x += velocity.current.x * dt;
    group.current.position.z += velocity.current.z * dt;
    // bounds (large field)
    group.current.position.x = THREE.MathUtils.clamp(group.current.position.x, -28, 28);
    group.current.position.z = THREE.MathUtils.clamp(group.current.position.z, -28, 22);

    // smooth rotation
    const cur = group.current.rotation.y;
    let diff = facing.current - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    group.current.rotation.y = cur + diff * 0.2;

    // walk/run animation
    const animSpeed = moving ? (running ? 14 : 9) : 0;
    animTime.current += dt * animSpeed;
    const swing = moving ? Math.sin(animTime.current) * (running ? 0.9 : 0.6) : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.8;

    // body bob
    const bob = moving ? Math.abs(Math.sin(animTime.current * 0.5)) * 0.08 : 0;
    group.current.position.y = bob;

    // action edge
    if (c.action && !lastAction.current) {
      onActionPress(group.current.position.clone());
    }
    lastAction.current = !!c.action;

    // expose state
    if (playerRef.current) {
      playerRef.current.isMoving = moving;
      playerRef.current.isRunning = running;
    }

    // carried envelope visual
    if (carriedRef.current) {
      carriedRef.current.visible = !!playerRef.current?.carrying;
    }
  });

  return (
    <group ref={group} position={[0, 0, 8]}>
      {/* shadow blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
      {/* legs */}
      <mesh ref={leftLeg} position={[-0.18, 0.45, 0]}>
        <boxGeometry args={[0.22, 0.9, 0.22]} />
        <meshToonMaterial color="#1d1d1d" />
      </mesh>
      <mesh ref={rightLeg} position={[0.18, 0.45, 0]}>
        <boxGeometry args={[0.22, 0.9, 0.22]} />
        <meshToonMaterial color="#1d1d1d" />
      </mesh>
      {/* torso (hoodie) */}
      <group position={[0, 1.25, 0]}>
        <SketchOutline args={[0.85, 0.95, 0.45]} />
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.95, 0.45]} />
          <meshToonMaterial color="#2b2b2b" />
        </mesh>
        {/* hoodie strings */}
        <mesh position={[-0.08, -0.3, 0.24]}>
          <boxGeometry args={[0.04, 0.18, 0.02]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
        <mesh position={[0.08, -0.3, 0.24]}>
          <boxGeometry args={[0.04, 0.18, 0.02]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      </group>
      {/* arms */}
      <mesh ref={leftArm} position={[-0.55, 1.45, 0]}>
        <boxGeometry args={[0.2, 0.85, 0.22]} />
        <meshToonMaterial color="#2b2b2b" />
      </mesh>
      <mesh ref={rightArm} position={[0.55, 1.45, 0]}>
        <boxGeometry args={[0.2, 0.85, 0.22]} />
        <meshToonMaterial color="#2b2b2b" />
      </mesh>
      {/* head */}
      <group position={[0, 2.05, 0]}>
        <SketchSphereOutline r={0.36} />
        <mesh castShadow>
          <sphereGeometry args={[0.36, 24, 18]} />
          <meshToonMaterial color="#e9c79a" />
        </mesh>
        {/* sunglasses */}
        <mesh position={[0, 0.04, 0.32]}>
          <boxGeometry args={[0.6, 0.13, 0.06]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        {/* hood back */}
        <mesh position={[0, 0.05, -0.18]}>
          <sphereGeometry args={[0.42, 24, 18]} />
          <meshToonMaterial color="#2b2b2b" />
        </mesh>
      </group>

      {/* carried envelope */}
      <group ref={carriedRef} position={[0, 1.45, 0.4]} rotation={[0.3, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.34, 0.04]} />
          <meshBasicMaterial color={PAPER} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[0.5, 0.34, 0.005]} />
          <meshBasicMaterial color="#000" wireframe />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Nattoun (dog) — wandering NPC                                     */
/* ------------------------------------------------------------------ */

function Nattoun({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Mesh>(null!);
  const front = useRef<THREE.Mesh>(null!);
  const back = useRef<THREE.Mesh>(null!);
  const wanderRef = useRef({ t: Math.random() * 10, target: new THREE.Vector3() });

  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    // gentle wander around base position
    wanderRef.current.t += dt;
    if (wanderRef.current.t > 2.5) {
      wanderRef.current.t = 0;
      wanderRef.current.target.set(
        position[0] + (Math.random() - 0.5) * 4,
        0,
        position[2] + (Math.random() - 0.5) * 4
      );
    }
    const targetPos = wanderRef.current.target;
    const dx = targetPos.x - group.current.position.x;
    const dz = targetPos.z - group.current.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.1) {
      const sp = 1.2;
      group.current.position.x += (dx / dist) * sp * dt;
      group.current.position.z += (dz / dist) * sp * dt;
      const yaw = Math.atan2(dx, dz);
      let diff = yaw - group.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.current.rotation.y += diff * 0.1;
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 8) * 0.6;
    const trot = Math.sin(t * 6) * 0.5;
    if (front.current) front.current.rotation.x = trot;
    if (back.current) back.current.rotation.x = -trot;
  });

  return (
    <group ref={group} position={position}>
      {/* shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} />
      </mesh>
      {/* body */}
      <group position={[0, 0.55, 0]}>
        <SketchOutline args={[1.4, 0.6, 0.7]} />
        <mesh castShadow>
          <boxGeometry args={[1.4, 0.6, 0.7]} />
          <meshToonMaterial color="#f0e6d0" />
        </mesh>
      </group>
      {/* sash */}
      <mesh position={[0, 0.55, 0.36]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[1.4, 0.18, 0.02]} />
        <meshBasicMaterial color="#c33" />
      </mesh>
      {/* head */}
      <group position={[0.7, 0.95, 0]}>
        <SketchSphereOutline r={0.42} />
        <mesh castShadow>
          <sphereGeometry args={[0.42, 24, 18]} />
          <meshToonMaterial color="#f0e6d0" />
        </mesh>
        {/* snout */}
        <mesh position={[0.32, -0.1, 0]}>
          <boxGeometry args={[0.32, 0.22, 0.28]} />
          <meshToonMaterial color="#f0e6d0" />
        </mesh>
        <mesh position={[0.5, -0.04, 0]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        {/* eyes */}
        <mesh position={[0.16, 0.12, 0.22]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <mesh position={[0.16, 0.12, -0.22]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        {/* ears */}
        <mesh position={[-0.08, 0.4, 0.22]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.16, 0.34, 0.18]} />
          <meshToonMaterial color="#d6c5a0" />
        </mesh>
        <mesh position={[-0.08, 0.4, -0.22]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.16, 0.34, 0.18]} />
          <meshToonMaterial color="#d6c5a0" />
        </mesh>
        {/* crown */}
        <mesh position={[0.05, 0.5, 0]}>
          <coneGeometry args={[0.25, 0.3, 6]} />
          <meshToonMaterial color="#ffd24a" />
        </mesh>
      </group>
      {/* legs */}
      <mesh ref={front} position={[0.45, 0.2, 0.25]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshToonMaterial color="#f0e6d0" />
      </mesh>
      <mesh position={[0.45, 0.2, -0.25]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshToonMaterial color="#f0e6d0" />
      </mesh>
      <mesh ref={back} position={[-0.5, 0.2, 0.25]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshToonMaterial color="#f0e6d0" />
      </mesh>
      <mesh position={[-0.5, 0.2, -0.25]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshToonMaterial color="#f0e6d0" />
      </mesh>
      {/* tail */}
      <mesh ref={tail} position={[-0.78, 0.7, 0]}>
        <boxGeometry args={[0.34, 0.12, 0.12]} />
        <meshToonMaterial color="#f0e6d0" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  M3kky NPC (the streamer at studio) — bobbing on stream            */
/* ------------------------------------------------------------------ */

function M3kkyNPC({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.position.y = Math.abs(Math.sin(t * 2)) * 0.1;
    group.current.rotation.y = Math.sin(t * 0.6) * 0.4;
  });
  return (
    <group ref={group} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.6, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} />
      </mesh>
      {/* legs */}
      <mesh position={[-0.2, 0.45, 0]}>
        <boxGeometry args={[0.22, 0.9, 0.22]} />
        <meshToonMaterial color={INK} />
      </mesh>
      <mesh position={[0.2, 0.45, 0]}>
        <boxGeometry args={[0.22, 0.9, 0.22]} />
        <meshToonMaterial color={INK} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.95, 1.0, 0.5]} />
        <meshToonMaterial color="#2b2b2b" />
      </mesh>
      {/* head */}
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.4, 24, 18]} />
        <meshToonMaterial color="#e9c79a" />
      </mesh>
      {/* sunglasses */}
      <mesh position={[0, 2.14, 0.36]}>
        <boxGeometry args={[0.7, 0.16, 0.06]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* mic */}
      <mesh position={[0.55, 1.7, 0.4]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0.85, 1.95, 0.45]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshToonMaterial color="#222" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Buildings & world dressing                                        */
/* ------------------------------------------------------------------ */

function Palace({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* base */}
      <PaperBox args={[6, 0.4, 6]} position={[0, 0.2, 0]} color="#fffdf6" />
      {/* main building */}
      <PaperBox args={[5, 3.2, 5]} position={[0, 2, 0]} color="#fffdf6" />
      {/* roof spire */}
      <mesh position={[0, 4.8, 0]}>
        <coneGeometry args={[2, 1.8, 4]} />
        <meshToonMaterial color={PAPER} />
      </mesh>
      {/* flag */}
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[0.06, 0.9, 0.06]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0.35, 6.4, 0]}>
        <boxGeometry args={[0.6, 0.36, 0.02]} />
        <meshBasicMaterial color="#c33" />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.2, 2.55]}>
        <boxGeometry args={[1.2, 2.2, 0.06]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* sign */}
      <Text
        position={[0, 4.2, 2.55]}
        fontSize={0.5}
        color={INK}
        anchorX="center"
        anchorY="middle"
      >
        PALACE
      </Text>
    </group>
  );
}

function Studio({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <PaperBox args={[5, 0.4, 5]} position={[0, 0.2, 0]} />
      <PaperBox args={[4.5, 3, 4.5]} position={[0, 1.9, 0]} />
      {/* big screen */}
      <mesh position={[0, 2.4, 2.3]}>
        <boxGeometry args={[3, 1.6, 0.06]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0, 2.4, 2.34]}>
        <boxGeometry args={[2.7, 1.4, 0.02]} />
        <meshBasicMaterial color="#3df7ff" />
      </mesh>
      {/* LIVE light */}
      <mesh position={[1.6, 3.4, 2.3]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshBasicMaterial color="#e11" />
      </mesh>
      <Text position={[0, 4.1, 2.3]} fontSize={0.45} color={INK} anchorX="center">
        STUDIO
      </Text>
    </group>
  );
}

function DeadLetterBin3D({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <PaperBox args={[2.4, 0.3, 2.4]} position={[0, 0.15, 0]} />
      <PaperBox args={[2, 2.6, 2]} position={[0, 1.6, 0]} color="#f3edd6" />
      {/* lid */}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[2.2, 0.2, 2.2]} />
        <meshToonMaterial color={INK} />
      </mesh>
      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        <meshToonMaterial color={INK} />
      </mesh>
      {/* skull tag */}
      <mesh position={[0, 1.8, 1.02]}>
        <sphereGeometry args={[0.32, 18, 14]} />
        <meshBasicMaterial color={PAPER} />
      </mesh>
      <mesh position={[-0.1, 1.85, 1.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0.1, 1.85, 1.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <Text position={[0, 4, 0]} fontSize={0.35} color={INK} anchorX="center">
        DEAD LETTERS
      </Text>
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 2, 8]} />
        <meshToonMaterial color={INK} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.9, 14, 10]} />
        <meshToonMaterial color={PAPER} />
      </mesh>
      <SketchSphereOutline r={0.9} />
    </group>
  );
}

function Trees() {
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      const r = 24 + Math.random() * 6;
      arr.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    }
    return arr;
  }, []);
  return (
    <>
      {positions.map((p, i) => (
        <Tree key={i} position={p} />
      ))}
    </>
  );
}

function MailTruck({ basePos = [-6, 0, 4] as [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.position.x = basePos[0] + Math.sin(t * 0.4) * 8;
    ref.current.rotation.y = Math.cos(t * 0.4) > 0 ? Math.PI / 2 : -Math.PI / 2;
  });
  return (
    <group ref={ref} position={basePos}>
      {/* body */}
      <PaperBox args={[2, 1, 1.2]} position={[0, 0.6, 0]} color="#ffd24a" />
      <PaperBox args={[1, 0.8, 1.2]} position={[0.7, 1.4, 0]} color="#ffd24a" />
      {/* wheels */}
      <mesh position={[-0.7, 0.25, 0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.18, 14]} />
        <meshToonMaterial color={INK} />
      </mesh>
      <mesh position={[0.7, 0.25, 0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.18, 14]} />
        <meshToonMaterial color={INK} />
      </mesh>
      <mesh position={[-0.7, 0.25, -0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.18, 14]} />
        <meshToonMaterial color={INK} />
      </mesh>
      <mesh position={[0.7, 0.25, -0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.18, 14]} />
        <meshToonMaterial color={INK} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Letters scattered in the world                                    */
/* ------------------------------------------------------------------ */

function LetterMesh({ letter }: { letter: Letter3D }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    if (letter.pickedUp) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const t = state.clock.getElapsedTime();
    ref.current.position.y = letter.pos.y + 0.3 + Math.sin(t * 2 + letter.rotY) * 0.15;
    ref.current.rotation.y += 0.01;
  });
  const colorByTarget = {
    nattoun: "#ffd24a",
    m3kky: "#3df7ff",
    bin: "#aaaaaa",
  }[letter.target];
  return (
    <group ref={ref} position={[letter.pos.x, letter.pos.y + 0.3, letter.pos.z]}>
      <mesh>
        <boxGeometry args={[0.7, 0.5, 0.06]} />
        <meshToonMaterial color={PAPER} />
      </mesh>
      {/* outline */}
      <mesh scale={1.05}>
        <boxGeometry args={[0.7, 0.5, 0.06]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {/* stamp */}
      <mesh position={[0.22, 0.12, 0.04]}>
        <boxGeometry args={[0.18, 0.18, 0.02]} />
        <meshBasicMaterial color={colorByTarget} />
      </mesh>
      {/* flap line */}
      <mesh position={[0, 0, 0.035]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.02, 0.005]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* glow ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]}>
        <ringGeometry args={[0.3, 0.45, 24]} />
        <meshBasicMaterial color={colorByTarget} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Follow camera                                                     */
/* ------------------------------------------------------------------ */

function FollowCamera({ playerRef }: { playerRef: React.MutableRefObject<PlayerHandle | null> }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(0, 8, 14));
  useFrame(() => {
    const p = playerRef.current?.group.position;
    if (!p) return;
    desired.current.set(p.x, p.y + 7, p.z + 11);
    camera.position.lerp(desired.current, 0.08);
    camera.lookAt(p.x, p.y + 1.2, p.z);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Game scene                                                        */
/* ------------------------------------------------------------------ */

function GameScene({
  status,
  onPickup,
  onDeliver,
  onMiss,
  letters,
  setLetters,
  playerRef,
}: {
  status: GameStatus;
  onPickup: (l: Letter3D) => void;
  onDeliver: (l: Letter3D, target: TargetId) => void;
  onMiss: () => void;
  letters: Letter3D[];
  setLetters: React.Dispatch<React.SetStateAction<Letter3D[]>>;
  playerRef: React.MutableRefObject<PlayerHandle | null>;
}) {
  const lastSpawn = useRef(0);
  const handlingAction = useRef(false);

  // spawn loop
  useFrame((state) => {
    if (status !== "playing") return;
    const t = state.clock.getElapsedTime();
    if (t - lastSpawn.current > 2.6) {
      lastSpawn.current = t;
      setLetters((prev) => {
        const live = prev.filter((l) => !l.pickedUp);
        if (live.length >= 5) return prev;
        const angle = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 12;
        const newLetter: Letter3D = {
          id: Math.random().toString(36).slice(2, 9),
          target: randomTarget(),
          pos: new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.6 - 4),
          rotY: Math.random() * Math.PI * 2,
          pickedUp: false,
        };
        return [...prev, newLetter];
      });
    }
  });

  const handleAction = (pos: THREE.Vector3) => {
    if (status !== "playing") return;
    if (handlingAction.current) return;
    handlingAction.current = true;
    setTimeout(() => (handlingAction.current = false), 120);

    const carrying = playerRef.current?.carrying;
    if (carrying) {
      // Try deliver — find nearest target
      let closest: TargetId | null = null;
      let bestDist = Infinity;
      (Object.keys(TARGET_POSITIONS) as TargetId[]).forEach((id) => {
        const tp = TARGET_POSITIONS[id];
        const d = Math.hypot(pos.x - tp[0], pos.z - tp[2]);
        if (d < bestDist) {
          bestDist = d;
          closest = id;
        }
      });
      if (closest && bestDist < 4.5) {
        onDeliver(carrying, closest);
        if (playerRef.current) playerRef.current.carrying = null;
      } else {
        // dropped / nothing nearby
        onMiss();
        if (playerRef.current) playerRef.current.carrying = null;
      }
    } else {
      // Try pickup
      const live = letters.filter((l) => !l.pickedUp);
      let target: Letter3D | null = null;
      let best = Infinity;
      for (const l of live) {
        const d = Math.hypot(pos.x - l.pos.x, pos.z - l.pos.z);
        if (d < best) {
          best = d;
          target = l;
        }
      }
      if (target && best < 1.6) {
        target.pickedUp = true;
        onPickup(target);
        if (playerRef.current) playerRef.current.carrying = target;
        setLetters((prev) => prev.map((x) => (x.id === target!.id ? { ...x, pickedUp: true } : x)));
      }
    }
  };

  return (
    <>
      <Sky sunPosition={[100, 30, 100]} turbidity={0.5} rayleigh={0.4} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ground (paper tone) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshToonMaterial color={PAPER} />
      </mesh>

      {/* Notebook grid lines */}
      <gridHelper args={[80, 40, "#cfd6e8", "#e6e3d6"]} position={[0, 0.01, 0]} />

      {/* Path / road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <ringGeometry args={[8, 9, 36]} />
        <meshBasicMaterial color="#ddd6b8" />
      </mesh>

      {/* Buildings */}
      <Palace position={TARGET_POSITIONS.nattoun} />
      <Studio position={TARGET_POSITIONS.m3kky} />
 <DeadLetterBin3D position={TARGET_POSITIONS.bin} />

      {/* Characters */}
      <Nattoun position={[TARGET_POSITIONS.nattoun[0] + 3, 0, TARGET_POSITIONS.nattoun[2] + 3]} />
      <M3kkyNPC position={[TARGET_POSITIONS.m3kky[0] - 3, 0, TARGET_POSITIONS.m3kky[2] + 3]} />

      {/* Decoration */}
      <Trees />
      <MailTruck />

      {/* Letters */}
      {letters.map((l) => (
        <LetterMesh key={l.id} letter={l} />
      ))}

      {/* Drop-zone discs around targets */}
      {(Object.keys(TARGET_POSITIONS) as TargetId[]).map((id) => {
        const p = TARGET_POSITIONS[id];
        return (
          <mesh
            key={id}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[p[0], 0.03, p[2] + 4.5]}
          >
            <ringGeometry args={[1.2, 2.2, 32]} />
            <meshBasicMaterial color={INK} transparent opacity={0.35} />
          </mesh>
        );
      })}

      {/* Player */}
      <PlayerCharacter playerRef={playerRef} onActionPress={handleAction} />
      <FollowCamera playerRef={playerRef} />

      {/* In-world labels */}
      <Text position={[TARGET_POSITIONS.nattoun[0], 6, TARGET_POSITIONS.nattoun[2] + 4]} fontSize={0.6} color={INK} anchorX="center">
        ◀ deliver to NATTOUN
      </Text>
      <Text position={[TARGET_POSITIONS.m3kky[0], 6, TARGET_POSITIONS.m3kky[2] + 4]} fontSize={0.6} color={INK} anchorX="center">
        deliver to M3KKY ▶
      </Text>
      <Text position={[TARGET_POSITIONS.bin[0], 5, TARGET_POSITIONS.bin[2] + 4]} fontSize={0.5} color={INK} anchorX="center">
        ↓ DUMP THE JUNK ↓
      </Text>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper with HUD                                             */
/* ------------------------------------------------------------------ */

export default function PostOffice() {
  const [username] = useUsername();
  const [coins, setCoins] = useCoins();
  const [letters, setLettersInbox] = useLetters();

  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);
  const [worldLetters, setWorldLetters] = useState<Letter3D[]>([]);
  const playerRef = useRef<PlayerHandle | null>(null);
  const finalizedRef = useRef(false);
  const [carryingTarget, setCarryingTarget] = useState<TargetId | null>(null);

  const start = () => {
    setScore(0);
    setDelivered(0);
    setMisses(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(60);
    setWorldLetters([]);
    setCarryingTarget(null);
    if (playerRef.current) {
      playerRef.current.carrying = null;
      playerRef.current.group.position.set(0, 0, 8);
      playerRef.current.group.rotation.y = 0;
    }
    finalizedRef.current = false;
    setStatus("playing");
  };

  // timer
  useEffect(() => {
    if (status !== "playing") return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, 60 - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        setStatus("over");
      }
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  // award on game over
  useEffect(() => {
    if (status !== "over" || finalizedRef.current) return;
    finalizedRef.current = true;
    const reward = Math.max(0, score) + bestCombo * 5;
    if (reward > 0) setCoins(coins + reward);
    if (score >= 30) {
      const l = generateLetter(username || "Citizen");
      l.subject = "Postal Service of Nattoun — Pay Stub";
      l.body =
        `Citizen ${username || "of Bahamas Land"},\n\n` +
        `Shift complete.\n` +
        `• Delivered: ${delivered}\n` +
        `• Best combo: x${bestCombo}\n` +
        `• Final score: ${score}\n` +
        `• Pay: ${reward} NC\n\n` +
        `The dog approves. Mostly.\n\n— Office of Inefficient Logistics`;
      l.stamp = "OFFICIAL";
      setLettersInbox([l, ...letters]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const showToast = (text: string, color: string) => {
    setToast({ text, color });
    setTimeout(() => setToast(null), 1100);
  };

  const handlePickup = (l: Letter3D) => {
    setCarryingTarget(l.target);
    showToast(`Picked up: TO ${l.target.toUpperCase()}`, "#3df7ff");
  };

  const handleDeliver = (l: Letter3D, target: TargetId) => {
    const correct = l.target === target;
    if (correct) {
      const base = 10;
      const bonus = combo * 2;
      const gain = base + bonus;
      setScore((s) => s + gain);
      setDelivered((n) => n + 1);
      setCombo((c) => {
        const nc = c + 1;
        setBestCombo((b) => Math.max(b, nc));
        return nc;
      });
      showToast(`+${gain}${bonus ? ` (x${combo + 1})` : ""}`, "#33ff66");
    } else {
      setScore((s) => Math.max(0, s - 5));
      setMisses((n) => n + 1);
      setCombo(0);
      showToast(`WRONG DOOR -5`, "#ff3355");
    }
    setCarryingTarget(null);
  };

  const handleMissPress = () => {
    setScore((s) => Math.max(0, s - 2));
    setCombo(0);
    showToast("DROPPED -2", "#aaaa55");
    setCarryingTarget(null);
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto py-2 select-none">
        <div className="text-center mb-3">
          <h1 className="text-2xl md:text-4xl font-black text-primary uppercase tracking-[0.25em] neon-text">
            Postal Service of Nattoun — 3D
          </h1>
          <p className="text-secondary text-xs md:text-sm font-mono uppercase tracking-widest mt-1 opacity-80">
            [ WASD / Arrows to move • SHIFT to run • SPACE to pick up & deliver ]
          </p>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-md border-2 border-primary"
          style={{ height: "min(74dvh, 680px)", touchAction: "none", boxShadow: "0 0 30px hsl(var(--primary)/0.25)" }}
        >
          <KeyboardControls map={keyMap}>
            <Canvas
              shadows
              dpr={[1, 1.6]}
              camera={{ position: [0, 9, 16], fov: 55, near: 0.1, far: 200 }}
              gl={{ antialias: true }}
              style={{ background: "linear-gradient(180deg,#fde7b3 0%,#fffdf6 60%,#f7f2dd 100%)" }}
            >
              <Suspense fallback={null}>
                <GameScene
                  status={status}
                  onPickup={handlePickup}
                  onDeliver={handleDeliver}
                  onMiss={handleMissPress}
                  letters={worldLetters}
                  setLetters={setWorldLetters}
                  playerRef={playerRef}
                />
              </Suspense>
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                enableRotate={false}
              />
            </Canvas>
          </KeyboardControls>

          {/* HUD */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between text-white pointer-events-none">
            <div className="bg-black/60 border border-primary px-3 py-1.5 font-mono text-sm">
              <div>SCORE: <b className="text-primary">{score}</b></div>
              {combo > 1 && <div className="text-secondary text-xs">combo x{combo}</div>}
            </div>
            <div className="bg-black/60 border border-primary px-3 py-1.5 font-mono text-sm">
              TIME: <b className="text-primary">{timeLeft}s</b>
            </div>
          </div>

          {/* Carrying badge */}
          {status === "playing" && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              {carryingTarget ? (
                <div className="bg-black/70 border border-primary px-4 py-1.5 font-mono text-sm uppercase tracking-widest text-primary">
                  📨 carrying: TO {carryingTarget} · press SPACE near the right door
                </div>
              ) : (
                <div className="bg-black/40 border border-secondary px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-secondary">
                  walk over a glowing letter & press SPACE to grab it
                </div>
              )}
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md font-black text-lg pointer-events-none"
              style={{
                background: "rgba(0,0,0,0.7)",
                color: toast.color,
                border: `2px solid ${toast.color}`,
                textShadow: "0 0 10px " + toast.color,
              }}
            >
              {toast.text}
            </div>
          )}

          {/* Ready overlay */}
          {status === "ready" && (
            <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center text-center p-6 text-primary">
              <h2 className="text-3xl md:text-5xl font-black neon-text mb-3 uppercase tracking-[0.2em]">
                Mailroom Shift
              </h2>
              <ul className="text-secondary font-mono text-sm md:text-base space-y-1 mb-6">
                <li>► Walk around with WASD or arrows · SHIFT to run</li>
                <li>► Step on a glowing envelope and tap SPACE to pick it up</li>
                <li>► Run to the right doorstep (Palace, Studio, or Bin)</li>
                <li>► SPACE again to deliver. 60 seconds, infinite anxiety.</li>
              </ul>
              <Button
                onClick={start}
                className="bg-primary text-black hover:bg-primary/80 text-lg px-8 py-6 font-black uppercase tracking-widest"
              >
                Start The Shift
              </Button>
              <p className="text-xs text-white/60 mt-3 font-mono">
                Citizen: {username || "anonymous"} · Balance: {coins} NC
              </p>
            </div>
          )}

          {/* Game over overlay */}
          {status === "over" && (
            <div className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center text-center p-6 text-primary">
              <h2 className="text-3xl md:text-5xl font-black neon-text mb-3 uppercase tracking-[0.2em]">
                Shift Over
              </h2>
              <div className="font-mono text-base text-secondary space-y-1 mb-4">
                <div>Final score: <b className="text-primary">{score}</b></div>
                <div>Delivered: {delivered} · Misses: {misses}</div>
                <div>Best combo: x{bestCombo}</div>
                <div className="text-green-400">+{Math.max(0, score) + bestCombo * 5} NC paid</div>
              </div>
              <Button
                onClick={start}
                className="bg-primary text-black hover:bg-primary/80 text-lg px-8 py-6 font-black uppercase tracking-widest"
              >
                Another Shift
              </Button>
              <p className="text-xs text-white/60 mt-3 font-mono">
                Score 30+ to receive a "thank you" letter in your Inbox.
              </p>
            </div>
          )}
        </div>

        {/* Mobile / fallback control hints */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Tip k="WASD / ↑↓←→" v="Move M3kky around the field" />
          <Tip k="SHIFT" v="Hold to run. The dog respects speed." />
          <Tip k="SPACE / E" v="Pick up · Deliver near a doorstep" />
        </div>
      </div>
    </Layout>
  );
}

function Tip({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-black/40 border border-secondary text-secondary px-3 py-2 font-mono uppercase tracking-wider">
      <div className="text-[11px] text-primary">{k}</div>
      <div className="text-[10px] opacity-80">{v}</div>
    </div>
  );
}
