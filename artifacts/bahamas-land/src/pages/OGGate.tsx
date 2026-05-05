import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hashPin } from "@/lib/players";
import { Key, ChevronLeft, ChevronRight } from "lucide-react";
import { audio } from "@/lib/audio";
import gateImg from "@assets/generated_images/bld_og_gate.png";

// ── Character options ──────────────────────────────────────────────────────────

const GENDERS = ["Male", "Female"] as const;
type Gender = typeof GENDERS[number];

const BODY_TYPES = ["Slim", "Average", "Athletic", "Curvy"] as const;
const HEIGHTS = ["Short", "Medium", "Tall"] as const;

const SKIN_TONES = [
  { label: "Ivory",  value: "#fde8d0" },
  { label: "Peach",  value: "#f4c2a1" },
  { label: "Tan",    value: "#d4956a" },
  { label: "Brown",  value: "#a0632a" },
  { label: "Dark",   value: "#5c3317" },
  { label: "Ebony",  value: "#2e1503" },
];

const HAIR_STYLES: Record<Gender, string[]> = {
  Male:   ["Buzz Cut", "Fade", "Curly", "Long", "Mohawk", "Bald", "Dreads", "Afro"],
  Female: ["Short Bob", "Long Straight", "Curly", "Braids", "Ponytail", "Afro", "Dreads", "Pixie"],
};

const HAIR_COLORS = [
  { label: "Black",   value: "#111111" },
  { label: "Brown",   value: "#5c3d2e" },
  { label: "Blonde",  value: "#f5d27a" },
  { label: "Red",     value: "#b22222" },
  { label: "Grey",    value: "#aaaaaa" },
  { label: "White",   value: "#eeeeee" },
  { label: "Magenta", value: "#ff2d8c" },
  { label: "Cyan",    value: "#3df7ff" },
  { label: "Purple",  value: "#bd93f9" },
  { label: "Green",   value: "#39ff14" },
];

const EYE_COLORS = [
  { label: "Brown", value: "#5c3d2e" },
  { label: "Blue",  value: "#2196f3" },
  { label: "Green", value: "#388e3c" },
  { label: "Grey",  value: "#78909c" },
  { label: "Hazel", value: "#8d6e63" },
  { label: "Red",   value: "#e53935" },
  { label: "Cyan",  value: "#3df7ff" },
  { label: "Gold",  value: "#ffe93d" },
];

const AURA_COLORS = [
  { label: "Magenta", value: "#ff2d8c" },
  { label: "Cyan",    value: "#3df7ff" },
  { label: "Gold",    value: "#ffe93d" },
  { label: "Lime",    value: "#39ff14" },
  { label: "Orange",  value: "#ff6b35" },
  { label: "Purple",  value: "#bd93f9" },
  { label: "White",   value: "#ffffff" },
  { label: "Red",     value: "#ff4444" },
];

// ── Class Origins ──────────────────────────────────────────────────────────────

export type OriginClass = "Tank" | "Assassin" | "Mage" | "Ranger" | "Berserker" | "Paladin";

const CLASS_ORIGINS: {
  id: OriginClass;
  name: string;
  lore: string;
  stats: { str: number; agi: number; int: number; vit: number };
  armorColor: string;
  accentColor: string;
}[] = [
  {
    id: "Tank",
    name: "Tank",
    lore: "Iron-forged and unbreakable. A walking fortress who absorbs punishment so others don't have to. The last line between the gate and civilization.",
    stats: { str: 7, agi: 2, int: 2, vit: 9 },
    armorColor: "#607d8b",
    accentColor: "#90a4ae",
  },
  {
    id: "Assassin",
    name: "Assassin",
    lore: "A shadow that bleeds. Trained to move unseen and strike with lethal precision before the enemy knows they're already dead.",
    stats: { str: 5, agi: 9, int: 4, vit: 2 },
    armorColor: "#1a1a2e",
    accentColor: "#7c4dff",
  },
  {
    id: "Mage",
    name: "Mage",
    lore: "Reality is merely a suggestion. A master of arcane forces who bends the laws of physics to unleash devastation at will.",
    stats: { str: 1, agi: 3, int: 10, vit: 3 },
    armorColor: "#2d1b69",
    accentColor: "#aa00ff",
  },
  {
    id: "Ranger",
    name: "Ranger",
    lore: "Eyes like a hawk, reflexes like lightning. A wilderness hunter who reads the terrain and picks off threats from impossible distances.",
    stats: { str: 4, agi: 8, int: 5, vit: 3 },
    armorColor: "#2e4a1e",
    accentColor: "#76c442",
  },
  {
    id: "Berserker",
    name: "Berserker",
    lore: "Pain is a fuel. In the heat of battle, the Berserker transcends limits, growing stronger the more damage they take and deal.",
    stats: { str: 10, agi: 5, int: 1, vit: 4 },
    armorColor: "#4a1010",
    accentColor: "#ff3d00" ,
  },
  {
    id: "Paladin",
    name: "Paladin",
    lore: "Holy fire made flesh. A warrior consecrated by light who fights with righteous fury and heals allies even in the depths of darkness.",
    stats: { str: 6, agi: 3, int: 5, vit: 6 },
    armorColor: "#7a6000",
    accentColor: "#ffd600",
  },
];

// ── Default character ──────────────────────────────────────────────────────────

export type OGCharacter = {
  gender: Gender;
  bodyType: string;
  height: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  auraColor: string;
  displayName: string;
  origin: OriginClass;
};

const defaultChar = (): OGCharacter => ({
  gender: "Male",
  bodyType: "Average",
  height: "Medium",
  skinTone: SKIN_TONES[1].value,
  hairStyle: HAIR_STYLES.Male[0],
  hairColor: HAIR_COLORS[0].value,
  eyeColor: EYE_COLORS[0].value,
  auraColor: AURA_COLORS[0].value,
  displayName: "",
  origin: "Tank",
});

