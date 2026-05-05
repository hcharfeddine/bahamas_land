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

// ── Weapon SVGs per class ─────────────────────────────────────────────────────

function WeaponSVG({ origin, cx, bodyTopY, bodyW, skinTone, accentColor, armorColor }: {
  origin: OriginClass; cx: number; bodyTopY: number; bodyW: number; skinTone: string; accentColor: string; armorColor: string;
}) {
  const handR = cx + bodyW / 2 + 22;
  const handL = cx - bodyW / 2 - 22;
  const wY = bodyTopY + 20;

  if (origin === "Tank") {
    return (
      <g>
        {/* Sword right */}
        <rect x={handR - 3} y={wY - 50} width={6} height={70} rx={2} fill="#c0c0c0" />
        <rect x={handR - 12} y={wY - 12} width={24} height={6} rx={2} fill="#888" />
        <polygon points={`${handR},${wY - 60} ${handR - 5},${wY - 50} ${handR + 5},${wY - 50}`} fill="#e0e0e0" />
        {/* Shield left */}
        <ellipse cx={handL} cy={wY} rx={22} ry={28} fill={armorColor} stroke={accentColor} strokeWidth={2} />
        <rect x={handL - 14} y={wY - 18} width={28} height={36} rx={6} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <line x1={handL} y1={wY - 18} x2={handL} y2={wY + 18} stroke={accentColor} strokeWidth={2} />
        <line x1={handL - 14} y1={wY} x2={handL + 14} y2={wY} stroke={accentColor} strokeWidth={2} />
      </g>
    );
  }
  if (origin === "Assassin") {
    return (
      <g>
        {/* Dual blades */}
        <rect x={handR - 2} y={wY - 48} width={4} height={55} rx={1} fill="#9c27b0" opacity={0.9} />
        <polygon points={`${handR},${wY - 58} ${handR - 3},${wY - 48} ${handR + 3},${wY - 48}`} fill="#e040fb" />
        <rect x={handL - 2} y={wY - 48} width={4} height={55} rx={1} fill="#9c27b0" opacity={0.9} />
        <polygon points={`${handL},${wY - 58} ${handL - 3},${wY - 48} ${handL + 3},${wY - 48}`} fill="#e040fb" />
        {/* Cross guards */}
        <rect x={handR - 9} y={wY + 4} width={18} height={4} rx={1} fill="#6a0080" />
        <rect x={handL - 9} y={wY + 4} width={18} height={4} rx={1} fill="#6a0080" />
      </g>
    );
  }
  if (origin === "Mage") {
    // Staff centered
    return (
      <g>
        <rect x={cx + bodyW / 2 + 14} y={wY - 80} width={5} height={100} rx={2} fill="#4a2080" />
        {/* Orb at top */}
        <circle cx={cx + bodyW / 2 + 16} cy={wY - 86} r={14} fill={accentColor} opacity={0.25} />
        <circle cx={cx + bodyW / 2 + 16} cy={wY - 86} r={9} fill={accentColor} opacity={0.7} />
        <circle cx={cx + bodyW / 2 + 16} cy={wY - 86} r={4} fill="white" opacity={0.9} />
        {/* Magic sparks */}
        {[0, 72, 144, 216, 288].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const sx = (cx + bodyW / 2 + 16) + Math.cos(rad) * 18;
          const sy = (wY - 86) + Math.sin(rad) * 18;
          return <circle key={i} cx={sx} cy={sy} r={2} fill={accentColor} opacity={0.6} />;
        })}
      </g>
    );
  }
  if (origin === "Ranger") {
    return (
      <g>
        {/* Bow arc */}
        <path d={`M ${handL} ${wY - 50} Q ${handL - 28} ${wY} ${handL} ${wY + 50}`}
          fill="none" stroke="#5d4037" strokeWidth={5} strokeLinecap="round" />
        {/* Bowstring */}
        <line x1={handL} y1={wY - 50} x2={handL} y2={wY + 50} stroke="#fff" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
        {/* Arrow nocked */}
        <line x1={handL} y1={wY} x2={handR + 10} y2={wY} stroke="#8d6e63" strokeWidth={2} />
        <polygon points={`${handR + 10},${wY} ${handR + 2},${wY - 4} ${handR + 2},${wY + 4}`} fill={accentColor} />
        <line x1={handL} y1={wY} x2={handL - 8} y2={wY - 8} stroke="#558b2f" strokeWidth={2} />
        <line x1={handL} y1={wY} x2={handL - 8} y2={wY + 8} stroke="#558b2f" strokeWidth={2} />
      </g>
    );
  }
  if (origin === "Berserker") {
    return (
      <g>
        {/* Left axe */}
        <rect x={handL - 2} y={wY - 45} width={5} height={65} rx={2} fill="#5d4037" />
        <path d={`M ${handL - 2} ${wY - 40} Q ${handL - 28} ${wY - 20} ${handL - 2} ${wY}`} fill={accentColor} opacity={0.9} />
        {/* Right axe */}
        <rect x={handR - 3} y={wY - 45} width={5} height={65} rx={2} fill="#5d4037" />
        <path d={`M ${handR + 3} ${wY - 40} Q ${handR + 28} ${wY - 20} ${handR + 3} ${wY}`} fill={accentColor} opacity={0.9} />
        {/* Battle scratches on axes */}
        <line x1={handL - 8} y1={wY - 30} x2={handL - 22} y2={wY - 15} stroke="#333" strokeWidth={1} />
        <line x1={handR + 8} y1={wY - 30} x2={handR + 22} y2={wY - 15} stroke="#333" strokeWidth={1} />
      </g>
    );
  }
  if (origin === "Paladin") {
    return (
      <g>
        {/* Holy sword right */}
        <rect x={handR - 3} y={wY - 60} width={6} height={80} rx={2} fill="#ffd600" />
        <rect x={handR - 14} y={wY - 16} width={28} height={7} rx={2} fill="#ff8f00" />
        <polygon points={`${handR},${wY - 72} ${handR - 5},${wY - 60} ${handR + 5},${wY - 60}`} fill="white" />
        {/* Holy symbol glow */}
        <circle cx={handR} cy={wY - 40} r={10} fill="none" stroke="#ffe082" strokeWidth={1.5} opacity={0.6} />
        {/* Shield left - round holy shield */}
        <circle cx={handL} cy={wY} r={26} fill={armorColor} stroke={accentColor} strokeWidth={2.5} />
        <circle cx={handL} cy={wY} r={16} fill="none" stroke={accentColor} strokeWidth={1.5} opacity={0.7} />
        <line x1={handL} y1={wY - 16} x2={handL} y2={wY + 16} stroke={accentColor} strokeWidth={2} />
        <line x1={handL - 16} y1={wY} x2={handL + 16} y2={wY} stroke={accentColor} strokeWidth={2} />
      </g>
    );
  }
  return null;
}

