import { useKickStatus } from "@/lib/kick";
import { Radio } from "lucide-react";
import { motion } from "framer-motion";

export function KickBadge() {
  const { status, viewers } = useKickStatus();

  if (status === "unknown") return null;

  if (status === "live") {
    return (
      <a
        href="https://kick.com/m3kky"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-red-600/20 border-2 border-red-500 text-red-400 px-3 py-1 font-mono text-xs uppercase font-bold tracking-wider hover:bg-red-600/40 transition-colors clickable"
        style={{ boxShadow: "0 0 10px rgba(239, 68, 68, 0.6)" }}
        title="M3kky is live on Kick"
      >
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-2 h-2 bg-red-500 rounded-full"
        />
        <Radio className="w-3 h-3" />
        LIVE{viewers !== null ? ` · ${viewers}` : ""}
      </a>
    );
  }

  return (
    <a
      href="https://kick.com/m3kky"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-black/50 border border-primary/40 text-primary/60 px-3 py-1 font-mono text-xs uppercase tracking-wider hover:text-primary transition-colors clickable"
      title="M3kky is offline"
    >
      <Radio className="w-3 h-3" />
      OFFLINE
    </a>
  );
}
