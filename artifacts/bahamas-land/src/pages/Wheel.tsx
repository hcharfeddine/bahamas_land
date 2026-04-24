import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useUsername, useVerdicts, useCoins } from "@/lib/store";
import { audio } from "@/lib/audio";
import { Coins } from "lucide-react";
import { trackSpend } from "@/lib/tracker";
import { unlock } from "@/lib/achievements";

const COST_PER_SPIN = 20;

const VERDICTS = [
  "GUILTY of vibing",
  "INNOCENT-ish",
  "MILDLY GUILTY",
  "EXTREMELY GUILTY",
  "PARDONED",
  "FINED 5 NC",
  "DEPORTED",
  "RETRIAL TOMORROW",
];

const FULL_VERDICTS: Record<string, string> = {
  "GUILTY of vibing": "GUILTY of vibing wrong",
  "INNOCENT-ish": "INNOCENT but suspicious",
  "MILDLY GUILTY": "MILDLY GUILTY",
  "EXTREMELY GUILTY": "EXTREMELY GUILTY of being mid",
  "PARDONED": "PARDONED by accident",
  "FINED 5 NC": "FINED 5 Nattoun Coins",
  "DEPORTED": "DEPORTED to the nose again",
  "RETRIAL TOMORROW": "RETRIAL: come back tomorrow",
};

// Reward / penalty per verdict label.
const VERDICT_PAYOUT: Record<string, number> = {
  "GUILTY of vibing": -10,
  "INNOCENT-ish": 50,
  "MILDLY GUILTY": -5,
  "EXTREMELY GUILTY": -25,
  "PARDONED": 100,
  "FINED 5 NC": -5,
  "DEPORTED": -15,
  "RETRIAL TOMORROW": 0,
};

const COLORS = [
  "hsl(320 100% 60%)",
  "hsl(190 100% 60%)",
  "hsl(48 100% 60%)",
  "hsl(280 100% 65%)",
  "hsl(140 100% 55%)",
  "hsl(0 100% 60%)",
];

export default function Wheel() {
  const [username] = useUsername();
  const [, setVerdicts] = useVerdicts();
  const [coins, setCoins] = useCoins();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [delta, setDelta] = useState<number>(0);

  const canAfford = coins >= COST_PER_SPIN;

  const spin = () => {
    if (spinning || !canAfford) return;

    // Charge the spin up front. NC has value now.
    setCoins((c) => c - COST_PER_SPIN);
    trackSpend(COST_PER_SPIN);
    unlock("gambler");

    const idx = Math.floor(Math.random() * VERDICTS.length);
    const segment = 360 / VERDICTS.length;
    const target = 360 * 6 + (360 - (idx * segment + segment / 2));
    const newAngle = angle + target;
    setAngle(newAngle);
    setSpinning(true);
    setResult(null);
    setDelta(0);
    audio.playGlitch();
    window.setTimeout(() => {
      const verdict = VERDICTS[idx];
      const v = FULL_VERDICTS[verdict] || verdict;
      const payout = VERDICT_PAYOUT[verdict] ?? 0;
      setResult(v);
      setDelta(payout);
      setSpinning(false);
      if (payout !== 0) {
        setCoins((c) => Math.max(0, c + payout));
        if (payout > 0) audio.playCoin();
        else audio.playGlitch();
      }
      setVerdicts((arr) => [
        ...arr,
        {
          id: Math.random().toString(36).slice(2, 10),
          username: username || "ANON",
          text: "Spun the Wheel",
          verdict: v,
          timestamp: Date.now(),
        },
      ]);
    }, 4200);
  };

  const segment = 360 / VERDICTS.length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-widest neon-text">
            Wheel of Verdicts
          </h1>
          <p className="text-secondary font-mono text-sm uppercase mt-2">Justice is random. Embrace it.</p>
        </div>

        {/* Cost / balance bar */}
        <div className="flex items-center gap-4 bg-black/70 border-2 border-accent px-4 py-2 font-mono text-xs uppercase tracking-widest">
          <span className="text-accent flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" /> {coins} NC
          </span>
          <span className="text-white/40">·</span>
          <span className="text-secondary">
            Cost per spin: {COST_PER_SPIN} NC
          </span>
        </div>

        <div className="relative w-72 h-72 md:w-96 md:h-96">
          {/* Pointer */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderTop: "26px solid hsl(var(--primary))",
                filter: "drop-shadow(0 0 8px hsl(var(--primary)))",
              }}
            />
          </div>

          <motion.div
            animate={{ rotate: angle }}
            transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full rounded-full border-4 border-primary relative overflow-hidden neon-box"
            style={{ filter: "drop-shadow(0 0 20px hsl(var(--primary)))" }}
          >
            <svg viewBox="-50 -50 100 100" className="w-full h-full">
              {VERDICTS.map((v, i) => {
                const start = (i * segment * Math.PI) / 180;
                const end = ((i + 1) * segment * Math.PI) / 180;
                const x1 = 50 * Math.cos(start);
                const y1 = 50 * Math.sin(start);
                const x2 = 50 * Math.cos(end);
                const y2 = 50 * Math.sin(end);
                const midDeg = i * segment + segment / 2;
                const flip = midDeg > 90 && midDeg < 270;
                return (
                  <g key={i}>
                    <path
                      d={`M 0 0 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity="0.35"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.3"
                    />
                    <g transform={`rotate(${midDeg})`}>
                      <text
                        x={flip ? -10 : 10}
                        y="0"
                        fill="white"
                        fontSize="3.2"
                        fontWeight="bold"
                        textAnchor={flip ? "end" : "start"}
                        dominantBaseline="middle"
                        transform={flip ? "rotate(180)" : undefined}
                        style={{
                          fontFamily: "monospace",
                          letterSpacing: "0.3px",
                          paintOrder: "stroke",
                          stroke: "black",
                          strokeWidth: 0.6,
                          strokeLinejoin: "round",
                        }}
                      >
                        {v}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black border-2 border-primary z-10" />
        </div>

        <Button
          onClick={spin}
          disabled={spinning || !canAfford}
          className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black uppercase font-black tracking-widest px-12 py-6 text-base disabled:opacity-30"
        >
          {spinning
            ? "JUDGING..."
            : !canAfford
              ? `NEED ${COST_PER_SPIN} NC`
              : `SPIN (${COST_PER_SPIN} NC)`}
        </Button>

        {result && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: -3 }}
            className="border-4 border-secondary text-secondary px-6 py-3 uppercase font-black text-sm md:text-base text-center"
            style={{ textShadow: "0 0 8px hsl(var(--secondary))" }}
          >
            VERDICT: {result}
            {delta !== 0 && (
              <div
                className={`mt-2 text-xs font-mono ${delta > 0 ? "text-green-400" : "text-red-400"}`}
              >
                {delta > 0 ? `+${delta}` : `${delta}`} NC
              </div>
            )}
          </motion.div>
        )}

        {!canAfford && (
          <p className="text-center text-xs font-mono uppercase text-white/50 max-w-md">
            You're broke. Beg the President at the Bank, or earn NC by completing secrets.
          </p>
        )}
      </div>
    </Layout>
  );
}