// ── Armor overlay per class ───────────────────────────────────────────────────

function ArmorOverlay({ origin, cx, bodyTopY, bodyW, bodyH, hipW, armorColor, accentColor, skinTone }: {
  origin: OriginClass; cx: number; bodyTopY: number; bodyW: number; bodyH: number;
  hipW: number; armorColor: string; accentColor: string; skinTone: string;
}) {
  if (origin === "Tank") {
    return (
      <g>
        {/* Plate chest */}
        <rect x={cx - bodyW / 2 - 4} y={bodyTopY} width={bodyW + 8} height={bodyH * 0.55} rx={6}
          fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        {/* Breastplate center ridge */}
        <rect x={cx - 4} y={bodyTopY + 4} width={8} height={bodyH * 0.45} rx={2} fill={accentColor} opacity={0.5} />
        {/* Pauldrons */}
        <ellipse cx={cx - bodyW / 2 - 12} cy={bodyTopY + 8} rx={14} ry={10} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <ellipse cx={cx + bodyW / 2 + 12} cy={bodyTopY + 8} rx={14} ry={10} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        {/* Lower belt */}
        <rect x={cx - hipW / 2 - 2} y={bodyTopY + bodyH * 0.55 - 4} width={hipW + 4} height={14} rx={4}
          fill={accentColor} opacity={0.7} />
        {/* Greaves/shin guards */}
        <rect x={cx - hipW * 0.4 - 6} y={bodyTopY + bodyH + 10} width={hipW * 0.38 + 8} height={20} rx={3}
          fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <rect x={cx + 2} y={bodyTopY + bodyH + 10} width={hipW * 0.38 + 8} height={20} rx={3}
          fill={armorColor} stroke={accentColor} strokeWidth={1} />
      </g>
    );
  }
  if (origin === "Assassin") {
    return (
      <g>
        {/* Dark hood / cowl */}
        <ellipse cx={cx} cy={bodyTopY - 12} rx={bodyW * 0.55} ry={18} fill={armorColor} opacity={0.85} />
        {/* Chest harness straps */}
        <line x1={cx - bodyW / 2 + 4} y1={bodyTopY} x2={cx + 6} y2={bodyTopY + bodyH * 0.45} stroke={accentColor} strokeWidth={2} opacity={0.8} />
        <line x1={cx + bodyW / 2 - 4} y1={bodyTopY} x2={cx - 6} y2={bodyTopY + bodyH * 0.45} stroke={accentColor} strokeWidth={2} opacity={0.8} />
        {/* Leather chest */}
        <rect x={cx - bodyW / 2 + 2} y={bodyTopY + 4} width={bodyW - 4} height={bodyH * 0.5} rx={6}
          fill={armorColor} opacity={0.7} />
        {/* Slim shin wraps */}
        <rect x={cx - hipW * 0.4 - 2} y={bodyTopY + bodyH + 14} width={hipW * 0.38 + 2} height={16} rx={2}
          fill={armorColor} opacity={0.6} />
        <rect x={cx + 2} y={bodyTopY + bodyH + 14} width={hipW * 0.38 + 2} height={16} rx={2}
          fill={armorColor} opacity={0.6} />
      </g>
    );
  }
  if (origin === "Mage") {
    return (
      <g>
        {/* Flowing robe - wider bottom */}
        <path d={`M ${cx - bodyW / 2 - 4} ${bodyTopY + 6}
          L ${cx - bodyW / 2 - 16} ${bodyTopY + bodyH + 20}
          Q ${cx} ${bodyTopY + bodyH + 30} ${cx + bodyW / 2 + 16} ${bodyTopY + bodyH + 20}
          L ${cx + bodyW / 2 + 4} ${bodyTopY + 6} Z`}
          fill={armorColor} opacity={0.85} />
        {/* Robe collar */}
        <ellipse cx={cx} cy={bodyTopY + 6} rx={bodyW * 0.45} ry={10} fill={armorColor} stroke={accentColor} strokeWidth={1} />
        {/* Magic sigil on chest */}
        <circle cx={cx} cy={bodyTopY + bodyH * 0.3} r={10} fill="none" stroke={accentColor} strokeWidth={1.5} opacity={0.7} />
        <polygon points={`${cx},${bodyTopY + bodyH * 0.3 - 8} ${cx - 7},${bodyTopY + bodyH * 0.3 + 4} ${cx + 7},${bodyTopY + bodyH * 0.3 + 4}`}
          fill="none" stroke={accentColor} strokeWidth={1.5} opacity={0.6} />
        {/* Belt */}
        <rect x={cx - bodyW / 2 - 2} y={bodyTopY + bodyH * 0.52} width={bodyW + 4} height={8} rx={3}
          fill={accentColor} opacity={0.6} />
      </g>
    );
  }
  if (origin === "Ranger") {
    return (
      <g>
        {/* Leather chest */}
        <rect x={cx - bodyW / 2 + 2} y={bodyTopY + 2} width={bodyW - 4} height={bodyH * 0.55} rx={5}
          fill={armorColor} opacity={0.8} />
        {/* Quiver on back (right side) */}
        <rect x={cx + bodyW / 2 + 2} y={bodyTopY - 10} width={10} height={40} rx={4} fill="#5d4037" />
        <line x1={cx + bodyW / 2 + 7} y1={bodyTopY - 10} x2={cx + bodyW / 2 + 7} y2={bodyTopY - 22} stroke="#8d6e63" strokeWidth={2} />
        <line x1={cx + bodyW / 2 + 4} y1={bodyTopY - 10} x2={cx + bodyW / 2 + 4} y2={bodyTopY - 20} stroke="#8d6e63" strokeWidth={2} />
        {/* Hood */}
        <ellipse cx={cx} cy={bodyTopY - 10} rx={bodyW * 0.48} ry={14} fill={armorColor} opacity={0.7} />
        {/* Belt with pouch */}
        <rect x={cx - hipW / 2 - 2} y={bodyTopY + bodyH * 0.55} width={hipW + 4} height={10} rx={3}
          fill="#4a3728" opacity={0.9} />
        <rect x={cx - 8} y={bodyTopY + bodyH * 0.52} width={16} height={16} rx={3} fill="#5d4037" />
      </g>
    );
  }
  if (origin === "Berserker") {
    return (
      <g>
        {/* Bare upper half — just shoulder armor */}
        <ellipse cx={cx - bodyW / 2 - 10} cy={bodyTopY + 6} rx={16} ry={11} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <ellipse cx={cx + bodyW / 2 + 10} cy={bodyTopY + 6} rx={16} ry={11} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        {/* Spikes on pauldrons */}
        <polygon points={`${cx - bodyW / 2 - 10},${bodyTopY - 10} ${cx - bodyW / 2 - 16},${bodyTopY + 2} ${cx - bodyW / 2 - 4},${bodyTopY + 2}`}
          fill={accentColor} />
        <polygon points={`${cx + bodyW / 2 + 10},${bodyTopY - 10} ${cx + bodyW / 2 + 4},${bodyTopY + 2} ${cx + bodyW / 2 + 16},${bodyTopY + 2}`}
          fill={accentColor} />
        {/* Battle scars on torso */}
        <line x1={cx - 10} y1={bodyTopY + 20} x2={cx + 4} y2={bodyTopY + 40} stroke="#ff1744" strokeWidth={1.5} opacity={0.7} />
        <line x1={cx + 8} y1={bodyTopY + 14} x2={cx - 2} y2={bodyTopY + 30} stroke="#ff1744" strokeWidth={1} opacity={0.5} />
        {/* Waistband */}
        <rect x={cx - hipW / 2 - 2} y={bodyTopY + bodyH * 0.55} width={hipW + 4} height={12} rx={3}
          fill={armorColor} opacity={0.9} />
        {/* Fur trim bottom */}
        <path d={`M ${cx - hipW / 2 - 2} ${bodyTopY + bodyH * 0.67} Q ${cx} ${bodyTopY + bodyH * 0.75} ${cx + hipW / 2 + 2} ${bodyTopY + bodyH * 0.67}`}
          fill="none" stroke="#6d4c41" strokeWidth={5} strokeLinecap="round" />
      </g>
    );
  }
  if (origin === "Paladin") {
    return (
      <g>
        {/* Plate chest with cross */}
        <rect x={cx - bodyW / 2 - 5} y={bodyTopY} width={bodyW + 10} height={bodyH * 0.6} rx={7}
          fill={armorColor} stroke={accentColor} strokeWidth={2} />
        {/* Holy cross embossed */}
        <rect x={cx - 3} y={bodyTopY + 8} width={6} height={bodyH * 0.4} rx={2} fill={accentColor} opacity={0.7} />
        <rect x={cx - 14} y={bodyTopY + 20} width={28} height={5} rx={2} fill={accentColor} opacity={0.7} />
        {/* Pauldrons with holy engravings */}
        <ellipse cx={cx - bodyW / 2 - 14} cy={bodyTopY + 8} rx={16} ry={12} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        <ellipse cx={cx + bodyW / 2 + 14} cy={bodyTopY + 8} rx={16} ry={12} fill={armorColor} stroke={accentColor} strokeWidth={1.5} />
        {/* Divine glow from chest */}
        <ellipse cx={cx} cy={bodyTopY + bodyH * 0.28} rx={14} ry={14} fill={accentColor} opacity={0.12} />
        {/* Faulds (hip plates) */}
        <rect x={cx - hipW / 2 - 4} y={bodyTopY + bodyH * 0.58} width={hipW + 8} height={16} rx={5}
          fill={armorColor} stroke={accentColor} strokeWidth={1} />
        {/* Greaves */}
        <rect x={cx - hipW * 0.4 - 6} y={bodyTopY + bodyH + 8} width={hipW * 0.38 + 10} height={26} rx={4}
          fill={armorColor} stroke={accentColor} strokeWidth={1} />
        <rect x={cx + 2} y={bodyTopY + bodyH + 8} width={hipW * 0.38 + 10} height={26} rx={4}
          fill={armorColor} stroke={accentColor} strokeWidth={1} />
      </g>
    );
  }
  return null;
}

