import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Radio } from "lucide-react";

// ============================================================================
// M3KKY LIVE PANEL
// ============================================================================
// A "live preview" of M3kky's Kick stream embedded in the page, with
// President Nattoun providing trolling commentary across the bottom.
// Pretends to always be live (because in Bahamas Land all loyal streamers
// are live, by decree).
// ============================================================================

const NATTOUN_TROLLS = [
  "M3kky is live AGAIN. Of course. He learned from me.",
  "He's streaming. The country is watching. Mostly me.",
  "I taught him everything. The chair. The vibe. The everything.",
  "Watch M3kky, then come back. Or do not come back. Loyalty test.",
  "He's stealing my viewers. Mods, follow him from my account.",
  "If M3kky raids me I will pretend to be surprised. Pact.",
  "Kick.com is the official platform of Bahamas Land. By decree.",
  "M3kky pays his taxes. In NC. Mostly.",
  "He just typed 'mid' in his own chat. We're investigating.",
  "Subscribe to M3kky. Then subscribe to me. Then subscribe to the dog.",
];

const TROLL_INTERVAL_MS = 5_500;

export function M3kkyLivePanel() {
  const [trollIdx, setTrollIdx] = useState(0);
  const [embedFailed, setEmbedFailed] = useState(false);

  useEffect(() => {
    const id = window.setInterval(
      () => setTrollIdx((i) => (i + 1) % NATTOUN_TROLLS.length),
      TROLL_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  // Some browsers / networks block the kick player iframe (X-Frame-Options).
  // Detect after a short timeout — if no load event, show fallback art.
  useEffect(() => {
    const id = window.setTimeout(() => {
      // If we never received a load event we treat it as failed. This is a
      // best-effort fallback; the visual still tells the story either way.
      const iframe = document.getElementById("m3kky-embed") as HTMLIFrameElement | null;
      if (!iframe) return;
      try {
        // If the iframe has navigated to about:blank or is empty, mark failed.
        const ok = iframe.contentWindow !== null;
        if (!ok) setEmbedFailed(true);
      } catch {
        // Cross-origin throw means it actually loaded. Leave alone.
      }
    }, 3500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="bg-black/85 border-2 border-[#53fc18] overflow-hidden" style={{ boxShadow: "0 0 18px rgba(83, 252, 24, 0.35)" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#53fc18] px-3 py-2">
        <div className="flex items-center gap-2 text-[#53fc18] font-black uppercase text-xs tracking-widest">
          <Radio className="w-4 h-4" />
          M3KKY LIVE — KICK
        </div>
        <a
          href="https://kick.com/m3kky"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#53fc18] hover:text-white text-[10px] uppercase font-black tracking-widest flex items-center gap-1 clickable border border-[#53fc18]/50 px-2 py-1"
        >
          OPEN ON KICK <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Player */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        {!embedFailed ? (
          <iframe
            id="m3kky-embed"
            src="https://player.kick.com/m3kky?autoplay=false&muted=true"
            title="M3kky on Kick"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            onError={() => setEmbedFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, #53fc1888 0%, transparent 60%), #001a00",
            }}
          >
            <div className="text-[#53fc18] font-black text-3xl md:text-5xl uppercase tracking-widest neon-text">
              M3KKY
            </div>
            <div className="text-white/70 font-mono text-xs uppercase mt-2 tracking-widest">
              The embed refused to load. Probably mid.
            </div>
            <a
              href="https://kick.com/m3kky"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 border-2 border-[#53fc18] text-[#53fc18] font-black uppercase tracking-widest text-xs clickable hover:bg-[#53fc18] hover:text-black"
            >
              Watch on Kick →
            </a>
          </div>
        )}

        {/* LIVE badge */}
        <div className="absolute top-2 left-2 z-30">
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="bg-[#53fc18] text-black px-2 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/30"
          >
            <span className="w-2 h-2 rounded-full bg-black" />
            LIVE (per Bahamas Land)
          </motion.div>
        </div>
      </div>

      {/* Nattoun trolling captions */}
      <div className="border-t-2 border-[#53fc18] bg-black/90 px-3 py-2 min-h-[44px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={trollIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-pink-300 font-mono text-xs leading-snug"
          >
            <span className="text-pink-500 font-black uppercase tracking-widest mr-1">
              NATTOUN:
            </span>
            "{NATTOUN_TROLLS[trollIdx]}"
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
