import {
  Suspense, useRef, useState, useEffect, useCallback, memo, useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sky, Text, Billboard } from "@react-three/drei";
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
  id: number; type: MonsterType;
  pos: THREE.Vector3; spawnPos: THREE.Vector3;
  hp: number; maxHp: number;
  alive: boolean; aggro: boolean;
  lastAttack: number; lastPatrolChange: number;
  patrolTarget: THREE.Vector3; floatOffset: number;
};

type DmgNumber = { id: number; x: number; y: number; val: number; crit: boolean; born: number };

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

const MON_SPEED: Record<MonsterType, number> = { troll:4.8, ghost:2.8, guard:3.5, spambot:5.5, iceling:2.2, slime:3.8 };
const MON_DMG:   Record<MonsterType, number> = { troll:8, ghost:14, guard:16, spambot:6, iceling:11, slime:7 };
const MON_HP:    Record<MonsterType, number> = { troll:60, ghost:85, guard:140, spambot:45, iceling:75, slime:55 };
const MON_COL:   Record<MonsterType, [string,string]> = {
  troll:["#5a1a5a","#ff2d8c"], ghost:["#1a3060","#3df7ff"],
  guard:["#7a6000","#ffd600"], spambot:["#1a3a1a","#39ff14"],
  iceling:["#9ac8e8","#c0e8ff"], slime:["#4a0080","#bd93f9"],
};
const MON_XP: Record<MonsterType, number> = { troll:15, ghost:25, guard:40, spambot:12, iceling:20, slime:14 };

const CLASS_SKILLS: Record<string, SkillDef[]> = {
  Tank:     [{ key:"Q", label:"Shield Bash",   color:"#90a4ae", dmgMult:1.4, range:ATTACK_RANGE,   cooldown:4,  aoe:false },
             { key:"E", label:"Shockwave",     color:"#607d8b", dmgMult:0.9, range:ATTACK_RANGE+3, cooldown:8,  aoe:true  },
             { key:"R", label:"Iron Fortress", color:"#cfd8dc", dmgMult:2.5, range:ATTACK_RANGE+2, cooldown:20, aoe:true  }],
  Assassin: [{ key:"Q", label:"Backstab",    color:"#7c4dff", dmgMult:2.2, range:ATTACK_RANGE,   cooldown:5,  aoe:false },
             { key:"E", label:"Shadow Step", color:"#4a0080", dmgMult:1.5, range:SKILL_RANGE,    cooldown:10, aoe:false },
             { key:"R", label:"Death Mark",  color:"#e040fb", dmgMult:3.5, range:ATTACK_RANGE,   cooldown:25, aoe:false }],
  Mage:     [{ key:"Q", label:"Fireball",    color:"#ff6d00", dmgMult:1.8, range:SKILL_RANGE,   cooldown:3,  aoe:false },
             { key:"E", label:"Blizzard",    color:"#80d8ff", dmgMult:1.2, range:SKILL_RANGE-4, cooldown:10, aoe:true  },
             { key:"R", label:"Arcane Nuke", color:"#aa00ff", dmgMult:4.0, range:SKILL_RANGE,   cooldown:28, aoe:true  }],
  Ranger:   [{ key:"Q", label:"Arrow Shot",     color:"#76c442", dmgMult:1.6, range:SKILL_RANGE+5, cooldown:3,  aoe:false },
             { key:"E", label:"Rain of Arrows", color:"#388e3c", dmgMult:1.0, range:SKILL_RANGE,   cooldown:12, aoe:true  },
             { key:"R", label:"Eagle Strike",   color:"#b8ff59", dmgMult:3.2, range:SKILL_RANGE+8, cooldown:22, aoe:false }],
  Berserker:[{ key:"Q", label:"Whirlwind",      color:"#ff3d00", dmgMult:1.3, range:ATTACK_RANGE+2, cooldown:6,  aoe:true  },
             { key:"E", label:"Bloodthirst",    color:"#b71c1c", dmgMult:1.8, range:ATTACK_RANGE,   cooldown:10, aoe:false },
             { key:"R", label:"Berserker Rage", color:"#ff6e40", dmgMult:3.8, range:ATTACK_RANGE+3, cooldown:30, aoe:true  }],
  Paladin:  [{ key:"Q", label:"Holy Strike",  color:"#ffd600", dmgMult:1.5, range:ATTACK_RANGE,   cooldown:4,  aoe:false },
             { key:"E", label:"Consecration", color:"#ffab00", dmgMult:1.0, range:ATTACK_RANGE+3, cooldown:12, aoe:true  },
             { key:"R", label:"Divine Wrath", color:"#fff9c4", dmgMult:3.0, range:SKILL_RANGE,    cooldown:24, aoe:true  }],
};
const DEFAULT_SKILLS = CLASS_SKILLS.Tank;

const SPAWN_LIST: { id: number; type: MonsterType; x: number; z: number }[] = [
  { id:1,  type:"guard",   x:24,  z:6   }, { id:2,  type:"guard",   x:-24, z:6   },
  { id:3,  type:"guard",   x:6,   z:-26 }, { id:4,  type:"guard",   x:-6,  z:26  },
  { id:5,  type:"troll",   x:58,  z:-18 }, { id:6,  type:"troll",   x:68,  z:6   },
  { id:7,  type:"troll",   x:62,  z:34  }, { id:8,  type:"troll",   x:75,  z:-38 },
  { id:9,  type:"ghost",   x:-50, z:-46 }, { id:10, type:"ghost",   x:-62, z:-58 },
  { id:11, type:"ghost",   x:-42, z:-62 }, { id:12, type:"spambot", x:-50, z:48  },
  { id:13, type:"spambot", x:-62, z:57  }, { id:14, type:"spambot", x:-54, z:38  },
  { id:15, type:"iceling", x:2,   z:-54 }, { id:16, type:"iceling", x:22,  z:-62 },
  { id:17, type:"iceling", x:-16, z:-68 }, { id:18, type:"slime",   x:50,  z:52  },
  { id:19, type:"slime",   x:62,  z:60  }, { id:20, type:"slime",   x:56,  z:70  },
];

