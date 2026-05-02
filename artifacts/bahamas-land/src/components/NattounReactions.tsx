import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, Tv } from "lucide-react";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";

// ============================================================================
// PRESIDENT NATTOUN REACTS
// ============================================================================
// A fake "reaction TV" panel that lives inside the Live Stream page.
// The President is "watching" a random video (we just show its title +
// fake clip art) and dropping aggressively trolling reaction quotes that
// rotate every few seconds. Cycles through clips automatically. Hitting
// SKIP costs nothing but he gets meaner.
// ============================================================================

const CLIPS: { title: string; channel: string; emoji: string; reactions: string[] }[] = [
  {
    title: "TOP 10 RAGE QUITS COMPILATION",
    channel: "ClipMonster420",
    emoji: "🎮",
    reactions: [
      "Cry harder. The dog is laughing.",
      "Imagine losing at a video game. Imagine.",
      "I would have rage quit at frame 1. Loyalty.",
      "This is why we have a Court of OGs.",
    ],
  },
  {
    title: "BASKOUTA MAKING ASMR — 4 HOURS OF DOUGH",
    channel: "BaskoutaCorp",
    emoji: "🍪",
    reactions: [
      "Baskouta is the foundation of Bahamas Land. Respect the biscuit.",
      "He is doing it wrong. Ban him.",
      "I should be in this video. I AM the baskouta.",
      "T5ATHELT. The dough has betrayed him.",
    ],
  },
  {
    title: "STREAMER GETS BANNED LIVE",
    channel: "DramaDog",
    emoji: "📺",
    reactions: [
      "Should have streamed in Bahamas Land. We never ban. We exile.",
      "Mods, do that to [username] too. For practice.",
      "The chat warned him. The chat is always right.",
      "I would have banned him faster. With my eyes closed.",
    ],
  },
  {
    title: "DOG REACTS TO VACUUM CLEANER",
    channel: "PetClips",
    emoji: "🐕",
    reactions: [
      "Same energy as my entire administration.",
      "The vacuum is a foreign agent. Deport it.",
      "This dog has more loyalty than half of you.",
      "I have approved this dog for Bahamas Land citizenship.",
    ],
  },
  {
    title: "FOREIGN STATE MEDIA — OFFICIAL CHANNEL",
    channel: "StateMedia",
    emoji: "📰",
    reactions: [
      "MUTE. SKIP. NEXT.",
      "This is propaganda. Bahamas Land approved propaganda is BETTER.",
      "I refuse to watch this. Roll the baskouta video again.",
    ],
  },
  {
    title: "WORLD'S WORST PYRAMID SCHEME EXPOSED",
    channel: "FinanceBros",
    emoji: "📉",
    reactions: [
      "I invest in this every Tuesday. It's tradition.",
      "The Bank of Nattoun endorses this product.",
      "Send me the brochure. Asking for a friend.",
      "Excellent business model. Where do I sign?",
    ],
  },
  {
    title: "CAT VS CUCUMBER — SHOCKING",
    channel: "MemeVault",
    emoji: "🥒",
    reactions: [
      "The cucumber is innocent. Free the cucumber.",
      "I would have eaten the cucumber. Then the cat.",
      "Bahamas Land has banned cucumbers. Effective immediately.",
      "Why is the chat NOT screaming about this. Wake up.",
    ],
  },
  {
    title: "AI SINGS NATIONAL ANTHEM (LEAKED)",
    channel: "DeepFakeFM",
    emoji: "🎵",
    reactions: [
      "Wrong anthem. The real anthem is just me barking.",
      "I will sue. I will sue everyone in this video.",
      "Mids. All of them. Mids singing mids.",
      "Where is the Bahamas Land remix. Where.",
    ],
  },
  {
    title: "M3KKY LIVE — CHATTING + GAMING",
    channel: "kick.com/m3kky",
    emoji: "💜",
    reactions: [
      "He stole my cadence. Lawsuit incoming.",
      "Watch him. Then come back. We are also live. Mostly.",
      "M3kky for prime minister. Maybe.",
      "Raid him. Then raid him back. That's diplomacy.",
    ],
  },
  {
    title: "SOMEONE TYPED 'MID' IN CHAT (REUPLOAD)",
    channel: "BahamasLandTV",
    emoji: "🟨",
    reactions: [
      "STAMP. STAMP. CERTIFIED MID.",
      "He has been exiled. We do not speak of him.",
      "If [username] types 'mid' you will join him.",
      "This clip is required viewing in Bahamas Land schools.",
    ],
  },
];

const SKIP_TAUNTS = [
  "Skipped already? You have the patience of a goldfish.",
  "Fine. Next mid clip coming up.",
  "Skip again. I dare you. The dog is counting.",
  "Skipping is a sign of disloyalty. Just so you know.",
];

const REACTION_MS = 4200;
const CLIP_MS = 22_000;

