import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unlock } from "@/lib/achievements";

type EggKey =
  | "kdot"
  | "siuuu"
  | "kratos"
  | "madridista"
  | "treasoncule"
  | "faddina"
  | "catjam"
  | "cena"
  | "ggez"
  | "drake"
  | "rickroll"
  | "khamsa"
  | "omegalul"
  | "stonecold"
  | "baskouta";

// ---------------------------------------------------------------
// Triggers are intentionally not stored as plain strings. They are
// stored as djb2 hashes so anyone reading the bundle can't just
// search for "kendrick" or "faddina" and learn the secret words.
// To compute a new hash:
//   let h=5381; for c of word.toLowerCase(): h=((h<<5)+h)^charCode(c)
// then (h>>>0).
// ---------------------------------------------------------------
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

// [length, hash, eggKey] — keep this list aligned with the trigger
// hash table. To rotate triggers, regenerate hashes via the helper
// above.
const TRIGGER_TABLE: ReadonlyArray<readonly [number, number, EggKey]> = [
  // kdot
  [8, 3991996050, "kdot"],
  [4, 2088048017, "kdot"],
  [9, 2940816317, "kdot"],
  [3, 193419346, "kdot"],
  [9, 1284109585, "kdot"],
  // siuuu
  [3, 193433770, "siuuu"],
  [4, 2088347039, "siuuu"],
  [5, 195975434, "siuuu"],
  [3, 193416515, "siuuu"],
  [7, 1459407632, "siuuu"],
  // kratos
  [6, 1863654453, "kratos"],
  [7, 2091804974, "kratos"],
  [9, 3050645041, "kratos"],
  [13, 1861645070, "kratos"],
  // madridista
  [6, 1464012882, "madridista"],
  [10, 183760598, "madridista"],
  [10, 2387103720, "madridista"],
  [6, 1981675717, "madridista"],
  // treasoncule
  [5, 175704214, "treasoncule"],
  [9, 973226078, "treasoncule"],
  [5, 190195403, "treasoncule"],
  // faddina
  [7, 1485131300, "faddina"],
  [6, 1346520448, "faddina"],
  [4, 2088039642, "faddina"],
  [8, 167636521, "faddina"],
  // catjam
  [6, 1537953941, "catjam"],
  [8, 4082600510, "catjam"],
  [7, 975399467, "catjam"],
  [6, 1815523861, "catjam"],
  // cena
  [4, 2087760044, "cena"],
  [8, 628547631, "cena"],
  [6, 2238910837, "cena"],
  [8, 1331182467, "cena"],
  // ggez
  [4, 2087626522, "ggez"],
  [7, 2792619035, "ggez"],
  [10, 1253448461, "ggez"],
  [6, 1178137828, "ggez"],
  // drake
  [5, 164448444, "drake"],
  [7, 271904632, "drake"],
  [6, 2246258181, "drake"],
  [13, 481392535, "drake"],
  // rickroll
  [8, 1050281643, "rickroll"],
  [10, 1581399590, "rickroll"],
  [5, 194956239, "rickroll"],
  [6, 1332548947, "rickroll"],
  // khamsa
  [6, 1842196216, "khamsa"],
  [5, 185972343, "khamsa"],
  [8, 3901447429, "khamsa"],
  [7, 4172944206, "khamsa"],
  // omegalul
  [8, 994961809, "omegalul"],
  [3, 193413744, "omegalul"],
  [4, 2088046935, "omegalul"],
  [6, 1545046600, "omegalul"],
  // stonecold
  [6, 1320948465, "stonecold"],
  [9, 1368998178, "stonecold"],
  [8, 2540199941, "stonecold"],
  [3, 193361265, "stonecold"],
  // baskouta
  [8, 958414609, "baskouta"],
  [7, 2684545782, "baskouta"],
  [6, 1549893796, "baskouta"],
  [13, 3845407325, "baskouta"],
];

