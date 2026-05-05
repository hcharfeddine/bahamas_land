import {
  Suspense, useRef, useState, useEffect, useCallback, memo, useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sky, Text, Billboard, Cloud } from "@react-three/drei";
import * as THREE from "three";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Users, Compass } from "lucide-react";

import mapBg from "@assets/generated_images/bahamas_map_bg.png";

// ─── Types ───────────────────────────────────────────────────────────────────

type WorldPlayer = {
  id: string; username: string;
  x: number; y: number; z: number; rx: number;
  color: string; character: string; hp: number; maxHp: number;
};

type ChatMsg = { username: string; text: string; id: number };

type MonsterType = "troll" | "ghost" | "guard" | "spambot" | "iceling" | "slime";

type MonsterRuntime = {
  id: number;
  type: MonsterType;
  pos: THREE.Vector3;
  spawnPos: THREE.Vector3;
  hp: number;
  maxHp: number;
  alive: boolean;
  aggro: boolean;
  lastAttack: number;
  lastPatrolChange: number;
  patrolTarget: THREE.Vector3;
  floatOffset: number;
};

type DmgNumber = {
  id: number; x: number; y: number; val: number; crit: boolean; born: number;
};

type SkillDef = {
  key: string; label: string; color: string;
  dmgMult: number; range: number; cooldown: number; aoe: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const WORLD_SIZE = 200;
const HALF = WORLD_SIZE / 2;
const MOVE_SPEED = 8;
const SPRINT_MULT = 1.9;
const JUMP_FORCE = 7;
const GRAVITY = -18;
const PLAYER_H = 1.7;
const ATTACK_RANGE = 5;
const SKILL_RANGE = 20;
const AGGRO_RANGE = 15;
const MON_ATK_RANGE = 2.5;
const RESPAWN_TIME = 12000;

const MON_SPEED: Record<MonsterType, number> = {
  troll: 4.8, ghost: 2.8, guard: 3.5,
  spambot: 5.5, iceling: 2.2, slime: 3.8,
};
const MON_DMG: Record<MonsterType, number> = {
  troll: 8, ghost: 14, guard: 16,
  spambot: 6, iceling: 11, slime: 7,
};
const MON_HP: Record<MonsterType, number> = {
  troll: 60, ghost: 85, guard: 140,
  spambot: 45, iceling: 75, slime: 55,
};
const MON_COL: Record<MonsterType, [string, string]> = {
  troll:   ["#5a1a5a", "#ff2d8c"],
  ghost:   ["#1a3060", "#3df7ff"],
  guard:   ["#7a6000", "#ffd600"],
  spambot: ["#1a3a1a", "#39ff14"],
  iceling: ["#9ac8e8", "#c0e8ff"],
  slime:   ["#4a0080", "#bd93f9"],
};
const MON_XP: Record<MonsterType, number> = {
  troll: 15, ghost: 25, guard: 40,
  spambot: 12, iceling: 20, slime: 14,
};

const CLASS_SKILLS: Record<string, SkillDef[]> = {
  Tank: [
    { key: "Q", label: "Shield Bash",   color: "#90a4ae", dmgMult: 1.4, range: ATTACK_RANGE,   cooldown: 4,  aoe: false },
    { key: "E", label: "Shockwave",     color: "#607d8b", dmgMult: 0.9, range: ATTACK_RANGE+3, cooldown: 8,  aoe: true  },
    { key: "R", label: "Iron Fortress", color: "#cfd8dc", dmgMult: 2.5, range: ATTACK_RANGE+2, cooldown: 20, aoe: true  },
  ],
  Assassin: [
    { key: "Q", label: "Backstab",    color: "#7c4dff", dmgMult: 2.2, range: ATTACK_RANGE,   cooldown: 5,  aoe: false },
    { key: "E", label: "Shadow Step", color: "#4a0080", dmgMult: 1.5, range: SKILL_RANGE,    cooldown: 10, aoe: false },
    { key: "R", label: "Death Mark",  color: "#e040fb", dmgMult: 3.5, range: ATTACK_RANGE,   cooldown: 25, aoe: false },
  ],
  Mage: [
    { key: "Q", label: "Fireball",    color: "#ff6d00", dmgMult: 1.8, range: SKILL_RANGE,   cooldown: 3,  aoe: false },
    { key: "E", label: "Blizzard",    color: "#80d8ff", dmgMult: 1.2, range: SKILL_RANGE-4, cooldown: 10, aoe: true  },
    { key: "R", label: "Arcane Nuke", color: "#aa00ff", dmgMult: 4.0, range: SKILL_RANGE,   cooldown: 28, aoe: true  },
  ],
  Ranger: [
    { key: "Q", label: "Arrow Shot",     color: "#76c442", dmgMult: 1.6, range: SKILL_RANGE+5, cooldown: 3,  aoe: false },
    { key: "E", label: "Rain of Arrows", color: "#388e3c", dmgMult: 1.0, range: SKILL_RANGE,   cooldown: 12, aoe: true  },
    { key: "R", label: "Eagle Strike",   color: "#b8ff59", dmgMult: 3.2, range: SKILL_RANGE+8, cooldown: 22, aoe: false },
  ],
  Berserker: [
    { key: "Q", label: "Whirlwind",      color: "#ff3d00", dmgMult: 1.3, range: ATTACK_RANGE+2, cooldown: 6,  aoe: true  },
    { key: "E", label: "Bloodthirst",    color: "#b71c1c", dmgMult: 1.8, range: ATTACK_RANGE,   cooldown: 10, aoe: false },
    { key: "R", label: "Berserker Rage", color: "#ff6e40", dmgMult: 3.8, range: ATTACK_RANGE+3, cooldown: 30, aoe: true  },
  ],
  Paladin: [
    { key: "Q", label: "Holy Strike",  color: "#ffd600", dmgMult: 1.5, range: ATTACK_RANGE,   cooldown: 4,  aoe: false },
    { key: "E", label: "Consecration", color: "#ffab00", dmgMult: 1.0, range: ATTACK_RANGE+3, cooldown: 12, aoe: true  },
    { key: "R", label: "Divine Wrath", color: "#fff9c4", dmgMult: 3.0, range: SKILL_RANGE,    cooldown: 24, aoe: true  },
  ],
};
const DEFAULT_SKILLS = CLASS_SKILLS.Tank;

const SPAWN_LIST: { id: number; type: MonsterType; x: number; z: number }[] = [
  { id: 1,  type: "guard",   x:  24,  z:  6  },
  { id: 2,  type: "guard",   x: -24,  z:  6  },
  { id: 3,  type: "guard",   x:   6,  z: -26 },
  { id: 4,  type: "guard",   x:  -6,  z:  26 },
  { id: 5,  type: "troll",   x:  58,  z: -18 },
  { id: 6,  type: "troll",   x:  68,  z:  6  },
  { id: 7,  type: "troll",   x:  62,  z:  34 },
  { id: 8,  type: "troll",   x:  75,  z: -38 },
  { id: 9,  type: "ghost",   x: -50,  z: -46 },
  { id: 10, type: "ghost",   x: -62,  z: -58 },
  { id: 11, type: "ghost",   x: -42,  z: -62 },
  { id: 12, type: "spambot", x: -50,  z:  48 },
  { id: 13, type: "spambot", x: -62,  z:  57 },
  { id: 14, type: "spambot", x: -54,  z:  38 },
  { id: 15, type: "iceling", x:   2,  z: -54 },
  { id: 16, type: "iceling", x:  22,  z: -62 },
  { id: 17, type: "iceling", x: -16,  z: -68 },
  { id: 18, type: "slime",   x:  50,  z:  52 },
  { id: 19, type: "slime",   x:  62,  z:  60 },
  { id: 20, type: "slime",   x:  56,  z:  70 },
];

function makeMonster(def: typeof SPAWN_LIST[0]): MonsterRuntime {
  const sp = new THREE.Vector3(def.x, 0, def.z);
  return {
    id: def.id, type: def.type,
    pos: sp.clone(), spawnPos: sp.clone(),
    hp: MON_HP[def.type], maxHp: MON_HP[def.type],
    alive: true, aggro: false,
    lastAttack: 0, lastPatrolChange: 0, floatOffset: Math.random() * Math.PI * 2,
    patrolTarget: sp.clone().add(new THREE.Vector3(
      (Math.random()-0.5)*10, 0, (Math.random()-0.5)*10,
    )),
  };
}

function getZone(x: number, z: number) {
  const ax = Math.abs(x), az = Math.abs(z);
  if (ax < 28 && az < 28) return "city";
  if (x < -28 && z < -28) return "exile";
  if (z < -28 && x >= -28 && x < 40) return "banned";
  if (x > 40 && z < 30) return "troll";
  if (z > 30 && x > 14) return "stream";
  if (x < -28 && z > 28) return "spam";
  return "grassland";
}

const ZONE_INFO: Record<string, { name: string; color: string; danger: string }> = {
  city:      { name: "Bahamas City",      color: "#ffd600", danger: "Safe Zone"    },
  exile:     { name: "The Exile Forest",  color: "#3df7ff", danger: "Danger Lv.3" },
  banned:    { name: "Banned Tundra",     color: "#80d8ff", danger: "Danger Lv.3" },
  troll:     { name: "Troll Dimension",   color: "#ff2d8c", danger: "Danger Lv.5" },
  stream:    { name: "Stream Colosseum",  color: "#bd93f9", danger: "Danger Lv.4" },
  spam:      { name: "Spam Swamp",        color: "#39ff14", danger: "Danger Lv.3" },
  grassland: { name: "Bahamas Plains",    color: "#76c442", danger: "Danger Lv.1" },
};

// ─── TERRAIN HEIGHT FUNCTION ─────────────────────────────────────────────────

function getTerrainHeight(x: number, z: number): number {
  // Base gentle rolling hills
  let h = Math.sin(x * 0.09) * Math.cos(z * 0.08) * 1.8
        + Math.sin(x * 0.05 + z * 0.07) * 2.2
        + Math.cos(x * 0.13 + z * 0.11) * 0.9;

  // City center — flat ground
  const cityDist = Math.max(Math.abs(x), Math.abs(z));
  if (cityDist < 34) h *= 0.05;
  else if (cityDist < 44) h *= (cityDist - 34) / 10;

  // Tundra — elevated icy plateau
  if (z < -40 && x > -40 && x < 40) {
    const strength = Math.min(1, (-z - 40) / 30);
    h += strength * 5;
  }

  // Troll zone — cracked dark lowlands with spires
  if (x > 42) {
    h -= 1.5;
    h += Math.sin(x * 0.3) * Math.sin(z * 0.25) * 0.8;
  }

  // Exile forest — uneven hilly ground
  if (x < -35 && z < -35) {
    h += Math.sin(x * 0.2 + z * 0.15) * 2.5;
  }

  // Swamp — sunken boggy terrain
  if (x < -30 && z > 30) {
    h -= 2;
    h += Math.sin(x * 0.25) * Math.cos(z * 0.2) * 0.8;
  }

  // Border mountains — dramatic ranges at edges
  const bx = Math.abs(x) - 72;
  const bz = Math.abs(z) - 72;
  if (bx > 0) h += bx * bx * 0.12 + Math.sin(z * 0.3) * 3;
  if (bz > 0) h += bz * bz * 0.12 + Math.sin(x * 0.3) * 3;

  return h;
}

// ─── WORLD TERRAIN (vertex-colored heightmap) ────────────────────────────────

const WorldTerrain = memo(function WorldTerrain() {
  const geo = useMemo(() => {
    const segs = 120;
    const g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // PlaneGeometry before rotation: XY plane
      const h = getTerrainHeight(x, z);
      pos.setZ(i, h);

      // Zone-based vertex colors
      let r = 0.28, gv = 0.58, b = 0.14; // default grass

      const cityDist = Math.max(Math.abs(x), Math.abs(z));

      if (Math.abs(x) > 75 || Math.abs(z) > 75) {
        // Mountain rock
        const snow = (Math.abs(x) > 88 || Math.abs(z) > 88) ? 1 : 0;
        r = snow ? 0.95 : 0.52; gv = snow ? 0.97 : 0.50; b = snow ? 1.0 : 0.46;
      } else if (cityDist < 36) {
        // Cobblestone city center
        r = 0.52; gv = 0.48; b = 0.44;
      } else if (x < -35 && z < -35) {
        // Exile dark forest floor
        r = 0.06; gv = 0.16; b = 0.04;
      } else if (z < -40 && x > -38 && x < 42) {
        // Tundra snow
        r = 0.88; gv = 0.93; b = 0.98;
      } else if (x > 42) {
        // Troll cursed ground
        r = 0.08; gv = 0.03; b = 0.12;
      } else if (x > 20 && z > 32) {
        // Stream arena
        r = 0.14; gv = 0.06; b = 0.22;
      } else if (x < -28 && z > 28) {
        // Swamp boggy
        r = 0.06; gv = 0.20; b = 0.04;
      } else {
        // Grassy plains with subtle variation
        const noise = Math.sin(x * 0.4 + z * 0.3) * 0.04;
        r = 0.22 + noise; gv = 0.52 + noise * 1.5; b = 0.12;
      }

      // Add height-based snow on mountains
      if (h > 16) { r = 0.95; gv = 0.97; b = 1.0; }
      else if (h > 10) {
        const blend = (h - 10) / 6;
        r = r + (0.72 - r) * blend;
        gv = gv + (0.72 - gv) * blend;
        b = b + (0.75 - b) * blend;
      }

      colors.push(r, gv, b);
    }

    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={geo}>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
    </mesh>
  );
});

// ─── ANIMATED WATER ──────────────────────────────────────────────────────────

function AnimatedWater({ pos, w, d, color = "#2a6a9a" }: {
  pos: [number, number, number]; w: number; d: number; color?: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = pos[1] + Math.sin(s.clock.elapsedTime * 0.8) * 0.04;
      (ref.current.material as THREE.MeshStandardMaterial).opacity =
        0.72 + Math.sin(s.clock.elapsedTime * 1.2) * 0.05;
    }
  });
  return (
    <mesh ref={ref} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d, 4, 4]} />
      <meshStandardMaterial color={color} roughness={0.05} metalness={0.3}
        transparent opacity={0.72} />
    </mesh>
  );
}

