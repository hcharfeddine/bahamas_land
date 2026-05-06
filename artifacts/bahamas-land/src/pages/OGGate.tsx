import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hashPin } from "@/lib/players";
import { Key } from "lucide-react";
import { audio } from "@/lib/audio";
import gateImg from "@assets/generated_images/bld_og_gate.png";

export type OriginClass = "Tank" | "Assassin" | "Mage" | "Ranger" | "Berserker" | "Paladin";

const CLASS_ORIGINS: {
  id: OriginClass;
  name: string;
  icon: string;
  lore: string;
  stats: { str: number; agi: number; int: number; vit: number };
  armorColor: string;
  accentColor: string;
}[] = [
  { id: "Tank",      name: "Tank",      icon: "🛡️", lore: "Iron-forged and unbreakable. A walking fortress who absorbs punishment so others don't have to.",               stats: { str: 7, agi: 2, int: 2, vit: 9 }, armorColor: "#607d8b", accentColor: "#90a4ae" },
  { id: "Assassin",  name: "Assassin",  icon: "🗡️", lore: "A shadow that bleeds. Strikes with lethal precision before the enemy knows they're already dead.",              stats: { str: 5, agi: 9, int: 4, vit: 2 }, armorColor: "#1a1a2e", accentColor: "#7c4dff" },
  { id: "Mage",      name: "Mage",      icon: "🔮", lore: "Reality is merely a suggestion. A master of arcane forces who bends the laws of physics at will.",               stats: { str: 1, agi: 3, int: 10, vit: 3 }, armorColor: "#2d1b69", accentColor: "#aa00ff" },
  { id: "Ranger",    name: "Ranger",    icon: "🏹", lore: "Eyes like a hawk, reflexes like lightning. Picks off threats from impossible distances.",                        stats: { str: 4, agi: 8, int: 5, vit: 3 }, armorColor: "#2e4a1e", accentColor: "#76c442" },
  { id: "Berserker", name: "Berserker", icon: "⚔️", lore: "Pain is a fuel. Grows stronger the more damage taken and dealt. Transcends limits in the heat of battle.",      stats: { str: 10, agi: 5, int: 1, vit: 4 }, armorColor: "#4a1010", accentColor: "#ff3d00" },
  { id: "Paladin",   name: "Paladin",   icon: "✨", lore: "Holy fire made flesh. Fights with righteous fury and heals allies even in the depths of darkness.",              stats: { str: 6, agi: 3, int: 5, vit: 6 }, armorColor: "#7a6000", accentColor: "#ffd600" },
];

function ClassCard({ cls, selected, onSelect }: {
  cls: typeof CLASS_ORIGINS[number];
  selected: boolean;
  onSelect: () => void;
}) {
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
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{cls.icon}</span>
        <span className="font-black uppercase tracking-widest text-sm"
          style={{ color: selected ? cls.accentColor : "#fff" }}>
          {cls.name}
        </span>
      </div>

      <div className="space-y-1 mb-2">
        {(["str", "agi", "int", "vit"] as const).map((stat) => (
          <div key={stat} className="flex items-center gap-2">
            <span className="text-white/30 font-mono text-[9px] uppercase w-5">{stat}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(cls.stats[stat] / 10) * 100}%`, background: cls.accentColor, opacity: 0.8 }} />
            </div>
            <span className="text-white/40 font-mono text-[9px] w-3">{cls.stats[stat]}</span>
          </div>
        ))}
      </div>

      <p className="text-white/40 font-mono text-[10px] leading-relaxed">{cls.lore}</p>

      {selected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: cls.accentColor, boxShadow: `0 0 8px ${cls.accentColor}` }} />
      )}
    </button>
  );
}

type Step = "gate" | "verify" | "origin" | "entering";

export default function OGGate() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("gate");
  const [gateOpen, setGateOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [seed, setSeed] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [selectedOrigin, setSelectedOrigin] = useState<OriginClass>("Tank");

  useEffect(() => {
    const stored = localStorage.getItem("ogs_v2_username");
    if (stored) setUsername(stored);
    const storedPin = localStorage.getItem("ogs_v2_pin");
    if (storedPin) setPin(storedPin);
    const storedOrigin = localStorage.getItem("og_world_origin") as OriginClass | null;
    if (storedOrigin && CLASS_ORIGINS.find(c => c.id === storedOrigin)) setSelectedOrigin(storedOrigin);
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
      setStep("origin");
    } catch {
      setVerifyError("Network error. Try again.");
      setVerifying(false);
    }
  };

  const handleEnterWorld = () => {
    const name = username.trim();
    const id = `${username.toLowerCase().replace(/\s/g, "_")}_${Date.now()}`;
    sessionStorage.setItem("og_world_id", id);
    sessionStorage.setItem("og_world_username", name);
    sessionStorage.setItem("og_world_origin", selectedOrigin);
    localStorage.setItem("og_world_username", name);
    localStorage.setItem("og_world_origin", selectedOrigin);
    setStep("entering");
    setTimeout(() => setLocation("/og-world"), 1800);
  };

  const selectedClass = CLASS_ORIGINS.find((c) => c.id === selectedOrigin) || CLASS_ORIGINS[0];

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

      {/* ── ORIGIN / CLASS STEP ── */}
      <AnimatePresence>
        {step === "origin" && (
          <motion.div key="origin" className="absolute inset-0 flex flex-col items-center justify-start p-6 overflow-y-auto"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at center, ${selectedClass.armorColor}44 0%, #000 60%)` }} />

            <div className="relative z-10 w-full max-w-3xl mx-auto py-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">Choose Your Class</h2>
                <p className="text-white/30 font-mono text-xs uppercase mt-1">
                  Welcome, <span style={{ color: selectedClass.accentColor }}>{username}</span> — pick your warrior
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {CLASS_ORIGINS.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    selected={selectedOrigin === cls.id}
                    onSelect={() => setSelectedOrigin(cls.id)}
                  />
                ))}
              </div>

              <div className="flex gap-4 mt-8 justify-center">
                <button onClick={() => setStep("verify")}
                  className="px-8 py-3 border border-white/20 text-white/60 font-mono uppercase text-sm hover:text-white hover:border-white/50 transition-all">
                  Back
                </button>
                <motion.button onClick={handleEnterWorld}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="px-10 py-3 border-2 font-black uppercase tracking-widest text-sm transition-all"
                  style={{
                    borderColor: selectedClass.accentColor,
                    color: selectedClass.accentColor,
                    boxShadow: `0 0 20px ${selectedClass.accentColor}55`,
                  }}>
                  Enter OG World as {selectedOrigin}
                </motion.button>
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
