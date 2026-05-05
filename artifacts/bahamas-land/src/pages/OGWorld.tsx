import {
  Suspense, useRef, useState, useEffect, useCallback, memo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sky, Text, Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Users, Compass } from "lucide-react";

// ── Asset imports ─────────────────────────────────────────────────────────────
import mapBg          from "@assets/generated_images/bahamas_map_bg.png";
import bldPalace      from "@assets/generated_images/bld_palace.png";
import bldStreamStudio from "@assets/generated_images/bld_stream_studio.png";
import bldCourt       from "@assets/generated_images/bld_court.png";
import bldBank        from "@assets/generated_images/bld_bank.png";
import bldMuseum      from "@assets/generated_images/bld_museum.png";
import bldPolice      from "@assets/generated_images/bld_police.png";
import bldLibrary     from "@assets/generated_images/bld_library.png";
import bldPostoffice  from "@assets/generated_images/bld_postoffice.png";
import bldArcade      from "@assets/generated_images/bld_arcade.png";
import bldOgGate      from "@assets/generated_images/bld_og_gate.png";
import bldWeather     from "@assets/generated_images/bld_weather.png";
import bldAnthem      from "@assets/generated_images/bld_anthem.png";
import bldCustomerService from "@assets/generated_images/bld_customer_service.png";

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

// Class skills: Q, E, R
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
    { key: "Q", label: "Arrow Shot",      color: "#76c442", dmgMult: 1.6, range: SKILL_RANGE+5, cooldown: 3,  aoe: false },
    { key: "E", label: "Rain of Arrows",  color: "#388e3c", dmgMult: 1.0, range: SKILL_RANGE,   cooldown: 12, aoe: true  },
    { key: "R", label: "Eagle Strike",    color: "#b8ff59", dmgMult: 3.2, range: SKILL_RANGE+8, cooldown: 22, aoe: false },
  ],
  Berserker: [
    { key: "Q", label: "Whirlwind",      color: "#ff3d00", dmgMult: 1.3, range: ATTACK_RANGE+2, cooldown: 6,  aoe: true  },
    { key: "E", label: "Bloodthirst",    color: "#b71c1c", dmgMult: 1.8, range: ATTACK_RANGE,   cooldown: 10, aoe: false },
    { key: "R", label: "Berserker Rage", color: "#ff6e40", dmgMult: 3.8, range: ATTACK_RANGE+3, cooldown: 30, aoe: true  },
  ],
  Paladin: [
    { key: "Q", label: "Holy Strike",    color: "#ffd600", dmgMult: 1.5, range: ATTACK_RANGE,   cooldown: 4,  aoe: false },
    { key: "E", label: "Consecration",   color: "#ffab00", dmgMult: 1.0, range: ATTACK_RANGE+3, cooldown: 12, aoe: true  },
    { key: "R", label: "Divine Wrath",   color: "#fff9c4", dmgMult: 3.0, range: SKILL_RANGE,    cooldown: 24, aoe: true  },
  ],
};
const DEFAULT_SKILLS = CLASS_SKILLS.Tank;

// Monster spawn list — positions match zones in bahamas_map_bg.png
const SPAWN_LIST: { id: number; type: MonsterType; x: number; z: number }[] = [
  // Palace Guards — city center perimeter
  { id: 1,  type: "guard",   x:  24,  z:  6  },
  { id: 2,  type: "guard",   x: -24,  z:  6  },
  { id: 3,  type: "guard",   x:   6,  z: -26 },
  { id: 4,  type: "guard",   x:  -6,  z:  26 },
  // Troll Goblins — Troll Dimension (east)
  { id: 5,  type: "troll",   x:  58,  z: -18 },
  { id: 6,  type: "troll",   x:  68,  z:  6  },
  { id: 7,  type: "troll",   x:  62,  z:  34 },
  { id: 8,  type: "troll",   x:  75,  z: -38 },
  // Exile Ghosts — Exile Forest (NW)
  { id: 9,  type: "ghost",   x: -50,  z: -46 },
  { id: 10, type: "ghost",   x: -62,  z: -58 },
  { id: 11, type: "ghost",   x: -42,  z: -62 },
  // Spam Bots — Spam Swamp (SW)
  { id: 12, type: "spambot", x: -50,  z:  48 },
  { id: 13, type: "spambot", x: -62,  z:  57 },
  { id: 14, type: "spambot", x: -54,  z:  38 },
  // Ice Exiles — Banned Tundra (N)
  { id: 15, type: "iceling", x:   2,  z: -54 },
  { id: 16, type: "iceling", x:  22,  z: -62 },
  { id: 17, type: "iceling", x: -16,  z: -68 },
  // Stream Slimes — Stream Colosseum (SE)
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

// ─── ZONE HELPER ─────────────────────────────────────────────────────────────

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

// ─── GROUND — uses the actual Bahamas Land map image ──────────────────────────

function MapGround() {
  const tex = useTexture(mapBg as string);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[WORLD_SIZE, WORLD_SIZE, 1, 1]} />
      <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
    </mesh>
  );
}

// ─── BUILDING SPRITE ─────────────────────────────────────────────────────────
// Shows the actual bld_*.png image as a billboard above each building.

function BldSprite({ src, pos, w = 9, h = 9 }: {
  src: string; pos: [number, number, number]; w?: number; h?: number;
}) {
  const tex = useTexture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <Billboard position={pos}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.08} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

// ─── BAHAMAS CITY CENTER ──────────────────────────────────────────────────────

function NattounPalace() {
  return (
    <group position={[0, 0, -18]}>
      {/* Main body */}
      <mesh position={[0, 6, 0]} castShadow>
        <boxGeometry args={[22, 12, 14]} />
        <meshStandardMaterial color="#7a6000" roughness={0.7} metalness={0.15} emissive="#604000" emissiveIntensity={0.15} />
      </mesh>
      {/* Gold roof */}
      <mesh position={[0, 13.5, 0]}>
        <coneGeometry args={[14, 6, 4]} />
        <meshStandardMaterial color="#ffd600" roughness={0.3} metalness={0.5} emissive="#806000" emissiveIntensity={0.3} />
      </mesh>
      {/* Towers */}
      {[-10, 10].map((tx, i) => (
        <group key={i} position={[tx, 0, 0]}>
          <mesh position={[0, 7, 0]} castShadow>
            <cylinderGeometry args={[2.5, 2.8, 14, 7]} />
            <meshStandardMaterial color="#8a7000" roughness={0.7} metalness={0.15} />
          </mesh>
          <mesh position={[0, 15, 0]}>
            <coneGeometry args={[3.2, 4, 7]} />
            <meshStandardMaterial color="#ffd600" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Gate arch */}
      <mesh position={[0, 3.5, 7.5]}>
        <boxGeometry args={[6, 7, 1.5]} />
        <meshStandardMaterial color="#8a7010" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.5, 7.5]}>
        <boxGeometry args={[3.5, 5, 2]} />
        <meshStandardMaterial color="#0a0800" />
      </mesh>
      {/* Palace light */}
      <pointLight position={[0, 8, 5]} intensity={2} color="#ffa000" distance={28} />
      {/* Actual palace image sprite */}
      <BldSprite src={bldPalace as string} pos={[0, 22, 0]} w={14} h={14} />
    </group>
  );
}

