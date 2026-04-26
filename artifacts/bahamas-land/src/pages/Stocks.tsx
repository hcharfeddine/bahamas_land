import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useCoins, useLocalStorage } from "@/lib/store";
import { TrendingUp, TrendingDown } from "lucide-react";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";

type Tick = { price: number; t: number };

const STARTING_PRICE = 100;
const TICK_MS = 1500;
const MAX_HISTORY = 60;

const HEADLINES = [
  "Nattoun spotted near the bank. Markets nervous.",
  "President sneezed. Coin loses 12%.",
  "OG council declares stocks illegal. Stocks rise.",
  "Museum visitor donates relic. Coin pumps.",
  "Library admits coin is fictional. Coin shrugs.",
  "Mass outbreak of vibes. Coin moons.",
  "Insider trading suspected. (It is the President.)",
  "Court of OGs rules markets unreal. Markets continue.",
  "Bank of Nattoun unable to count past 999.",
  "Coin officially backed by stolen memes. Up 4%.",
];

export default function Stocks() {
  const [coins, setCoins] = useCoins();
  const [holdings, setHoldings] = useLocalStorage<number>("ogs_stocks_holdings", 0);
  const [avgCost, setAvgCost] = useLocalStorage<number>("ogs_stocks_avg_cost", 0);
  const [history, setHistory] = useState<Tick[]>([{ price: STARTING_PRICE, t: Date.now() }]);
  const [headline, setHeadline] = useState(HEADLINES[0]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHistory((h) => {
        const last = h[h.length - 1].price;
        let drift = (Math.random() - 0.5) * 8;
        if (Math.random() < 0.06) drift = (Math.random() - 0.5) * 60; // shock event
        const next = Math.max(1, Math.round((last + drift) * 100) / 100);
        const newH = [...h, { price: next, t: Date.now() }];
        if (newH.length > MAX_HISTORY) newH.shift();
        return newH;
      });
      if (Math.random() < 0.2) {
        setHeadline(HEADLINES[Math.floor(Math.random() * HEADLINES.length)]);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const price = history[history.length - 1].price;
  const prev = history.length > 1 ? history[history.length - 2].price : price;
  const delta = price - prev;
  const pct = prev > 0 ? (delta / prev) * 100 : 0;
  const portfolioValue = Math.round(holdings * price);
  const profit = Math.round(holdings * (price - avgCost));

  const buy = (qty: number) => {
    if (qty <= 0) return;
    const cost = Math.round(qty * price);
    if (cost > coins) return;
    const newHoldings = holdings + qty;
    const newAvg = (holdings * avgCost + cost) / newHoldings;
    setHoldings(newHoldings);
    setAvgCost(Math.round(newAvg * 100) / 100);
    setCoins(coins - cost);
    audio.playBlip();
  };

  const sell = (qty: number) => {
    if (qty <= 0 || qty > holdings) return;
    const proceeds = Math.round(qty * price);
    const cost = Math.round(qty * avgCost);
    const newHoldings = holdings - qty;
    setHoldings(newHoldings);
    if (newHoldings === 0) setAvgCost(0);
    setCoins(coins + proceeds);
    audio.playBlip();
    if (proceeds > cost) unlock("mastermind");
  };

  // Build chart polyline
  const chartW = 600;
  const chartH = 200;
  const minP = Math.min(...history.map((p) => p.price));
  const maxP = Math.max(...history.map((p) => p.price));
  const range = Math.max(1, maxP - minP);
  const points = history
    .map((p, i) => {
      const x = (i / Math.max(1, history.length - 1)) * chartW;
      const y = chartH - ((p.price - minP) / range) * chartH;
      return `${x},${y}`;
    })
    .join(" ");
  const trendUp = delta >= 0;
  const lineColor = trendUp ? "hsl(140 100% 55%)" : "hsl(0 100% 60%)";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full py-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-widest neon-text">
            Nattoun Coin Exchange
          </h1>
          <p className="text-secondary font-mono text-xs uppercase mt-2">Not financial advice. Possibly emotional damage.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs uppercase">
          <Stat label="Price" value={`${price.toFixed(2)} NC`} accent />
          <Stat label="Change" value={`${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${pct.toFixed(1)}%)`} positive={trendUp} negative={!trendUp} />
          <Stat label="Holdings" value={`${holdings} NTC`} />
          <Stat label="P/L" value={`${profit >= 0 ? "+" : ""}${profit} NC`} positive={profit >= 0} negative={profit < 0} />
        </div>

        <div className="bg-black/80 border-2 border-primary p-4 neon-box">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-48">
            <defs>
              <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* grid */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="0"
                x2={chartW}
                y1={(chartH / 3) * i}
                y2={(chartH / 3) * i}
                stroke="hsl(var(--primary) / 0.15)"
                strokeWidth="0.5"
              />
            ))}
            <polyline
              fill="url(#grad)"
              stroke="none"
              points={`0,${chartH} ${points} ${chartW},${chartH}`}
            />
            <polyline
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              points={points}
              style={{ filter: `drop-shadow(0 0 4px ${lineColor})` }}
            />
          </svg>
          <motion.div
            key={headline}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-secondary/80 text-xs font-mono uppercase mt-2 border-t border-primary/30 pt-2 flex items-center gap-2"
          >
            {trendUp ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
            <span>{headline}</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-secondary p-3 neon-box-cyan space-y-2">
            <div className="text-secondary uppercase text-xs font-mono">Buy NTC</div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map((q) => (
                <Button
                  key={q}
                  onClick={() => buy(q)}
                  disabled={Math.round(q * price) > coins}
                  className="bg-transparent border border-secondary text-secondary hover:bg-secondary hover:text-black font-bold uppercase text-xs"
                >
                  +{q}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-2 border-primary p-3 neon-box space-y-2">
            <div className="text-primary uppercase text-xs font-mono">Sell NTC</div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map((q) => (
                <Button
                  key={q}
                  onClick={() => sell(q)}
                  disabled={q > holdings}
                  className="bg-transparent border border-primary text-primary hover:bg-primary hover:text-black font-bold uppercase text-xs"
                >
                  -{q}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-xs font-mono text-white/40 uppercase">
          Portfolio Value: {portfolioValue} NC · Cash: {coins} NC · Total: {coins + portfolioValue} NC
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, accent, positive, negative }: { label: string; value: string; accent?: boolean; positive?: boolean; negative?: boolean }) {
  let color = "text-white";
  if (accent) color = "text-primary";
  if (positive) color = "text-green-400";
  if (negative) color = "text-red-400";
  return (
    <div className="bg-black/60 border border-primary/40 p-2 text-center">
      <div className="text-white/50 text-[10px] uppercase tracking-widest">{label}</div>
      <div className={`${color} font-bold`}>{value}</div>
    </div>
  );
}