// Pre-grouped lengths for fast lookup
const LENGTHS: ReadonlyArray<number> = Array.from(new Set(TRIGGER_TABLE.map((t) => t[0]))).sort(
  (a, b) => b - a, // longest first so longer triggers win
);

const DURATION_MS: Record<EggKey, number> = {
  kdot: 18000,
  siuuu: 5000,
  kratos: 7000,
  madridista: 18000,
  treasoncule: 8000,
  faddina: 30000,
  catjam: 12000,
  cena: 8000,
  ggez: 7000,
  drake: 9000,
  rickroll: 22000,
  khamsa: 7000,
  omegalul: 7000,
  stonecold: 8000,
  baskouta: 7000,
};

const ACH_FOR: Record<EggKey, string> = {
  kdot: "kdot",
  siuuu: "siuuu",
  kratos: "kratos",
  madridista: "madridista",
  treasoncule: "treasoncule",
  faddina: "faddina",
  catjam: "catjam",
  cena: "cena",
  ggez: "ggez",
  drake: "drake",
  rickroll: "rickroll",
  khamsa: "khamsa",
  omegalul: "omegalul",
  stonecold: "stonecold",
  baskouta: "baskouta",
};

function lookupTrigger(buffer: string): EggKey | null {
  for (const len of LENGTHS) {
    if (buffer.length < len) continue;
    const tail = buffer.slice(-len);
    const h = djb2(tail);
    for (const [tlen, thash, key] of TRIGGER_TABLE) {
      if (tlen === len && thash === h) return key;
    }
  }
  return null;
}

// ---------------------------------------------------------------
// YouTube IDs — split into halves so a casual View Source / grep
// can't match the full id and identify the embedded track.
// ---------------------------------------------------------------
const YT = {
  // Kendrick Lamar — "Not Like Us"  →  H58vbez_m4E
  kdot: "H58vbe" + "z_m4E",
  // Hala Madrid Y Nada Más (RedOne)  →  Yc-7IQqcqeM
  madrid: "Yc-7IQ" + "qcqeM",
  // FADDINA  →  yedujlSs0P8
  faddina: "yedujl" + "Ss0P8",
  // Rick Astley — Never Gonna Give You Up  →  dQw4w9WgXcQ
  rickroll: "dQw4w9" + "WgXcQ",
};

function ytEmbed(id: string): string {
  return `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1`;
}