// ─── LOW-POLY PINE TREE (instanced) ──────────────────────────────────────────

function PineTreeInstanced({ positions, scale = 1, leafColor = "#2e7a1a", trunkColor = "#5c3a1a" }: {
  positions: [number, number, number][];
  scale?: number;
  leafColor?: string;
  trunkColor?: string;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const cone1Ref = useRef<THREE.InstancedMesh>(null);
  const cone2Ref = useRef<THREE.InstancedMesh>(null);
  const cone3Ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    positions.forEach(([x, y, z], i) => {
      const s = scale * (0.8 + Math.sin(i * 2.1) * 0.25);
      const rot = (i * 1.37) % (Math.PI * 2);

      // Trunk
      dummy.position.set(x, y + 1.0 * s, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);

      // Cone layers at different heights
      [0, 1, 2].forEach((ci, ri) => {
        const refs = [cone1Ref, cone2Ref, cone3Ref];
        dummy.position.set(x, y + (2.2 + ci * 1.5) * s, z);
        dummy.rotation.set(0, rot + ci * 0.5, 0);
        dummy.scale.set(s * (1.0 - ci * 0.08), s * (1.0 - ci * 0.08), s * (1.0 - ci * 0.08));
        dummy.updateMatrix();
        refs[ri].current?.setMatrixAt(i, dummy.matrix);
      });
    });
    [trunkRef, cone1Ref, cone2Ref, cone3Ref].forEach(r => {
      if (r.current) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); }
    });
  }, [positions, scale]);

  const count = positions.length;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 2.0, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={cone1Ref} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1.8, 2.4, 7]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={cone2Ref} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1.4, 2.0, 7]} />
        <meshStandardMaterial color={new THREE.Color(leafColor).multiplyScalar(1.1).getStyle()} roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={cone3Ref} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1.0, 1.6, 7]} />
        <meshStandardMaterial color={new THREE.Color(leafColor).multiplyScalar(1.2).getStyle()} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

// ─── DEAD TREE (instanced, for exile/troll) ───────────────────────────────────

function DeadTreeInstanced({ positions, scale = 1 }: {
  positions: [number, number, number][]; scale?: number;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const br1Ref = useRef<THREE.InstancedMesh>(null);
  const br2Ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    positions.forEach(([x, y, z], i) => {
      const s = scale * (0.75 + Math.sin(i * 1.77) * 0.3);
      const rot = i * 2.3;

      dummy.position.set(x, y + 3.5 * s, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + Math.cos(rot) * 1.2 * s, y + 3.0 * s, z + Math.sin(rot) * 1.2 * s);
      dummy.rotation.set(0.4, rot, 0.3);
      dummy.scale.set(s * 0.7, s * 0.7, s * 0.7);
      dummy.updateMatrix();
      br1Ref.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x - Math.cos(rot) * 1.1 * s, y + 4.2 * s, z - Math.sin(rot) * 1.1 * s);
      dummy.rotation.set(-0.35, rot + 1.1, -0.25);
      dummy.scale.set(s * 0.6, s * 0.6, s * 0.6);
      dummy.updateMatrix();
      br2Ref.current?.setMatrixAt(i, dummy.matrix);
    });
    [trunkRef, br1Ref, br2Ref].forEach(r => {
      if (r.current) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); }
    });
  }, [positions, scale]);

  const count = positions.length;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.18, 0.32, 7, 5]} />
        <meshStandardMaterial color="#1a1218" roughness={0.98} />
      </instancedMesh>
      <instancedMesh ref={br1Ref} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.08, 0.14, 2.8, 4]} />
        <meshStandardMaterial color="#0e0c16" roughness={0.98} />
      </instancedMesh>
      <instancedMesh ref={br2Ref} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.07, 0.12, 2.4, 4]} />
        <meshStandardMaterial color="#0e0c16" roughness={0.98} />
      </instancedMesh>
    </group>
  );
}

// ─── ROCK INSTANCED ──────────────────────────────────────────────────────────

function RockInstanced({ positions, color = "#7a7870" }: {
  positions: [number, number, number][]; color?: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new THREE.Object3D();
    positions.forEach(([x, y, z], i) => {
      const s = 0.5 + Math.sin(i * 3.1) * 0.35;
      dummy.position.set(x, y + s * 0.5, z);
      dummy.rotation.set(Math.sin(i) * 0.4, i * 1.2, Math.cos(i) * 0.3);
      dummy.scale.set(s, s * 0.8, s * 1.1);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); }
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} castShadow>
      <dodecahedronGeometry args={[0.65, 0]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </instancedMesh>
  );
}

// ─── LAMP POST ───────────────────────────────────────────────────────────────

function LampPost({ pos, color = "#ffd070" }: { pos: [number, number, number]; color?: string }) {
  const h = getTerrainHeight(pos[0], pos[2]);
  return (
    <group position={[pos[0], h, pos[2]]}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 5, 6]} />
        <meshStandardMaterial color="#444" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.6, 5.0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 5]} />
        <meshStandardMaterial color="#444" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.6, 5.6, 0]}>
        <sphereGeometry args={[0.24, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0.6, 5.4, 0]} intensity={1.8} color={color} distance={14} />
    </group>
  );
}

// ─── WOOD SIGN ───────────────────────────────────────────────────────────────

function WoodSign({ pos, text, textColor = "#eee" }: {
  pos: [number, number, number]; text: string; textColor?: string;
}) {
  const h = getTerrainHeight(pos[0], pos[2]);
  return (
    <group position={[pos[0], h, pos[2]]}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 2.8, 5]} />
        <meshStandardMaterial color="#6b4a1e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[3.0, 1.1, 0.18]} />
        <meshStandardMaterial color="#8b5e28" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.12, 0.7, 0.22]} />
        <meshStandardMaterial color="#6b4a1e" roughness={0.95} />
      </mesh>
      <Billboard position={[0, 2.8, 0.15]}>
        <Text fontSize={0.38} color={textColor} outlineWidth={0.03} outlineColor="#000" anchorX="center">{text}</Text>
      </Billboard>
    </group>
  );
}

// ─── FOUNTAIN ────────────────────────────────────────────────────────────────

function CityFountain() {
  const waterRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (waterRef.current) {
      waterRef.current.rotation.y = s.clock.elapsedTime * 0.5;
      (waterRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(s.clock.elapsedTime * 2.2) * 0.5;
    }
  });
  return (
    <group position={[0, 0, 0]}>
      {/* Outer basin */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.8, 0.6, 14]} />
        <meshStandardMaterial color="#6a5a48" roughness={0.7} />
      </mesh>
      {/* Inner basin */}
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <cylinderGeometry args={[3.8, 3.8, 0.15, 14]} />
        <meshStandardMaterial color="#2a6a9a" roughness={0.05} metalness={0.3} transparent opacity={0.8} />
      </mesh>
      {/* Center pillar */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.38, 1.8, 8]} />
        <meshStandardMaterial color="#7a6a58" roughness={0.6} />
      </mesh>
      {/* Water sphere */}
      <mesh ref={waterRef} position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.6, 10, 10]} />
        <meshStandardMaterial color="#60ddff" emissive="#1090c0" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
      {/* Water jets */}
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.8, 1.0, Math.sin(a) * 1.8]} rotation={[0.5, a, 0]}>
            <cylinderGeometry args={[0.04, 0.08, 0.9, 4]} />
            <meshStandardMaterial color="#80e8ff" transparent opacity={0.7} emissive="#40a0d0" emissiveIntensity={1} />
          </mesh>
        );
      })}
      <pointLight position={[0, 2, 0]} intensity={3} color="#40c0ff" distance={20} />
    </group>
  );
}

// ─── NATTOUN PALACE (grand fantasy architecture) ──────────────────────────────

function NattounPalace() {
  const flagRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (flagRef.current) {
      flagRef.current.rotation.z = Math.sin(s.clock.elapsedTime * 2.5) * 0.12;
    }
  });
  return (
    <group position={[0, 0, -20]}>
      {/* Grand staircase */}
      {[0, 1, 2].map(step => (
        <mesh key={step} position={[0, step * 0.5, 8 - step * 1.2]} receiveShadow>
          <boxGeometry args={[18 - step * 1.5, 0.5, 2.4]} />
          <meshStandardMaterial color="#8a7a60" roughness={0.8} />
        </mesh>
      ))}

      {/* Main hall body */}
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 14, 16]} />
        <meshStandardMaterial color="#c8a860" roughness={0.65} metalness={0.1} />
      </mesh>

      {/* Decorative facade panels */}
      {[-8, -4, 0, 4, 8].map((px, i) => (
        <mesh key={i} position={[px, 7, 8.2]} castShadow>
          <boxGeometry args={[2.4, 10, 0.3]} />
          <meshStandardMaterial color="#e8c878" roughness={0.5} metalness={0.2} />
        </mesh>
      ))}

      {/* Arched windows */}
      {[-8, -4, 4, 8].map((px, i) => (
        <group key={i} position={[px, 7.5, 8.25]}>
          <mesh>
            <boxGeometry args={[1.6, 4, 0.15]} />
            <meshStandardMaterial color="#ffd060" emissive="#a07000" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.15, 8, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#ffd060" emissive="#a07000" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Central golden dome */}
      <mesh position={[0, 15.5, 0]} castShadow>
        <sphereGeometry args={[5.5, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffd600" roughness={0.2} metalness={0.7} emissive="#806000" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 14.5, 0]}>
        <cylinderGeometry args={[5.6, 5.6, 2.0, 14]} />
        <meshStandardMaterial color="#e8c030" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Four corner towers */}
      {[[-12, -7], [12, -7], [-12, 7], [12, 7]].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position={[0, 9, 0]} castShadow>
            <cylinderGeometry args={[2.8, 3.2, 18, 8]} />
            <meshStandardMaterial color="#b89848" roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Tower battlements */}
          {[0, 1, 2, 3].map(bi => {
            const ba = (bi / 4) * Math.PI * 2;
            return (
              <mesh key={bi} position={[Math.cos(ba) * 2.5, 18.5, Math.sin(ba) * 2.5]}>
                <boxGeometry args={[0.7, 1.4, 0.7]} />
                <meshStandardMaterial color="#c8a848" roughness={0.7} />
              </mesh>
            );
          })}
          {/* Tower conical roof */}
          <mesh position={[0, 20.5, 0]}>
            <coneGeometry args={[3.4, 5.5, 8]} />
            <meshStandardMaterial color="#ffd600" roughness={0.25} metalness={0.6} emissive="#806000" emissiveIntensity={0.2} />
          </mesh>
          {/* Tower flag */}
          <mesh position={[0, 24, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 2.5, 5]} />
            <meshStandardMaterial color="#888" metalness={0.6} />
          </mesh>
          <mesh ref={i === 0 ? flagRef : undefined} position={[0.75, 24.8, 0]}>
            <planeGeometry args={[1.5, 0.9]} />
            <meshStandardMaterial color="#cc0000" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Gate arch */}
      <mesh position={[0, 3.5, 8.4]} castShadow>
        <boxGeometry args={[7, 7, 0.6]} />
        <meshStandardMaterial color="#a08030" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3, 8.5]}>
        <boxGeometry args={[4, 6, 0.8]} />
        <meshStandardMaterial color="#060404" />
      </mesh>
      {/* Gate portcullis bars */}
      {[-1.2, 0, 1.2].map((bx, i) => (
        <mesh key={i} position={[bx, 2.8, 8.5]}>
          <boxGeometry args={[0.2, 5.5, 0.12]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Torch lights at gate */}
      {[-4, 4].map((tx, i) => (
        <group key={i} position={[tx, 4, 8.5]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.14, 0.9, 5]} />
            <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <sphereGeometry args={[0.22, 6, 6]} />
            <meshStandardMaterial color="#ff8800" emissive="#ff5500" emissiveIntensity={4} />
          </mesh>
          <pointLight position={[0, 0.65, 0]} intensity={2} color="#ff8800" distance={12} />
        </group>
      ))}

      {/* Palace glow */}
      <pointLight position={[0, 10, 0]} intensity={2.5} color="#ffa000" distance={40} />

      {/* Zone sign */}
      <Billboard position={[0, 28, 0]}>
        <Text fontSize={1.8} color="#ffd600" outlineWidth={0.06} outlineColor="#000" anchorX="center">
          🏛 NATTOUN PALACE 🏛
        </Text>
      </Billboard>
    </group>
  );
}

// ─── STREAM STUDIO ────────────────────────────────────────────────────────────

function StreamStudio() {
  const screenRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(s.clock.elapsedTime * 4) * 0.3;
    }
  });
  return (
    <group position={[22, 0, 11]}>
      {/* Base platform */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[18, 0.6, 14]} />
        <meshStandardMaterial color="#1a1230" roughness={0.8} />
      </mesh>
      {/* Main building */}
      <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 11, 12]} />
        <meshStandardMaterial color="#16082a" roughness={0.6} metalness={0.2} emissive="#090014" emissiveIntensity={0.3} />
      </mesh>
      {/* Roof overhang */}
      <mesh position={[0, 11.5, 0]}>
        <boxGeometry args={[18, 1.2, 14]} />
        <meshStandardMaterial color="#220a40" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* LED Screen facade */}
      <mesh ref={screenRef} position={[0, 5.5, 6.15]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#0000cc" emissive="#3300ff" emissiveIntensity={0.8} />
      </mesh>

      {/* LIVE indicator on screen */}
      <Billboard position={[0, 7.5, 6.4]}>
        <Text fontSize={0.9} color="#ff0040" outlineWidth={0.04} outlineColor="#000">🔴 LIVE — M3KKY</Text>
      </Billboard>
      <Billboard position={[0, 5.5, 6.4]}>
        <Text fontSize={0.5} color="#ffffff" outlineWidth={0.02} outlineColor="#000">BAHAMAS STREAMING NOW</Text>
      </Billboard>

      {/* Satellite dish */}
      <group position={[5, 12.5, -2]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 2.5, 5]} />
          <meshStandardMaterial color="#aaa" metalness={0.7} />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[-0.7, 0, 0]}>
          <coneGeometry args={[1.4, 0.5, 10, 1, true]} />
          <meshStandardMaterial color="#ccc" side={THREE.DoubleSide} metalness={0.5} />
        </mesh>
      </group>

      {/* Corner lighting rigs */}
      {[[-8, 8], [8, 8], [-8, -8], [8, -8]].map(([lx, lz], i) => (
        <group key={i} position={[lx, 12, lz]}>
          <mesh>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          <pointLight intensity={1.5} color={["#ff0080", "#8800ff", "#00ccff", "#ff6600"][i]} distance={22} />
        </group>
      ))}

      <pointLight position={[0, 8, 5]} intensity={3.5} color="#6600ff" distance={30} />
    </group>
  );
}

