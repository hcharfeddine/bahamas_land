import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type MonsterType = "dragon" | "spider" | "tiger" | "wolf" | "golem" | "phoenix" | "crab" | "serpent" | "shark" | "bear" | "scorpion" | "octopus" | "cyclops" | "minotaur" | "medusa" | "centaur" | "siren" | "chimera" | "sphinx" | "fenrir" | "jormungandr" | "kitsune" | "oni" | "qilin";
type Stage = "egg" | "baby" | "teen" | "adult" | "final";
type Status = "happy" | "angry" | "sleeping" | "critical" | "dead";

export const MONSTER_INFO: Record<MonsterType, { name: string; icon: string; primary: string; secondary: string; eggGlow: string }> = {
  dragon:      { name: "Dragon",        icon: "🐉", primary: "#b91c1c", secondary: "#f87171", eggGlow: "#ff4400" },
  spider:      { name: "Spider",        icon: "🕷️", primary: "#4c1d95", secondary: "#a78bfa", eggGlow: "#7c3aed" },
  tiger:       { name: "Tiger",         icon: "🐯", primary: "#c2410c", secondary: "#fb923c", eggGlow: "#f97316" },
  wolf:        { name: "Wolf",          icon: "🐺", primary: "#1e3a8a", secondary: "#93c5fd", eggGlow: "#3b82f6" },
  golem:       { name: "Golem",         icon: "🗿", primary: "#44403c", secondary: "#a8a29e", eggGlow: "#f59e0b" },
  phoenix:     { name: "Phoenix",       icon: "🦅", primary: "#92400e", secondary: "#fcd34d", eggGlow: "#fbbf24" },
  crab:        { name: "Crab",          icon: "🦀", primary: "#9a1515", secondary: "#ef4444", eggGlow: "#dc2626" },
  serpent:     { name: "Serpent",       icon: "🐍", primary: "#14532d", secondary: "#4ade80", eggGlow: "#16a34a" },
  shark:       { name: "Shark",         icon: "🦈", primary: "#1e3a5f", secondary: "#7dd3fc", eggGlow: "#0ea5e9" },
  bear:        { name: "Bear",          icon: "🐻", primary: "#451a03", secondary: "#a16207", eggGlow: "#78350f" },
  scorpion:    { name: "Scorpion",      icon: "🦂", primary: "#713f12", secondary: "#fbbf24", eggGlow: "#d97706" },
  octopus:     { name: "Octopus",       icon: "🐙", primary: "#2e1065", secondary: "#c084fc", eggGlow: "#9333ea" },
  cyclops:     { name: "Cyclops",       icon: "👁️", primary: "#5b21b6", secondary: "#a78bfa", eggGlow: "#7c3aed" },
  minotaur:    { name: "Minotaur",      icon: "🐂", primary: "#3b1a08", secondary: "#b45309", eggGlow: "#78350f" },
  medusa:      { name: "Medusa",        icon: "🐛", primary: "#14532d", secondary: "#86efac", eggGlow: "#22c55e" },
  centaur:     { name: "Centaur",       icon: "🏹", primary: "#7c2d12", secondary: "#fdba74", eggGlow: "#ea580c" },
  siren:       { name: "Siren",         icon: "🌊", primary: "#0c4a6e", secondary: "#38bdf8", eggGlow: "#0ea5e9" },
  chimera:     { name: "Chimera",       icon: "🔥", primary: "#7f1d1d", secondary: "#f97316", eggGlow: "#dc2626" },
  sphinx:      { name: "Sphinx",        icon: "🦁", primary: "#78350f", secondary: "#fde68a", eggGlow: "#f59e0b" },
  fenrir:      { name: "Fenrir",        icon: "🐺", primary: "#0f172a", secondary: "#64748b", eggGlow: "#475569" },
  jormungandr: { name: "Jörmungandr",  icon: "🌀", primary: "#052e16", secondary: "#4ade80", eggGlow: "#16a34a" },
  kitsune:     { name: "Kitsune",       icon: "🦊", primary: "#c2410c", secondary: "#fed7aa", eggGlow: "#f97316" },
  oni:         { name: "Oni",           icon: "👹", primary: "#7f1d1d", secondary: "#fca5a5", eggGlow: "#b91c1c" },
  qilin:       { name: "Qilin",         icon: "🦄", primary: "#92400e", secondary: "#4ade80", eggGlow: "#f59e0b" },
};

export function getMonsterType(username: string): MonsterType {
  // Scrambled multiplicative hash — distributes evenly across 12 types
  let h = 0x811c9dc5;
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i);
    h = (Math.imul(h, 0x01000193)) >>> 0;
  }
  h ^= h >>> 16;
  h = (Math.imul(h, 0x45d9f3b)) >>> 0;
  h ^= h >>> 16;
  const types: MonsterType[] = ["dragon", "spider", "tiger", "wolf", "golem", "phoenix", "crab", "serpent", "shark", "bear", "scorpion", "octopus", "cyclops", "minotaur", "medusa", "centaur", "siren", "chimera", "sphinx", "fenrir", "jormungandr", "kitsune", "oni", "qilin"];
  return types[h % types.length];
}

function statusGlow(status: Status): string {
  const map: Record<Status, string> = {
    happy: "#22c55e", angry: "#ef4444", sleeping: "#60a5fa",
    critical: "#f97316", dead: "#6b7280",
  };
  return map[status] ?? "#22c55e";
}

function Mat({ color, emissive, ei = 0.2, roughness = 0.45, metalness = 0.25, transparent = false, opacity = 1, wireframe = false }: {
  color: string; emissive?: string; ei?: number; roughness?: number; metalness?: number;
  transparent?: boolean; opacity?: number; wireframe?: boolean;
}) {
  return (
    <meshStandardMaterial
      color={color} emissive={emissive ?? color} emissiveIntensity={ei}
      roughness={roughness} metalness={metalness}
      transparent={transparent} opacity={opacity} wireframe={wireframe}
    />
  );
}

function useMonsterAnimation(ref: React.RefObject<THREE.Group | null>, status: Status) {
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.z = 0;
    if (status === "dead") {
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, Math.PI / 3, 0.02);
      g.position.y = -0.3;
    } else if (status === "critical") {
      g.rotation.z = Math.sin(t * 14) * 0.2;
      g.position.y = Math.sin(t * 14) * 0.06;
    } else if (status === "angry") {
      g.rotation.z = Math.sin(t * 9) * 0.1;
      g.position.y = Math.sin(t * 9) * 0.04;
    } else if (status === "sleeping") {
      g.position.y = Math.sin(t * 0.6) * 0.05 - 0.15;
      g.rotation.z = -0.05;
    } else {
      g.position.y = Math.sin(t * 1.3) * 0.07;
    }
  });
}