// ── Cycle helper ───────────────────────────────────────────────────────────────

function cycle<T>(arr: readonly T[], current: T, dir: 1 | -1): T {
  const idx = arr.indexOf(current);
  return arr[(idx + dir + arr.length) % arr.length];
}

// ── Weapon SVGs per class (blocky pixel style) ───────────────────────────────

function WeaponSVG({ origin, lHand, rHand, armY, accentColor, armorColor }: {
  origin: OriginClass; lHand: number; rHand: number; armY: number; accentColor: string; armorColor: string;
}) {
  const wY = armY + 28;

  if (origin === "Tank") {
    return (
      <g>
        {/* Sword (right hand) - blocky */}
        <rect x={rHand - 4} y={wY - 68} width={8} height={88} fill="#c0c0c0" />
        <rect x={rHand - 4} y={wY - 68} width={8} height={8} fill="#e8e8e8" />
        <rect x={rHand - 16} y={wY - 22} width={32} height={8} fill="#888" />
        <rect x={rHand - 4} y={wY + 14} width={8} height={12} fill="#7a6040" />
        {/* Shield (left hand) */}
        <rect x={lHand - 24} y={wY - 36} width={44} height={52} fill={armorColor} />
        <rect x={lHand - 24} y={wY - 36} width={44} height={52} fill="none" stroke={accentColor} strokeWidth={3} />
        <rect x={lHand - 8} y={wY - 36} width={10} height={52} fill={accentColor} opacity={0.5} />
        <rect x={lHand - 24} y={wY - 8} width={44} height={10} fill={accentColor} opacity={0.5} />
        <rect x={lHand - 5} y={wY - 5} width={10} height={10} fill={accentColor} />
      </g>
    );
  }
  if (origin === "Assassin") {
    return (
      <g>
        {/* Left dagger */}
        <rect x={lHand - 3} y={wY - 56} width={6} height={72} fill="#7c4dff" />
        <rect x={lHand - 3} y={wY - 56} width={6} height={6} fill="#e040fb" />
        <rect x={lHand - 11} y={wY} width={22} height={6} fill="#6a0080" />
        {/* Right dagger */}
        <rect x={rHand - 3} y={wY - 56} width={6} height={72} fill="#7c4dff" />
        <rect x={rHand - 3} y={wY - 56} width={6} height={6} fill="#e040fb" />
        <rect x={rHand - 11} y={wY} width={22} height={6} fill="#6a0080" />
      </g>
    );
  }
  if (origin === "Mage") {
    return (
      <g>
        {/* Staff */}
        <rect x={rHand - 4} y={wY - 96} width={8} height={116} fill="#3a1860" />
        {/* Orb */}
        <rect x={rHand - 16} y={wY - 108} width={32} height={24} fill={accentColor} opacity={0.25} />
        <rect x={rHand - 20} y={wY - 104} width={40} height={16} fill={accentColor} opacity={0.2} />
        <rect x={rHand - 12} y={wY - 108} width={24} height={24} fill={accentColor} opacity={0.7} />
        <rect x={rHand - 6} y={wY - 102} width={12} height={12} fill="white" opacity={0.9} />
        {/* Sparks */}
        {[[-22, -110], [20, -104], [-24, -90], [22, -116], [0, -120]].map(([dx, dy], i) => (
          <rect key={i} x={rHand + dx} y={wY + dy} width={5} height={5} fill={accentColor} opacity={0.7} />
        ))}
      </g>
    );
  }
  if (origin === "Ranger") {
    return (
      <g>
        {/* Bow stave */}
        <rect x={lHand - 3} y={wY - 56} width={6} height={104} fill="#5d4037" />
        {/* Bow limbs */}
        <rect x={lHand - 24} y={wY - 56} width={26} height={10} fill="#4a3020" />
        <rect x={lHand - 24} y={wY + 42} width={26} height={10} fill="#4a3020" />
        {/* Bowstring */}
        <line x1={lHand - 22} y1={wY - 50} x2={lHand - 3} y2={wY} stroke="#eee" strokeWidth={1.5} />
        <line x1={lHand - 22} y1={wY + 50} x2={lHand - 3} y2={wY} stroke="#eee" strokeWidth={1.5} />
        {/* Arrow */}
        <rect x={lHand + 4} y={wY - 3} width={rHand + 18 - lHand - 4} height={6} fill="#8d6e63" />
        <rect x={rHand + 14} y={wY - 9} width={12} height={18} fill={accentColor} />
      </g>
    );
  }
  if (origin === "Berserker") {
    return (
      <g>
        {/* Left axe handle */}
        <rect x={lHand - 4} y={wY - 58} width={8} height={80} fill="#5d4037" />
        {/* Left axe head */}
        <rect x={lHand - 30} y={wY - 56} width={34} height={36} fill={accentColor} opacity={0.9} />
        <rect x={lHand - 30} y={wY - 56} width={34} height={36} fill="none" stroke="#222" strokeWidth={2} />
        <rect x={lHand - 30} y={wY - 62} width={18} height={8} fill={accentColor} />
        {/* Right axe handle */}
        <rect x={rHand - 4} y={wY - 58} width={8} height={80} fill="#5d4037" />
        {/* Right axe head */}
        <rect x={rHand + 4} y={wY - 56} width={34} height={36} fill={accentColor} opacity={0.9} />
        <rect x={rHand + 4} y={wY - 56} width={34} height={36} fill="none" stroke="#222" strokeWidth={2} />
        <rect x={rHand + 18} y={wY - 62} width={18} height={8} fill={accentColor} />
      </g>
    );
  }
  if (origin === "Paladin") {
    return (
      <g>
        {/* Holy sword */}
        <rect x={rHand - 5} y={wY - 84} width={10} height={104} fill="#ffd600" />
        <rect x={rHand - 5} y={wY - 84} width={10} height={10} fill="white" />
        <rect x={rHand - 20} y={wY - 26} width={40} height={10} fill="#ff8f00" />
        <rect x={rHand - 4} y={wY + 18} width={8} height={14} fill="#b8860b" />
        {/* Holy glow on blade */}
        <rect x={rHand - 12} y={wY - 84} width={24} height={84} fill={accentColor} opacity={0.12} />
        {/* Round shield */}
        <rect x={lHand - 26} y={wY - 40} width={50} height={52} fill={armorColor} />
        <rect x={lHand - 26} y={wY - 40} width={50} height={52} fill="none" stroke={accentColor} strokeWidth={3} />
        <rect x={lHand - 8} y={wY - 40} width={12} height={52} fill={accentColor} opacity={0.4} />
        <rect x={lHand - 26} y={wY - 8} width={50} height={12} fill={accentColor} opacity={0.4} />
        <rect x={lHand - 4} y={wY - 6} width={12} height={12} fill={accentColor} />
      </g>
    );
  }
  return null;
}

