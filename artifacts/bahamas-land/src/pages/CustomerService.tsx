import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { useCoins } from "@/lib/store";
import { audio } from "@/lib/audio";

// ── Day key helper (YYYYMMDD as number) ──────────────────────────────────────
function todayKey(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ── Nattoun troll responses when the citizen first arrives ───────────────────
const GREET_LINES = [
  "Welcome. Please take a number. The number is 'no'.",
  "Customer Service hours: never. But here you are.",
  "Your satisfaction is important to us. Liar.",
  "Please hold. Your hold music is Nattoun breathing heavily.",
  "For complaints, press 1. For hints, pay 500 NC.",
  "Your call is important to us. It is not.",
  "Nattoun is currently busy not caring. Please wait.",
  "Hello citizen. This is a trap. Have a seat.",
];

// ── Troll responses when the citizen is BROKE ────────────────────────────────
const BROKE_LINES = [
  "500 NC. You have less than that. Tragic.",
  "Nattoun accepts NC only. Tears are not currency.",
  "Cannot dispense wisdom. Insufficient funds. Goodbye.",
  "Come back when you are less poor. State advice.",
  "Hint costs 500 NC. You have almost nothing. Incredible.",
];

// ── Troll responses after purchasing a hint ───────────────────────────────────
const AFTER_LINES = [
  "One hint. Do not waste it. Nattoun is watching.",
  "You paid. You get the truth. Spend it wisely.",
  "Information dispensed. Do not ask for a refund.",
  "Nattoun has spoken. The council has decided. You owe more NC.",
  "That was the hint. Yes, that one. Goodbye.",
];

// ── Already used today ────────────────────────────────────────────────────────
const USED_LINES = [
  "One hint per day. Come back tomorrow. It is the law.",
  "You already got your hint. Nattoun remembers everything.",
  "Daily limit reached. This is not a library.",
  "You had your chance. Come back at midnight.",
  "One per day, citizen. The President is not a hint machine.",
];

const HINT_COST = 500;
const STORAGE_KEY_PREFIX = "ogs_cs_hint_";

type CachedHint = {
  dayKey: number;
  achievementId: string;
  achievementName: string;
  emoji: string;
  difficulty: string;
  hint: string;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CustomerService() {
  const [coins, setCoins] = useCoins();
  const [phase, setPhase] = useState<"idle" | "loading" | "revealed" | "used" | "broke">("idle");
  const [trollMsg, setTrollMsg] = useState(() => pick(GREET_LINES));
  const [cached, setCached] = useState<CachedHint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dayKey = todayKey();
  const storageKey = `${STORAGE_KEY_PREFIX}${dayKey}`;

  // On mount: check if user already bought today's hint
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw) as CachedHint;
        setCached(data);
        setPhase("used");
        setTrollMsg(pick(USED_LINES));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleBuyHint = async () => {
    if (phase !== "idle" && phase !== "broke") return;

    if (coins < HINT_COST) {
      setPhase("broke");
      setTrollMsg(pick(BROKE_LINES));
      try { audio.playGlitch(); } catch { /* non-critical */ }
      return;
    }

    setPhase("loading");

    try {
      const base = (import.meta as any).env?.BASE_URL ?? "/";
      const apiBase = base.endsWith("/") ? base.slice(0, -1) : base;
      const url = `${apiBase}/__hint`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: String(dayKey) }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "no body");
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
      }
      const data = await res.json();
      if (!data.ok) throw new Error(`bad response: ${JSON.stringify(data)}`);

      // Deduct NC client-side
      setCoins((c) => Math.max(0, c - HINT_COST));
      try { audio.playGlitch(); } catch { /* non-critical */ }

      const entry: CachedHint = {
        dayKey: data.dayKey,
        achievementId: data.achievementId,
        achievementName: data.achievementName,
        emoji: data.emoji,
        difficulty: data.difficulty,
        hint: data.hint,
      };

      // Persist so the user can see it again today without paying twice
      localStorage.setItem(storageKey, JSON.stringify(entry));
      setCached(entry);
      setPhase("revealed");
      setTrollMsg(pick(AFTER_LINES));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[CustomerService] hint fetch failed:", msg);
      setError(`Error: ${msg}`);
      setPhase("idle");
    }
  };

  const DIFF_COLOR: Record<string, string> = {
    easy: "text-green-400",
    medium: "text-yellow-400",
    hard: "text-orange-400",
    insane: "text-red-500",
  };

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto py-4 px-2">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-[0.3em] neon-text">
            Customer Service
          </h1>
          <p className="text-secondary text-xs font-mono uppercase tracking-[0.3em] mt-1 opacity-70">
            Ministry of Hints · Est. Never
          </p>
        </div>

        {/* Nattoun desk */}
        <div className="relative border-2 border-primary bg-black/80 neon-box p-6 mb-4">
          {/* Desk label */}
          <div className="absolute -top-3 left-4 bg-black px-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary/70">
              OFFICER NATTOUN · WINDOW 1 (only window)
            </span>
          </div>

          {/* Troll message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={trollMsg}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-sm md:text-base text-primary text-center mb-5 min-h-[2.5rem] flex items-center justify-center"
            >
              &ldquo;{trollMsg}&rdquo;
            </motion.p>
          </AnimatePresence>

          {/* Hint cost notice */}
          <div className="border border-primary/30 bg-primary/5 rounded px-4 py-3 mb-5 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-secondary">
              1 random achievement hint · <span className="text-primary font-bold">{HINT_COST} NC</span> · limit 1 per day
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-secondary/50 mt-1">
              Full instructions on how to unlock — no teasing, no riddles
            </p>
          </div>

          {/* Action area */}
          <div className="flex flex-col items-center gap-3">
            {(phase === "idle" || phase === "broke") && (
              <motion.button
                onClick={handleBuyHint}
                className="px-8 py-3 border-2 border-primary bg-primary/10 text-primary font-mono uppercase tracking-widest text-sm hover:bg-primary hover:text-black transition neon-box"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Pay {HINT_COST} NC → Get Today's Hint
              </motion.button>
            )}

            {phase === "loading" && (
              <p className="font-mono text-xs text-primary animate-pulse uppercase tracking-widest">
                Nattoun is consulting the archives…
              </p>
            )}

            {phase === "broke" && (
              <p className="font-mono text-xs text-red-400 uppercase tracking-widest">
                You have {coins} NC. Hint costs {HINT_COST} NC.
              </p>
            )}

            {error && (
              <p className="font-mono text-xs text-red-400 uppercase tracking-widest">{error}</p>
            )}
          </div>
        </div>

        {/* Revealed / cached hint card */}
        <AnimatePresence>
          {(phase === "revealed" || phase === "used") && cached && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="border-2 border-primary bg-black neon-box p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{cached.emoji}</span>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-secondary/60">
                    Today's mystery achievement
                  </p>
                  <p className="font-black text-primary text-lg uppercase tracking-widest">
                    {cached.achievementName}
                  </p>
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${DIFF_COLOR[cached.difficulty] ?? "text-secondary"}`}>
                    {cached.difficulty} difficulty
                  </p>
                </div>
              </div>

              <div className="border-t border-primary/20 pt-3 mt-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-secondary/50 mb-2">
                  Full instructions:
                </p>
                <p className="font-mono text-sm text-primary leading-relaxed">
                  {cached.hint}
                </p>
              </div>

              {phase === "used" && (
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-secondary/40 text-center">
                  Already purchased today · resets at midnight
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Balance display */}
        <div className="mt-4 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-secondary/50">
            Your balance: <span className="text-primary">{coins} NC</span>
          </p>
        </div>

        {/* Fine print */}
        <div className="mt-6 border border-primary/10 bg-black/50 px-4 py-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-secondary/40 leading-relaxed">
            Nattoun is not responsible for hints you already knew.
            Refunds are illegal under State Decree 14-B.
            One hint per citizen per day. The President has spoken.
          </p>
        </div>
      </div>
    </Layout>
  );
}
