import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { unlock, type AchievementId } from "@/lib/achievements";
import { audio } from "@/lib/audio";

// =============================================================================
// Generic "hidden chemin" reveal page used by /baskouta, /177, /freem3kky
// Each path unlocks a different achievement and shows themed lore.
// =============================================================================

type CheminConfig = {
  achievement: AchievementId;
  title: string;
  subtitle: string;
  body: string[];
  color: string;
  emoji: string;
};

export function CheminPage({ config }: { config: CheminConfig }) {
  useEffect(() => {
    unlock(config.achievement);
    try { audio.playCoin(); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout showBack={true}>
      <div className="min-h-[calc(100dvh-100px)] w-full flex flex-col items-center justify-center relative overflow-hidden bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
          className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none"
        >
          <div
            className="w-[180vw] h-[180vw] blur-3xl"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${config.color}, transparent, ${config.color}77, transparent)`,
            }}
          />
        </motion.div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="relative z-10 mb-8"
        >
          <img
            src={nattounImg}
            data-nattoun="true"
            alt=""
            className="w-40 h-40 object-cover rounded-full border-4"
            style={{ borderColor: config.color, filter: `drop-shadow(0 0 20px ${config.color})` }}
          />
        </motion.div>

        <div
          className="relative z-10 max-w-xl w-full bg-black/85 border-4 border-dashed p-6 text-center neon-box"
          style={{ borderColor: config.color }}
        >
          <div className="text-5xl mb-3">{config.emoji}</div>
          <h1
            className="text-2xl md:text-4xl font-black uppercase tracking-widest mb-2"
            style={{ color: config.color, textShadow: `0 0 12px ${config.color}` }}
          >
            {config.title}
          </h1>
          <div className="text-secondary font-mono text-xs uppercase mb-6">{config.subtitle}</div>

          <div className="space-y-3 text-left">
            {config.body.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i }}
                className="text-white/85 font-mono text-sm border-l-2 pl-3"
                style={{ borderColor: config.color }}
              >
                {">"} {line}
              </motion.div>
            ))}
          </div>

          <Link
            href="/world"
            className="inline-block mt-6 px-4 py-2 bg-black border-2 font-mono text-xs uppercase tracking-widest"
            style={{ borderColor: config.color, color: config.color }}
          >
            Return to the world
          </Link>
        </div>
      </div>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Three different chemin pages
// ---------------------------------------------------------------------------
export function BaskoutaChemin() {
  return (
    <CheminPage
      config={{
        achievement: "pathfinder",
        emoji: "🍪",
        title: "BASKOUTA SHRINE",
        subtitle: "Chemin discovered. The crunchiest URL in the country.",
        color: "hsl(36 100% 60%)",
        body: [
          "The President invented baskouta. (he didn't.)",
          "We do not import baskouta. We export the rumor of baskouta.",
          "Every chemin in Bahamas Land is haunted by a baskouta crumb.",
          "Tip: there are at least two more hidden chemins. Look for years.",
          "Tip: look for things that should be free.",
        ],
      }}
    />
  );
}

export function YearChemin() {
  return (
    <CheminPage
      config={{
        achievement: "seerstone",
        emoji: "🏺",
        title: "YEAR ZERO RECOVERED",
        subtitle: "The dog never forgets a number.",
        color: "hsl(190 100% 60%)",
        body: [
          "In the year 177, the dog was elected unanimously by himself.",
          "Bahamas Land has only had one election. He won 177% of it.",
          "The constitution has 1 article. It says: 'see article 1.'",
          "Tip: the President's dream is for a certain streamer to be free.",
          "Tip: the secret arcade game can be cheated from the console.",
        ],
      }}
    />
  );
}

export function FreedomChemin() {
  return (
    <CheminPage
      config={{
        achievement: "freedom",
        emoji: "🆓",
        title: "FREE M3KKY MOVEMENT",
        subtitle: "Underground movement. Officially unauthorised.",
        color: "hsl(140 100% 55%)",
        body: [
          "We the citizens demand: M3kky must be free.",
          "Free of taxes. Free of bans. Free of mid takes.",
          "Type the streamer's name into a keyboard. The crown will appear.",
          "Tip: a circle drawn on screen pleases the President.",
          "Tip: the President's DNA can be requested in the console.",
        ],
      }}
    />
  );
}
