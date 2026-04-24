import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { audio } from "@/lib/audio";
import { useCoins } from "@/lib/store";
import { unlock } from "@/lib/achievements";
import { trackSpend } from "@/lib/tracker";
import { Hand, Scissors, Square, Coins } from "lucide-react";

const COST_PER_ROUND = 25;
// Once-in-a-blue-moon mercy: 5% chance Nattoun "lets you have it" and you win.
const MERCY_RATE = 0.05;
const MERCY_REWARD = 200;

type Choice = "rock" | "paper" | "scissors";
type Outcome = "win" | "lose" | "draw" | null;

const CHOICES: Choice[] = ["rock", "paper", "scissors"];
const ICONS: Record<Choice, React.ReactNode> = {
  rock: <Square className="w-10 h-10" />,
  paper: <Hand className="w-10 h-10" />,
  scissors: <Scissors className="w-10 h-10" />,
};
const EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const TAUNTS_LOSE = [
  "I read your mind. Stop thinking.",
  "Predictable. Like the chat.",
  "I have been doing this for 12 dog years.",
  "Easy. Next.",
  "You held it for too long. I saw it.",
  "I was a Rock-Paper-Scissors world champion in 1994. Look it up.",
  "The dog told me what you were going to pick. He always knows.",
  "Maybe try a different game. This one is mine.",
  "I am not cheating. I am just better than you in every way.",
  "Bahamas Land law: the President wins. It's in the constitution.",
  "Every time you lose, my approval rating goes up. Keep going.",
  "0-1. 0-2. 0-3. The trend is what we call 'a pattern'.",
  "Mods, please ban [username] for losing too obviously.",
  "I let my advisors play once. They lost too. Then I exiled them.",
  "Did you really think you could beat me? In MY country?",
];
const TAUNTS_WIN = [
  "Lucky. Once. It will not happen again.",
  "Recount. Recount. RECOUNT.",
  "I let you have it. Pity. Spend the NC fast.",
  "The cameras malfunctioned. The win stands. Barely.",
  "This victory is unofficial. The NC is real though.",
];

function nattounCounter(playerChoice: Choice): Choice {
  if (playerChoice === "rock") return "paper";
  if (playerChoice === "paper") return "scissors";
  return "rock";
}

