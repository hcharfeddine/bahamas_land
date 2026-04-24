import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unlock } from "@/lib/achievements";

type EggKey = "kdot" | "siuuu" | "kratos" | "goatmode" | "madridista" | "treasoncule";

const TRIGGERS: Record<string, EggKey> = {
  kendrick: "kdot",
  kdot: "kdot",
  notlikeus: "kdot",
  siu: "siuuu",
  siuu: "siuuu",
  siuuu: "siuuu",
  cr7: "siuuu",
  ronaldo: "siuuu",
  kratos: "kratos",
  spartan: "kratos",
  boyboyboy: "kratos",
  ghostofsparta: "kratos",
  messi: "goatmode",
  goat: "goatmode",
  leomessi: "goatmode",
  madrid: "madridista",
  halamadrid: "madridista",
  realmadrid: "madridista",
  vinijr: "madridista",
  barca: "treasoncule",
  barcelona: "treasoncule",
  visca: "treasoncule",
};

const DURATION_MS: Record<EggKey, number> = {
  kdot: 8000,
  siuuu: 5000,
  kratos: 7000,
  goatmode: 6000,
  madridista: 14000,
  treasoncule: 8000,
};

const ACH_FOR: Record<EggKey, string> = {
  kdot: "kdot",
  siuuu: "siuuu",
  kratos: "kratos",
  goatmode: "goatmode",
  madridista: "madridista",
  treasoncule: "treasoncule",
};

export function MediaEasterEggs() {
  const [active, setActive] = useState<EggKey | null>(null);
  const buffer = useRef<string>("");
  const dismissTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;

      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-24);

      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => {
        buffer.current = "";
      }, 2200);

      for (const trigger of Object.keys(TRIGGERS)) {
        if (buffer.current.endsWith(trigger)) {
          fire(TRIGGERS[trigger]);
          buffer.current = "";
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const fire = (key: EggKey) => {
    if (active) return;
    setActive(key);
    unlock(ACH_FOR[key] as never);
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    dismissTimer.current = window.setTimeout(() => setActive(null), DURATION_MS[key]);
  };

  return (
    <AnimatePresence>
      {active === "kdot" && <KDotOverlay key="kdot" onClose={() => setActive(null)} />}
      {active === "siuuu" && <SiuOverlay key="siu" onClose={() => setActive(null)} />}
      {active === "kratos" && <KratosOverlay key="kratos" onClose={() => setActive(null)} />}
      {active === "goatmode" && <GoatOverlay key="goat" onClose={() => setActive(null)} />}
      {active === "madridista" && <MadridOverlay key="madrid" onClose={() => setActive(null)} />}
      {active === "treasoncule" && <BarcaOverlay key="barca" onClose={() => setActive(null)} />}
    </AnimatePresence>
  );
}

// ============================================================
// KENDRICK — "THEY NOT LIKE US" flashing red/blue
// ============================================================
function KDotOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center cursor-pointer overflow-hidden"
      data-testid="egg-kdot"
    >
      <motion.div
        animate={{ backgroundColor: ["#dc2626", "#1d4ed8", "#000000", "#dc2626"] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-black/30" />
      {/* falling crowns */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, x: `${(i * 53) % 100}vw`, rotate: 0, opacity: 0 }}
          animate={{ y: "110vh", rotate: 720, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.15, ease: "linear" }}
          className="absolute text-5xl"
        >
          👑
        </motion.div>
      ))}
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [-2, 2, -2] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="font-black text-white uppercase tracking-tighter leading-none"
          style={{
            fontSize: "clamp(3rem, 14vw, 11rem)",
            textShadow: "0 0 20px #fff, 0 0 40px #dc2626, 6px 6px 0 #000",
            WebkitTextStroke: "3px #000",
          }}
        >
          They not<br />like us
        </motion.div>
        <div className="mt-6 text-white/90 font-mono uppercase tracking-widest text-sm md:text-base">
          K.DOT BROADCAST · CERTIFIED LOUD
        </div>
        <div className="mt-2 text-white/60 font-mono text-xs">[click anywhere to dismiss]</div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SIUUU — CR7 jump
