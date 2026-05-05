import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sky, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Users, Shield, Map, Compass } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const WORLD_SIZE = 160;
const MOVE_SPEED = 0.14;

// ─── Biome zone definitions ───────────────────────────────────────────────────
// World split into zones (x,z ranges in a 160x160 world, centered at 0)
// Town:       center  -25..25 x -25..25
// Forest:     NW      -80..-25 x -80..-25
// Snow:       N       -25..25  x -80..-25
// NE snow     25..80  x -80..-25 (extends snow)
// Corrupted:  E       40..80   x -40..80
// Desert:     S       -25..80  x 40..80
// Swamp:      SW      -80..-25 x 25..80

function getBiome(x: number, z: number): string {
  const ax = Math.abs(x), az = Math.abs(z);
  if (ax < 25 && az < 25) return "town";
  if (x < -25 && z < -25) return "forest";
  if (z < -25 && x >= -25 && x < 40) return "snow";
  if (x > 40 && z < 30) return "corrupted";
  if (z > 30 && x > 10) return "desert";
  if (x < -25 && z > 25) return "swamp";
  return "grassland";
}

// ─── Multi-segment ground ─────────────────────────────────────────────────────

function BiomeGround() {
  const zones = [
    // Grassland base
    { pos: [0, -0.05, 0] as [number,number,number], size: [WORLD_SIZE, WORLD_SIZE] as [number,number], color: "#1a2e1a" },
    // Town center
    { pos: [0, 0, 0] as [number,number,number], size: [54, 54] as [number,number], color: "#4a3c28" },
    // Forest NW
    { pos: [-52, 0, -52] as [number,number,number], size: [60, 60] as [number,number], color: "#0d1f0d" },
    // Snow N
    { pos: [0, 0, -52] as [number,number,number], size: [66, 60] as [number,number], color: "#d0e8f0" },
    // Snow NE extension
    { pos: [52, 0, -52] as [number,number,number], size: [44, 60] as [number,number], color: "#c8dde8" },
    // Corrupted E
    { pos: [60, 0, 5] as [number,number,number], size: [44, 100] as [number,number], color: "#1a0a2e" },
    // Desert SE
    { pos: [40, 0, 58] as [number,number,number], size: [72, 44] as [number,number], color: "#c4a35a" },
    // Swamp SW
    { pos: [-52, 0, 52] as [number,number,number], size: [56, 52] as [number,number], color: "#1c2e18" },
    // Town cobblestone paths
    { pos: [0, 0.01, 0] as [number,number,number], size: [6, 54] as [number,number], color: "#5a5048" },
    { pos: [0, 0.01, 0] as [number,number,number], size: [54, 6] as [number,number], color: "#5a5048" },
  ];

  return (
    <>
      {zones.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={z.pos} receiveShadow>
          <planeGeometry args={z.size} />
          <meshStandardMaterial color={z.color} roughness={0.95} metalness={0.0} />
        </mesh>
      ))}
    </>
  );
}

// ─── Town zone ────────────────────────────────────────────────────────────────

