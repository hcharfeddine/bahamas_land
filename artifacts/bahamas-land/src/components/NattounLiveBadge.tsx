import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Tv } from "lucide-react";
import { getStreamStatus } from "@/lib/schedule";

function useNattounLive() {
  const [status, setStatus] = useState(() => getStreamStatus());
  useEffect(() => {
    const id = window.setInterval(
      () => setStatus(getStreamStatus(new Date())),
      30_000,
    );
    return () => window.clearInterval(id);
  }, []);
  return status;
}

export function NattounLiveBadge() {
  const status = useNattounLive();
  const { live, trolling } = status;
  const [location] = useLocation();

  if (location === "/stream") return null;

  if (!live) {
    return (
      <Link
        href="/stream"
        title="Live is closed. Visit anyway."
        className="inline-flex items-center gap-2 bg-black/50 border border-secondary/50 text-secondary/70 px-3 py-1 font-mono text-xs uppercase tracking-wider hover:text-secondary hover:border-secondary transition-colors clickable"
      >
        <Tv className="w-3 h-3" />
        LIVE CLOSED
      </Link>
    );
  }

  return (
    <Link
      href="/stream"
      title={
        trolling
          ? "Nattoun is live (random unscheduled slot)."
          : "Nattoun is live (official 17:50 address)."
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
