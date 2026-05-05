import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sky, Text } from "@react-three/drei";
import * as THREE from "three";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Users, Sword, Shield, Map } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type WorldPlayer = {
  id: string;
  username: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  color: string;
  character: string;
  hp: number;
  maxHp: number;
};

type ChatMsg = { username: string; text: string; id: number };

// ─── Constants ───────────────────────────────────────────────────────────────

const WORLD_SIZE = 120;
const MOVE_SPEED = 0.12;
const COLORS = ["#ff2d8c", "#3df7ff", "#ffe93d", "#39ff14", "#ff6b35", "#bd93f9"];

// ─── Ground ──────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[WORLD_SIZE, WORLD_SIZE, 32, 32]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

// ─── Grid lines on ground ────────────────────────────────────────────────────

function GridFloor() {
  return (
    <gridHelper
      args={[WORLD_SIZE, 48, "#ff2d8c", "#1e1e3a"]}
      position={[0, 0.01, 0]}
    />
  );
}

// ─── World border walls ───────────────────────────────────────────────────────

function BorderWalls() {
  const h = 8;
  const s = WORLD_SIZE / 2;
  const walls = [
    { pos: [0, h / 2, -s] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
    { pos: [0, h / 2, s] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number] },
    { pos: [-s, h / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number] },
    { pos: [s, h / 2, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number] },
  ];
  return (
    <>
      {walls.map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot} castShadow receiveShadow>
          <planeGeometry args={[WORLD_SIZE, h]} />
          <meshStandardMaterial color="#0d0d1a" side={THREE.BackSide} />
        </mesh>
      ))}
    </>
  );
}

// ─── Decorative structures ────────────────────────────────────────────────────

function Structures() {
  const structures = [
    // Central tower
    { pos: [0, 5, 0] as [number,number,number], size: [4, 10, 4] as [number,number,number], color: "#ff2d8c" },
    // Corner pillars
    { pos: [20, 3, 20] as [number,number,number], size: [3, 6, 3] as [number,number,number], color: "#3df7ff" },
    { pos: [-20, 3, 20] as [number,number,number], size: [3, 6, 3] as [number,number,number], color: "#3df7ff" },
    { pos: [20, 3, -20] as [number,number,number], size: [3, 6, 3] as [number,number,number], color: "#3df7ff" },
    { pos: [-20, 3, -20] as [number,number,number], size: [3, 6, 3] as [number,number,number], color: "#3df7ff" },
    // Side blocks
    { pos: [35, 2, 0] as [number,number,number], size: [5, 4, 8] as [number,number,number], color: "#ffe93d" },
    { pos: [-35, 2, 0] as [number,number,number], size: [5, 4, 8] as [number,number,number], color: "#ffe93d" },
    { pos: [0, 2, 35] as [number,number,number], size: [8, 4, 5] as [number,number,number], color: "#bd93f9" },
    { pos: [0, 2, -35] as [number,number,number], size: [8, 4, 5] as [number,number,number], color: "#bd93f9" },
  ];

  return (
    <>
      {structures.map((s, i) => (
        <mesh key={i} position={s.pos} castShadow receiveShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial
            color={s.color}
            emissive={s.color}
            emissiveIntensity={0.3}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      ))}
      {/* Floating neon rings */}
      <mesh position={[0, 8, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[6, 0.15, 16, 64]} />
        <meshStandardMaterial color="#ff2d8c" emissive="#ff2d8c" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4, 0.1, 16, 64]} />
        <meshStandardMaterial color="#3df7ff" emissive="#3df7ff" emissiveIntensity={2} />
      </mesh>
    </>
  );
}

// ─── Other players (visible avatars) ─────────────────────────────────────────