function TownZone() {
  const buildings = [
    { pos: [-15, 4, -15] as [number,number,number], size: [10, 8, 10] as [number,number,number], wallColor: "#8b7355", roofColor: "#8b2222" },
    { pos: [15, 3, -12] as [number,number,number], size: [8, 6, 8] as [number,number,number], wallColor: "#9b8060", roofColor: "#5c3d1e" },
    { pos: [-14, 5, 14] as [number,number,number], size: [10, 10, 8] as [number,number,number], wallColor: "#7a6844", roofColor: "#4a2010" },
    { pos: [16, 3.5, 15] as [number,number,number], size: [10, 7, 10] as [number,number,number], wallColor: "#856848", roofColor: "#3d1a0a" },
    // Inn/tavern center-left
    { pos: [-8, 4.5, -4] as [number,number,number], size: [14, 9, 12] as [number,number,number], wallColor: "#9e8860", roofColor: "#6b2810" },
  ];

  const lanternPositions: [number,number,number][] = [
    [-25, 4, 0], [25, 4, 0], [0, 4, -25], [0, 4, 25],
    [-12, 4, -26], [12, 4, -26], [-12, 4, 26], [12, 4, 26],
    [-26, 4, -12], [-26, 4, 12], [26, 4, -12], [26, 4, 12],
  ];

  return (
    <group>
      {/* Well in center */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[2, 2.2, 1, 16]} />
        <meshStandardMaterial color="#6b5c48" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.8, 6]} />
        <meshStandardMaterial color="#5c4030" />
      </mesh>
      {/* Well roof posts */}
      <mesh position={[-1.8, 1.8, 0]} castShadow>
        <boxGeometry args={[0.25, 3, 0.25]} />
        <meshStandardMaterial color="#5c4030" />
      </mesh>
      <mesh position={[1.8, 1.8, 0]} castShadow>
        <boxGeometry args={[0.25, 3, 0.25]} />
        <meshStandardMaterial color="#5c4030" />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[4, 0.25, 0.25]} />
        <meshStandardMaterial color="#5c4030" />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh position={b.pos} castShadow receiveShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color={b.wallColor} roughness={0.85} />
          </mesh>
          {/* Roof */}
          <mesh
            position={[b.pos[0], b.pos[1] + b.size[1] / 2 + b.size[1] * 0.2, b.pos[2]]}
            castShadow
          >
            <coneGeometry args={[Math.max(b.size[0], b.size[2]) * 0.75, b.size[1] * 0.55, 4]} />
            <meshStandardMaterial color={b.roofColor} roughness={0.7} />
          </mesh>
          {/* Windows */}
          <mesh position={[b.pos[0], b.pos[1] + 0.5, b.pos[2] + b.size[2] / 2 + 0.01]}>
            <planeGeometry args={[2, 2]} />
            <meshStandardMaterial color="#ffd080" emissive="#ffd080" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}

      {/* Market stalls */}
      {[[8, 0, 8], [-8, 0, 8], [8, 0, -8]] .map(([x, y, z], i) => (
        <group key={i} position={[x, y, z] as [number,number,number]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[5, 0.2, 3]} />
            <meshStandardMaterial color={["#c84b4b","#4b6bc8","#4bc87a"][i]} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[4.5, 1.5, 2.5]} />
            <meshStandardMaterial color="#7a6044" roughness={0.9} />
          </mesh>
          {/* Stall posts */}
          {[[-2, 0, -1.4], [2, 0, -1.4], [-2, 0, 1.4], [2, 0, 1.4]].map(([px, py, pz], j) => (
            <mesh key={j} position={[px, 0.75, pz] as [number,number,number]}>
              <cylinderGeometry args={[0.1, 0.1, 1.5, 6]} />
              <meshStandardMaterial color="#5c4030" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Town lanterns */}
      {lanternPositions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 4, 6]} />
            <meshStandardMaterial color="#4a3828" />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.5, 0.7, 0.5]} />
            <meshStandardMaterial color="#ffd080" emissive="#ffd080" emissiveIntensity={1.5} transparent opacity={0.8} />
          </mesh>
          <pointLight position={[0, 0.4, 0]} intensity={1.2} color="#ffa030" distance={12} />
        </group>
      ))}

      {/* Town wall segments */}
      {[
        { pos: [0, 2, -28] as [number,number,number], size: [54, 4, 1.5] as [number,number,number] },
        { pos: [0, 2, 28] as [number,number,number], size: [54, 4, 1.5] as [number,number,number] },
        { pos: [-28, 2, 0] as [number,number,number], size: [1.5, 4, 54] as [number,number,number] },
        { pos: [28, 2, 0] as [number,number,number], size: [1.5, 4, 54] as [number,number,number] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos} castShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#6b5848" roughness={0.95} />
        </mesh>
      ))}

      {/* Town gate arch */}
      <mesh position={[0, 3.5, -28.5]} castShadow>
        <boxGeometry args={[8, 7, 1.5]} />
        <meshStandardMaterial color="#7a6048" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, -28.5]} castShadow>
        <boxGeometry args={[4, 5, 2]} />
        <meshStandardMaterial color="#1a1408" roughness={0.5} />
      </mesh>

      {/* Zone label */}
      <Billboard position={[0, 14, 0]}>
        <Text fontSize={1.8} color="#ffd080" outlineWidth={0.05} outlineColor="#000">
          Town
        </Text>
      </Billboard>

      <pointLight position={[0, 8, 0]} intensity={2} color="#ff9030" distance={35} />
    </group>
  );
}

// ─── Forest zone ──────────────────────────────────────────────────────────────