function StreamStudio() {
  return (
    <group position={[20, 0, 10]}>
      <mesh position={[0, 4, 0]} castShadow>
        <boxGeometry args={[14, 8, 10]} />
        <meshStandardMaterial color="#1a0a2e" roughness={0.7} emissive="#100020" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 9, 0]}>
        <boxGeometry args={[15, 2, 11]} />
        <meshStandardMaterial color="#2d0050" roughness={0.6} />
      </mesh>
      {/* Satellite dish */}
      <group position={[3, 11, -1]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 3, 5]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[0, 1.8, 0]} rotation={[-0.8, 0, 0]}>
          <coneGeometry args={[1.2, 0.4, 8, 1, true]} />
          <meshStandardMaterial color="#ccc" side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Screen glow */}
      <mesh position={[0, 4, 5.1]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#0a00ff" emissive="#4400ff" emissiveIntensity={0.8} />
      </mesh>
      <Billboard position={[0, 11, 0]}>
        <Text fontSize={1.2} color="#ff0040" outlineWidth={0.04} outlineColor="#000">🔴 LIVE — M3KKY</Text>
      </Billboard>
      <pointLight position={[0, 6, 4]} intensity={3} color="#6600ff" distance={22} />
      <BldSprite src={bldStreamStudio as string} pos={[0, 19, 0]} w={11} h={11} />
    </group>
  );
}