// ── 2D Character Preview ───────────────────────────────────────────────────────

function CharacterPreview({ char }: { char: OGCharacter }) {
  const isFemale = char.gender === "Female";
  const isSlim = char.bodyType === "Slim";
  const isAthletic = char.bodyType === "Athletic";
  const isCurvy = char.bodyType === "Curvy";
  const isTall = char.height === "Tall";
  const isShort = char.height === "Short";
  const isAfro = char.hairStyle === "Afro";
  const isDreads = char.hairStyle === "Dreads";
  const isMohawk = char.hairStyle === "Mohawk";
  const isBald = char.hairStyle === "Bald";
  const isLong = char.hairStyle === "Long" || char.hairStyle === "Long Straight" || char.hairStyle === "Braids";
  const isPonytail = char.hairStyle === "Ponytail";
  const isBob = char.hairStyle === "Short Bob" || char.hairStyle === "Buzz Cut" || char.hairStyle === "Fade" || char.hairStyle === "Pixie";

  const totalH = isTall ? 260 : isShort ? 190 : 225;
  const headR = isTall ? 36 : isShort ? 28 : 32;
  const bodyW = isSlim ? 44 : isAthletic ? 66 : isCurvy ? 72 : 56;
  const bodyH = isTall ? 105 : isShort ? 72 : 90;
  const hipW = isCurvy ? bodyW + 18 : isFemale ? bodyW + 8 : bodyW - 2;
  const legH = isTall ? 96 : isShort ? 62 : 78;

  const cx = 120;
  const headY = 30 + headR;
  const neckY = headY + headR;
  const bodyTopY = neckY + 8;
  const bodyBotY = bodyTopY + bodyH;
  const legBotY = bodyBotY + legH;

  const hairColor = char.hairStyle === "Bald" ? "none" : char.hairColor;

  const classData = CLASS_ORIGINS.find((c) => c.id === char.origin) || CLASS_ORIGINS[0];

  return (
    <svg
      viewBox={`0 0 240 ${totalH + 30}`}
      width="100%"
      height="100%"
      style={{ filter: `drop-shadow(0 0 22px ${char.auraColor}aa)` }}
    >
      <defs>
        <radialGradient id="aura-glow" cx="50%" cy="100%" r="50%">
          <stop offset="0%" stopColor={char.auraColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={char.auraColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground aura */}
      <ellipse cx={cx} cy={legBotY + 10} rx={bodyW * 0.8} ry={10}
        fill={char.auraColor} opacity={0.35} />
      <ellipse cx={cx} cy={legBotY + 10} rx={bodyW * 1.6} ry={20}
        fill="url(#aura-glow)" />

      {/* ── HAIR (back layer) ── */}
      {isAfro && (
        <ellipse cx={cx} cy={headY - 4} rx={headR + 15} ry={headR + 13}
          fill={hairColor} opacity={0.95} />
      )}
      {isDreads && (
        <>
          {[-22, -13, -4, 5, 14, 23].map((dx, i) => (
            <rect key={i}
              x={cx + dx - 4} y={headY + headR - 8}
              width={8} height={isLong ? 90 : 55}
              rx={4} fill={hairColor} opacity={0.88}
            />
          ))}
        </>
      )}
      {isLong && !isDreads && (
        <rect x={cx - headR + 2} y={headY + headR * 0.2}
          width={(headR - 2) * 2} height={bodyH * 0.65}
          rx={10} fill={hairColor} opacity={0.82} />
      )}
      {isPonytail && (
        <>
          <rect x={cx - 7} y={headY + headR - 5} width={14} height={65} rx={7}
            fill={hairColor} opacity={0.9} />
          <ellipse cx={cx} cy={headY + headR - 5} rx={9} ry={7} fill={hairColor} opacity={0.9} />
        </>
      )}

      {/* ── LEGS ── */}
      <rect x={cx - hipW * 0.4 - 5} y={bodyBotY} width={hipW * 0.4} height={legH}
        rx={7} fill={char.skinTone} />
      <rect x={cx + 5} y={bodyBotY} width={hipW * 0.4} height={legH}
        rx={7} fill={char.skinTone} />
      {/* Boots */}
      <rect x={cx - hipW * 0.4 - 10} y={legBotY - 14} width={hipW * 0.4 + 12} height={20}
        rx={5} fill="#1a1a1a" />
      <rect x={cx + 1} y={legBotY - 14} width={hipW * 0.4 + 12} height={20}
        rx={5} fill="#1a1a1a" />
      {/* Boot shine */}
      <ellipse cx={cx - hipW * 0.21} cy={legBotY + 6} rx={hipW * 0.24} ry={5}
        fill="#333" />
      <ellipse cx={cx + hipW * 0.21 + 10} cy={legBotY + 6} rx={hipW * 0.24} ry={5}
        fill="#333" />

      {/* ── HIP / TORSO base ── */}
      <rect x={cx - hipW / 2} y={bodyBotY - 16} width={hipW} height={24}
        rx={9} fill={char.skinTone} />
      <rect x={cx - bodyW / 2} y={bodyTopY} width={bodyW} height={bodyH}
        rx={12} fill={char.skinTone} />

      {/* ── ARMS (skin) ── */}
      <rect x={cx - bodyW / 2 - 16} y={bodyTopY + 6} width={16} height={bodyH * 0.68}
        rx={8} fill={char.skinTone} />
      <rect x={cx + bodyW / 2} y={bodyTopY + 6} width={16} height={bodyH * 0.68}
        rx={8} fill={char.skinTone} />
      {/* Hands */}
      <ellipse cx={cx - bodyW / 2 - 8} cy={bodyTopY + 8 + bodyH * 0.68 + 7}
        rx={9} ry={9} fill={char.skinTone} />
      <ellipse cx={cx + bodyW / 2 + 8} cy={bodyTopY + 8 + bodyH * 0.68 + 7}
        rx={9} ry={9} fill={char.skinTone} />

      {/* ── ARMOR / CLASS OVERLAY ── */}
      <ArmorOverlay
        origin={char.origin} cx={cx} bodyTopY={bodyTopY} bodyW={bodyW} bodyH={bodyH}
        hipW={hipW} armorColor={classData.armorColor} accentColor={classData.accentColor}
        skinTone={char.skinTone}
      />

      {/* ── NECK ── */}
      <rect x={cx - 9} y={neckY} width={18} height={12} rx={6} fill={char.skinTone} />

      {/* ── HEAD ── */}
      {/* Jaw / chin */}
      <ellipse cx={cx} cy={headY + headR * 0.15} rx={headR * 0.72} ry={headR * 0.55}
        fill={char.skinTone} />
      {/* Main head */}
      <ellipse cx={cx} cy={headY} rx={headR} ry={headR + 3} fill={char.skinTone} />
      {/* Ears */}
      <ellipse cx={cx - headR + 2} cy={headY + 2} rx={5} ry={7} fill={char.skinTone} />
      <ellipse cx={cx + headR - 2} cy={headY + 2} rx={5} ry={7} fill={char.skinTone} />
      <ellipse cx={cx - headR + 3} cy={headY + 2} rx={3} ry={4} fill={char.skinTone}
        style={{ filter: "brightness(0.92)" }} />
      <ellipse cx={cx + headR - 3} cy={headY + 2} rx={3} ry={4} fill={char.skinTone}
        style={{ filter: "brightness(0.92)" }} />

      {/* ── HAIR (front layer) ── */}
      {!isBald && !isAfro && !isDreads && !isLong && !isPonytail && (
        <ellipse cx={cx} cy={headY - headR * 0.32}
          rx={headR + 1} ry={headR * 0.56}
          fill={hairColor} opacity={0.93} />
      )}
      {isMohawk && (
        <>
          <rect x={cx - 6} y={headY - headR - 26} width={12} height={30}
            rx={6} fill={hairColor} opacity={0.95} />
          {[-4, 0, 4].map((dx, i) => (
            <ellipse key={i} cx={cx + dx} cy={headY - headR - 14} rx={3} ry={8}
              fill={hairColor} opacity={0.7} />
          ))}
        </>
      )}
      {isBob && (
        <>
          <ellipse cx={cx} cy={headY - headR * 0.3}
            rx={headR + 1} ry={headR * 0.6}
            fill={hairColor} opacity={0.93} />
          <ellipse cx={cx - headR + 1} cy={headY + 4}
            rx={7} ry={headR * 0.48} fill={hairColor} opacity={0.85} />
          <ellipse cx={cx + headR - 1} cy={headY + 4}
            rx={7} ry={headR * 0.48} fill={hairColor} opacity={0.85} />
        </>
      )}

      {/* ── FACE DETAILS ── */}
      {/* Brow ridge shadow */}
      <rect x={cx - 15} y={headY - 9} width={30} height={3} rx={2}
        fill={char.skinTone} style={{ filter: "brightness(0.82)" }} />
      {/* Eyebrows */}
      <path d={`M ${cx - 15} ${headY - 8} Q ${cx - 9} ${headY - 13} ${cx - 3} ${headY - 9}`}
        fill="none" stroke={hairColor === "none" ? "#333" : hairColor} strokeWidth={2.5} strokeLinecap="round" />
      <path d={`M ${cx + 3} ${headY - 9} Q ${cx + 9} ${headY - 13} ${cx + 15} ${headY - 8}`}
        fill="none" stroke={hairColor === "none" ? "#333" : hairColor} strokeWidth={2.5} strokeLinecap="round" />

      {/* Female eyelashes */}
      {isFemale && (
        <>
          {[-14, -10, -6].map((dx, i) => (
            <line key={i} x1={cx + dx} y1={headY - 6} x2={cx + dx - 1} y2={headY - 10}
              stroke="#111" strokeWidth={1.2} />
          ))}
          {[6, 10, 14].map((dx, i) => (
            <line key={i} x1={cx + dx} y1={headY - 6} x2={cx + dx + 1} y2={headY - 10}
              stroke="#111" strokeWidth={1.2} />
          ))}
        </>
      )}

      {/* Eye whites */}
      <ellipse cx={cx - 11} cy={headY - 2} rx={6} ry={7} fill="white" />
      <ellipse cx={cx + 11} cy={headY - 2} rx={6} ry={7} fill="white" />
      {/* Irises */}
      <ellipse cx={cx - 11} cy={headY - 1} rx={4.5} ry={5} fill={char.eyeColor} />
      <ellipse cx={cx + 11} cy={headY - 1} rx={4.5} ry={5} fill={char.eyeColor} />
      {/* Pupils */}
      <ellipse cx={cx - 10.5} cy={headY - 0.5} rx={2} ry={2.5} fill="#000" />
      <ellipse cx={cx + 11.5} cy={headY - 0.5} rx={2} ry={2.5} fill="#000" />
      {/* Eye shine */}
      <ellipse cx={cx - 9} cy={headY - 2.5} rx={1.2} ry={1.2} fill="white" />
      <ellipse cx={cx + 13} cy={headY - 2.5} rx={1.2} ry={1.2} fill="white" />
      {/* Eyelids */}
      <path d={`M ${cx - 17} ${headY - 2} Q ${cx - 11} ${headY - 10} ${cx - 5} ${headY - 2}`}
        fill="none" stroke="#33333355" strokeWidth={1.5} />
      <path d={`M ${cx + 5} ${headY - 2} Q ${cx + 11} ${headY - 10} ${cx + 17} ${headY - 2}`}
        fill="none" stroke="#33333355" strokeWidth={1.5} />

      {/* Nose */}
      <path d={`M ${cx - 4} ${headY + 6} Q ${cx - 2} ${headY + 12} ${cx} ${headY + 12} Q ${cx + 2} ${headY + 12} ${cx + 4} ${headY + 6}`}
        fill="none" stroke={char.skinTone} strokeWidth={2}
        style={{ filter: "brightness(0.8)" }} strokeLinecap="round" />
      <ellipse cx={cx - 4} cy={headY + 12} rx={3} ry={1.5}
        fill={char.skinTone} style={{ filter: "brightness(0.85)" }} />
      <ellipse cx={cx + 4} cy={headY + 12} rx={3} ry={1.5}
        fill={char.skinTone} style={{ filter: "brightness(0.85)" }} />

      {/* Mouth */}
      {isFemale ? (
        <>
          <path d={`M ${cx - 8} ${headY + 17} Q ${cx} ${headY + 23} ${cx + 8} ${headY + 17}`}
            fill="#d4687a" />
          <path d={`M ${cx - 8} ${headY + 17} Q ${cx} ${headY + 20} ${cx + 8} ${headY + 17}`}
            fill="#e8a0aa" />
        </>
      ) : (
        <path d={`M ${cx - 7} ${headY + 18} Q ${cx} ${headY + 23} ${cx + 7} ${headY + 18}`}
          fill="none" stroke="#8b4513" strokeWidth={2} strokeLinecap="round" />
      )}

      {/* ── WEAPONS ── */}
      <WeaponSVG
        origin={char.origin} cx={cx} bodyTopY={bodyTopY} bodyW={bodyW}
        skinTone={char.skinTone} accentColor={classData.accentColor} armorColor={classData.armorColor}
      />

      {/* Aura ring around figure */}
      <ellipse cx={cx} cy={headY}
        rx={headR + 10} ry={headR + 13}
        fill="none"
        stroke={char.auraColor}
        strokeWidth={1.5}
        strokeDasharray="5 7"
        opacity={0.5}
      />
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