function Tree({ position, scale = 1 }: { position: [number,number,number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2 * scale, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
        <meshStandardMaterial color="#3d2010" roughness={0.95} />
      </mesh>
      <mesh position={[0, 5.5 * scale, 0]} castShadow>
        <coneGeometry args={[3.5, 5, 8]} />
        <meshStandardMaterial color="#1a3d1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 8 * scale, 0]} castShadow>
        <coneGeometry args={[2.5, 4.5, 8]} />
        <meshStandardMaterial color="#0d2e0d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 10 * scale, 0]} castShadow>
        <coneGeometry args={[1.5, 3.5, 8]} />
        <meshStandardMaterial color="#164a16" roughness={0.8} />
      </mesh>
    </group>
  );
}

function ForestZone() {
  const trees: { pos: [number,number,number]; sc: number }[] = [
    { pos: [-45, 0, -45], sc: 1.0 }, { pos: [-38, 0, -55], sc: 1.2 },
    { pos: [-55, 0, -38], sc: 0.9 }, { pos: [-62, 0, -50], sc: 1.1 },
    { pos: [-50, 0, -62], sc: 1.3 }, { pos: [-35, 0, -65], sc: 0.8 },
    { pos: [-65, 0, -35], sc: 1.0 }, { pos: [-42, 0, -35], sc: 1.1 },
    { pos: [-58, 0, -58], sc: 0.9 }, { pos: [-30, 0, -50], sc: 1.2 },
    { pos: [-70, 0, -45], sc: 0.8 }, { pos: [-48, 0, -72], sc: 1.0 },
    { pos: [-32, 0, -40], sc: 0.9 }, { pos: [-72, 0, -62], sc: 1.1 },
    { pos: [-40, 0, -48], sc: 0.7 }, { pos: [-60, 0, -30], sc: 1.0 },
  ];

  return (
    <group>
      {trees.map((t, i) => <Tree key={i} position={t.pos} scale={t.sc} />)}
      {/* Mossy rocks */}
      {[[-40,-0.3,-42],[-55,-0.3,-52],[-62,-0.3,-40],[-35,-0.3,-58]].map(([x,y,z], i) => (
        <mesh key={i} position={[x, y, z] as [number,number,number]} castShadow>
          <dodecahedronGeometry args={[1.5 + i * 0.3, 0]} />
          <meshStandardMaterial color="#2d3d1a" roughness={0.95} />
        </mesh>
      ))}
      {/* Campfire */}
      <group position={[-42, 0, -42]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.3, 8]} />
          <meshStandardMaterial color="#3d2810" />
        </mesh>
        {[0, 1.2, 2.4, 3.6].map((angle, i) => (
          <mesh key={i} position={[Math.cos(angle) * 0.8, 0.6, Math.sin(angle) * 0.8]}
            rotation={[0.3, angle, 0.1]}>
            <cylinderGeometry args={[0.1, 0.15, 1.4, 5]} />
            <meshStandardMaterial color="#5c3010" />
          </mesh>
        ))}
        <pointLight position={[0, 1.5, 0]} intensity={3} color="#ff6020" distance={15} />
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#ff8020" emissive="#ff6010" emissiveIntensity={3} />
        </mesh>
      </group>
      {/* Zone label */}
      <Billboard position={[-50, 18, -50]}>
        <Text fontSize={1.8} color="#76c442" outlineWidth={0.05} outlineColor="#000">
          Dark Forest
        </Text>
      </Billboard>
      <ambientLight color="#0d2e0d" intensity={0.2} />
      <pointLight position={[-50, 10, -50]} intensity={1.5} color="#1a4010" distance={40} />
    </group>
  );
}

// ─── Snow zone ────────────────────────────────────────────────────────────────

function SnowTree({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 4, 7]} />
        <meshStandardMaterial color="#4a3020" roughness={0.95} />
      </mesh>
      <mesh position={[0, 5, 0]} castShadow>
        <coneGeometry args={[3, 5, 7]} />
        <meshStandardMaterial color="#c8e8f0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 7.5, 0]} castShadow>
        <coneGeometry args={[2, 3.5, 7]} />
        <meshStandardMaterial color="#d8f0f8" roughness={0.6} />
      </mesh>
    </group>
  );
}

function SnowZone() {
  const snowTrees: [number,number,number][] = [
    [-10, 0, -40], [10, 0, -50], [-5, 0, -62], [20, 0, -44],
    [30, 0, -56], [-20, 0, -70], [5, 0, -75], [35, 0, -68],
    [-15, 0, -48], [25, 0, -38], [55, 0, -50], [65, 0, -38],
    [48, 0, -65], [70, 0, -60], [60, 0, -72],
  ];

  const iceRocks: [number,number,number][] = [
    [15, 0, -45], [-18, 0, -60], [28, 0, -62], [55, 0, -42], [68, 0, -55],
  ];

  return (
    <group>
      {snowTrees.map((pos, i) => <SnowTree key={i} position={pos} />)}

      {/* Ice crystals */}
      {iceRocks.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 1.5, z]} castShadow>
          <octahedronGeometry args={[1.5 + i * 0.2, 0]} />
          <meshStandardMaterial color="#a0d8f0" roughness={0.1} metalness={0.3} transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Frozen lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.05, -55]}>
        <circleGeometry args={[14, 24]} />
        <meshStandardMaterial color="#90c8e8" roughness={0.05} metalness={0.1} transparent opacity={0.7} />
      </mesh>

      {/* Yeti cave entrance */}
      <group position={[60, 0, -68]}>
        <mesh position={[0, 4, 0]} castShadow>
          <boxGeometry args={[12, 8, 6]} />
          <meshStandardMaterial color="#c8d8e8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3, 3.5]} castShadow>
          <boxGeometry args={[5, 6, 1]} />
          <meshStandardMaterial color="#0a0a1a" roughness={0.5} />
        </mesh>
        <pointLight position={[0, 3, 2]} intensity={1.5} color="#6080ff" distance={20} />
      </group>

      {/* Zone label */}
      <Billboard position={[15, 18, -55]}>
        <Text fontSize={1.8} color="#a0d8f0" outlineWidth={0.05} outlineColor="#0040a0">
          Snow Tundra
        </Text>
      </Billboard>

      <pointLight position={[15, 10, -55]} intensity={1} color="#a0c8f0" distance={60} />
      <fog attach="fog" args={["#8ab8d0", 40, 120]} />
    </group>
  );
}