// ─── GENERIC CITY BUILDING (detailed 3D) ─────────────────────────────────────

function CityBuilding3D({
  pos, size, wallColor, roofColor, accentColor, label, labelColor = "#fff",
  windows = true, roofStyle = "cone",
}: {
  pos: [number, number, number];
  size: [number, number, number];
  wallColor: string; roofColor: string; accentColor: string;
  label: string; labelColor?: string;
  windows?: boolean; roofStyle?: "cone" | "flat" | "pyramid" | "dome";
}) {
  const [bx, by, bz] = pos;
  const [bw, bh, bd] = size;
  const h = getTerrainHeight(bx, bz);

  return (
    <group position={[bx, h, bz]}>
      {/* Base/foundation */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[bw + 1.2, 0.8, bd + 1.2]} />
        <meshStandardMaterial color="#7a6850" roughness={0.9} />
      </mesh>

      {/* Main body */}
      <mesh position={[0, by + bh / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>

      {/* Decorative pilasters */}
      {[-bw / 2, bw / 2].map((px, i) => (
        <mesh key={i} position={[px, by + bh / 2, 0]} castShadow>
          <boxGeometry args={[0.4, bh + 0.5, bd + 0.4]} />
          <meshStandardMaterial color={accentColor} roughness={0.7} />
        </mesh>
      ))}

      {/* Windows */}
      {windows && [-bw / 4, bw / 4].map((wx, wi) =>
        [bh * 0.25, bh * 0.6].map((wy, hi) => (
          <mesh key={`${wi}-${hi}`} position={[wx, by + wy, bd / 2 + 0.05]}>
            <planeGeometry args={[1.5, 2.0]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
          </mesh>
        ))
      )}

      {/* Door */}
      <mesh position={[0, by + 1.5, bd / 2 + 0.06]}>
        <planeGeometry args={[2.2, 3.0]} />
        <meshStandardMaterial color="#0a0808" />
      </mesh>
      <mesh position={[0, by + 3.2, bd / 2 + 0.06]}>
        <planeGeometry args={[2.2, 0.5]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
      </mesh>

      {/* Roof */}
      {roofStyle === "cone" && (
        <mesh position={[0, by + bh + bh * 0.25, 0]}>
          <coneGeometry args={[Math.max(bw, bd) * 0.72, bh * 0.55, 5]} />
          <meshStandardMaterial color={roofColor} roughness={0.6} />
        </mesh>
      )}
      {roofStyle === "pyramid" && (
        <mesh position={[0, by + bh + bh * 0.2, 0]}>
          <coneGeometry args={[Math.max(bw, bd) * 0.7, bh * 0.5, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.6} />
        </mesh>
      )}
      {roofStyle === "flat" && (
        <mesh position={[0, by + bh + 0.3, 0]}>
          <boxGeometry args={[bw + 0.8, 0.6, bd + 0.8]} />
          <meshStandardMaterial color={roofColor} roughness={0.7} />
        </mesh>
      )}
      {roofStyle === "dome" && (
        <mesh position={[0, by + bh, 0]}>
          <sphereGeometry args={[Math.max(bw, bd) * 0.55, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={roofColor} roughness={0.3} metalness={0.4} />
        </mesh>
      )}

      {/* Entry torch lights */}
      {[-bw / 4, bw / 4].map((tx, i) => (
        <group key={i} position={[tx, by + 2, bd / 2 + 0.3]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.08, 0.6, 5]} />
            <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.14, 5, 5]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, 0.4, 0]} intensity={1} color={accentColor} distance={8} />
        </group>
      ))}

      {/* Label billboard */}
      <Billboard position={[0, by + bh + bh * 0.7, 0]}>
        <Text fontSize={0.7} color={labelColor} outlineWidth={0.03} outlineColor="#000" anchorX="center">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── BAHAMAS CITY CENTER ──────────────────────────────────────────────────────

const BahamasCity = memo(function BahamasCity() {
  return (
    <group>
      <NattounPalace />
      <StreamStudio />
      <CityBuilding3D pos={[-20, 3.5, 10]} size={[12, 9, 10]} wallColor="#5c4030" roofColor="#8b1a1a" accentColor="#ff6666" label="⚖ Court" labelColor="#ff8888" roofStyle="pyramid" />
      <CityBuilding3D pos={[0, 3, 20]}     size={[12, 8, 9]}  wallColor="#4a3c00" roofColor="#d4a800" accentColor="#ffd600" label="🏦 NC Bank" labelColor="#ffd600" roofStyle="dome" />
      <CityBuilding3D pos={[-18, 3.5, -6]} size={[10, 7, 8]}  wallColor="#3a2a50" roofColor="#6a3acc" accentColor="#bd93f9" label="🎭 Museum" labelColor="#bd93f9" roofStyle="dome" />
      <CityBuilding3D pos={[18, 3, -6]}    size={[9, 6, 8]}   wallColor="#102040" roofColor="#0030cc" accentColor="#5599ff" label="🚔 Police" labelColor="#5599ff" roofStyle="flat" />
      <CityBuilding3D pos={[-8, 3, 20]}    size={[9, 6, 8]}   wallColor="#2a1e10" roofColor="#4d3020" accentColor="#ff9966" label="📚 Library" labelColor="#ff9966" roofStyle="cone" />
      <CityBuilding3D pos={[10, 3, 20]}    size={[9, 6, 8]}   wallColor="#1e2e10" roofColor="#2e7030" accentColor="#69ff69" label="📮 Post" labelColor="#69ff69" roofStyle="cone" />
      <CityBuilding3D pos={[-22, 3, -19]}  size={[9, 6, 8]}   wallColor="#102030" roofColor="#0090a0" accentColor="#00e5ff" label="🎮 Arcade" labelColor="#00e5ff" roofStyle="flat" />
      <CityBuilding3D pos={[22, 3, -19]}   size={[9, 6, 8]}   wallColor="#201010" roofColor="#cc3020" accentColor="#ff8a80" label="📡 Weather" labelColor="#ff8a80" roofStyle="pyramid" />
      <CityBuilding3D pos={[0, 3, -20]}    size={[9, 6, 8]}   wallColor="#101020" roofColor="#8030a0" accentColor="#ce93d8" label="🚪 OG Gate" labelColor="#ce93d8" roofStyle="dome" />
      <CityBuilding3D pos={[30, 3, 9]}     size={[9, 6, 8]}   wallColor="#102018" roofColor="#1a7020" accentColor="#a5d6a7" label="🎵 Anthem" labelColor="#a5d6a7" roofStyle="cone" />
      <CityBuilding3D pos={[-30, 3, 9]}    size={[9, 6, 8]}   wallColor="#281408" roofColor="#9b3010" accentColor="#ffccbc" label="📞 Service" labelColor="#ffccbc" roofStyle="cone" />

      {/* Central fountain */}
      <CityFountain />

      {/* City walls with battlements */}
      {([
        [0, 2.5, -34, 70, 5, 2.2],
        [0, 2.5,  34, 70, 5, 2.2],
        [-34, 2.5, 0, 2.2, 5, 70],
        [ 34, 2.5, 0, 2.2, 5, 70],
      ] as [number, number, number, number, number, number][]).map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#6a5040" roughness={0.95} />
        </mesh>
      ))}
      {/* Wall battlements */}
      {([-28, -20, -12, -4, 4, 12, 20, 28] as number[]).map((wx, i) => (
        <group key={i}>
          <mesh position={[wx, 5.8, -34]}>
            <boxGeometry args={[3, 1.5, 2.2]} />
            <meshStandardMaterial color="#7a6050" roughness={0.95} />
          </mesh>
          <mesh position={[wx, 5.8, 34]}>
            <boxGeometry args={[3, 1.5, 2.2]} />
            <meshStandardMaterial color="#7a6050" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Street lamps */}
      {([[-26, 0, 0], [26, 0, 0], [0, 0, -26], [0, 0, 26],
         [-14, 0, -26], [14, 0, -26], [-14, 0, 26], [14, 0, 26]] as [number, number, number][]).map((p, i) => (
        <LampPost key={i} pos={p} color="#ffd070" />
      ))}

      {/* Bush clusters at corners */}
      {([[-30, 0, -30], [30, 0, -30], [-30, 0, 30], [30, 0, 30]] as [number, number, number][]).map((p, i) => (
        <group key={i} position={[p[0], getTerrainHeight(p[0], p[2]), p[2]]}>
          <mesh position={[0, 0.7, 0]}>
            <sphereGeometry args={[1.1, 7, 7]} />
            <meshStandardMaterial color="#4a9a22" roughness={0.85} />
          </mesh>
          <mesh position={[0.8, 0.5, 0.5]}>
            <sphereGeometry args={[0.75, 6, 6]} />
            <meshStandardMaterial color="#3a8818" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Plaza ambient light */}
      <pointLight position={[0, 12, 0]} intensity={2.5} color="#ffa000" distance={60} />

      {/* Zone label */}
      <Billboard position={[0, 6, -38]}>
        <Text fontSize={1.6} color="#ffd600" outlineWidth={0.05} outlineColor="#000">🌴 BAHAMAS CITY 🌴</Text>
      </Billboard>
    </group>
  );
});

// ─── EXILE FOREST NW ──────────────────────────────────────────────────────────

const EXILE_TREE_POS: [number, number, number][] = [
  [-45, 0, -45], [-38, 0, -55], [-55, 0, -38], [-62, 0, -50], [-50, 0, -62],
  [-35, 0, -65], [-65, 0, -35], [-42, 0, -35], [-58, 0, -58], [-30, 0, -50],
  [-70, 0, -45], [-48, 0, -72], [-32, 0, -40], [-72, 0, -62], [-40, 0, -48],
  [-56, 0, -42], [-44, 0, -68], [-68, 0, -56],
];

const ExileForest = memo(function ExileForest() {
  return (
    <group>
      <DeadTreeInstanced positions={EXILE_TREE_POS} scale={1.0} />

      {/* Rocky outcrops */}
      <RockInstanced
        positions={[[-48, 0, -50], [-58, 0, -38], [-40, 0, -60], [-70, 0, -48], [-52, 0, -66]] as [number, number, number][]}
        color="#2a2420"
      />

      {/* Dark bushes */}
      {([[-44, 0, -42], [-50, 0, -50], [-58, 0, -44], [-36, 0, -58], [-66, 0, -54], [-42, 0, -68]] as [number, number, number][]).map((p, i) => (
        <group key={i} position={[p[0], getTerrainHeight(p[0], p[2]), p[2]]}>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.9, 6, 6]} />
            <meshStandardMaterial color="#1a3010" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Exile warning signs */}
      <WoodSign pos={[-42, 0, -44]} text="EXILED FROM BAHAMAS" textColor="#3df7ff" />
      <WoodSign pos={[-55, 0, -55]} text="NO RETURN" textColor="#ff4444" />
      <WoodSign pos={[-38, 0, -62]} text="YOU DISOBEYED NATTOUN" textColor="#3df7ff" />

      {/* Will-o-wisps */}
      {([[-44, 3, -48], [-60, 4, -54], [-52, 3.5, -62]] as [number, number, number][]).map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, getTerrainHeight(x, z) + y, z]}>
            <sphereGeometry args={[0.28, 7, 7]} />
            <meshStandardMaterial color="#3df7ff" emissive="#10a0c0" emissiveIntensity={5} />
          </mesh>
          <pointLight position={[x, getTerrainHeight(x, z) + y, z]} intensity={1.8} color="#3df7ff" distance={12} />
        </group>
      ))}

      {/* Fog mist particles near ground */}
      {([[-46, 1, -46], [-54, 1, -52], [-62, 1, -44], [-50, 1, -64]] as [number, number, number][]).map(([x, y, z], i) => (
        <mesh key={i} position={[x, getTerrainHeight(x, z) + 0.5, z]} rotation={[-Math.PI / 2, 0, i * 0.8]}>
          <planeGeometry args={[8, 8]} />
          <meshStandardMaterial color="#3df7ff" transparent opacity={0.04} side={THREE.DoubleSide} />
        </mesh>
      ))}

      <Billboard position={[-52, 22, -52]}>
        <Text fontSize={2} color="#3df7ff" outlineWidth={0.06} outlineColor="#000">THE EXILE FOREST</Text>
      </Billboard>
      <pointLight position={[-52, 8, -52]} intensity={1.5} color="#103040" distance={60} />
    </group>
  );
});

// ─── BANNED TUNDRA N ──────────────────────────────────────────────────────────

const BannedTundra = memo(function BannedTundra() {
  const iceCitizens: [number, number, number][] = [
    [8, 0, -48], [20, 0, -55], [-10, 0, -60], [30, 0, -62], [-5, 0, -72],
  ];
  return (
    <group>
      {/* Frozen citizens */}
      {iceCitizens.map(([x, y, z], i) => {
        const h = getTerrainHeight(x, z);
        return (
          <group key={i} position={[x, h, z]}>
            {/* Ice block encasing banned citizen */}
            <mesh position={[0, 1.2, 0]} castShadow>
              <boxGeometry args={[1.2, 2.4, 0.9]} />
              <meshStandardMaterial color="#a0d8f0" roughness={0.05} metalness={0.2} transparent opacity={0.75} />
            </mesh>
            {/* Citizen inside (ghostly silhouette) */}
            <mesh position={[0, 0.9, 0]}>
              <boxGeometry args={[0.55, 1.1, 0.28]} />
              <meshStandardMaterial color="#b0d8ef" roughness={0.1} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 1.75, 0]}>
              <boxGeometry args={[0.46, 0.46, 0.46]} />
              <meshStandardMaterial color="#b0d8ef" roughness={0.1} transparent opacity={0.6} />
            </mesh>
            <Billboard position={[0, 3.0, 0]}>
              <Text fontSize={0.32} color="#ff4444" outlineWidth={0.02} outlineColor="#000">BANNED</Text>
            </Billboard>
          </group>
        );
      })}

      {/* Ice crystal formations */}
      {([
        [15, 0, -45], [-18, 0, -60], [28, 0, -62], [0, 0, -75], [-28, 0, -52],
      ] as [number, number, number][]).map(([x, y, z], i) => {
        const h = getTerrainHeight(x, z);
        return (
          <group key={i} position={[x, h, z]}>
            <mesh position={[0, 2.0 + i * 0.3, 0]} castShadow>
              <octahedronGeometry args={[1.6 + i * 0.2, 0]} />
              <meshStandardMaterial color="#a0d8f0" roughness={0.05} metalness={0.3} transparent opacity={0.82} />
            </mesh>
            {/* Ice shards around */}
            {[0, 1, 2].map(si => {
              const a = (si / 3) * Math.PI * 2;
              return (
                <mesh key={si} position={[Math.cos(a) * 1.4, 0.8, Math.sin(a) * 1.4]} rotation={[0.4, a, 0.2]}>
                  <coneGeometry args={[0.3, 1.8, 4]} />
                  <meshStandardMaterial color="#c0e8ff" roughness={0.05} transparent opacity={0.8} />
                </mesh>
              );
            })}
            <pointLight position={[0, 2, 0]} intensity={0.8} color="#80c8ff" distance={10} />
          </group>
        );
      })}

      {/* Frozen lake surface */}
      <AnimatedWater pos={[10, getTerrainHeight(10, -55) + 0.1, -55]} w={26} d={22} color="#90c8e8" />

      {/* Snowdrifts */}
      <RockInstanced
        positions={[[18, 0, -48], [-8, 0, -58], [25, 0, -68], [5, 0, -75], [-20, 0, -65]] as [number, number, number][]}
        color="#ddeeff"
      />

      {/* Banned mega sign */}
      <group position={[0, getTerrainHeight(0, -76), -76]}>
        <mesh position={[0, 6, 0]} castShadow>
          <boxGeometry args={[22, 8, 1.5]} />
          <meshStandardMaterial color="#1a0000" emissive="#400000" emissiveIntensity={0.5} />
        </mesh>
        <Billboard position={[0, 6, 1]}>
          <Text fontSize={1.2} color="#ff0000" outlineWidth={0.05} outlineColor="#000">⛔ YOU HAVE BEEN BANNED ⛔</Text>
        </Billboard>
        <Billboard position={[0, 4.5, 1]}>
          <Text fontSize={0.5} color="#ff6666" outlineWidth={0.02} outlineColor="#000">IP: 192.168.PRESIDENT.NATTOUN</Text>
        </Billboard>
        <pointLight position={[0, 6, 2]} intensity={2} color="#ff0000" distance={25} />
      </group>

      <Billboard position={[8, 20, -58]}>
        <Text fontSize={2} color="#a0d8f0" outlineWidth={0.06} outlineColor="#0040a0">BANNED TUNDRA</Text>
      </Billboard>
      <pointLight position={[8, 8, -55]} intensity={1.5} color="#406090" distance={60} />
    </group>
  );
});

// ─── TROLL DIMENSION E ────────────────────────────────────────────────────────

function TrollPortal() {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const runesRef = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.6;
    if (innerRef.current) {
      const sc = 1 + Math.sin(t * 2.5) * 0.06;
      innerRef.current.scale.set(sc, sc, 1);
    }
    if (runesRef.current) runesRef.current.rotation.y = t * 0.3;
  });
  const h = getTerrainHeight(65, -5);
  return (
    <group position={[65, h, -5]}>
      {/* Portal ring */}
      <mesh ref={ringRef} position={[0, 9, 0]}>
        <torusGeometry args={[7.5, 1.0, 8, 22]} />
        <meshStandardMaterial color="#250035" emissive="#ff0090" emissiveIntensity={1.8} roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Portal interior */}
      <mesh ref={innerRef} position={[0, 9, 0.1]}>
        <circleGeometry args={[7.0, 22]} />
        <meshStandardMaterial color="#500080" emissive="#ff2d8c" emissiveIntensity={2.2} transparent opacity={0.88} side={THREE.DoubleSide} />
      </mesh>
      {/* Portal pillars */}
      {[-5, 5].map((px, i) => (
        <mesh key={i} position={[px, 9, 0]} castShadow>
          <boxGeometry args={[1.4, 18, 1.4]} />
          <meshStandardMaterial color="#18002a" emissive="#3a0060" emissiveIntensity={0.7} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      {/* Rune stones orbiting */}
      <group ref={runesRef} position={[0, 9, 0]}>
        {[0, 1, 2, 3, 4].map(ri => {
          const a = (ri / 5) * Math.PI * 2;
          return (
            <mesh key={ri} position={[Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5]}>
              <boxGeometry args={[0.8, 2.0, 0.4]} />
              <meshStandardMaterial color="#300045" emissive="#ff00cc" emissiveIntensity={1.0} roughness={0.3} metalness={0.8} />
            </mesh>
          );
        })}
      </group>
      <pointLight position={[0, 9, 2]} intensity={6} color="#ff00cc" distance={38} />
    </group>
  );
}

const TROLL_DEAD_TREES: [number, number, number][] = [
  [48, 0, -35], [58, 0, -50], [72, 0, -28], [50, 0, 22], [68, 0, 38], [75, 0, 12], [52, 0, -15],
  [80, 0, -15], [62, 0, -42], [78, 0, 30], [55, 0, 50],
];

const TrollDimension = memo(function TrollDimension() {
  return (
    <group>
      <DeadTreeInstanced positions={TROLL_DEAD_TREES} scale={1.15} />

      {/* Troll totem statues */}
      {([[48, 0, 45], [70, 0, -55]] as [number, number, number][]).map(([x, y, z], i) => {
        const h = getTerrainHeight(x, z);
        return (
          <group key={i} position={[x, h, z]}>
            {/* Totem base */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[1.8, 2.2, 3.0, 6]} />
              <meshStandardMaterial color="#28082a" roughness={0.85} />
            </mesh>
            {/* Totem head */}
            <mesh position={[0, 4.5, 0]} castShadow>
              <boxGeometry args={[3.5, 3.5, 3.5]} />
              <meshStandardMaterial color="#380844" roughness={0.7} emissive="#200030" emissiveIntensity={0.25} />
            </mesh>
            {/* Glowing eyes */}
            {[-1.0, 1.0].map((ex, ei) => (
              <mesh key={ei} position={[ex, 4.8, 1.85]}>
                <sphereGeometry args={[0.55, 7, 7]} />
                <meshStandardMaterial color="#ff2d8c" emissive="#ff0060" emissiveIntensity={4} />
              </mesh>
            ))}
            {/* Jagged mouth */}
            <mesh position={[0, 3.7, 1.85]}>
              <boxGeometry args={[2.2, 0.5, 0.2]} />
              <meshStandardMaterial color="#ff0040" emissive="#aa0020" emissiveIntensity={1.2} />
            </mesh>
            {/* Horns */}
            {[-1.2, 1.2].map((hx, hi) => (
              <mesh key={hi} position={[hx, 6.8, 0]} rotation={[0, 0, hi === 0 ? 0.4 : -0.4]}>
                <coneGeometry args={[0.3, 1.8, 5]} />
                <meshStandardMaterial color="#ff2d8c" emissive="#880040" emissiveIntensity={0.5} />
              </mesh>
            ))}
            <pointLight position={[0, 4.5, 2]} intensity={2} color="#ff0080" distance={20} />
          </group>
        );
      })}

      {/* Toxic puddles */}
      {([[52, 0, -25], [64, 0, 8], [57, 0, 32]] as [number, number, number][]).map(([x, y, z], i) => (
        <AnimatedWater key={i} pos={[x, getTerrainHeight(x, z) + 0.15, z]} w={5} d={5} color="#cc00ff" />
      ))}

      {/* Troll signs */}
      <WoodSign pos={[50, 0, -25]} text="L + RATIO + YOU FELL OFF" textColor="#ff2d8c" />
      <WoodSign pos={[58, 0, 15]} text="SKILL ISSUE" textColor="#ff2d8c" />
      <WoodSign pos={[72, 0, -20]} text="NATTOUN WAS RIGHT" textColor="#ff2d8c" />

      {/* Rock formations */}
      <RockInstanced
        positions={[[55, 0, -32], [70, 0, 15], [60, 0, -50], [80, 0, 40]] as [number, number, number][]}
        color="#280838"
      />

      <TrollPortal />

      <Billboard position={[62, 24, -5]}>
        <Text fontSize={2} color="#ff2d8c" outlineWidth={0.06} outlineColor="#000">TROLL DIMENSION</Text>
      </Billboard>
      <pointLight position={[62, 10, -5]} intensity={3} color="#4a0060" distance={60} />
    </group>
  );
});

// ─── STREAM COLOSSEUM SE ──────────────────────────────────────────────────────

const StreamColosseum = memo(function StreamColosseum() {
  const screenGlowRef = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    if (screenGlowRef.current) {
      screenGlowRef.current.intensity = 4 + Math.sin(s.clock.elapsedTime * 3) * 1.5;
    }
  });
  return (
    <group>
      {/* Arena floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[56, getTerrainHeight(56, 57), 57]} receiveShadow>
        <circleGeometry args={[28, 20]} />
        <meshStandardMaterial color="#1a0c2e" roughness={0.8} />
      </mesh>

      {/* Outer walls */}
      {([
        [56, 5, 42, 70, 10, 2],
        [56, 5, 72, 70, 10, 2],
        [22, 5, 57, 2, 10, 32],
        [90, 5, 57, 2, 10, 32],
      ] as [number, number, number, number, number, number][]).map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, getTerrainHeight(x, z) + h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#2d1848" roughness={0.8} emissive="#1a0030" emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* Corner towers */}
      {([[24, 44], [88, 44], [24, 70], [88, 70]] as [number, number][]).map(([tx, tz], i) => {
        const h = getTerrainHeight(tx, tz);
        return (
          <group key={i} position={[tx, h, tz]}>
            <mesh position={[0, 9, 0]} castShadow>
              <cylinderGeometry args={[3.2, 3.8, 18, 8]} />
              <meshStandardMaterial color="#3d1a5a" roughness={0.8} />
            </mesh>
            {/* Battlements */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(bi => {
              const ba = (bi / 8) * Math.PI * 2;
              return (
                <mesh key={bi} position={[Math.cos(ba) * 3.0, 18.8, Math.sin(ba) * 3.0]}>
                  <boxGeometry args={[0.9, 1.6, 0.9]} />
                  <meshStandardMaterial color="#4d2068" roughness={0.8} />
                </mesh>
              );
            })}
            <mesh position={[0, 20.5, 0]}>
              <coneGeometry args={[4, 5, 8]} />
              <meshStandardMaterial color="#bd93f9" roughness={0.35} emissive="#4000a0" emissiveIntensity={0.5} />
            </mesh>
            <pointLight position={[0, 18, 0]} intensity={2} color={["#bd93f9", "#ff2d8c", "#3df7ff", "#39ff14"][i]} distance={20} />
          </group>
        );
      })}

      {/* Stage */}
      <mesh position={[56, getTerrainHeight(56, 57) + 0.5, 57]} castShadow>
        <boxGeometry args={[18, 1, 14]} />
        <meshStandardMaterial color="#3d2060" roughness={0.7} emissive="#200040" emissiveIntensity={0.4} />
      </mesh>
      {/* Stage LED screens */}
      {[[-6, 4, 0], [6, 4, 0]].map(([sx, sy, sz], i) => (
        <mesh key={i} position={[56 + sx, getTerrainHeight(56, 57) + sy, 57 + sz]}>
          <boxGeometry args={[5, 5, 0.3]} />
          <meshStandardMaterial color="#200060" emissive="#6600ff" emissiveIntensity={1.4} />
        </mesh>
      ))}
      <pointLight ref={screenGlowRef} position={[56, getTerrainHeight(56, 57) + 6, 57]} intensity={4} color="#8800ff" distance={32} />

      <Billboard position={[56, 8, 42]}>
        <Text fontSize={1.2} color="#bd93f9" outlineWidth={0.05} outlineColor="#000">🎮 STREAM ARENA 🎮</Text>
      </Billboard>
      <Billboard position={[56, 6.5, 42]}>
        <Text fontSize={0.6} color="#ff2d8c" outlineWidth={0.03} outlineColor="#000">🔴 LIVE NOW</Text>
      </Billboard>

      <Billboard position={[56, 26, 57]}>
        <Text fontSize={2} color="#bd93f9" outlineWidth={0.06} outlineColor="#000">STREAM COLOSSEUM</Text>
      </Billboard>
    </group>
  );
});