function CityBuilding({ pos, size, wallCol, roofCol, label, labelCol = "#fff", sprite }: {
  pos: [number,number,number]; size: [number,number,number];
  wallCol: string; roofCol: string; label: string; labelCol?: string; sprite: string;
}) {
  const [bx, by, bz] = pos;
  const [bw, bh, bd] = size;
  return (
    <group>
      <mesh position={pos} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={wallCol} roughness={0.85} />
      </mesh>
      <mesh position={[bx, by + bh/2 + bh*0.18, bz]}>
        <coneGeometry args={[Math.max(bw, bd)*0.72, bh*0.45, 4]} />
        <meshStandardMaterial color={roofCol} roughness={0.7} />
      </mesh>
      {/* Window glow */}
      <mesh position={[bx, by + 0.5, bz + bd/2 + 0.01]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshStandardMaterial color="#ffd080" emissive="#ffd080" emissiveIntensity={0.7} />
      </mesh>
      <Billboard position={[bx, by + bh/2 + bh*0.5, bz]}>
        <Text fontSize={0.75} color={labelCol} outlineWidth={0.03} outlineColor="#000" anchorX="center">
          {label}
        </Text>
      </Billboard>
      {/* Building sprite image */}
      <BldSprite src={sprite} pos={[bx, by + bh/2 + bh*0.9 + 5, bz]} w={8} h={8} />
    </group>
  );
}

const BahamasCity = memo(function BahamasCity() {
  return (
    <group>
      <NattounPalace />
      <StreamStudio />
      <CityBuilding pos={[-20, 4.5, 10]} size={[12,9,10]} wallCol="#6b5c44" roofCol="#8b2222" label="⚖ Court"       labelCol="#ff8888" sprite={bldCourt as string} />
      <CityBuilding pos={[0, 4, 18]}     size={[12,8,9]}  wallCol="#5c4a00" roofCol="#ffd600" label="🏦 NC Bank"    labelCol="#ffd600" sprite={bldBank as string} />
      <CityBuilding pos={[-18, 3.5, -5]} size={[10,7,8]}  wallCol="#4a3c60" roofCol="#7c4dff" label="🎭 Museum"     labelCol="#bd93f9" sprite={bldMuseum as string} />
      <CityBuilding pos={[18, 3, -5]}    size={[9,6,8]}   wallCol="#1a2a4a" roofCol="#0040ff" label="🚔 Police"     labelCol="#5599ff" sprite={bldPolice as string} />
      <CityBuilding pos={[-8, 3, 18]}    size={[9,6,8]}   wallCol="#3a2a1a" roofCol="#5d4037" label="📚 Library"    labelCol="#ff9966" sprite={bldLibrary as string} />
      <CityBuilding pos={[10, 3, 18]}    size={[9,6,8]}   wallCol="#2a3a1a" roofCol="#388e3c" label="📮 Post"       labelCol="#69ff69" sprite={bldPostoffice as string} />
      <CityBuilding pos={[-20, 3, -18]}  size={[9,6,8]}   wallCol="#1a2a3a" roofCol="#00acc1" label="🎮 Arcade"     labelCol="#00e5ff" sprite={bldArcade as string} />
      <CityBuilding pos={[20, 3, -18]}   size={[9,6,8]}   wallCol="#2a1a1a" roofCol="#f44336" label="📡 Weather"    labelCol="#ff8a80" sprite={bldWeather as string} />
      <CityBuilding pos={[0, 3, -18]}    size={[9,6,8]}   wallCol="#1a1a2a" roofCol="#ab47bc" label="🚪 OG Gate"    labelCol="#ce93d8" sprite={bldOgGate as string} />
      <CityBuilding pos={[28, 3, 8]}     size={[9,6,8]}   wallCol="#1a3020" roofCol="#2e7d32" label="🎵 Anthem"     labelCol="#a5d6a7" sprite={bldAnthem as string} />
      <CityBuilding pos={[-28, 3, 8]}    size={[9,6,8]}   wallCol="#3a2010" roofCol="#bf360c" label="📞 Service"    labelCol="#ffccbc" sprite={bldCustomerService as string} />

      {/* Central fountain */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[3.5, 4, 0.8, 10]} />
          <meshStandardMaterial color="#5a5048" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.5, 6]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#3df7ff" emissive="#1080a0" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0, 2, 0]} intensity={2.5} color="#3df7ff" distance={16} />
      </group>

      {/* City walls */}
      {([
        [0, 2, -32, 64, 4, 1.5],
        [0, 2,  32, 64, 4, 1.5],
        [-32, 2, 0, 1.5, 4, 64],
        [ 32, 2, 0, 1.5, 4, 64],
      ] as [number,number,number,number,number,number][]).map(([x,y,z,w,h,d], i) => (
        <mesh key={i} position={[x,y,z]} castShadow>
          <boxGeometry args={[w,h,d]} />
          <meshStandardMaterial color="#6a5040" roughness={0.95} />
        </mesh>
      ))}

      {/* Lanterns */}
      {([[-28,4,0],[28,4,0],[0,4,-28],[0,4,28],[-14,4,-28],[14,4,-28],[-14,4,28],[14,4,28]] as [number,number,number][]).map(([x,y,z], i) => (
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,-2,0]}>
            <cylinderGeometry args={[0.08,0.08,4,4]} />
            <meshStandardMaterial color="#4a3828" />
          </mesh>
          <mesh position={[0,0.4,0]}>
            <boxGeometry args={[0.5,0.7,0.5]} />
            <meshStandardMaterial color="#ffd080" emissive="#ffd080" emissiveIntensity={2.5} transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
      <Billboard position={[0, 10, -33]}>
        <Text fontSize={1.4} color="#ffd600" outlineWidth={0.05} outlineColor="#000">🌴 BAHAMAS CITY 🌴</Text>
      </Billboard>
      <pointLight position={[0, 10, 0]} intensity={2} color="#ffa000" distance={55} />
    </group>
  );
});

// ─── EXILE FOREST NW ──────────────────────────────────────────────────────────

const EXILE_TREES: [number,number,number][] = [
  [-45,0,-45],[-38,0,-55],[-55,0,-38],[-62,0,-50],[-50,0,-62],
  [-35,0,-65],[-65,0,-35],[-42,0,-35],[-58,0,-58],[-30,0,-50],
  [-70,0,-45],[-48,0,-72],[-32,0,-40],[-72,0,-62],[-40,0,-48],
];

const ExileForest = memo(function ExileForest() {
  return (
    <group>
      {EXILE_TREES.map(([x,y,z], i) => (
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,2,0]}>
            <cylinderGeometry args={[0.3,0.5,4,4]} />
            <meshStandardMaterial color="#1a0a0a" roughness={0.95} />
          </mesh>
          <mesh position={[0,5.5,0]}>
            <coneGeometry args={[3.5,5,5]} />
            <meshStandardMaterial color="#0a1a0a" roughness={0.8} />
          </mesh>
          <mesh position={[0,8,0]}>
            <coneGeometry args={[2.5,4.5,5]} />
            <meshStandardMaterial color="#071407" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Exile signs */}
      {([
        { pos: [-42,0,-44] as [number,number,number], text: "EXILED FROM BAHAMAS" },
        { pos: [-55,0,-55] as [number,number,number], text: "NO RETURN" },
        { pos: [-38,0,-62] as [number,number,number], text: "YOU DISOBEYED NATTOUN" },
      ]).map((s, i) => (
        <group key={i} position={s.pos}>
          <mesh position={[0,1.5,0]}>
            <boxGeometry args={[4,2,0.15]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>
          <mesh position={[0,0.3,0]}>
            <cylinderGeometry args={[0.1,0.1,1,4]} />
            <meshStandardMaterial color="#3a2010" />
          </mesh>
          <Billboard position={[0,1.5,0.2]}>
            <Text fontSize={0.4} color="#3df7ff" outlineWidth={0.02} outlineColor="#000" anchorX="center">{s.text}</Text>
          </Billboard>
        </group>
      ))}
      {/* Will-o-wisps */}
      {([[-44,3,-48],[-60,4,-54],[-52,3.5,-62]] as [number,number,number][]).map(([x,y,z], i) => (
        <group key={i}>
          <mesh position={[x,y,z]}>
            <sphereGeometry args={[0.3,6,6]} />
            <meshStandardMaterial color="#3df7ff" emissive="#1080a0" emissiveIntensity={4} />
          </mesh>
          <pointLight position={[x,y,z]} intensity={1.5} color="#3df7ff" distance={10} />
        </group>
      ))}
      <Billboard position={[-52,22,-52]}>
        <Text fontSize={2} color="#3df7ff" outlineWidth={0.06} outlineColor="#000">THE EXILE FOREST</Text>
      </Billboard>
    </group>
  );
});

// ─── BANNED TUNDRA N ──────────────────────────────────────────────────────────

const BannedTundra = memo(function BannedTundra() {
  const iceCitizens: [number,number,number][] = [
    [8,0,-48],[20,0,-55],[-10,0,-60],[30,0,-62],[-5,0,-72],
  ];
  return (
    <group>
      {iceCitizens.map(([x,y,z], i) => (
        <group key={i} position={[x,y+0.5,z]}>
          <mesh position={[0,0.8,0]}>
            <boxGeometry args={[0.6,1.2,0.3]} />
            <meshStandardMaterial color="#c0e8ff" roughness={0.1} metalness={0.3} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0,1.7,0]}>
            <boxGeometry args={[0.5,0.5,0.5]} />
            <meshStandardMaterial color="#b0d8ef" roughness={0.1} metalness={0.3} transparent opacity={0.85} />
          </mesh>
          <Billboard position={[0,2.5,0]}>
            <Text fontSize={0.35} color="#ff4444" outlineWidth={0.02} outlineColor="#000">BANNED</Text>
          </Billboard>
        </group>
      ))}
      {/* Ice crystals */}
      {([
        [15,0,-45],[-18,0,-60],[28,0,-62],[0,0,-75],
      ] as [number,number,number][]).map(([x,y,z], i) => (
        <mesh key={i} position={[x,y+1.5,z]}>
          <octahedronGeometry args={[1.5+i*0.2, 0]} />
          <meshStandardMaterial color="#a0d8f0" roughness={0.1} metalness={0.3} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Frozen lake */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[10,0.05,-55]}>
        <circleGeometry args={[14,18]} />
        <meshStandardMaterial color="#90c8e8" roughness={0.05} metalness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* BANNED mega sign */}
      <group position={[0,0,-76]}>
        <mesh position={[0,5,0]}>
          <boxGeometry args={[20,8,1]} />
          <meshStandardMaterial color="#1a0000" emissive="#400000" emissiveIntensity={0.5} />
        </mesh>
        <Billboard position={[0,5,1]}>
          <Text fontSize={1.2} color="#ff0000" outlineWidth={0.05} outlineColor="#000">⛔ YOU HAVE BEEN BANNED ⛔</Text>
        </Billboard>
        <Billboard position={[0,3.5,1]}>
          <Text fontSize={0.5} color="#ff6666" outlineWidth={0.02} outlineColor="#000">IP: 192.168.PRESIDENT.NATTOUN</Text>
        </Billboard>
      </group>
      <Billboard position={[8,20,-58]}>
        <Text fontSize={2} color="#a0d8f0" outlineWidth={0.06} outlineColor="#0040a0">BANNED TUNDRA</Text>
      </Billboard>
      <pointLight position={[8,8,-55]} intensity={1.2} color="#406080" distance={55} />
    </group>
  );
});

// ─── TROLL DIMENSION E ────────────────────────────────────────────────────────

function TrollPortal() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.z = s.clock.elapsedTime * 0.5;
      const sc = 1 + Math.sin(s.clock.elapsedTime * 2.5) * 0.06;
      ref.current.scale.set(sc, sc, 1);
    }
  });
  return (
    <group position={[65, 0, -5]}>
      <mesh position={[0,8,0]}>
        <torusGeometry args={[7,0.9,8,20]} />
        <meshStandardMaterial color="#2a0040" emissive="#ff0080" emissiveIntensity={1.5} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh ref={ref} position={[0,8,0.1]}>
        <circleGeometry args={[6.5,20]} />
        <meshStandardMaterial color="#600090" emissive="#ff2d8c" emissiveIntensity={2} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {[-4,4].map((px, i) => (
        <mesh key={i} position={[px,8,0]}>
          <boxGeometry args={[1.4,16,1.4]} />
          <meshStandardMaterial color="#1a0030" emissive="#3a0060" emissiveIntensity={0.6} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      <pointLight position={[0,8,3]} intensity={5} color="#ff00cc" distance={32} />
    </group>
  );
}

const TrollDimension = memo(function TrollDimension() {
  const deadTrees: [number,number,number][] = [
    [48,0,-35],[58,0,-50],[72,0,-28],[50,0,22],[68,0,38],[75,0,12],[52,0,-15],
  ];
  return (
    <group>
      {deadTrees.map(([x,y,z], i) => (
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,3,0]}>
            <cylinderGeometry args={[0.2,0.4,6,4]} />
            <meshStandardMaterial color="#1a1020" roughness={0.95} />
          </mesh>
          {[1.2,2.4,3.8].map((h,j) => (
            <mesh key={j} position={[Math.cos(j*2.1)*1.5,h,Math.sin(j*2.1)*1.5]} rotation={[0.4,j*2.1,0.2]}>
              <cylinderGeometry args={[0.08,0.15,3,4]} />
              <meshStandardMaterial color="#0d0818" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Troll face statues */}
      {([[48,0,45],[70,-1,-55]] as [number,number,number][]).map(([x,y,z], i) => (
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,3,0]}>
            <boxGeometry args={[6,5,5]} />
            <meshStandardMaterial color="#4a1a4a" roughness={0.7} emissive="#300030" emissiveIntensity={0.25} />
          </mesh>
          {[-1.5,1.5].map((ex, ei) => (
            <mesh key={ei} position={[ex,3.5,2.6]}>
              <sphereGeometry args={[0.7,7,7]} />
              <meshStandardMaterial color="#ff2d8c" emissive="#ff0060" emissiveIntensity={3} />
            </mesh>
          ))}
          <mesh position={[0,1.5,2.6]}>
            <boxGeometry args={[3,0.6,0.2]} />
            <meshStandardMaterial color="#ff0040" emissive="#aa0020" emissiveIntensity={1} />
          </mesh>
        </group>
      ))}
      {/* Signs */}
      {([
        { pos: [50,0,-25] as [number,number,number], text: "L + RATIO + YOU FELL OFF" },
        { pos: [58,0,15]  as [number,number,number], text: "SKILL ISSUE" },
        { pos: [55,0,40]  as [number,number,number], text: "TOUCH GRASS" },
        { pos: [72,0,-20] as [number,number,number], text: "NATTOUN WAS RIGHT" },
      ]).map((s, i) => (
        <group key={i} position={s.pos}>
          <mesh position={[0,2.5,0]}>
            <boxGeometry args={[6,1.8,0.15]} />
            <meshStandardMaterial color="#1a0028" emissive="#2a0040" emissiveIntensity={0.3} />
          </mesh>
          <Billboard position={[0,2.5,0.2]}>
            <Text fontSize={0.42} color="#ff2d8c" outlineWidth={0.02} outlineColor="#000" anchorX="center">{s.text}</Text>
          </Billboard>
        </group>
      ))}
      {/* Toxic puddles */}
      {([[52,0.05,-25],[64,0.05,8],[57,0.05,32]] as [number,number,number][]).map(([x,y,z],i) => (
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,y,z]}>
          <circleGeometry args={[2+i*0.3,8]} />
          <meshStandardMaterial color="#cc00ff" emissive="#800090" emissiveIntensity={1.5} transparent opacity={0.65} />
        </mesh>
      ))}
      <TrollPortal />
      <Billboard position={[62,24,-5]}>
        <Text fontSize={2} color="#ff2d8c" outlineWidth={0.06} outlineColor="#000">TROLL DIMENSION</Text>
      </Billboard>
      <pointLight position={[62,10,-5]} intensity={2.5} color="#4a0060" distance={55} />
    </group>
  );
});

// ─── STREAM COLOSSEUM SE ──────────────────────────────────────────────────────

const StreamColosseum = memo(function StreamColosseum() {
  const walls: [number,number,number,number,number,number][] = [
    [56,5,42, 70,10,2],
    [56,5,72, 70,10,2],
    [22,5,57,  2,10,32],
    [90,5,57,  2,10,32],
  ];
  return (
    <group>
      {walls.map(([x,y,z,w,h,d], i) => (
        <mesh key={i} position={[x,y,z]}>
          <boxGeometry args={[w,h,d]} />
          <meshStandardMaterial color="#2d1848" roughness={0.8} emissive="#1a0030" emissiveIntensity={0.18} />
        </mesh>
      ))}
      {([[24,0,44],[88,0,44],[24,0,70],[88,0,70]] as [number,number,number][]).map(([x,y,z],i) => (
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,7,0]}>
            <cylinderGeometry args={[3,3.5,14,7]} />
            <meshStandardMaterial color="#3d1a5a" roughness={0.8} />
          </mesh>
          <mesh position={[0,15,0]}>
            <coneGeometry args={[3.8,4,7]} />
            <meshStandardMaterial color="#bd93f9" roughness={0.4} emissive="#4000a0" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      {/* Stage */}
      <group position={[56,0,57]}>
        <mesh position={[0,0.5,0]}>
          <boxGeometry args={[18,1,14]} />
          <meshStandardMaterial color="#3d2060" roughness={0.7} emissive="#200040" emissiveIntensity={0.4} />
        </mesh>
        {[[-6,4,0],[6,4,0]].map(([sx,sy,sz],i) => (
          <mesh key={i} position={[sx,sy,sz]}>
            <boxGeometry args={[5,5,0.2]} />
            <meshStandardMaterial color="#200060" emissive="#6600ff" emissiveIntensity={1.2} />
          </mesh>
        ))}
        <Billboard position={[0,8,0]}>
          <Text fontSize={1.2} color="#bd93f9" outlineWidth={0.05} outlineColor="#000">🎮 STREAM ARENA 🎮</Text>
        </Billboard>
        <Billboard position={[0,6.5,0]}>
          <Text fontSize={0.6} color="#ff2d8c" outlineWidth={0.03} outlineColor="#000">🔴 LIVE NOW</Text>
        </Billboard>
        <pointLight position={[0,5,0]} intensity={4} color="#8800ff" distance={28} />
      </group>
      <Billboard position={[56,24,57]}>
        <Text fontSize={2} color="#bd93f9" outlineWidth={0.06} outlineColor="#000">STREAM COLOSSEUM</Text>
      </Billboard>
    </group>
  );
});

// ─── SPAM SWAMP SW ────────────────────────────────────────────────────────────

const SWAMP_TREES: [number,number,number][] = [
  [-42,0,42],[-55,0,48],[-48,0,58],[-62,0,44],[-38,0,55],[-65,0,62],[-52,0,70],
];

const SpamSwamp = memo(function SpamSwamp() {
  return (
    <group>
      {SWAMP_TREES.map(([x,y,z], i) => (
        <group key={i} position={[x,y,z]}>
          <mesh position={[0,2,0]}>
            <cylinderGeometry args={[0.4,0.6,4,5]} />
            <meshStandardMaterial color="#1a2e0a" roughness={0.95} />
          </mesh>
          <mesh position={[0,5,0]}>
            <sphereGeometry args={[3,6,6]} />
            <meshStandardMaterial color="#1a3a0a" roughness={0.8} transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
      {([
        { pos: [-44,0,44] as [number,number,number], text: "CONGRATULATIONS!\nYOU WON 1000 NC" },
        { pos: [-56,0,54] as [number,number,number], text: "CLICK HERE!!!\nFREE BAHAMAS COINS" },
        { pos: [-48,0,65] as [number,number,number], text: "YOU HAVE (1) NEW MESSAGE\nFROM: NATTOUN_REAL" },
      ]).map((s, i) => (
        <group key={i} position={s.pos}>
          <mesh position={[0,3,0]}>
            <boxGeometry args={[7,3.5,0.2]} />
            <meshStandardMaterial color="#0a1a0a" emissive="#002200" emissiveIntensity={0.3} />
          </mesh>
          <Billboard position={[0,3,0.2]}>
            <Text fontSize={0.38} color="#39ff14" outlineWidth={0.02} outlineColor="#000" anchorX="center" anchorY="middle">{s.text}</Text>
          </Billboard>
        </group>
      ))}
      {/* Factory */}
      <group position={[-58,0,60]}>
        <mesh position={[0,4,0]}>
          <boxGeometry args={[12,8,10]} />
          <meshStandardMaterial color="#1a2a10" roughness={0.9} emissive="#002200" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[-2,9,0]}>
          <cylinderGeometry args={[1,1,4,5]} />
          <meshStandardMaterial color="#2a3a18" roughness={0.9} />
        </mesh>
        <mesh position={[-2,11.5,0]}>
          <sphereGeometry args={[1.2,7,7]} />
          <meshStandardMaterial color="#39ff14" emissive="#1a8000" emissiveIntensity={2} />
        </mesh>
        <Billboard position={[0,9,6]}>
          <Text fontSize={0.7} color="#39ff14" outlineWidth={0.03} outlineColor="#000">SPAM BOT FACTORY</Text>
        </Billboard>
        <pointLight position={[0,9,0]} intensity={2.5} color="#39ff14" distance={20} />
      </group>
      <Billboard position={[-54,22,54]}>
        <Text fontSize={2} color="#39ff14" outlineWidth={0.06} outlineColor="#002800">SPAM SWAMP</Text>
      </Billboard>
    </group>
  );
});

// ─── AMBIENT PARTICLES ────────────────────────────────────────────────────────

function Particles() {
  const count = 180;
  const pos = useRef(
    Float32Array.from({ length: count * 3 }, (_, i) => {
      const ax = i % 3;
      if (ax === 1) return Math.random() * 25 + 1;
      return (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    })
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.015; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#ff2d8c" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── BORDER WALLS ─────────────────────────────────────────────────────────────

function BorderWalls() {
  return (
    <>
      {([[0,5,-HALF],[0,5,HALF],[-HALF,5,0],[HALF,5,0]] as [number,number,number][]).map(([x,y,z],i) => (
        <mesh key={i} position={[x,y,z]} rotation={[0,i<2?0:Math.PI/2,0]}>
          <planeGeometry args={[WORLD_SIZE,10]} />
          <meshStandardMaterial color="#080810" side={THREE.BackSide} />
        </mesh>
      ))}
    </>
  );
}

// ─── OTHER PLAYERS (humanoid low-poly) ────────────────────────────────────────

function OtherPlayer({ p }: { p: WorldPlayer }) {
  const bodyRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    // Walking animation
    if (armLRef.current) armLRef.current.rotation.x = Math.sin(t*4)*0.5;
    if (armRRef.current) armRRef.current.rotation.x = -Math.sin(t*4)*0.5;
    if (legLRef.current) legLRef.current.rotation.x = -Math.sin(t*4)*0.5;
    if (legRRef.current) legRRef.current.rotation.x = Math.sin(t*4)*0.5;
  });
  const c = p.color;
  const hpPct = p.hp / p.maxHp;
  return (
    <group position={[p.x, p.y, p.z]}>
      <group ref={bodyRef}>
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
      </group>
      {/* Name tag */}
      <Billboard position={[0, 3.0, 0]}>
        <Text fontSize={0.32} color="white" outlineWidth={0.03} outlineColor="black" anchorX="center">{p.username}</Text>
      </Billboard>
      {/* HP bar */}
      <Billboard position={[0, 3.35, 0]}>
        <mesh position={[0,0,0]}>
          <planeGeometry args={[1, 0.09]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[-(0.5-(hpPct*0.5)), 0, 0.001]}>
          <planeGeometry args={[hpPct, 0.09]} />
          <meshBasicMaterial color="#39ff14" />
        </mesh>
      </Billboard>
    </group>
  );
}

// ─── MONSTER ENTITY ───────────────────────────────────────────────────────────

function MonsterBody({ type, body, accent, t }: {
  type: MonsterType; body: string; accent: string; t: number;
}) {
  // Each monster type has a distinct low-poly humanoid or creature shape
  switch (type) {
    case "guard": return (
      <>
        {/* Armored torso */}
        <mesh position={[0,1.4,0]} castShadow>
          <boxGeometry args={[1.1,1.5,0.65]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.2} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Armored head with helmet */}
        <mesh position={[0,2.5,0]} castShadow>
          <boxGeometry args={[0.85,0.82,0.82]} />
          <meshStandardMaterial color={body} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Helmet visor */}
        <mesh position={[0,2.55,0.44]}>
          <boxGeometry args={[0.65,0.25,0.08]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} />
        </mesh>
        {/* Helmet plume */}
        <mesh position={[0,3.1,0]}>
          <boxGeometry args={[0.18,0.55,0.18]} />
          <meshStandardMaterial color="#cc0000" emissive="#880000" emissiveIntensity={0.5} />
        </mesh>
        {/* Arms — armored */}
        {[-0.75,0.75].map((ax,i) => (
          <mesh key={i} position={[ax,1.55,0]}>
            <capsuleGeometry args={[0.18,0.9,3,6]} />
            <meshStandardMaterial color={body} roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        {/* Legs */}
        {[-0.28,0.28].map((lx,i) => (
          <mesh key={i} position={[lx,0.4,0]}>
            <capsuleGeometry args={[0.18,0.65,3,6]} />
            <meshStandardMaterial color={body} roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        {/* Spear */}
        <mesh position={[0.85,2.2,0]}>
          <cylinderGeometry args={[0.06,0.06,3.5,5]} />
          <meshStandardMaterial color="#999" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.85,4.0,0]}>
          <coneGeometry args={[0.2,0.7,5]} />
          <meshStandardMaterial color="#ddd" roughness={0.2} metalness={0.9} />
        </mesh>
      </>
    );

    case "troll": return (
      <>
        {/* Stocky goblin body */}
        <mesh position={[0,1.0,0]} castShadow>
          <boxGeometry args={[1.0,1.2,0.7]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.8} />
        </mesh>
        {/* Big troll head */}
        <mesh position={[0,2.1,0]} castShadow>
          <sphereGeometry args={[0.52,8,8]} />
          <meshStandardMaterial color={body} roughness={0.8} />
        </mesh>
        {/* Big ears */}
        {[-0.65,0.65].map((ex,i) => (
          <mesh key={i} position={[ex,2.1,0]} rotation={[0,0,i===0?0.6:-0.6]}>
            <coneGeometry args={[0.22,0.55,5]} />
            <meshStandardMaterial color={body} roughness={0.8} />
          </mesh>
        ))}
        {/* Glowing eyes */}
        {[-0.2,0.2].map((ex,i) => (
          <mesh key={i} position={[ex,2.18,0.45]}>
            <sphereGeometry args={[0.1,6,6]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} />
          </mesh>
        ))}
        {/* Angry brow */}
        <mesh position={[0,2.35,0.44]}>
          <boxGeometry args={[0.5,0.1,0.12]} />
          <meshStandardMaterial color="#300" />
        </mesh>
        {/* Stubby arms */}
        {[-0.72,0.72].map((ax,i) => (
          <mesh key={i} position={[ax,1.1,0]} rotation={[0,0,i===0?0.3:-0.3]}>
            <capsuleGeometry args={[0.16,0.65,3,5]} />
            <meshStandardMaterial color={body} roughness={0.8} />
          </mesh>
        ))}
        {/* Legs */}
        {[-0.24,0.24].map((lx,i) => (
          <mesh key={i} position={[lx,0.25,0]}>
            <capsuleGeometry args={[0.18,0.4,3,5]} />
            <meshStandardMaterial color={body} roughness={0.8} />
          </mesh>
        ))}
        {/* Club weapon */}
        <mesh position={[0.85,1.4,0]} rotation={[0,0,-0.5]}>
          <cylinderGeometry args={[0.1,0.22,1.4,5]} />
          <meshStandardMaterial color="#3a2010" roughness={0.9} />
        </mesh>
      </>
    );

    case "ghost": {
      const wave = Math.sin(t * 1.8) * 0.05;
      return (
        <>
          {/* Flowing spectral body */}
          <mesh position={[0, wave, 0]}>
            <sphereGeometry args={[0.75,10,10]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.9} transparent opacity={0.72} roughness={0.2} />
          </mesh>
          {/* Hood / head */}
          <mesh position={[0, 0.75+wave, 0]}>
            <sphereGeometry args={[0.45,8,8]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.7} transparent opacity={0.8} />
          </mesh>
          {/* Wispy tail */}
          <mesh position={[0, -1.0+wave, 0]}>
            <coneGeometry args={[0.72, 1.5, 7, 1, true]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          {/* Glowing eyes */}
          {[-0.22,0.22].map((ex,i) => (
            <mesh key={i} position={[ex, 0.82+wave, 0.4]}>
              <sphereGeometry args={[0.1,6,6]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={8} />
            </mesh>
          ))}
          {/* Ghost arms — wispy */}
          {[-0.9,0.9].map((ax,i) => (
            <mesh key={i} position={[ax, -0.1+wave, 0]} rotation={[0,0,i===0?0.7:-0.7]}>
              <capsuleGeometry args={[0.12,0.55,3,5]} />
              <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.55} />
            </mesh>
          ))}
          <pointLight position={[0,0,0]} intensity={2} color={accent} distance={7} />
        </>
      );
    }

    case "spambot": return (
      <>
        {/* Boxy robot body */}
        <mesh position={[0,0.9,0]} castShadow>
          <boxGeometry args={[1.1,1.0,0.9]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Robot head */}
        <mesh position={[0,1.85,0]}>
          <boxGeometry args={[0.7,0.58,0.7]} />
          <meshStandardMaterial color={body} roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Antenna */}
        <mesh position={[0,2.35,0]}>
          <cylinderGeometry args={[0.04,0.04,0.6,4]} />
          <meshStandardMaterial color="#ccc" metalness={0.8} />
        </mesh>
        <mesh position={[0,2.7,0]}>
          <sphereGeometry args={[0.1,5,5]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} />
        </mesh>
        {/* Screen face */}
        <mesh position={[0,1.88,0.36]}>
          <planeGeometry args={[0.5,0.35]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
        </mesh>
        {/* Pixel eyes */}
        {[-0.12,0.12].map((ex,i) => (
          <mesh key={i} position={[ex,1.92,0.37]}>
            <planeGeometry args={[0.1,0.08]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        ))}
        {/* Mechanical arms */}
        {[-0.75,0.75].map((ax,i) => (
          <mesh key={i} position={[ax,0.95,0]}>
            <boxGeometry args={[0.25,0.9,0.25]} />
            <meshStandardMaterial color={body} roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
        {/* Treads/legs */}
        {[-0.28,0.28].map((lx,i) => (
          <mesh key={i} position={[lx,0.25,0]}>
            <boxGeometry args={[0.35,0.5,0.6]} />
            <meshStandardMaterial color="#0a1a0a" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
        {/* Rotating wheels */}
        {[0,1,2,3,4,5].map(i => {
          const a = (i/6)*Math.PI*2;
          return (
            <mesh key={i} position={[Math.cos(a)*0.7,0.5,Math.sin(a)*0.7]} rotation={[0,a,0.6]}>
              <cylinderGeometry args={[0.06,0.06,1,4]} />
              <meshStandardMaterial color={body} roughness={0.3} metalness={0.6} />
            </mesh>
          );
        })}
      </>
    );

    case "iceling": return (
      <>
        {/* Crystal torso */}
        <mesh position={[0,1.2,0]} castShadow>
          <octahedronGeometry args={[0.7,0]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.05} metalness={0.4} transparent opacity={0.88} />
        </mesh>
        {/* Crystal head */}
        <mesh position={[0,2.25,0]}>
          <octahedronGeometry args={[0.42,0]} />
          <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.4} roughness={0.05} metalness={0.4} transparent opacity={0.9} />
        </mesh>
        {/* Ice crown spikes */}
        {[0,1,2,3,4].map(i => {
          const a = (i/5)*Math.PI*2;
          return (
            <mesh key={i} position={[Math.cos(a)*0.35,2.75,Math.sin(a)*0.35]} rotation={[0.3,a,0]}>
              <coneGeometry args={[0.08,0.45,4]} />
              <meshStandardMaterial color="#d0f0ff" emissive="#80c8ff" emissiveIntensity={1.5} transparent opacity={0.85} />
            </mesh>
          );
        })}
        {/* Crystal arms */}
        {[-0.65,0.65].map((ax,i) => (
          <mesh key={i} position={[ax,1.4,0]} rotation={[0,0,i===0?0.4:-0.4]}>
            <octahedronGeometry args={[0.22,0]} />
            <meshStandardMaterial color={body} roughness={0.05} metalness={0.4} transparent opacity={0.85} />
          </mesh>
        ))}
        {/* Ice shards orbiting */}
        {[0,1,2,3].map(i => {
          const a = (i/4)*Math.PI*2 + t * 0.8;
          return (
            <mesh key={i} position={[Math.cos(a)*0.9,1.2,Math.sin(a)*0.9]} rotation={[0,a,0.5]}>
              <coneGeometry args={[0.1,0.6,4]} />
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
          {/* Main blob — pulsing */}
          <mesh position={[0,0.7,0]} scale={[pulse, 1/pulse, pulse]}>
            <sphereGeometry args={[0.72,10,10]} />
            <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} roughness={0.2} transparent opacity={0.88} />
          </mesh>
          {/* Googly eyes */}
          {[-0.24,0.24].map((ex,i) => (
            <group key={i} position={[ex,0.88,0.62*pulse]}>
              <mesh>
                <sphereGeometry args={[0.16,6,6]} />
                <meshStandardMaterial color="white" roughness={0.1} />
              </mesh>
              <mesh position={[0,0,0.12]}>
                <sphereGeometry args={[0.09,5,5]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={4} />
              </mesh>
            </group>
          ))}
          {/* Mouth smile */}
          <mesh position={[0,0.55,0.7*pulse]}>
            <torusGeometry args={[0.18,0.04,4,8,Math.PI]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
          </mesh>
          {/* Mini blob drips */}
          {[-0.5,0,0.5].map((dx,i) => (
            <mesh key={i} position={[dx,-0.05+Math.sin(t*3+i)*0.05,0.5]}>
              <sphereGeometry args={[0.14,5,5]} />
              <meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.4} transparent opacity={0.7} />
            </mesh>
          ))}
        </>
      );
    }

    default: return null;
  }
}

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
          sp.x + (Math.random()-0.5)*16,
          mon.type === "ghost" ? 1.5 : 0,
          sp.z + (Math.random()-0.5)*16,
        );
        mon.lastPatrolChange = performance.now();
      }
      const dir = new THREE.Vector3().subVectors(mon.patrolTarget, mon.pos).setY(0).normalize();
      mon.pos.addScaledVector(dir, MON_SPEED[mon.type] * 0.4 * dt);
    }

    mon.pos.x = Math.max(-HALF+2, Math.min(HALF-2, mon.pos.x));
    mon.pos.z = Math.max(-HALF+2, Math.min(HALF-2, mon.pos.z));
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
        <mesh position={[0,0,0]}>
          <planeGeometry args={[1.3,0.13]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[-(0.65-(hpPct*0.65)),0,0.001]}>
          <planeGeometry args={[hpPct*1.3,0.13]} />
          <meshBasicMaterial color={hpPct>0.5?"#39ff14":hpPct>0.25?"#ffa000":"#ff2200"} />
        </mesh>
        <Text position={[0,0.2,0]} fontSize={0.26} color="white" outlineWidth={0.02} outlineColor="#000" anchorX="center">
          {mon.type.toUpperCase()} {mon.hp}/{mon.maxHp}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── PLAYER CONTROLLER (movement + combat) ────────────────────────────────────

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
  const up3 = useRef(new THREE.Vector3(0,1,0));

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
        const baseDmg = 18 + Math.floor(Math.random()*10);
        const crit = Math.random() < 0.15;
        const dmg = crit ? Math.floor(baseDmg*2.2) : baseDmg;
        onMonsterHit(bestId, dmg, m.pos.x, m.pos.y+2, m.pos.z);
      }
    };

    const trySkill = (idx: number, now: number) => {
      const sk = skills[idx];
      if (!sk) return;
      if (now - skillCooldowns.current[idx] < sk.cooldown*1000) return;
      skillCooldowns.current[idx] = now;
      onSkillUse(idx);
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      const baseDmg = 25 + Math.floor(Math.random()*15);
      if (sk.aoe) {
        for (const m of monstersRef.current) {
          if (!m.alive) continue;
          if (m.pos.distanceTo(camera.position) > sk.range) continue;
          const dmg = Math.floor(baseDmg * sk.dmgMult * (0.8+Math.random()*0.4));
          const crit = Math.random() < 0.2;
          onMonsterHit(m.id, crit?Math.floor(dmg*2):dmg, m.pos.x, m.pos.y+2, m.pos.z);
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
          const dmg = Math.floor(baseDmg * sk.dmgMult * (0.85+Math.random()*0.3));
          const crit = Math.random() < 0.25;
          onMonsterHit(bestId, crit?Math.floor(dmg*2):dmg, m.pos.x, m.pos.y+2, m.pos.z);
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

    if (k["KeyW"]||k["ArrowUp"])    camera.position.addScaledVector(fwd.current,    speed);
    if (k["KeyS"]||k["ArrowDown"])  camera.position.addScaledVector(fwd.current,   -speed);
    if (k["KeyA"]||k["ArrowLeft"])  camera.position.addScaledVector(right.current, -speed);
    if (k["KeyD"]||k["ArrowRight"]) camera.position.addScaledVector(right.current,  speed);

    if ((k["Space"]||k["KeySpace"]) && onGround.current) {
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

    camera.position.x = Math.max(-HALF+2, Math.min(HALF-2, camera.position.x));
    camera.position.z = Math.max(-HALF+2, Math.min(HALF-2, camera.position.z));

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
      <color attach="background" args={["#06080e"]} />
      <fog attach="fog" args={["#06080e", 60, 175]} />
      <ambientLight intensity={0.45} color="#a0b0c8" />
      <directionalLight position={[30,60,20]} intensity={0.8} color="#e8e0d0"
        castShadow shadow-mapSize={[1024,1024]} shadow-camera-far={140}
        shadow-camera-left={-70} shadow-camera-right={70}
        shadow-camera-top={70} shadow-camera-bottom={-70} />
      <Sky sunPosition={[0.2,0.05,1]} turbidity={10} rayleigh={2.5}
        mieCoefficient={0.005} mieDirectionalG={0.7} />

      <Suspense fallback={null}>
        <MapGround />
      </Suspense>
      <BorderWalls />
      <Particles />

      <Suspense fallback={null}>
        <BahamasCity />
        <ExileForest />
        <BannedTundra />
        <TrollDimension />
        <StreamColosseum />
        <SpamSwamp />
      </Suspense>

      {monstersRef.current.map((mon) => (
        <MonsterEntity key={mon.id} mon={mon} onHit={onMonsterHit} playerHpCb={playerHpCb} />
      ))}

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

// ─── MINIMAP — uses the actual Bahamas Land map image ─────────────────────────

function Minimap({ x, z }: { x: number; z: number }) {
  const SIZE = 110;
  const half = WORLD_SIZE / 2;
  const px = ((x + half) / WORLD_SIZE) * SIZE;
  const py = ((z + half) / WORLD_SIZE) * SIZE;

  return (
    <div className="relative overflow-hidden border border-white/25 bg-black/80"
      style={{ width: SIZE, height: SIZE }}>
      {/* Actual Bahamas Land map image */}
      <img
        src={mapBg as string}
        alt="map"
        draggable={false}
        style={{ width: SIZE, height: SIZE, display: "block", opacity: 0.88, imageRendering: "pixelated" }}
      />
      {/* Player dot */}
      <div
        className="absolute rounded-full bg-white z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          left: px, top: py, width: 8, height: 8,
          boxShadow: "0 0 0 2px #ff2d8c, 0 0 10px #fff",
        }}
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
    const id = setInterval(() => forceRender(n => n+1), 100);
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
          <motion.div initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
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
                style={{ width: `${hpPct*100}%`, background: hpPct>0.5?"#39ff14":hpPct>0.25?"#ffa000":"#ff2200" }} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-mono text-[9px] uppercase">MP</span>
              <span className="text-blue-300 font-mono text-[9px]">{mp}/{maxMp}</span>
            </div>
            <div className="bg-black/60 h-2 w-full">
              <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${mpPct*100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-[9px] uppercase">XP</span>
            <div className="flex-1 bg-black/50 h-1.5">
              <div className="h-full bg-yellow-400" style={{ width: `${xp%100}%` }} />
            </div>
            <span className="text-yellow-300 font-mono text-[9px]">Lv.{Math.floor(xp/100)+1}</span>
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
                  <div className={`w-full h-full border-2 flex flex-col items-center justify-center transition-all ${onCd?"opacity-50":"opacity-100 hover:scale-105"}`}
                    style={{ background: onCd?"#111":`${sk.color}22`, borderColor: sk.color,
                      boxShadow: onCd?"none":`0 0 12px ${sk.color}55` }}>
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
              <span style={{ color:"#ff2d8c" }}>{m.username}: </span>
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
                if (e.key==="Enter") { sendChat(); setShowChat(false); }
                if (e.key==="Escape") setShowChat(false);
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
      initial={{ opacity:0 }} animate={{ opacity:[0,0.3,0] }} transition={{ duration:0.5 }}>
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
      if (changed) forceMonsterRender(n => n+1);
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
        await ch.track({ id:myId, username:myUsername, color:myColor, character:myOrigin, x:0, y:PLAYER_H, z:0, rx:0, hp, maxHp });
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
    channelRef.current.track({ id:myId, username:myUsername, color:myColor, character:myOrigin, x, y, z, rx, hp, maxHp });
  }, [myId, myUsername, myColor, myOrigin, hp]);

  const handleChat = useCallback((text: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({ type:"broadcast", event:"chat", payload:{ username:myUsername, text } });
    setChatMessages(prev => [...prev.slice(-50), { username:myUsername, text, id:Date.now() }]);
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
      setKills(k => k+1);
      setXp(x => x + MON_XP[mon.type]);
      setChatMessages(prev => [...prev.slice(-50), {
        username: "System",
        text: `🗡 ${myUsername} slayed a ${mon.type}! +${MON_XP[mon.type]} XP`,
        id: Date.now(),
      }]);
    }
    forceMonsterRender(n => n+1);
    const screenX = window.innerWidth/2 + (Math.random()-0.5)*180;
    const screenY = window.innerHeight/2 + (Math.random()-0.5)*80 - 40;
    setDmgNums(prev => [...prev.slice(-15), { id: ++dmgIdRef.current, x:screenX, y:screenY, val:dmg, crit, born:Date.now() }]);
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
    const screenX = window.innerWidth/2 + (Math.random()-0.5)*60;
    const screenY = window.innerHeight/2 - 40;
    setDmgNums(prev => [...prev.slice(-15), {
      id: ++dmgIdRef.current, x:screenX, y:screenY, val:dmg, crit:false, born:Date.now(),
    }]);
  }, [dead]);

  const handleSkillUse = useCallback((idx: number) => {
    skillCooldownsRef.current[idx] = performance.now();
    setLastSkillUsed(prev => { const n=[...prev]; n[idx]=Date.now(); return n; });
    const sk = skills[idx];
    if (sk) {
      setSkillFlash({ color: sk.color, label: sk.label });
      setMp(m => Math.max(0, m - 20));
      setTimeout(() => setSkillFlash(null), 600);
    }
  }, [skills]);

  const handleClickToLock = () => {
    canvasRef.current?.querySelector("canvas")?.requestPointerLock?.();
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" ref={canvasRef}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, PLAYER_H, 5] }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
      >
        <Suspense fallback={null}>
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
        </Suspense>
      </Canvas>

      <DamageNumbers nums={dmgNums} />
      {skillFlash && <SkillFlash color={skillFlash.color} label={skillFlash.label} />}

      <AnimatePresence>
        {dead && (
          <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div initial={{ scale:0.6 }} animate={{ scale:1 }}
              className="text-red-500 font-black uppercase text-7xl"
              style={{ textShadow:"0 0 40px red" }}>
              YOU DIED
            </motion.div>
            <div className="text-red-300 font-mono text-sm uppercase mt-4">
              Nattoun is disappointed in you.
            </div>
            <div className="text-white/30 font-mono text-xs uppercase mt-2 animate-pulse">
              Respawning in 4 seconds...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HUD
        username={myUsername} color={myColor} origin={myOrigin}
        hp={hp} maxHp={maxHp} mp={mp} maxMp={maxMp}
        kills={kills} xp={xp}
        skills={skills} skillCooldowns={skillCooldownsRef}
        lastSkillUsed={lastSkillUsed}
        chatMessages={chatMessages} onChat={handleChat}
        locked={locked} onClickToLock={handleClickToLock}
        onLeave={() => setLocation("/world")}
        playerX={playerPos.x} playerZ={playerPos.z}
        onlineCount={otherPlayers.length + 1}
      />
    </div>
  );
}
