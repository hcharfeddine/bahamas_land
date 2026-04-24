import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useUsername, useVerdicts } from "@/lib/store";
import { audio } from "@/lib/audio";

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
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const spin = () => {
    if (spinning) return;
    const idx = Math.floor(Math.random() * VERDICTS.length);
    const segment = 360 / VERDICTS.length;
    const target = 360 * 6 + (360 - (idx * segment + segment / 2));
    const newAngle = angle + target;
    setAngle(newAngle);
    setSpinning(true);
    setResult(null);
    audio.playGlitch();
    window.setTimeout(() => {
      const v = FULL_VERDICTS[VERDICTS[idx]] || VERDICTS[idx];
      setResult(v);
      setSpinning(false);
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
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-widest neon-text">
            Wheel of Verdicts
          </h1>
          <p className="text-secondary font-mono text-sm uppercase mt-2">Justice is random. Embrace it.</p>
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
          disabled={spinning}
          className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black uppercase font-black tracking-widest px-12 py-6 text-base"
        >
          {spinning ? "JUDGING..." : "SPIN"}
        </Button>

        {result && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: -3 }}
            className="border-4 border-secondary text-secondary px-6 py-3 uppercase font-black text-sm md:text-base text-center"
            style={{ textShadow: "0 0 8px hsl(var(--secondary))" }}
          >
            VERDICT: {result}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