// ─── SPAM SWAMP SW ────────────────────────────────────────────────────────────

const SWAMP_TREE_POS: [number, number, number][] = [
  [-42, 0, 42], [-55, 0, 48], [-48, 0, 58], [-62, 0, 44], [-38, 0, 55], [-65, 0, 62], [-52, 0, 70],
  [-45, 0, 65], [-60, 0, 52], [-70, 0, 70],
];

const SpamSwamp = memo(function SpamSwamp() {
  return (
    <group>
      {/* Swamp trees — dark gnarly */}
      <PineTreeInstanced positions={SWAMP_TREE_POS} scale={0.9} leafColor="#142208" trunkColor="#1a0e04" />

      {/* Toxic swamp water */}
      <AnimatedWater pos={[-52, getTerrainHeight(-52, 52) + 0.3, 52]} w={22} d={18} color="#1a4010" />
      <AnimatedWater pos={[-60, getTerrainHeight(-60, 62) + 0.2, 62]} w={14} d={12} color="#0a3008" />

      {/* Mushrooms */}
      {([[-46, 0, 46], [-54, 0, 50], [-42, 0, 60], [-60, 0, 64]] as [number, number, number][]).map((p, i) => {
        const h = getTerrainHeight(p[0], p[2]);
        return (
          <group key={i} position={[p[0], h, p[2]]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 0.6, 5]} />
              <meshStandardMaterial color="#d0b898" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <sphereGeometry args={[0.4, 7, 7]} />
              <meshStandardMaterial color="#cc2222" roughness={0.7} />
            </mesh>
            {[[-0.15, 0.77, 0.28], [0.16, 0.73, 0.3]].map(([mx, my, mz], mi) => (
              <mesh key={mi} position={[mx, my, mz]}>
                <sphereGeometry args={[0.07, 4, 4]} />
                <meshStandardMaterial color="#fff" roughness={0.8} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Spam bot signs */}
      {([
        { pos: [-44, 0, 44] as [number, number, number], text: "FREE BAHAMAS COINS" },
        { pos: [-56, 0, 54] as [number, number, number], text: "CLICK HERE!!!" },
        { pos: [-48, 0, 65] as [number, number, number], text: "YOU WON 1000 NC" },
      ]).map((s, i) => (
        <WoodSign key={i} pos={s.pos} text={s.text} textColor="#39ff14" />
      ))}

      {/* Spam Bot Factory */}
      <group position={[-58, getTerrainHeight(-58, 60), 60]}>
        {/* Factory body */}
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 10, 12]} />
          <meshStandardMaterial color="#102208" roughness={0.9} emissive="#001a00" emissiveIntensity={0.25} />
        </mesh>
        {/* Factory roof */}
        <mesh position={[0, 10.8, 0]}>
          <boxGeometry args={[15, 1.6, 13]} />
          <meshStandardMaterial color="#1a3410" roughness={0.9} />
        </mesh>
        {/* Chimneys */}
        {[-3, 3].map((cx, i) => (
          <group key={i} position={[cx, 13, -1]}>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.9, 1.1, 5, 7]} />
              <meshStandardMaterial color="#1a2a10" roughness={0.9} />
            </mesh>
            <mesh position={[0, 3.5, 0]}>
              <sphereGeometry args={[1.2, 7, 7]} />
              <meshStandardMaterial color="#39ff14" emissive="#1a8000" emissiveIntensity={2.5} />
            </mesh>
            <pointLight position={[0, 3.5, 0]} intensity={2} color="#39ff14" distance={18} />
          </group>
        ))}
        {/* Windows */}
        {[[-3.5, 4, 5.1], [3.5, 4, 5.1], [-3.5, 6.5, 5.1], [3.5, 6.5, 5.1]].map(([wx, wy, wz], i) => (
          <mesh key={i} position={[wx, wy, wz]}>
            <planeGeometry args={[2.2, 2.0]} />
            <meshStandardMaterial color="#0a2008" emissive="#39ff14" emissiveIntensity={0.6} />
          </mesh>
        ))}
        <Billboard position={[0, 13, 7]}>
          <Text fontSize={0.7} color="#39ff14" outlineWidth={0.03} outlineColor="#000">SPAM BOT FACTORY</Text>
        </Billboard>
        <pointLight position={[0, 8, 5]} intensity={2.5} color="#39ff14" distance={25} />
      </group>

      {/* Rock chunks */}
      <RockInstanced
        positions={[[-45, 0, 55], [-62, 0, 48], [-50, 0, 70], [-68, 0, 62]] as [number, number, number][]}
        color="#1a2a10"
      />

      <Billboard position={[-54, 22, 54]}>
        <Text fontSize={2} color="#39ff14" outlineWidth={0.06} outlineColor="#002800">SPAM SWAMP</Text>
      </Billboard>
      <pointLight position={[-54, 8, 54]} intensity={2} color="#103010" distance={60} />
    </group>
  );
});

// ─── GRASSLAND PLAINS TREES ──────────────────────────────────────────────────

const PLAINS_TREE_POSITIONS: [number, number, number][] = [
  [-38, 0, 8], [-40, 0, 20], [-38, 0, -8], [40, 0, 25], [38, 0, -25],
  [0, 0, 42], [10, 0, 44], [-10, 0, 44], [20, 0, 40], [-20, 0, 40],
  [-34, 0, 15], [-36, 0, -15], [35, 0, 15], [36, 0, -15],
  [-28, 0, 36], [28, 0, 36], [22, 0, -36], [-22, 0, -36],
  [0, 0, -36], [-14, 0, 38], [14, 0, 38],
];

// ─── AMBIENT PARTICLES ────────────────────────────────────────────────────────

function Particles() {
  const count = 220;
  const posData = useRef(
    Float32Array.from({ length: count * 3 }, (_, i) => {
      const ax = i % 3;
      if (ax === 1) return Math.random() * 30 + 2;
      return (Math.random() - 0.5) * WORLD_SIZE * 0.85;
    })
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posData.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color="#ff2d8c" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

// ─── BORDER MOUNTAINS ────────────────────────────────────────────────────────
// Dramatic mountain range replaces invisible walls

function BorderMountains() {
  const mountains: { pos: [number, number, number]; h: number; r: number; color: string }[] = [];
  const count = 32;
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const radius = HALF - 8 + Math.sin(i * 2.3) * 4;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    mountains.push({
      pos: [x, getTerrainHeight(x, z), z] as [number, number, number],
      h: 22 + Math.sin(i * 1.7) * 10,
      r: 10 + Math.sin(i * 2.1) * 4,
      color: i % 3 === 0 ? "#5a5248" : i % 3 === 1 ? "#6a6258" : "#4a4840",
    });
  }

  // Extra inner peaks for drama
  const innerPeaks = [
    { pos: [-HALF + 5, 0, -HALF + 5] as [number, number, number], h: 35, r: 12 },
    { pos: [HALF - 5, 0, -HALF + 5] as [number, number, number], h: 30, r: 10 },
    { pos: [-HALF + 5, 0, HALF - 5] as [number, number, number], h: 28, r: 11 },
    { pos: [HALF - 5, 0, HALF - 5] as [number, number, number], h: 32, r: 11 },
  ];

  return (
    <group>
      {mountains.map((m, i) => (
        <group key={i} position={m.pos}>
          {/* Main peak */}
          <mesh position={[0, m.h / 2, 0]} castShadow>
            <coneGeometry args={[m.r, m.h, 6 + (i % 3)]} />
            <meshStandardMaterial color={m.color} roughness={0.92} />
          </mesh>
          {/* Snow cap */}
          <mesh position={[0, m.h * 0.82, 0]}>
            <coneGeometry args={[m.r * 0.35, m.h * 0.22, 5]} />
            <meshStandardMaterial color="#f0f4f8" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {innerPeaks.map((m, i) => (
        <group key={i} position={m.pos}>
          <mesh position={[0, m.h / 2, 0]} castShadow>
            <coneGeometry args={[m.r, m.h, 7]} />
            <meshStandardMaterial color="#504840" roughness={0.92} />
          </mesh>
          <mesh position={[0, m.h * 0.8, 0]}>
            <coneGeometry args={[m.r * 0.38, m.h * 0.28, 6]} />
            <meshStandardMaterial color="#eef2f8" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── OTHER PLAYERS (humanoid) ─────────────────────────────────────────────────

function OtherPlayer({ p }: { p: WorldPlayer }) {
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (armLRef.current) armLRef.current.rotation.x = Math.sin(t * 4) * 0.5;
    if (armRRef.current) armRRef.current.rotation.x = -Math.sin(t * 4) * 0.5;
    if (legLRef.current) legLRef.current.rotation.x = -Math.sin(t * 4) * 0.5;
    if (legRRef.current) legRRef.current.rotation.x = Math.sin(t * 4) * 0.5;
  });
  const c = p.color;
  const hpPct = p.hp / p.maxHp;
  return (
    <group position={[p.x, p.y, p.z]}>
      {/* Head */}
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      {/* Eyes */}
      {[-0.13, 0.13].map((ex, i) => (
        <mesh key={i} position={[ex, 2.14, 0.3]}>
          <sphereGeometry args={[0.06, 5, 5]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
        </mesh>
      ))}
      {/* Torso */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.55, 0.8, 0.3]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2} roughness={0.6} />
      </mesh>
      {/* Arms */}
      <mesh ref={armLRef} position={[-0.42, 1.38, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 3, 6]} />
        <meshStandardMaterial color={c} roughness={0.6} />
      </mesh>
      <mesh ref={armRRef} position={[0.42, 1.38, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 3, 6]} />
        <meshStandardMaterial color={c} roughness={0.6} />
      </mesh>
      {/* Legs */}
      <mesh ref={legLRef} position={[-0.16, 0.62, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 3, 6]} />
        <meshStandardMaterial color={c} roughness={0.7} />
      </mesh>
      <mesh ref={legRRef} position={[0.16, 0.62, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 3, 6]} />
        <meshStandardMaterial color={c} roughness={0.7} />
      </mesh>
      {/* Name tag */}
      <Billboard position={[0, 3.0, 0]}>
        <Text fontSize={0.32} color="white" outlineWidth={0.03} outlineColor="black" anchorX="center">{p.username}</Text>
      </Billboard>
      {/* HP bar */}
      <Billboard position={[0, 3.35, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1, 0.09]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[-(0.5 - (hpPct * 0.5)), 0, 0.001]}>
          <planeGeometry args={[hpPct, 0.09]} />
          <meshBasicMaterial color="#39ff14" />
        </mesh>
      </Billboard>
    </group>
  );
}

// ─── MONSTER BODY (detailed unique shapes per type) ───────────────────────────

function MonsterBody({ type, body, accent, t }: {
  type: MonsterType; body: string; accent: string; t: number;
}) {
  switch (type) {
    case "guard": return (
      <>
        <mesh position={[0, 1.4, 0]} castShadow>
          <boxGeometry args={[1.1, 1.5, 0.65]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.2} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[0.85, 0.82, 0.82]} />
          <meshStandardMaterial color={body} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 2.55, 0.44]}>
          <boxGeometry args={[0.65, 0.25, 0.08]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0, 3.1, 0]}>
          <boxGeometry args={[0.18, 0.55, 0.18]} />
          <meshStandardMaterial color="#cc0000" emissive="#880000" emissiveIntensity={0.5} />
        </mesh>
        {[-0.75, 0.75].map((ax, i) => (
          <mesh key={i} position={[ax, 1.55, 0]}>
            <capsuleGeometry args={[0.18, 0.9, 3, 6]} />
            <meshStandardMaterial color={body} roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        {[-0.28, 0.28].map((lx, i) => (
          <mesh key={i} position={[lx, 0.4, 0]}>
            <capsuleGeometry args={[0.18, 0.65, 3, 6]} />
            <meshStandardMaterial color={body} roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        <mesh position={[0.85, 2.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 3.5, 5]} />
          <meshStandardMaterial color="#999" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.85, 4.0, 0]}>
          <coneGeometry args={[0.2, 0.7, 5]} />
          <meshStandardMaterial color="#ddd" roughness={0.2} metalness={0.9} />
        </mesh>
      </>
    );

    case "troll": return (
      <>
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[1.0, 1.2, 0.7]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.1, 0]} castShadow>
          <sphereGeometry args={[0.52, 8, 8]} />
          <meshStandardMaterial color={body} roughness={0.8} />
        </mesh>
        {[-0.65, 0.65].map((ex, i) => (
          <mesh key={i} position={[ex, 2.1, 0]} rotation={[0, 0, i === 0 ? 0.6 : -0.6]}>
            <coneGeometry args={[0.22, 0.55, 5]} />
            <meshStandardMaterial color={body} roughness={0.8} />
          </mesh>
        ))}
        {[-0.2, 0.2].map((ex, i) => (
          <mesh key={i} position={[ex, 2.18, 0.45]}>
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} />
          </mesh>
        ))}
        <mesh position={[0, 2.35, 0.44]}>
          <boxGeometry args={[0.5, 0.1, 0.12]} />
          <meshStandardMaterial color="#300" />
        </mesh>
        {[-0.72, 0.72].map((ax, i) => (
          <mesh key={i} position={[ax, 1.1, 0]} rotation={[0, 0, i === 0 ? 0.3 : -0.3]}>
            <capsuleGeometry args={[0.16, 0.65, 3, 5]} />
            <meshStandardMaterial color={body} roughness={0.8} />
          </mesh>
        ))}
        {[-0.24, 0.24].map((lx, i) => (
          <mesh key={i} position={[lx, 0.25, 0]}>
            <capsuleGeometry args={[0.18, 0.4, 3, 5]} />
            <meshStandardMaterial color={body} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0.85, 1.4, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.1, 0.22, 1.4, 5]} />
          <meshStandardMaterial color="#3a2010" roughness={0.9} />
        </mesh>
      </>
    );

    case "ghost": {
      const wave = Math.sin(t * 1.8) * 0.05;
      return (
        <>
          <mesh position={[0, wave, 0]}>
            <sphereGeometry args={[0.75, 10, 10]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.9} transparent opacity={0.72} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.75 + wave, 0]}>
            <sphereGeometry args={[0.45, 8, 8]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.7} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -1.0 + wave, 0]}>
            <coneGeometry args={[0.72, 1.5, 7, 1, true]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          {[-0.22, 0.22].map((ex, i) => (
            <mesh key={i} position={[ex, 0.82 + wave, 0.4]}>
              <sphereGeometry args={[0.1, 6, 6]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={8} />
            </mesh>
          ))}
          {[-0.9, 0.9].map((ax, i) => (
            <mesh key={i} position={[ax, -0.1 + wave, 0]} rotation={[0, 0, i === 0 ? 0.7 : -0.7]}>
              <capsuleGeometry args={[0.12, 0.55, 3, 5]} />
              <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.55} />
            </mesh>
          ))}
          <pointLight position={[0, 0, 0]} intensity={2} color={accent} distance={7} />
        </>
      );
    }

    case "spambot": return (
      <>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[1.1, 1.0, 0.9]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 1.85, 0]}>
          <boxGeometry args={[0.7, 0.58, 0.7]} />
          <meshStandardMaterial color={body} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 2.35, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 4]} />
          <meshStandardMaterial color="#ccc" metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.7, 0]}>
          <sphereGeometry args={[0.1, 5, 5]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} />
        </mesh>
        <mesh position={[0, 1.88, 0.36]}>
          <planeGeometry args={[0.5, 0.35]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
        </mesh>
        {[-0.12, 0.12].map((ex, i) => (
          <mesh key={i} position={[ex, 1.92, 0.37]}>
            <planeGeometry args={[0.1, 0.08]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        ))}
        {[-0.75, 0.75].map((ax, i) => (
          <mesh key={i} position={[ax, 0.95, 0]}>
            <boxGeometry args={[0.25, 0.9, 0.25]} />
            <meshStandardMaterial color={body} roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
        {[-0.28, 0.28].map((lx, i) => (
          <mesh key={i} position={[lx, 0.25, 0]}>
            <boxGeometry args={[0.35, 0.5, 0.6]} />
            <meshStandardMaterial color="#0a1a0a" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </>
    );

    case "iceling": return (
      <>
        <mesh position={[0, 1.2, 0]} castShadow>
          <octahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.05} metalness={0.4} transparent opacity={0.88} />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <octahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.4} roughness={0.05} metalness={0.4} transparent opacity={0.9} />
        </mesh>
        {[0, 1, 2, 3, 4].map(i => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.35, 2.75, Math.sin(a) * 0.35]} rotation={[0.3, a, 0]}>
              <coneGeometry args={[0.08, 0.45, 4]} />
              <meshStandardMaterial color="#d0f0ff" emissive="#80c8ff" emissiveIntensity={1.5} transparent opacity={0.85} />
            </mesh>
          );
        })}
        {[-0.65, 0.65].map((ax, i) => (
          <mesh key={i} position={[ax, 1.4, 0]} rotation={[0, 0, i === 0 ? 0.4 : -0.4]}>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color={body} roughness={0.05} metalness={0.4} transparent opacity={0.85} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map(i => {
          const a = (i / 4) * Math.PI * 2 + t * 0.8;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.9, 1.2, Math.sin(a) * 0.9]} rotation={[0, a, 0.5]}>
              <coneGeometry args={[0.1, 0.6, 4]} />
              <meshStandardMaterial color="#c0e8ff" roughness={0.05} metalness={0.4} transparent opacity={0.8} />
            </mesh>
          );
        })}
      </>
    );

    case "slime": {
      const pulse = 1 + Math.sin(t * 2.2) * 0.1;
      return (
        <>
          <mesh position={[0, 0.7, 0]} scale={[pulse, 1 / pulse, pulse]}>
            <sphereGeometry args={[0.72, 10, 10]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} roughness={0.2} transparent opacity={0.88} />
          </mesh>
          {[-0.24, 0.24].map((ex, i) => (
            <group key={i} position={[ex, 0.88, 0.62 * pulse]}>
              <mesh>
                <sphereGeometry args={[0.16, 6, 6]} />
                <meshStandardMaterial color="white" roughness={0.1} />
              </mesh>
              <mesh position={[0, 0, 0.12]}>
                <sphereGeometry args={[0.09, 5, 5]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={4} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.55, 0.7 * pulse]}>
            <torusGeometry args={[0.18, 0.04, 4, 8, Math.PI]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
          </mesh>
          {[-0.5, 0, 0.5].map((dx, i) => (
            <mesh key={i} position={[dx, -0.05 + Math.sin(t * 3 + i) * 0.05, 0.5]}>
              <sphereGeometry args={[0.14, 5, 5]} />
              <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.4} transparent opacity={0.7} />
            </mesh>
          ))}
        </>
      );
    }

    default: return null;
  }
}

