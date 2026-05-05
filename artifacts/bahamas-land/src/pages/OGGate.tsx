import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hashPin } from "@/lib/players";
import { Key, ArrowRight, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { audio } from "@/lib/audio";
import gateImg from "@assets/generated_images/bld_og_gate.png";

// ── Character options ──────────────────────────────────────────────────────────

const GENDERS = ["Male", "Female"] as const;
type Gender = typeof GENDERS[number];

const BODY_TYPES = ["Slim", "Average", "Athletic", "Curvy"] as const;
const HEIGHTS = ["Short", "Medium", "Tall"] as const;

const SKIN_TONES = [
  { label: "Ivory",    value: "#fde8d0" },
  { label: "Peach",   value: "#f4c2a1" },
  { label: "Tan",     value: "#d4956a" },
  { label: "Brown",   value: "#a0632a" },
  { label: "Dark",    value: "#5c3317" },
  { label: "Ebony",   value: "#2e1503" },
];

const HAIR_STYLES: Record<Gender, string[]> = {
  Male:   ["Buzz Cut", "Fade", "Curly", "Long", "Mohawk", "Bald", "Dreads", "Afro"],
  Female: ["Short Bob", "Long Straight", "Curly", "Braids", "Ponytail", "Afro", "Dreads", "Pixie"],
};

const HAIR_COLORS = [
  { label: "Black",    value: "#111111" },
  { label: "Brown",    value: "#5c3d2e" },
  { label: "Blonde",   value: "#f5d27a" },
  { label: "Red",      value: "#b22222" },
  { label: "Grey",     value: "#aaaaaa" },
  { label: "White",    value: "#eeeeee" },
  { label: "Magenta",  value: "#ff2d8c" },
  { label: "Cyan",     value: "#3df7ff" },
  { label: "Purple",   value: "#bd93f9" },
  { label: "Green",    value: "#39ff14" },
];

const EYE_COLORS = [
  { label: "Brown",  value: "#5c3d2e" },
  { label: "Blue",   value: "#2196f3" },
  { label: "Green",  value: "#388e3c" },
  { label: "Grey",   value: "#78909c" },
  { label: "Hazel",  value: "#8d6e63" },
  { label: "Red",    value: "#e53935" },
  { label: "Cyan",   value: "#3df7ff" },
  { label: "Gold",   value: "#ffe93d" },
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

// ── Default character ─────────────────────────────────────────────────────────

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
});

// ── Cycle helper ──────────────────────────────────────────────────────────────

function cycle<T>(arr: readonly T[], current: T, dir: 1 | -1): T {
  const idx = arr.indexOf(current);
  return arr[(idx + dir + arr.length) % arr.length];
}