// ─── Corrupted zone ───────────────────────────────────────────────────────────

function GatePortal() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.4;
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      ref.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[60, 0, -10]}>
      {/* Portal frame */}
      <mesh position={[0, 7, 0]} castShadow>
        <torusGeometry args={[6, 0.8, 16, 32]} />
        <meshStandardMaterial color="#2a0040" emissive="#4a0060" emissiveIntensity={1} roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Portal inner glow */}
      <mesh ref={ref} position={[0, 7, 0.1]}>
        <circleGeometry args={[5.5, 32]} />
        <meshStandardMaterial color="#4a0080" emissive="#8800cc" emissiveIntensity={2}
          transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Energy rings */}
      {[3, 4, 5].map((r, i) => (
        <mesh key={i} position={[0, 7, 0.05 * (i + 1)]}>
          <ringGeometry args={[r - 0.15, r, 32]} />
          <meshBasicMaterial color="#cc00ff" transparent opacity={0.3 - i * 0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Portal base */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[2.5, 3, 1, 12]} />
        <meshStandardMaterial color="#1a0030" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Portal pillars */}
      {[[-3, 0], [3, 0]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 7, pz as number]} castShadow>
          <boxGeometry args={[1.2, 14, 1.2]} />
          <meshStandardMaterial color="#1a0030" emissive="#2a0050" emissiveIntensity={0.5} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      <pointLight position={[0, 7, 2]} intensity={4} color="#aa00ff" distance={30} />
      <pointLight position={[0, 7, -2]} intensity={2} color="#ff0080" distance={20} />
    </group>
  );
}

function DeadTree({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 6, 6]} />
        <meshStandardMaterial color="#1a1020" roughness={0.95} />
      </mesh>
      {[1.2, 2.4, 3.8].map((h, i) => (
        <mesh key={i} position={[Math.cos(i * 2.1) * 1.5, h, Math.sin(i * 2.1) * 1.5]}
          rotation={[0.4, i * 2.1, 0.2]} castShadow>
          <cylinderGeometry args={[0.08, 0.15, 3, 5]} />
          <meshStandardMaterial color="#0d0818" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function CorruptedZone() {
  const deadTrees: [number,number,number][] = [
    [45, 0, -35], [55, 0, -50], [70, 0, -30], [48, 0, 20], [65, 0, 35],
    [72, 0, 10], [50, 0, -15], [44, 0, 50], [60, 0, 60], [75, 0, 45],
  ];

  const toxicPuddles: [number,number,number][] = [
    [50, 0.05, -25], [62, 0.05, 5], [55, 0.05, 30], [70, 0.05, -40], [47, 0.05, 40],
  ];

  return (
    <group>
      {deadTrees.map((pos, i) => <DeadTree key={i} position={pos} />)}

      {/* Toxic puddles */}
      {toxicPuddles.map(([x, y, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]}>
          <circleGeometry args={[2 + i * 0.4, 16]} />
          <meshStandardMaterial color="#00ff44" emissive="#00cc33" emissiveIntensity={0.8}
            transparent opacity={0.6} roughness={0.1} />
        </mesh>
      ))}
      {toxicPuddles.map(([x, y, z], i) => (
        <pointLight key={i} position={[x, y + 0.5, z]} intensity={1.2} color="#00ff44" distance={10} />
      ))}

      {/* Cracked earth fissures */}
      {[[52, 0, -20], [65, 0, 15], [44, 0, 30]].map(([x, y, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, i * 0.5, 0]} position={[x, 0.02, z]}>
          <planeGeometry args={[8, 1.5]} />
          <meshStandardMaterial color="#0a0010" roughness={0.5} />
        </mesh>
      ))}

      {/* Dark corrupted rocks */}
      {[[47, 0, -40], [68, 0, 25], [56, 0, 55], [72, 0, -55]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 1, z] as [number,number,number]} castShadow>
          <dodecahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="#1a0028" emissive="#2a0040" emissiveIntensity={0.3}
            roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      <GatePortal />

      {/* Zone label */}
      <Billboard position={[60, 22, -10]}>
        <Text fontSize={1.8} color="#cc00ff" outlineWidth={0.05} outlineColor="#000">
          Corrupted Lands
        </Text>
      </Billboard>

      <pointLight position={[60, 10, -10]} intensity={2} color="#4a0080" distance={50} />
      <ambientLight color="#1a0030" intensity={0.4} />
    </group>
  );
}

// ─── Desert zone ──────────────────────────────────────────────────────────────

function DesertZone() {
  const columns: [number,number,number][] = [
    [40, 0, 40], [50, 0, 55], [65, 0, 45], [55, 0, 68], [70, 0, 58],
    [44, 0, 70], [60, 0, 40], [72, 0, 70],
  ];

  return (
    <group>
      {/* Ruined columns */}
      {columns.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.9, 1.1, 6 - (i % 3) * 1.5, 8]} />
            <meshStandardMaterial color="#c4a060" roughness={0.9} />
          </mesh>
          {/* Capital */}
          <mesh position={[0, 6 - (i % 3) * 1.5, 0]} castShadow>
            <boxGeometry args={[2.5, 0.6, 2.5]} />
            <meshStandardMaterial color="#b89050" roughness={0.9} />
          </mesh>
          {/* Base */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 0.6, 8]} />
            <meshStandardMaterial color="#b89050" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Ancient ruin walls */}
      <mesh position={[58, 1.5, 52]} castShadow>
        <boxGeometry args={[20, 3, 1.2]} />
        <meshStandardMaterial color="#b89050" roughness={0.95} />
      </mesh>
      <mesh position={[50, 2, 62]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[16, 4, 1.2]} />
        <meshStandardMaterial color="#c0984a" roughness={0.95} />
      </mesh>

      {/* Sand dunes */}
      {[[40, 0, 50], [62, 0, 72], [55, 0, 44], [72, 0, 62]].map(([x, y, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
          <circleGeometry args={[4 + i, 12]} />
          <meshStandardMaterial color="#d4b470" roughness={0.99} />
        </mesh>
      ))}

      {/* Obelisk */}
      <mesh position={[56, 4, 56]} castShadow>
        <boxGeometry args={[2, 8, 2]} />
        <meshStandardMaterial color="#a08040" roughness={0.85} />
      </mesh>
      <mesh position={[56, 8.5, 56]} castShadow>
        <coneGeometry args={[1.6, 2.5, 4]} />
        <meshStandardMaterial color="#c0a050" roughness={0.85} emissive="#604000" emissiveIntensity={0.1} />
      </mesh>

      {/* Zone label */}
      <Billboard position={[56, 20, 56]}>
        <Text fontSize={1.8} color="#ffd080" outlineWidth={0.05} outlineColor="#804000">
          Desert Ruins
        </Text>
      </Billboard>

      <pointLight position={[56, 10, 56]} intensity={1.5} color="#ffa030" distance={50} />
    </group>
  );
}

