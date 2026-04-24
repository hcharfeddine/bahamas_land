import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { audio } from "@/lib/audio";
import { useCoins } from "@/lib/store";
import { unlock } from "@/lib/achievements";
import { Hand, Scissors, Square } from "lucide-react";

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
];
const TAUNTS_WIN = [
  "Lucky. Once.",
  "Recount.",
  "I let you have it. Pity.",
  "The cameras malfunctioned.",
  "This victory is unofficial.",
];
const TAUNTS_DRAW = [
  "Boring. Try harder.",
  "Draws are illegal. We move on.",
  "You copied me, didn't you.",
];

function beats(a: Choice, b: Choice) {
  if (a === b) return 0;
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  )
    return 1;
  return -1;
}

// Nattoun "predicts" the player. If the player has played the same move twice,
// he counters it. Otherwise he picks the move that beats the player's last move
// 60% of the time. Sometimes he just goes random because of the vibes.
function nattounPick(history: Choice[]): Choice {
  if (history.length === 0)
    return CHOICES[Math.floor(Math.random() * 3)];
  const last = history[history.length - 1];
  if (
    history.length >= 2 &&
    history[history.length - 1] === history[history.length - 2]
  ) {
    // counter the spam
    return last === "rock" ? "paper" : last === "paper" ? "scissors" : "rock";
  }
  if (Math.random() < 0.6) {
    return last === "rock" ? "paper" : last === "paper" ? "scissors" : "rock";
  }
  return CHOICES[Math.floor(Math.random() * 3)];
}

export default function RPS() {
  const [history, setHistory] = useState<Choice[]>([]);
  const [you, setYou] = useState<Choice | null>(null);
  const [him, setHim] = useState<Choice | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [taunt, setTaunt] = useState("Pick one. I already know.");
  const [score, setScore] = useState({ you: 0, dog: 0, draws: 0 });
  const [streak, setStreak] = useState(0);
  const [, setCoins] = useCoins();
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (streak >= 3) {
      unlock("respected");
      setCoins((c) => c + 200);
      setTaunt("3 in a row?? RIGGED. +200 NC. Don't tell anyone.");
      setStreak(0);
    }
  }, [streak, setCoins]);

  const play = (c: Choice) => {
    if (revealing) return;
    setYou(c);
    setRevealing(true);
    audio.playBlip();
    const opp = nattounPick(history);
    window.setTimeout(() => {
      setHim(opp);
      const r = beats(c, opp);
      let o: Outcome = "draw";
      if (r === 1) o = "win";
      else if (r === -1) o = "lose";
      setOutcome(o);
      if (o === "win") {
        setScore((s) => ({ ...s, you: s.you + 1 }));
        setStreak((s) => s + 1);
        setCoins((cc) => cc + 25);
        setTaunt(TAUNTS_WIN[Math.floor(Math.random() * TAUNTS_WIN.length)]);
        audio.playCoin();
      } else if (o === "lose") {
        setScore((s) => ({ ...s, dog: s.dog + 1 }));
        setStreak(0);
        setTaunt(TAUNTS_LOSE[Math.floor(Math.random() * TAUNTS_LOSE.length)]);
        audio.playGlitch();
      } else {
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        setTaunt(TAUNTS_DRAW[Math.floor(Math.random() * TAUNTS_DRAW.length)]);
      }
      setHistory((h) => [...h, c].slice(-10));
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
            He guesses. He cheats. Beat him 3 in a row for a fake reward.
          </p>
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
              disabled={revealing}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="bg-black/70 border-2 border-primary px-5 py-4 text-primary uppercase font-black tracking-widest clickable disabled:opacity-30 flex flex-col items-center gap-1"
            >
              {ICONS[c]}
              <span className="text-xs">{c}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
          <div className="text-secondary">YOU: {score.you}</div>
          <div className="text-primary">NATTOUN: {score.dog}</div>
          <div className="text-white/50">DRAWS: {score.draws}</div>
          <div className="text-pink-400">STREAK: {streak}</div>
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