function EggMesh({ info, status }: { info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const col = status === "dead" ? "#444" : info.primary;
  return (
    <group ref={ref}>
      <mesh scale={[1, 1.4, 1]}>
        <sphereGeometry args={[0.68, 32, 32]} />
        <Mat color={col} emissive={info.eggGlow} ei={status === "dead" ? 0.05 : 0.3} roughness={0.25} metalness={0.2} />
      </mesh>
      <mesh scale={[1.03, 1.43, 1.03]}>
        <sphereGeometry args={[0.68, 8, 4]} />
        <Mat color={glow} emissive={glow} ei={0.9} transparent opacity={0.25} wireframe />
      </mesh>
      <mesh scale={[1.06, 1.46, 1.06]}>
        <sphereGeometry args={[0.68, 6, 3]} />
        <Mat color={glow} emissive={glow} ei={0.5} transparent opacity={0.12} wireframe />
      </mesh>
    </group>
  );
}

function DragonMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh><sphereGeometry args={[0.52, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.28, 0.42, 0]}><sphereGeometry args={[0.3, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.52, 0.42, 0.1]} scale={[0.6, 0.55, 0.5]}><sphereGeometry args={[0.18, 10, 10]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-0.28, 0.08, 0.42]} rotation={[0.3, 0, 0.55]}><boxGeometry args={[0.48, 0.07, 0.32]} /><Mat color={s} emissive={glow} ei={ei + 0.1} roughness={0.3} /></mesh>
      <mesh position={[-0.28, 0.08, -0.42]} rotation={[-0.3, 0, 0.55]}><boxGeometry args={[0.48, 0.07, 0.32]} /><Mat color={s} emissive={glow} ei={ei + 0.1} roughness={0.3} /></mesh>
      <mesh position={[-0.52, -0.1, 0]} rotation={[0, 0, 0.35]}><coneGeometry args={[0.1, 0.45, 7]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0.5, 0.5, z]}><sphereGeometry args={[0.046, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );

  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.1, 0.92, 1]}><sphereGeometry args={[0.62, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.42, 0.38, 0]} rotation={[0, 0, -0.75]}><cylinderGeometry args={[0.17, 0.22, 0.48, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.76, 0.68, 0]}><sphereGeometry args={[0.37, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0.82, 1.05, z]} rotation={[(i ? -0.4 : 0.4), 0, -0.15]}><coneGeometry args={[0.055, 0.3, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
      <mesh position={[-0.2, 0.22, 0.78]} rotation={[0.22, -0.3, 0.6]}><boxGeometry args={[0.85, 0.065, 0.55]} /><Mat color={s} emissive={glow} ei={ei + 0.15} roughness={0.3} /></mesh>
      <mesh position={[-0.2, 0.22, -0.78]} rotation={[-0.22, 0.3, 0.6]}><boxGeometry args={[0.85, 0.065, 0.55]} /><Mat color={s} emissive={glow} ei={ei + 0.15} roughness={0.3} /></mesh>
      <mesh position={[-0.62, -0.08, 0]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.08, 0.18, 0.72, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-1.05, 0.15, 0]} rotation={[0, 0, -0.35]}><coneGeometry args={[0.13, 0.32, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[1.02, 0.76, z]}><sphereGeometry args={[0.058, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );

  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.2, 0.95, 1.05]}><sphereGeometry args={[0.72, 20, 20]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.22, -0.12, 0]} scale={[0.82, 0.72, 0.9]}><sphereGeometry args={[0.58, 16, 16]} /><Mat color={s} emissive={glow} ei={ei * 0.5} roughness={0.6} /></mesh>
      <mesh position={[0.58, 0.5, 0]} rotation={[0, 0, -0.88]}><cylinderGeometry args={[0.2, 0.28, 0.56, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.98, 0.88, 0]} scale={[1.1, 0.95, 0.96]}><sphereGeometry args={[0.44, 20, 20]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[1.38, 0.78, 0]} scale={[0.78, 0.6, 0.72]}><sphereGeometry args={[0.26, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.16, -0.16].map((z, i) => <mesh key={i} position={[1.01, 1.3, z]} rotation={[(i ? -0.4 : 0.4), 0, -0.14]}><coneGeometry args={[0.07, 0.48, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
      <mesh position={[-0.12, 0.32, 1.15]} rotation={[0.3, -0.4, 0.5]}><boxGeometry args={[1.25, 0.065, 0.78]} /><Mat color={s} emissive={glow} ei={ei + 0.2} roughness={0.3} /></mesh>
      <mesh position={[-0.12, 0.32, -1.15]} rotation={[-0.3, 0.4, 0.5]}><boxGeometry args={[1.25, 0.065, 0.78]} /><Mat color={s} emissive={glow} ei={ei + 0.2} roughness={0.3} /></mesh>
      {([[0.32, -0.72, 0.42], [0.32, -0.72, -0.42], [-0.32, -0.72, 0.32], [-0.32, -0.72, -0.32]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.085, 0.065, 0.52, 6]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[-0.72, 0, 0]} rotation={[0, 0, 0.32]}><cylinderGeometry args={[0.1, 0.22, 0.9, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-1.28, 0.3, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.18, 0.46, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[1.34, 0.96, z]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );

  return (
    <group ref={ref}>
      <mesh scale={[1.32, 1.02, 1.12]}><sphereGeometry args={[0.82, 24, 24]} /><Mat color={p} emissive={glow} ei={ei + 0.05} /></mesh>
      <mesh position={[0.28, -0.14, 0]} scale={[0.9, 0.8, 1.0]}><sphereGeometry args={[0.68, 18, 18]} /><Mat color={s} emissive={glow} ei={ei * 0.6} roughness={0.6} /></mesh>
      <mesh position={[0.68, 0.58, 0]} rotation={[0, 0, -0.9]}><cylinderGeometry args={[0.24, 0.32, 0.65, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[1.14, 1.02, 0]} scale={[1.15, 1.0, 1.0]}><sphereGeometry args={[0.5, 24, 24]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[1.6, 0.9, 0]} scale={[0.82, 0.62, 0.74]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[-0.26, -0.12, 0, 0.12, 0.26].map((z, i) =>
        <mesh key={i} position={[1.16, 1.52 - Math.abs(z) * 0.55, z]} rotation={[z * 1.4, 0, -0.12]}>
          <coneGeometry args={[0.07, 0.5 - Math.abs(z) * 0.28, 6]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} roughness={0.3} />
        </mesh>)}
      <mesh position={[-0.12, 0.42, 1.42]} rotation={[0.35, -0.45, 0.45]}><boxGeometry args={[1.65, 0.055, 1.05]} /><Mat color={s} emissive={glow} ei={ei + 0.35} roughness={0.25} /></mesh>
      <mesh position={[-0.12, 0.42, -1.42]} rotation={[-0.35, 0.45, 0.45]}><boxGeometry args={[1.65, 0.055, 1.05]} /><Mat color={s} emissive={glow} ei={ei + 0.35} roughness={0.25} /></mesh>
      <mesh position={[-0.55, 0.78, 2.22]} rotation={[0.5, -0.5, 0.3]}><coneGeometry args={[0.06, 0.42, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>
      <mesh position={[-0.55, 0.78, -2.22]} rotation={[-0.5, 0.5, 0.3]}><coneGeometry args={[0.06, 0.42, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>
      {([[0.38, -0.9, 0.52], [0.38, -0.9, -0.52], [-0.38, -0.9, 0.42], [-0.38, -0.9, -0.42]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.1, 0.078, 0.65, 6]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[-0.88, 0, 0]} rotation={[0, 0, 0.32]}><cylinderGeometry args={[0.12, 0.28, 1.12, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-1.62, 0.45, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.22, 0.56, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} /></mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.6, 0.038, 8, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.55} /></mesh>
      {[0.22, -0.22].map((z, i) => <mesh key={i} position={[1.58, 1.12, z]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
}

function SpiderMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  const leg = (x: number, y: number, z: number, rx: number, ry: number, rz: number, len: number, thick: number) => (
    <mesh position={[x, y, z]} rotation={[rx, ry, rz]}>
      <cylinderGeometry args={[thick, thick * 0.6, len, 5]} />
      <Mat color={p} emissive={glow} ei={ei} roughness={0.5} />
    </mesh>
  );

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh><sphereGeometry args={[0.5, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.35, 0.28, 0]}><sphereGeometry args={[0.28, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.2, -0.2].map((z, i) => <mesh key={i} position={[0.52, 0.36, z]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      {([[-0.1, 0, 0.45, 0, 0, 0.7, 0.55, 0.04], [-0.1, 0, -0.45, 0, 0, -0.7, 0.55, 0.04],
         [-0.3, 0, 0.42, 0, 0, 0.65, 0.5, 0.04], [-0.3, 0, -0.42, 0, 0, -0.65, 0.5, 0.04]] as number[][]).map((a, i) =>
        leg(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]))}
    </group>
  );

  if (stage === "teen") return (
    <group ref={ref}>
      <mesh position={[-0.28, 0, 0]} scale={[1.1, 0.9, 1.0]}><sphereGeometry args={[0.58, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.45, 0.1, 0]}><sphereGeometry args={[0.38, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.16, -0.16].map((z, i) => <mesh key={i} position={[0.72, 0.22, z]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      {[0.08, -0.08].map((z, i) => <mesh key={i} position={[0.35, 0.06, z]} rotation={[0, 0, -0.6]}><coneGeometry args={[0.04, 0.22, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>)}
      {([[-0.1, 0, 0.55, 0, 0, 0.75, 0.65, 0.045], [-0.1, 0, -0.55, 0, 0, -0.75, 0.65, 0.045],
         [-0.32, 0, 0.5, 0, 0, 0.7, 0.6, 0.04], [-0.32, 0, -0.5, 0, 0, -0.7, 0.6, 0.04],
         [-0.52, 0, 0.48, 0, 0, 0.65, 0.58, 0.038], [-0.52, 0, -0.48, 0, 0, -0.65, 0.58, 0.038]] as number[][]).map((a, i) =>
        leg(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]))}
    </group>
  );

  if (stage === "adult") return (
    <group ref={ref}>
      <mesh position={[-0.35, 0, 0]} scale={[1.2, 0.95, 1.05]}><sphereGeometry args={[0.68, 20, 20]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.58, 0.12, 0]}><sphereGeometry args={[0.46, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.14, 0, -0.14].map((z, i) => [0.2, 0.1, -0.08].map((y, j) =>
        <mesh key={`${i}${j}`} position={[0.9 + j * 0.04, 0.22 + y * 0.05, z]}><sphereGeometry args={[0.05, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>))}
      {[0.1, -0.1].map((z, i) => <mesh key={i} position={[0.45, -0.05, z]} rotation={[0, 0, -0.7]}><coneGeometry args={[0.055, 0.3, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.25} /></mesh>)}
      <mesh position={[-0.35, -0.78, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.04, 0.22, 5]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {([[-0.1, 0, 0.62, 0, 0, 0.82, 0.75, 0.052], [-0.1, 0, -0.62, 0, 0, -0.82, 0.75, 0.052],
         [-0.34, 0, 0.58, 0, 0, 0.76, 0.7, 0.048], [-0.34, 0, -0.58, 0, 0, -0.76, 0.7, 0.048],
         [-0.56, 0, 0.55, 0, 0, 0.7, 0.66, 0.044], [-0.56, 0, -0.55, 0, 0, -0.7, 0.66, 0.044],
         [-0.76, 0, 0.5, 0, 0, 0.62, 0.6, 0.04], [-0.76, 0, -0.5, 0, 0, -0.62, 0.6, 0.04]] as number[][]).map((a, i) =>
        leg(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]))}
    </group>
  );

  return (
    <group ref={ref}>
      <mesh position={[-0.42, 0, 0]} scale={[1.3, 1.0, 1.1]}><sphereGeometry args={[0.8, 24, 24]} /><Mat color={p} emissive={glow} ei={ei + 0.05} /></mesh>
      <mesh position={[0.72, 0.15, 0]}><sphereGeometry args={[0.55, 20, 20]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.16, 0, -0.16].map((z, i) => [0.25, 0.1, -0.1].map((y, j) =>
        <mesh key={`${i}${j}`} position={[1.1 + j * 0.045, 0.3 + y * 0.06, z]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>))}
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0.52, -0.08, z]} rotation={[0, 0, -0.75]}><coneGeometry args={[0.07, 0.42, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.35} /></mesh>)}
      {([-0.12, -0.38, -0.6, -0.8].map((bx, i) => ([
        [bx, 0, 0.68 + i * 0.04, 0, 0, 0.88 - i * 0.04, 0.88, 0.065],
        [bx, 0, -(0.68 + i * 0.04), 0, 0, -(0.88 - i * 0.04), 0.88, 0.065]
      ] as number[][]))).flat().map((a, i) => leg(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]))}
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.45, 0.03, 6, 32]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.55} />
      </mesh>
      {[0, Math.PI / 3, Math.PI * 2 / 3].map((a, i) =>
        <mesh key={i} position={[Math.cos(a) * 1.1, 0.55, Math.sin(a) * 1.1]}><coneGeometry args={[0.06, 0.35, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} /></mesh>)}
    </group>
  );
}

function TigerMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;
  const stripe = status === "dead" ? "#333" : "#1c0a00";

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.1, 0.95, 1]}><sphereGeometry args={[0.5, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.45, 0.32, 0]}><sphereGeometry args={[0.32, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0.48, 0.68, z]} rotation={[(i ? -0.2 : 0.2), 0, 0.1]}><coneGeometry args={[0.1, 0.22, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[-0.65, 0, 0]} rotation={[0, 0, 0.35]}><cylinderGeometry args={[0.07, 0.04, 0.52, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.16, -0.16].map((z, i) => <mesh key={i} position={[0.72, 0.36, z]}><sphereGeometry args={[0.048, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      {[0.2, -0.2].map((z, i) => <mesh key={i} position={[0.08, 0.05, z]} scale={[0.85, 0.15, 0.06]}><boxGeometry args={[0.5, 1, 1]} /><Mat color={stripe} ei={0} roughness={0.8} /></mesh>)}
    </group>
  );

  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.25, 0.82, 1.0]}><sphereGeometry args={[0.62, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.62, 0.35, 0]}><sphereGeometry args={[0.38, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.16, -0.16].map((z, i) => <mesh key={i} position={[0.68, 0.78, z]} rotation={[(i ? -0.15 : 0.15), 0, 0.1]}><coneGeometry args={[0.11, 0.25, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      {([[0.38, -0.62, 0.32], [0.38, -0.62, -0.32], [-0.32, -0.62, 0.28], [-0.32, -0.62, -0.28]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.15]}><cylinderGeometry args={[0.085, 0.065, 0.52, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[-0.85, 0.05, 0]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.065, 0.04, 0.65, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0.92, 0.42, z]}><sphereGeometry args={[0.058, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      {[-0.35, -0.05, 0.25].map((x, i) => <mesh key={i} position={[x, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 1.05, 4]} /><Mat color={stripe} ei={0} roughness={0.9} /></mesh>)}
    </group>
  );

  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.35, 0.78, 1.1]}><sphereGeometry args={[0.72, 20, 20]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.75, 0.42, 0]}><sphereGeometry args={[0.44, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0.82, 0.92, z]} rotation={[(i ? -0.12 : 0.12), 0, 0.08]}><coneGeometry args={[0.12, 0.28, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      {([[0.45, -0.72, 0.4], [0.45, -0.72, -0.4], [-0.38, -0.72, 0.35], [-0.38, -0.72, -0.35]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.15]}><cylinderGeometry args={[0.1, 0.075, 0.62, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[-1.08, 0.08, 0]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.075, 0.045, 0.82, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.2, -0.2].map((z, i) => <mesh key={i} position={[1.1, 0.52, z]}><sphereGeometry args={[0.068, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
      {[-0.5, -0.18, 0.14, 0.46].map((x, i) => <mesh key={i} position={[x, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.048, 0.048, 1.25, 4]} /><Mat color={stripe} ei={0} roughness={0.9} /></mesh>)}
    </group>
  );

  return (
    <group ref={ref}>
      <mesh scale={[1.42, 0.82, 1.15]}><sphereGeometry args={[0.84, 24, 24]} /><Mat color={s} emissive={glow} ei={ei + 0.05} /></mesh>
      <mesh position={[0.9, 0.5, 0]}><sphereGeometry args={[0.52, 20, 20]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.22, -0.22].map((z, i) => <mesh key={i} position={[0.98, 1.08, z]} rotation={[(i ? -0.12 : 0.12), 0, 0.08]}><coneGeometry args={[0.13, 0.32, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      {([[0.52, -0.88, 0.48], [0.52, -0.88, -0.48], [-0.45, -0.88, 0.42], [-0.45, -0.88, -0.42]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, 0.15]}><cylinderGeometry args={[0.11, 0.082, 0.72, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[-1.3, 0.1, 0]} rotation={[0, 0, 0.38]}><cylinderGeometry args={[0.082, 0.048, 1.0, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[0.24, -0.24].map((z, i) => <mesh key={i} position={[1.32, 0.62, z]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      {[-0.6, -0.25, 0.1, 0.45].map((x, i) => <mesh key={i} position={[x, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 1.45, 4]} /><Mat color={stripe} ei={0} roughness={0.9} /></mesh>)}
      {[0.28, -0.28].map((z, i) =>
        <mesh key={i} position={[-0.05, 0.45, z]} rotation={[(i ? -0.15 : 0.15), 0, 0.6]}>
          <boxGeometry args={[0.85, 0.05, 0.5]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.8} transparent opacity={0.75} roughness={0.2} />
        </mesh>)}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.5, 0.035, 6, 36]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
    </group>
  );
}

function WolfMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.05, 0.98, 1]}><sphereGeometry args={[0.5, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[0.42, 0.3, 0]}><sphereGeometry args={[0.3, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0.42, 0.64, z]} rotation={[0, 0, (i ? 0.25 : -0.25)]}><coneGeometry args={[0.09, 0.26, 4]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      <mesh position={[-0.62, -0.08, 0]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.08, 0.12, 0.5, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[-0.62, -0.08, 0]} scale={[1.2, 1.2, 1.5]}><sphereGeometry args={[0.14, 8, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0.66, 0.36, z]}><sphereGeometry args={[0.045, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
    </group>
  );

  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.3, 0.8, 1.0]}><sphereGeometry args={[0.62, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[0.62, 0.38, 0]}><sphereGeometry args={[0.38, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0.65, 0.82, z]} rotation={[0, 0, (i ? 0.2 : -0.2)]}><coneGeometry args={[0.1, 0.3, 4]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      {([[0.38, -0.62, 0.32], [0.38, -0.62, -0.32], [-0.35, -0.62, 0.28], [-0.35, -0.62, -0.28]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.082, 0.062, 0.55, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      <mesh position={[-0.88, 0.06, 0]} rotation={[0, 0, 0.42]}><cylinderGeometry args={[0.07, 0.05, 0.68, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[-0.88, 0, 0]} scale={[1.2, 1.4, 1.5]}><sphereGeometry args={[0.15, 8, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0.94, 0.44, z]}><sphereGeometry args={[0.058, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
    </group>
  );

  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.4, 0.78, 1.05]}><sphereGeometry args={[0.74, 20, 20]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[0.55, 0.22, 0]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.18, 0.24, 0.42, 8]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[0.82, 0.5, 0]}><sphereGeometry args={[0.44, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      {[0.16, -0.16].map((z, i) => <mesh key={i} position={[0.88, 0.98, z]} rotation={[0, 0, (i ? 0.18 : -0.18)]}><coneGeometry args={[0.11, 0.32, 4]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      {[0, 0.18, 0.32].map((y, i) => <mesh key={i} position={[-0.05, 0.42 + y, 0]} scale={[0.5 + i * 0.1, 0.12, 0.55]}><sphereGeometry args={[0.65, 8, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.1} roughness={0.8} /></mesh>)}
      {([[0.42, -0.74, 0.42], [0.42, -0.74, -0.42], [-0.42, -0.74, 0.36], [-0.42, -0.74, -0.36]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.095, 0.072, 0.65, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      <mesh position={[-1.12, 0.08, 0]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.075, 0.048, 0.85, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[-1.12, 0.02, 0]} scale={[1.3, 1.5, 1.6]}><sphereGeometry args={[0.18, 8, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      {[0.2, -0.2].map((z, i) => <mesh key={i} position={[1.16, 0.58, z]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );

  return (
    <group ref={ref}>
      <mesh scale={[1.48, 0.82, 1.1]}><sphereGeometry args={[0.86, 24, 24]} /><Mat color={s} emissive={glow} ei={ei + 0.05} roughness={0.7} /></mesh>
      <mesh position={[0.65, 0.28, 0]} rotation={[0, 0, -0.52]}><cylinderGeometry args={[0.22, 0.3, 0.5, 8]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[0.98, 0.62, 0]}><sphereGeometry args={[0.52, 22, 22]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      {[0.2, -0.2].map((z, i) => <mesh key={i} position={[1.05, 1.2, z]} rotation={[0, 0, (i ? 0.15 : -0.15)]}><coneGeometry args={[0.13, 0.38, 4]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      {[0, 0.2, 0.38, 0.52].map((y, i) => <mesh key={i} position={[-0.05, 0.5 + y, 0]} scale={[0.45 + i * 0.12, 0.14, 0.62]}><sphereGeometry args={[0.72, 8, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.15} roughness={0.75} /></mesh>)}
      {([[0.5, -0.92, 0.5], [0.5, -0.92, -0.5], [-0.5, -0.92, 0.44], [-0.5, -0.92, -0.44]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.11, 0.082, 0.75, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>)}
      <mesh position={[-1.36, 0.1, 0]} rotation={[0, 0, 0.38]}><cylinderGeometry args={[0.082, 0.05, 1.02, 6]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.7} /></mesh>
      <mesh position={[-1.36, 0.02, 0]} scale={[1.3, 1.6, 1.8]}><sphereGeometry args={[0.22, 8, 8]} /><Mat color={p} emissive={glow} ei={ei + 0.1} roughness={0.75} /></mesh>
      {[0, Math.PI / 2, Math.PI].map((a, i) => <mesh key={i} position={[Math.cos(a + 0.5) * 1.0, 0.35 + Math.sin(a) * 0.15, Math.sin(a + 0.5) * 1.0]}><coneGeometry args={[0.06, 0.32, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} /></mesh>)}
      {[0.26, -0.26].map((z, i) => <mesh key={i} position={[1.42, 0.72, z]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.55, 0.032, 6, 36]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.5} /></mesh>
    </group>
  );
}

function GolemMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh><sphereGeometry args={[0.52, 10, 10]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.9} metalness={0.1} /></mesh>
      <mesh position={[0, 0.62, 0]}><sphereGeometry args={[0.3, 8, 8]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.9} metalness={0.1} /></mesh>
      {[0.35, -0.35].map((x, i) => <mesh key={i} position={[x, 0.05, 0]}><cylinderGeometry args={[0.14, 0.14, 0.35, 6]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>)}
      <mesh position={[0, 0.55, 0]}><torusGeometry args={[0.2, 0.03, 5, 16]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} /></mesh>
    </group>
  );

  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[0.9, 1.1, 0.85]}><boxGeometry args={[0.9, 1.0, 0.7]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.92} metalness={0.1} /></mesh>
      <mesh position={[0, 0.72, 0]}><boxGeometry args={[0.65, 0.55, 0.62]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.92} metalness={0.1} /></mesh>
      {[0.58, -0.58].map((x, i) => <mesh key={i} position={[x, 0.08, 0]}><cylinderGeometry args={[0.15, 0.18, 0.65, 6]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>)}
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0, 0.75, z]}><sphereGeometry args={[0.06, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      {[0.25, 0, -0.25].map((z, i) => <mesh key={i} position={[0, 0.22, z]} rotation={[0, 0, 0.1]}><boxGeometry args={[0.88, 0.07, 0.06]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.2} /></mesh>)}
    </group>
  );

  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.0, 1.2, 0.9]}><boxGeometry args={[1.0, 1.15, 0.8]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.92} metalness={0.1} /></mesh>
      <mesh position={[0, 0.85, 0]}><boxGeometry args={[0.78, 0.65, 0.72]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.92} metalness={0.1} /></mesh>
      {[0.72, -0.72].map((x, i) => <mesh key={i} position={[x, 0.1, 0]}><cylinderGeometry args={[0.18, 0.22, 0.8, 6]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>)}
      {[0.32, -0.32].map((x, i) => <mesh key={i} position={[x, -0.72, 0]}><cylinderGeometry args={[0.2, 0.24, 0.62, 6]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>)}
      <mesh position={[0, 0.52, 0]}><octahedronGeometry args={[0.22]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} roughness={0.1} metalness={0.8} /></mesh>
      {[0.2, -0.2].map((z, i) => <mesh key={i} position={[0, 0.9, z]}><sphereGeometry args={[0.07, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
      {[-0.3, 0, 0.3].map((z, i) => [-0.1, 0.1, 0.3].map((y, j) =>
        <mesh key={`${i}${j}`} position={[0, y, z]} rotation={[0, 0, 0.08]}><boxGeometry args={[1.05, 0.05, 0.04]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.0} transparent opacity={0.8} /></mesh>))}
    </group>
  );

  return (
    <group ref={ref}>
      <mesh scale={[1.1, 1.3, 1.0]}><boxGeometry args={[1.15, 1.3, 0.92]} /><Mat color={s} emissive={glow} ei={ei + 0.05} roughness={0.9} metalness={0.12} /></mesh>
      <mesh position={[0, 1.02, 0]}><boxGeometry args={[0.92, 0.78, 0.84]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.9} metalness={0.12} /></mesh>
      {[0.85, -0.85].map((x, i) => <mesh key={i} position={[x, 0.12, 0]}><cylinderGeometry args={[0.22, 0.28, 0.95, 6]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>)}
      {[0.38, -0.38].map((x, i) => <mesh key={i} position={[x, -0.9, 0]}><cylinderGeometry args={[0.24, 0.3, 0.72, 6]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>)}
      <mesh position={[0, 0.62, 0]}><octahedronGeometry args={[0.3]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} roughness={0.05} metalness={0.9} /></mesh>
      {[0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3].map((a, i) =>
        <mesh key={i} position={[Math.cos(a) * 0.78, 1.12, Math.sin(a) * 0.78]}><coneGeometry args={[0.08, 0.4, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} /></mesh>)}
      {[-0.35, -0.1, 0.15, 0.4].map((z, i) => [-0.2, 0, 0.2, 0.4].map((y, j) =>
        <mesh key={`${i}${j}`} position={[0, y, z]} rotation={[0, 0, 0.06]}><boxGeometry args={[1.18, 0.045, 0.035]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.2} transparent opacity={0.85} /></mesh>))}
      {[0.26, -0.26].map((z, i) => <mesh key={i} position={[0, 1.08, z]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.2} /></mesh>)}
      <mesh position={[0, 0, 0]}><torusGeometry args={[1.48, 0.032, 6, 36]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.5} /></mesh>
    </group>
  );
}

function PhoenixMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.0, 1.05, 0.95]}><sphereGeometry args={[0.48, 14, 14]} /><Mat color={s} emissive={p} ei={ei + 0.1} roughness={0.35} /></mesh>
      <mesh position={[0, 0.52, 0.15]} scale={[0.8, 0.9, 0.8]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={s} emissive={p} ei={ei + 0.1} roughness={0.35} /></mesh>
      <mesh position={[0, 0.82, 0.2]} rotation={[0.4, 0, 0]}><coneGeometry args={[0.06, 0.18, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.2} /></mesh>
      {[0.28, -0.28].map((x, i) => <mesh key={i} position={[x, 0.05, 0]} rotation={[0, 0, (i ? -0.7 : 0.7)]}><boxGeometry args={[0.35, 0.06, 0.22]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} transparent opacity={0.8} /></mesh>)}
      {[0.05, -0.12].map((x, i) => <mesh key={i} position={[x, -0.52, 0.1]} rotation={[0.2, (i ? 0.2 : -0.2), 0]}><boxGeometry args={[0.1, 0.06, 0.35]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.8} transparent opacity={0.75} /></mesh>)}
      {[0.1, -0.1].map((z, i) => <mesh key={i} position={[0, 0.62, 0.35]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );

  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.0, 1.1, 0.9]}><sphereGeometry args={[0.58, 16, 16]} /><Mat color={s} emissive={p} ei={ei + 0.1} roughness={0.32} /></mesh>
      <mesh position={[0, 0.62, 0.18]} scale={[0.88, 0.95, 0.85]}><sphereGeometry args={[0.35, 14, 14]} /><Mat color={s} emissive={p} ei={ei + 0.1} roughness={0.32} /></mesh>
      <mesh position={[0, 1.0, 0.22]} rotation={[0.4, 0, 0]}><coneGeometry args={[0.07, 0.22, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.3} /></mesh>
      {[0.42, -0.42].map((x, i) => [0, 0.18].map((dy, j) =>
        <mesh key={`${i}${j}`} position={[x, 0.12 + dy, 0]} rotation={[0, 0, (i > 0 ? -1 : 1) * (0.8 - j * 0.2)]}><boxGeometry args={[0.6 - j * 0.15, 0.055, 0.32]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.85} transparent opacity={0.82} /></mesh>))}
      {[-0.08, 0.08].map((x, i) => [0.2, 0, -0.2].map((z, j) =>
        <mesh key={`${i}${j}`} position={[x, -0.6, 0.12 + z * 0.3]} rotation={[0.25 + j * 0.1, (i ? 0.15 : -0.15), 0]}><boxGeometry args={[0.09, 0.055, 0.42 - j * 0.06]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} transparent opacity={0.8} /></mesh>))}
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0, 0.74, 0.38]}><sphereGeometry args={[0.048, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
    </group>
  );

  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.05, 1.15, 0.92]}><sphereGeometry args={[0.7, 20, 20]} /><Mat color={s} emissive={p} ei={ei + 0.15} roughness={0.3} /></mesh>
      <mesh position={[0, 0.75, 0.22]} scale={[0.9, 0.96, 0.88]}><sphereGeometry args={[0.42, 16, 16]} /><Mat color={s} emissive={p} ei={ei + 0.12} roughness={0.3} /></mesh>
      <mesh position={[0, 1.22, 0.28]} rotation={[0.4, 0, 0]}><coneGeometry args={[0.08, 0.26, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.35} /></mesh>
      {[0.55, -0.55].map((x, i) => [0, 0.22, 0.4].map((dy, j) =>
        <mesh key={`${i}${j}`} position={[x, 0.16 + dy, 0]} rotation={[0, 0, (i > 0 ? -1 : 1) * (0.95 - j * 0.25)]}><boxGeometry args={[0.85 - j * 0.2, 0.05, 0.45]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} transparent opacity={0.85} /></mesh>))}
      {[-0.1, 0.1].map((x, i) => [0.28, 0.1, -0.1, -0.28].map((z, j) =>
        <mesh key={`${i}${j}`} position={[x, -0.75, 0.15 + z * 0.38]} rotation={[0.3 + j * 0.08, (i ? 0.18 : -0.18), 0]}><boxGeometry args={[0.1, 0.05, 0.52 - j * 0.06]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.0} transparent opacity={0.82} /></mesh>))}
      {[0.15, -0.15].map((z, i) => <mesh key={i} position={[0, 0.88, 0.45]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );

  return (
    <group ref={ref}>
      <mesh scale={[1.1, 1.2, 0.95]}><sphereGeometry args={[0.82, 24, 24]} /><Mat color={s} emissive={p} ei={ei + 0.18} roughness={0.28} /></mesh>
      <mesh position={[0, 0.9, 0.25]} scale={[0.92, 0.98, 0.9]}><sphereGeometry args={[0.5, 20, 20]} /><Mat color={s} emissive={p} ei={ei + 0.15} roughness={0.28} /></mesh>
      <mesh position={[0, 1.46, 0.32]} rotation={[0.4, 0, 0]}><coneGeometry args={[0.1, 0.32, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.4} /></mesh>
      {[0.68, -0.68].map((x, i) => [0, 0.24, 0.46, 0.64].map((dy, j) =>
        <mesh key={`${i}${j}`} position={[x, 0.2 + dy, 0]} rotation={[0, 0, (i > 0 ? -1 : 1) * (1.05 - j * 0.22)]}><boxGeometry args={[1.05 - j * 0.22, 0.048, 0.55]} /><meshStandardMaterial color={j === 0 ? glow : s} emissive={glow} emissiveIntensity={0.95 + j * 0.15} transparent opacity={0.88} /></mesh>))}
      {[-0.12, 0.12].map((x, i) => [0.38, 0.18, 0, -0.18, -0.38].map((z, j) =>
        <mesh key={`${i}${j}`} position={[x, -0.9, 0.18 + z * 0.42]} rotation={[0.35 + j * 0.07, (i ? 0.2 : -0.2), 0]}><boxGeometry args={[0.11, 0.048, 0.62 - j * 0.05]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.1} transparent opacity={0.85} /></mesh>))}
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0, 1.04, 0.52]}><sphereGeometry args={[0.078, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.2} /></mesh>)}
      <mesh position={[0, 0.2, 0]}><torusGeometry args={[1.52, 0.035, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.52} /></mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) =>
        <mesh key={i} position={[Math.cos(a) * 1.52, 0.2, Math.sin(a) * 1.52]}><coneGeometry args={[0.065, 0.38, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
}

// ─── CRAB ────────────────────────────────────────────────────────────────────
function CrabMesh({ stage, info, status }: { stage: "baby"|"teen"|"adult"|"final"; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = info.primary; const s = info.secondary;
  const glow = statusGlow(status);
  const ei = status === "dead" ? 0 : 0.5;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 0.55, 0.85]}><sphereGeometry args={[0.42, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
      {[-0.46, 0.46].map((x, i) => <mesh key={i} position={[x, 0, 0.15]} rotation={[0, 0, i === 0 ? 0.6 : -0.6]}><sphereGeometry args={[0.15, 10, 10]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.2} roughness={0.4} metalness={0.3} /></mesh>)}
      {[-1, 1].map((side, i) => [0, 1].map((j) => <mesh key={`${i}${j}`} position={[side * (0.5 + j * 0.22), -0.18, -0.1 + j * 0.2]} rotation={[0, 0, side * 0.8]}><capsuleGeometry args={[0.04, 0.28, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>))}
      {[-0.1, 0.1].map((x, i) => <mesh key={i} position={[x, 0.2, 0.36]}><sphereGeometry args={[0.058, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.1, 0.58, 0.92]}><sphereGeometry args={[0.58, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
      {[-0.72, 0.72].map((x, i) => <mesh key={i} position={[x, 0.05, 0.2]} rotation={[0, 0, i === 0 ? 0.5 : -0.5]}><sphereGeometry args={[0.22, 12, 12]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.25} roughness={0.4} metalness={0.3} /></mesh>)}
      {[-1, 1].map((side, i) => [0, 1, 2].map((j) => <mesh key={`${i}${j}`} position={[side * (0.68 + j * 0.24), -0.22, -0.15 + j * 0.2]} rotation={[0.1, 0, side * 0.75]}><capsuleGeometry args={[0.048, 0.36, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>))}
      {[-0.14, 0.14].map((x, i) => <mesh key={i} position={[x, 0.32, 0.5]}><capsuleGeometry args={[0.04, 0.18, 4, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>)}
      {[-0.14, 0.14].map((x, i) => <mesh key={i} position={[x, 0.5, 0.5]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.18, 0.6, 1]}><sphereGeometry args={[0.74, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
      {[-1.05, 1.05].map((x, i) => (
        <group key={i} position={[x, 0.1, 0.3]}>
          <mesh scale={[1, 0.6, 0.7]}><sphereGeometry args={[0.32, 12, 12]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.3} roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[i === 0 ? -0.22 : 0.22, 0, 0.1]} rotation={[0, 0, i === 0 ? 0.9 : -0.9]}><coneGeometry args={[0.08, 0.38, 5]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[i === 0 ? -0.3 : 0.3, -0.08, 0.06]} rotation={[0, 0, i === 0 ? 1.2 : -1.2]}><coneGeometry args={[0.06, 0.28, 5]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
        </group>
      ))}
      {[-1, 1].map((side, i) => [0, 1, 2, 3].map((j) => <mesh key={`${i}${j}`} position={[side * (0.82 + j * 0.28), -0.28, -0.2 + j * 0.22]} rotation={[0.15, 0, side * 0.7]}><capsuleGeometry args={[0.052, 0.44, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>))}
      {[-0.18, 0.18].map((x, i) => <mesh key={i} position={[x, 0.42, 0.64]}><capsuleGeometry args={[0.045, 0.22, 4, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>)}
      {[-0.18, 0.18].map((x, i) => <mesh key={i} position={[x, 0.68, 0.65]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  // final
  return (
    <group ref={ref}>
      <mesh scale={[1.25, 0.65, 1.1]}><sphereGeometry args={[0.92, 20, 20]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
      {[0, Math.PI * 0.35, Math.PI * 0.65, Math.PI].map((a, i) => <mesh key={i} position={[Math.cos(a) * 0.9, 0.78, Math.sin(a) * 0.62]}><coneGeometry args={[0.065, 0.32, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.8} roughness={0.4} metalness={0.3} /></mesh>)}
      {[-1.3, 1.3].map((x, i) => (
        <group key={i} position={[x, 0.12, 0.38]}>
          <mesh scale={[1, 0.6, 0.75]}><sphereGeometry args={[0.42, 14, 14]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.35} roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[i === 0 ? -0.3 : 0.3, 0, 0.12]} rotation={[0, 0, i === 0 ? 0.8 : -0.8]}><coneGeometry args={[0.11, 0.52, 5]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.4} roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[i === 0 ? -0.42 : 0.42, -0.1, 0.08]} rotation={[0, 0, i === 0 ? 1.1 : -1.1]}><coneGeometry args={[0.08, 0.38, 5]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>
        </group>
      ))}
      {[-1, 1].map((side, i) => [0, 1, 2, 3].map((j) => <mesh key={`${i}${j}`} position={[side * (1.02 + j * 0.32), -0.32, -0.22 + j * 0.24]} rotation={[0.15, 0, side * 0.65]}><capsuleGeometry args={[0.062, 0.54, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>))}
      {[-0.22, 0.22].map((x, i) => <mesh key={i} position={[x, 0.52, 0.82]}><capsuleGeometry args={[0.05, 0.26, 4, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.4} metalness={0.3} /></mesh>)}
      {[-0.22, 0.22].map((x, i) => <mesh key={i} position={[x, 0.82, 0.83]}><sphereGeometry args={[0.11, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[0, 0, 0]}><torusGeometry args={[1.48, 0.032, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
    </group>
  );
}

// ─── SERPENT ─────────────────────────────────────────────────────────────────
function SerpentMesh({ stage, info, status }: { stage: "baby"|"teen"|"adult"|"final"; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = info.primary; const s = info.secondary;
  const glow = statusGlow(status);
  const ei = status === "dead" ? 0 : 0.5;

  if (stage === "baby") return (
    <group ref={ref}>
      {[0, 1, 2].map(i => <mesh key={i} position={[Math.sin(i * 1.1) * 0.28, -0.35 + i * 0.3, 0]} scale={[1, 0.88, 1]}><sphereGeometry args={[0.22 - i * 0.04, 10, 10]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>)}
      <mesh position={[0.14, 0.6, 0]}><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>
      {[-0.07, 0.07].map((x, i) => <mesh key={i} position={[x, 0.62, 0.18]}><sphereGeometry args={[0.052, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.sin(i * 1.05) * 0.38, -0.55 + i * 0.36, 0]} scale={[1, 0.85, 1]}><sphereGeometry args={[0.28 - i * 0.04, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>)}
      <mesh position={[0.22, 0.88, 0]}><sphereGeometry args={[0.26, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>
      <mesh position={[0.22, 0.96, 0.08]} scale={[1.8, 0.35, 0.5]}><sphereGeometry args={[0.25, 10, 10]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.15} roughness={0.35} metalness={0.15} /></mesh>
      {[-0.09, 0.09].map((x, i) => <mesh key={i} position={[x + 0.22, 0.9, 0.24]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.sin(i * 0.95) * 0.5, -0.75 + i * 0.38, 0]} scale={[1, 0.82, 1]}><sphereGeometry args={[0.34 - i * 0.04, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>)}
      <mesh position={[0.32, 1.2, 0]}><sphereGeometry args={[0.33, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>
      <mesh position={[0.32, 1.3, 0.1]} scale={[2.2, 0.38, 0.55]}><sphereGeometry args={[0.32, 12, 12]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.2} roughness={0.35} metalness={0.15} /></mesh>
      {[-0.11, 0.11].map((x, i) => <mesh key={i} position={[x + 0.32, 1.22, 0.3]}><sphereGeometry args={[0.082, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      {[-0.05, 0.05].map((x, i) => <mesh key={i} position={[x + 0.32, 1.08, 0.32]} rotation={[0.3, 0, 0]}><coneGeometry args={[0.028, 0.12, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.4} roughness={0.35} metalness={0.15} /></mesh>)}
    </group>
  );
  // final
  return (
    <group ref={ref}>
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.sin(i * 0.88) * 0.65, -0.95 + i * 0.42, 0]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.42 - i * 0.04, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>)}
      <mesh position={[0.4, 1.55, 0]}><sphereGeometry args={[0.42, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.35} metalness={0.15} /></mesh>
      <mesh position={[0.4, 1.68, 0.12]} scale={[2.5, 0.42, 0.6]}><sphereGeometry args={[0.4, 12, 12]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.28} roughness={0.35} metalness={0.15} /></mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[0.4 + Math.sin(i * 2.1) * 0.24, 1.98 + i * 0.18, 0]} rotation={[0, 0, Math.sin(i) * 0.5]}><coneGeometry args={[0.075, 0.28, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.6} roughness={0.35} metalness={0.15} /></mesh>)}
      <mesh position={[0.4, 1.6, 0.38]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={3.5} /></mesh>
      {[-0.13, 0.13].map((x, i) => <mesh key={i} position={[x + 0.4, 1.52, 0.38]}><sphereGeometry args={[0.095, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.2} /></mesh>)}
      <mesh position={[0, -0.1, 0]}><torusGeometry args={[1.42, 0.03, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.5} /></mesh>
    </group>
  );
}

// ─── SHARK ───────────────────────────────────────────────────────────────────
function SharkMesh({ stage, info, status }: { stage: "baby"|"teen"|"adult"|"final"; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = info.primary; const s = info.secondary;
  const glow = statusGlow(status);
  const ei = status === "dead" ? 0 : 0.5;

  if (stage === "baby") return (
    <group ref={ref} rotation={[0, Math.PI * 0.5, 0]}>
      <mesh scale={[1.8, 0.65, 0.7]}><sphereGeometry args={[0.36, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0.52, 0, 0]} scale={[0.5, 0.42, 0.55]}><sphereGeometry args={[0.36, 10, 10]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0, 0.34, 0]}><coneGeometry args={[0.09, 0.3, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      {[-0.08, 0.08].map((z, i) => <mesh key={i} position={[0.38, 0, 0]}><sphereGeometry args={[0.052, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref} rotation={[0, Math.PI * 0.5, 0]}>
      <mesh scale={[2.0, 0.72, 0.78]}><sphereGeometry args={[0.46, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0.7, 0, 0]} scale={[0.55, 0.45, 0.6]}><sphereGeometry args={[0.46, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0, 0.48, 0]}><coneGeometry args={[0.12, 0.42, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      {[-0.25, 0.25].map((z, i) => <mesh key={i} position={[0.12, -0.18, z]} rotation={[0, 0, i === 0 ? -0.7 : 0.7]}><coneGeometry args={[0.09, 0.38, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>)}
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.55, 0.05, z]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref} rotation={[0, Math.PI * 0.5, 0]}>
      <mesh scale={[2.2, 0.78, 0.85]}><sphereGeometry args={[0.58, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0.9, 0, 0]} scale={[0.6, 0.48, 0.65]}><sphereGeometry args={[0.58, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0, 0.62, 0]}><coneGeometry args={[0.14, 0.56, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      {[-0.32, 0.32].map((z, i) => <mesh key={i} position={[0.15, -0.22, z]} rotation={[0, 0, i === 0 ? -0.6 : 0.6]}><coneGeometry args={[0.11, 0.5, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>)}
      <mesh position={[0.78, 0.22, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.07, 0.28, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[0.48 - i * 0.08, -0.28, 0]}><boxGeometry args={[0.05, 0.06, 0.9 - i * 0.14]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.2} roughness={0.45} metalness={0.2} /></mesh>)}
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.72, 0.06, z]}><sphereGeometry args={[0.082, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  // final
  return (
    <group ref={ref} rotation={[0, Math.PI * 0.5, 0]}>
      <mesh scale={[2.4, 0.88, 0.95]}><sphereGeometry args={[0.72, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[1.12, 0, 0]} scale={[0.65, 0.52, 0.7]}><sphereGeometry args={[0.72, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0, 0.78, 0]}><coneGeometry args={[0.17, 0.72, 4]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.15} roughness={0.45} metalness={0.2} /></mesh>
      <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.1, 0.42, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>
      {[-0.42, 0.42].map((z, i) => <mesh key={i} position={[0.18, -0.28, z]} rotation={[0, 0, i === 0 ? -0.55 : 0.55]}><coneGeometry args={[0.14, 0.64, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.45} metalness={0.2} /></mesh>)}
      <mesh position={[0.98, 0.28, 0]} rotation={[0, 0, -0.45]}><coneGeometry args={[0.09, 0.36, 4]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.2} roughness={0.45} metalness={0.2} /></mesh>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0.6 - i * 0.09, -0.35, 0]}><boxGeometry args={[0.055, 0.07, 1.1 - i * 0.16]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.3} roughness={0.45} metalness={0.2} /></mesh>)}
      {[-0.15, 0.15].map((z, i) => <mesh key={i} position={[0.88, 0.06, z]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.38, 0.032, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.45} /></mesh>
    </group>
  );
}

// ─── BEAR ────────────────────────────────────────────────────────────────────
function BearMesh({ stage, info, status }: { stage: "baby"|"teen"|"adult"|"final"; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = info.primary; const s = info.secondary;
  const glow = statusGlow(status);
  const ei = status === "dead" ? 0 : 0.5;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 0.98, 0.95]}><sphereGeometry args={[0.44, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      <mesh position={[0, 0.52, 0.14]} scale={[0.9, 0.85, 0.85]}><sphereGeometry args={[0.32, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.2, 0.2].map((x, i) => <mesh key={i} position={[x, 0.75, 0.1]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      <mesh position={[0, 0.49, 0.3]} scale={[1, 0.65, 0.7]}><sphereGeometry args={[0.14, 10, 10]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.1} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.07, 0.07].map((x, i) => <mesh key={i} position={[x, 0.54, 0.42]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.05, 1, 0.98]}><sphereGeometry args={[0.58, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      <mesh position={[0, 0.7, 0.16]} scale={[0.92, 0.88, 0.88]}><sphereGeometry args={[0.42, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.26, 0.26].map((x, i) => <mesh key={i} position={[x, 1.0, 0.12]}><sphereGeometry args={[0.13, 10, 10]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      <mesh position={[0, 0.66, 0.38]} scale={[1, 0.62, 0.7]}><sphereGeometry args={[0.18, 10, 10]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.52, 0.52].map((x, i) => <mesh key={i} position={[x, 0, 0.28]} rotation={[0.2, 0, i === 0 ? 0.5 : -0.5]}><capsuleGeometry args={[0.1, 0.45, 4, 8]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      {[-0.09, 0.09].map((x, i) => <mesh key={i} position={[x, 0.72, 0.52]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.08, 1.05, 1]}><sphereGeometry args={[0.72, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      <mesh position={[0, 0.9, 0.2]} scale={[0.94, 0.9, 0.9]}><sphereGeometry args={[0.52, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.32, 0.32].map((x, i) => <mesh key={i} position={[x, 1.3, 0.14]}><sphereGeometry args={[0.17, 12, 12]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      <mesh position={[0, 0.86, 0.46]} scale={[1, 0.6, 0.68]}><sphereGeometry args={[0.22, 12, 12]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.68, 0.68].map((x, i) => <mesh key={i} position={[x, 0, 0.35]} rotation={[0.25, 0, i === 0 ? 0.4 : -0.4]}><capsuleGeometry args={[0.13, 0.62, 4, 8]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      {[-0.68, 0.68].map((x, i) => [0, 1, 2].map(j => <mesh key={`${i}${j}`} position={[x + (i === 0 ? -0.12 : 0.12) + (j - 1) * 0.06, -0.62, 0.42]} rotation={[-0.4, 0, 0]}><coneGeometry args={[0.038, 0.18, 4]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.2} roughness={0.75} metalness={0.05} /></mesh>))}
      {[-0.11, 0.11].map((x, i) => <mesh key={i} position={[x, 0.92, 0.68]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  // final
  return (
    <group ref={ref}>
      <mesh scale={[1.12, 1.1, 1.05]}><sphereGeometry args={[0.88, 20, 20]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      <mesh position={[0, 1.1, 0.25]} scale={[0.96, 0.92, 0.92]}><sphereGeometry args={[0.64, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.38, 0.38].map((x, i) => <mesh key={i} position={[x, 1.62, 0.16]}><sphereGeometry args={[0.21, 12, 12]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      <mesh position={[0, 1.05, 0.58]} scale={[1, 0.58, 0.65]}><sphereGeometry args={[0.28, 12, 12]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>
      {[-0.84, 0.84].map((x, i) => <mesh key={i} position={[x, 0, 0.42]} rotation={[0.28, 0, i === 0 ? 0.35 : -0.35]}><capsuleGeometry args={[0.16, 0.78, 4, 8]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.75} metalness={0.05} /></mesh>)}
      {[-0.84, 0.84].map((x, i) => [0, 1, 2].map(j => <mesh key={`${i}${j}`} position={[x + (i === 0 ? -0.15 : 0.15) + (j - 1) * 0.08, -0.82, 0.52]} rotation={[-0.4, 0, 0]}><coneGeometry args={[0.05, 0.24, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.35} roughness={0.75} metalness={0.05} /></mesh>))}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => <mesh key={i} position={[Math.cos(a) * 1.05, 0.4, Math.sin(a) * 0.78]}><boxGeometry args={[0.12, 0.06, 0.06]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.5} roughness={0.75} metalness={0.05} /></mesh>)}
      {[-0.13, 0.13].map((x, i) => <mesh key={i} position={[x, 1.12, 0.82]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[0, 0.4, 0]}><torusGeometry args={[1.52, 0.034, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
    </group>
  );
}

// ─── SCORPION ────────────────────────────────────────────────────────────────
function ScorpionMesh({ stage, info, status }: { stage: "baby"|"teen"|"adult"|"final"; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = info.primary; const s = info.secondary;
  const glow = statusGlow(status);
  const ei = status === "dead" ? 0 : 0.5;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.1, 0.7, 0.9]}><sphereGeometry args={[0.35, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      <mesh position={[0, 0.38, 0.12]} scale={[0.85, 0.8, 0.85]}><sphereGeometry args={[0.22, 10, 10]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      {[0, 1].map(i => <mesh key={i} position={[0, 0.22 + i * 0.2, -0.22 - i * 0.18]} rotation={[-0.4 - i * 0.3, 0, 0]}><sphereGeometry args={[0.12 - i * 0.03, 8, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>)}
      <mesh position={[0, 0.72, -0.38]} rotation={[-0.8, 0, 0]}><coneGeometry args={[0.042, 0.18, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.5} roughness={0.5} metalness={0.35} /></mesh>
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.15, 0.72, 0.92]}><sphereGeometry args={[0.46, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      <mesh position={[0, 0.5, 0.14]} scale={[0.88, 0.82, 0.88]}><sphereGeometry args={[0.3, 12, 12]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      {[-0.52, 0.52].map((x, i) => <mesh key={i} position={[x, 0.1, 0.22]} rotation={[0, 0, i === 0 ? 0.6 : -0.6]}><sphereGeometry args={[0.15, 10, 10]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.18} roughness={0.5} metalness={0.35} /></mesh>)}
      {[-1, 1].map((side, i) => [0, 1].map(j => <mesh key={`${i}${j}`} position={[side * (0.55 + j * 0.25), -0.08, 0.1 - j * 0.18]} rotation={[0.1, 0, side * 0.7]}><capsuleGeometry args={[0.04, 0.3, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>))}
      {[0, 1, 2].map(i => <mesh key={i} position={[0, 0.38 + i * 0.24, -0.28 - i * 0.22]} rotation={[-0.5 - i * 0.28, 0, 0]}><sphereGeometry args={[0.14 - i * 0.03, 8, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>)}
      <mesh position={[0, 1.1, -0.58]} rotation={[-1.1, 0, 0]}><coneGeometry args={[0.055, 0.24, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.6} roughness={0.5} metalness={0.35} /></mesh>
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.2, 0.74, 0.95]}><sphereGeometry args={[0.58, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      <mesh position={[0, 0.64, 0.16]} scale={[0.9, 0.84, 0.9]}><sphereGeometry args={[0.38, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      {[-0.72, 0.72].map((x, i) => (
        <group key={i} position={[x, 0.12, 0.3]}>
          <mesh scale={[0.9, 0.55, 0.7]}><sphereGeometry args={[0.22, 10, 10]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.22} roughness={0.5} metalness={0.35} /></mesh>
          <mesh position={[i === 0 ? -0.2 : 0.2, 0, 0.08]} rotation={[0, 0, i === 0 ? 0.8 : -0.8]}><coneGeometry args={[0.055, 0.28, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
        </group>
      ))}
      {[-1, 1].map((side, i) => [0, 1, 2, 3].map(j => <mesh key={`${i}${j}`} position={[side * (0.66 + j * 0.3), -0.12, 0.12 - j * 0.2]} rotation={[0.15, 0, side * 0.65]}><capsuleGeometry args={[0.048, 0.42, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>))}
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[0, 0.48 + i * 0.28, -0.36 - i * 0.26]} rotation={[-0.55 - i * 0.25, 0, 0]}><sphereGeometry args={[0.16 - i * 0.025, 10, 10]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>)}
      <mesh position={[0, 1.6, -0.78]} rotation={[-1.4, 0, 0]}><coneGeometry args={[0.068, 0.32, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.7} roughness={0.5} metalness={0.35} /></mesh>
      {[-0.1, 0.1].map((x, i) => <mesh key={i} position={[x, 0.66, 0.52]}><sphereGeometry args={[0.072, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  // final
  return (
    <group ref={ref}>
      <mesh scale={[1.28, 0.78, 1]}><sphereGeometry args={[0.72, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      <mesh position={[0, 0.8, 0.2]} scale={[0.92, 0.86, 0.92]}><sphereGeometry args={[0.48, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
      {[-0.95, 0.95].map((x, i) => (
        <group key={i} position={[x, 0.16, 0.38]}>
          <mesh scale={[0.92, 0.58, 0.72]}><sphereGeometry args={[0.3, 12, 12]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.28} roughness={0.5} metalness={0.35} /></mesh>
          <mesh position={[i === 0 ? -0.26 : 0.26, 0, 0.1]} rotation={[0, 0, i === 0 ? 0.75 : -0.75]}><coneGeometry args={[0.075, 0.38, 4]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.3} roughness={0.5} metalness={0.35} /></mesh>
          <mesh position={[i === 0 ? -0.38 : 0.38, -0.1, 0.06]} rotation={[0, 0, i === 0 ? 1.0 : -1.0]}><coneGeometry args={[0.055, 0.28, 4]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>
        </group>
      ))}
      {[-1, 1].map((side, i) => [0, 1, 2, 3].map(j => <mesh key={`${i}${j}`} position={[side * (0.82 + j * 0.34), -0.16, 0.14 - j * 0.24]} rotation={[0.18, 0, side * 0.6]}><capsuleGeometry args={[0.056, 0.52, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>))}
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0, 0.6 + i * 0.32, -0.44 - i * 0.3]} rotation={[-0.6 - i * 0.22, 0, 0]}><sphereGeometry args={[0.18 - i * 0.022, 10, 10]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.5} metalness={0.35} /></mesh>)}
      <mesh position={[0, 2.1, -1.0]} rotation={[-1.6, 0, 0]}><coneGeometry args={[0.09, 0.44, 4]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={ei + 0.85} roughness={0.5} metalness={0.35} /></mesh>
      <mesh position={[0, 2.1, -1.0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={4} /></mesh>
      {[-0.12, 0.12].map((x, i) => <mesh key={i} position={[x, 0.82, 0.66]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[0, 0.4, 0]}><torusGeometry args={[1.5, 0.034, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
    </group>
  );
}

// ─── OCTOPUS ─────────────────────────────────────────────────────────────────
function OctopusMesh({ stage, info, status }: { stage: "baby"|"teen"|"adult"|"final"; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = info.primary; const s = info.secondary;
  const glow = statusGlow(status);
  const ei = status === "dead" ? 0 : 0.5;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 1.1, 1]}><sphereGeometry args={[0.38, 14, 14]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <mesh key={i} position={[Math.cos(a) * 0.32, -0.42, Math.sin(a) * 0.32]} scale={[0.5, 1, 0.5]}><capsuleGeometry args={[0.06, 0.36, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>;
      })}
      {[-0.1, 0.1].map((x, i) => <mesh key={i} position={[x, 0.18, 0.32]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1, 1.12, 1]}><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const a = (i / 6) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.42, -0.55, Math.sin(a) * 0.42]} scale={[0.5, 1, 0.5]} rotation={[0.2, 0, 0]}><capsuleGeometry args={[0.068, 0.48, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>;
      })}
      {[0, 1, 2, 3, 4, 5].map(i => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.28, 0.22, Math.sin(a) * 0.28]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} /></mesh>; })}
      {[-0.13, 0.13].map((x, i) => <mesh key={i} position={[x, 0.24, 0.44]}><sphereGeometry args={[0.088, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1, 1.15, 1]}><sphereGeometry args={[0.62, 18, 18]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
        const a = (i / 8) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.54, -0.7, Math.sin(a) * 0.54]} scale={[0.5, 1, 0.5]} rotation={[0.25, 0, 0]}><capsuleGeometry args={[0.075, 0.62, 4, 6]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>;
      })}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = (i / 8) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.38, 0.32, Math.sin(a) * 0.38]}><sphereGeometry args={[0.045, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>; })}
      {[-0.16, 0.16].map((x, i) => <mesh key={i} position={[x, 0.3, 0.56]}><sphereGeometry args={[0.11, 12, 12]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      <mesh position={[0, 0.72, 0]} scale={[1, 0.35, 1]}><sphereGeometry args={[0.52, 14, 14]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.1} roughness={0.55} metalness={0.05} /></mesh>
    </group>
  );
  // final - Kraken
  return (
    <group ref={ref}>
      <mesh scale={[1, 1.18, 1]}><sphereGeometry args={[0.78, 20, 20]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.68, -0.9, Math.sin(a) * 0.68]} rotation={[0.3, 0, 0]}>
            <mesh scale={[0.52, 1, 0.52]}><capsuleGeometry args={[0.09, 0.85, 4, 8]} /><meshStandardMaterial color={p} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>
            <mesh position={[0, -0.58, 0]} scale={[0.48, 1, 0.48]}><capsuleGeometry args={[0.065, 0.42, 4, 6]} /><meshStandardMaterial color={s} emissive={p} emissiveIntensity={ei} roughness={0.55} metalness={0.05} /></mesh>
          </group>
        );
      })}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = (i / 8) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.48, 0.44, Math.sin(a) * 0.48]}><sphereGeometry args={[0.058, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>; })}
      {[-0.2, 0.2].map((x, i) => <mesh key={i} position={[x, 0.38, 0.7]}><sphereGeometry args={[0.138, 12, 12]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[0, 0.92, 0]} scale={[1, 0.32, 1]}><sphereGeometry args={[0.66, 16, 16]} /><meshStandardMaterial color={p} emissive={glow} emissiveIntensity={ei + 0.2} roughness={0.55} metalness={0.05} /></mesh>
      <mesh position={[0, 0.5, 0]}><torusGeometry args={[1.46, 0.034, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
    </group>
  );
}

// ─── CYCLOPS ──────────────────────────────────────────────────────────────────
function CyclopsMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 0.88, 1]}><sphereGeometry args={[0.48, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.62, 0.08]}><sphereGeometry args={[0.36, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.68, 0.38]}><sphereGeometry args={[0.13, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>
      {[-0.1, 0.1].map((x, i) => <mesh key={i} position={[x, 0.98, 0.06]} rotation={[0, 0, i === 0 ? -0.15 : 0.15]}><coneGeometry args={[0.04, 0.14, 5]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.05, 0.9, 1]}><sphereGeometry args={[0.6, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.78, 0.1]}><sphereGeometry args={[0.44, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.86, 0.44]} scale={[1.5, 0.35, 0.5]}><sphereGeometry args={[0.18, 10, 10]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.82, 0.54]}><sphereGeometry args={[0.16, 12, 12]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>
      {[-0.14, 0.14].map((x, i) => <mesh key={i} position={[x, 1.22, 0.08]} rotation={[0.15, 0, i === 0 ? -0.2 : 0.2]}><coneGeometry args={[0.06, 0.28, 5]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 0.72, 0.1, 0]} rotation={[0, 0, side * 0.5]}><capsuleGeometry args={[0.1, 0.5, 4, 8]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.1, 0.88, 1.05]}><sphereGeometry args={[0.74, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.98, 0.12]}><sphereGeometry args={[0.54, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 1.08, 0.54]} scale={[1.7, 0.42, 0.6]}><sphereGeometry args={[0.22, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 1.02, 0.66]}><sphereGeometry args={[0.2, 14, 14]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>
      {[-0.18, 0.18].map((x, i) => <mesh key={i} position={[x, 1.54, 0.1]} rotation={[0.2, 0, i === 0 ? -0.25 : 0.25]}><coneGeometry args={[0.08, 0.4, 5]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 0.9, 0.2, 0]} rotation={[0, 0, side * 0.45]}><capsuleGeometry args={[0.12, 0.65, 4, 8]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[1.22, -0.3, 0]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.08, 0.16, 0.85, 7]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.22, 0.92, 1.12]}><sphereGeometry args={[0.92, 20, 20]} /><Mat color={s} emissive={glow} ei={ei + 0.05} /></mesh>
      <mesh position={[0, 1.2, 0.14]}><sphereGeometry args={[0.7, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 1.34, 0.68]} scale={[1.9, 0.44, 0.68]}><sphereGeometry args={[0.28, 14, 14]} /><Mat color={p} emissive={glow} ei={ei + 0.1} /></mesh>
      <mesh position={[0, 1.26, 0.86]}><sphereGeometry args={[0.27, 16, 16]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={4} /></mesh>
      <mesh position={[0, 1.26, 1.12]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#000020" emissiveIntensity={0} /></mesh>
      {[-0.26, 0.26].map((x, i) => <mesh key={i} position={[x, 1.92, 0.12]} rotation={[0.25, 0, i === 0 ? -0.3 : 0.3]}><coneGeometry args={[0.1, 0.54, 5]} /><Mat color={p} emissive={glow} ei={ei + 0.1} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 1.12, 0.24, 0]} rotation={[0, 0, side * 0.4]}><capsuleGeometry args={[0.15, 0.84, 4, 8]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[1.56, -0.4, 0]} rotation={[0, 0, -0.55]}><cylinderGeometry args={[0.1, 0.24, 1.15, 7]} /><Mat color={p} emissive={glow} ei={ei + 0.1} /></mesh>
      {[0, 1, 2, 3, 4, 5].map(i => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 1.78, 0.1, Math.sin(a) * 1.78]}><sphereGeometry args={[0.1, 8, 8]} /><Mat color={p} emissive={glow} ei={ei + 0.25} /></mesh>; })}
      <mesh><torusGeometry args={[1.78, 0.028, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── MINOTAUR ─────────────────────────────────────────────────────────────────
function MinotaurMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.2, 0.82, 1]}><sphereGeometry args={[0.42, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0.45, 0.3, 0]} scale={[0.9, 0.85, 0.85]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.5, 0.62, z]} rotation={[i === 0 ? -0.5 : 0.5, 0.5, i === 0 ? -0.3 : 0.3]}><coneGeometry args={[0.04, 0.28, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
      <mesh position={[0.7, 0.22, 0]} scale={[0.5, 0.4, 0.6]}><sphereGeometry args={[0.12, 8, 8]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.6, 0.38, z]}><sphereGeometry args={[0.042, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1, 0.85, 0.95]}><sphereGeometry args={[0.58, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0, 0.78, 0.1]}><sphereGeometry args={[0.4, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0, 0.72, 0.48]} scale={[0.8, 0.55, 0.6]}><sphereGeometry args={[0.22, 10, 10]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.18, 0.18].map((z, i) => <mesh key={i} position={[0, 1.18, z * 0.8]} rotation={[i === 0 ? -0.5 : 0.5, 0.7, i === 0 ? -0.2 : 0.2]}><coneGeometry args={[0.06, 0.48, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 0.78, 0.15, 0.1]} rotation={[0.2, 0, side * 0.4]}><capsuleGeometry args={[0.11, 0.55, 4, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0, 0.76, z]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.05, 0.88, 1]}><sphereGeometry args={[0.72, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0, 0.96, 0.12]}><sphereGeometry args={[0.5, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0, 0.9, 0.56]} scale={[0.82, 0.55, 0.62]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.22, 0.22].map((z, i) => <mesh key={i} position={[0, 1.46, z * 0.8]} rotation={[i === 0 ? -0.6 : 0.6, 0.9, i === 0 ? -0.3 : 0.3]}><coneGeometry args={[0.08, 0.62, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 0.95, 0.22, 0.12]} rotation={[0.2, 0, side * 0.38]}><capsuleGeometry args={[0.135, 0.7, 4, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
      <mesh position={[1.42, 0.05, 0]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.05, 0.05, 0.95, 6]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[1.58, 0.56, 0]} rotation={[0, 0, -0.5]}><boxGeometry args={[0.12, 0.42, 0.06]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0, 0.95, z]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.12, 0.92, 1.06]}><sphereGeometry args={[0.88, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.8} /></mesh>
      <mesh position={[0, 1.18, 0.15]}><sphereGeometry args={[0.62, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0, 1.12, 0.72]} scale={[0.86, 0.58, 0.65]}><sphereGeometry args={[0.35, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.28, 0.28].map((z, i) => <mesh key={i} position={[0, 1.82, z * 0.8]} rotation={[i === 0 ? -0.65 : 0.65, 1.0, i === 0 ? -0.35 : 0.35]}><coneGeometry args={[0.1, 0.82, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.25} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 1.18, 0.28, 0.14]} rotation={[0.2, 0, side * 0.35]}><capsuleGeometry args={[0.16, 0.88, 4, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
      <mesh position={[1.78, 0.08, 0]} rotation={[0, 0, -0.45]}><cylinderGeometry args={[0.06, 0.06, 1.28, 6]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[1.95, 0.76, 0]} rotation={[0, 0, -0.45]}><boxGeometry args={[0.15, 0.52, 0.07]} /><Mat color={s} emissive={glow} ei={ei + 0.3} /></mesh>
      {[-0.18, 0.18].map((z, i) => <mesh key={i} position={[0, 1.18, z]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh><torusGeometry args={[1.72, 0.03, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── MEDUSA ───────────────────────────────────────────────────────────────────
function MedusaMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 1.1, 1]}><sphereGeometry args={[0.4, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>
      {[0, 1, 2, 3].map(i => { const a = (i / 4) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.32, 0.52, Math.sin(a) * 0.32]}><sphereGeometry args={[0.07, 7, 7]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>; })}
      {[-0.1, 0.1].map((x, i) => <mesh key={i} position={[x, 0.2, 0.36]}><sphereGeometry args={[0.048, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1, 0.9, 0.95]}><sphereGeometry args={[0.5, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>
      <mesh position={[0, 0.62, 0.06]}><sphereGeometry args={[0.36, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const a = (i / 6) * Math.PI * 2;
        return <group key={i} position={[Math.cos(a) * 0.3, 0.85, Math.sin(a) * 0.3]}>
          <mesh scale={[0.5, 1, 0.5]}><capsuleGeometry args={[0.05, 0.28, 4, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>
          <mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.065, 7, 7]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
        </group>;
      })}
      {[-0.12, 0.12].map((x, i) => <mesh key={i} position={[x, 0.68, 0.34]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1, 0.88, 0.92]}><sphereGeometry args={[0.62, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.sin(i * 0.9) * 0.45, -0.58 + i * 0.28, 0]} scale={[1, 0.82, 1]}><sphereGeometry args={[0.18 - i * 0.02, 10, 10]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>)}
      <mesh position={[0, 0.78, 0.08]}><sphereGeometry args={[0.44, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
        const a = (i / 8) * Math.PI * 2;
        return <group key={i} position={[Math.cos(a) * 0.38, 1.08, Math.sin(a) * 0.38]}>
          <mesh scale={[0.45, 1, 0.45]}><capsuleGeometry args={[0.055, 0.42, 4, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>
          <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.07, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>
        </group>;
      })}
      {[-0.14, 0.14].map((x, i) => <mesh key={i} position={[x, 0.84, 0.42]}><sphereGeometry args={[0.075, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1, 0.86, 0.9]}><sphereGeometry args={[0.76, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.35} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <mesh key={i} position={[Math.sin(i * 0.78) * 0.58, -0.76 + i * 0.28, 0]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.22 - i * 0.02, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>)}
      <mesh position={[0, 0.96, 0.1]}><sphereGeometry args={[0.56, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.35} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
        const a = (i / 10) * Math.PI * 2;
        return <group key={i} position={[Math.cos(a) * 0.48, 1.38, Math.sin(a) * 0.48]}>
          <mesh scale={[0.42, 1, 0.42]}><capsuleGeometry args={[0.065, 0.56, 4, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.25} /></mesh>
          <mesh position={[0, 0.38, 0]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>
        </group>;
      })}
      {[-0.16, 0.16].map((x, i) => <mesh key={i} position={[x, 1.02, 0.54]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.8} /></mesh>)}
      <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.032, 6, 32]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
      <mesh position={[0, -0.2, 0]}><torusGeometry args={[1.62, 0.028, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── CENTAUR ──────────────────────────────────────────────────────────────────
function CentaurMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.3, 0.72, 1]}><sphereGeometry args={[0.44, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>
      <mesh position={[0.12, 0.48, 0]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.12, 0.82, 0.08]}><sphereGeometry args={[0.2, 10, 10]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.52, 0.3].map((x, i) => <mesh key={i} position={[x, -0.42, 0]} rotation={[0.15, 0, 0]}><cylinderGeometry args={[0.07, 0.05, 0.45, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.12, 0.9, z]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.45, 0.72, 1.05]}><sphereGeometry args={[0.56, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>
      <mesh position={[0.15, 0.58, 0]}><sphereGeometry args={[0.35, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.15, 0.96, 0.1]}><sphereGeometry args={[0.26, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.72, -0.26, 0.18, 0.62].map((x, i) => <mesh key={i} position={[x, -0.52, 0]} rotation={[0.12, 0, 0]}><cylinderGeometry args={[0.08, 0.06, 0.58, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      {[0.35, -0.05].map((x, i) => <mesh key={i} position={[x, 0.72, i === 0 ? 0.3 : -0.3]} rotation={[0.2, 0, i === 0 ? -0.6 : 0.6]}><capsuleGeometry args={[0.06, 0.4, 4, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.15, 1.06, z]}><sphereGeometry args={[0.048, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.55, 0.74, 1.1]}><sphereGeometry args={[0.68, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>
      <mesh position={[0.18, 0.7, 0]}><sphereGeometry args={[0.44, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.18, 1.16, 0.12]}><sphereGeometry args={[0.32, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.88, -0.34, 0.2, 0.72].map((x, i) => <mesh key={i} position={[x, -0.64, 0]} rotation={[0.12, 0, 0]}><cylinderGeometry args={[0.095, 0.07, 0.7, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      {[0.42, -0.08].map((x, i) => <mesh key={i} position={[x, 0.88, i === 0 ? 0.38 : -0.38]} rotation={[0.2, 0, i === 0 ? -0.55 : 0.55]}><capsuleGeometry args={[0.08, 0.55, 4, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[0.62, 1.0, 0.55]} rotation={[0.3, 0, 0.5]}><cylinderGeometry args={[0.02, 0.02, 0.85, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.18, 1.28, z]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.65, 0.78, 1.15]}><sphereGeometry args={[0.82, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.75} /></mesh>
      <mesh position={[0.22, 0.86, 0]}><sphereGeometry args={[0.54, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.22, 1.42, 0.14]}><sphereGeometry args={[0.38, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-1.05, -0.42, 0.22, 0.84].map((x, i) => <mesh key={i} position={[x, -0.8, 0]} rotation={[0.12, 0, 0]}><cylinderGeometry args={[0.11, 0.08, 0.85, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      {[0.52, -0.1].map((x, i) => <mesh key={i} position={[x, 1.08, i === 0 ? 0.5 : -0.5]} rotation={[0.2, 0, i === 0 ? -0.5 : 0.5]}><capsuleGeometry args={[0.1, 0.7, 4, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[0.8, 1.24, 0.68]} rotation={[0.3, 0.15, 0.45]}><cylinderGeometry args={[0.025, 0.025, 1.18, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>
      <mesh position={[0.88, 1.65, 0.84]}><sphereGeometry args={[0.06, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0.22, 1.54, z]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      <mesh><torusGeometry args={[1.65, 0.03, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── SIREN ────────────────────────────────────────────────────────────────────
function SirenMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 1.05, 0.9]}><sphereGeometry args={[0.42, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.3} metalness={0.15} /></mesh>
      <mesh position={[0, 0.48, 0.1]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.42, 0.42].map((x, i) => <mesh key={i} position={[x, 0.05, 0]} rotation={[0, 0, i === 0 ? 0.7 : -0.7]}><boxGeometry args={[0.35, 0.05, 0.22]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={0.8} transparent opacity={0.85} /></mesh>)}
      <mesh position={[0, -0.5, 0]} scale={[0.55, 1, 0.35]}><sphereGeometry args={[0.28, 10, 10]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.3} /></mesh>
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0, 0.58, z]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1, 1.08, 0.92]}><sphereGeometry args={[0.54, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.3} metalness={0.15} /></mesh>
      <mesh position={[0, 0.62, 0.12]}><sphereGeometry args={[0.36, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.62, 0.62].map((x, i) => [0, 0.2].map((dy, j) =>
        <mesh key={`${i}${j}`} position={[x, 0.12 + dy, 0]} rotation={[0, 0, (i > 0 ? -1 : 1) * (0.85 - j * 0.2)]}><boxGeometry args={[0.58 - j * 0.15, 0.05, 0.32]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={0.85} transparent opacity={0.85} /></mesh>))}
      <mesh position={[0, -0.52, 0]} scale={[0.45, 1.2, 0.3]}><sphereGeometry args={[0.38, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.3} /></mesh>
      {[-0.18, 0.18].map((x, i) => <mesh key={i} position={[x, -0.88, 0]} rotation={[0, 0, i === 0 ? -0.3 : 0.3]}><boxGeometry args={[0.22, 0.05, 0.18]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={1} transparent opacity={0.8} /></mesh>)}
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0, 0.72, z]}><sphereGeometry args={[0.055, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.05, 1.1, 0.95]}><sphereGeometry args={[0.66, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.3} metalness={0.15} /></mesh>
      <mesh position={[0, 0.75, 0.15]}><sphereGeometry args={[0.44, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.78, 0.78].map((x, i) => [0, 0.22, 0.42].map((dy, j) =>
        <mesh key={`${i}${j}`} position={[x, 0.18 + dy, 0]} rotation={[0, 0, (i > 0 ? -1 : 1) * (0.95 - j * 0.2)]}><boxGeometry args={[0.78 - j * 0.18, 0.045, 0.42]} /><meshStandardMaterial color={j === 0 ? s : glow} emissive={glow} emissiveIntensity={0.9 + j * 0.1} transparent opacity={0.85} /></mesh>))}
      <mesh position={[0, -0.62, 0]} scale={[0.42, 1.3, 0.28]}><sphereGeometry args={[0.48, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.3} /></mesh>
      {[-0.24, 0.24].map((x, i) => <mesh key={i} position={[x, -1.05, 0]} rotation={[0, 0, i === 0 ? -0.4 : 0.4]}><boxGeometry args={[0.28, 0.045, 0.22]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={1.2} transparent opacity={0.82} /></mesh>)}
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0, 0.88, z]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.1, 1.15, 1]}><sphereGeometry args={[0.8, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.28} metalness={0.18} /></mesh>
      <mesh position={[0, 0.92, 0.18]}><sphereGeometry args={[0.54, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.95, 0.95].map((x, i) => [0, 0.24, 0.46, 0.64].map((dy, j) =>
        <mesh key={`${i}${j}`} position={[x, 0.22 + dy, 0]} rotation={[0, 0, (i > 0 ? -1 : 1) * (1.05 - j * 0.2)]}><boxGeometry args={[1.02 - j * 0.2, 0.04, 0.52]} /><meshStandardMaterial color={j === 0 ? s : glow} emissive={glow} emissiveIntensity={0.95 + j * 0.15} transparent opacity={0.88} /></mesh>))}
      <mesh position={[0, -0.78, 0]} scale={[0.4, 1.4, 0.26]}><sphereGeometry args={[0.6, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.28} /></mesh>
      {[0, 1, 2, 3, 4, 5].map(i => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.48, -1.28, Math.sin(a) * 0.28]}><boxGeometry args={[0.18, 0.04, 0.14]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={1.2} transparent opacity={0.8} /></mesh>; })}
      {[-0.16, 0.16].map((z, i) => <mesh key={i} position={[0, 1.06, z]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[0, -0.2, 0]}><torusGeometry args={[1.68, 0.03, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.45} /></mesh>
    </group>
  );
}

// ─── CHIMERA ──────────────────────────────────────────────────────────────────
function ChimeraMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.15, 0.78, 1]}><sphereGeometry args={[0.44, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[-0.4, 0, 0.4].map((z, i) => <mesh key={i} position={[0.4, 0.28 + Math.abs(z) * 0.1, z]}><sphereGeometry args={[0.16 - Math.abs(z) * 0.03, 10, 10]} /><Mat color={i === 1 ? s : p} emissive={glow} ei={ei + 0.05} /></mesh>)}
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.4, 0.48, z]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.2, 0.8, 1.05]}><sphereGeometry args={[0.56, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.5, 0.32, 0]} scale={[0.95, 0.85, 0.9]}><sphereGeometry args={[0.3, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0.5, 0.72, z]} rotation={[i === 0 ? -0.3 : 0.3, 0.5, 0]}><coneGeometry args={[0.05, 0.28, 4]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
      <mesh position={[0.3, 0.42, 0.46]} scale={[0.8, 0.75, 0.75]}><sphereGeometry args={[0.22, 10, 10]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.8, -0.4, 0].map((x, i) => <mesh key={i} position={[x, -0.55, 0]} rotation={[0.15, 0, 0]}><cylinderGeometry args={[0.07, 0.05, 0.5, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      <mesh position={[-0.62, 0.1, 0]} scale={[0.5, 1, 0.5]} rotation={[0, 0, 0.4]}><capsuleGeometry args={[0.055, 0.5, 4, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.28, 0.82, 1.1]}><sphereGeometry args={[0.68, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.62, 0.4, 0]} scale={[0.95, 0.88, 0.92]}><sphereGeometry args={[0.38, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.22, -0.22].map((z, i) => <mesh key={i} position={[0.64, 0.88, z]} rotation={[i === 0 ? -0.35 : 0.35, 0.6, 0]}><coneGeometry args={[0.06, 0.34, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>)}
      <mesh position={[0.42, 0.5, 0.6]} scale={[0.72, 0.68, 0.68]}><sphereGeometry args={[0.3, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-0.55, 0.38, 0]} scale={[0.55, 0.88, 0.62]}><sphereGeometry args={[0.25, 10, 10]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-0.78, 0.15, 0]} scale={[0.5, 1, 0.5]} rotation={[0, 0, 0.45]}><capsuleGeometry args={[0.055, 0.65, 4, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>
      {[-0.94, -0.48, 0.02, 0.48].map((x, i) => <mesh key={i} position={[x, -0.68, 0]}><cylinderGeometry args={[0.08, 0.06, 0.62, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      {[0.56, -0.04].map((x, i) => <mesh key={i} position={[x, 0.62, i === 0 ? 0.48 : -0.48]} rotation={[0.2, 0, i === 0 ? -0.65 : 0.65]}><boxGeometry args={[0.72, 0.05, 0.42]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} transparent opacity={0.82} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.38, 0.86, 1.15]}><sphereGeometry args={[0.82, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} /></mesh>
      <mesh position={[0.76, 0.5, 0]} scale={[0.96, 0.9, 0.94]}><sphereGeometry args={[0.48, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[0.28, -0.28].map((z, i) => <mesh key={i} position={[0.78, 1.08, z]} rotation={[i === 0 ? -0.4 : 0.4, 0.7, 0]}><coneGeometry args={[0.08, 0.48, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>)}
      <mesh position={[0.54, 0.62, 0.75]} scale={[0.72, 0.68, 0.68]}><sphereGeometry args={[0.38, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.32, 0.55, 0.78]}><coneGeometry args={[0.05, 0.22, 4]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
      <mesh position={[-0.68, 0.48, 0]} scale={[0.55, 0.9, 0.64]}><sphereGeometry args={[0.32, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[-0.95, 0.22, 0]} scale={[0.45, 1, 0.45]} rotation={[0, 0, 0.42]}><capsuleGeometry args={[0.065, 0.82, 4, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>
      {[-1.1, -0.56, 0.04, 0.58].map((x, i) => <mesh key={i} position={[x, -0.82, 0]}><cylinderGeometry args={[0.095, 0.07, 0.75, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.75} /></mesh>)}
      {[0.7, -0.06].map((x, i) => <mesh key={i} position={[x, 0.76, i === 0 ? 0.62 : -0.62]} rotation={[0.22, 0, i === 0 ? -0.6 : 0.6]}><boxGeometry args={[1.0, 0.04, 0.58]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.0} transparent opacity={0.85} /></mesh>)}
      {[0.86, -0.06].map((x, i) => <mesh key={i} position={[x, 0.62, i === 0 ? 0.52 : -0.52]}><coneGeometry args={[0.05, 0.32, 5]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      <mesh><torusGeometry args={[1.72, 0.028, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── SPHINX ───────────────────────────────────────────────────────────────────
function SphinxMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.3, 0.72, 1]}><sphereGeometry args={[0.42, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0.38, 0.32, 0]}><sphereGeometry args={[0.3, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.38, 0.46, z]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
      {[-0.48, 0.3].map((x, i) => <mesh key={i} position={[x, -0.4, 0.18]} rotation={[0.2, 0, 0]}><cylinderGeometry args={[0.09, 0.07, 0.42, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.45, 0.74, 1.05]}><sphereGeometry args={[0.56, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0.48, 0.42, 0]}><sphereGeometry args={[0.38, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.48, 0.42, 0]} scale={[1, 1.1, 1.2]}><sphereGeometry args={[0.42, 8, 6]} /><Mat color={p} emissive={glow} ei={ei * 0.6} roughness={0.9} /></mesh>
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.48, 0.58, z]}><sphereGeometry args={[0.052, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
      {[-0.7, -0.26, 0.18, 0.6].map((x, i) => <mesh key={i} position={[x, -0.52, 0.2]} rotation={[0.18, 0, 0]}><cylinderGeometry args={[0.09, 0.07, 0.55, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.55, 0.76, 1.1]}><sphereGeometry args={[0.7, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>
      <mesh position={[0.6, 0.52, 0]}><sphereGeometry args={[0.46, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.6, 0.52, 0]} scale={[1, 1.15, 1.25]}><sphereGeometry args={[0.5, 8, 6]} /><Mat color={p} emissive={glow} ei={ei * 0.5} roughness={0.88} /></mesh>
      <mesh position={[0.6, 0.92, 0]} scale={[1.4, 0.4, 1.3]}><sphereGeometry args={[0.35, 10, 8]} /><Mat color={s} emissive={glow} ei={ei + 0.1} roughness={0.5} /></mesh>
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0.6, 0.7, z]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
      {[-0.86, -0.34, 0.22, 0.72].map((x, i) => <mesh key={i} position={[x, -0.65, 0.22]} rotation={[0.18, 0, 0]}><cylinderGeometry args={[0.1, 0.08, 0.68, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.65, 0.8, 1.18]}><sphereGeometry args={[0.84, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.8} /></mesh>
      <mesh position={[0.72, 0.64, 0]}><sphereGeometry args={[0.56, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.72, 0.64, 0]} scale={[1, 1.18, 1.28]}><sphereGeometry args={[0.62, 8, 6]} /><Mat color={p} emissive={glow} ei={ei * 0.45} roughness={0.86} /></mesh>
      <mesh position={[0.72, 1.12, 0]} scale={[1.5, 0.45, 1.4]}><sphereGeometry args={[0.44, 12, 8]} /><Mat color={s} emissive={glow} ei={ei + 0.15} roughness={0.45} /></mesh>
      {[-0.16, 0.16].map((z, i) => <mesh key={i} position={[0.72, 0.86, z]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.2} /></mesh>)}
      {[-1.04, -0.42, 0.26, 0.86].map((x, i) => <mesh key={i} position={[x, -0.8, 0.26]} rotation={[0.18, 0, 0]}><cylinderGeometry args={[0.12, 0.09, 0.82, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.8} /></mesh>)}
      <mesh><torusGeometry args={[1.72, 0.03, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.45} /></mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => <mesh key={i} position={[Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72]}><sphereGeometry args={[0.09, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
}

// ─── FENRIR ───────────────────────────────────────────────────────────────────
function FenrirMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.15, 0.88, 1]}><sphereGeometry args={[0.48, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      <mesh position={[0.44, 0.28, 0]}><sphereGeometry args={[0.32, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0.46, 0.64, z]} rotation={[0, 0, i === 0 ? -0.2 : 0.2]}><coneGeometry args={[0.09, 0.24, 4]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.85} /></mesh>)}
      <mesh position={[-0.6, -0.05, 0]} rotation={[0, 0, 0.42]}><cylinderGeometry args={[0.07, 0.1, 0.48, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      <mesh position={[-0.58, -0.06, 0]} scale={[1.2, 1.4, 1.5]}><sphereGeometry args={[0.14, 8, 8]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.9} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0.66, 0.34, z]}><sphereGeometry args={[0.046, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.38, 0.82, 1.04]}><sphereGeometry args={[0.62, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      <mesh position={[0.64, 0.35, 0]}><sphereGeometry args={[0.4, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0.68, 0.82, z]} rotation={[0, 0, i === 0 ? -0.18 : 0.18]}><coneGeometry args={[0.1, 0.3, 4]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.85} /></mesh>)}
      {([[0.38, -0.62, 0.32], [0.38, -0.62, -0.32], [-0.35, -0.62, 0.28], [-0.35, -0.62, -0.28]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.085, 0.065, 0.55, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>)}
      <mesh position={[-0.9, 0.06, 0]} rotation={[0, 0, 0.42]}><cylinderGeometry args={[0.07, 0.05, 0.7, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0.96, 0.42, z]}><sphereGeometry args={[0.058, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.52, 0.84, 1.08]}><sphereGeometry args={[0.78, 20, 20]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      <mesh position={[0.6, 0.28, 0]} rotation={[0, 0, -0.52]}><cylinderGeometry args={[0.18, 0.24, 0.42, 7]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      <mesh position={[0.88, 0.54, 0]}><sphereGeometry args={[0.48, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.18, -0.18].map((z, i) => <mesh key={i} position={[0.92, 1.06, z]} rotation={[0, 0, i === 0 ? -0.16 : 0.16]}><coneGeometry args={[0.12, 0.34, 4]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.85} /></mesh>)}
      {([[0.44, -0.8, 0.42], [0.44, -0.8, -0.42], [-0.44, -0.8, 0.36], [-0.44, -0.8, -0.36]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.1, 0.075, 0.68, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>)}
      <mesh position={[-1.16, 0.08, 0]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.078, 0.05, 0.88, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.22, -0.22].map((z, i) => <mesh key={i} position={[1.24, 0.62, z]}><sphereGeometry args={[0.072, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.62, 0.88, 1.14]}><sphereGeometry args={[0.94, 24, 24]} /><Mat color={s} emissive={glow} ei={ei + 0.05} roughness={0.85} /></mesh>
      <mesh position={[0.72, 0.34, 0]} rotation={[0, 0, -0.54]}><cylinderGeometry args={[0.22, 0.3, 0.52, 7]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      <mesh position={[1.06, 0.68, 0]}><sphereGeometry args={[0.58, 22, 22]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.22, -0.22].map((z, i) => <mesh key={i} position={[1.1, 1.32, z]} rotation={[0, 0, i === 0 ? -0.15 : 0.15]}><coneGeometry args={[0.14, 0.42, 4]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.85} /></mesh>)}
      {([[0.52, -0.98, 0.52], [0.52, -0.98, -0.52], [-0.52, -0.98, 0.46], [-0.52, -0.98, -0.46]] as [number, number, number][]).map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.12, 0.09, 0.82, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>)}
      <mesh position={[-1.42, 0.12, 0]} rotation={[0, 0, 0.38]}><cylinderGeometry args={[0.09, 0.055, 1.08, 5]} /><Mat color={s} emissive={glow} ei={ei} roughness={0.85} /></mesh>
      {[0.28, -0.28].map((z, i) => <mesh key={i} position={[1.5, 0.8, z]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      {[0, 1, 2, 3].map(i => { const a = (i / 4) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 1.78, -0.2, Math.sin(a) * 1.78]}><boxGeometry args={[0.08, 0.12, 0.04]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>; })}
      <mesh position={[0, -0.2, 0]}><torusGeometry args={[1.78, 0.032, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── JÖRMUNGANDR ──────────────────────────────────────────────────────────────
function JormungandrMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      {[0, 1, 2, 3].map(i => { const a = (i / 4) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.38, Math.sin(i * 0.7) * 0.1, Math.sin(a) * 0.38]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.18 - i * 0.02, 10, 10]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>; })}
      <mesh position={[0.38, 0.08, 0]}><sphereGeometry args={[0.22, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>
      {[-0.08, 0.08].map((z, i) => <mesh key={i} position={[0.54, 0.12, z]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      {[0, 1, 2, 3, 4, 5].map(i => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.52, Math.sin(i * 0.55) * 0.14, Math.sin(a) * 0.52]} scale={[1, 0.72, 1]}><sphereGeometry args={[0.22 - i * 0.015, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>; })}
      <mesh position={[0.52, 0.12, 0]}><sphereGeometry args={[0.3, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.72, 0.16, z]}><sphereGeometry args={[0.052, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * 0.42, -0.3, Math.sin((i / 6) * Math.PI * 2) * 0.42]}><sphereGeometry args={[0.06, 6, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = (i / 8) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.65, Math.sin(i * 0.48) * 0.18, Math.sin(a) * 0.65]} scale={[1, 0.72, 1]}><sphereGeometry args={[0.26 - i * 0.01, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>; })}
      <mesh position={[0.65, 0.16, 0]}><sphereGeometry args={[0.38, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.88, 0.22, z]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <mesh key={i} position={[Math.cos((i / 8) * Math.PI * 2) * 0.5, -0.38, Math.sin((i / 8) * Math.PI * 2) * 0.5]}><sphereGeometry args={[0.07, 7, 7]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
      <mesh position={[0.65, 0.16, 0]} rotation={[-0.3, 0, 0]}><coneGeometry args={[0.055, 0.32, 4]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>
    </group>
  );
  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]}><torusGeometry args={[1.0, 0.22, 14, 60]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.4} /></mesh>
      <mesh position={[1.0, 0, 0]}><sphereGeometry args={[0.38, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.4} /></mesh>
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[1.28, 0.12, z]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      <mesh position={[1.0, 0, 0]} rotation={[-0.3, 0, 0]}><coneGeometry args={[0.07, 0.42, 4]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => { const a = (i / 12) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0]}><sphereGeometry args={[0.07, 6, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.12} /></mesh>; })}
      <mesh position={[0, 0, 0]}><torusGeometry args={[1.68, 0.028, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── KITSUNE ──────────────────────────────────────────────────────────────────
function KitsuneMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.2, 0.82, 1]}><sphereGeometry args={[0.44, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      <mesh position={[0.42, 0.3, 0]}><sphereGeometry args={[0.3, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      {[0.1, -0.1].map((z, i) => <mesh key={i} position={[0.44, 0.68, z]} rotation={[0, 0, i === 0 ? -0.35 : 0.35]}><coneGeometry args={[0.09, 0.26, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>)}
      <mesh position={[-0.55, 0.08, 0]} rotation={[0, 0, 0.35]}><cylinderGeometry args={[0.07, 0.1, 0.55, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.62, 0.36, z]}><sphereGeometry args={[0.045, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.28, 0.82, 1.04]}><sphereGeometry args={[0.56, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      <mesh position={[0.54, 0.38, 0]}><sphereGeometry args={[0.36, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      {[0.12, -0.12].map((z, i) => <mesh key={i} position={[0.56, 0.82, z]} rotation={[0, 0, i === 0 ? -0.3 : 0.3]}><coneGeometry args={[0.1, 0.3, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>)}
      {[-0.35, 0, 0.35].map((z, i) => <mesh key={i} position={[-0.6, 0.12 + Math.abs(z) * 0.15, z]} rotation={[0, 0, 0.3 + Math.abs(z) * 0.15]}><cylinderGeometry args={[0.055, 0.08, 0.6 + Math.abs(z) * 0.1, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.76, 0.44, z]}><sphereGeometry args={[0.055, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
      <mesh position={[-0.2, 0.08, 0]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.35, 0.85, 1.08]}><sphereGeometry args={[0.68, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      <mesh position={[0.65, 0.46, 0]}><sphereGeometry args={[0.44, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      {[0.14, -0.14].map((z, i) => <mesh key={i} position={[0.68, 0.98, z]} rotation={[0, 0, i === 0 ? -0.28 : 0.28]}><coneGeometry args={[0.11, 0.34, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>)}
      {[-0.55, -0.22, 0, 0.22, 0.55].map((z, i) => <mesh key={i} position={[-0.75, 0.18 + Math.abs(z) * 0.2, z]} rotation={[0, 0, 0.35 + Math.abs(z) * 0.1]}><cylinderGeometry args={[0.055, 0.09, 0.7 + Math.abs(z) * 0.12, 5]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>)}
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0.9, 0.54, z]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      {[-0.3, 0, 0.3].map((x, i) => <mesh key={i} position={[x, 0.18, 0]}><sphereGeometry args={[0.075, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.42, 0.88, 1.14]}><sphereGeometry args={[0.82, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.65} /></mesh>
      <mesh position={[0.78, 0.56, 0]}><sphereGeometry args={[0.54, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>
      {[0.16, -0.16].map((z, i) => <mesh key={i} position={[0.82, 1.18, z]} rotation={[0, 0, i === 0 ? -0.26 : 0.26]}><coneGeometry args={[0.12, 0.4, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.65} /></mesh>)}
      {[-0.8, -0.55, -0.28, 0, 0.28, 0.55, 0.8].map((z, i) => <mesh key={i} position={[-0.92, 0.22 + Math.abs(z) * 0.28, z]} rotation={[0, 0, 0.38 + Math.abs(z) * 0.08]}><cylinderGeometry args={[0.055, 0.1, 0.82 + Math.abs(z) * 0.14, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.05} /></mesh>)}
      {[-0.16, 0.16].map((z, i) => <mesh key={i} position={[1.08, 0.66, z]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      {[0, 1, 2, 3, 4, 5].map(i => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.88, 0.72, Math.sin(a) * 0.42]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>; })}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.28, 0.03, 6, 32]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} transparent opacity={0.5} /></mesh>
      <mesh position={[0, 0, 0]}><torusGeometry args={[1.72, 0.025, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} transparent opacity={0.38} /></mesh>
    </group>
  );
}

// ─── ONI ──────────────────────────────────────────────────────────────────────
function OniMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1, 0.9, 1]}><sphereGeometry args={[0.46, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.58, 0.08]}><sphereGeometry args={[0.34, 12, 12]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[-0.12, 0.12].map((x, i) => <mesh key={i} position={[x, 0.9, 0.06]} rotation={[0.1, 0, i === 0 ? -0.15 : 0.15]}><coneGeometry args={[0.06, 0.22, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>)}
      <mesh position={[0.6, 0.05, 0]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.06, 0.12, 0.55, 6]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0, 0.65, z]}><sphereGeometry args={[0.042, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.05, 0.92, 1]}><sphereGeometry args={[0.58, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.74, 0.1]}><sphereGeometry args={[0.42, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[-0.16, 0.16].map((x, i) => <mesh key={i} position={[x, 1.16, 0.08]} rotation={[0.1, 0, i === 0 ? -0.18 : 0.18]}><coneGeometry args={[0.08, 0.35, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 0.72, 0.15, 0]} rotation={[0, 0, side * 0.45]}><capsuleGeometry args={[0.11, 0.52, 4, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[0.92, -0.22, 0.12]} rotation={[0, 0.2, -0.5]}><cylinderGeometry args={[0.06, 0.14, 0.72, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0, 0.8, z]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.1, 0.95, 1.05]}><sphereGeometry args={[0.72, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0, 0.92, 0.12]}><sphereGeometry args={[0.52, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[-0.2, 0.2].map((x, i) => <mesh key={i} position={[x, 1.44, 0.08]} rotation={[0.12, 0, i === 0 ? -0.2 : 0.2]}><coneGeometry args={[0.1, 0.48, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 0.9, 0.2, 0]} rotation={[0, 0, side * 0.4]}><capsuleGeometry args={[0.135, 0.68, 4, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[1.22, -0.18, 0.15]} rotation={[0, 0.25, -0.52]}><cylinderGeometry args={[0.07, 0.18, 0.92, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0, 0.98, z]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>)}
      {[-0.35, 0, 0.35].map((z, i) => <mesh key={i} position={[0, 0.52, z]} scale={[0.85, 0.12, 0.05]}><boxGeometry args={[0.88, 1, 1]} /><Mat color={s} ei={0.05} roughness={0.9} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.18, 0.98, 1.1]}><sphereGeometry args={[0.88, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} /></mesh>
      <mesh position={[0, 1.12, 0.14]}><sphereGeometry args={[0.64, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>
      {[-0.24, 0.24].map((x, i) => <mesh key={i} position={[x, 1.76, 0.1]} rotation={[0.12, 0, i === 0 ? -0.22 : 0.22]}><coneGeometry args={[0.12, 0.62, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.25} /></mesh>)}
      {[-1, 1].map((side, i) => <mesh key={i} position={[side * 1.1, 0.26, 0]} rotation={[0, 0, side * 0.38]}><capsuleGeometry args={[0.16, 0.84, 4, 8]} /><Mat color={p} emissive={glow} ei={ei} /></mesh>)}
      <mesh position={[1.5, -0.22, 0.18]} rotation={[0, 0.28, -0.5]}><cylinderGeometry args={[0.085, 0.22, 1.18, 6]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>
      <mesh position={[1.5, 0.42, 0.18]}><sphereGeometry args={[0.2, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3} /></mesh>
      {[-0.18, 0.18].map((z, i) => <mesh key={i} position={[0, 1.18, z]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      {[-0.45, 0, 0.45].map((z, i) => <mesh key={i} position={[0, 0.64, z]} scale={[0.88, 0.14, 0.05]}><boxGeometry args={[0.92, 1, 1]} /><Mat color={s} ei={0.05} roughness={0.9} /></mesh>)}
      <mesh><torusGeometry args={[1.72, 0.03, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

// ─── QILIN ────────────────────────────────────────────────────────────────────
function QilinMesh({ stage, info, status }: { stage: Stage; info: typeof MONSTER_INFO[MonsterType]; status: Status }) {
  const ref = useRef<THREE.Group>(null);
  useMonsterAnimation(ref, status);
  const p = status === "dead" ? "#555" : info.primary;
  const s = status === "dead" ? "#666" : info.secondary;
  const glow = status === "dead" ? "#555" : statusGlow(status);
  const ei = status === "dead" ? 0.05 : 0.2;

  if (stage === "baby") return (
    <group ref={ref}>
      <mesh scale={[1.3, 0.76, 1]}><sphereGeometry args={[0.42, 14, 14]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>
      <mesh position={[0.42, 0.3, 0]}><sphereGeometry args={[0.28, 12, 12]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      <mesh position={[0.42, 0.6, 0]} rotation={[0.1, 0, 0.1]}><coneGeometry args={[0.05, 0.22, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.1} /></mesh>
      {[-0.5, 0.28].map((x, i) => <mesh key={i} position={[x, -0.42, 0]} rotation={[0.14, 0, 0]}><cylinderGeometry args={[0.07, 0.055, 0.44, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>)}
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.42, 0.38, z]}><sphereGeometry args={[0.038, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  if (stage === "teen") return (
    <group ref={ref}>
      <mesh scale={[1.42, 0.78, 1.05]}><sphereGeometry args={[0.54, 16, 16]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>
      <mesh position={[0.54, 0.38, 0]}><sphereGeometry args={[0.35, 14, 14]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.1, 0, 0.1].map((z, i) => <mesh key={i} position={[0.54 + z * 0.1, 0.78 + Math.abs(z) * 0.1, z * 0.2]} rotation={[0.08, z * 0.3, 0.1]}><coneGeometry args={[0.045, 0.32, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.15} /></mesh>)}
      {[-0.68, -0.24, 0.2, 0.62].map((x, i) => <mesh key={i} position={[x, -0.52, 0]} rotation={[0.14, 0, 0]}><cylinderGeometry args={[0.08, 0.062, 0.56, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>)}
      {[-0.1, 0.1].map((z, i) => <mesh key={i} position={[0.54, 0.5, z]}><sphereGeometry args={[0.05, 7, 7]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} /></mesh>)}
      {[0.32, -0.12].map((x, i) => <mesh key={i} position={[x, 0.55, i === 0 ? 0.28 : -0.28]} rotation={[0.2, 0, i === 0 ? -0.6 : 0.6]}><boxGeometry args={[0.38, 0.04, 0.24]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={0.8} transparent opacity={0.8} /></mesh>)}
    </group>
  );
  if (stage === "adult") return (
    <group ref={ref}>
      <mesh scale={[1.52, 0.82, 1.1]}><sphereGeometry args={[0.66, 18, 18]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>
      <mesh position={[0.65, 0.46, 0]}><sphereGeometry args={[0.44, 16, 16]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.14, 0, 0.14].map((z, i) => <mesh key={i} position={[0.65 + z * 0.12, 0.98 + Math.abs(z) * 0.1, z * 0.25]} rotation={[0.08, z * 0.35, 0.12]}><coneGeometry args={[0.055, 0.45, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.2} /></mesh>)}
      {[-0.84, -0.32, 0.22, 0.72].map((x, i) => <mesh key={i} position={[x, -0.64, 0]} rotation={[0.14, 0, 0]}><cylinderGeometry args={[0.09, 0.07, 0.7, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>)}
      {[-0.12, 0.12].map((z, i) => <mesh key={i} position={[0.65, 0.62, z]}><sphereGeometry args={[0.065, 8, 8]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.8} /></mesh>)}
      {[0.42, -0.08].map((x, i) => <mesh key={i} position={[x, 0.66, i === 0 ? 0.42 : -0.42]} rotation={[0.2, 0, i === 0 ? -0.55 : 0.55]}><boxGeometry args={[0.68, 0.04, 0.42]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={1.0} transparent opacity={0.82} /></mesh>)}
      {[0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3].map((a, i) => <mesh key={i} position={[Math.cos(a) * 0.55, -0.3, Math.sin(a) * 0.42]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2} /></mesh>)}
    </group>
  );
  return (
    <group ref={ref}>
      <mesh scale={[1.62, 0.86, 1.18]}><sphereGeometry args={[0.8, 20, 20]} /><Mat color={p} emissive={glow} ei={ei + 0.05} roughness={0.5} /></mesh>
      <mesh position={[0.78, 0.56, 0]}><sphereGeometry args={[0.54, 18, 18]} /><Mat color={s} emissive={glow} ei={ei} /></mesh>
      {[-0.18, 0, 0.18].map((z, i) => <mesh key={i} position={[0.78 + z * 0.14, 1.2 + Math.abs(z) * 0.12, z * 0.3]} rotation={[0.1, z * 0.4, 0.14]}><coneGeometry args={[0.065, 0.58, 5]} /><Mat color={s} emissive={glow} ei={ei + 0.25} /></mesh>)}
      {[-1.02, -0.4, 0.26, 0.86].map((x, i) => <mesh key={i} position={[x, -0.8, 0]} rotation={[0.14, 0, 0]}><cylinderGeometry args={[0.11, 0.085, 0.84, 5]} /><Mat color={p} emissive={glow} ei={ei} roughness={0.5} /></mesh>)}
      {[-0.14, 0.14].map((z, i) => <mesh key={i} position={[0.78, 0.72, z]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.5} /></mesh>)}
      {[0.54, -0.06].map((x, i) => <mesh key={i} position={[x, 0.8, i === 0 ? 0.56 : -0.56]} rotation={[0.22, 0, i === 0 ? -0.52 : 0.52]}><boxGeometry args={[0.92, 0.038, 0.58]} /><meshStandardMaterial color={s} emissive={glow} emissiveIntensity={1.1} transparent opacity={0.85} /></mesh>)}
      {[0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3].map((a, i) => <mesh key={i} position={[Math.cos(a) * 0.7, -0.4, Math.sin(a) * 0.52]}><sphereGeometry args={[0.055, 6, 6]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} /></mesh>)}
      <mesh position={[0, 0, 0]}><torusGeometry args={[1.68, 0.032, 6, 40]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.45} /></mesh>
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.24, 0.025, 6, 32]} /><meshStandardMaterial color={s} emissive={s} emissiveIntensity={2} transparent opacity={0.4} /></mesh>
    </group>
  );
}

function MonsterScene({ kickUsername, stage, status }: { kickUsername: string; stage: Stage; status: Status }) {
  const monsterType = getMonsterType(kickUsername);
  const info = MONSTER_INFO[monsterType] ?? MONSTER_INFO.dragon;
  const glow = statusGlow(status);

  const isDead = status === "dead";

  return (
    <>
      <ambientLight intensity={isDead ? 0.2 : 0.35} />
      <pointLight position={[3, 4, 3]} intensity={isDead ? 0.6 : 1.4} color={isDead ? "#aaa" : "#fff"} />
      <pointLight position={[-2, -1, 2]} intensity={isDead ? 0.1 : 0.6} color={isDead ? "#555" : glow} />
      <pointLight position={[0, -3, 0]} intensity={isDead ? 0.05 : 0.25} color={isDead ? "#333" : info.eggGlow} />

      {stage === "egg" && <EggMesh info={info} status={status} />}
      {stage !== "egg" && monsterType === "dragon"      && <DragonMesh      stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "spider"      && <SpiderMesh      stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "tiger"       && <TigerMesh       stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "wolf"        && <WolfMesh        stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "golem"       && <GolemMesh       stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "phoenix"     && <PhoenixMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "crab"        && <CrabMesh        stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "serpent"     && <SerpentMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "shark"       && <SharkMesh       stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "bear"        && <BearMesh        stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "scorpion"    && <ScorpionMesh    stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "octopus"     && <OctopusMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "cyclops"     && <CyclopsMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "minotaur"    && <MinotaurMesh    stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "medusa"      && <MedusaMesh      stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "centaur"     && <CentaurMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "siren"       && <SirenMesh       stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "chimera"     && <ChimeraMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "sphinx"      && <SphinxMesh      stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "fenrir"      && <FenrirMesh      stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "jormungandr" && <JormungandrMesh stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "kitsune"     && <KitsuneMesh     stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "oni"         && <OniMesh         stage={stage} info={info} status={status} />}
      {stage !== "egg" && monsterType === "qilin"       && <QilinMesh       stage={stage} info={info} status={status} />}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
        rotateSpeed={0.6}
        autoRotate={false}
      />
    </>
  );
}

export function Monster3DViewer({
  kickUsername,
  stage,
  status,
  size = 176,
}: {
  kickUsername: string;
  stage: "egg" | "baby" | "teen" | "adult" | "final";
  status: "happy" | "angry" | "sleeping" | "critical" | "dead";
  size?: number;
}) {
  const monsterType = getMonsterType(kickUsername);
  const info = MONSTER_INFO[monsterType] ?? MONSTER_INFO.dragon;
  const glow = statusGlow(status);

  const cameraZ =
    stage === "egg" ? 2.8 :
    stage === "baby" ? 2.6 :
    stage === "teen" ? 3.0 :
    stage === "adult" ? 3.5 :
    3.8;

  return (
    <div
      className="relative mx-auto border-2 bg-black/95 overflow-hidden"
      style={{
        width: size, height: size,
        borderColor: status === "dead" ? "#374151" : glow,
        boxShadow: status === "dead" ? "none" : `0 0 28px ${glow}55`,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <MonsterScene kickUsername={kickUsername} stage={stage} status={status} />
      </Canvas>
      <div className="absolute bottom-1 left-0 right-0 text-center font-mono text-[8px] text-white/30 uppercase tracking-widest pointer-events-none select-none">
        {info.icon} {info.name} · drag to rotate
      </div>
    </div>
  );
}