// ── Armor overlay per class (blocky) ─────────────────────────────────────────

function ArmorOverlay({ origin, bodyX, bodyY, bw, bh, leftArmX, rightArmX, armY, aw,
  leftLegX, rightLegX, legY, lw, cx, accentColor, armorColor }: {
  origin: OriginClass; bodyX: number; bodyY: number; bw: number; bh: number;
  leftArmX: number; rightArmX: number; armY: number; aw: number;
  leftLegX: number; rightLegX: number; legY: number; lw: number;
  cx: number; accentColor: string; armorColor: string;
}) {
  if (origin === "Tank") {
    return (
      <g>
        <rect x={bodyX - 4} y={bodyY} width={bw + 8} height={Math.round(bh * 0.55)} fill={armorColor} stroke={accentColor} strokeWidth={2} />
        <rect x={cx - 5} y={bodyY + 4} width={10} height={Math.round(bh * 0.45)} fill={accentColor} opacity={0.5} />
        <rect x={leftArmX - 6} y={armY - 6} width={aw + 12} height={24} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <rect x={rightArmX - 6} y={armY - 6} width={aw + 12} height={24} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <rect x={bodyX - 4} y={bodyY + Math.round(bh * 0.55)} width={bw + 8} height={16} fill={accentColor} opacity={0.7} />
        <rect x={leftLegX - 4} y={legY + 14} width={lw + 8} height={26} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <rect x={rightLegX - 4} y={legY + 14} width={lw + 8} height={26} fill={armorColor} stroke={accentColor} strokeWidth={1} />
      </g>
    );
  }
  if (origin === "Assassin") {
    return (
      <g>
        <rect x={bodyX + 4} y={bodyY + 4} width={bw - 8} height={Math.round(bh * 0.5)} fill={armorColor} opacity={0.75} />
        <line x1={bodyX} y1={bodyY} x2={cx + 10} y2={bodyY + Math.round(bh * 0.45)} stroke={accentColor} strokeWidth={3} opacity={0.8} />
        <line x1={bodyX + bw} y1={bodyY} x2={cx - 10} y2={bodyY + Math.round(bh * 0.45)} stroke={accentColor} strokeWidth={3} opacity={0.8} />
        <rect x={bodyX - 4} y={bodyY - 20} width={bw + 8} height={24} fill={armorColor} opacity={0.8} />
        <rect x={leftLegX} y={legY + 18} width={lw} height={14} fill={armorColor} opacity={0.6} />
        <rect x={rightLegX} y={legY + 18} width={lw} height={14} fill={armorColor} opacity={0.6} />
      </g>
    );
  }
  if (origin === "Mage") {
    return (
      <g>
        <rect x={bodyX - 12} y={bodyY + Math.round(bh * 0.4)} width={bw + 24} height={Math.round(bh * 0.6)} fill={armorColor} opacity={0.85} />
        <rect x={bodyX} y={bodyY} width={bw} height={Math.round(bh * 0.45)} fill={armorColor} opacity={0.8} />
        <rect x={cx - 24} y={bodyY - 8} width={48} height={18} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <rect x={cx - 14} y={bodyY + 22} width={28} height={28} fill="none" stroke={accentColor} strokeWidth={2} opacity={0.6} />
        <rect x={cx - 7} y={bodyY + 29} width={14} height={14} fill="none" stroke={accentColor} strokeWidth={1.5} opacity={0.4} />
        <rect x={cx - 4} y={bodyY + 33} width={8} height={8} fill={accentColor} opacity={0.5} />
        <rect x={bodyX - 4} y={bodyY + Math.round(bh * 0.52)} width={bw + 8} height={10} fill={accentColor} opacity={0.7} />
      </g>
    );
  }
  if (origin === "Ranger") {
    return (
      <g>
        <rect x={bodyX + 2} y={bodyY + 2} width={bw - 4} height={Math.round(bh * 0.55)} fill={armorColor} opacity={0.8} />
        <rect x={bodyX - 4} y={bodyY - 18} width={bw + 8} height={22} fill={armorColor} opacity={0.75} />
        <rect x={rightArmX + 2} y={armY - 16} width={16} height={46} fill="#5d4037" />
        {[0, 5, 10].map((d, i) => (
          <rect key={i} x={rightArmX + 4 + d} y={armY - 18 - i * 2} width={5} height={8} fill="#8d6e63" />
        ))}
        <rect x={bodyX - 2} y={bodyY + Math.round(bh * 0.56)} width={bw + 4} height={14} fill="#4a3728" />
        <rect x={cx - 12} y={bodyY + Math.round(bh * 0.52)} width={24} height={22} fill="#5d4037" />
      </g>
    );
  }
  if (origin === "Berserker") {
    return (
      <g>
        <rect x={leftArmX - 5} y={armY - 10} width={aw + 12} height={22} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <rect x={rightArmX - 7} y={armY - 10} width={aw + 12} height={22} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <rect x={leftArmX + 2} y={armY - 22} width={10} height={14} fill={accentColor} />
        <rect x={rightArmX + 8} y={armY - 22} width={10} height={14} fill={accentColor} />
        <line x1={cx - 14} y1={bodyY + 18} x2={cx + 8} y2={bodyY + 48} stroke="#ff1744" strokeWidth={2.5} opacity={0.7} />
        <line x1={cx + 12} y1={bodyY + 12} x2={cx - 4} y2={bodyY + 36} stroke="#ff1744" strokeWidth={1.5} opacity={0.5} />
        <rect x={bodyX - 2} y={bodyY + Math.round(bh * 0.56)} width={bw + 4} height={16} fill="#5d4037" />
        <rect x={bodyX - 2} y={bodyY + Math.round(bh * 0.7)} width={bw + 4} height={8} fill="#6d4c41" opacity={0.7} />
      </g>
    );
  }
  if (origin === "Paladin") {
    return (
      <g>
        <rect x={bodyX - 5} y={bodyY - 2} width={bw + 10} height={Math.round(bh * 0.6)} fill={armorColor} stroke={accentColor} strokeWidth={2} />
        <rect x={cx - 5} y={bodyY + 8} width={10} height={Math.round(bh * 0.45)} fill={accentColor} opacity={0.7} />
        <rect x={cx - 18} y={bodyY + 24} width={36} height={8} fill={accentColor} opacity={0.7} />
        <rect x={leftArmX - 6} y={armY - 10} width={aw + 14} height={28} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <rect x={rightArmX - 8} y={armY - 10} width={aw + 14} height={28} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <rect x={cx - 18} y={bodyY + 10} width={36} height={36} fill={accentColor} opacity={0.08} />
        <rect x={bodyX - 5} y={bodyY + Math.round(bh * 0.58)} width={bw + 10} height={20} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <rect x={leftLegX - 5} y={legY + 12} width={lw + 10} height={30} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <rect x={rightLegX - 5} y={legY + 12} width={lw + 10} height={30} fill={armorColor} stroke={accentColor} strokeWidth={1} />
      </g>
    );
  }
  return null;
}