// ── 2D Character Preview ──────────────────────────────────────────────────────

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

  const totalH = isTall ? 240 : isShort ? 180 : 210;
  const headR = isTall ? 36 : isShort ? 28 : 32;
  const bodyW = isSlim ? 44 : isAthletic ? 64 : isCurvy ? 72 : 56;
  const bodyH = isTall ? 100 : isShort ? 70 : 86;
  const hipW = isCurvy ? bodyW + 16 : isFemale ? bodyW + 6 : bodyW - 4;
  const legH = isTall ? 90 : isShort ? 60 : 74;

  const cx = 110;
  const headY = 20 + headR;
  const neckY = headY + headR;
  const bodyTopY = neckY + 6;
  const bodyBotY = bodyTopY + bodyH;
  const legBotY = bodyBotY + legH;

  const hairColor = char.hairStyle === "Bald" ? "none" : char.hairColor;

  return (
    <svg
      viewBox={`0 0 220 ${totalH + 20}`}
      width="100%"
      height="100%"
      style={{ filter: `drop-shadow(0 0 18px ${char.auraColor}99)` }}
    >
      {/* Aura glow */}
      <ellipse cx={cx} cy={legBotY + 8} rx={bodyW * 0.7} ry={8}
        fill={char.auraColor} opacity={0.3} />

      {/* ── HAIR (back layer) ── */}
      {isAfro && (
        <ellipse cx={cx} cy={headY - 4} rx={headR + 14} ry={headR + 12}
          fill={hairColor} opacity={0.95} />
      )}
      {isDreads && (
        <>
          {[-20, -12, -4, 4, 12, 20].map((dx, i) => (
            <rect key={i}
              x={cx + dx - 4} y={headY + headR - 6}
              width={8} height={isLong ? 80 : 50}
              rx={4} fill={hairColor} opacity={0.9}
            />
          ))}
        </>
      )}
      {isLong && !isDreads && (
        <rect x={cx - headR + 2} y={headY}
          width={(headR - 2) * 2} height={bodyH * 0.7}
          rx={8} fill={hairColor} opacity={0.85} />
      )}
      {isPonytail && (
        <rect x={cx - 6} y={headY + headR - 4}
          width={12} height={60}
          rx={6} fill={hairColor} opacity={0.9} />
      )}

      {/* ── LEGS ── */}
      {/* Left leg */}
      <rect
        x={cx - hipW * 0.4 - 4} y={bodyBotY}
        width={hipW * 0.38} height={legH}
        rx={6} fill={char.skinTone}
      />
      {/* Right leg */}
      <rect
        x={cx + 4} y={bodyBotY}
        width={hipW * 0.38} height={legH}
        rx={6} fill={char.skinTone}
      />
      {/* Shoes */}
      <ellipse cx={cx - hipW * 0.21} cy={legBotY} rx={hipW * 0.22} ry={7}
        fill="#222" />
      <ellipse cx={cx + hipW * 0.21} cy={legBotY} rx={hipW * 0.22} ry={7}
        fill="#222" />

      {/* ── TORSO / HIPS ── */}
      {/* Hip area */}
      <rect
        x={cx - hipW / 2} y={bodyBotY - 14}
        width={hipW} height={22}
        rx={8} fill={char.auraColor} opacity={0.85}
      />
      {/* Body */}
      <rect
        x={cx - bodyW / 2} y={bodyTopY}
        width={bodyW} height={bodyH}
        rx={10} fill={char.auraColor} opacity={0.9}
      />
      {/* Shirt detail */}
      <rect
        x={cx - bodyW / 2 + 6} y={bodyTopY + 8}
        width={bodyW - 12} height={bodyH - 16}
        rx={7} fill={char.auraColor} opacity={0.5}
      />

      {/* ── ARMS ── */}
      {/* Left arm */}
      <rect
        x={cx - bodyW / 2 - 14} y={bodyTopY + 4}
        width={14} height={bodyH * 0.65}
        rx={7} fill={char.skinTone}
      />
      {/* Right arm */}
      <rect
        x={cx + bodyW / 2} y={bodyTopY + 4}
        width={14} height={bodyH * 0.65}
        rx={7} fill={char.skinTone}
      />
      {/* Hands */}
      <ellipse cx={cx - bodyW / 2 - 7} cy={bodyTopY + 4 + bodyH * 0.65 + 6}
        rx={8} ry={8} fill={char.skinTone} />
      <ellipse cx={cx + bodyW / 2 + 7} cy={bodyTopY + 4 + bodyH * 0.65 + 6}
        rx={8} ry={8} fill={char.skinTone} />

      {/* ── NECK ── */}
      <rect x={cx - 8} y={neckY} width={16} height={10}
        fill={char.skinTone} />

      {/* ── HEAD ── */}
      <ellipse cx={cx} cy={headY}
        rx={headR} ry={headR + 2}
        fill={char.skinTone}
        stroke={char.hairColor === "#ffffff" ? "#ccc" : "none"} strokeWidth={1}
      />

      {/* ── HAIR (front layer) ── */}
      {!isBald && !isAfro && !isDreads && !isLong && !isPonytail && (
        <ellipse cx={cx} cy={headY - headR * 0.3}
          rx={headR} ry={headR * 0.55}
          fill={hairColor} opacity={0.92} />
      )}
      {isMohawk && (
        <rect x={cx - 5} y={headY - headR - 22}
          width={10} height={26}
          rx={5} fill={hairColor} opacity={0.95} />
      )}
      {isBob && (
        <>
          <ellipse cx={cx} cy={headY - headR * 0.3}
            rx={headR} ry={headR * 0.6}
            fill={hairColor} opacity={0.92} />
          {/* Side bits */}
          <ellipse cx={cx - headR + 2} cy={headY + 2}
            rx={7} ry={headR * 0.45}
            fill={hairColor} opacity={0.85} />
          <ellipse cx={cx + headR - 2} cy={headY + 2}
            rx={7} ry={headR * 0.45}
            fill={hairColor} opacity={0.85} />
        </>
      )}

      {/* Female eyelashes */}
      {isFemale && (
        <>
          <rect x={cx - 14} y={headY - 5} width={12} height={2} rx={1} fill="#111" />
          <rect x={cx + 2} y={headY - 5} width={12} height={2} rx={1} fill="#111" />
        </>
      )}

      {/* ── EYES ── */}
      <ellipse cx={cx - 10} cy={headY - 2} rx={5} ry={6}
        fill="white" />
      <ellipse cx={cx + 10} cy={headY - 2} rx={5} ry={6}
        fill="white" />
      <ellipse cx={cx - 10} cy={headY - 1} rx={3.5} ry={4}
        fill={char.eyeColor} />
      <ellipse cx={cx + 10} cy={headY - 1} rx={3.5} ry={4}
        fill={char.eyeColor} />
      {/* Pupils */}
      <ellipse cx={cx - 9.5} cy={headY - 1} rx={1.5} ry={2} fill="#000" />
      <ellipse cx={cx + 10.5} cy={headY - 1} rx={1.5} ry={2} fill="#000" />
      {/* Eye shine */}
      <ellipse cx={cx - 8.5} cy={headY - 2.5} rx={1} ry={1} fill="white" />
      <ellipse cx={cx + 11.5} cy={headY - 2.5} rx={1} ry={1} fill="white" />

      {/* ── NOSE ── */}
      <ellipse cx={cx} cy={headY + 6} rx={3} ry={2} fill={char.skinTone}
        stroke="#00000022" strokeWidth={1.5} />

      {/* ── MOUTH ── */}
      {isFemale ? (
        <path d={`M ${cx - 7} ${headY + 13} Q ${cx} ${headY + 18} ${cx + 7} ${headY + 13}`}
          fill="#e57373" stroke="none" />
      ) : (
        <path d={`M ${cx - 6} ${headY + 14} Q ${cx} ${headY + 18} ${cx + 6} ${headY + 14}`}
          fill="none" stroke="#a0522d" strokeWidth={2} strokeLinecap="round" />
      )}

      {/* Aura ring */}
      <ellipse cx={cx} cy={headY}
        rx={headR + 8} ry={headR + 10}
        fill="none"
        stroke={char.auraColor}
        strokeWidth={2}
        strokeDasharray="4 6"
        opacity={0.6}
      />
    </svg>
  );
}