// ─── Swamp zone ───────────────────────────────────────────────────────────────

function SwampZone() {
  return (
    <group>
      {/* Swamp trees */}
      {[[-40, 0, 40], [-55, 0, 50], [-48, 0, 65], [-62, 0, 42], [-35, 0, 58], [-70, 0, 55]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z] as [number,number,number]}>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.6, 6, 6]} />
            <meshStandardMaterial color="#2a3018" roughness={0.95} />
          </mesh>
          <mesh position={[0, 6, 0]} castShadow>
            <sphereGeometry args={[3.5, 8, 6]} />
            <meshStandardMaterial color="#1a2e10" roughness={0.9} />
          </mesh>
          {/* Hanging moss */}
          {[0, 1.2, 2.4, 3.6, 4.8].map((angle, j) => (
            <mesh key={j}
              position={[Math.cos(angle) * 2.5, 5, Math.sin(angle) * 2.5]}
              rotation={[0.2, angle, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 2 + j * 0.4, 4]} />
              <meshStandardMaterial color="#2a4010" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Murky water patches */}
      {[[-42, 0, 45], [-58, 0, 52], [-50, 0, 60], [-65, 0, 48]].map(([x, y, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
          <planeGeometry args={[10 + i * 2, 6 + i]} />
          <meshStandardMaterial color="#1a2c10" roughness={0.2} transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Will-o-wisps */}
      {[[-44, 3, 48], [-60, 4, 54], [-52, 3.5, 62]].map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z] as [number,number,number]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#80ff80" emissive="#40ff40" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[x, y, z] as [number,number,number]} intensity={2} color="#40ff80" distance={12} />
        </group>
      ))}

      {/* Zone label */}
      <Billboard position={[-52, 18, 52]}>
        <Text fontSize={1.8} color="#80ff80" outlineWidth={0.05} outlineColor="#002800">
          Cursed Swamp
        </Text>
      </Billboard>

      <pointLight position={[-52, 8, 52]} intensity={1} color="#204010" distance={40} />
    </group>
  );
}

// ─── Border walls ─────────────────────────────────────────────────────────────

function BorderWalls() {
  const h = 10;
  const s = WORLD_SIZE / 2;
  return (
    <>
      {[
        [0, h / 2, -s, 0],
        [0, h / 2, s, Math.PI],
        [-s, h / 2, 0, Math.PI / 2],
        [s, h / 2, 0, -Math.PI / 2],
      ].map(([x, y, z, ry], i) => (
        <mesh key={i} position={[x, y, z] as [number,number,number]}
          rotation={[0, ry, 0]} castShadow receiveShadow>
          <planeGeometry args={[WORLD_SIZE, h]} />
          <meshStandardMaterial color="#080810" side={THREE.BackSide} />
        </mesh>
      ))}
    </>
  );
}

