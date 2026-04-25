import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { unlock } from "@/lib/achievements";

type DayForecast = {
  day: string;
  emoji: string;
  high: number;
  low: number;
  cond: string;
  warn?: string;
};

const CONDITIONS = [
  { emoji: "🌞", cond: "Patriotically sunny" },
  { emoji: "🌴", cond: "Palm-tree breeze" },
  { emoji: "🍪", cond: "Light baskouta showers" },
  { emoji: "🍪", cond: "Heavy baskouta storm" },
  { emoji: "🐕", cond: "Scattered dog naps" },
  { emoji: "🌪️", cond: "Whirlwind of decrees" },
  { emoji: "🔥", cond: "Treason-level humidity" },
  { emoji: "💸", cond: "NC inflation drizzle" },
  { emoji: "🎤", cond: "M3kky stream warm-front" },
  { emoji: "🚨", cond: "Authoritarian overcast" },
  { emoji: "⛈️", cond: "Thunder, but only verbally" },
];

const WARNINGS = [
  "BASKOUTA STORM WARNING — Citizens should remain indoors with tea.",
  "Mild treason advisory in effect for the eastern districts.",
  "DO NOT look directly at the sun. The President has not approved it.",
  "Wind speeds may carry unauthorised opinions. Wear earplugs.",
  "FREEDOM advisory: 0%. As usual.",
  "Curfew lifted for cats. Curfew tightened for everyone else.",
  "Possibility of light rebellion. Bring an umbrella.",
];

const DAYS = ["MON", "MON", "WED", "THU", "FRI", "SAT", "SUN"];
//             ↑ Tuesday is now Monday (Decree N°12)

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export default function Weather() {
  useEffect(() => {
    unlock("weather");
  }, []);

  const today = useMemo(() => {
    const c = pick(CONDITIONS, Math.floor(Math.random() * CONDITIONS.length));
    return { ...c, high: 99, low: 98 };
  }, []);

  const week: DayForecast[] = useMemo(
    () =>
      DAYS.map((d, i) => {
        const c = CONDITIONS[(i * 3 + Math.floor(Math.random() * 4)) % CONDITIONS.length];
        return {
          day: d,
          emoji: c.emoji,
          high: 99,
          low: 99,
          cond: c.cond,
          warn: i === 2 ? WARNINGS[Math.floor(Math.random() * WARNINGS.length)] : undefined,
        };
      }),
    [],
  );

  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTickerIdx((i) => i + 1), 4000);
    return () => clearInterval(t);
  }, []);
  const ticker = WARNINGS[tickerIdx % WARNINGS.length];

  return (
    <Layout showBack>
      <div
        className="min-h-screen w-full"
        style={{
          background:
            "linear-gradient(180deg, #1a0f2e 0%, #2d1850 50%, #ff3399 100%)",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-10 space-y-6">
          {/* TV header */}
          <div className="bg-black border-2 border-pink-500 neon-box rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-700 text-white">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE — BL News Channel 1 (only channel)
              </div>
              <div className="font-mono text-xs uppercase tracking-widest">
                {new Date().toUTCString().slice(0, 16)}
              </div>
            </div>

            <div className="p-5 md:p-7 text-center">
              <div className="font-mono text-pink-300 text-xs md:text-sm uppercase tracking-[0.4em]">
                ★ Bahamas Land National Weather Ministry ★
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-black text-white tracking-wider mt-2 neon-text">
                TODAY'S FORECAST
              </h1>
            </div>

            {/* Big now-card */}
            <div className="px-4 pb-5">
              <div className="bg-gradient-to-br from-pink-900/60 to-purple-900/60 border border-pink-500/50 rounded-md p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="text-center md:text-left">
                  <div className="font-mono text-pink-300 text-xs uppercase tracking-widest mb-1">
                    Currently
                  </div>
                  <div className="text-white font-black text-5xl md:text-6xl">
                    99°<span className="text-3xl">F</span>
                  </div>
                  <div className="text-pink-200 font-mono text-xs uppercase mt-1 tracking-widest">
                    feels like 100°F (always)
                  </div>
                </div>
                <div className="text-center text-7xl md:text-8xl">{today.emoji}</div>
                <div className="text-center md:text-right">
                  <div className="text-white font-black text-xl md:text-2xl">{today.cond}</div>
                  <div className="text-pink-200 font-mono text-xs mt-2 tracking-widest uppercase">
                    Wind: 0 mph (illegal)
                  </div>
                  <div className="text-pink-200 font-mono text-xs tracking-widest uppercase">
                    Humidity: 412%
                  </div>
                  <div className="text-pink-200 font-mono text-xs tracking-widest uppercase">
                    UV index: REDACTED
                  </div>
                </div>
              </div>
            </div>

            {/* Crawling warning ticker */}
            <div className="bg-red-700 text-white py-2 overflow-hidden border-y-2 border-red-900">
              <motion.div
                key={ticker}
                initial={{ x: "100%" }}
                animate={{ x: "-100%" }}
                transition={{ duration: 12, ease: "linear" }}
                className="font-mono text-sm md:text-base font-black uppercase tracking-widest whitespace-nowrap"
              >
                ⚠ {ticker} ⚠ {ticker} ⚠
              </motion.div>
            </div>
          </div>

          {/* 7-day forecast */}
          <div className="bg-black/70 border-2 border-pink-500/60 rounded-md p-4">
            <div className="font-mono text-pink-300 text-xs uppercase tracking-widest mb-3 text-center">
              ★ 7-Day Forecast (post-Decree N°12) ★
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {week.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-gradient-to-b from-pink-900/40 to-purple-900/40 border border-pink-500/40 rounded p-3 text-center"
                  data-testid={`forecast-${i}`}
                >
                  <div className="font-mono text-pink-300 text-[10px] uppercase tracking-widest">
                    {d.day}
                  </div>
                  <div className="text-3xl my-1">{d.emoji}</div>
                  <div className="text-white font-black text-lg">{d.high}°</div>
                  <div className="text-pink-200/70 font-mono text-[10px] uppercase">
                    {d.cond}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Air & vibes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Air Quality" value="GOOD*" sub="*President says so" />
            <Stat label="Pollen Count" value="0" sub="No pollen, no problem" />
            <Stat label="Treason Index" value="HIGH" sub="Up 12% from yesterday" />
          </div>

          {/* Sponsor footer */}
          <div className="bg-black/70 border-2 border-pink-500/40 rounded p-4 text-center">
            <div className="font-mono text-pink-300 text-[11px] uppercase tracking-widest mb-2">
              ★ This forecast is brought to you by ★
            </div>
            <div className="text-white font-black text-xl md:text-2xl tracking-widest">
              THE OFFICE OF THE PRESIDENT
            </div>
            <div className="text-pink-200/70 font-mono text-xs italic mt-1">
              "If you don't like the weather, file a complaint with The Dog."
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-black/70 border border-pink-500/50 rounded p-4 text-center">
      <div className="font-mono text-pink-300 text-[10px] uppercase tracking-widest">
        {label}
      </div>
      <div className="text-white font-black text-3xl my-1">{value}</div>
      <div className="font-mono text-pink-200/70 text-xs italic">{sub}</div>
    </div>
  );
}
