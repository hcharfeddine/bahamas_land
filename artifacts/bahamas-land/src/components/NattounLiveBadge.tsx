import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Tv } from "lucide-react";

const SCHED_HOUR = 17;
const SCHED_MIN = 30;
const SCHED_WINDOW_MIN = 45;
const TROLL_LIVE_CHANCE = 0.5;

function useNattounLive() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const schedStart = SCHED_HOUR * 60 + SCHED_MIN;
    const schedEnd = schedStart + SCHED_WINDOW_MIN;
    const inWindow = minutesNow >= schedStart && minutesNow < schedEnd;
    const seed = Math.floor(now.getTime() / 60_000 / 7);
    const rand = (Math.sin(seed * 9301 + 49297) * 233280) % 1;
    const trolling = !inWindow && Math.abs(rand) < TROLL_LIVE_CHANCE;
    return { live: inWindow || trolling, trolling };
  }, [now]);
}

export function NattounLiveBadge() {
  const { live, trolling } = useNattounLive();
  const [location] = useLocation();

  if (location === "/stream") return null;

  if (!live) {
    return (
      <Link
        href="/stream"
        title="Stream is offline. Visit anyway."
        className="inline-flex items-center gap-2 bg-black/50 border border-secondary/50 text-secondary/70 px-3 py-1 font-mono text-xs uppercase tracking-wider hover:text-secondary hover:border-secondary transition-colors clickable"
      >
        <Tv className="w-3 h-3" />
        Nattoun: OFF
      </Link>
    );
  }

  return (
    <Link
      href="/stream"
      title={
        trolling
          ? "Nattoun is live (unscheduled)."
          : "Nattoun is live (scheduled 17:30)."
      }
      className="inline-flex items-center gap-2 bg-pink-500/20 border-2 border-pink-500 text-pink-300 px-3 py-1 font-mono text-xs uppercase font-bold tracking-wider hover:bg-pink-500/40 transition-colors clickable"
      style={{ boxShadow: "0 0 10px rgba(244, 114, 182, 0.6)" }}
    >
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="w-2 h-2 bg-pink-400 rounded-full"
      />
      <Tv className="w-3 h-3" />
      NATTOUN LIVE{trolling ? " ⚠" : ""}
    </Link>
  );
}