// ─── MONSTER ENTITY ───────────────────────────────────────────────────────────

function MonsterEntity({
  mon, onHit, playerHpCb,
}: {
  mon: MonsterRuntime;
  onHit: (id: number, dmg: number, x: number, y: number, z: number) => void;
  playerHpCb: (dmg: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [body, accent] = MON_COL[mon.type];
  const tRef = useRef(0);

  useFrame((state, delta) => {
    if (!mon.alive || !groupRef.current) return;
    tRef.current += delta;
    const dt = Math.min(delta, 0.05);
    const cam = state.camera;
    const dist = mon.pos.distanceTo(cam.position);

    if (mon.type === "ghost") {
      mon.pos.y = 1.5 + Math.sin(state.clock.elapsedTime * 1.2 + mon.floatOffset) * 0.6;
    }

    if (dist < AGGRO_RANGE) mon.aggro = true;
    if (dist > AGGRO_RANGE * 2.2) mon.aggro = false;

    if (mon.aggro && dist > MON_ATK_RANGE) {
      const dir = new THREE.Vector3().subVectors(cam.position, mon.pos).setY(0).normalize();
      mon.pos.addScaledVector(dir, MON_SPEED[mon.type] * dt);
    } else if (!mon.aggro) {
      const dtp = mon.pos.distanceTo(mon.patrolTarget);
      if (dtp < 1 || performance.now() - mon.lastPatrolChange > 5000) {
        const sp = mon.spawnPos;
        mon.patrolTarget.set(
          sp.x + (Math.random() - 0.5) * 16,
          mon.type === "ghost" ? 1.5 : 0,
          sp.z + (Math.random() - 0.5) * 16,
        );
        mon.lastPatrolChange = performance.now();
      }
      const dir = new THREE.Vector3().subVectors(mon.patrolTarget, mon.pos).setY(0).normalize();
      mon.pos.addScaledVector(dir, MON_SPEED[mon.type] * 0.4 * dt);
    }

    mon.pos.x = Math.max(-HALF + 2, Math.min(HALF - 2, mon.pos.x));
    mon.pos.z = Math.max(-HALF + 2, Math.min(HALF - 2, mon.pos.z));
    if (mon.type !== "ghost") mon.pos.y = 0;

    groupRef.current.position.copy(mon.pos);

    if (dist < AGGRO_RANGE * 1.5) {
      const angle = Math.atan2(cam.position.x - mon.pos.x, cam.position.z - mon.pos.z);
      groupRef.current.rotation.y = angle;
    }

    if (mon.aggro && dist < MON_ATK_RANGE) {
      const now = performance.now();
      if (now - mon.lastAttack > 1800) {
        mon.lastAttack = now;
        playerHpCb(MON_DMG[mon.type]);
      }
    }
  });

  if (!mon.alive) return null;
  const hpPct = mon.hp / mon.maxHp;

  return (
    <group ref={groupRef} position={[mon.pos.x, mon.pos.y, mon.pos.z]}>
      <MonsterBody type={mon.type} body={body} accent={accent} t={tRef.current} />
      {/* HP bar */}
      <Billboard position={[0, mon.type === "ghost" ? 2.4 : 3.6, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.3, 0.13]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[-(0.65 - (hpPct * 0.65)), 0, 0.001]}>
          <planeGeometry args={[hpPct * 1.3, 0.13]} />
          <meshBasicMaterial color={hpPct > 0.5 ? "#39ff14" : hpPct > 0.25 ? "#ffa000" : "#ff2200"} />
        </mesh>
        <Text position={[0, 0.2, 0]} fontSize={0.26} color="white" outlineWidth={0.02} outlineColor="#000" anchorX="center">
          {mon.type.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── PLAYER CONTROLLER ────────────────────────────────────────────────────────

function PlayerController({
  monstersRef, onMonsterHit, onPositionUpdate, skills, onSkillUse,
}: {
  monstersRef: React.MutableRefObject<MonsterRuntime[]>;
  onMonsterHit: (id: number, dmg: number, x: number, y: number, z: number) => void;
  onPositionUpdate: (x: number, y: number, z: number, rx: number) => void;
  skills: SkillDef[];
  onSkillUse: (skillIdx: number) => void;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velY = useRef(0);
  const onGround = useRef(true);
  const lastSent = useRef(0);
  const skillCooldowns = useRef<number[]>([0, 0, 0]);
  const lastAttack = useRef(0);
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up3 = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      const now = performance.now();
      if (e.code === "KeyQ") trySkill(0, now);
      if (e.code === "KeyE") trySkill(1, now);
      if (e.code === "KeyR") trySkill(2, now);
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const click = () => { tryMelee(); };

    const tryMelee = () => {
      const now = performance.now();
      if (now - lastAttack.current < 600) return;
      lastAttack.current = now;
      let bestId = -1, bestDist = ATTACK_RANGE;
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      for (const m of monstersRef.current) {
        if (!m.alive) continue;
        const diff = new THREE.Vector3().subVectors(m.pos, camera.position);
        const dist = diff.length();
        if (dist > ATTACK_RANGE) continue;
        diff.normalize();
        if (diff.dot(camFwd) < 0.4) continue;
        if (dist < bestDist) { bestDist = dist; bestId = m.id; }
      }
      if (bestId !== -1) {
        const m = monstersRef.current.find(x => x.id === bestId)!;
        const baseDmg = 18 + Math.floor(Math.random() * 10);
        const crit = Math.random() < 0.15;
        const dmg = crit ? Math.floor(baseDmg * 2.2) : baseDmg;
        onMonsterHit(bestId, dmg, m.pos.x, m.pos.y + 2, m.pos.z);
      }
    };

    const trySkill = (idx: number, now: number) => {
      const sk = skills[idx];
      if (!sk) return;
      if (now - skillCooldowns.current[idx] < sk.cooldown * 1000) return;
      skillCooldowns.current[idx] = now;
      onSkillUse(idx);
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      const baseDmg = 25 + Math.floor(Math.random() * 15);
      if (sk.aoe) {
        for (const m of monstersRef.current) {
          if (!m.alive) continue;
          if (m.pos.distanceTo(camera.position) > sk.range) continue;
          const dmg = Math.floor(baseDmg * sk.dmgMult * (0.8 + Math.random() * 0.4));
          const crit = Math.random() < 0.2;
          onMonsterHit(m.id, crit ? Math.floor(dmg * 2) : dmg, m.pos.x, m.pos.y + 2, m.pos.z);
        }
      } else {
        let bestId = -1, bestDist = sk.range;
        for (const m of monstersRef.current) {
          if (!m.alive) continue;
          const diff = new THREE.Vector3().subVectors(m.pos, camera.position);
          const dist = diff.length();
          if (dist > sk.range) continue;
          diff.normalize();
          if (diff.dot(camFwd) < 0.35) continue;
          if (dist < bestDist) { bestDist = dist; bestId = m.id; }
        }
        if (bestId !== -1) {
          const m = monstersRef.current.find(x => x.id === bestId)!;
          const dmg = Math.floor(baseDmg * sk.dmgMult * (0.85 + Math.random() * 0.3));
          const crit = Math.random() < 0.25;
          onMonsterHit(bestId, crit ? Math.floor(dmg * 2) : dmg, m.pos.x, m.pos.y + 2, m.pos.z);
        }
      }
    };

    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    document.addEventListener("click", click);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
      document.removeEventListener("click", click);
    };
  }, [skills]);

  useFrame((_, delta) => {
    const k = keys.current;
    const dt = Math.min(delta, 0.05);
    const sprint = k["ShiftLeft"] || k["ShiftRight"];
    const speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1) * dt;

    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0; fwd.current.normalize();
    right.current.crossVectors(fwd.current, up3.current).normalize();

    if (k["KeyW"] || k["ArrowUp"])    camera.position.addScaledVector(fwd.current,  speed);
    if (k["KeyS"] || k["ArrowDown"])  camera.position.addScaledVector(fwd.current, -speed);
    if (k["KeyA"] || k["ArrowLeft"])  camera.position.addScaledVector(right.current, -speed);
    if (k["KeyD"] || k["ArrowRight"]) camera.position.addScaledVector(right.current, speed);

    if ((k["Space"] || k["KeySpace"]) && onGround.current) {
      velY.current = JUMP_FORCE;
      onGround.current = false;
    }

    velY.current += GRAVITY * dt;
    camera.position.y += velY.current * dt;
    if (camera.position.y < PLAYER_H) {
      camera.position.y = PLAYER_H;
      velY.current = 0;
      onGround.current = true;
    }

    camera.position.x = Math.max(-HALF + 2, Math.min(HALF - 2, camera.position.x));
    camera.position.z = Math.max(-HALF + 2, Math.min(HALF - 2, camera.position.z));

    const now = performance.now();
    if (now - lastSent.current > 180) {
      lastSent.current = now;
      onPositionUpdate(camera.position.x, camera.position.y, camera.position.z, camera.rotation.y);
    }
  });
  return null;
}

// ─── WORLD SCENE ──────────────────────────────────────────────────────────────

function WorldScene({
  monstersRef, onMonsterHit, onPositionUpdate,
  onLockChange, otherPlayers, playerHpCb, skills, onSkillUse,
}: {
  monstersRef: React.MutableRefObject<MonsterRuntime[]>;
  onMonsterHit: (id: number, dmg: number, x: number, y: number, z: number) => void;
  onPositionUpdate: (x: number, y: number, z: number, rx: number) => void;
  onLockChange: (locked: boolean) => void;
  otherPlayers: WorldPlayer[];
  playerHpCb: (dmg: number) => void;
  skills: SkillDef[];
  onSkillUse: (idx: number) => void;
}) {
  return (
    <>
      <color attach="background" args={["#1a2a40"]} />
      <fog attach="fog" args={["#1a2a40", 70, 185]} />

      {/* Lighting */}
      <ambientLight intensity={0.55} color="#c8d8e8" />
      <directionalLight
        position={[40, 80, 30]} intensity={1.1} color="#f0e8d8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={160}
        shadow-camera-left={-80} shadow-camera-right={80}
        shadow-camera-top={80} shadow-camera-bottom={-80}
      />
      {/* Warm fill from west */}
      <directionalLight position={[-30, 20, 0]} intensity={0.25} color="#ffd070" />
      {/* Cool blue from north */}
      <directionalLight position={[0, 15, -60]} intensity={0.15} color="#8ab0d0" />

      {/* Sky */}
      <Sky
        sunPosition={[0.3, 0.15, 1]}
        turbidity={6}
        rayleigh={2.0}
        mieCoefficient={0.004}
        mieDirectionalG={0.75}
      />

      {/* Clouds */}
      <Suspense fallback={null}>
        <Cloud position={[-30, 55, -30]} speed={0.15} opacity={0.5} />
        <Cloud position={[40, 60, 20]} speed={0.1} opacity={0.4} />
        <Cloud position={[0, 50, 50]} speed={0.12} opacity={0.35} />
      </Suspense>

      {/* Terrain */}
      <Suspense fallback={null}>
        <WorldTerrain />
      </Suspense>

      {/* Water features */}
      <AnimatedWater pos={[0, 0.5, 0]} w={7} d={7} color="#2a7acc" />
      <AnimatedWater pos={[10, getTerrainHeight(10, -55) + 0.2, -55]} w={24} d={20} color="#90c8e8" />

      {/* Mountains border */}
      <BorderMountains />

      {/* Ambient particles */}
      <Particles />

      {/* Trees on grassland plains */}
      <Suspense fallback={null}>
        <PineTreeInstanced positions={PLAINS_TREE_POSITIONS} scale={1.0} leafColor="#2e7a1a" />
      </Suspense>

      {/* Zone content */}
      <Suspense fallback={null}>
        <BahamasCity />
        <ExileForest />
        <BannedTundra />
        <TrollDimension />
        <StreamColosseum />
        <SpamSwamp />
      </Suspense>

      {/* Zone directional signs at city exits */}
      <WoodSign pos={[0, 0, 36]} text="↑ PLAINS" textColor="#76c442" />
      <WoodSign pos={[36, 0, 0]} text="→ TROLL DIMENSION" textColor="#ff2d8c" />
      <WoodSign pos={[-36, 0, 0]} text="← EXILE FOREST" textColor="#3df7ff" />
      <WoodSign pos={[0, 0, -36]} text="↓ BANNED TUNDRA" textColor="#80d8ff" />

      {/* Monsters */}
      {monstersRef.current.map((mon) => (
        <MonsterEntity key={mon.id} mon={mon} onHit={onMonsterHit} playerHpCb={playerHpCb} />
      ))}

      {/* Other players */}
      {otherPlayers.map(p => <OtherPlayer key={p.id} p={p} />)}

      <PlayerController
        monstersRef={monstersRef}
        onMonsterHit={onMonsterHit}
        onPositionUpdate={onPositionUpdate}
        skills={skills}
        onSkillUse={onSkillUse}
      />
      <PointerLockControls
        onLock={() => onLockChange(true)}
        onUnlock={() => onLockChange(false)}
      />
    </>
  );
}

// ─── MINIMAP ──────────────────────────────────────────────────────────────────

function Minimap({ x, z }: { x: number; z: number }) {
  const SIZE = 110;
  const half = WORLD_SIZE / 2;
  const px = ((x + half) / WORLD_SIZE) * SIZE;
  const py = ((z + half) / WORLD_SIZE) * SIZE;
  return (
    <div className="relative overflow-hidden border border-white/25 bg-black/80"
      style={{ width: SIZE, height: SIZE }}>
      <img
        src={mapBg as string} alt="map" draggable={false}
        style={{ width: SIZE, height: SIZE, display: "block", opacity: 0.88, imageRendering: "pixelated" }}
      />
      <div
        className="absolute rounded-full bg-white z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: px, top: py, width: 8, height: 8, boxShadow: "0 0 0 2px #ff2d8c, 0 0 10px #fff" }}
      />
      <Compass className="absolute top-1 left-1 w-3 h-3 text-white/40" />
      <div className="absolute bottom-0.5 left-0 right-0 text-center font-mono text-[7px] text-white/35 uppercase pointer-events-none">
        BAHAMAS MAP
      </div>
    </div>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function HUD({
  username, color, origin, hp, maxHp, mp, maxMp,
  kills, xp, skills, skillCooldowns, lastSkillUsed,
  chatMessages, onChat, locked, onClickToLock, onLeave,
  playerX, playerZ, onlineCount,
}: {
  username: string; color: string; origin: string;
  hp: number; maxHp: number; mp: number; maxMp: number;
  kills: number; xp: number;
  skills: SkillDef[];
  skillCooldowns: React.MutableRefObject<number[]>;
  lastSkillUsed: number[];
  chatMessages: ChatMsg[];
  onChat: (msg: string) => void;
  locked: boolean; onClickToLock: () => void; onLeave: () => void;
  playerX: number; playerZ: number;
  onlineCount: number;
}) {
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const sendChat = () => {
    const t = chatInput.trim(); if (!t) return;
    onChat(t); setChatInput("");
  };

  const zone = ZONE_INFO[getZone(playerX, playerZ)] || ZONE_INFO.grassland;
  const hpPct = hp / maxHp;
  const mpPct = mp / maxMp;

  const getSkillCd = (idx: number) => {
    const now = performance.now();
    const elapsed = (now - skillCooldowns.current[idx]) / 1000;
    const total = skills[idx]?.cooldown ?? 0;
    return Math.max(0, total - elapsed);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none">
      {/* Crosshair */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80 -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full" />
          </div>
        </div>
      )}

      {/* Click to play overlay */}
      {!locked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer"
          onClick={onClickToLock}>
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-black/85 border-2 border-primary px-10 py-8 text-center"
            style={{ boxShadow: "0 0 40px rgba(255,45,140,0.4)" }}>
            <p className="text-primary font-black uppercase tracking-widest text-xl mb-1">🌴 BAHAMAS LAND RPG</p>
            <p className="text-yellow-400 font-mono text-sm uppercase mb-3">Click to Enter the World</p>
            <div className="text-white/50 font-mono text-xs space-y-0.5">
              <p>WASD — Move  |  MOUSE — Look  |  SHIFT — Sprint</p>
              <p>SPACE — Jump  |  CLICK — Attack  |  Q/E/R — Skills</p>
              <p>ESC — Pause  |  T — Chat</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top-left: Player stats */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-auto min-w-[188px]">
        <div className="bg-black/80 border border-white/15 px-3 py-2.5 space-y-2"
          style={{ boxShadow: `0 0 18px ${color}22` }}>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-white font-mono text-xs uppercase font-bold truncate">{username}</span>
            <span className="ml-auto text-yellow-400 font-mono text-[10px]">🏆 {kills}</span>
          </div>
          {origin && <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color }}>{origin}</div>}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-red-400 font-mono text-[9px] uppercase">HP</span>
              <span className="text-red-300 font-mono text-[9px]">{hp}/{maxHp}</span>
            </div>
            <div className="bg-black/60 h-2.5 w-full">
              <div className="h-full transition-all duration-150"
                style={{ width: `${hpPct * 100}%`, background: hpPct > 0.5 ? "#39ff14" : hpPct > 0.25 ? "#ffa000" : "#ff2200" }} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-mono text-[9px] uppercase">MP</span>
              <span className="text-blue-300 font-mono text-[9px]">{mp}/{maxMp}</span>
            </div>
            <div className="bg-black/60 h-2 w-full">
              <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${mpPct * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-[9px] uppercase">XP</span>
            <div className="flex-1 bg-black/50 h-1.5">
              <div className="h-full bg-yellow-400" style={{ width: `${xp % 100}%` }} />
            </div>
            <span className="text-yellow-300 font-mono text-[9px]">Lv.{Math.floor(xp / 100) + 1}</span>
          </div>
        </div>
        <div className="bg-black/70 border border-white/10 px-3 py-1.5">
          <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: zone.color }}>
            📍 {zone.name}
          </div>
          <div className="font-mono text-[9px] text-white/40 uppercase">{zone.danger}</div>
        </div>
      </div>

      {/* Top-right: Online + Leave */}
      <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
        <div className="bg-black/70 border border-white/10 px-3 py-2 flex items-center gap-2">
          <Users className="w-3 h-3 text-pink-400" />
          <span className="text-pink-300 font-mono text-xs">{onlineCount} online</span>
        </div>
        <button onClick={onLeave}
          className="bg-black/70 border border-red-500/40 px-3 py-2 text-red-400 hover:bg-red-900/30 transition flex items-center gap-1">
          <LogOut className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom-center: Skills bar */}
      {locked && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 items-end">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-12 h-12 bg-black/70 border-2 border-white/30 flex items-center justify-center text-white text-sm font-mono">⚔</div>
            <span className="text-white/40 font-mono text-[9px] uppercase">Click</span>
          </div>
          {skills.map((sk, i) => {
            const cd = getSkillCd(i);
            const onCd = cd > 0;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="relative w-14 h-14">
                  <div className={`w-full h-full border-2 flex flex-col items-center justify-center transition-all ${onCd ? "opacity-50" : "opacity-100 hover:scale-105"}`}
                    style={{ background: onCd ? "#111" : `${sk.color}22`, borderColor: sk.color, boxShadow: onCd ? "none" : `0 0 12px ${sk.color}55` }}>
                    <span className="font-mono text-[10px] font-bold text-white/80 uppercase">{sk.key}</span>
                    <span className="font-mono text-[8px] text-white/50 uppercase text-center px-0.5 leading-tight">{sk.label}</span>
                  </div>
                  {onCd && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="font-mono text-white font-bold text-sm">{cd.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <span className="text-white/30 font-mono text-[8px]">{sk.cooldown}s cd</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom-left: Chat */}
      <div className="absolute bottom-3 left-3 w-72 space-y-1.5 pointer-events-auto">
        <div ref={chatRef} className="bg-black/65 border border-white/10 p-2 h-28 overflow-y-auto space-y-0.5">
          {chatMessages.map((m) => (
            <div key={m.id} className="font-mono text-[10px] leading-tight">
              <span style={{ color: "#ff2d8c" }}>{m.username}: </span>
              <span className="text-white/80">{m.text}</span>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <p className="text-white/20 font-mono text-[10px] uppercase">Bahamas Land awaits...</p>
          )}
        </div>
        {showChat ? (
          <div className="flex gap-1.5">
            <input autoFocus value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { sendChat(); setShowChat(false); }
                if (e.key === "Escape") setShowChat(false);
              }}
              maxLength={100} placeholder="Chat..."
              className="flex-1 bg-black border border-primary text-primary font-mono text-xs px-2 py-1 focus:outline-none placeholder:text-white/20 uppercase" />
            <button onClick={() => { sendChat(); setShowChat(false); }}
              className="bg-primary text-black font-bold text-xs px-2 py-1 uppercase">
              Send
            </button>
          </div>
        ) : (
          locked && <button onClick={() => setShowChat(true)}
            className="text-white/30 font-mono text-[10px] uppercase hover:text-primary transition">
            [T] Chat
          </button>
        )}
      </div>

      {/* Bottom-right: Minimap */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <Minimap x={playerX} z={playerZ} />
      </div>

      {/* Controls reminder */}
      {locked && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 px-3 py-1 border border-white/10">
            <p className="text-white/30 font-mono text-[9px] uppercase tracking-widest">
              WASD · SHIFT=Sprint · SPACE=Jump · Click=Attack · Q/E/R=Skills · ESC=Pause
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DAMAGE NUMBERS ───────────────────────────────────────────────────────────

function DamageNumbers({ nums }: { nums: DmgNumber[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {nums.map(n => (
        <div key={n.id}
          className="absolute font-black font-mono select-none"
          style={{
            left: n.x, top: n.y,
            color: n.crit ? "#ffd600" : "#ff4444",
            textShadow: n.crit ? "0 0 12px #ffd600" : "0 0 8px #ff0000",
            animation: "dmgFloat 1.2s ease-out forwards",
            fontSize: n.crit ? "22px" : "16px",
          }}>
          {n.crit ? `⚡${n.val}` : `-${n.val}`}
        </div>
      ))}
      <style>{`
        @keyframes dmgFloat {
          0%   { opacity:1; transform:translateY(0) scale(1.2); }
          60%  { opacity:1; transform:translateY(-40px) scale(1); }
          100% { opacity:0; transform:translateY(-70px) scale(0.8); }
        }
      `}</style>
    </div>
  );
}

// ─── SKILL FLASH ──────────────────────────────────────────────────────────────

function SkillFlash({ color, label }: { color: string; label: string }) {
  return (
    <motion.div className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 0.5 }}>
      <div className="text-4xl font-black font-mono uppercase tracking-widest"
        style={{ color, textShadow: `0 0 30px ${color}, 0 0 60px ${color}` }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OGWorld() {
  const [, setLocation] = useLocation();
  const [locked, setLocked] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<WorldPlayer[]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const [hp, setHp] = useState(200);
  const [mp, setMp] = useState(100);
  const [kills, setKills] = useState(0);
  const [xp, setXp] = useState(0);
  const maxHp = 200;
  const maxMp = 100;
  const [dead, setDead] = useState(false);

  const [dmgNums, setDmgNums] = useState<DmgNumber[]>([]);
  const dmgIdRef = useRef(0);

  const [skillFlash, setSkillFlash] = useState<{ color: string; label: string } | null>(null);
  const [lastSkillUsed, setLastSkillUsed] = useState([0, 0, 0]);

  const monstersRef = useRef<MonsterRuntime[]>(SPAWN_LIST.map(makeMonster));
  const [, forceMonsterRender] = useState(0);
  const skillCooldownsRef = useRef([0, 0, 0]);

  const myId       = sessionStorage.getItem("og_world_id")       || "anon";
  const myUsername = sessionStorage.getItem("og_world_username") || "Citizen";
  const myColor    = sessionStorage.getItem("og_world_color")    || "#ff2d8c";
  const myOrigin   = sessionStorage.getItem("og_world_origin")   || "Tank";
  const skills = CLASS_SKILLS[myOrigin] || DEFAULT_SKILLS;

  // MP regen
  useEffect(() => {
    const id = setInterval(() => setMp(m => Math.min(maxMp, m + 3)), 1200);
    return () => clearInterval(id);
  }, []);

  // Clean damage numbers
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setDmgNums(prev => prev.filter(n => now - n.born < 1200));
    }, 300);
    return () => clearInterval(id);
  }, []);

  // Monster respawn
  useEffect(() => {
    const id = setInterval(() => {
      let changed = false;
      for (const m of monstersRef.current) {
        if (!m.alive && performance.now() - m.lastAttack > RESPAWN_TIME) {
          m.alive = true;
          m.hp = m.maxHp;
          m.pos.copy(m.spawnPos);
          m.aggro = false;
          changed = true;
        }
      }
      if (changed) forceMonsterRender(n => n + 1);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Supabase multiplayer
  const channelRef = useRef<any>(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const ch = supabase.channel("og-world-v3", { config: { presence: { key: myId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<WorldPlayer>();
      const others: WorldPlayer[] = [];
      for (const [id, arr] of Object.entries(state)) {
        if (id === myId) continue;
        const p = arr[0] as WorldPlayer;
        if (p) others.push(p);
      }
      setOtherPlayers(others);
    })
    .on("broadcast", { event: "chat" }, ({ payload }: any) => {
      setChatMessages(prev => [...prev.slice(-50), { username: payload.username, text: payload.text, id: Date.now() }]);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ id: myId, username: myUsername, color: myColor, character: myOrigin, x: 0, y: PLAYER_H, z: 0, rx: 0, hp, maxHp });
      }
    });
    channelRef.current = ch;
    return () => { supabase!.removeChannel(ch); };
  }, []);

  useEffect(() => {
    setChatMessages([
      { username: "Nattoun", text: `Welcome to Bahamas Land RPG, ${myUsername}! Don't die.`, id: 1 },
      { username: "System",  text: "Click → Attack · Q/E/R → Skills · SHIFT → Sprint", id: 2 },
    ]);
  }, []);

  const handlePositionUpdate = useCallback((x: number, y: number, z: number, rx: number) => {
    setPlayerPos({ x, z });
    if (!channelRef.current) return;
    channelRef.current.track({ id: myId, username: myUsername, color: myColor, character: myOrigin, x, y, z, rx, hp, maxHp });
  }, [myId, myUsername, myColor, myOrigin, hp]);

  const handleChat = useCallback((text: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "chat", payload: { username: myUsername, text } });
    setChatMessages(prev => [...prev.slice(-50), { username: myUsername, text, id: Date.now() }]);
  }, [myUsername]);

  const handleMonsterHit = useCallback((id: number, dmg: number, wx: number, wy: number, wz: number) => {
    const mon = monstersRef.current.find(m => m.id === id);
    if (!mon || !mon.alive) return;
    const crit = dmg > 45;
    mon.hp = Math.max(0, mon.hp - dmg);
    if (mon.hp <= 0) {
      mon.alive = false;
      mon.lastAttack = performance.now();
      mon.aggro = false;
      setKills(k => k + 1);
      setXp(x => x + MON_XP[mon.type]);
      setChatMessages(prev => [...prev.slice(-50), {
        username: "System",
        text: `🗡 ${myUsername} slayed a ${mon.type}! +${MON_XP[mon.type]} XP`,
        id: Date.now(),
      }]);
    }
    forceMonsterRender(n => n + 1);
    const screenX = window.innerWidth / 2 + (Math.random() - 0.5) * 180;
    const screenY = window.innerHeight / 2 + (Math.random() - 0.5) * 80 - 40;
    setDmgNums(prev => [...prev.slice(-15), { id: ++dmgIdRef.current, x: screenX, y: screenY, val: dmg, crit, born: Date.now() }]);
  }, [myUsername]);

  const handlePlayerHit = useCallback((dmg: number) => {
    if (dead) return;
    setHp(h => {
      const newHp = Math.max(0, h - dmg);
      if (newHp <= 0) {
        setDead(true);
        setTimeout(() => {
          setHp(maxHp); setMp(maxMp); setDead(false);
          setChatMessages(prev => [...prev.slice(-50), {
            username: "Nattoun",
            text: "You died. Embarrassing. Even for a citizen.",
            id: Date.now(),
          }]);
        }, 4000);
      }
      return newHp;
    });
    const screenX = window.innerWidth / 2 + (Math.random() - 0.5) * 60;
    const screenY = window.innerHeight / 2 - 40;
    setDmgNums(prev => [...prev.slice(-15), {
      id: ++dmgIdRef.current, x: screenX, y: screenY, val: dmg, crit: false, born: Date.now(),
    }]);
  }, [dead]);

  const handleSkillUse = useCallback((idx: number) => {
    const sk = skills[idx];
    if (!sk) return;
    skillCooldownsRef.current[idx] = performance.now();
    setLastSkillUsed(prev => { const n = [...prev]; n[idx] = Date.now(); return n; });
    setSkillFlash({ color: sk.color, label: sk.label });
    setTimeout(() => setSkillFlash(null), 500);
    setMp(m => Math.max(0, m - 10));
  }, [skills]);

  return (
    <div className="fixed inset-0 bg-black" ref={canvasRef}>
      <Canvas
        shadows
        camera={{ fov: 72, near: 0.1, far: 320, position: [0, PLAYER_H, 5] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <WorldScene
          monstersRef={monstersRef}
          onMonsterHit={handleMonsterHit}
          onPositionUpdate={handlePositionUpdate}
          onLockChange={setLocked}
          otherPlayers={otherPlayers}
          playerHpCb={handlePlayerHit}
          skills={skills}
          onSkillUse={handleSkillUse}
        />
      </Canvas>

      {/* HUD overlay */}
      <HUD
        username={myUsername} color={myColor} origin={myOrigin}
        hp={hp} maxHp={maxHp} mp={mp} maxMp={maxMp}
        kills={kills} xp={xp}
        skills={skills} skillCooldowns={skillCooldownsRef} lastSkillUsed={lastSkillUsed}
        chatMessages={chatMessages} onChat={handleChat}
        locked={locked} onClickToLock={() => canvasRef.current?.requestPointerLock()}
        onLeave={() => setLocation("/og-gate")}
        playerX={playerPos.x} playerZ={playerPos.z}
        onlineCount={otherPlayers.length + 1}
      />

      {/* Damage numbers */}
      <DamageNumbers nums={dmgNums} />

      {/* Skill flash */}
      <AnimatePresence>
        {skillFlash && <SkillFlash key={skillFlash.label} color={skillFlash.color} label={skillFlash.label} />}
      </AnimatePresence>

      {/* Death screen */}
      <AnimatePresence>
        {dead && (
          <motion.div className="absolute inset-0 bg-red-900/50 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center">
              <p className="text-red-200 font-black text-5xl uppercase tracking-widest mb-2">💀 YOU DIED 💀</p>
              <p className="text-red-400 font-mono text-sm uppercase">Nattoun is disappointed in you</p>
              <p className="text-red-300/60 font-mono text-xs mt-2">Respawning in 4 seconds...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