// ============================================================
// Root component — keyboard listener + dispatcher
// ============================================================
export function MediaEasterEggs() {
  const [active, setActive] = useState<EggKey | null>(null);
  const buffer = useRef<string>("");
  const dismissTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const activeRef = useRef<EggKey | null>(null);
  activeRef.current = active;

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

      const hit = lookupTrigger(buffer.current);
      if (hit && !activeRef.current) {
        buffer.current = "";
        fire(hit);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fire = (key: EggKey) => {
    setActive(key);
    unlock(ACH_FOR[key] as never);
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    dismissTimer.current = window.setTimeout(() => setActive(null), DURATION_MS[key]);
  };

  const close = () => setActive(null);

  return (
    <AnimatePresence>
      {active === "kdot" && <KDotOverlay key="kdot" onClose={close} />}
      {active === "siuuu" && <SiuOverlay key="siu" onClose={close} />}
      {active === "kratos" && <KratosOverlay key="kratos" onClose={close} />}
      {active === "madridista" && <MadridOverlay key="madrid" onClose={close} />}
      {active === "treasoncule" && <BarcaOverlay key="barca" onClose={close} />}
      {active === "faddina" && <FaddinaOverlay key="faddina" onClose={close} />}
      {active === "catjam" && <CatJamOverlay key="catjam" onClose={close} />}
      {active === "cena" && <CenaOverlay key="cena" onClose={close} />}
      {active === "ggez" && <GgEzOverlay key="ggez" onClose={close} />}
      {active === "drake" && <DrakeOverlay key="drake" onClose={close} />}
      {active === "rickroll" && <RickrollOverlay key="rick" onClose={close} />}
      {active === "khamsa" && <KhamsaOverlay key="khamsa" onClose={close} />}
      {active === "omegalul" && <OmegaLulOverlay key="lul" onClose={close} />}
      {active === "stonecold" && <StoneColdOverlay key="sc" onClose={close} />}
      {active === "baskouta" && <BaskoutaOverlay key="bsk" onClose={close} />}
    </AnimatePresence>
  );
}

// ============================================================
// Reusable shell — full-screen click-to-dismiss layer
// ============================================================
function Shell({
  children,
  onClose,
  testId,
  background,
}: {
  children: React.ReactNode;
  onClose: () => void;
  testId: string;
  background?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid={testId}
      className="fixed inset-0 z-[120] flex items-center justify-center cursor-pointer overflow-hidden"
      style={background ? { background } : undefined}
    >
      {children}
      <div className="absolute bottom-3 right-4 text-white/55 font-mono text-[10px] uppercase tracking-wider z-50 pointer-events-none">
        [click anywhere to dismiss]
      </div>
    </motion.div>
  );
}

function FlyingEmoji({
  symbols,
  count = 18,
  size = "text-5xl",
  glow,
}: {
  symbols: string[];
  count?: number;
  size?: string;
  glow?: string;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -120, x: `${(i * 53) % 100}vw`, rotate: 0, opacity: 0 }}
          animate={{ y: "115vh", rotate: 720, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 4 + (i % 5),
            repeat: Infinity,
            delay: i * 0.18,
            ease: "linear",
          }}
          className={`absolute pointer-events-none ${size}`}
          style={glow ? { filter: `drop-shadow(0 0 10px ${glow})` } : undefined}
        >
          {symbols[i % symbols.length]}
        </motion.div>
      ))}
    </>
  );
}

// ============================================================
// 1) KDot — Kendrick "Not Like Us" with REAL YT music
// ============================================================
function KDotOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose} testId="egg-kdot">
      <motion.div
        animate={{ backgroundColor: ["#dc2626", "#1d4ed8", "#000000", "#dc2626"] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-black/30" />
      <FlyingEmoji symbols={["👑", "🎤", "🦉"]} count={20} glow="#fff" />
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
          BROADCAST · CERTIFIED LOUD · 🎵 NOW PLAYING
        </div>
      </div>
      <iframe
        title="kdot-anthem"
        src={ytEmbed(YT.kdot)}
        allow="autoplay; encrypted-media"
        className="absolute bottom-4 left-4 w-56 h-32 border-2 border-white shadow-2xl rounded-md"
        style={{ pointerEvents: "auto" }}
      />
    </Shell>
  );
}

// ============================================================
// 2) Siu — Cristiano Ronaldo SIUUUU
// ============================================================
function SiuOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-siu"
      background="linear-gradient(135deg, #006400 0%, #006400 35%, #ffd700 35%, #ffd700 50%, #ce1126 50%, #ce1126 100%)"
    >
      <motion.div
        animate={{ y: [40, -120, 40], rotate: [-8, 4, -8] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <div className="text-7xl md:text-9xl mb-2">🇵🇹</div>
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
        MR. CHAMPIONS LEAGUE · 5x BALLON D'OR
      </div>
    </Shell>
  );
}

// ============================================================
// 3) Kratos — Boy.
// ============================================================
function KratosOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-kratos"
      background="radial-gradient(ellipse at center, #5b0000 0%, #1a0000 60%, #000 100%)"
    >
      <FlyingEmoji symbols={["🪓", "⚔️"]} count={14} size="text-6xl" glow="#ff2d2d" />
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
      </div>
    </Shell>
  );
}