function OtherPlayer({ player }: { player: WorldPlayer }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group position={[player.x, player.y + 1, player.z]}>
      {/* Body */}
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
        <meshStandardMaterial
          color={player.color}
          emissive={player.color}
          emissiveIntensity={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Name tag */}
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.35}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="black"
      >
        {player.username}
      </Text>
      {/* HP bar background */}
      <mesh position={[0, 1.9, 0]}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      {/* HP bar fill */}
      <mesh position={[-(0.5 - (player.hp / player.maxHp) * 0.5), 1.9, 0.001]}>
        <planeGeometry args={[(player.hp / player.maxHp), 0.1]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>
      {/* Glow under feet */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color={player.color} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ─── First-person movement controller ────────────────────────────────────────

function PlayerController({
  onPositionUpdate,
  myColor,
}: {
  onPositionUpdate: (x: number, y: number, z: number, rx: number) => void;
  myColor: string;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const lastSent = useRef(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    const k = keys.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (k["KeyW"] || k["ArrowUp"]) camera.position.addScaledVector(forward, MOVE_SPEED);
    if (k["KeyS"] || k["ArrowDown"]) camera.position.addScaledVector(forward, -MOVE_SPEED);
    if (k["KeyA"] || k["ArrowLeft"]) camera.position.addScaledVector(right, -MOVE_SPEED);
    if (k["KeyD"] || k["ArrowRight"]) camera.position.addScaledVector(right, MOVE_SPEED);

    // Clamp to world
    const half = WORLD_SIZE / 2 - 2;
    camera.position.x = Math.max(-half, Math.min(half, camera.position.x));
    camera.position.z = Math.max(-half, Math.min(half, camera.position.z));
    camera.position.y = 1.7;

    // Throttle network updates to ~5/sec
    const now = Date.now();
    if (now - lastSent.current > 200) {
      lastSent.current = now;
      onPositionUpdate(
        camera.position.x,
        camera.position.y,
        camera.position.z,
        camera.rotation.y
      );
    }
  });

  return null;
}

// ─── Floating particles ───────────────────────────────────────────────────────

function Particles() {
  const count = 120;
  const positions = useRef(
    Float32Array.from({ length: count * 3 }, (_, i) => {
      const axis = i % 3;
      if (axis === 1) return Math.random() * 20 + 1;
      return (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    })
  );
  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#ff2d8c" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// ─── Main 3D scene ────────────────────────────────────────────────────────────

function WorldScene({
  myId,
  myUsername,
  myColor,
  otherPlayers,
  onPositionUpdate,
  onLockChange,
}: {
  myId: string;
  myUsername: string;
  myColor: string;
  otherPlayers: WorldPlayer[];
  onPositionUpdate: (x: number, y: number, z: number, rx: number) => void;
  onLockChange: (locked: boolean) => void;
}) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <Sky sunPosition={[0, 0.1, -1]} turbidity={12} rayleigh={0.5} mieCoefficient={0.015} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 8, 0]} intensity={3} color="#ff2d8c" distance={30} />
      <pointLight position={[20, 5, 20]} intensity={1.5} color="#3df7ff" distance={20} />
      <pointLight position={[-20, 5, -20]} intensity={1.5} color="#ffe93d" distance={20} />
      <fog attach="fog" args={["#0a0a1a", 20, 80]} />

      <Ground />
      <GridFloor />
      <BorderWalls />
      <Structures />
      <Particles />

      {otherPlayers.map((p) => (
        <OtherPlayer key={p.id} player={p} />
      ))}

      <PlayerController onPositionUpdate={onPositionUpdate} myColor={myColor} />
      <PointerLockControls
        ref={controlsRef}
        onLock={() => onLockChange(true)}
        onUnlock={() => onLockChange(false)}
      />
    </>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function HUD({
  username,
  color,
  onlineCount,
  hp,
  maxHp,
  chatMessages,
  onChat,
  locked,
  onClickToLock,
  onLeave,
}: {
  username: string;
  color: string;
  onlineCount: number;
  hp: number;
  maxHp: number;
  chatMessages: ChatMsg[];
  onChat: (msg: string) => void;
  locked: boolean;
  onClickToLock: () => void;
  onLeave: () => void;
}) {
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    onChat(t);
    setChatInput("");
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Crosshair */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80 -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Click to lock notice */}
      {!locked && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer"
          onClick={onClickToLock}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/80 border-2 border-primary px-8 py-6 text-center neon-box"
          >
            <p className="text-primary font-black uppercase tracking-widest text-lg">Click to Play</p>
            <p className="text-secondary font-mono text-xs uppercase mt-2">WASD to move · Mouse to look</p>
            <p className="text-white/40 font-mono text-[10px] uppercase mt-1">ESC to pause · T to chat</p>
          </motion.div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-auto">
        {/* Player info */}
        <div className="bg-black/70 border border-primary/50 px-3 py-2 space-y-1 neon-box">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-primary font-mono text-xs uppercase font-bold">{username}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-green-400" />
            <div className="flex-1 bg-black/50 rounded-full h-1.5 w-24">
              <div
                className="bg-green-400 h-full rounded-full transition-all"
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>
            <span className="text-green-400 font-mono text-[10px]">{hp}/{maxHp}</span>
          </div>
        </div>

        {/* Online count + leave */}
        <div className="flex gap-2">
          <div className="bg-black/70 border border-primary/50 px-3 py-2 flex items-center gap-2 neon-box">
            <Users className="w-3 h-3 text-secondary" />
            <span className="text-secondary font-mono text-xs uppercase">{onlineCount} online</span>
          </div>
          <button
            onClick={onLeave}
            className="bg-black/70 border border-red-500/50 px-3 py-2 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Bottom controls hint */}
      {locked && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <p className="text-white/30 font-mono text-[10px] uppercase tracking-widest">
            WASD · move &nbsp;|&nbsp; MOUSE · look &nbsp;|&nbsp; ESC · pause &nbsp;|&nbsp; T · chat
          </p>
        </div>
      )}

      {/* Chat */}
      <div className="absolute bottom-3 left-3 w-72 space-y-2 pointer-events-auto">
        <div
          ref={chatRef}
          className="bg-black/60 border border-primary/20 p-2 h-28 overflow-y-auto space-y-1 scrollbar-none"
        >
          {chatMessages.map((m) => (
            <div key={m.id} className="font-mono text-[10px] leading-tight">
              <span style={{ color: "#ff2d8c" }}>{m.username}: </span>
              <span className="text-white/80">{m.text}</span>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <p className="text-white/20 font-mono text-[10px] uppercase">No messages yet...</p>
          )}
        </div>
        {showChat ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { sendChat(); setShowChat(false); }
                if (e.key === "Escape") setShowChat(false);
              }}
              maxLength={100}
              placeholder="Type a message..."
              className="flex-1 bg-black border border-primary text-primary font-mono text-xs px-2 py-1 focus:outline-none uppercase placeholder:text-white/20"
            />
            <button
              onClick={() => { sendChat(); setShowChat(false); }}
              className="bg-primary text-black font-bold text-xs px-2 py-1 uppercase"
            >
              Send
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowChat(true)}
            className="text-white/30 font-mono text-[10px] uppercase hover:text-primary transition"
          >
            [T] Open chat
          </button>
        )}
      </div>

      {/* Mini map placeholder */}
      <div className="absolute bottom-3 right-3 w-24 h-24 border border-primary/40 bg-black/60 pointer-events-none">
        <div className="w-full h-full relative">
          <Map className="w-3 h-3 text-primary/30 absolute top-1 left-1" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main OGWorld page ────────────────────────────────────────────────────────

