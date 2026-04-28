import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock, Sparkles } from "lucide-react";
import {
  ACHIEVEMENTS,
  DIFFICULTY_COLOR,
  DIFFICULTY_LABEL,
  DIFFICULTY_REWARDS,
  type Achievement,
  type Difficulty,
  useAchievements,
} from "@/lib/achievements";
import { fallbackPortrait, getAchievementImage } from "@/lib/achievementImages";

// =============================================================================
// AchievementBook
//
// A Pokemon-style card collection book for all achievements.
//   • 8 cards per page (4×2 on desktop, 2×4 on mobile)
//   • Each card shows: AI portrait of President Nattoun for that achievement,
//     name, the secret/hint, and a difficulty badge (1–4 stars).
//   • Cards differ in look by difficulty (easy / medium / hard / insane). The
//     INSANE tier has a soft holo accent — but is intentionally less flashy
//     than the Top-100 reward NFT card, which remains the showpiece.
//   • Locked cards show a silhouette portrait + "???" but keep the hint
//     visible as a clue (so the book doubles as a hint guide).
//   • Page changes use a real 3D book-flip animation.
// =============================================================================

const CARDS_PER_PAGE = 8;
const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard", "insane"];
const STARS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, insane: 4 };

const DIFF_BG: Record<Difficulty, string> = {
  // Soft paper-like gradients per tier. INSANE has a subtle holo accent but
  // stays restrained so the Reward NFT card remains the rarest-looking thing
  // in the app.
  easy: "linear-gradient(160deg, #18301d 0%, #0a160d 100%)",
  medium: "linear-gradient(160deg, #2a2410 0%, #110d05 100%)",
  hard: "linear-gradient(160deg, #2c1810 0%, #150806 100%)",
  insane:
    "linear-gradient(160deg, hsl(290 60% 18%) 0%, hsl(260 50% 10%) 50%, hsl(320 55% 14%) 100%)",
};

function StarBar({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex gap-[2px] items-center">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rotate-45"
          style={{
            background: i < count ? color : "transparent",
            border: `1px solid ${color}`,
            boxShadow: i < count ? `0 0 4px ${color}` : "none",
          }}
        />
      ))}
    </div>
  );
}