// ============================================================
function SiuOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center cursor-pointer overflow-hidden"
      data-testid="egg-siu"
      style={{
        background:
          "linear-gradient(135deg, #006400 0%, #006400 35%, #ffd700 35%, #ffd700 50%, #ce1126 50%, #ce1126 100%)",
      }}
    >
      <motion.div
        animate={{ y: [40, -120, 40], rotate: [-8, 4, -8] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <div
          className="font-black text-white uppercase italic"
          style={{
            fontSize: "clamp(4rem, 20vw, 16rem)",
            textShadow: "0 0 30px #fff, 8px 8px 0 #000",
            WebkitTextStroke: "4px #000",
            letterSpacing: "-0.05em",
          }}
        >
          SIUUU!
        </div>
      </motion.div>
      <div className="absolute bottom-10 left-0 right-0 text-center text-white font-black uppercase tracking-widest text-xl drop-shadow-lg">
        CR7 · MR. CHAMPIONS LEAGUE · 5x BALLON D'OR
      </div>
      <div className="absolute top-6 right-6 text-white/80 font-mono text-xs uppercase">
        [click to dismiss]
      </div>
    </motion.div>
  );
}

// ============================================================
// KRATOS — BOY. axe rain on bloody red
// ============================================================
function KratosOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center cursor-pointer overflow-hidden"
      data-testid="egg-kratos"
      style={{
        background:
          "radial-gradient(ellipse at center, #5b0000 0%, #1a0000 60%, #000 100%)",
      }}
    >
      {/* falling axes */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -120, x: `${(i * 71) % 100}vw`, rotate: -45, opacity: 0 }}
          animate={{ y: "110vh", rotate: 360, opacity: [0, 1, 1, 0.5] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.25, ease: "linear" }}
          className="absolute text-6xl"
          style={{ filter: "drop-shadow(0 0 8px #ff2d2d)" }}
        >
          🪓
        </motion.div>
      ))}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ scale: 8, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="font-black text-white tracking-tighter leading-none"
          style={{
            fontSize: "clamp(5rem, 22vw, 18rem)",
            fontFamily: "'Times New Roman', serif",
            textShadow: "0 0 25px #ff0000, 0 0 60px #8b0000, 6px 6px 0 #000",
            WebkitTextStroke: "3px #000",
          }}
        >
          BOY.
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-red-200 font-black uppercase tracking-[0.4em] text-base md:text-2xl"
          style={{ textShadow: "0 0 12px #ff0000" }}
        >
          GHOST OF SPARTA · Ω
        </motion.div>
        <div className="mt-2 text-red-200/60 font-mono text-xs">[click to dismiss]</div>
      </div>
    </motion.div>
  );
}

// ============================================================
// MESSI — GOAT MODE Argentina
// ============================================================
function GoatOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center cursor-pointer overflow-hidden"
      data-testid="egg-goat"
      style={{
        background:
          "linear-gradient(180deg, #75aadb 0%, #ffffff 50%, #75aadb 100%)",
      }}
    >
      {/* confetti */}
      {Array.from({ length: 40 }).map((_, i) => {
        const colors = ["#75aadb", "#ffffff", "#fcbf49", "#75aadb"];
        return (
          <motion.div
            key={i}
            initial={{ y: -50, x: `${(i * 37) % 100}vw`, rotate: 0, opacity: 1 }}
            animate={{ y: "110vh", rotate: 720, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: (i * 0.08) % 2 }}
            className="absolute w-3 h-5"
            style={{ background: colors[i % colors.length], borderRadius: "2px" }}
          />
        );
      })}
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="text-7xl md:text-9xl mb-2"
        >
          🐐🏆
        </motion.div>
        <div
          className="font-black uppercase tracking-tighter leading-none"
          style={{
            fontSize: "clamp(3.5rem, 16vw, 13rem)",
            color: "#0d2c54",
            textShadow: "0 0 20px #fff, 6px 6px 0 #75aadb, 8px 8px 0 #000",
            WebkitTextStroke: "2px #fff",
          }}
        >
          GOAT MODE
        </div>
        <div className="mt-4 font-black uppercase tracking-widest text-sky-900 text-lg md:text-2xl">
          #10 · ALBICELESTE · 8 BALLON D'OR
        </div>
        <div className="mt-2 text-sky-900/60 font-mono text-xs">[click to dismiss]</div>
      </div>
    </motion.div>
  );
}