export function NattounReactions() {
  const [clipIdx, setClipIdx] = useState(0);
  const [reactionIdx, setReactionIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [skipTaunt, setSkipTaunt] = useState<string | null>(null);
  const clipTimer = useRef<number | null>(null);
  const reactionTimer = useRef<number | null>(null);

  const clip = CLIPS[clipIdx];

  // Mark the reactor achievement after a few seconds of watching
  useEffect(() => {
    const id = window.setTimeout(() => unlock("reactor"), 5_000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (paused) return;
    reactionTimer.current = window.setInterval(() => {
      setReactionIdx((r) => (r + 1) % clip.reactions.length);
    }, REACTION_MS);
    clipTimer.current = window.setTimeout(() => {
      nextClip(false);
    }, CLIP_MS);
    return () => {
      if (reactionTimer.current) window.clearInterval(reactionTimer.current);
      if (clipTimer.current) window.clearTimeout(clipTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipIdx, paused]);

  const nextClip = (manual: boolean) => {
    setClipIdx((i) => (i + 1) % CLIPS.length);
    setReactionIdx(0);
    if (manual) {
      audio.playBlip();
      const t = SKIP_TAUNTS[Math.floor(Math.random() * SKIP_TAUNTS.length)];
      setSkipTaunt(t);
      window.setTimeout(() => setSkipTaunt(null), 2500);
    }
  };

  const reactionLine = clip.reactions[reactionIdx % clip.reactions.length];

  // Decorative "video" gradient that changes per clip
  const gradient = useMemo(() => {
    const hues = [320, 200, 48, 280, 140, 0];
    const h = hues[clipIdx % hues.length];
    return `radial-gradient(circle at 30% 30%, hsl(${h} 80% 35%) 0%, transparent 60%), radial-gradient(circle at 70% 70%, hsl(${(h + 60) % 360} 70% 25%) 0%, transparent 70%), #000`;
  }, [clipIdx]);

  return (
    <div className="bg-black/85 border-2 border-pink-500 neon-box overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-pink-500 px-3 py-2">
        <div className="flex items-center gap-2 text-pink-400 font-black uppercase text-xs tracking-widest">
          <Tv className="w-4 h-4" /> President Reacts
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-pink-400 hover:text-pink-200 clickable px-2 py-1 border border-pink-500/40"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={() => nextClip(true)}
            className="text-pink-400 hover:text-pink-200 clickable px-2 py-1 border border-pink-500/40"
            aria-label="Skip"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Video frame */}
      <div className="relative aspect-video w-full overflow-hidden" style={{ background: gradient }}>
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)",
          }}
        />

        {/* Big emoji as the "clip" */}
        <motion.div
          key={clipIdx}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex items-center justify-center text-[7rem] md:text-[10rem] drop-shadow-[0_0_24px_rgba(255,255,255,0.3)] select-none"
        >
          {clip.emoji}
        </motion.div>

        {/* Title overlay */}
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="bg-black/80 border border-white/30 px-2 py-1 text-white text-xs font-black uppercase tracking-wider truncate">
            {clip.title}
          </div>
          <div className="text-[10px] font-mono text-white/60 uppercase mt-0.5">
            ▶ {clip.channel}
          </div>
        </div>

        {/* Picture-in-picture: Nattoun head */}
        <div className="absolute bottom-2 right-2 z-20 w-20 h-20 md:w-24 md:h-24 border-2 border-pink-500 bg-black overflow-hidden">
          <motion.img
            src={nattounImg}
            data-nattoun="true"
            alt="Nattoun reacting"
            className="w-full h-full object-cover"
            animate={paused ? {} : { y: [0, -3, 0, 3, 0], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-pink-500 text-black text-[8px] font-black uppercase text-center tracking-widest">
            REACTING
          </div>
        </div>

        {/* Reaction caption */}
        <div className="absolute bottom-2 left-2 right-28 z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${clipIdx}-${reactionIdx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-pink-600/90 border-2 border-pink-300 px-2 py-1 text-white font-mono text-[11px] md:text-xs leading-snug"
              style={{ boxShadow: "0 0 14px rgba(244, 114, 182, 0.5)" }}
            >
              "{reactionLine}"
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Skip taunt strip */}
      <AnimatePresence>
        {skipTaunt && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-pink-500/15 border-t border-pink-500/40 px-3 py-1 text-pink-300 font-mono text-[10px] uppercase tracking-widest overflow-hidden"
          >
            {skipTaunt}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-3 py-2 text-[10px] font-mono text-white/40 uppercase tracking-widest border-t border-pink-500/30 flex items-center justify-between">
        <span>Auto-cycling clips · {clipIdx + 1}/{CLIPS.length}</span>
        <span className="text-pink-400/70">Nothing here is real. He still trolls.</span>
      </div>
    </div>
  );
}