function SortBy({
  value,
  onChange,
}: {
  value: "all" | Difficulty;
  onChange: (v: "all" | Difficulty) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase font-mono tracking-widest text-secondary/70">
        Filter
      </span>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 transition-colors ${
          value === "all"
            ? "border-primary text-primary bg-primary/10"
            : "border-white/10 text-white/50 hover:text-white"
        }`}
      >
        All
      </button>
      {DIFF_ORDER.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className="px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 transition-colors"
          style={
            value === d
              ? { borderColor: DIFFICULTY_COLOR[d], color: DIFFICULTY_COLOR[d], background: `${DIFFICULTY_COLOR[d]}1A` }
              : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }
          }
        >
          {DIFFICULTY_LABEL[d]}
        </button>
      ))}
    </div>
  );
}

function Card({ ach, unlocked }: { ach: Achievement; unlocked: boolean }) {
  const color = DIFFICULTY_COLOR[ach.difficulty];
  const stars = STARS[ach.difficulty];
  const aiImg = getAchievementImage(ach.id);
  const img = aiImg ?? fallbackPortrait;
  const isInsane = ach.difficulty === "insane";

  return (
    <motion.div
      whileHover={{ scale: 1.03, rotate: -0.5 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="relative aspect-[3/4] w-full"
    >
      {/* outer frame */}
      <div
        className="absolute inset-0 rounded-md p-[3px]"
        style={{
          background: `linear-gradient(140deg, ${color} 0%, ${color}88 50%, ${color}44 100%)`,
          boxShadow: unlocked
            ? `0 6px 16px -8px ${color}AA, 0 0 0 1px rgba(0,0,0,0.5)`
            : "0 4px 10px -6px rgba(0,0,0,0.6)",
          opacity: unlocked ? 1 : 0.55,
        }}
      >
        {/* inner card */}
        <div
          className="relative h-full w-full rounded-[5px] overflow-hidden flex flex-col"
          style={{ background: DIFF_BG[ach.difficulty] }}
        >
          {/* Difficulty header bar */}
          <div
            className="flex items-center justify-between px-2 py-1 border-b"
            style={{
              borderColor: `${color}55`,
              background: `linear-gradient(90deg, ${color}1A 0%, transparent 100%)`,
            }}
          >
            <span
              className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest"
              style={{ color }}
            >
              {DIFFICULTY_LABEL[ach.difficulty]}
            </span>
            <StarBar count={stars} color={color} />
          </div>

          {/* Portrait area */}
          <div
            className="relative flex-1 overflow-hidden"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${color}22 0%, transparent 70%), #0a0a0a`,
            }}
          >
            <img
              src={img}
              alt={unlocked ? ach.name : "locked"}
              className="absolute inset-0 w-full h-full object-cover transition-all"
              style={
                unlocked
                  ? { filter: "saturate(1.1)" }
                  : {
                      filter: "grayscale(100%) brightness(0.25) contrast(1.4)",
                    }
              }
              draggable={false}
            />
            {/* If we don't have an AI image, the fallback portrait gets a big
                emoji badge so the card still feels personalized. */}
            {!aiImg && unlocked && (
              <div
                aria-hidden
                className="absolute right-1 bottom-1 text-2xl sm:text-3xl drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]"
              >
                {ach.emoji}
              </div>
            )}
            {/* Locked overlay */}
            {!unlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-8 h-8 text-white/40" />
              </div>
            )}
            {/* Insane-tier subtle holo strip — restrained, NOT a full holo card */}
            {isInsane && unlocked && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 45%, rgba(255,0,200,0.12) 50%, rgba(0,255,255,0.12) 55%, transparent 70%)",
                }}
              />
            )}
            {/* Top corner shine for unlocked cards */}
            {unlocked && (
              <div
                aria-hidden
                className="absolute -top-6 -left-6 w-16 h-16 rounded-full opacity-50 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }}
              />
            )}
          </div>

          {/* Name + hint */}
          <div className="px-2 py-2 border-t" style={{ borderColor: `${color}55` }}>
            <div className="flex items-baseline justify-between gap-2">
              <div
                className="text-[11px] sm:text-xs font-black uppercase tracking-wider truncate"
                style={{ color: unlocked ? "white" : "rgba(255,255,255,0.5)" }}
              >
                {unlocked ? ach.name : "??? ??? ???"}
              </div>
              <span aria-hidden className="text-base shrink-0 leading-none">
                {ach.emoji}
              </span>
            </div>
            <div
              className="font-mono text-[9px] sm:text-[10px] leading-snug mt-1"
              style={{ color: unlocked ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}
              title={ach.hint}
            >
              {ach.hint}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PageDots({
  total,
  current,
  onPick,
}: {
  total: number;
  current: number;
  onPick: (i: number) => void;
}) {
  if (total <= 1) return null;
  // Cap visible dots: show first, last, current ± 2
  const dots: (number | "...")[] = [];
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || Math.abs(i - current) <= 2) {
      dots.push(i);
    } else if (dots[dots.length - 1] !== "...") {
      dots.push("...");
    }
  }
  return (
    <div className="flex gap-1 items-center">
      {dots.map((d, idx) =>
        d === "..." ? (
          <span key={`e${idx}`} className="text-secondary/40 px-1">
            …
          </span>
        ) : (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            className={`w-2 h-2 rounded-full transition-all ${
              d === current
                ? "bg-primary scale-150"
                : "bg-white/20 hover:bg-white/50"
            }`}
            aria-label={`Page ${d + 1}`}
          />
        ),
      )}
    </div>
  );
}