// ─── Floating particles ───────────────────────────────────────────────────────

function Particles() {
  const count = 150;
  const positions = useRef(
    Float32Array.from({ length: count * 3 }, (_, i) => {
      const axis = i % 3;
      if (axis === 1) return Math.random() * 25 + 1;
      return (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    })
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color="#ff2d8c" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

// ─── Other players (Minecraft-style blocky avatar) ────────────────────────────

function OtherPlayer({ player }: { player: WorldPlayer }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.6;
  });

  const col = player.color;
  const colDark = col; // same color, emissive handles depth

  return (
    <group position={[player.x, player.y, player.z]}>
      <group ref={groupRef}>
        {/* Head */}
        <mesh position={[0, 2.12, 0]} castShadow>
          <boxGeometry args={[0.64, 0.64, 0.64]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.55} roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 1.38, 0]} castShadow>
          <boxGeometry args={[0.52, 0.74, 0.28]} />
          <meshStandardMaterial color={colDark} emissive={col} emissiveIntensity={0.25} roughness={0.5} />
        </mesh>
        {/* Left arm */}
        <mesh position={[-0.38, 1.38, 0]} castShadow>
          <boxGeometry args={[0.24, 0.72, 0.24]} />
          <meshStandardMaterial color={colDark} emissive={col} emissiveIntensity={0.2} roughness={0.5} />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.38, 1.38, 0]} castShadow>
          <boxGeometry args={[0.24, 0.72, 0.24]} />
          <meshStandardMaterial color={colDark} emissive={col} emissiveIntensity={0.2} roughness={0.5} />
        </mesh>
        {/* Left leg */}
        <mesh position={[-0.14, 0.64, 0]} castShadow>
          <boxGeometry args={[0.24, 0.64, 0.24]} />
          <meshStandardMaterial color={colDark} emissive={col} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
        {/* Right leg */}
        <mesh position={[0.14, 0.64, 0]} castShadow>
          <boxGeometry args={[0.24, 0.64, 0.24]} />
          <meshStandardMaterial color={colDark} emissive={col} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
      </group>

      {/* Nametag (fixed, doesn't rotate) */}
      <Billboard position={[0, 2.9, 0]}>
        <Text fontSize={0.34} color="white" outlineWidth={0.03} outlineColor="black" anchorX="center" anchorY="middle">
          {player.username}
        </Text>
      </Billboard>

      {/* HP bar */}
      <mesh position={[0, 3.24, 0]}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[-(0.5 - (player.hp / player.maxHp) * 0.5), 3.24, 0.001]}>
        <planeGeometry args={[player.hp / player.maxHp, 0.1]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>

      {/* Ground glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color={col} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ─── Movement controller ──────────────────────────────────────────────────────

function PlayerController({
  onPositionUpdate,
}: {
  onPositionUpdate: (x: number, y: number, z: number, rx: number) => void;
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
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (k["KeyW"] || k["ArrowUp"]) camera.position.addScaledVector(forward, MOVE_SPEED);
    if (k["KeyS"] || k["ArrowDown"]) camera.position.addScaledVector(forward, -MOVE_SPEED);
    if (k["KeyA"] || k["ArrowLeft"]) camera.position.addScaledVector(right, -MOVE_SPEED);
    if (k["KeyD"] || k["ArrowRight"]) camera.position.addScaledVector(right, MOVE_SPEED);

    const half = WORLD_SIZE / 2 - 2;
    camera.position.x = Math.max(-half, Math.min(half, camera.position.x));
    camera.position.z = Math.max(-half, Math.min(half, camera.position.z));
    camera.position.y = 1.7;

    const now = Date.now();
    if (now - lastSent.current > 200) {
      lastSent.current = now;
      onPositionUpdate(camera.position.x, camera.position.y, camera.position.z, camera.rotation.y);
    }
  });
  return null;
}

// ─── Main 3D scene ────────────────────────────────────────────────────────────

function WorldScene({
  myId, myUsername, myColor, myOrigin, otherPlayers, onPositionUpdate, onLockChange,
}: {
  myId: string; myUsername: string; myColor: string; myOrigin: string;
  otherPlayers: WorldPlayer[];
  onPositionUpdate: (x: number, y: number, z: number, rx: number) => void;
  onLockChange: (locked: boolean) => void;
}) {
  return (
    <>
      <color attach="background" args={["#080814"]} />
      <fog attach="fog" args={["#080814", 50, 150]} />
      <ambientLight intensity={0.25} color="#8090a0" />
      <directionalLight position={[30, 40, 20]} intensity={0.6} color="#e0d0c0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-far={180} shadow-camera-left={-90}
        shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90} />

      <BiomeGround />
      <BorderWalls />
      <Particles />

      <TownZone />
      <ForestZone />
      <SnowZone />
      <CorruptedZone />
      <DesertZone />
      <SwampZone />

      {otherPlayers.map((p) => <OtherPlayer key={p.id} player={p} />)}

      <PlayerController onPositionUpdate={onPositionUpdate} />
      <PointerLockControls onLock={() => onLockChange(true)} onUnlock={() => onLockChange(false)} />
    </>
  );
}

// ─── Minimap ──────────────────────────────────────────────────────────────────

function Minimap({ x, z }: { x: number; z: number }) {
  const mapSize = 96;
  const half = WORLD_SIZE / 2;
  const px = ((x + half) / WORLD_SIZE) * mapSize;
  const py = ((z + half) / WORLD_SIZE) * mapSize;

  const zones = [
    { label: "Town", x: 35, y: 35, w: 32, h: 32, color: "#6b5040" },
    { label: "Forest", x: 0, y: 0, w: 37, h: 37, color: "#0d2e0d" },
    { label: "Snow N", x: 37, y: 0, w: 41, h: 37, color: "#b8d8e8" },
    { label: "Snow NE", x: 63, y: 0, w: 33, h: 37, color: "#a8c8d8" },
    { label: "Corrupt", x: 78, y: 10, w: 18, h: 66, color: "#1a0a2e" },
    { label: "Desert", x: 60, y: 65, w: 36, h: 31, color: "#c4a05a" },
    { label: "Swamp", x: 0, y: 63, w: 34, h: 33, color: "#1c2e18" },
  ];

  return (
    <div className="relative w-24 h-24 border border-primary/40 bg-black/80 overflow-hidden">
      {zones.map((z, i) => (
        <div key={i} className="absolute" style={{
          left: z.x, top: z.y, width: z.w, height: z.h,
          background: z.color, opacity: 0.8,
        }} />
      ))}
      {/* Player dot */}
      <div className="absolute w-2 h-2 rounded-full bg-white z-10 -translate-x-1 -translate-y-1 shadow-glow"
        style={{ left: px, top: py, boxShadow: "0 0 6px #fff" }} />
      <Compass className="absolute top-1 left-1 w-2.5 h-2.5 text-white/30" />
      <div className="absolute bottom-0.5 left-0 right-0 text-center font-mono text-[7px] text-white/30 uppercase">
        Map
      </div>
    </div>
  );
}