// ── Picker row ────────────────────────────────────────────────────────────────

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
      <button
        onClick={() => onChange(cycle(options, value, -1))}
        className="text-white/40 hover:text-primary transition p-1"
      ><ChevronLeft className="w-4 h-4" /></button>
      <span className="flex-1 text-center text-white font-mono text-xs uppercase tracking-wider">{value}</span>
      <button
        onClick={() => onChange(cycle(options, value, 1))}
        className="text-white/40 hover:text-primary transition p-1"
      ><ChevronRight className="w-4 h-4" /></button>
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

// ── Step type ─────────────────────────────────────────────────────────────────

type Step = "gate" | "verify" | "character" | "entering";

// ── Main component ────────────────────────────────────────────────────────────

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
    localStorage.setItem("og_world_username", name);
    localStorage.setItem("og_world_color", char.auraColor);
    localStorage.setItem("og_world_char", JSON.stringify(charWithName));

    setStep("entering");
    setTimeout(() => setLocation("/og-world"), 1800);
  };

  // Fix hair style when gender changes
  const handleGenderChange = (g: Gender) => {
    setChar((c) => ({
      ...c,
      gender: g,
      hairStyle: HAIR_STYLES[g][0],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">

      {/* ── GATE STEP ── */}
      <AnimatePresence>
        {step === "gate" && (
          <motion.div
            key="gate"
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #1a0030 0%, #000 70%)" }} />

            <div className="relative z-10 flex flex-col items-center gap-6">
              {/* Gate image with animation */}
              <motion.div
                className="relative w-72 h-96"
                animate={gateOpen ? { scale: [1, 1.08, 1.04] } : {}}
                transition={{ duration: 1.5 }}
              >
                <img
                  src={gateImg}
                  alt="OG World Gate"
                  className="w-full h-full object-contain"
                  style={{
                    filter: gateOpen
                      ? "drop-shadow(0 0 60px #bd93f9) drop-shadow(0 0 120px #ff2d8c) brightness(1.4)"
                      : "drop-shadow(0 0 30px #bd93f9) brightness(1)",
                    transition: "filter 0.8s ease",
                  }}
                />
                {/* Glow pulse overlay */}
                {!gateOpen && (
                  <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: [0.1, 0.35, 0.1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    style={{
                      background: "radial-gradient(ellipse at center, #bd93f980 0%, transparent 70%)",
                      borderRadius: "50%",
                    }}
                  />
                )}
                {gateOpen && (
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.6] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{
                      background: "radial-gradient(ellipse at center, #ff2d8c60 0%, #bd93f940 40%, transparent 70%)",
                    }}
                  />
                )}
              </motion.div>

              <motion.div className="text-center space-y-1">
                <h1 className="text-3xl font-black text-purple-300 uppercase tracking-[0.3em]"
                  style={{ textShadow: "0 0 20px #bd93f9" }}>
                  OG World
                </h1>
                <p className="text-white/30 font-mono text-[11px] uppercase tracking-widest">
                  Reward card holders only
                </p>
              </motion.div>

              {!gateOpen ? (
                <motion.button
                  onClick={handleGateClick}
                  className="px-10 py-4 border-2 border-purple-400 text-purple-200 font-black uppercase tracking-[0.3em] text-sm hover:bg-purple-400 hover:text-black transition-all"
                  style={{ boxShadow: "0 0 20px #bd93f9" }}
                  animate={{ boxShadow: ["0 0 15px #bd93f9", "0 0 40px #bd93f9", "0 0 15px #bd93f9"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Enter the Gate
                </motion.button>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-purple-300 font-mono uppercase tracking-widest text-sm"
                >
                  Opening...
                </motion.p>
              )}
            </div>

            <button
              onClick={() => setLocation("/world")}
              className="absolute bottom-6 left-6 text-white/30 font-mono text-xs uppercase hover:text-primary transition"
            >
              ← Back to map
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VERIFY STEP ── */}
      <AnimatePresence>
        {step === "verify" && (
          <motion.div
            key="verify"
            className="absolute inset-0 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #0d001a 0%, #000 70%)" }} />
            <motion.div
              className="relative z-10 bg-black border-2 border-purple-500 p-8 max-w-md w-full space-y-6"
              style={{ boxShadow: "0 0 40px rgba(189,147,249,0.3)" }}
            >
              <div className="text-center space-y-2">
                <Key className="w-10 h-10 text-purple-400 mx-auto" />
                <h1 className="text-2xl font-black text-purple-300 uppercase tracking-widest">Identity Check</h1>
                <p className="text-white/40 font-mono text-xs uppercase">Only reward card holders may enter OG World</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-white/50 font-mono text-[10px] uppercase">Bahamas Username</label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="your username"
                    className="bg-black border-purple-500/50 text-primary font-mono uppercase focus:border-purple-400"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
                </div>
                <div className="space-y-1">
                  <label className="text-white/50 font-mono text-[10px] uppercase">PIN</label>
                  <Input type="password" value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    className="bg-black border-purple-500/50 text-primary font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
                </div>
                <div className="space-y-1">
                  <label className="text-white/50 font-mono text-[10px] uppercase">Card Seed (from your reward card)</label>
                  <Input value={seed} onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g. a3f9b2c1"
                    className="bg-black border-purple-500/50 text-primary font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
                </div>
              </div>

              {verifyError && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-950/40 border border-red-500/50 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 font-mono text-xs uppercase">{verifyError}</p>
                </motion.div>
              )}

              <Button onClick={handleVerify} disabled={verifying}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white font-black uppercase tracking-widest">
                {verifying ? "Verifying..." : "Verify Identity"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <button onClick={() => setStep("gate")}
                className="w-full text-white/20 font-mono text-[10px] uppercase hover:text-primary transition">
                ← back
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHARACTER STEP ── */}
      <AnimatePresence>
        {step === "character" && (
          <motion.div
            key="character"
            className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #001a0d 0%, #000 70%)" }} />

            <div className="relative z-10 w-full max-w-3xl my-auto">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-black text-primary uppercase tracking-widest"
                  style={{ textShadow: "0 0 20px #ff2d8c" }}>
                  Create Your Character
                </h1>
                <p className="text-white/30 font-mono text-[10px] uppercase">Others will see this in OG World</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                {/* ── LEFT: Preview ── */}
                <div className="md:w-56 shrink-0 flex flex-col items-center gap-3">
                  <div
                    className="w-full aspect-[3/4] max-w-[180px] md:max-w-full bg-black/60 border border-primary/30 rounded-xl overflow-hidden"
                    style={{ boxShadow: `0 0 30px ${char.auraColor}55` }}
                  >
                    <CharacterPreview char={char} />
                  </div>

                  {/* Display name */}
                  <div className="w-full max-w-[200px] space-y-1">
                    <label className="text-white/40 font-mono text-[10px] uppercase">Display Name</label>
                    <Input
                      value={char.displayName}
                      onChange={(e) => setCharField("displayName", e.target.value.slice(0, 20))}
                      placeholder="How others see you"
                      className="bg-black border-primary/50 text-primary font-mono uppercase focus:border-primary text-sm"
                    />
                  </div>
                </div>

                {/* ── RIGHT: Options ── */}
                <div className="flex-1 bg-black/50 border border-primary/20 rounded-xl p-4 space-y-4">

                  {/* Gender */}
                  <div className="space-y-1">
                    <span className="text-white/40 font-mono text-[10px] uppercase">Gender</span>
                    <div className="flex gap-2">
                      {GENDERS.map((g) => (
                        <button key={g} onClick={() => handleGenderChange(g)}
                          className="flex-1 py-1.5 font-mono text-xs uppercase border transition-all"
                          style={{
                            borderColor: char.gender === g ? char.auraColor : "#ffffff22",
                            color: char.gender === g ? char.auraColor : "#ffffff44",
                            boxShadow: char.gender === g ? `0 0 10px ${char.auraColor}66` : "none",
                            background: char.gender === g ? `${char.auraColor}15` : "transparent",
                          }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body & height */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <CycleRow label="Body" value={char.bodyType}
                      options={BODY_TYPES}
                      onChange={(v) => setCharField("bodyType", v)} />
                    <CycleRow label="Height" value={char.height}
                      options={HEIGHTS}
                      onChange={(v) => setCharField("height", v)} />
                  </div>

                  {/* Skin */}
                  <div className="border-t border-white/5 pt-3">
                    <SwatchRow label="Skin Tone" options={SKIN_TONES}
                      selected={char.skinTone}
                      onSelect={(v) => setCharField("skinTone", v)} />
                  </div>

                  {/* Hair */}
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <CycleRow label="Hair" value={char.hairStyle}
                      options={HAIR_STYLES[char.gender]}
                      onChange={(v) => setCharField("hairStyle", v)} />
                    <SwatchRow label="Hair Color" options={HAIR_COLORS}
                      selected={char.hairColor}
                      onSelect={(v) => setCharField("hairColor", v)} />
                  </div>

                  {/* Eyes */}
                  <div className="border-t border-white/5 pt-3">
                    <SwatchRow label="Eye Color" options={EYE_COLORS}
                      selected={char.eyeColor}
                      onSelect={(v) => setCharField("eyeColor", v)} />
                  </div>

                  {/* Aura */}
                  <div className="border-t border-white/5 pt-3">
                    <SwatchRow label="Aura Color" options={AURA_COLORS}
                      selected={char.auraColor}
                      onSelect={(v) => setCharField("auraColor", v)} />
                  </div>

                  <Button
                    onClick={handleEnterWorld}
                    className="w-full bg-primary hover:bg-primary/80 text-black font-black uppercase tracking-widest mt-2"
                    style={{ boxShadow: `0 0 20px ${char.auraColor}66` }}
                  >
                    Enter OG World
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ENTERING STEP ── */}
      <AnimatePresence>
        {step === "entering" && (
          <motion.div
            key="entering"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  "radial-gradient(ellipse at center, #000 0%, #000 100%)",
                  `radial-gradient(ellipse at center, ${char.auraColor}44 0%, #000 60%)`,
                  "radial-gradient(ellipse at center, #fff 0%, #000 100%)",
                ],
              }}
              transition={{ duration: 1.5, ease: "easeIn" }}
            />
            <motion.div
              className="relative z-10 text-center space-y-4"
              animate={{ scale: [1, 1.1, 10], opacity: [1, 1, 0] }}
              transition={{ duration: 1.5, ease: "easeIn" }}
            >
              <div className="w-8 h-8 rounded-full mx-auto"
                style={{ backgroundColor: char.auraColor, boxShadow: `0 0 40px ${char.auraColor}` }} />
              <p className="text-white font-black uppercase tracking-[0.5em] text-sm">Entering World...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