export default function OGWorld() {
  const [, setLocation] = useLocation();
  const [locked, setLocked] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<WorldPlayer[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load player info from sessionStorage (set by gate)
  const myId = sessionStorage.getItem("og_world_id") || "anon";
  const myUsername = sessionStorage.getItem("og_world_username") || "Citizen";
  const myColor = sessionStorage.getItem("og_world_color") || "#ff2d8c";
  const [hp] = useState(100);
  const maxHp = 100;

  // Realtime presence channel
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase.channel("og-world-presence", {
      config: { presence: { key: myId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<WorldPlayer>();
        const others: WorldPlayer[] = [];
        for (const [id, presences] of Object.entries(state)) {
          if (id === myId) continue;
          const p = presences[0] as WorldPlayer;
          if (p) others.push(p);
        }
        setOtherPlayers(others);
      })
      .on("broadcast", { event: "chat" }, ({ payload }: any) => {
        setChatMessages((prev) => [
          ...prev.slice(-40),
          { username: payload.username, text: payload.text, id: Date.now() },
        ]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: myId,
            username: myUsername,
            color: myColor,
            character: "default",
            x: 0,
            y: 1.7,
            z: 0,
            rx: 0,
            hp,
            maxHp,
          });
        }
      });

    channelRef.current = channel;
    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  // Also add system welcome message
  useEffect(() => {
    setChatMessages([
      { username: "System", text: `Welcome to OG World, ${myUsername}!`, id: 1 },
    ]);
  }, []);

  const handlePositionUpdate = useCallback(
    (x: number, y: number, z: number, rx: number) => {
      if (!channelRef.current) return;
      channelRef.current.track({
        id: myId,
        username: myUsername,
        color: myColor,
        character: "default",
        x, y, z, rx,
        hp,
        maxHp,
      });
    },
    [myId, myUsername, myColor, hp]
  );

  const handleChat = useCallback(
    (text: string) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "chat",
        payload: { username: myUsername, text },
      });
      setChatMessages((prev) => [
        ...prev.slice(-40),
        { username: myUsername, text, id: Date.now() },
      ]);
    },
    [myUsername]
  );

  const handleClickToLock = () => {
    if (canvasRef.current) {
      canvasRef.current.querySelector("canvas")?.requestPointerLock?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" ref={canvasRef}>
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.7, 5] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <WorldScene
            myId={myId}
            myUsername={myUsername}
            myColor={myColor}
            otherPlayers={otherPlayers}
            onPositionUpdate={handlePositionUpdate}
            onLockChange={setLocked}
          />
        </Suspense>
      </Canvas>

      <HUD
        username={myUsername}
        color={myColor}
        onlineCount={otherPlayers.length + 1}
        hp={hp}
        maxHp={maxHp}
        chatMessages={chatMessages}
        onChat={handleChat}
        locked={locked}
        onClickToLock={handleClickToLock}
        onLeave={() => setLocation("/world")}
      />
    </div>
  );
}