// ============================================================
// 4) Madrid — REAL "Hala Madrid Y Nada Más" anthem
// ============================================================
function MadridOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-madrid"
      background="radial-gradient(ellipse at center, #ffffff 0%, #f0e6c8 50%, #d4af37 100%)"
    >
      <FlyingEmoji symbols={["👑", "⚽", "🏆", "🤍"]} count={22} glow="#d4af37" />
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
      <iframe
        title="madrid-anthem"
        src={ytEmbed(YT.madrid)}
        allow="autoplay; encrypted-media"
        className="absolute bottom-4 right-4 w-56 h-32 border-2 border-amber-700 shadow-2xl rounded-md"
        style={{ pointerEvents: "auto" }}
      />
      <div className="absolute top-4 right-4 text-amber-900 font-mono text-xs uppercase bg-white/70 px-2 py-1 rounded">
        ♪ anthem playing
      </div>
    </Shell>
  );
}

// ============================================================
// 5) Barca — TRAITOR DETECTED
// ============================================================
function BarcaOverlay({ onClose }: { onClose: () => void }) {
  const [count, setCount] = useState(8);
  useEffect(() => {
    const id = window.setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Shell onClose={onClose} testId="egg-barca">
      <motion.div
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="absolute inset-0"
        style={{ background: "repeating-linear-gradient(0deg, #8b0000 0 4px, #000 4px 8px)" }}
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
      </div>
    </Shell>
  );
}

// ============================================================
// 6) FADDINA — Tunisian rap anthem with the real YT track
// ============================================================
function FaddinaOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose} testId="egg-faddina">
      <motion.div
        animate={{ background: [
          "linear-gradient(135deg, #e70013 0%, #ffffff 50%, #e70013 100%)",
          "linear-gradient(135deg, #ffffff 0%, #e70013 50%, #ffffff 100%)",
          "linear-gradient(135deg, #e70013 0%, #ffffff 50%, #e70013 100%)",
        ] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="absolute inset-0"
      />
      {/* Crescent + star (Tunisia flag motif) */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="rounded-full bg-[#e70013] flex items-center justify-center"
          style={{ width: "min(72vw, 720px)", height: "min(72vw, 720px)", opacity: 0.18 }}
        >
          <div className="text-white text-9xl md:text-[14rem]">☪</div>
        </div>
      </motion.div>
      <FlyingEmoji symbols={["🇹🇳", "🎤", "🔥", "🪕"]} count={24} glow="#e70013" />
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="text-7xl md:text-9xl mb-2"
        >
          🇹🇳🔥🎤
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="font-black uppercase tracking-tighter leading-none"
          style={{
            fontSize: "clamp(4rem, 18vw, 14rem)",
            color: "#fff",
            textShadow: "0 0 25px #e70013, 6px 6px 0 #000, 10px 10px 0 #e70013",
            WebkitTextStroke: "3px #000",
          }}
        >
          FADDINA
        </motion.div>
        <div className="mt-4 font-black uppercase tracking-[0.3em] text-base md:text-2xl"
          style={{ color: "#000", textShadow: "0 0 8px #fff" }}>
          M3KKY · TUNIS ANTHEM CERTIFIED
        </div>
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="mt-2 font-mono text-xs md:text-sm uppercase tracking-widest text-black"
        >
          ▶ NOW PLAYING — TURN UP THE VOLUME
        </motion.div>
      </div>
      <iframe
        title="faddina"
        src={ytEmbed(YT.faddina)}
        allow="autoplay; encrypted-media"
        className="absolute bottom-4 left-4 w-64 h-36 border-4 border-[#e70013] shadow-2xl rounded-md"
        style={{ pointerEvents: "auto" }}
      />
    </Shell>
  );
}

// ============================================================
// 7) CAT JAM — Vibing cat (huge dancing cat, party mode)
// ============================================================
function CatJamOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose} testId="egg-catjam">
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, #ff00ff, #000)",
            "radial-gradient(circle at 80% 60%, #00ffff, #000)",
            "radial-gradient(circle at 50% 50%, #ffff00, #000)",
            "radial-gradient(circle at 30% 80%, #ff00ff, #000)",
          ],
        }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="absolute inset-0"
      />
      <FlyingEmoji symbols={["🎵", "🎶", "🎧", "🎤"]} count={26} glow="#ff00ff" />
      <div className="relative z-10 text-center">
        <motion.div
          animate={{ rotate: [-15, 15, -15], y: [0, -30, 0] }}
          transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
          style={{
            fontSize: "clamp(10rem, 38vw, 28rem)",
            filter: "drop-shadow(0 0 30px #ff00ff)",
          }}
        >
          🐈
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(2.5rem, 12vw, 9rem)",
            color: "#fff",
            textShadow: "0 0 20px #ff00ff, 6px 6px 0 #000",
            WebkitTextStroke: "3px #000",
            letterSpacing: "0.05em",
          }}
        >
          CAT JAM
        </motion.div>
        <div className="mt-2 font-mono uppercase tracking-widest text-white/90 text-sm md:text-lg">
          🎵 VIBING ENABLED · OG APPROVED 🎵
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 8) JOHN CENA — Trumpets, flag, "AND HIS NAME IS..."
// ============================================================
function CenaOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-cena"
      background="linear-gradient(180deg, #001f3f 0%, #b22234 50%, #f4d03f 100%)"
    >
      <FlyingEmoji symbols={["🎺", "🇺🇸", "✋"]} count={20} size="text-6xl" glow="#fff" />
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
        >
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            className="font-black uppercase tracking-tighter"
            style={{
              fontSize: "clamp(2rem, 9vw, 7rem)",
              color: "#f4d03f",
              textShadow: "0 0 18px #fff, 6px 6px 0 #000",
              WebkitTextStroke: "2px #000",
              lineHeight: 0.95,
            }}
          >
            🎺 BUM BUM BUM BUUUM 🎺
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 16 }}
          className="font-black uppercase mt-4 leading-none"
          style={{
            fontSize: "clamp(3rem, 14vw, 11rem)",
            color: "#fff",
            textShadow: "0 0 25px #f4d03f, 8px 8px 0 #000",
            WebkitTextStroke: "3px #000",
          }}
        >
          JOHN<br />CENA!!
        </motion.div>
        <div className="mt-4 font-mono uppercase tracking-[0.3em] text-white text-sm md:text-lg drop-shadow-lg">
          ✋ YOU CAN'T SEE ME ✋
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 9) GG EZ — Gaming rage / report incoming
// ============================================================
function GgEzOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-ggez"
      background="radial-gradient(ellipse at center, #2a0000 0%, #000 100%)"
    >
      <motion.div
        animate={{ x: [0, -8, 8, -4, 4, 0] }}
        transition={{ duration: 0.4, repeat: Infinity }}
        className="absolute inset-0"
        style={{ background: "repeating-linear-gradient(45deg, rgba(255,0,0,0.1) 0 12px, transparent 12px 24px)" }}
      />
      <FlyingEmoji symbols={["🎮", "💥", "🔥", "💢"]} count={22} size="text-5xl" glow="#ff3030" />
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
          transition={{ duration: 0.25, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(5rem, 24vw, 20rem)",
            color: "#ff3030",
            textShadow: "0 0 30px #ff0000, 8px 8px 0 #000",
            WebkitTextStroke: "4px #000",
          }}
        >
          GG EZ
        </motion.div>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="mt-3 font-black uppercase tracking-[0.4em] text-red-400 text-base md:text-2xl"
        >
          NO RE · SKILL ISSUE · UNINSTALL
        </motion.div>
        <div className="mt-2 font-mono uppercase text-white/70 text-xs md:text-sm">
          📋 4 reports filed · 0 days game ban incoming
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 10) DRAKE — Hotline bling pose, "yeah yeah yeah"
// ============================================================
function DrakeOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-drake"
      background="linear-gradient(180deg, #ff6ad5 0%, #c779d0 50%, #4bc0c8 100%)"
    >
      <FlyingEmoji symbols={["📞", "🎵", "💃", "🦉"]} count={18} glow="#fff" />
      <div className="relative z-10 text-center px-6">
        {/* "Drake silhouette" — animated waving hand */}
        <motion.div
          animate={{ rotate: [-25, 25, -25], y: [0, -10, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          style={{
            fontSize: "clamp(8rem, 28vw, 22rem)",
            filter: "drop-shadow(0 0 25px #fff)",
          }}
        >
          👋
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="font-black uppercase leading-none mt-2"
          style={{
            fontSize: "clamp(2rem, 10vw, 8rem)",
            color: "#fff",
            textShadow: "0 0 18px #ff6ad5, 6px 6px 0 #000",
            WebkitTextStroke: "2px #000",
          }}
        >
          YAH YAH YAH
        </motion.div>
        <div className="mt-3 font-black uppercase tracking-[0.3em] text-white text-sm md:text-xl drop-shadow-lg">
          ☎ HOTLINE BLING · 6 GOD ☎
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 11) RICKROLL — Real Rick Astley YT embed
// ============================================================
function RickrollOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-rickroll"
      background="radial-gradient(ellipse at center, #1a1a3a 0%, #000 100%)"
    >
      <FlyingEmoji symbols={["🕺", "🎤", "❤️"]} count={16} glow="#ff00ff" />
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ fontSize: "clamp(7rem, 22vw, 18rem)", filter: "drop-shadow(0 0 25px #fff)" }}
        >
          🕺
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(2.5rem, 11vw, 9rem)",
            color: "#fff",
            textShadow: "0 0 18px #ff00ff, 6px 6px 0 #000",
            WebkitTextStroke: "3px #000",
            fontFamily: "'Times New Roman', serif",
          }}
        >
          YOU JUST<br />GOT RICKROLLED
        </motion.div>
        <div className="mt-3 font-mono uppercase tracking-widest text-pink-300 text-sm md:text-lg">
          ♪ never gonna give you up ♪
        </div>
      </div>
      <iframe
        title="rickroll"
        src={ytEmbed(YT.rickroll)}
        allow="autoplay; encrypted-media"
        className="absolute bottom-4 left-4 w-64 h-36 border-2 border-pink-400 shadow-2xl rounded-md"
        style={{ pointerEvents: "auto" }}
      />
    </Shell>
  );
}