// ─── Zone indicator ───────────────────────────────────────────────────────────

const ZONE_LABELS: Record<string, { name: string; color: string; danger: string }> = {
  town: { name: "Town", color: "#ffd080", danger: "Safe" },
  forest: { name: "Dark Forest", color: "#76c442", danger: "Danger Lv.2" },
  snow: { name: "Snow Tundra", color: "#a0d8f0", danger: "Danger Lv.3" },
  corrupted: { name: "Corrupted Lands", color: "#cc00ff", danger: "Danger Lv.5" },
  desert: { name: "Desert Ruins", color: "#ffd080", danger: "Danger Lv.4" },
  swamp: { name: "Cursed Swamp", color: "#80ff80", danger: "Danger Lv.3" },
  grassland: { name: "Grasslands", color: "#a0c060", danger: "Danger Lv.1" },
};

// ─── HUD ──────────────────────────────────────────────────────────────────────

function HUD({
  username, color, origin, onlineCount, hp, maxHp,
  chatMessages, onChat, locked, onClickToLock, onLeave,
  playerX, playerZ,
}: {
  username: string; color: string; origin: string; onlineCount: number;
  hp: number; maxHp: number; chatMessages: ChatMsg[]; onChat: (msg: string) => void;
  locked: boolean; onClickToLock: () => void; onLeave: () => void;
  playerX: number; playerZ: number;
}) {
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const sendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    onChat(t);
    setChatInput("");
  };

  const biome = getBiome(playerX, playerZ);
  const zone = ZONE_LABELS[biome] || ZONE_LABELS.grassland;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Crosshair */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/70 -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/70 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 border border-white/50 rounded-full" />
          </div>
        </div>
      )}

      {/* Click to lock */}
      {!locked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer"
          onClick={onClickToLock}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-black/80 border-2 border-primary px-8 py-6 text-center"
            style={{ boxShadow: "0 0 30px rgba(189,147,249,0.4)" }}>
            <p className="text-primary font-black uppercase tracking-widest text-lg">Click to Play</p>
            <p className="text-secondary font-mono text-xs uppercase mt-2">WASD to move · Mouse to look</p>
            <p className="text-white/40 font-mono text-[10px] uppercase mt-1">ESC to pause · T to chat</p>
          </motion.div>
        </div>
      )}

      {/* Top-left: Player info */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-black/75 border border-white/10 px-3 py-2 space-y-1.5 min-w-[160px]"
          style={{ boxShadow: `0 0 15px ${color}30` }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-white font-mono text-xs uppercase font-bold truncate">{username}</span>
          </div>
          {origin && (
            <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color }}>
              {origin}
            </div>
          )}
          {/* HP bar */}
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-green-400 shrink-0" />
            <div className="flex-1 bg-black/50 rounded-full h-1.5">
              <div className="bg-green-400 h-full rounded-full transition-all"
                style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
            <span className="text-green-400 font-mono text-[9px]">{hp}/{maxHp}</span>
          </div>
        </div>

        {/* Zone indicator */}
        <div className="bg-black/60 border border-white/10 px-3 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: zone.color }}>
            {zone.name}
          </div>
          <div className="font-mono text-[9px] text-white/30 uppercase">{zone.danger}</div>
        </div>
      </div>

      {/* Top-right: Online + Leave */}
      <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
        <div className="bg-black/70 border border-white/10 px-3 py-2 flex items-center gap-2">
          <Users className="w-3 h-3 text-secondary" />
          <span className="text-secondary font-mono text-xs">{onlineCount} online</span>
        </div>
        <button onClick={onLeave}
          className="bg-black/70 border border-red-500/40 px-3 py-2 text-red-400 hover:bg-red-900/30 transition flex items-center gap-1">
          <LogOut className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom hint */}
      {locked && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <p className="text-white/25 font-mono text-[10px] uppercase tracking-widest">
            WASD · move | MOUSE · look | ESC · pause | T · chat
          </p>
        </div>
      )}

      {/* Bottom-left: Chat */}
      <div className="absolute bottom-3 left-3 w-72 space-y-2 pointer-events-auto">
        <div ref={chatRef}
          className="bg-black/60 border border-white/10 p-2 h-28 overflow-y-auto space-y-1">
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
            <input autoFocus value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { sendChat(); setShowChat(false); }
                if (e.key === "Escape") setShowChat(false);
              }}
              maxLength={100} placeholder="Type a message..."
              className="flex-1 bg-black border border-primary text-primary font-mono text-xs px-2 py-1 focus:outline-none uppercase placeholder:text-white/20" />
            <button onClick={() => { sendChat(); setShowChat(false); }}
              className="bg-primary text-black font-bold text-xs px-2 py-1 uppercase">
              Send
            </button>
          </div>
        ) : (
          <button onClick={() => setShowChat(true)}
            className="text-white/30 font-mono text-[10px] uppercase hover:text-primary transition">
            [T] Open chat
          </button>
        )}
      </div>

      {/* Bottom-right: Minimap */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <Minimap x={playerX} z={playerZ} />
      </div>
    </div>
  );
}

