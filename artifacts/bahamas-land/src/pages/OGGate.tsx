import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hashPin } from "@/lib/players";
import { Shield, Key, User, Palette, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { audio } from "@/lib/audio";

const COLORS = [
  { label: "Magenta", value: "#ff2d8c" },
  { label: "Cyan", value: "#3df7ff" },
  { label: "Gold", value: "#ffe93d" },
  { label: "Lime", value: "#39ff14" },
  { label: "Orange", value: "#ff6b35" },
  { label: "Purple", value: "#bd93f9" },
];

type Step = "gate" | "verify" | "character" | "entering";

export default function OGGate() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("gate");
  const [gateOpen, setGateOpen] = useState(false);

  // Verify fields
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [seed, setSeed] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Character fields
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  // Gate open animation then go to verify
  const handleGateClick = () => {
    setGateOpen(true);
    audio.playBlip?.();
    setTimeout(() => setStep("verify"), 2200);
  };

  // Try to prefill from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("ogs_v2_username");
    if (stored) setUsername(stored);
    const storedPin = localStorage.getItem("ogs_v2_pin");
    if (storedPin) setPin(storedPin);
    const storedDisplay = localStorage.getItem("og_world_username");
    if (storedDisplay) setDisplayName(storedDisplay);
    const storedColor = localStorage.getItem("og_world_color");
    if (storedColor) setSelectedColor(storedColor);
  }, []);

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

      // Verify seed — check if this visitor has a reward claim with this seed
      const { data: claimData } = await supabase
        .from("reward_claims")
        .select("seed, username")
        .eq("seed", cleanSeed)
        .maybeSingle();

      if (!claimData) {
        setVerifyError("Invalid card seed. Only citizens with a reward card may enter.");
        setVerifying(false);
        return;
      }

      // Verified! Go to character creation
      setVerifying(false);
      setDisplayName(cleanUsername);
      setStep("character");
    } catch {
      setVerifyError("Network error. Try again.");
      setVerifying(false);
    }
  };

  const handleEnterWorld = () => {
    const name = displayName.trim() || username.trim();
    const id = `${username.toLowerCase().replace(/\s/g, "_")}_${Date.now()}`;

    // Store in sessionStorage for the world page
    sessionStorage.setItem("og_world_id", id);
    sessionStorage.setItem("og_world_username", name);
    sessionStorage.setItem("og_world_color", selectedColor);
    // Also persist display prefs
    localStorage.setItem("og_world_username", name);
    localStorage.setItem("og_world_color", selectedColor);

    setStep("entering");
    setTimeout(() => setLocation("/og-world"), 1800);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">

      {/* ── STEP: GATE ── */}
      <AnimatePresence>
        {step === "gate" && (
          <motion.div
            key="gate"
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dramatic background */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at center, #1a0030 0%, #000 70%)",
              }}
            />

            {/* Gate structure */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Gate arch */}
              <div className="relative w-64 h-80 flex items-end justify-center">
                {/* Left pillar */}
                <motion.div
                  className="absolute left-0 bottom-0 w-12 bg-gradient-to-t from-purple-900 to-purple-600 border border-purple-400"
                  initial={{ height: 0 }}
                  animate={{ height: gateOpen ? "100%" : "80%" }}
                  style={{ boxShadow: "0 0 20px #bd93f9, inset 0 0 10px rgba(189,147,249,0.2)" }}
                />
                {/* Right pillar */}
                <motion.div
                  className="absolute right-0 bottom-0 w-12 bg-gradient-to-t from-purple-900 to-purple-600 border border-purple-400"
                  initial={{ height: 0 }}
                  animate={{ height: gateOpen ? "100%" : "80%" }}
                  style={{ boxShadow: "0 0 20px #bd93f9, inset 0 0 10px rgba(189,147,249,0.2)" }}
                />

                {/* Gate doors — split open on click */}
                <div className="absolute inset-x-12 bottom-0 top-16 overflow-hidden flex">
                  <motion.div
                    className="flex-1 bg-gradient-to-r from-black via-purple-950 to-purple-900 border-r border-purple-500/30"
                    animate={{ x: gateOpen ? "-100%" : "0%" }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                    style={{ boxShadow: "inset -4px 0 12px rgba(189,147,249,0.2)" }}
                  >
                    {/* Door details */}
                    <div className="absolute inset-2 border border-purple-700/40 flex flex-col gap-3 p-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="h-8 border border-purple-600/30 bg-purple-900/20" />
                      ))}
                    </div>
                  </motion.div>
                  <motion.div
                    className="flex-1 bg-gradient-to-l from-black via-purple-950 to-purple-900 border-l border-purple-500/30"
                    animate={{ x: gateOpen ? "100%" : "0%" }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                    style={{ boxShadow: "inset 4px 0 12px rgba(189,147,249,0.2)" }}
                  >
                    <div className="absolute inset-2 border border-purple-700/40 flex flex-col gap-3 p-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="h-8 border border-purple-600/30 bg-purple-900/20" />
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Arch top */}
                <div
                  className="absolute top-0 left-0 right-0 h-20 border-2 border-purple-400 rounded-t-full"
                  style={{
                    background: "linear-gradient(to bottom, #4a0080, #1a0030)",
                    boxShadow: "0 0 30px #bd93f9",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-purple-300 font-black text-xs uppercase tracking-[0.3em]">OG WORLD</span>
                  </div>
                </div>

                {/* Glow when opening */}
                {gateOpen && (
                  <motion.div
                    className="absolute inset-x-12 bottom-0 top-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.8] }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    style={{
                      background: "radial-gradient(ellipse at center, #ff2d8c 0%, #bd93f9 40%, transparent 70%)",
                      filter: "blur(8px)",
                    }}
                  />
                )}
              </div>

              {/* Click prompt */}
              {!gateOpen && (
                <motion.button
                  onClick={handleGateClick}
                  className="mt-8 px-8 py-4 border-2 border-purple-400 text-purple-300 font-black uppercase tracking-[0.3em] text-sm hover:bg-purple-400 hover:text-black transition-all"
                  style={{ boxShadow: "0 0 20px #bd93f9" }}
                  animate={{ boxShadow: ["0 0 15px #bd93f9", "0 0 35px #bd93f9", "0 0 15px #bd93f9"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Enter the Gate
                </motion.button>
              )}

              {gateOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-purple-300 font-mono uppercase tracking-widest text-xs animate-pulse"
                >
                  Opening...
                </motion.p>
              )}
            </div>

            {/* Back link */}
            <button
              onClick={() => setLocation("/world")}
              className="absolute bottom-6 left-6 text-white/30 font-mono text-xs uppercase hover:text-primary transition"
            >
              ← Back to map
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP: VERIFY ── */}
      <AnimatePresence>
        {step === "verify" && (
          <motion.div
            key="verify"
            className="absolute inset-0 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #0d001a 0%, #000 70%)" }}
            />
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
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your username"
                    className="bg-black border-purple-500/50 text-primary font-mono uppercase focus:border-purple-400"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/50 font-mono text-[10px] uppercase">PIN</label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    className="bg-black border-purple-500/50 text-primary font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/50 font-mono text-[10px] uppercase">Card Seed (from your reward card)</label>
                  <Input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g. a3f9b2c1"
                    className="bg-black border-purple-500/50 text-primary font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                </div>
              </div>

              {verifyError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-950/40 border border-red-500/50 px-3 py-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 font-mono text-xs uppercase">{verifyError}</p>
                </motion.div>
              )}

              <Button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white font-black uppercase tracking-widest"
              >
                {verifying ? "Verifying..." : "Verify Identity"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <button
                onClick={() => setStep("gate")}
                className="w-full text-white/20 font-mono text-[10px] uppercase hover:text-primary transition"
              >
                ← back
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP: CHARACTER ── */}
      <AnimatePresence>
        {step === "character" && (
          <motion.div
            key="character"
            className="absolute inset-0 flex items-center justify-center p-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, #001a0d 0%, #000 70%)" }}
            />
            <motion.div
              className="relative z-10 bg-black border-2 border-primary p-8 max-w-md w-full space-y-6"
              style={{ boxShadow: "0 0 40px rgba(255,45,140,0.3)" }}
            >
              <div className="text-center space-y-2">
                <Palette className="w-10 h-10 text-primary mx-auto" />
                <h1 className="text-2xl font-black text-primary uppercase tracking-widest">Create Your Character</h1>
                <p className="text-white/40 font-mono text-xs uppercase">How will others see you in OG World?</p>
              </div>

              {/* Character preview */}
              <div className="flex justify-center">
                <div
                  className="w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-2xl text-black"
                  style={{
                    backgroundColor: selectedColor,
                    boxShadow: `0 0 30px ${selectedColor}`,
                    borderColor: selectedColor,
                  }}
                >
                  {(displayName || username || "?")[0].toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-white/50 font-mono text-[10px] uppercase">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                    placeholder="How others see you"
                    className="bg-black border-primary/50 text-primary font-mono uppercase focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white/50 font-mono text-[10px] uppercase">Character Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setSelectedColor(c.value)}
                        className="w-full aspect-square rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c.value,
                          borderColor: selectedColor === c.value ? "white" : "transparent",
                          boxShadow: selectedColor === c.value ? `0 0 12px ${c.value}` : "none",
                          transform: selectedColor === c.value ? "scale(1.2)" : "scale(1)",
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleEnterWorld}
                className="w-full bg-primary hover:bg-primary/80 text-black font-black uppercase tracking-widest"
              >
                Enter OG World
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP: ENTERING ── */}
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
                  `radial-gradient(ellipse at center, ${selectedColor}44 0%, #000 60%)`,
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
              <div
                className="w-8 h-8 rounded-full mx-auto"
                style={{ backgroundColor: selectedColor, boxShadow: `0 0 40px ${selectedColor}` }}
              />
              <p className="text-white font-black uppercase tracking-[0.5em] text-sm">Entering World...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
