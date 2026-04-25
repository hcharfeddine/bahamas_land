import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/lib/store";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";
import nattounImg from "@assets/Nattoun_1777028672745.png";

type Side = "heads" | "tails";
type Phase = "idle" | "flipping" | "result";

const TROLL_LINES = [
  "The coin is honest. You're just unlucky.",
  "Audited by The Dog. Verified fair.",
  "If the coin lands wrong, blame the wind. Not the President.",
  "Statistically, 50/50. In Bahamas Land, statistics are illegal.",
  "Both sides are Nattoun. This is not a bug. This is the constitution.",
  "Heads = Nattoun. Tails = also Nattoun. Choose wisely.",
];

const DEFEATS = [
  "Loss recorded. Citizen flagged for further observation.",
  "Tough break. The President sends his thoughts and your NC.",
  "RNG approved by Decree N°412.",
  "The coin landed correctly. You did not.",
  "Refund denied. By order of the President.",
  "You lost. The coin is now happier.",
];

const WINS = [
  "Audit pending. Do not spend yet.",
  "Suspicious win. Flagged for review.",
  "The coin slipped. We're calling it a tie. (You won.)",
  "Win acknowledged. Begrudgingly.",
  "The President will deduct this from your next paycheck.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CoinFlip() {
  const [coins, setCoins] = useCoins();
  const [bet, setBet] = useState(50);
  const [pick_, setPick] = useState<Side>("heads");
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<Side | null>(null);
  const [streak, setStreak] = useState(0);     // current loss streak
  const [winStreak, setWinStreak] = useState(0);
  const [history, setHistory] = useState<Array<"W" | "L">>([]);
  const [troll, setTroll] = useState(TROLL_LINES[0]);
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    setTroll(pick(TROLL_LINES));
  }, []);

  // Bet must always be a positive integer ≤ coins.
  const safeBet = Math.max(1, Math.min(bet, Math.max(1, coins)));

  function flip() {
    if (phase === "flipping") return;
    if (coins < safeBet) {
      setResultMsg("Insufficient NC. The President is laughing.");
      return;
    }
    audio.playBlip();
    setPhase("flipping");
    setOutcome(null);
    setResultMsg("");

    // Deduct bet up-front.
    setCoins((c) => c - safeBet);

    // Outcome is genuinely 50/50 — but the win streak gets quietly
    // sabotaged after 3 wins in a row to keep the troll energy alive.
    const rand = Math.random();
    let landed: Side;
    if (winStreak >= 3) {
      // 90% chance the coin lands on the OPPOSITE of player's pick.
      landed = rand < 0.9 ? (pick_ === "heads" ? "tails" : "heads") : pick_;
    } else if (streak >= 4) {
      // After 4 losses, give the player a small mercy: 60% of their pick.
      landed = rand < 0.6 ? pick_ : (pick_ === "heads" ? "tails" : "heads");
    } else {
      landed = rand < 0.5 ? "heads" : "tails";
    }

    window.setTimeout(() => {
      setOutcome(landed);
      setPhase("result");
      const won = landed === pick_;
      if (won) {
        const payout = safeBet * 2;
        setCoins((c) => c + payout);
        setStreak(0);
        setWinStreak((w) => w + 1);
        setHistory((h) => [...h.slice(-9), "W"]);
        setResultMsg(`+${payout} NC — ${pick(WINS)}`);
        audio.playCoin();
      } else {
        setStreak((s) => {
          const next = s + 1;
          if (next >= 5) unlock("rigged");
          return next;
        });
        setWinStreak(0);
        setHistory((h) => [...h.slice(-9), "L"]);
        setResultMsg(`-${safeBet} NC — ${pick(DEFEATS)}`);
        audio.playGlitch();
      }
      setTroll(pick(TROLL_LINES));
    }, 1700);
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-2">🪙</div>
          <h1 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-widest neon-text">
            Presidential Coin Flip
          </h1>
          <p className="text-secondary font-mono text-xs uppercase mt-2 tracking-widest">
            State-licensed gambling. Audited by the Dog.
          </p>
        </div>

        {/* Coin stage */}
        <div className="relative bg-black/60 border-2 border-primary p-6 rounded-md neon-box">
          <div className="flex items-center justify-between mb-4 font-mono text-xs md:text-sm uppercase tracking-widest">
            <div className="text-primary">
              Balance: <span className="text-secondary font-black">{coins} NC</span>
            </div>
            <div className="text-secondary/80">
              Streak: {streak > 0 ? `−${streak} L` : winStreak > 0 ? `+${winStreak} W` : "—"}
            </div>
          </div>

          <div className="flex items-center justify-center h-56 md:h-64 perspective-[1200px]">
            <AnimatePresence mode="wait">
              {phase !== "result" ? (
                <motion.div
                  key={phase === "flipping" ? "spin" : "still"}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={
                    phase === "flipping"
                      ? { scale: 1, opacity: 1, rotateX: [0, 720, 1440, 2160], y: [0, -60, -90, 0] }
                      : { scale: 1, opacity: 1, rotateX: 0, y: 0 }
                  }
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={
                    phase === "flipping"
                      ? { duration: 1.65, ease: "easeOut" }
                      : { duration: 0.3 }
                  }
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center"
                  style={{
                    transformStyle: "preserve-3d",
                    background:
                      "radial-gradient(circle at 30% 30%, #ffe27a 0%, #d4a019 60%, #6b4710 100%)",
                    boxShadow:
                      "0 0 25px rgba(255,200,80,0.7), inset 0 0 25px rgba(0,0,0,0.4)",
                    border: "6px solid #c08a10",
                  }}
                  data-testid="coin-flip-stage"
                >
                  <div className="text-center text-amber-950 font-black">
                    <div className="text-4xl">🐕</div>
                    <div className="text-[9px] tracking-widest mt-1">★ NATTOUN ★</div>
                    <div className="text-[8px] tracking-widest opacity-70">1 NC</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, #ffe27a 0%, #d4a019 60%, #6b4710 100%)",
                    boxShadow:
                      "0 0 35px rgba(255,200,80,0.9), inset 0 0 25px rgba(0,0,0,0.4)",
                    border: "6px solid #c08a10",
                  }}
                  data-testid="coin-flip-result"
                >
                  {outcome === "heads" ? (
                    <div className="text-center text-amber-950 font-black">
                      <img
                        src={nattounImg}
                        alt="Heads"
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-full mx-auto"
                        style={{ filter: "sepia(0.6) contrast(1.1)" }}
                      />
                      <div className="text-[10px] tracking-widest mt-1">HEADS</div>
                    </div>
                  ) : (
                    <div className="text-center text-amber-950 font-black">
                      <div className="text-5xl">🐾</div>
                      <div className="text-[10px] tracking-widest mt-1">TAILS</div>
                      <div className="text-[8px] tracking-widest opacity-70">(also Nattoun)</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Result line */}
          <div className="text-center mt-3 min-h-[2.5rem] font-mono text-sm md:text-base">
            {resultMsg ? (
              <motion.div
                key={resultMsg}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={
                  resultMsg.startsWith("+")
                    ? "text-green-400 font-black"
                    : resultMsg.startsWith("-")
                    ? "text-red-400 font-black"
                    : "text-yellow-300"
                }
                data-testid="coin-flip-message"
              >
                {resultMsg}
              </motion.div>
            ) : (
              <span className="text-white/60 italic">{troll}</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/60 border-2 border-secondary p-5 rounded-md space-y-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-secondary mb-2">
              Your Pick
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setPick("heads"); audio.playBlip(); }}
                disabled={phase === "flipping"}
                data-testid="pick-heads"
                className={`py-3 border-2 font-black uppercase tracking-widest text-sm transition ${
                  pick_ === "heads"
                    ? "border-primary bg-primary text-black neon-box"
                    : "border-primary/40 text-primary hover:border-primary"
                }`}
              >
                🐕 Heads
              </button>
              <button
                onClick={() => { setPick("tails"); audio.playBlip(); }}
                disabled={phase === "flipping"}
                data-testid="pick-tails"
                className={`py-3 border-2 font-black uppercase tracking-widest text-sm transition ${
                  pick_ === "tails"
                    ? "border-primary bg-primary text-black neon-box"
                    : "border-primary/40 text-primary hover:border-primary"
                }`}
              >
                🐾 Tails
              </button>
            </div>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-secondary mb-2 flex justify-between">
              <span>Bet</span>
              <span className="text-primary">{safeBet} NC</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(1, Math.min(coins, 5000))}
              value={Math.min(safeBet, Math.max(1, coins))}
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={phase === "flipping" || coins <= 0}
              data-testid="bet-slider"
              className="w-full accent-pink-500"
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[10, 50, 100, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setBet(Math.min(v, Math.max(1, coins)))}
                  disabled={phase === "flipping" || coins < v}
                  className="border border-secondary/50 text-secondary font-mono text-[11px] py-1 hover:bg-secondary/10 disabled:opacity-30"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={flip}
            disabled={phase === "flipping" || coins <= 0}
            className="w-full font-black uppercase tracking-widest text-lg py-6 bg-primary text-black hover:bg-primary/80"
            data-testid="flip-button"
          >
            {phase === "flipping"
              ? "Flipping…"
              : coins <= 0
              ? "Out of NC. Visit the Bank."
              : `Flip for ${safeBet} NC`}
          </Button>
        </div>

        {/* History */}
        <div className="bg-black/40 border border-primary/30 px-4 py-3 rounded-md flex items-center justify-between font-mono text-xs uppercase tracking-widest">
          <span className="text-primary/80">Last 10 Flips</span>
          <div className="flex gap-1">
            {history.length === 0 ? (
              <span className="text-white/40 italic normal-case">no history yet</span>
            ) : (
              history.map((h, i) => (
                <span
                  key={i}
                  className={
                    h === "W"
                      ? "text-green-400 font-black"
                      : "text-red-400 font-black"
                  }
                >
                  {h}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-white/50 font-mono text-[10px] uppercase tracking-widest">
          By flipping, you agree to Decree N°412. Refunds processed by The Dog (asleep).
        </div>
      </div>
    </Layout>
  );
}