// ── 2D Character Preview (Minecraft-style blocky) ────────────────────────────

function CharacterPreview({ char }: { char: OGCharacter }) {
  const isFemale = char.gender === "Female";
  const isTall = char.height === "Tall";
  const isShort = char.height === "Short";

  // Body dimensions — blocky Minecraft proportions
  const bw = char.bodyType === "Slim" ? 58 : char.bodyType === "Athletic" ? 76 : char.bodyType === "Curvy" ? 88 : 68;
  const bh = isTall ? 104 : isShort ? 80 : 92;
  const lh = isTall ? 100 : isShort ? 72 : 88;
  const aw = 24; // arm width
  const ah = bh - 8;
  const lw = 30; // leg width

  const cx = 140;
  const hw = 78;
  const hh = 72;
  const headX = cx - hw / 2;
  const headY = 16;
  const neckY = headY + hh;
  const neckH = 10;
  const bodyX = cx - bw / 2;
  const bodyY = neckY + neckH;
  const armY = bodyY - 2;
  const leftArmX = bodyX - aw - 4;
  const rightArmX = bodyX + bw + 4;
  const leftLegX = cx - lw - 2;
  const rightLegX = cx + 2;
  const legY = bodyY + bh;
  const legBotY = legY + lh;
  const totalH = legBotY + 24;

  const hairColor = char.hairStyle === "Bald" ? null : char.hairColor;
  const cls = CLASS_ORIGINS.find((c) => c.id === char.origin) || CLASS_ORIGINS[0];
  const browColor = hairColor || "#333";

  // Hair style booleans
  const isAfro = char.hairStyle === "Afro";
  const isDreads = char.hairStyle === "Dreads";
  const isMohawk = char.hairStyle === "Mohawk";
  const isBald = char.hairStyle === "Bald";
  const isLong = char.hairStyle === "Long" || char.hairStyle === "Long Straight" || char.hairStyle === "Braids";
  const isPonytail = char.hairStyle === "Ponytail";
  const isCurly = char.hairStyle === "Curly";

  // Left / right hand center for weapons
  const lHand = leftArmX + aw / 2;
  const rHand = rightArmX + aw / 2;

  return (
    <svg viewBox={`0 0 280 ${totalH}`} width="100%" height="100%"
      style={{ filter: `drop-shadow(0 0 20px ${char.auraColor}99)`, imageRendering: "pixelated" }}>
      <defs>
        <linearGradient id="sh-h" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="75%" stopColor="transparent" />
          <stop offset="100%" stopColor="#00000030" />
        </linearGradient>
        <linearGradient id="sh-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="80%" stopColor="transparent" />
          <stop offset="100%" stopColor="#00000038" />
        </linearGradient>
      </defs>

      {/* Ground aura glow */}
      <rect x={cx - bw * 0.9} y={legBotY + 4} width={bw * 1.8} height={12} rx={6}
        fill={char.auraColor} opacity={0.3} />

      {/* ── HAIR BACK (long styles hang behind body) ── */}
      {isLong && hairColor && (
        <rect x={headX + 4} y={headY + hh * 0.5} width={hw - 8} height={Math.round(bh * 0.6)} fill={hairColor} />
      )}
      {isDreads && hairColor && (
        <>
          {[-28, -17, -6, 5, 16, 27].map((dx, i) => (
            <rect key={i} x={cx + dx - 5} y={headY + hh - 6} width={10} height={Math.round(lh * 0.6)} fill={hairColor} opacity={0.9} />
          ))}
        </>
      )}
      {isPonytail && hairColor && (
        <rect x={headX - 6} y={headY + hh * 0.5} width={12} height={Math.round(bh * 0.45)} fill={hairColor} />
      )}

      {/* ── LEGS ── */}
      <rect x={leftLegX} y={legY} width={lw} height={lh} fill={cls.armorColor} />
      <rect x={leftLegX} y={legY} width={lw} height={lh} fill="url(#sh-h)" />
      <rect x={leftLegX} y={legY} width={lw} height={lh} fill="url(#sh-v)" />
      <rect x={rightLegX} y={legY} width={lw} height={lh} fill={cls.armorColor} />
      <rect x={rightLegX} y={legY} width={lw} height={lh} fill="url(#sh-h)" />
      <rect x={rightLegX} y={legY} width={lw} height={lh} fill="url(#sh-v)" />

      {/* Boots */}
      <rect x={leftLegX - 3} y={legBotY - 14} width={lw + 6} height={18} fill="#111" />
      <rect x={leftLegX - 5} y={legBotY - 5} width={8} height={10} fill="#1e1e1e" />
      <rect x={rightLegX - 3} y={legBotY - 14} width={lw + 6} height={18} fill="#111" />
      <rect x={rightLegX - 5} y={legBotY - 5} width={8} height={10} fill="#1e1e1e" />

      {/* ── BODY ── */}
      <rect x={bodyX} y={bodyY} width={bw} height={bh} fill={cls.armorColor} />
      <rect x={bodyX} y={bodyY} width={bw} height={bh} fill="url(#sh-h)" />
      <rect x={bodyX} y={bodyY} width={bw} height={bh} fill="url(#sh-v)" />

      {/* ── ARMS ── */}
      <rect x={leftArmX} y={armY} width={aw} height={ah} fill={cls.armorColor} />
      <rect x={leftArmX} y={armY} width={aw} height={ah} fill="url(#sh-h)" />
      <rect x={rightArmX} y={armY} width={aw} height={ah} fill={cls.armorColor} />
      <rect x={rightArmX} y={armY} width={aw} height={ah} fill="url(#sh-h)" />
      {/* Hands (skin) */}
      <rect x={leftArmX} y={armY + ah} width={aw} height={16} fill={char.skinTone} />
      <rect x={rightArmX} y={armY + ah} width={aw} height={16} fill={char.skinTone} />

      {/* ── ARMOR / CLASS OVERLAY ── */}
      <ArmorOverlay origin={char.origin} bodyX={bodyX} bodyY={bodyY} bw={bw} bh={bh}
        leftArmX={leftArmX} rightArmX={rightArmX} armY={armY} aw={aw}
        leftLegX={leftLegX} rightLegX={rightLegX} legY={legY} lw={lw}
        cx={cx} accentColor={cls.accentColor} armorColor={cls.armorColor} />

      {/* ── NECK ── */}
      <rect x={cx - 14} y={neckY} width={28} height={neckH} fill={char.skinTone} />

      {/* ── HEAD ── */}
      <rect x={headX} y={headY} width={hw} height={hh} fill={char.skinTone} />
      {/* Right-side shading */}
      <rect x={headX + Math.round(hw * 0.8)} y={headY} width={Math.round(hw * 0.2)} height={hh} fill="#00000025" />
      {/* Bottom shading */}
      <rect x={headX} y={headY + Math.round(hh * 0.85)} width={hw} height={Math.round(hh * 0.15)} fill="#00000022" />

      {/* ── HAIR ── */}
      {!isBald && !isMohawk && !isAfro && !isCurly && hairColor && (
        <rect x={headX - 2} y={headY - 2} width={hw + 4} height={24} fill={hairColor} />
      )}
      {isMohawk && hairColor && (
        <>
          <rect x={headX - 2} y={headY - 2} width={hw + 4} height={24} fill={char.skinTone} />
          <rect x={cx - 7} y={headY - 30} width={14} height={34} fill={hairColor} />
        </>
      )}
      {isAfro && hairColor && (
        <rect x={headX - 18} y={headY - 16} width={hw + 36} height={Math.round(hh * 0.65)} rx={16} fill={hairColor} />
      )}
      {isCurly && hairColor && (
        <rect x={headX - 10} y={headY - 14} width={hw + 20} height={32} rx={14} fill={hairColor} />
      )}
      {isBald && (
        <rect x={headX} y={headY} width={hw} height={10} fill="#ffffff0a" />
      )}

      {/* Female blush */}
      {isFemale && (
        <>
          <rect x={headX + 4} y={headY + Math.round(hh * 0.6)} width={14} height={8} fill="#ff8090" opacity={0.18} />
          <rect x={headX + hw - 18} y={headY + Math.round(hh * 0.6)} width={14} height={8} fill="#ff8090" opacity={0.18} />
        </>
      )}

      {/* ── FACE (pixel-art squares — no circles) ── */}
      {/* Eyebrows */}
      <rect x={headX + 12} y={headY + 21} width={20} height={5} fill={browColor} />
      <rect x={headX + hw - 32} y={headY + 21} width={20} height={5} fill={browColor} />

      {/* Eye whites */}
      <rect x={headX + 11} y={headY + 28} width={20} height={17} fill="white" />
      <rect x={headX + hw - 31} y={headY + 28} width={20} height={17} fill="white" />

      {/* Irises */}
      <rect x={headX + 14} y={headY + 30} width={13} height={12} fill={char.eyeColor} />
      <rect x={headX + hw - 27} y={headY + 30} width={13} height={12} fill={char.eyeColor} />

      {/* Pupils */}
      <rect x={headX + 17} y={headY + 32} width={7} height={8} fill="#0a0a0a" />
      <rect x={headX + hw - 24} y={headY + 32} width={7} height={8} fill="#0a0a0a" />

      {/* Eye shine */}
      <rect x={headX + 14} y={headY + 29} width={4} height={4} fill="white" />
      <rect x={headX + hw - 31} y={headY + 29} width={4} height={4} fill="white" />

      {/* Female eyelashes */}
      {isFemale && (
        <>
          <rect x={headX + 11} y={headY + 28} width={20} height={4} fill="#111" />
          <rect x={headX + hw - 31} y={headY + 28} width={20} height={4} fill="#111" />
        </>
      )}

      {/* Nose (subtle shadow block) */}
      <rect x={cx - 4} y={headY + 49} width={8} height={5} fill="#00000018" />

      {/* Mouth */}
      {isFemale ? (
        <>
          <rect x={cx - 14} y={headY + 58} width={28} height={7} fill="#e07090" />
          <rect x={cx - 9} y={headY + 56} width={18} height={4} fill="#f0a0b0" opacity={0.6} />
        </>
      ) : (
        <rect x={cx - 12} y={headY + 59} width={24} height={6} fill="#00000025" />
      )}

      {/* ── WEAPONS ── */}
      <WeaponSVG origin={char.origin} lHand={lHand} rHand={rHand} armY={armY}
        accentColor={cls.accentColor} armorColor={cls.armorColor} />

      {/* Aura border dashes */}
      <rect x={headX - 16} y={headY - 16} width={hw + 32} height={totalH - 18}
        fill="none" stroke={char.auraColor} strokeWidth={2} strokeDasharray="8 10" opacity={0.4} />
    </svg>
  );
}

