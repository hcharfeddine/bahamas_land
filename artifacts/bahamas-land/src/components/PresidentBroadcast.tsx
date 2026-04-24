import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Tv, Radio } from "lucide-react";
import { NattounReactions } from "@/components/NattounReactions";
import { M3kkyLivePanel } from "@/components/M3kkyLivePanel";
import { audio } from "@/lib/audio";

// ============================================================================
// PRESIDENT BROADCAST
// ============================================================================
// President Nattoun is unpredictable. At any moment he might be reacting
// to a random clip OR he might just be watching M3kky's stream and yelling
// at it. This wrapper auto-flips between the two modes on a random
// schedule (somewhere between 25s and 55s) and lets the citizen force-flip
// with a button — at the cost of a passive-aggressive sticky note.
// ============================================================================

type Mode = "reactions" | "m3kky";

const MIN_MS = 25_000;
const MAX_MS = 55_000;

const SWITCH_LINES_TO_M3KKY = [
  "Hold on. M3kky just went live. Switching cameras.",
  "Boring clip. Cutting to M3kky. Watch.",
  "We are stealing M3kky's signal. For research.",
  "I am tired of reacting. Watch M3kky for me.",
];

const SWITCH_LINES_TO_REACTIONS = [
  "M3kky took a bathroom break. Roll the clips.",
  "Cutting away. Found something to make fun of.",
  "Enough Kick. Time for me to talk over a video.",
  "We are reacting now. Pay attention.",
];

const FORCE_FLIP_TAUNTS = [
  "Fine. Switching. You're the boss now apparently.",
  "Impatient citizen detected. Note has been added.",
  "Switching. The President sighs.",
  "OK. But this is on the record.",
];

function randomDelay() {
  return MIN_MS + Math.floor(Math.random() * (MAX_MS - MIN_MS));
}

export function PresidentBroadcast() {
  // Initial mode is also random so reloads aren't predictable.
  const [mode, setMode] = useState<Mode>(() =>
    Math.random() < 0.5 ? "reactions" : "m3kky",
  );
  const [statusLine, setStatusLine] = useState<string>(
    "President is online. Mode is random. He decides.",
  );
  const [nextInMs, setNextInMs] = useState<number>(randomDelay());
  const tick = useRef<number | null>(null);

  // Schedule the next auto-flip whenever mode changes.
  useEffect(() => {
    const ms = randomDelay();
    setNextInMs(ms);
    const id = window.setTimeout(() => flip("auto"), ms);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 1Hz ticker for the countdown UI.
  useEffect(() => {
    tick.current = window.setInterval(() => {
      setNextInMs((n) => (n > 1000 ? n - 1000 : 0));
    }, 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [mode]);

  const flip = (source: "auto" | "manual") => {
    setMode((current) => {
      const next: Mode = current === "reactions" ? "m3kky" : "reactions";
      const lines =
        source === "manual"
          ? FORCE_FLIP_TAUNTS
          : next === "m3kky"
            ? SWITCH_LINES_TO_M3KKY
            : SWITCH_LINES_TO_REACTIONS;
      setStatusLine(lines[Math.floor(Math.random() * lines.length)]);
      audio.playGlitch();
      return next;
    });
  };

  const seconds = Math.max(0, Math.ceil(nextInMs / 1000));
  const isReactions = mode === "reactions";

  return (
    <div className="space-y-2">
      {/* Status strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/85 border-2 border-pink-500 px-3 py-2 font-mono text-[11px] uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="text-pink-400 font-black">STATE OF BROADCAST:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={mode}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 border ${
                isReactions
                  ? "border-pink-500 text-pink-300"
                  : "border-[#53fc18] text-[#53fc18]"
              }`}
            >
              {isReactions ? (
                <>
                  <Tv className="w-3 h-3" /> Reacting to a clip
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3" /> Watching M3kky live
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 tabular-nums">
            Mood swings in {seconds}s
          </span>
          <button
            onClick={() => flip("manual")}
            className="text-pink-300 border border-pink-500/60 px-2 py-0.5 clickable hover:bg-pink-500/20 flex items-center gap-1"
            aria-label="Force the President to switch"
          >
            <Shuffle className="w-3 h-3" /> SWITCH
          </button>
        </div>
      </div>

      {/* Status line (talks like Nattoun) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={statusLine}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="bg-pink-500/10 border border-pink-500/40 px-3 py-1 font-mono text-[11px] text-pink-200 uppercase tracking-widest"
        >
          NATTOUN: "{statusLine}"
        </motion.div>
      </AnimatePresence>

      {/* The actual broadcast */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
        >
          {isReactions ? <NattounReactions /> : <M3kkyLivePanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