export default function RPS() {
  const [you, setYou] = useState<Choice | null>(null);
  const [him, setHim] = useState<Choice | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [taunt, setTaunt] = useState("Pick one. I already know.");
  const [score, setScore] = useState({ you: 0, dog: 0, draws: 0 });
  const [winStreak, setWinStreak] = useState(0);
  const [coins, setCoins] = useCoins();
  const [revealing, setRevealing] = useState(false);

  const canAfford = coins >= COST_PER_ROUND;

  useEffect(() => {
    if (winStreak >= 3) unlock("respected");
  }, [winStreak]);

  const play = (c: Choice) => {
    if (revealing) return;
    if (!canAfford) {
      setTaunt(`The fee is ${COST_PER_ROUND} NC. The Bank is that way.`);
      return;
    }

    setCoins((cv) => cv - COST_PER_ROUND);
    trackSpend(COST_PER_ROUND);

    setYou(c);
    setRevealing(true);
    audio.playBlip();

    const mercy = Math.random() < MERCY_RATE;
    // On mercy, Nattoun "loses" by playing what you beat.
    const opp: Choice = mercy
      ? c === "rock"
        ? "scissors"
        : c === "paper"
          ? "rock"
          : "paper"
      : nattounCounter(c);

    window.setTimeout(() => {
      setHim(opp);
      if (mercy) {
        setOutcome("win");
        setScore((s) => ({ ...s, you: s.you + 1 }));
        setWinStreak((w) => w + 1);
        setTaunt(TAUNTS_WIN[Math.floor(Math.random() * TAUNTS_WIN.length)]);
        setCoins((cv) => cv + MERCY_REWARD);
        unlock("survivor");
        audio.playCoin();
      } else {
        setOutcome("lose");
        setScore((s) => ({ ...s, dog: s.dog + 1 }));
        setWinStreak(0);
        setTaunt(TAUNTS_LOSE[Math.floor(Math.random() * TAUNTS_LOSE.length)]);
        audio.playGlitch();
      }
      setRevealing(false);
    }, 700);
  };

  const reset = () => {
    setYou(null);
    setHim(null);
    setOutcome(null);
    setTaunt("Pick one. I already know.");
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-widest neon-text">
            Rock · Paper · Scissors vs Nattoun
          </h1>
          <p className="text-secondary font-mono text-xs uppercase mt-2">
            Ante: {COST_PER_ROUND} NC per round. Mercy reward if you somehow win: {MERCY_REWARD} NC.
          </p>
        </div>

        {/* Cost / balance bar */}
        <div className="flex items-center gap-4 bg-black/70 border-2 border-accent px-4 py-2 font-mono text-xs uppercase tracking-widest">
          <span className="text-accent flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" /> {coins} NC
          </span>
          <span className="text-white/40">·</span>
          <span className="text-secondary">
            Cost per round: {COST_PER_ROUND} NC
          </span>
        </div>

        <div className="flex items-center gap-4">
          <img
            src={nattounImg}
            alt="Nattoun"
            data-nattoun="true"
            className="w-16 h-16 object-cover border-2 border-primary neon-box rounded-full"
          />
          <div className="bg-black/80 border-2 border-secondary px-4 py-2 max-w-xs neon-box-cyan">
            <p className="text-secondary font-mono text-sm">"{taunt}"</p>
          </div>
        </div>

        {/* Arena */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md items-center">
          {/* Player */}
          <div className="flex flex-col items-center">
            <div className="text-secondary font-black uppercase text-xs mb-2 tracking-widest">
              YOU
            </div>
            <div
              className={`w-24 h-24 border-2 border-secondary bg-black flex items-center justify-center text-5xl ${
                outcome === "win" ? "neon-box-cyan" : ""
              }`}
            >
              {you ? EMOJI[you] : "?"}
            </div>
          </div>
          {/* VS */}
          <div className="flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${you}-${him}-${outcome}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className={`text-2xl font-black uppercase tracking-widest ${
                  outcome === "win"
                    ? "text-secondary"
                    : outcome === "lose"
                      ? "text-red-500"
                      : "text-white/60"
                }`}
              >
                {outcome === "win"
                  ? "W"
                  : outcome === "lose"
                    ? "L"
                    : outcome === "draw"
                      ? "≈"
                      : "VS"}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Nattoun */}
          <div className="flex flex-col items-center">
            <div className="text-primary font-black uppercase text-xs mb-2 tracking-widest">
              NATTOUN
            </div>
            <div
              className={`w-24 h-24 border-2 border-primary bg-black flex items-center justify-center text-5xl ${
                outcome === "lose" ? "neon-box" : ""
              } ${revealing ? "animate-pulse" : ""}`}
            >
              {revealing ? "?" : him ? EMOJI[him] : "?"}
            </div>
          </div>
        </div>

        {/* Choice buttons */}
        <div className="flex gap-3">
          {CHOICES.map((c) => (
            <motion.button
              key={c}
              onClick={() => play(c)}
              disabled={revealing || !canAfford}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="bg-black/70 border-2 border-primary px-5 py-4 text-primary uppercase font-black tracking-widest clickable disabled:opacity-30 flex flex-col items-center gap-1"
            >
              {ICONS[c]}
              <span className="text-xs">{c}</span>
            </motion.button>
          ))}
        </div>

        {!canAfford && (
          <p className="text-center text-xs font-mono uppercase text-red-400/80 max-w-md">
            Out of NC. The President doesn't accept IOUs.
          </p>
        )}

        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
          <div className="text-secondary">YOU: {score.you}</div>
          <div className="text-primary">NATTOUN: {score.dog}</div>
          <div className="text-white/50">STREAK: {winStreak}</div>
        </div>

        <Button
          onClick={reset}
          variant="outline"
          className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black uppercase font-bold tracking-widest"
        >
          Reset Round
        </Button>
      </div>
    </Layout>
  );
}