// ─── Main OGWorld page ─────────────────────────────────────────────────────────

export default function OGWorld() {
  const [, setLocation] = useLocation();
  const [locked, setLocked] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<WorldPlayer[]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const myId = sessionStorage.getItem("og_world_id") || "anon";
  const myUsername = sessionStorage.getItem("og_world_username") || "Citizen";
  const myColor = sessionStorage.getItem("og_world_color") || "#ff2d8c";
  const myOrigin = sessionStorage.getItem("og_world_origin") || "";
  const [hp] = useState(100);
  const maxHp = 100;

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
          await channel.track({ id: myId, username: myUsername, color: myColor, character: "default", x: 0, y: 1.7, z: 0, rx: 0, hp, maxHp });
        }
      });
    channelRef.current = channel;
    return () => { supabase!.removeChannel(channel); };
  }, []);

  useEffect(() => {
    setChatMessages([{ username: "System", text: `Welcome to OG World, ${myUsername}!`, id: 1 }]);
  }, []);

  const handlePositionUpdate = useCallback(
    (x: number, y: number, z: number, rx: number) => {
      setPlayerPos({ x, z });
      if (!channelRef.current) return;
      channelRef.current.track({ id: myId, username: myUsername, color: myColor, character: "default", x, y, z, rx, hp, maxHp });
    },
    [myId, myUsername, myColor, hp]
  );

  const handleChat = useCallback(
    (text: string) => {
      if (!channelRef.current) return;
      channelRef.current.send({ type: "broadcast", event: "chat", payload: { username: myUsername, text } });
      setChatMessages((prev) => [...prev.slice(-40), { username: myUsername, text, id: Date.now() }]);
    },
    [myUsername]
  );

  const handleClickToLock = () => {
    canvasRef.current?.querySelector("canvas")?.requestPointerLock?.();
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" ref={canvasRef}>
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.7, 5] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
      >
        <Suspense fallback={null}>
          <WorldScene
            myId={myId} myUsername={myUsername} myColor={myColor} myOrigin={myOrigin}
            otherPlayers={otherPlayers} onPositionUpdate={handlePositionUpdate}
            onLockChange={setLocked}
          />
        </Suspense>
      </Canvas>

      <HUD
        username={myUsername} color={myColor} origin={myOrigin}
        onlineCount={otherPlayers.length + 1} hp={hp} maxHp={maxHp}
        chatMessages={chatMessages} onChat={handleChat} locked={locked}
        onClickToLock={handleClickToLock} onLeave={() => setLocation("/world")}
        playerX={playerPos.x} playerZ={playerPos.z}
      />
    </div>
  );
}