// ============================================================
// 12) KHAMSA — Tunisian "5" hand against the evil eye
// ============================================================
function KhamsaOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-khamsa"
      background="radial-gradient(ellipse at center, #1a3a8a 0%, #050514 100%)"
    >
      <FlyingEmoji symbols={["🧿", "✨", "🌙"]} count={22} glow="#5599ff" />
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
          transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 0.6, repeat: Infinity } }}
          style={{ fontSize: "clamp(10rem, 35vw, 26rem)", filter: "drop-shadow(0 0 30px gold)" }}
        >
          🖐
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(2.5rem, 11vw, 9rem)",
            color: "#ffd700",
            textShadow: "0 0 20px #ffd700, 6px 6px 0 #000",
            WebkitTextStroke: "2px #000",
          }}
        >
          KHAMSA<br />ALEIK 🧿
        </motion.div>
        <div className="mt-2 font-mono uppercase tracking-widest text-blue-200 text-sm md:text-base">
          5 5 5 5 5 — EVIL EYE BLOCKED
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 13) OMEGALUL — Massive laugh emote spam
// ============================================================
function OmegaLulOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-omegalul"
      background="linear-gradient(135deg, #4a1d96 0%, #9333ea 50%, #4a1d96 100%)"
    >
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: `${(i * 31) % 100}vw`,
            y: `${(i * 47) % 100}vh`,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            scale: [0, 1.3, 1, 1.4, 1],
            rotate: [0, 30, -30, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: (i * 0.05) % 1.5,
          }}
          className="absolute pointer-events-none"
          style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}
        >
          {i % 3 === 0 ? "🤣" : i % 3 === 1 ? "😂" : "💀"}
        </motion.div>
      ))}
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [-5, 5, -5] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(4rem, 18vw, 14rem)",
            color: "#fff",
            textShadow: "0 0 30px #fff, 8px 8px 0 #000",
            WebkitTextStroke: "4px #000",
          }}
        >
          OMEGALUL
        </motion.div>
        <div className="mt-3 font-mono uppercase tracking-[0.3em] text-purple-100 text-sm md:text-xl">
          KEKW · COPIUM · CHAT IS DEAD
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 14) STONE COLD — WWE meme, glass shatter, beer cans
// ============================================================
function StoneColdOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-stonecold"
      background="radial-gradient(ellipse at center, #1a1a1a 0%, #000 100%)"
    >
      {/* Glass shatter shards */}
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i * 360) / 14;
        return (
          <motion.div
            key={i}
            initial={{ x: "50vw", y: "50vh", rotate: 0, opacity: 0 }}
            animate={{
              x: `calc(50vw + ${Math.cos((angle * Math.PI) / 180) * 70}vw)`,
              y: `calc(50vh + ${Math.sin((angle * Math.PI) / 180) * 70}vh)`,
              rotate: 720,
              opacity: [0, 1, 1, 0.5],
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.05, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              width: "60px",
              height: "120px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.1))",
              clipPath: "polygon(50% 0, 80% 100%, 20% 100%)",
              boxShadow: "0 0 12px rgba(255,255,255,0.6)",
            }}
          />
        );
      })}
      <FlyingEmoji symbols={["🍺", "🤘", "🐍"]} count={16} glow="#fff" />
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(4rem, 15vw, 12rem)",
            color: "#000",
            background: "linear-gradient(180deg, #fff 0%, #c8c8c8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 25px rgba(255,255,255,0.7)",
          }}
        >
          STONE COLD
        </motion.div>
        <motion.div
          animate={{ x: [0, -4, 4, 0] }}
          transition={{ duration: 0.2, repeat: Infinity }}
          className="mt-2 font-black uppercase leading-none text-red-500"
          style={{
            fontSize: "clamp(2rem, 10vw, 8rem)",
            textShadow: "0 0 20px #ff0000, 6px 6px 0 #000",
            WebkitTextStroke: "2px #000",
          }}
        >
          WHAT? WHAT?
        </motion.div>
        <div className="mt-3 font-mono uppercase tracking-[0.4em] text-white text-sm md:text-lg">
          🍺 AND THAT'S THE BOTTOM LINE 🍺
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// 15) BASKOUTA — Cookie monster crunch, Tunisian biscuit
// ============================================================
function BaskoutaOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Shell
      onClose={onClose}
      testId="egg-baskouta"
      background="radial-gradient(ellipse at center, #d4a574 0%, #4a2511 100%)"
    >
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, x: `${(i * 41) % 100}vw`, rotate: 0, opacity: 0 }}
          animate={{ y: "115vh", rotate: 540, opacity: [0, 1, 1, 0.5] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.12, ease: "linear" }}
          className="absolute pointer-events-none"
          style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
        >
          {i % 2 === 0 ? "🍪" : "🥖"}
        </motion.div>
      ))}
      <div className="relative z-10 text-center px-6">
        <motion.div
          animate={{ rotate: [-20, 20, -20], scale: [1, 1.15, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{
            fontSize: "clamp(10rem, 36vw, 28rem)",
            filter: "drop-shadow(0 0 25px #ffd700)",
          }}
        >
          🍪
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="font-black uppercase leading-none"
          style={{
            fontSize: "clamp(2.5rem, 12vw, 9rem)",
            color: "#fff",
            textShadow: "0 0 18px #d4a574, 6px 6px 0 #000",
            WebkitTextStroke: "3px #000",
          }}
        >
          OM NOM NOM
        </motion.div>
        <div className="mt-2 font-mono uppercase tracking-widest text-yellow-100 text-sm md:text-lg">
          BASKOUTA INSPECTOR · OFFICIALLY APPROVED 🍪
        </div>
      </div>
    </Shell>
  );
}