export function AchievementBook() {
  const { data: achData, unlockedCount, total } = useAchievements();
  const [filter, setFilter] = useState<"all" | Difficulty>("all");
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const filtered = useMemo<Achievement[]>(() => {
    const base = filter === "all" ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.difficulty === filter);
    // Sort: easy → insane, then unlocked first within each tier.
    const order: Difficulty[] = ["easy", "medium", "hard", "insane"];
    return [...base].sort((a, b) => {
      const di = order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
      if (di !== 0) return di;
      const ua = achData[a.id] ? 0 : 1;
      const ub = achData[b.id] ? 0 : 1;
      return ua - ub;
    });
  }, [filter, achData]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * CARDS_PER_PAGE,
    safePage * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  function go(dir: 1 | -1) {
    const next = safePage + dir;
    if (next < 0 || next >= pageCount) return;
    setDirection(dir);
    setPage(next);
  }
  function jump(p: number) {
    if (p === safePage) return;
    setDirection(p > safePage ? 1 : -1);
    setPage(p);
  }

  return (
    <div className="w-full bg-black/85 border-2 border-primary neon-box p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4 pb-3 border-b-2 border-primary/40">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-primary uppercase tracking-widest neon-text flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Card Collection
          </h2>
          <p className="text-secondary/80 font-mono text-[11px] uppercase mt-1 tracking-widest">
            {unlockedCount}/{total} cards collected · Pokémon-style album of every secret
          </p>
        </div>
        <SortBy value={filter} onChange={(v) => { setFilter(v); setPage(0); }} />
      </div>

      {/* Book area */}
      <div
        className="relative mx-auto w-full"
        style={{ perspective: "2200px" }}
      >
        {/* Subtle book "spine" shadow behind the page */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-[92%] rounded-md pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.0) 65%)",
          }}
        />
        <div className="relative" style={{ transformStyle: "preserve-3d" }}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={`p${safePage}-${filter}`}
              custom={direction}
              variants={{
                enter: (d: number) => ({
                  rotateY: d > 0 ? 90 : -90,
                  opacity: 0,
                  transformOrigin: d > 0 ? "left center" : "right center",
                }),
                center: {
                  rotateY: 0,
                  opacity: 1,
                  transition: { duration: 0.55, ease: [0.2, 0.7, 0.2, 1] },
                },
                exit: (d: number) => ({
                  rotateY: d > 0 ? -90 : 90,
                  opacity: 0,
                  transformOrigin: d > 0 ? "right center" : "left center",
                  transition: { duration: 0.45, ease: [0.6, 0.05, 0.7, 0.3] },
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              style={{
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
              className="relative bg-gradient-to-b from-zinc-900 to-black border-2 border-primary/40 rounded-md p-3 sm:p-5"
            >
              {/* Page header strip */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-secondary/60">
                  Page {safePage + 1} / {pageCount}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-secondary/60">
                  {filter === "all" ? "ALL TIERS" : DIFFICULTY_LABEL[filter]}
                </div>
              </div>

              {/* Card grid */}
              {slice.length === 0 ? (
                <div className="py-12 text-center text-secondary/50 font-mono text-sm uppercase">
                  No cards on this page.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {slice.map((a) => (
                    <Card key={a.id} ach={a} unlocked={!!achData[a.id]} />
                  ))}
                </div>
              )}

              {/* Page corner peel decoration */}
              <div
                aria-hidden
                className="absolute right-0 bottom-0 w-8 h-8 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.55) 100%)",
                  borderTopLeftRadius: "6px",
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={safePage === 0}
            className="flex items-center gap-1 px-3 py-1.5 border-2 border-primary text-primary font-black uppercase text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <PageDots total={pageCount} current={safePage} onPick={jump} />
          <button
            type="button"
            onClick={() => go(1)}
            disabled={safePage >= pageCount - 1}
            className="flex items-center gap-1 px-3 py-1.5 border-2 border-primary text-primary font-black uppercase text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10"
            aria-label="Next page"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] font-mono uppercase tracking-widest text-secondary/50">
        Tip · Top-100 Oracle reward stays the rarest card in the country.
      </div>
    </div>
  );
}