// ── Class Origin Card ──────────────────────────────────────────────────────────

function ClassCard({ cls, selected, onSelect }: {
  cls: typeof CLASS_ORIGINS[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const total = cls.stats.str + cls.stats.agi + cls.stats.int + cls.stats.vit;
  return (
    <button
      onClick={onSelect}
      className="relative text-left p-4 border-2 transition-all duration-200 focus:outline-none"
      style={{
        borderColor: selected ? cls.accentColor : "#ffffff18",
        background: selected
          ? `linear-gradient(135deg, ${cls.armorColor}55 0%, #000 100%)`
          : "rgba(0,0,0,0.5)",
        boxShadow: selected ? `0 0 20px ${cls.accentColor}55, inset 0 0 30px ${cls.armorColor}33` : "none",
      }}
    >
      {/* Class name */}
      <div className="font-black uppercase tracking-widest text-sm mb-1"
        style={{ color: selected ? cls.accentColor : "#fff" }}>
        {cls.name}
      </div>

      {/* Stat bars */}
      <div className="space-y-1 mb-2">
        {(["str", "agi", "int", "vit"] as const).map((stat) => (
          <div key={stat} className="flex items-center gap-2">
            <span className="text-white/30 font-mono text-[9px] uppercase w-5">{stat}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(cls.stats[stat] / 10) * 100}%`,
                  background: cls.accentColor,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="text-white/40 font-mono text-[9px] w-3">{cls.stats[stat]}</span>
          </div>
        ))}
      </div>

      {/* Lore */}
      <p className="text-white/40 font-mono text-[10px] leading-relaxed">{cls.lore}</p>

      {selected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: cls.accentColor, boxShadow: `0 0 8px ${cls.accentColor}` }} />
      )}
    </button>
  );
}

// ── Picker row ─────────────────────────────────────────────────────────────────

function CycleRow({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 font-mono text-[10px] uppercase w-20 shrink-0">{label}</span>
      <button onClick={() => onChange(cycle(options, value, -1))}
        className="text-white/40 hover:text-primary transition p-1">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="flex-1 text-center text-white font-mono text-xs uppercase tracking-wider">{value}</span>
      <button onClick={() => onChange(cycle(options, value, 1))}
        className="text-white/40 hover:text-primary transition p-1">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function SwatchRow({
  label, options, selected, onSelect,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-white/40 font-mono text-[10px] uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            title={o.label}
            onClick={() => onSelect(o.value)}
            className="w-7 h-7 rounded-full border-2 transition-all"
            style={{
              backgroundColor: o.value,
              borderColor: selected === o.value ? "white" : "transparent",
              boxShadow: selected === o.value ? `0 0 8px ${o.value}` : "none",
              transform: selected === o.value ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Step type ──────────────────────────────────────────────────────────────────

type Step = "gate" | "verify" | "character" | "origin" | "entering";

// ── Main component ─────────────────────────────────────────────────────────────

export default function OGGate() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("gate");
  const [gateOpen, setGateOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [seed, setSeed] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [char, setChar] = useState<OGCharacter>(defaultChar);

  const setCharField = <K extends keyof OGCharacter>(key: K, value: OGCharacter[K]) =>
    setChar((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    const stored = localStorage.getItem("ogs_v2_username");
    if (stored) setUsername(stored);
    const storedPin = localStorage.getItem("ogs_v2_pin");
    if (storedPin) setPin(storedPin);
    const storedDisplay = localStorage.getItem("og_world_username");
    if (storedDisplay) setCharField("displayName", storedDisplay);
    const storedChar = localStorage.getItem("og_world_char");
    if (storedChar) {
      try { setChar(JSON.parse(storedChar)); } catch {}
    }
  }, []);

  const handleGateClick = () => {
    setGateOpen(true);
    audio.playBlip?.();
    setTimeout(() => setStep("verify"), 2200);
  };

  const handleVerify = async () => {
    setVerifyError("");
    const cleanUsername = username.trim();
    const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
    const cleanSeed = seed.trim();

    if (!cleanUsername || cleanPin.length < 4 || !cleanSeed) {
      setVerifyError("Fill in all fields.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setVerifyError("Backend not configured.");
      return;
    }
    setVerifying(true);
    try {
      const pin_hash = await hashPin(cleanUsername, cleanPin);
      const { data, error } = await supabase.rpc("player_login", {
        p_username: cleanUsername,
        p_pin_hash: pin_hash,
      });
      if (error || !data?.ok) {
        setVerifyError("Invalid username or PIN.");
        setVerifying(false);
        return;
      }
      const { data: claimData } = await supabase
        .from("reward_claims")
        .select("seed, username")
        .eq("seed", cleanSeed)
        .maybeSingle();
      if (!claimData) {
        setVerifyError("Invalid card seed. Only reward card holders may enter.");
        setVerifying(false);
        return;
      }
      setVerifying(false);
      setCharField("displayName", cleanUsername);
      setStep("character");
    } catch {
      setVerifyError("Network error. Try again.");
      setVerifying(false);
    }
  };

  const handleEnterWorld = () => {
    const name = char.displayName.trim() || username.trim();
    const id = `${username.toLowerCase().replace(/\s/g, "_")}_${Date.now()}`;
    const charWithName = { ...char, displayName: name };

    sessionStorage.setItem("og_world_id", id);
    sessionStorage.setItem("og_world_username", name);
    sessionStorage.setItem("og_world_color", char.auraColor);
    sessionStorage.setItem("og_world_char", JSON.stringify(charWithName));
    sessionStorage.setItem("og_world_origin", char.origin);
    localStorage.setItem("og_world_username", name);
    localStorage.setItem("og_world_color", char.auraColor);
    localStorage.setItem("og_world_char", JSON.stringify(charWithName));

    setStep("entering");
    setTimeout(() => setLocation("/og-world"), 1800);
  };

  const handleGenderChange = (g: Gender) => {
    setChar((c) => ({
      ...c,
      gender: g,
      hairStyle: HAIR_STYLES[g][0],
    }));
  };

  const selectedClass = CLASS_ORIGINS.find((c) => c.id === char.origin) || CLASS_ORIGINS[0];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">

      {/* ── GATE STEP ── */}
      <AnimatePresence>
        {step === "gate" && (
          <motion.div key="gate" className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #1a0030 0%, #000 70%)" }} />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <motion.div className="relative w-72 h-96"
                animate={gateOpen ? { scale: [1, 1.08, 1.04] } : {}}
                transition={{ duration: 1.5 }}>
                <img src={gateImg} alt="OG World Gate" className="w-full h-full object-contain"
                  style={{
                    filter: gateOpen
                      ? "drop-shadow(0 0 60px #bd93f9) drop-shadow(0 0 120px #ff2d8c) brightness(1.4)"
                      : "drop-shadow(0 0 30px #bd93f9) brightness(1)",
                    transition: "filter 0.8s ease",
                  }} />
                {!gateOpen && (
                  <motion.div className="absolute inset-0"
                    animate={{ opacity: [0.1, 0.35, 0.1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    style={{ background: "radial-gradient(ellipse at center, #bd93f980 0%, transparent 70%)", borderRadius: "50%" }} />
                )}
                {gateOpen && (
                  <motion.div className="absolute inset-0"
                    initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{ background: "radial-gradient(ellipse at center, #ff2d8c60 0%, #bd93f940 40%, transparent 70%)" }} />
                )}
              </motion.div>
              <motion.div className="text-center space-y-1">
                <h1 className="text-3xl font-black text-purple-300 uppercase tracking-[0.3em]"
                  style={{ textShadow: "0 0 20px #bd93f9" }}>OG World</h1>
                <p className="text-white/30 font-mono text-[11px] uppercase tracking-widest">Reward card holders only</p>
              </motion.div>
              {!gateOpen ? (
                <motion.button onClick={handleGateClick}
                  className="px-10 py-4 border-2 border-purple-400 text-purple-200 font-black uppercase tracking-[0.3em] text-sm hover:bg-purple-400 hover:text-black transition-all"
                  style={{ boxShadow: "0 0 20px #bd93f9" }}
                  animate={{ boxShadow: ["0 0 15px #bd93f9", "0 0 40px #bd93f9", "0 0 15px #bd93f9"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  Enter the Gate
                </motion.button>
              ) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-purple-300 font-mono uppercase tracking-widest text-sm">
                  Opening...
                </motion.p>
              )}
            </div>
            <button onClick={() => setLocation("/world")}
              className="absolute bottom-6 left-6 text-white/30 font-mono text-xs uppercase hover:text-primary transition">
              Back to map
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VERIFY STEP ── */}
      <AnimatePresence>
        {step === "verify" && (
          <motion.div key="verify" className="absolute inset-0 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #0d001a 0%, #000 70%)" }} />
            <motion.div className="relative z-10 bg-black border-2 border-purple-500 p-8 max-w-md w-full space-y-6"
              style={{ boxShadow: "0 0 40px rgba(189,147,249,0.3)" }}>
              <div className="text-center space-y-2">
                <Key className="w-10 h-10 text-purple-400 mx-auto" />
                <h1 className="text-2xl font-black text-purple-300 uppercase tracking-widest">Identity Check</h1>
                <p className="text-white/40 font-mono text-xs uppercase">Only reward card holders may enter OG World</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-white/40 font-mono text-[10px] uppercase block mb-1">Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black border border-purple-500/50 text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-purple-400"
                    placeholder="your username" />
                </div>
                <div>
                  <label className="text-white/40 font-mono text-[10px] uppercase block mb-1">PIN (4-6 digits)</label>
                  <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    type="password" inputMode="numeric"
                    className="w-full bg-black border border-purple-500/50 text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-purple-400"
                    placeholder="••••••" />
                </div>
                <div>
                  <label className="text-white/40 font-mono text-[10px] uppercase block mb-1">Reward Card Seed</label>
                  <input value={seed} onChange={(e) => setSeed(e.target.value)}
                    className="w-full bg-black border border-purple-500/50 text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-purple-400"
                    placeholder="seed from your reward card" />
                </div>
                {verifyError && (
                  <p className="text-red-400 font-mono text-xs text-center">{verifyError}</p>
                )}
                <button onClick={handleVerify} disabled={verifying}
                  className="w-full py-3 border-2 border-purple-400 text-purple-200 font-black uppercase tracking-widest text-sm hover:bg-purple-400 hover:text-black transition-all disabled:opacity-40">
                  {verifying ? "Verifying..." : "Verify Identity"}
                </button>
              </div>
            </motion.div>
            <button onClick={() => setStep("gate")}
              className="absolute bottom-6 left-6 text-white/30 font-mono text-xs uppercase hover:text-primary transition">
              Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHARACTER STEP ── */}
      <AnimatePresence>
        {step === "character" && (
          <motion.div key="character" className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #0a001f 0%, #000 70%)" }} />

            <div className="relative z-10 w-full max-w-3xl mx-auto grid grid-cols-[1fr_1.5fr] gap-6 py-8">
              {/* Character preview */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-[220px] aspect-[220/300]">
                  <CharacterPreview char={char} />
                </div>
                <div>
                  <input value={char.displayName}
                    onChange={(e) => setCharField("displayName", e.target.value)}
                    className="bg-black border border-purple-500/50 text-white font-mono text-sm px-3 py-2 text-center w-full focus:outline-none focus:border-purple-400"
                    placeholder="Enter your name..." maxLength={24} />
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 bg-black/60 border border-white/10 p-4 overflow-y-auto max-h-[80vh]">
                <h2 className="text-purple-300 font-black uppercase tracking-widest text-sm">
                  Customize Character
                </h2>

                <CycleRow label="Gender" value={char.gender} options={GENDERS} onChange={(v) => handleGenderChange(v as Gender)} />
                <CycleRow label="Body" value={char.bodyType} options={BODY_TYPES} onChange={(v) => setCharField("bodyType", v)} />
                <CycleRow label="Height" value={char.height} options={HEIGHTS} onChange={(v) => setCharField("height", v)} />
                <SwatchRow label="Skin Tone" options={SKIN_TONES} selected={char.skinTone} onSelect={(v) => setCharField("skinTone", v)} />
                <CycleRow label="Hair Style" value={char.hairStyle} options={HAIR_STYLES[char.gender]} onChange={(v) => setCharField("hairStyle", v)} />
                <SwatchRow label="Hair Color" options={HAIR_COLORS} selected={char.hairColor} onSelect={(v) => setCharField("hairColor", v)} />
                <SwatchRow label="Eye Color" options={EYE_COLORS} selected={char.eyeColor} onSelect={(v) => setCharField("eyeColor", v)} />
                <SwatchRow label="Aura Color" options={AURA_COLORS} selected={char.auraColor} onSelect={(v) => setCharField("auraColor", v)} />

                <button onClick={() => setStep("origin")}
                  className="w-full py-3 border-2 border-purple-400 text-purple-200 font-black uppercase tracking-widest text-sm hover:bg-purple-400 hover:text-black transition-all mt-4">
                  Choose Your Origin
                </button>
              </div>
            </div>
            <button onClick={() => setStep("gate")}
              className="absolute bottom-4 left-4 text-white/30 font-mono text-xs uppercase hover:text-primary transition">
              Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ORIGIN / CLASS STEP ── */}
      <AnimatePresence>
        {step === "origin" && (
          <motion.div key="origin" className="absolute inset-0 flex flex-col items-center justify-start p-6 overflow-y-auto"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at center, ${selectedClass.armorColor}44 0%, #000 60%)` }} />

            <div className="relative z-10 w-full max-w-4xl mx-auto py-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">Choose Your Origin</h2>
                <p className="text-white/30 font-mono text-xs uppercase mt-1">Your class defines how you face the gates</p>
              </div>

              <div className="grid grid-cols-[200px_1fr] gap-6">
                {/* Character preview with selected class */}
                <div className="flex flex-col items-center gap-3 sticky top-0">
                  <div className="w-full aspect-[220/300]">
                    <CharacterPreview char={char} />
                  </div>
                  <div className="text-center">
                    <div className="text-white font-black text-sm">{char.displayName || "Hunter"}</div>
                    <div className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: selectedClass.accentColor }}>
                      {selectedClass.name}
                    </div>
                  </div>
                </div>

                {/* Class cards grid */}
                <div className="grid grid-cols-2 gap-3">
                  {CLASS_ORIGINS.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      selected={char.origin === cls.id}
                      onSelect={() => setCharField("origin", cls.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-6 justify-center">
                <button onClick={() => setStep("character")}
                  className="px-8 py-3 border border-white/20 text-white/60 font-mono uppercase text-sm hover:text-white hover:border-white/50 transition-all">
                  Back to Appearance
                </button>
                <button onClick={handleEnterWorld}
                  className="px-10 py-3 border-2 font-black uppercase tracking-widest text-sm transition-all"
                  style={{
                    borderColor: selectedClass.accentColor,
                    color: selectedClass.accentColor,
                    boxShadow: `0 0 20px ${selectedClass.accentColor}55`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = selectedClass.accentColor;
                    (e.currentTarget as HTMLButtonElement).style.color = "#000";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = selectedClass.accentColor;
                  }}>
                  Enter OG World
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ENTERING STEP ── */}
      <AnimatePresence>
        {step === "entering" && (
          <motion.div key="entering" className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #1a0030 0%, #000 60%)" }} />
            <motion.div className="relative z-10 text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.3, 0.8, 1.5, 0], opacity: [1, 1, 1, 1, 0] }}
                transition={{ duration: 1.8 }}
                className="w-32 h-32 mx-auto rounded-full"
                style={{ background: `radial-gradient(circle, ${selectedClass.accentColor} 0%, transparent 70%)` }}
              />
              <motion.p animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, delay: 0.3 }}
                className="font-black uppercase tracking-[0.4em] text-xl"
                style={{ color: selectedClass.accentColor }}>
                Entering the World...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