function makeMonster(def: typeof SPAWN_LIST[0]): MonsterRuntime {
  const sp = new THREE.Vector3(def.x, 0, def.z);
  return {
    id:def.id, type:def.type,
    pos:sp.clone(), spawnPos:sp.clone(),
    hp:MON_HP[def.type], maxHp:MON_HP[def.type],
    alive:true, aggro:false,
    lastAttack:0, lastPatrolChange:0, floatOffset:Math.random()*Math.PI*2,
    patrolTarget:sp.clone().add(new THREE.Vector3((Math.random()-.5)*10,0,(Math.random()-.5)*10)),
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
  city:      { name:"Bahamas City",     color:"#ffd600", danger:"Safe Zone"   },
  exile:     { name:"The Exile Forest", color:"#3df7ff", danger:"Danger Lv.3" },
  banned:    { name:"Banned Tundra",    color:"#80d8ff", danger:"Danger Lv.3" },
  troll:     { name:"Troll Dimension",  color:"#ff2d8c", danger:"Danger Lv.5" },
  stream:    { name:"Stream Colosseum", color:"#bd93f9", danger:"Danger Lv.4" },
  spam:      { name:"Spam Swamp",       color:"#39ff14", danger:"Danger Lv.3" },
  grassland: { name:"Bahamas Plains",   color:"#76c442", danger:"Danger Lv.1" },
};

// ─── TERRAIN HEIGHT ───────────────────────────────────────────────────────────

function getTerrainHeight(x: number, z: number): number {
  let h = Math.sin(x*0.09)*Math.cos(z*0.08)*1.6 + Math.sin(x*0.05+z*0.07)*2.0;
  const cityD = Math.max(Math.abs(x), Math.abs(z));
  if (cityD < 34) h *= 0.05;
  else if (cityD < 44) h *= (cityD-34)/10;
  if (z < -40 && x > -40 && x < 40) h += Math.min(1,((-z-40)/30))*4;
  if (x > 42) h -= 1;
  if (x < -35 && z < -35) h += Math.sin(x*0.18+z*0.14)*2;
  if (x < -30 && z > 30) h -= 1.5;
  const bx = Math.abs(x)-74, bz = Math.abs(z)-74;
  if (bx > 0) h += bx*bx*0.1;
  if (bz > 0) h += bz*bz*0.1;
  return h;
}

// ─── VERTEX-COLORED TERRAIN ───────────────────────────────────────────────────

const WorldTerrain = memo(function WorldTerrain() {
  const geo = useMemo(() => {
    const segs = 48; // keep low for perf
    const g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getY(i);
      const h = getTerrainHeight(x, z);
      pos.setZ(i, h);
      const cd = Math.max(Math.abs(x), Math.abs(z));
      let r=0.25, gv=0.54, b=0.12;
      if (Math.abs(x) > 72 || Math.abs(z) > 72)       { r=0.50; gv=0.48; b=0.44; }
      else if (cd < 36)                                  { r=0.54; gv=0.50; b=0.46; }
      else if (x<-35 && z<-35)                           { r=0.07; gv=0.17; b=0.05; }
      else if (z<-40 && x>-38 && x<42)                  { r=0.88; gv=0.93; b=0.97; }
      else if (x>42)                                     { r=0.08; gv=0.04; b=0.12; }
      else if (x>20 && z>32)                             { r=0.14; gv=0.07; b=0.22; }
      else if (x<-28 && z>28)                            { r=0.07; gv=0.22; b=0.05; }
      if (h > 12) { r=0.92; gv=0.95; b=0.99; }
      col.push(r, gv, b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow geometry={geo}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
});

// ─── WATER PLANE ─────────────────────────────────────────────────────────────

function WaterPlane({ pos, w, d, color="#2a6a9a" }: { pos:[number,number,number]; w:number; d:number; color?:string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(s => { if (ref.current) ref.current.position.y = pos[1]+Math.sin(s.clock.elapsedTime*0.7)*0.04; });
  return (
    <mesh ref={ref} position={pos} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[w,d]} />
      <meshStandardMaterial color={color} roughness={0.05} transparent opacity={0.72} />
    </mesh>
  );
}

// ─── KENNEY-STYLE TREE (2-cone for perf) ─────────────────────────────────────

function KenneyTreeInstanced({ positions, leaf="#3a8a22", trunk="#7a5030" }: {
  positions:[number,number,number][]; leaf?:string; trunk?:string;
}) {
  const trRef = useRef<THREE.InstancedMesh>(null);
  const c1Ref = useRef<THREE.InstancedMesh>(null);
  const c2Ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const d = new THREE.Object3D();
    positions.forEach(([x,y,z],i) => {
      const s = 0.82+Math.sin(i*2.3)*0.22;
      const ry = i*1.8;
      d.position.set(x, y+0.9*s, z); d.rotation.set(0,ry,0); d.scale.setScalar(s); d.updateMatrix();
      trRef.current?.setMatrixAt(i, d.matrix);
      d.position.set(x, y+2.4*s, z); d.scale.setScalar(s); d.updateMatrix();
      c1Ref.current?.setMatrixAt(i, d.matrix);
      d.position.set(x, y+3.8*s, z); d.scale.setScalar(s*0.8); d.updateMatrix();
      c2Ref.current?.setMatrixAt(i, d.matrix);
    });
    [trRef,c1Ref,c2Ref].forEach(r=>{ if(r.current){r.current.instanceMatrix.needsUpdate=true; r.current.computeBoundingSphere();}});
  },[positions]);
  const n = positions.length;
  return (
    <group>
      <instancedMesh ref={trRef} args={[undefined,undefined,n]}>
        <cylinderGeometry args={[0.2,0.3,1.8,5]} /><meshStandardMaterial color={trunk} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={c1Ref} args={[undefined,undefined,n]}>
        <coneGeometry args={[1.7,2.2,6]} /><meshStandardMaterial color={leaf} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={c2Ref} args={[undefined,undefined,n]}>
        <coneGeometry args={[1.1,1.6,6]} /><meshStandardMaterial color={new THREE.Color(leaf).multiplyScalar(1.15).getStyle()} roughness={1} />
      </instancedMesh>
    </group>
  );
}

function KenneyDeadTreeInstanced({ positions }: { positions:[number,number,number][] }) {
  const trRef = useRef<THREE.InstancedMesh>(null);
  const b1Ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const d = new THREE.Object3D();
    positions.forEach(([x,y,z],i) => {
      const s = 0.75+Math.sin(i*1.7)*0.28;
      d.position.set(x,y+3*s,z); d.rotation.set(0,i*2.2,0); d.scale.setScalar(s); d.updateMatrix();
      trRef.current?.setMatrixAt(i, d.matrix);
      d.position.set(x+Math.cos(i)*0.9*s,y+3.5*s,z+Math.sin(i)*0.9*s);
      d.rotation.set(0.4,i*2.2,0.3); d.scale.setScalar(s*0.6); d.updateMatrix();
      b1Ref.current?.setMatrixAt(i, d.matrix);
    });
    [trRef,b1Ref].forEach(r=>{ if(r.current){r.current.instanceMatrix.needsUpdate=true; r.current.computeBoundingSphere();}});
  },[positions]);
  const n = positions.length;
  return (
    <group>
      <instancedMesh ref={trRef} args={[undefined,undefined,n]}>
        <cylinderGeometry args={[0.16,0.28,6,5]} /><meshStandardMaterial color="#18120e" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={b1Ref} args={[undefined,undefined,n]}>
        <cylinderGeometry args={[0.08,0.14,2.4,4]} /><meshStandardMaterial color="#100c0a" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ─── KENNEY ROCK (instanced) ──────────────────────────────────────────────────

function KenneyRockInstanced({ positions, color="#7a7870" }: { positions:[number,number,number][]; color?:string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const d = new THREE.Object3D();
    positions.forEach(([x,y,z],i) => {
      const s = 0.45+Math.sin(i*3.1)*0.3;
      d.position.set(x, getTerrainHeight(x,z)+s*0.4, z);
      d.rotation.set(Math.sin(i)*0.4, i*1.2, Math.cos(i)*0.3);
      d.scale.set(s,s*0.7,s*1.1); d.updateMatrix();
      ref.current?.setMatrixAt(i, d.matrix);
    });
    if(ref.current){ref.current.instanceMatrix.needsUpdate=true; ref.current.computeBoundingSphere();}
  },[positions]);
  return (
    <instancedMesh ref={ref} args={[undefined,undefined,positions.length]}>
      <dodecahedronGeometry args={[0.6,0]} /><meshStandardMaterial color={color} roughness={1} />
    </instancedMesh>
  );
}

// ─── KENNEY LAMP POST ────────────────────────────────────────────────────────

function KenneyLamp({ pos, color="#ffd070" }: { pos:[number,number,number]; color?:string }) {
  const h = getTerrainHeight(pos[0], pos[2]);
  return (
    <group position={[pos[0],h,pos[2]]}>
      <mesh position={[0,2.5,0]}>
        <cylinderGeometry args={[0.07,0.12,5,6]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.55,5.0,0]}>
        <cylinderGeometry args={[0.04,0.04,1.1,5]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.55,5.5,0]}>
        <sphereGeometry args={[0.22,7,7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
      </mesh>
    </group>
  );
}

// ─── KENNEY WOOD SIGN ────────────────────────────────────────────────────────

function KenneySign({ pos, text, textCol="#eee" }: { pos:[number,number,number]; text:string; textCol?:string }) {
  const h = getTerrainHeight(pos[0],pos[2]);
  return (
    <group position={[pos[0],h,pos[2]]}>
      <mesh position={[0,1.3,0]}>
        <cylinderGeometry args={[0.07,0.09,2.6,5]} />
        <meshStandardMaterial color="#6b4820" roughness={1} />
      </mesh>
      <mesh position={[0,2.7,0]}>
        <boxGeometry args={[2.8,0.9,0.16]} />
        <meshStandardMaterial color="#8b5e28" roughness={1} />
      </mesh>
      <Billboard position={[0,2.7,0.12]}>
        <Text fontSize={0.34} color={textCol} outlineWidth={0.03} outlineColor="#000" anchorX="center">{text}</Text>
      </Billboard>
    </group>
  );
}

// ─── KENNEY.NL STYLE BUILDING ─────────────────────────────────────────────────
// Flat-color, chunky, pyramid roof — exactly the Kenney city-kit aesthetic.

function KenneyBuilding({
  pos, wallW=10, wallH=7, wallD=9,
  wallColor="#ece5d8",
  roofColor="#e07020",
  roofSides=4,
  trimColor="#d4c0a0",
  accentColor="#ffd080",
  label, labelColor="#222",
  hasDome=false,
}: {
  pos:[number,number,number];
  wallW?:number; wallH?:number; wallD?:number;
  wallColor?:string; roofColor?:string; roofSides?:number;
  trimColor?:string; accentColor?:string;
  label:string; labelColor?:string;
  hasDome?:boolean;
}) {
  const [bx,,bz] = pos;
  const h = getTerrainHeight(bx,bz);
  const halfH = wallH/2;
  return (
    <group position={[bx,h,bz]}>
      {/* Foundation platform — slightly wider, darker */}
      <mesh position={[0,0.25,0]}>
        <boxGeometry args={[wallW+1.4,0.5,wallD+1.4]} />
        <meshStandardMaterial color={trimColor} roughness={1} />
      </mesh>
      {/* Main wall body */}
      <mesh position={[0,halfH+0.5,0]}>
        <boxGeometry args={[wallW,wallH,wallD]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      {/* Roof trim band */}
      <mesh position={[0,wallH+0.75,0]}>
        <boxGeometry args={[wallW+0.3,0.5,wallD+0.3]} />
        <meshStandardMaterial color={trimColor} roughness={1} />
      </mesh>
      {/* Roof */}
      {hasDome ? (
        <mesh position={[0,wallH+1.5,0]}>
          <sphereGeometry args={[Math.max(wallW,wallD)*0.52,10,10,0,Math.PI*2,0,Math.PI/2]} />
          <meshStandardMaterial color={roofColor} roughness={0.8} />
        </mesh>
      ) : (
        <mesh position={[0,wallH+1.5,0]}>
          <coneGeometry args={[Math.max(wallW,wallD)*0.72,wallH*0.55,roofSides]} />
          <meshStandardMaterial color={roofColor} roughness={0.9} />
        </mesh>
      )}
      {/* Front door */}
      <mesh position={[0,2.0,wallD/2+0.04]}>
        <planeGeometry args={[2.0,3.2]} />
        <meshStandardMaterial color="#2e1608" roughness={1} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0,2.0,wallD/2+0.03]}>
        <boxGeometry args={[2.4,3.6,0.14]} />
        <meshStandardMaterial color={trimColor} roughness={1} />
      </mesh>
      <mesh position={[0,2.0,wallD/2+0.06]}>
        <planeGeometry args={[1.9,3.0]} />
        <meshStandardMaterial color="#2e1608" roughness={1} />
      </mesh>
      {/* Windows — bright yellow squares, Kenney style */}
      {(wallW > 7 ? [-wallW/4, wallW/4] : [0]).map((wx,i)=>(
        <group key={i}>
          {/* Window frame */}
          <mesh position={[wx,halfH+1.0,wallD/2+0.03]}>
            <boxGeometry args={[1.8,1.8,0.12]} />
            <meshStandardMaterial color={trimColor} roughness={1} />
          </mesh>
          {/* Window glass — bright warm yellow, Kenney style */}
          <mesh position={[wx,halfH+1.0,wallD/2+0.07]}>
            <planeGeometry args={[1.3,1.3]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
          </mesh>
          {/* Cross divider */}
          <mesh position={[wx,halfH+1.0,wallD/2+0.08]}>
            <boxGeometry args={[0.08,1.3,0.04]} />
            <meshStandardMaterial color={trimColor} roughness={1} />
          </mesh>
          <mesh position={[wx,halfH+1.0,wallD/2+0.08]}>
            <boxGeometry args={[1.3,0.08,0.04]} />
            <meshStandardMaterial color={trimColor} roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Sign board above door */}
      <mesh position={[0,wallH-0.5,wallD/2+0.1]}>
        <boxGeometry args={[Math.min(wallW-1,5.5),0.9,0.15]} />
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>
      <Billboard position={[0,wallH+1.5+wallH*0.42,0]}>
        <Text fontSize={0.72} color={labelColor} outlineWidth={0.04} outlineColor="#000" anchorX="center">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── NATTOUN PALACE (Kenney grand style) ──────────────────────────────────────

function NattounPalace() {
  const flagRef = useRef<THREE.Mesh>(null);
  useFrame(s => { if(flagRef.current) flagRef.current.rotation.z = Math.sin(s.clock.elapsedTime*2.5)*0.14; });
  const h = getTerrainHeight(0,-20);
  return (
    <group position={[0,h,-20]}>
      {/* Grand staircase steps */}
      {[0,1,2].map(step=>(
        <mesh key={step} position={[0,step*0.45,8-step*1.2]}>
          <boxGeometry args={[18-step*1.5,0.45,2.2]} />
          <meshStandardMaterial color="#c8b898" roughness={1} />
        </mesh>
      ))}
      {/* Main palace body */}
      <mesh position={[0,8.5,0]}>
        <boxGeometry args={[26,17,18]} />
        <meshStandardMaterial color="#f0e8d0" roughness={1} />
      </mesh>
      {/* Roof trim */}
      <mesh position={[0,17.5,0]}>
        <boxGeometry args={[27,0.6,19]} />
        <meshStandardMaterial color="#d4c0a0" roughness={1} />
      </mesh>
      {/* Grand pyramid roof — 4-sided, Kenney orange-gold */}
      <mesh position={[0,20.5,0]}>
        <coneGeometry args={[15.5,8,4]} />
        <meshStandardMaterial color="#e8a020" roughness={0.9} />
      </mesh>
      {/* Four corner towers */}
      {[[-13,-8],[13,-8],[-13,8],[13,8]].map(([tx,tz],i)=>(
        <group key={i} position={[tx,0,tz]}>
          {/* Tower cylinder */}
          <mesh position={[0,10,0]}>
            <cylinderGeometry args={[3.0,3.4,20,8]} />
            <meshStandardMaterial color="#e8dfc8" roughness={1} />
          </mesh>
          {/* Tower battlement ring */}
          <mesh position={[0,20.5,0]}>
            <cylinderGeometry args={[3.2,3.2,1.4,8]} />
            <meshStandardMaterial color="#d4c8a8" roughness={1} />
          </mesh>
          {/* Tower cone roof */}
          <mesh position={[0,22.5,0]}>
            <coneGeometry args={[3.5,5,8]} />
            <meshStandardMaterial color="#e8a020" roughness={0.9} />
          </mesh>
          {/* Flag pole */}
          <mesh position={[0,26,0]}>
            <cylinderGeometry args={[0.07,0.09,2.5,5]} />
            <meshStandardMaterial color="#999" />
          </mesh>
          {/* Flag */}
          <mesh ref={i===0?flagRef:undefined} position={[0.8,26.8,0]}>
            <planeGeometry args={[1.6,0.9]} />
            <meshStandardMaterial color="#cc0022" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Gate arch */}
      <mesh position={[0,4.0,9.3]}>
        <boxGeometry args={[7.5,8,0.7]} />
        <meshStandardMaterial color="#d4c0a0" roughness={1} />
      </mesh>
      <mesh position={[0,3.5,9.45]}>
        <boxGeometry args={[4.2,7,0.4]} />
        <meshStandardMaterial color="#1a0a04" roughness={1} />
      </mesh>
      {/* Arch top (half cylinder) */}
      <mesh position={[0,7.5,9.3]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[2.1,2.1,0.7,8,1,false,0,Math.PI]} />
        <meshStandardMaterial color="#d4c0a0" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* Entry torch pillars */}
      {[-5,5].map((tx,i)=>(
        <group key={i} position={[tx,6,9.4]}>
          <mesh><cylinderGeometry args={[0.4,0.5,8,6]} /><meshStandardMaterial color="#d4c8a8" roughness={1} /></mesh>
          <mesh position={[0,5,0]}><sphereGeometry args={[0.28,7,7]} /><meshStandardMaterial color="#ffcc00" emissive="#ff9900" emissiveIntensity={3} /></mesh>
        </group>
      ))}
      {/* Front windows (large arched) */}
      {[-8,8].map((wx,i)=>(
        <group key={i} position={[wx,9,9.15]}>
          <mesh><boxGeometry args={[2.5,5,0.18]} /><meshStandardMaterial color="#d4c0a0" roughness={1} /></mesh>
          <mesh position={[0,0,0.1]}><planeGeometry args={[2.0,4.5]} /><meshStandardMaterial color="#ffd080" emissive="#ffc040" emissiveIntensity={0.5} /></mesh>
        </group>
      ))}
      {/* Label */}
      <Billboard position={[0,30,0]}>
        <Text fontSize={1.8} color="#ffd600" outlineWidth={0.06} outlineColor="#000" anchorX="center">
          🏛 NATTOUN PALACE 🏛
        </Text>
      </Billboard>
      {/* Single warm point light for palace glow */}
      <pointLight position={[0,12,5]} intensity={2.5} color="#ffaa00" distance={45} />
    </group>
  );
}

// ─── STREAM STUDIO (Kenney broadcast style) ───────────────────────────────────

function StreamStudio() {
  const screenRef = useRef<THREE.Mesh>(null);
  useFrame(s => {
    if(screenRef.current) (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7+Math.sin(s.clock.elapsedTime*3)*0.25;
  });
  const h = getTerrainHeight(22,11);
  return (
    <group position={[22,h,11]}>
      {/* Foundation */}
      <mesh position={[0,0.25,0]}>
        <boxGeometry args={[19,0.5,15]} /><meshStandardMaterial color="#2a2a38" roughness={1} />
      </mesh>
      {/* Main body */}
      <mesh position={[0,6,0]}>
        <boxGeometry args={[17,12,13]} /><meshStandardMaterial color="#16082a" roughness={0.8} />
      </mesh>
      {/* Roof slab */}
      <mesh position={[0,12.7,0]}>
        <boxGeometry args={[18,1.4,14]} /><meshStandardMaterial color="#220a3a" roughness={0.8} />
      </mesh>
      {/* LED screen on front */}
      <mesh ref={screenRef} position={[0,6.5,6.6]}>
        <planeGeometry args={[13,8]} />
        <meshStandardMaterial color="#0a0060" emissive="#4400ff" emissiveIntensity={0.7} />
      </mesh>
      {/* LIVE text on screen */}
      <Billboard position={[0,8.5,7]}>
        <Text fontSize={1.0} color="#ff0040" outlineWidth={0.04} outlineColor="#000">🔴 LIVE — M3KKY</Text>
      </Billboard>
      <Billboard position={[0,6.5,7]}>
        <Text fontSize={0.52} color="#ffffff" outlineWidth={0.02} outlineColor="#000">BAHAMAS STREAMING</Text>
      </Billboard>
      {/* Satellite dish on roof */}
      <group position={[5,14,-1]}>
        <mesh position={[0,0,0]}><cylinderGeometry args={[0.09,0.09,2.2,5]} /><meshStandardMaterial color="#aaa" /></mesh>
        <mesh position={[0,1.3,0]} rotation={[-0.7,0,0]}>
          <coneGeometry args={[1.2,0.4,10,1,true]} /><meshStandardMaterial color="#ccc" side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Roof antenna */}
      <mesh position={[-4,16,0]}><cylinderGeometry args={[0.06,0.06,4,4]} /><meshStandardMaterial color="#888" /></mesh>
      {/* Corner neon rods */}
      {[[-8,10],[8,10],[-8,-6],[8,-6]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,12.8,lz]}>
          <boxGeometry args={[0.35,0.35,0.35]} />
          <meshStandardMaterial color={["#ff0080","#8800ff","#00ccff","#ff4400"][i]} emissive={["#ff0080","#8800ff","#00ccff","#ff4400"][i]} emissiveIntensity={3} />
        </mesh>
      ))}
      <pointLight position={[0,9,6]} intensity={2.5} color="#6600ff" distance={28} />
    </group>
  );
}

// ─── CITY FOUNTAIN ────────────────────────────────────────────────────────────

function CityFountain() {
  const jetRef = useRef<THREE.Mesh>(null);
  useFrame(s => { if(jetRef.current) jetRef.current.position.y = 2.6+Math.sin(s.clock.elapsedTime*2)*0.12; });
  return (
    <group position={[0,0,0]}>
      <mesh position={[0,0.3,0]}>
        <cylinderGeometry args={[4.0,4.5,0.6,12]} /><meshStandardMaterial color="#6a5a48" roughness={1} />
      </mesh>
      <mesh position={[0,0.55,0]}>
        <cylinderGeometry args={[3.6,3.6,0.15,12]} /><meshStandardMaterial color="#2a7ab0" roughness={0.1} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0,1.4,0]}><cylinderGeometry args={[0.26,0.34,1.8,8]} /><meshStandardMaterial color="#7a6a58" roughness={1} /></mesh>
      <mesh ref={jetRef} position={[0,2.6,0]}>
        <sphereGeometry args={[0.48,8,8]} />
        <meshStandardMaterial color="#60ddff" emissive="#10a0d0" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// ─── BAHAMAS CITY CENTER ──────────────────────────────────────────────────────

const BahamasCity = memo(function BahamasCity() {
  return (
    <group>
      <NattounPalace />
      <StreamStudio />
      {/* Kenney.nl style buildings — flat matte colors, pyramid roofs */}
      <KenneyBuilding pos={[-21,0,10]}  wallW={12} wallH={9}  wallD={10} wallColor="#e0d8c8" roofColor="#bb2222" roofSides={4} trimColor="#c8b8a0" accentColor="#ffd080" label="⚖ Court"    labelColor="#cc0000" />
      <KenneyBuilding pos={[0,0,21]}    wallW={13} wallH={8}  wallD={10} wallColor="#ece8d8" roofColor="#d4a800" roofSides={4} trimColor="#d4c8a0" accentColor="#ffd060" label="🏦 NC Bank"  labelColor="#8a6000" hasDome />
      <KenneyBuilding pos={[-19,0,-7]}  wallW={11} wallH={8}  wallD={9}  wallColor="#dce8f0" roofColor="#3355aa" roofSides={4} trimColor="#c0ccd8" accentColor="#ffffff" label="🎭 Museum"   labelColor="#334499" />
      <KenneyBuilding pos={[19,0,-7]}   wallW={10} wallH={7}  wallD={9}  wallColor="#d8e0f0" roofColor="#223388" roofSides={4} trimColor="#c0c8e0" accentColor="#aaccff" label="🚔 Police"   labelColor="#1122aa" />
      <KenneyBuilding pos={[-9,0,21]}   wallW={10} wallH={7}  wallD={9}  wallColor="#f0e8d8" roofColor="#885522" roofSides={4} trimColor="#d4c8a8" accentColor="#ffcc88" label="📚 Library"  labelColor="#664400" />
      <KenneyBuilding pos={[11,0,21]}   wallW={10} wallH={7}  wallD={9}  wallColor="#e8f0e0" roofColor="#228833" roofSides={4} trimColor="#c8d8c0" accentColor="#88ff88" label="📮 Post"     labelColor="#115522" />
      <KenneyBuilding pos={[-23,0,-20]} wallW={10} wallH={7}  wallD={9}  wallColor="#1a1a28" roofColor="#aa00ff" roofSides={4} trimColor="#2a2038" accentColor="#dd00ff" label="🎮 Arcade"   labelColor="#ee00ff" />
      <KenneyBuilding pos={[23,0,-20]}  wallW={10} wallH={7}  wallD={9}  wallColor="#e8f4f8" roofColor="#009999" roofSides={4} trimColor="#c8d8e0" accentColor="#00dddd" label="📡 Weather"  labelColor="#006666" />
      <KenneyBuilding pos={[0,0,-21]}   wallW={10} wallH={7}  wallD={9}  wallColor="#1a1828" roofColor="#880099" roofSides={4} trimColor="#241830" accentColor="#cc00ee" label="🚪 OG Gate"  labelColor="#cc00ee" />
      <KenneyBuilding pos={[30,0,9]}    wallW={10} wallH={7}  wallD={9}  wallColor="#e4f0e4" roofColor="#1a7030" roofSides={4} trimColor="#c4d8c4" accentColor="#88ee88" label="🎵 Anthem"   labelColor="#115522" />
      <KenneyBuilding pos={[-30,0,9]}   wallW={10} wallH={7}  wallD={9}  wallColor="#f4ece4" roofColor="#994422" roofSides={4} trimColor="#d8c8b8" accentColor="#ffaa66" label="📞 Service"  labelColor="#882211" />

      {/* Central fountain */}
      <CityFountain />

      {/* City walls — Kenney stone color */}
      {([[0,2.5,-35,72,5,2.2],[0,2.5,35,72,5,2.2],[-35,2.5,0,2.2,5,72],[35,2.5,0,2.2,5,72]] as [number,number,number,number,number,number][]).map(([x,y,z,w,hh,d],i)=>(
        <mesh key={i} position={[x,y,z]}>
          <boxGeometry args={[w,hh,d]} /><meshStandardMaterial color="#7a6858" roughness={1} />
        </mesh>
      ))}
      {/* Wall battlements */}
      {([-24,-14,-4,6,16,26] as number[]).map((wx,i)=>(
        <group key={i}>
          <mesh position={[wx,5.5,-35]}><boxGeometry args={[3.5,1.8,2.2]} /><meshStandardMaterial color="#8a7868" roughness={1} /></mesh>
          <mesh position={[wx,5.5,35]}><boxGeometry args={[3.5,1.8,2.2]} /><meshStandardMaterial color="#8a7868" roughness={1} /></mesh>
        </group>
      ))}

      {/* Street lamps — Kenney style */}
      {([[-26,0,0],[26,0,0],[0,0,-26],[0,0,26],[-14,0,-26],[14,0,-26],[-14,0,26],[14,0,26]] as [number,number,number][]).map((p,i)=>(
        <KenneyLamp key={i} pos={p} />
      ))}

      {/* Corner bushes */}
      {([[-32,0,-32],[32,0,-32],[-32,0,32],[32,0,32]] as [number,number,number][]).map((p,i)=>(
        <group key={i} position={[p[0],getTerrainHeight(p[0],p[2]),p[2]]}>
          <mesh position={[0,0.7,0]}><sphereGeometry args={[1.1,6,6]} /><meshStandardMaterial color="#4a9a22" roughness={1} /></mesh>
          <mesh position={[0.9,0.5,0.6]}><sphereGeometry args={[0.72,6,6]} /><meshStandardMaterial color="#3a8018" roughness={1} /></mesh>
        </group>
      ))}

      {/* City name */}
      <Billboard position={[0,6,-38]}>
        <Text fontSize={1.6} color="#ffd600" outlineWidth={0.05} outlineColor="#000">🌴 BAHAMAS CITY 🌴</Text>
      </Billboard>
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
      <KenneyDeadTreeInstanced positions={EXILE_TREES} />
      <KenneyRockInstanced positions={[[-48,0,-50],[-58,0,-38],[-40,0,-60],[-70,0,-48],[-52,0,-66]] as [number,number,number][]} color="#2a2420" />
      {([[-44,0,-42],[-50,0,-50],[-58,0,-44],[-36,0,-58],[-66,0,-54]] as [number,number,number][]).map((p,i)=>(
        <group key={i} position={[p[0],getTerrainHeight(p[0],p[2]),p[2]]}>
          <mesh position={[0,0.6,0]}><sphereGeometry args={[0.85,6,6]} /><meshStandardMaterial color="#1a2e10" roughness={1} /></mesh>
        </group>
      ))}
      <KenneySign pos={[-42,0,-44]} text="EXILED FROM BAHAMAS" textCol="#3df7ff" />
      <KenneySign pos={[-55,0,-55]} text="NO RETURN" textCol="#ff4444" />
      <KenneySign pos={[-38,0,-62]} text="YOU DISOBEYED NATTOUN" textCol="#3df7ff" />
      {([[-44,3,-48],[-60,4,-54],[-52,3.5,-62]] as [number,number,number][]).map(([x,y,z],i)=>(
        <group key={i}>
          <mesh position={[x,getTerrainHeight(x,z)+y,z]}>
            <sphereGeometry args={[0.26,6,6]} /><meshStandardMaterial color="#3df7ff" emissive="#10a0c0" emissiveIntensity={5} />
          </mesh>
        </group>
      ))}
      <Billboard position={[-52,22,-52]}>
        <Text fontSize={2} color="#3df7ff" outlineWidth={0.06} outlineColor="#000">THE EXILE FOREST</Text>
      </Billboard>
      <pointLight position={[-52,8,-52]} intensity={1.2} color="#10304a" distance={60} />
    </group>
  );
});

// ─── BANNED TUNDRA N ──────────────────────────────────────────────────────────

const BannedTundra = memo(function BannedTundra() {
  const citizens: [number,number,number][] = [[8,0,-48],[20,0,-55],[-10,0,-60],[30,0,-62],[-5,0,-72]];
  return (
    <group>
      {citizens.map(([x,y,z],i)=>{
        const h = getTerrainHeight(x,z);
        return (
          <group key={i} position={[x,h,z]}>
            <mesh position={[0,1.2,0]}>
              <boxGeometry args={[1.1,2.4,0.85]} /><meshStandardMaterial color="#a0d8f0" roughness={0.05} transparent opacity={0.78} />
            </mesh>
            <mesh position={[0,2.9,0]}>
              <boxGeometry args={[0.5,0.5,0.5]} /><meshStandardMaterial color="#c0e8ff" roughness={0.05} transparent opacity={0.8} />
            </mesh>
            <Billboard position={[0,3.8,0]}>
              <Text fontSize={0.3} color="#ff4444" outlineWidth={0.02} outlineColor="#000">BANNED</Text>
            </Billboard>
          </group>
        );
      })}
      {([[15,-45],[-18,-60],[28,-62],[0,-75],[-28,-52]] as [number,number][]).map(([px,pz],i)=>{
        const ph = getTerrainHeight(px,pz);
        return (
          <mesh key={i} position={[px,ph+2.2+i*0.2,pz]}>
            <octahedronGeometry args={[1.5+i*0.15,0]} /><meshStandardMaterial color="#a0d8f0" roughness={0.05} transparent opacity={0.82} />
          </mesh>
        );
      })}
      <WaterPlane pos={[10,getTerrainHeight(10,-55)+0.15,-55]} w={26} d={22} color="#90c8e8" />
      <KenneyRockInstanced positions={[[18,0,-48],[-8,0,-58],[25,0,-68],[5,0,-75],[-20,0,-65]] as [number,number,number][]} color="#d8eeff" />
      <group position={[0,getTerrainHeight(0,-76),-76]}>
        <mesh position={[0,6,0]}>
          <boxGeometry args={[22,8,1.6]} /><meshStandardMaterial color="#1a0000" roughness={1} />
        </mesh>
        <Billboard position={[0,6,1]}>
          <Text fontSize={1.2} color="#ff0000" outlineWidth={0.05} outlineColor="#000">⛔ YOU HAVE BEEN BANNED ⛔</Text>
        </Billboard>
        <Billboard position={[0,4.5,1]}>
          <Text fontSize={0.5} color="#ff6666" outlineWidth={0.02} outlineColor="#000">IP: 192.168.PRESIDENT.NATTOUN</Text>
        </Billboard>
      </group>
      <Billboard position={[8,20,-58]}>
        <Text fontSize={2} color="#a0d8f0" outlineWidth={0.06} outlineColor="#0040a0">BANNED TUNDRA</Text>
      </Billboard>
      <pointLight position={[8,8,-55]} intensity={1.2} color="#406090" distance={60} />
    </group>
  );
});

// ─── TROLL DIMENSION E ────────────────────────────────────────────────────────

function TrollPortal() {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  useFrame(s => {
    if(ringRef.current) ringRef.current.rotation.z = s.clock.elapsedTime*0.55;
    if(innerRef.current){ const sc=1+Math.sin(s.clock.elapsedTime*2.5)*0.06; innerRef.current.scale.set(sc,sc,1); }
  });
  const h = getTerrainHeight(65,-5);
  return (
    <group position={[65,h,-5]}>
      <mesh ref={ringRef} position={[0,9,0]}>
        <torusGeometry args={[7.5,1.0,8,20]} /><meshStandardMaterial color="#250035" emissive="#ff0090" emissiveIntensity={1.8} metalness={0.8} />
      </mesh>
      <mesh ref={innerRef} position={[0,9,0.1]}>
        <circleGeometry args={[7.0,20]} /><meshStandardMaterial color="#500080" emissive="#ff2d8c" emissiveIntensity={2.2} transparent opacity={0.88} side={THREE.DoubleSide} />
      </mesh>
      {[-5,5].map((px,i)=>(
        <mesh key={i} position={[px,9,0]}>
          <boxGeometry args={[1.4,18,1.4]} /><meshStandardMaterial color="#18002a" emissive="#3a0060" emissiveIntensity={0.7} />
        </mesh>
      ))}
      <pointLight position={[0,9,2]} intensity={4} color="#ff00cc" distance={35} />
    </group>
  );
}

const TROLL_DEAD_TREES: [number,number,number][] = [
  [48,0,-35],[58,0,-50],[72,0,-28],[50,0,22],[68,0,38],[75,0,12],[52,0,-15],[80,0,-15],[62,0,-42],
];

const TrollDimension = memo(function TrollDimension() {
  return (
    <group>
      <KenneyDeadTreeInstanced positions={TROLL_DEAD_TREES} />
      {([[48,0,45],[70,0,-55]] as [number,number,number][]).map(([x,y,z],i)=>{
        const h = getTerrainHeight(x,z);
        return (
          <group key={i} position={[x,h,z]}>
            <mesh position={[0,2.5,0]}><boxGeometry args={[5,5,5]} /><meshStandardMaterial color="#28082a" roughness={1} /></mesh>
            {[-1.0,1.0].map((ex,ei)=>(
              <mesh key={ei} position={[ex,3.0,2.65]}>
                <sphereGeometry args={[0.55,7,7]} /><meshStandardMaterial color="#ff2d8c" emissive="#ff0060" emissiveIntensity={4} />
              </mesh>
            ))}
            <mesh position={[0,2.0,2.65]}><boxGeometry args={[2.2,0.5,0.2]} /><meshStandardMaterial color="#ff0040" emissive="#aa0020" emissiveIntensity={1.2} /></mesh>
          </group>
        );
      })}
      {([[52,0,-25],[64,0,8],[57,0,32]] as [number,number,number][]).map(([x,y,z],i)=>(
        <WaterPlane key={i} pos={[x,getTerrainHeight(x,z)+0.2,z]} w={5} d={5} color="#cc00ff" />
      ))}
      <KenneySign pos={[50,0,-25]} text="L + RATIO" textCol="#ff2d8c" />
      <KenneySign pos={[58,0,15]} text="SKILL ISSUE" textCol="#ff2d8c" />
      <KenneySign pos={[72,0,-20]} text="NATTOUN WAS RIGHT" textCol="#ff2d8c" />
      <KenneyRockInstanced positions={[[55,0,-32],[70,0,15],[60,0,-50],[80,0,40]] as [number,number,number][]} color="#280838" />
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
  const scrRef = useRef<THREE.Mesh>(null);
  useFrame(s => { if(scrRef.current) (scrRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1+Math.sin(s.clock.elapsedTime*3)*0.4; });
  const ah = getTerrainHeight(56,57);
  return (
    <group>
      {/* Arena floor */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[56,ah+0.05,57]}>
        <circleGeometry args={[30,20]} /><meshStandardMaterial color="#1a0c2e" roughness={1} />
      </mesh>
      {/* Kenney-style colosseum walls (4 sides) */}
      {([[56,5,42,72,10,2.5],[56,5,72,72,10,2.5],[24,5,57,2.5,10,32],[88,5,57,2.5,10,32]] as [number,number,number,number,number,number][]).map(([x,y,z,w,hh,d],i)=>(
        <mesh key={i} position={[x,ah+hh/2,z]}>
          <boxGeometry args={[w,hh,d]} /><meshStandardMaterial color="#2d1848" roughness={1} />
        </mesh>
      ))}
      {/* Kenney corner towers — cylinder + cone roof */}
      {([[24,44],[88,44],[24,70],[88,70]] as [number,number][]).map(([tx,tz],i)=>{
        const th = getTerrainHeight(tx,tz);
        return (
          <group key={i} position={[tx,th,tz]}>
            <mesh position={[0,10,0]}>
              <cylinderGeometry args={[3.2,3.8,20,8]} /><meshStandardMaterial color="#3d1a5a" roughness={1} />
            </mesh>
            <mesh position={[0,21,0]}>
              <coneGeometry args={[4.2,6,8]} /><meshStandardMaterial color="#bd93f9" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
      {/* Stage */}
      <mesh position={[56,ah+1,57]}><boxGeometry args={[18,2,14]} /><meshStandardMaterial color="#3d2060" roughness={1} /></mesh>
      <mesh ref={scrRef} position={[56,ah+6,45]}>
        <boxGeometry args={[14,8,0.5]} /><meshStandardMaterial color="#200060" emissive="#6600ff" emissiveIntensity={1} />
      </mesh>
      <Billboard position={[56,ah+8,44]}><Text fontSize={1.0} color="#bd93f9" outlineWidth={0.04} outlineColor="#000">🎮 STREAM ARENA</Text></Billboard>
      <Billboard position={[56,26,57]}><Text fontSize={2} color="#bd93f9" outlineWidth={0.06} outlineColor="#000">STREAM COLOSSEUM</Text></Billboard>
      <pointLight position={[56,ah+10,57]} intensity={2} color="#8800ff" distance={45} />
    </group>
  );
});

// ─── SPAM SWAMP SW ────────────────────────────────────────────────────────────

const SWAMP_TREES: [number,number,number][] = [
  [-42,0,42],[-55,0,48],[-48,0,58],[-62,0,44],[-38,0,55],[-65,0,62],[-52,0,70],[-45,0,65],[-60,0,52],
];

const SpamSwamp = memo(function SpamSwamp() {
  return (
    <group>
      <KenneyTreeInstanced positions={SWAMP_TREES} leaf="#142208" trunk="#1a0e04" />
      <WaterPlane pos={[-52,getTerrainHeight(-52,52)+0.3,52]} w={22} d={18} color="#1a4010" />
      {([[-46,0,46],[-54,0,50],[-42,0,60],[-60,0,64]] as [number,number,number][]).map((p,i)=>{
        const mh = getTerrainHeight(p[0],p[2]);
        return (
          <group key={i} position={[p[0],mh,p[2]]}>
            <mesh position={[0,0.3,0]}><cylinderGeometry args={[0.09,0.13,0.55,5]} /><meshStandardMaterial color="#d0b898" roughness={1} /></mesh>
            <mesh position={[0,0.62,0]}><sphereGeometry args={[0.38,7,7]} /><meshStandardMaterial color="#cc2222" roughness={1} /></mesh>
          </group>
        );
      })}
      {/* Spam Bot Factory — Kenney industrial style */}
      <group position={[-58,getTerrainHeight(-58,60),60]}>
        <mesh position={[0,0.3,0]}><boxGeometry args={[16,0.6,14]} /><meshStandardMaterial color="#1a2a10" roughness={1} /></mesh>
        <mesh position={[0,6.5,0]}><boxGeometry args={[15,13,13]} /><meshStandardMaterial color="#102208" roughness={1} /></mesh>
        <mesh position={[0,13.5,0]}><boxGeometry args={[16,1.4,14]} /><meshStandardMaterial color="#1a3010" roughness={1} /></mesh>
        {[-3.5,3.5].map((cx,i)=>(
          <group key={i} position={[cx,15,0]}>
            <mesh><cylinderGeometry args={[0.9,1.1,4.5,7]} /><meshStandardMaterial color="#1a2a10" roughness={1} /></mesh>
            <mesh position={[0,3.5,0]}><sphereGeometry args={[1.1,7,7]} /><meshStandardMaterial color="#39ff14" emissive="#1a8000" emissiveIntensity={2.5} /></mesh>
          </group>
        ))}
        <Billboard position={[0,16,8]}><Text fontSize={0.7} color="#39ff14" outlineWidth={0.03} outlineColor="#000">SPAM BOT FACTORY</Text></Billboard>
      </group>
      <KenneySign pos={[-44,0,44]} text="FREE BAHAMAS COINS" textCol="#39ff14" />
      <KenneySign pos={[-56,0,54]} text="CLICK HERE!!!" textCol="#39ff14" />
      <KenneyRockInstanced positions={[[-45,0,55],[-62,0,48],[-50,0,70],[-68,0,62]] as [number,number,number][]} color="#1a2a10" />
      <Billboard position={[-54,22,54]}><Text fontSize={2} color="#39ff14" outlineWidth={0.06} outlineColor="#002800">SPAM SWAMP</Text></Billboard>
      <pointLight position={[-54,8,54]} intensity={2} color="#103010" distance={55} />
    </group>
  );
});

// ─── PLAINS TREES ─────────────────────────────────────────────────────────────

const PLAINS_TREES: [number,number,number][] = [
  [-38,0,8],[-40,0,20],[-38,0,-8],[40,0,25],[38,0,-25],
  [0,0,42],[10,0,44],[-10,0,44],[20,0,40],[-20,0,40],
  [-34,0,15],[-36,0,-15],[35,0,15],[36,0,-15],
  [-28,0,36],[28,0,36],[22,0,-36],[-22,0,-36],
];

// ─── BORDER MOUNTAINS ─────────────────────────────────────────────────────────

function BorderMountains() {
  const peaks = useMemo(() => {
    const arr: { pos:[number,number,number]; h:number; r:number; ci:number }[] = [];
    for(let i=0;i<18;i++){
      const t=(i/18)*Math.PI*2;
      const rad=HALF-10+Math.sin(i*2.1)*4;
      const x=Math.cos(t)*rad, z=Math.sin(t)*rad;
      arr.push({ pos:[x,getTerrainHeight(x,z),z] as [number,number,number], h:20+Math.sin(i*1.6)*9, r:9+Math.sin(i*2.2)*3.5, ci:i%3 });
    }
    // 4 corner giants
    const corners:number[][] = [[-HALF+8,-HALF+8],[HALF-8,-HALF+8],[-HALF+8,HALF-8],[HALF-8,HALF-8]];
    corners.forEach(([x,z])=>arr.push({ pos:[x,getTerrainHeight(x,z),z] as [number,number,number], h:34, r:12, ci:0 }));
    return arr;
  }, []);
  const colors = ["#5a5248","#6a6258","#4a4840"];
  return (
    <group>
      {peaks.map((m,i)=>(
        <group key={i} position={m.pos}>
          <mesh position={[0,m.h/2,0]}>
            <coneGeometry args={[m.r,m.h,6+(i%3)]} /><meshStandardMaterial color={colors[m.ci]} roughness={1} />
          </mesh>
          <mesh position={[0,m.h*0.83,0]}>
            <coneGeometry args={[m.r*0.34,m.h*0.2,5]} /><meshStandardMaterial color="#f0f4f8" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── AMBIENT PARTICLES ────────────────────────────────────────────────────────

function Particles() {
  const cnt = 80;
  const posData = useRef(Float32Array.from({length:cnt*3},(_,i)=>{
    const ax=i%3;
    return ax===1 ? Math.random()*28+2 : (Math.random()-.5)*WORLD_SIZE*0.8;
  }));
  const ref = useRef<THREE.Points>(null);
  useFrame(s=>{ if(ref.current) ref.current.rotation.y=s.clock.elapsedTime*0.01; });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[posData.current,3]} /></bufferGeometry>
      <pointsMaterial size={0.14} color="#ff2d8c" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

// ─── OTHER PLAYERS ────────────────────────────────────────────────────────────

function OtherPlayer({ p }: { p: WorldPlayer }) {
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  useFrame(s => {
    const t = s.clock.elapsedTime;
    if(armLRef.current) armLRef.current.rotation.x = Math.sin(t*4)*0.5;
    if(armRRef.current) armRRef.current.rotation.x = -Math.sin(t*4)*0.5;
    if(legLRef.current) legLRef.current.rotation.x = -Math.sin(t*4)*0.5;
    if(legRRef.current) legRRef.current.rotation.x = Math.sin(t*4)*0.5;
  });
  const c = p.color;
  const hpPct = p.hp/p.maxHp;
  return (
    <group position={[p.x,p.y,p.z]}>
      <mesh position={[0,2.1,0]}><sphereGeometry args={[0.32,8,8]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} /></mesh>
      {[-0.13,0.13].map((ex,i)=><mesh key={i} position={[ex,2.14,0.3]}><sphereGeometry args={[0.06,5,5]} /><meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} /></mesh>)}
      <mesh position={[0,1.35,0]}><boxGeometry args={[0.55,0.8,0.3]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2} /></mesh>
      <mesh ref={armLRef} position={[-0.42,1.38,0]}><capsuleGeometry args={[0.1,0.5,3,6]} /><meshStandardMaterial color={c} /></mesh>
      <mesh ref={armRRef} position={[0.42,1.38,0]}><capsuleGeometry args={[0.1,0.5,3,6]} /><meshStandardMaterial color={c} /></mesh>
      <mesh ref={legLRef} position={[-0.16,0.62,0]}><capsuleGeometry args={[0.1,0.5,3,6]} /><meshStandardMaterial color={c} /></mesh>
      <mesh ref={legRRef} position={[0.16,0.62,0]}><capsuleGeometry args={[0.1,0.5,3,6]} /><meshStandardMaterial color={c} /></mesh>
      <Billboard position={[0,3.0,0]}><Text fontSize={0.32} color="white" outlineWidth={0.03} outlineColor="black" anchorX="center">{p.username}</Text></Billboard>
      <Billboard position={[0,3.35,0]}>
        <mesh position={[0,0,0]}><planeGeometry args={[1,0.09]} /><meshBasicMaterial color="#333" /></mesh>
        <mesh position={[-(0.5-(hpPct*0.5)),0,0.001]}><planeGeometry args={[hpPct,0.09]} /><meshBasicMaterial color="#39ff14" /></mesh>
      </Billboard>
    </group>
  );
}

// ─── MONSTER BODY ─────────────────────────────────────────────────────────────

function MonsterBody({ type, body, accent, t }: { type:MonsterType; body:string; accent:string; t:number }) {
  switch(type) {
    case "guard": return (<>
      <mesh position={[0,1.4,0]}><boxGeometry args={[1.1,1.5,0.65]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.2} roughness={0.4} metalness={0.5} /></mesh>
      <mesh position={[0,2.5,0]}><boxGeometry args={[0.85,0.82,0.82]} /><meshStandardMaterial color={body} roughness={0.4} metalness={0.5} /></mesh>
      <mesh position={[0,2.55,0.44]}><boxGeometry args={[0.65,0.25,0.08]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} /></mesh>
      <mesh position={[0,3.1,0]}><boxGeometry args={[0.18,0.55,0.18]} /><meshStandardMaterial color="#cc0000" emissive="#880000" emissiveIntensity={0.5} /></mesh>
      {[-0.75,0.75].map((ax,i)=><mesh key={i} position={[ax,1.55,0]}><capsuleGeometry args={[0.18,0.9,3,6]} /><meshStandardMaterial color={body} roughness={0.4} metalness={0.5} /></mesh>)}
      {[-0.28,0.28].map((lx,i)=><mesh key={i} position={[lx,0.4,0]}><capsuleGeometry args={[0.18,0.65,3,6]} /><meshStandardMaterial color={body} roughness={0.5} metalness={0.4} /></mesh>)}
      <mesh position={[0.85,2.2,0]}><cylinderGeometry args={[0.06,0.06,3.5,5]} /><meshStandardMaterial color="#999" roughness={0.3} metalness={0.8} /></mesh>
      <mesh position={[0.85,4.0,0]}><coneGeometry args={[0.2,0.7,5]} /><meshStandardMaterial color="#ddd" roughness={0.2} metalness={0.9} /></mesh>
    </>);
    case "troll": return (<>
      <mesh position={[0,1.0,0]}><boxGeometry args={[1.0,1.2,0.7]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.8} /></mesh>
      <mesh position={[0,2.1,0]}><sphereGeometry args={[0.52,8,8]} /><meshStandardMaterial color={body} roughness={0.8} /></mesh>
      {[-0.65,0.65].map((ex,i)=><mesh key={i} position={[ex,2.1,0]} rotation={[0,0,i===0?0.6:-0.6]}><coneGeometry args={[0.22,0.55,5]} /><meshStandardMaterial color={body} roughness={0.8} /></mesh>)}
      {[-0.2,0.2].map((ex,i)=><mesh key={i} position={[ex,2.18,0.45]}><sphereGeometry args={[0.1,6,6]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} /></mesh>)}
      {[-0.72,0.72].map((ax,i)=><mesh key={i} position={[ax,1.1,0]} rotation={[0,0,i===0?0.3:-0.3]}><capsuleGeometry args={[0.16,0.65,3,5]} /><meshStandardMaterial color={body} roughness={0.8} /></mesh>)}
      {[-0.24,0.24].map((lx,i)=><mesh key={i} position={[lx,0.25,0]}><capsuleGeometry args={[0.18,0.4,3,5]} /><meshStandardMaterial color={body} roughness={0.8} /></mesh>)}
    </>);
    case "ghost": {
      const wave = Math.sin(t*1.8)*0.05;
      return (<>
        <mesh position={[0,wave,0]}><sphereGeometry args={[0.75,10,10]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.9} transparent opacity={0.72} roughness={0.2} /></mesh>
        <mesh position={[0,0.75+wave,0]}><sphereGeometry args={[0.45,8,8]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.7} transparent opacity={0.8} /></mesh>
        <mesh position={[0,-1.0+wave,0]}><coneGeometry args={[0.72,1.5,7,1,true]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.4} side={THREE.DoubleSide} /></mesh>
        {[-0.22,0.22].map((ex,i)=><mesh key={i} position={[ex,0.82+wave,0.4]}><sphereGeometry args={[0.1,6,6]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={8} /></mesh>)}
        <pointLight position={[0,0,0]} intensity={1.5} color={accent} distance={6} />
      </>);
    }
    case "spambot": return (<>
      <mesh position={[0,0.9,0]}><boxGeometry args={[1.1,1.0,0.9]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.3} metalness={0.7} /></mesh>
      <mesh position={[0,1.85,0]}><boxGeometry args={[0.7,0.58,0.7]} /><meshStandardMaterial color={body} roughness={0.3} metalness={0.7} /></mesh>
      <mesh position={[0,2.35,0]}><cylinderGeometry args={[0.04,0.04,0.6,4]} /><meshStandardMaterial color="#ccc" metalness={0.8} /></mesh>
      <mesh position={[0,2.7,0]}><sphereGeometry args={[0.1,5,5]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} /></mesh>
      <mesh position={[0,1.88,0.36]}><planeGeometry args={[0.5,0.35]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} /></mesh>
      {[-0.75,0.75].map((ax,i)=><mesh key={i} position={[ax,0.95,0]}><boxGeometry args={[0.25,0.9,0.25]} /><meshStandardMaterial color={body} roughness={0.3} metalness={0.7} /></mesh>)}
      {[-0.28,0.28].map((lx,i)=><mesh key={i} position={[lx,0.25,0]}><boxGeometry args={[0.35,0.5,0.6]} /><meshStandardMaterial color="#0a1a0a" roughness={0.4} metalness={0.6} /></mesh>)}
    </>);
    case "iceling": return (<>
      <mesh position={[0,1.2,0]}><octahedronGeometry args={[0.7,0]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.3} roughness={0.05} metalness={0.4} transparent opacity={0.88} /></mesh>
      <mesh position={[0,2.25,0]}><octahedronGeometry args={[0.42,0]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.4} roughness={0.05} metalness={0.4} transparent opacity={0.9} /></mesh>
      {[0,1,2,3,4].map(i=>{
        const a=(i/5)*Math.PI*2;
        return <mesh key={i} position={[Math.cos(a)*0.35,2.75,Math.sin(a)*0.35]} rotation={[0.3,a,0]}><coneGeometry args={[0.08,0.45,4]} /><meshStandardMaterial color="#d0f0ff" emissive="#80c8ff" emissiveIntensity={1.5} transparent opacity={0.85} /></mesh>;
      })}
      {[0,1,2,3].map(i=>{
        const a=(i/4)*Math.PI*2+t*0.8;
        return <mesh key={i} position={[Math.cos(a)*0.9,1.2,Math.sin(a)*0.9]} rotation={[0,a,0.5]}><coneGeometry args={[0.1,0.6,4]} /><meshStandardMaterial color="#c0e8ff" roughness={0.05} transparent opacity={0.8} /></mesh>;
      })}
    </>);
    case "slime": {
      const pulse = 1+Math.sin(t*2.2)*0.1;
      return (<>
        <mesh position={[0,0.7,0]} scale={[pulse,1/pulse,pulse]}><sphereGeometry args={[0.72,10,10]} /><meshStandardMaterial color={body} emissive={accent} emissiveIntensity={0.5} roughness={0.2} transparent opacity={0.88} /></mesh>
        {[-0.24,0.24].map((ex,i)=><group key={i} position={[ex,0.88,0.62*pulse]}><mesh><sphereGeometry args={[0.16,6,6]} /><meshStandardMaterial color="white" roughness={0.1} /></mesh><mesh position={[0,0,0.12]}><sphereGeometry args={[0.09,5,5]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={4} /></mesh></group>)}
        <mesh position={[0,0.55,0.7*pulse]}><torusGeometry args={[0.18,0.04,4,8,Math.PI]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} /></mesh>
      </>);
    }
    default: return null;
  }
}

// ─── MONSTER ENTITY ───────────────────────────────────────────────────────────

function MonsterEntity({ mon, onHit, playerHpCb }: {
  mon:MonsterRuntime;
  onHit:(id:number,dmg:number,x:number,y:number,z:number)=>void;
  playerHpCb:(dmg:number)=>void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [body,accent] = MON_COL[mon.type];
  const tRef = useRef(0);

  useFrame((state,delta) => {
    if(!mon.alive||!groupRef.current) return;
    tRef.current += delta;
    const dt = Math.min(delta,0.05);
    const cam = state.camera;
    const dist = mon.pos.distanceTo(cam.position);

    if(mon.type==="ghost") mon.pos.y = 1.5+Math.sin(state.clock.elapsedTime*1.2+mon.floatOffset)*0.6;

    if(dist < AGGRO_RANGE) mon.aggro = true;
    if(dist > AGGRO_RANGE*2.2) mon.aggro = false;

    if(mon.aggro && dist > MON_ATK_RANGE) {
      const dir = new THREE.Vector3().subVectors(cam.position,mon.pos).setY(0).normalize();
      mon.pos.addScaledVector(dir,MON_SPEED[mon.type]*dt);
    } else if(!mon.aggro) {
      if(mon.pos.distanceTo(mon.patrolTarget)<1||performance.now()-mon.lastPatrolChange>5000) {
        const sp = mon.spawnPos;
        mon.patrolTarget.set(sp.x+(Math.random()-.5)*16,mon.type==="ghost"?1.5:0,sp.z+(Math.random()-.5)*16);
        mon.lastPatrolChange = performance.now();
      }
      const dir = new THREE.Vector3().subVectors(mon.patrolTarget,mon.pos).setY(0).normalize();
      mon.pos.addScaledVector(dir,MON_SPEED[mon.type]*0.4*dt);
    }

    mon.pos.x = Math.max(-HALF+2,Math.min(HALF-2,mon.pos.x));
    mon.pos.z = Math.max(-HALF+2,Math.min(HALF-2,mon.pos.z));
    if(mon.type!=="ghost") mon.pos.y = 0;

    groupRef.current.position.copy(mon.pos);
    if(dist < AGGRO_RANGE*1.5) {
      groupRef.current.rotation.y = Math.atan2(cam.position.x-mon.pos.x,cam.position.z-mon.pos.z);
    }

    if(mon.aggro && dist < MON_ATK_RANGE) {
      const now = performance.now();
      if(now-mon.lastAttack > 1800) { mon.lastAttack=now; playerHpCb(MON_DMG[mon.type]); }
    }
  });

  if(!mon.alive) return null;
  const hpPct = mon.hp/mon.maxHp;
  return (
    <group ref={groupRef} position={[mon.pos.x,mon.pos.y,mon.pos.z]}>
      <MonsterBody type={mon.type} body={body} accent={accent} t={tRef.current} />
      <Billboard position={[0,mon.type==="ghost"?2.4:3.6,0]}>
        <mesh position={[0,0,0]}><planeGeometry args={[1.3,0.13]} /><meshBasicMaterial color="#222" /></mesh>
        <mesh position={[-(0.65-(hpPct*0.65)),0,0.001]}><planeGeometry args={[hpPct*1.3,0.13]} /><meshBasicMaterial color={hpPct>0.5?"#39ff14":hpPct>0.25?"#ffa000":"#ff2200"} /></mesh>
        <Text position={[0,0.2,0]} fontSize={0.26} color="white" outlineWidth={0.02} outlineColor="#000" anchorX="center">{mon.type.toUpperCase()}</Text>
      </Billboard>
    </group>
  );
}

// ─── PLAYER CONTROLLER ────────────────────────────────────────────────────────

function PlayerController({ monstersRef, onMonsterHit, onPositionUpdate, skills, onSkillUse }: {
  monstersRef:React.MutableRefObject<MonsterRuntime[]>;
  onMonsterHit:(id:number,dmg:number,x:number,y:number,z:number)=>void;
  onPositionUpdate:(x:number,y:number,z:number,rx:number)=>void;
  skills:SkillDef[]; onSkillUse:(skillIdx:number)=>void;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string,boolean>>({});
  const velY = useRef(0);
  const onGround = useRef(true);
  const lastSent = useRef(0);
  const skillCDs = useRef<number[]>([0,0,0]);
  const lastAtk = useRef(0);
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up3 = useRef(new THREE.Vector3(0,1,0));

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      const now = performance.now();
      if(e.code==="KeyQ") trySkill(0,now);
      if(e.code==="KeyE") trySkill(1,now);
      if(e.code==="KeyR") trySkill(2,now);
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code]=false; };
    const click = () => { tryMelee(); };

    const tryMelee = () => {
      const now=performance.now(); if(now-lastAtk.current<600) return; lastAtk.current=now;
      let bestId=-1, bestDist=ATTACK_RANGE;
      const cf=new THREE.Vector3(); camera.getWorldDirection(cf);
      for(const m of monstersRef.current) {
        if(!m.alive) continue;
        const diff=new THREE.Vector3().subVectors(m.pos,camera.position);
        const dist=diff.length();
        if(dist>ATTACK_RANGE) continue;
        diff.normalize(); if(diff.dot(cf)<0.4) continue;
        if(dist<bestDist){bestDist=dist;bestId=m.id;}
      }
      if(bestId!==-1){
        const m=monstersRef.current.find(x=>x.id===bestId)!;
        const base=18+Math.floor(Math.random()*10);
        const crit=Math.random()<0.15;
        onMonsterHit(bestId,crit?Math.floor(base*2.2):base,m.pos.x,m.pos.y+2,m.pos.z);
      }
    };

    const trySkill = (idx:number,now:number) => {
      const sk=skills[idx]; if(!sk) return;
      if(now-skillCDs.current[idx]<sk.cooldown*1000) return;
      skillCDs.current[idx]=now; onSkillUse(idx);
      const cf=new THREE.Vector3(); camera.getWorldDirection(cf);
      const base=25+Math.floor(Math.random()*15);
      if(sk.aoe){
        for(const m of monstersRef.current){
          if(!m.alive) continue;
          if(m.pos.distanceTo(camera.position)>sk.range) continue;
          const dmg=Math.floor(base*sk.dmgMult*(0.8+Math.random()*0.4));
          const crit=Math.random()<0.2;
          onMonsterHit(m.id,crit?Math.floor(dmg*2):dmg,m.pos.x,m.pos.y+2,m.pos.z);
        }
      } else {
        let bestId=-1,bestDist=sk.range;
        for(const m of monstersRef.current){
          if(!m.alive) continue;
          const diff=new THREE.Vector3().subVectors(m.pos,camera.position);
          const dist=diff.length(); if(dist>sk.range) continue;
          diff.normalize(); if(diff.dot(cf)<0.35) continue;
          if(dist<bestDist){bestDist=dist;bestId=m.id;}
        }
        if(bestId!==-1){
          const m=monstersRef.current.find(x=>x.id===bestId)!;
          const dmg=Math.floor(base*sk.dmgMult*(0.85+Math.random()*0.3));
          const crit=Math.random()<0.25;
          onMonsterHit(bestId,crit?Math.floor(dmg*2):dmg,m.pos.x,m.pos.y+2,m.pos.z);
        }
      }
    };

    window.addEventListener("keydown",dn);
    window.addEventListener("keyup",up);
    document.addEventListener("click",click);
    return()=>{ window.removeEventListener("keydown",dn); window.removeEventListener("keyup",up); document.removeEventListener("click",click); };
  },[skills]);

  useFrame((_,delta) => {
    const k=keys.current;
    const dt=Math.min(delta,0.05);
    const sprint=k["ShiftLeft"]||k["ShiftRight"];
    const speed=MOVE_SPEED*(sprint?SPRINT_MULT:1)*dt;

    camera.getWorldDirection(fwd.current);
    fwd.current.y=0; fwd.current.normalize();
    right.current.crossVectors(fwd.current,up3.current).normalize();

    if(k["KeyW"]||k["ArrowUp"])    camera.position.addScaledVector(fwd.current,  speed);
    if(k["KeyS"]||k["ArrowDown"])  camera.position.addScaledVector(fwd.current, -speed);
    if(k["KeyA"]||k["ArrowLeft"])  camera.position.addScaledVector(right.current,-speed);
    if(k["KeyD"]||k["ArrowRight"]) camera.position.addScaledVector(right.current, speed);

    if((k["Space"]||k["KeySpace"])&&onGround.current){ velY.current=JUMP_FORCE; onGround.current=false; }
    velY.current+=GRAVITY*dt;
    camera.position.y+=velY.current*dt;
    if(camera.position.y<PLAYER_H){ camera.position.y=PLAYER_H; velY.current=0; onGround.current=true; }
    camera.position.x=Math.max(-HALF+2,Math.min(HALF-2,camera.position.x));
    camera.position.z=Math.max(-HALF+2,Math.min(HALF-2,camera.position.z));

    const now=performance.now();
    if(now-lastSent.current>180){ lastSent.current=now; onPositionUpdate(camera.position.x,camera.position.y,camera.position.z,camera.rotation.y); }
  });
  return null;
}

// ─── WORLD SCENE ──────────────────────────────────────────────────────────────

function WorldScene({ monstersRef, onMonsterHit, onPositionUpdate, onLockChange, otherPlayers, playerHpCb, skills, onSkillUse }: {
  monstersRef:React.MutableRefObject<MonsterRuntime[]>;
  onMonsterHit:(id:number,dmg:number,x:number,y:number,z:number)=>void;
  onPositionUpdate:(x:number,y:number,z:number,rx:number)=>void;
  onLockChange:(locked:boolean)=>void;
  otherPlayers:WorldPlayer[];
  playerHpCb:(dmg:number)=>void;
  skills:SkillDef[];
  onSkillUse:(idx:number)=>void;
}) {
  return (
    <>
      <color attach="background" args={["#1e2e44"]} />
      <fog attach="fog" args={["#1e2e44",75,190]} />

      {/* Performance-friendly lighting: 1 shadow caster + ambient only */}
      <ambientLight intensity={0.6} color="#d0dce8" />
      <directionalLight
        position={[35,70,25]} intensity={1.2} color="#f0e8d8"
        castShadow
        shadow-mapSize={[512,512]}
        shadow-camera-far={140}
        shadow-camera-left={-70} shadow-camera-right={70}
        shadow-camera-top={70} shadow-camera-bottom={-70}
      />
      {/* Soft warm fill — NO shadows */}
      <directionalLight position={[-20,15,0]} intensity={0.2} color="#ffcc80" />

      {/* Sky */}
      <Sky sunPosition={[0.3,0.18,1]} turbidity={5} rayleigh={1.8} mieCoefficient={0.003} mieDirectionalG={0.72} />

      {/* Terrain */}
      <WorldTerrain />

      {/* Water */}
      <WaterPlane pos={[0,0.4,0]} w={8} d={8} color="#2a7acc" />

      {/* Border mountains */}
      <BorderMountains />

      {/* Particles */}
      <Particles />

      {/* Plains trees — instanced */}
      <Suspense fallback={null}>
        <KenneyTreeInstanced positions={PLAINS_TREES} leaf="#2e7a1a" />
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

      {/* Direction signs */}
      <KenneySign pos={[0,0,37]} text="↑ BAHAMAS PLAINS" textCol="#76c442" />
      <KenneySign pos={[37,0,0]} text="→ TROLL DIMENSION" textCol="#ff2d8c" />
      <KenneySign pos={[-37,0,0]} text="← EXILE FOREST" textCol="#3df7ff" />
      <KenneySign pos={[0,0,-37]} text="↓ BANNED TUNDRA" textCol="#80d8ff" />

      {/* Monsters */}
      {monstersRef.current.map(mon=>(
        <MonsterEntity key={mon.id} mon={mon} onHit={onMonsterHit} playerHpCb={playerHpCb} />
      ))}

      {/* Other players */}
      {otherPlayers.map(p=><OtherPlayer key={p.id} p={p} />)}

      <PlayerController monstersRef={monstersRef} onMonsterHit={onMonsterHit} onPositionUpdate={onPositionUpdate} skills={skills} onSkillUse={onSkillUse} />
      <PointerLockControls onLock={()=>onLockChange(true)} onUnlock={()=>onLockChange(false)} />
    </>
  );
}

// ─── MINIMAP ──────────────────────────────────────────────────────────────────

function Minimap({ x,z }: { x:number; z:number }) {
  const SIZE=110, half=WORLD_SIZE/2;
  const px=((x+half)/WORLD_SIZE)*SIZE, py=((z+half)/WORLD_SIZE)*SIZE;
  return (
    <div className="relative overflow-hidden border border-white/25 bg-black/80" style={{width:SIZE,height:SIZE}}>
      <img src={mapBg as string} alt="map" draggable={false} style={{width:SIZE,height:SIZE,display:"block",opacity:0.88,imageRendering:"pixelated"}} />
      <div className="absolute rounded-full bg-white z-10 -translate-x-1/2 -translate-y-1/2" style={{left:px,top:py,width:8,height:8,boxShadow:"0 0 0 2px #ff2d8c,0 0 10px #fff"}} />
      <Compass className="absolute top-1 left-1 w-3 h-3 text-white/40" />
      <div className="absolute bottom-0.5 left-0 right-0 text-center font-mono text-[7px] text-white/35 uppercase pointer-events-none">BAHAMAS MAP</div>
    </div>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function HUD({ username,color,origin,hp,maxHp,mp,maxMp,kills,xp,skills,skillCooldowns,lastSkillUsed,chatMessages,onChat,locked,onClickToLock,onLeave,playerX,playerZ,onlineCount }: {
  username:string; color:string; origin:string;
  hp:number; maxHp:number; mp:number; maxMp:number;
  kills:number; xp:number;
  skills:SkillDef[];
  skillCooldowns:React.MutableRefObject<number[]>;
  lastSkillUsed:number[];
  chatMessages:ChatMsg[];
  onChat:(msg:string)=>void;
  locked:boolean; onClickToLock:()=>void; onLeave:()=>void;
  playerX:number; playerZ:number;
  onlineCount:number;
}) {
  const [chatInput,setChatInput]=useState("");
  const [showChat,setShowChat]=useState(false);
  const chatRef=useRef<HTMLDivElement>(null);
  const [,forceRender]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>forceRender(n=>n+1),100); return()=>clearInterval(id); },[]);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[chatMessages]);

  const sendChat=()=>{ const t=chatInput.trim(); if(!t) return; onChat(t); setChatInput(""); };
  const zone=ZONE_INFO[getZone(playerX,playerZ)]||ZONE_INFO.grassland;
  const hpPct=hp/maxHp, mpPct=mp/maxMp;
  const getSkillCd=(idx:number)=>{
    const now=performance.now();
    const elapsed=(now-skillCooldowns.current[idx])/1000;
    return Math.max(0,(skills[idx]?.cooldown??0)-elapsed);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none">
      {locked&&<div className="absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80 -translate-x-1/2" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full" />
        </div>
      </div>}

      {!locked&&<div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer" onClick={onClickToLock}>
        <motion.div initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} className="bg-black/85 border-2 border-primary px-10 py-8 text-center" style={{boxShadow:"0 0 40px rgba(255,45,140,0.4)"}}>
          <p className="text-primary font-black uppercase tracking-widest text-xl mb-1">🌴 BAHAMAS LAND RPG</p>
          <p className="text-yellow-400 font-mono text-sm uppercase mb-3">Click to Enter the World</p>
          <div className="text-white/50 font-mono text-xs space-y-0.5">
            <p>WASD — Move  |  MOUSE — Look  |  SHIFT — Sprint</p>
            <p>SPACE — Jump  |  CLICK — Attack  |  Q/E/R — Skills</p>
            <p>ESC — Pause  |  T — Chat</p>
          </div>
        </motion.div>
      </div>}

      {/* Player stats */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-auto min-w-[188px]">
        <div className="bg-black/80 border border-white/15 px-3 py-2.5 space-y-2" style={{boxShadow:`0 0 18px ${color}22`}}>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{backgroundColor:color,boxShadow:`0 0 8px ${color}`}} />
            <span className="text-white font-mono text-xs uppercase font-bold truncate">{username}</span>
            <span className="ml-auto text-yellow-400 font-mono text-[10px]">🏆 {kills}</span>
          </div>
          {origin&&<div className="font-mono text-[9px] uppercase tracking-widest" style={{color}}>{origin}</div>}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between"><span className="text-red-400 font-mono text-[9px] uppercase">HP</span><span className="text-red-300 font-mono text-[9px]">{hp}/{maxHp}</span></div>
            <div className="bg-black/60 h-2.5 w-full"><div className="h-full transition-all duration-150" style={{width:`${hpPct*100}%`,background:hpPct>0.5?"#39ff14":hpPct>0.25?"#ffa000":"#ff2200"}} /></div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between"><span className="text-blue-400 font-mono text-[9px] uppercase">MP</span><span className="text-blue-300 font-mono text-[9px]">{mp}/{maxMp}</span></div>
            <div className="bg-black/60 h-2 w-full"><div className="h-full bg-blue-500 transition-all duration-150" style={{width:`${mpPct*100}%`}} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-[9px] uppercase">XP</span>
            <div className="flex-1 bg-black/50 h-1.5"><div className="h-full bg-yellow-400" style={{width:`${xp%100}%`}} /></div>
            <span className="text-yellow-300 font-mono text-[9px]">Lv.{Math.floor(xp/100)+1}</span>
          </div>
        </div>
        <div className="bg-black/70 border border-white/10 px-3 py-1.5">
          <div className="font-mono text-[11px] uppercase tracking-wider" style={{color:zone.color}}>📍 {zone.name}</div>
          <div className="font-mono text-[9px] text-white/40 uppercase">{zone.danger}</div>
        </div>
      </div>

      {/* Top right */}
      <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
        <div className="bg-black/70 border border-white/10 px-3 py-2 flex items-center gap-2"><Users className="w-3 h-3 text-pink-400" /><span className="text-pink-300 font-mono text-xs">{onlineCount} online</span></div>
        <button onClick={onLeave} className="bg-black/70 border border-red-500/40 px-3 py-2 text-red-400 hover:bg-red-900/30 transition flex items-center gap-1"><LogOut className="w-3 h-3" /></button>
      </div>

      {/* Skill bar */}
      {locked&&<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 items-end">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-12 h-12 bg-black/70 border-2 border-white/30 flex items-center justify-center text-white text-sm font-mono">⚔</div>
          <span className="text-white/40 font-mono text-[9px] uppercase">Click</span>
        </div>
        {skills.map((sk,i)=>{ const cd=getSkillCd(i); const onCd=cd>0; return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="relative w-14 h-14">
              <div className={`w-full h-full border-2 flex flex-col items-center justify-center transition-all ${onCd?"opacity-50":"opacity-100"}`}
                style={{background:onCd?"#111":`${sk.color}22`,borderColor:sk.color,boxShadow:onCd?"none":`0 0 12px ${sk.color}55`}}>
                <span className="font-mono text-[10px] font-bold text-white/80 uppercase">{sk.key}</span>
                <span className="font-mono text-[8px] text-white/50 uppercase text-center px-0.5 leading-tight">{sk.label}</span>
              </div>
              {onCd&&<div className="absolute inset-0 flex items-center justify-center bg-black/60"><span className="font-mono text-white font-bold text-sm">{cd.toFixed(1)}</span></div>}
            </div>
            <span className="text-white/30 font-mono text-[8px]">{sk.cooldown}s cd</span>
          </div>
        );})}
      </div>}

      {/* Chat */}
      <div className="absolute bottom-3 left-3 w-72 space-y-1.5 pointer-events-auto">
        <div ref={chatRef} className="bg-black/65 border border-white/10 p-2 h-28 overflow-y-auto space-y-0.5">
          {chatMessages.map(m=><div key={m.id} className="font-mono text-[10px] leading-tight"><span style={{color:"#ff2d8c"}}>{m.username}: </span><span className="text-white/80">{m.text}</span></div>)}
          {chatMessages.length===0&&<p className="text-white/20 font-mono text-[10px] uppercase">Bahamas Land awaits...</p>}
        </div>
        {showChat?(
          <div className="flex gap-1.5">
            <input autoFocus value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"){sendChat();setShowChat(false);} if(e.key==="Escape")setShowChat(false); }}
              maxLength={100} placeholder="Chat..."
              className="flex-1 bg-black border border-primary text-primary font-mono text-xs px-2 py-1 focus:outline-none placeholder:text-white/20 uppercase" />
            <button onClick={()=>{sendChat();setShowChat(false);}} className="bg-primary text-black font-bold text-xs px-2 py-1 uppercase">Send</button>
          </div>
        ):(locked&&<button onClick={()=>setShowChat(true)} className="text-white/30 font-mono text-[10px] uppercase hover:text-primary transition">[T] Chat</button>)}
      </div>

      {/* Minimap */}
      <div className="absolute bottom-3 right-3 pointer-events-none"><Minimap x={playerX} z={playerZ} /></div>

      {locked&&<div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/50 px-3 py-1 border border-white/10">
          <p className="text-white/30 font-mono text-[9px] uppercase tracking-widest">WASD · SHIFT=Sprint · SPACE=Jump · Click=Attack · Q/E/R=Skills · ESC=Pause</p>
        </div>
      </div>}
    </div>
  );
}

// ─── DAMAGE NUMBERS ───────────────────────────────────────────────────────────

function DamageNumbers({ nums }: { nums:DmgNumber[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {nums.map(n=>(
        <div key={n.id} className="absolute font-black font-mono select-none"
          style={{left:n.x,top:n.y,color:n.crit?"#ffd600":"#ff4444",textShadow:n.crit?"0 0 12px #ffd600":"0 0 8px #ff0000",animation:"dmgFloat 1.2s ease-out forwards",fontSize:n.crit?"22px":"16px"}}>
          {n.crit?`⚡${n.val}`:`-${n.val}`}
        </div>
      ))}
      <style>{`@keyframes dmgFloat{0%{opacity:1;transform:translateY(0) scale(1.2);}60%{opacity:1;transform:translateY(-40px) scale(1);}100%{opacity:0;transform:translateY(-70px) scale(0.8);}}`}</style>
    </div>
  );
}

// ─── SKILL FLASH ──────────────────────────────────────────────────────────────

function SkillFlash({ color,label }: { color:string; label:string }) {
  return (
    <motion.div className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center"
      initial={{opacity:0}} animate={{opacity:[0,0.3,0]}} transition={{duration:0.5}}>
      <div className="text-4xl font-black font-mono uppercase tracking-widest" style={{color,textShadow:`0 0 30px ${color},0 0 60px ${color}`}}>{label}</div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OGWorld() {
  const [,setLocation]=useLocation();
  const [locked,setLocked]=useState(false);
  const [chatMessages,setChatMessages]=useState<ChatMsg[]>([]);
  const [otherPlayers,setOtherPlayers]=useState<WorldPlayer[]>([]);
  const [playerPos,setPlayerPos]=useState({x:0,z:0});
  const canvasRef=useRef<HTMLDivElement>(null);

  const [hp,setHp]=useState(200);
  const [mp,setMp]=useState(100);
  const [kills,setKills]=useState(0);
  const [xp,setXp]=useState(0);
  const maxHp=200, maxMp=100;
  const [dead,setDead]=useState(false);

  const [dmgNums,setDmgNums]=useState<DmgNumber[]>([]);
  const dmgIdRef=useRef(0);
  const [skillFlash,setSkillFlash]=useState<{color:string;label:string}|null>(null);
  const [lastSkillUsed,setLastSkillUsed]=useState([0,0,0]);

  const monstersRef=useRef<MonsterRuntime[]>(SPAWN_LIST.map(makeMonster));
  const [,forceMonRender]=useState(0);
  const skillCDsRef=useRef([0,0,0]);

  const myId       = sessionStorage.getItem("og_world_id")       || "anon";
  const myUsername = sessionStorage.getItem("og_world_username") || "Citizen";
  const myColor    = sessionStorage.getItem("og_world_color")    || "#ff2d8c";
  const myOrigin   = sessionStorage.getItem("og_world_origin")   || "Tank";
  const skills=CLASS_SKILLS[myOrigin]||DEFAULT_SKILLS;

  useEffect(()=>{ const id=setInterval(()=>setMp(m=>Math.min(maxMp,m+3)),1200); return()=>clearInterval(id); },[]);
  useEffect(()=>{ const id=setInterval(()=>{ const now=Date.now(); setDmgNums(prev=>prev.filter(n=>now-n.born<1200)); },300); return()=>clearInterval(id); },[]);
  useEffect(()=>{
    const id=setInterval(()=>{
      let changed=false;
      for(const m of monstersRef.current){
        if(!m.alive&&performance.now()-m.lastAttack>RESPAWN_TIME){ m.alive=true; m.hp=m.maxHp; m.pos.copy(m.spawnPos); m.aggro=false; changed=true; }
      }
      if(changed) forceMonRender(n=>n+1);
    },2000);
    return()=>clearInterval(id);
  },[]);

  const channelRef=useRef<any>(null);
  useEffect(()=>{
    if(!isSupabaseConfigured||!supabase) return;
    const ch=supabase.channel("og-world-v4",{config:{presence:{key:myId}}});
    ch.on("presence",{event:"sync"},()=>{
      const state=ch.presenceState<WorldPlayer>();
      const others:WorldPlayer[]=[];
      for(const [id,arr] of Object.entries(state)){ if(id===myId) continue; const p=arr[0] as WorldPlayer; if(p) others.push(p); }
      setOtherPlayers(others);
    })
    .on("broadcast",{event:"chat"},({payload}:any)=>{
      setChatMessages(prev=>[...prev.slice(-50),{username:payload.username,text:payload.text,id:Date.now()}]);
    })
    .subscribe(async(status)=>{
      if(status==="SUBSCRIBED") await ch.track({id:myId,username:myUsername,color:myColor,character:myOrigin,x:0,y:PLAYER_H,z:0,rx:0,hp,maxHp});
    });
    channelRef.current=ch;
    return()=>{ supabase!.removeChannel(ch); };
  },[]);

  useEffect(()=>{
    setChatMessages([
      {username:"Nattoun",text:`Welcome to Bahamas Land RPG, ${myUsername}! Don't die.`,id:1},
      {username:"System", text:"Click → Attack · Q/E/R → Skills · SHIFT → Sprint",id:2},
    ]);
  },[]);

  const handlePositionUpdate=useCallback((x:number,y:number,z:number,rx:number)=>{
    setPlayerPos({x,z});
    if(!channelRef.current) return;
    channelRef.current.track({id:myId,username:myUsername,color:myColor,character:myOrigin,x,y,z,rx,hp,maxHp});
  },[myId,myUsername,myColor,myOrigin,hp]);

  const handleChat=useCallback((text:string)=>{
    if(!channelRef.current) return;
    channelRef.current.send({type:"broadcast",event:"chat",payload:{username:myUsername,text}});
    setChatMessages(prev=>[...prev.slice(-50),{username:myUsername,text,id:Date.now()}]);
  },[myUsername]);

  const handleMonsterHit=useCallback((id:number,dmg:number,wx:number,wy:number,wz:number)=>{
    const mon=monstersRef.current.find(m=>m.id===id);
    if(!mon||!mon.alive) return;
    const crit=dmg>45;
    mon.hp=Math.max(0,mon.hp-dmg);
    if(mon.hp<=0){
      mon.alive=false; mon.lastAttack=performance.now(); mon.aggro=false;
      setKills(k=>k+1); setXp(x=>x+MON_XP[mon.type]);
      setChatMessages(prev=>[...prev.slice(-50),{username:"System",text:`🗡 ${myUsername} slayed a ${mon.type}! +${MON_XP[mon.type]} XP`,id:Date.now()}]);
    }
    forceMonRender(n=>n+1);
    const sx=window.innerWidth/2+(Math.random()-.5)*180;
    const sy=window.innerHeight/2+(Math.random()-.5)*80-40;
    setDmgNums(prev=>[...prev.slice(-15),{id:++dmgIdRef.current,x:sx,y:sy,val:dmg,crit,born:Date.now()}]);
  },[myUsername]);

  const handlePlayerHit=useCallback((dmg:number)=>{
    if(dead) return;
    setHp(h=>{
      const newHp=Math.max(0,h-dmg);
      if(newHp<=0){
        setDead(true);
        setTimeout(()=>{ setHp(maxHp); setMp(maxMp); setDead(false); setChatMessages(prev=>[...prev.slice(-50),{username:"Nattoun",text:"You died. Embarrassing. Even for a citizen.",id:Date.now()}]); },4000);
      }
      return newHp;
    });
    const sx=window.innerWidth/2+(Math.random()-.5)*60;
    const sy=window.innerHeight/2-40;
    setDmgNums(prev=>[...prev.slice(-15),{id:++dmgIdRef.current,x:sx,y:sy,val:dmg,crit:false,born:Date.now()}]);
  },[dead]);

  const handleSkillUse=useCallback((idx:number)=>{
    const sk=skills[idx]; if(!sk) return;
    skillCDsRef.current[idx]=performance.now();
    setLastSkillUsed(prev=>{ const n=[...prev]; n[idx]=Date.now(); return n; });
    setSkillFlash({color:sk.color,label:sk.label});
    setTimeout(()=>setSkillFlash(null),500);
    setMp(m=>Math.max(0,m-10));
  },[skills]);

  return (
    <div className="fixed inset-0 bg-black" ref={canvasRef}>
      <Canvas
        shadows
        camera={{fov:72,near:0.1,far:300,position:[0,PLAYER_H,5]}}
        gl={{antialias:true,powerPreference:"high-performance"}}
        performance={{min:0.5}}
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

      <HUD username={myUsername} color={myColor} origin={myOrigin} hp={hp} maxHp={maxHp} mp={mp} maxMp={maxMp} kills={kills} xp={xp} skills={skills} skillCooldowns={skillCDsRef} lastSkillUsed={lastSkillUsed} chatMessages={chatMessages} onChat={handleChat} locked={locked} onClickToLock={()=>canvasRef.current?.requestPointerLock()} onLeave={()=>setLocation("/og-gate")} playerX={playerPos.x} playerZ={playerPos.z} onlineCount={otherPlayers.length+1} />

      <DamageNumbers nums={dmgNums} />

      <AnimatePresence>
        {skillFlash&&<SkillFlash key={skillFlash.label} color={skillFlash.color} label={skillFlash.label} />}
      </AnimatePresence>

      <AnimatePresence>
        {dead&&(
          <motion.div className="absolute inset-0 bg-red-900/50 z-40 flex items-center justify-center pointer-events-none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
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