// ============================================================
// MADRID — HALA MADRID + autoplay anthem
// ============================================================
function MadridOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
      data-testid="egg-madrid"
      style={{
        background:
          "radial-gradient(ellipse at center, #ffffff 0%, #f0e6c8 50%, #d4af37 100%)",
      }}
    >
      {/* falling crowns + balls */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -120, x: `${(i * 47) % 100}vw`, rotate: 0, opacity: 0 }}
          animate={{ y: "110vh", rotate: 540, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.18, ease: "linear" }}
          className="absolute text-5xl"
          style={{ filter: "drop-shadow(0 0 10px #d4af37)" }}
        >
          {i % 3 === 0 ? "👑" : i % 3 === 1 ? "⚽" : "🏆"}
        </motion.div>
      ))}
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="font-black uppercase tracking-tighter leading-none"
          style={{
            fontSize: "clamp(2.5rem, 11vw, 9rem)",
            color: "#0a0a0a",
            textShadow: "0 0 25px #fff, 6px 6px 0 #d4af37",
            WebkitTextStroke: "2px #d4af37",
          }}
        >
          HALA MADRID<br />Y NADA MÁS
        </motion.div>
        <div className="mt-3 font-black text-amber-900 uppercase tracking-[0.3em] text-base md:text-2xl">
          15 × CHAMPIONS LEAGUE · LOS BLANCOS
        </div>
      </div>
      {/* hidden anthem player */}
      <iframe
        title="madrid-anthem"
        src="https://www.youtube.com/embed/yedujlSs0P8?autoplay=1&controls=0&loop=1&playlist=yedujlSs0P8&modestbranding=1"
        allow="autoplay; encrypted-media"
        className="absolute bottom-4 right-4 w-56 h-32 border-2 border-amber-700 shadow-2xl rounded-md"
        style={{ pointerEvents: "auto" }}
      />
      <div className="absolute top-4 right-4 text-amber-900 font-mono text-xs uppercase bg-white/70 px-2 py-1 rounded">
        ♪ anthem playing · click to dismiss
      </div>
    </motion.div>
  );
}

// ============================================================
// BARCA — TRAITOR ban screen
// ============================================================
function BarcaOverlay({ onClose }: { onClose: () => void }) {
  const [count, setCount] = useState(8);
  useEffect(() => {
    const id = window.setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center cursor-pointer overflow-hidden bg-black"
      data-testid="egg-barca"
    >
      <motion.div
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, #8b0000 0 4px, #000 4px 8px)",
        }}
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 text-center px-6">
        <div className="text-6xl md:text-8xl mb-4">🚫</div>
        <div
          className="font-black uppercase text-red-500 tracking-tighter leading-none"
          style={{
            fontSize: "clamp(3rem, 13vw, 10rem)",
            textShadow: "0 0 25px #ff0000, 6px 6px 0 #000",
            WebkitTextStroke: "3px #000",
          }}
        >
          TRAITOR<br />DETECTED
        </div>
        <div className="mt-4 text-white font-mono uppercase tracking-widest text-sm md:text-lg">
          Bahamas Land · MINISTRY OF LOYALTY
        </div>
        <div className="mt-2 text-red-300 font-mono text-xs uppercase">
          mentioning the rival club is treason. exiled in {count}s.
        </div>
        <div className="mt-2 text-white/40 font-mono text-[10px] uppercase">[click to plead guilty and dismiss]</div>
      </div>
    </motion.div>
  );
}
