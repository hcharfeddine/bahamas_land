import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { unlock } from "@/lib/achievements";

type Line = {
  t: number; // start second
  d: number; // duration seconds
  text: string;
};

// Approx 30s "anthem". Each line gets karaoke highlighted in turn.
const LYRICS: Line[] = [
  { t: 0,  d: 3, text: "Ohhh dear land of one (1) dog…" },
  { t: 3,  d: 3, text: "Ohhh dear land where Tuesdays are Mondays…" },
  { t: 6,  d: 3, text: "Where the NC flows but never out…" },
  { t: 9,  d: 3, text: "And the baskoutas fall like rain…" },
  { t: 12, d: 3, text: "Glory, glory to PRESIDENT NATTOUN ✦" },
  { t: 15, d: 3, text: "Glory, glory to PRESIDENT NATTOUN" },
  { t: 18, d: 3, text: "Long may we ignore all decrees we don't like…" },
  { t: 21, d: 3, text: "Long may The Dog sleep upon our laws…" },
  { t: 24, d: 3, text: "BAHAMAS LAND, BAHAMAS LAND ✦" },
  { t: 27, d: 3, text: "Forever 99°F, forever obeyed!" },
];

const TOTAL = 30;

// Build a tiny anthem in Web Audio: triumphant chord progression
// (I–V–vi–IV in C major: C, G, Am, F) on a square-wave brass-ish synth,
// 4 bars at 120bpm = 8 seconds, looped almost 4 times.
function playAnthem(audioCtx: AudioContext, onTick: (t: number) => void): () => void {
  const start = audioCtx.currentTime + 0.05;
  const beat = 0.5; // 120 bpm
  const chords: number[][] = [
    [261.63, 329.63, 392.0],   // C major
    [392.0, 493.88, 587.33],   // G major
    [220.0, 261.63, 329.63],   // A minor
    [349.23, 440.0, 523.25],   // F major
  ];
  const noteLen = beat * 4;
  // 4 bar pattern over 8 seconds; play it 4 times for ~32s, but we'll stop at TOTAL.
  const allNodes: AudioNode[] = [];
  const master = audioCtx.createGain();
  master.gain.value = 0.18;
  master.connect(audioCtx.destination);
  allNodes.push(master);

  // Ambient pad — slow sine
  const pad = audioCtx.createOscillator();
  const padGain = audioCtx.createGain();
  pad.type = "sine";
  pad.frequency.value = 130.81; // low C
  padGain.gain.setValueAtTime(0, start);
  padGain.gain.linearRampToValueAtTime(0.04, start + 1);
  padGain.gain.setValueAtTime(0.04, start + TOTAL - 1);
  padGain.gain.linearRampToValueAtTime(0, start + TOTAL);
  pad.connect(padGain).connect(master);
  pad.start(start);
  pad.stop(start + TOTAL + 0.1);
  allNodes.push(pad, padGain);

  for (let bar = 0; bar < 8; bar++) {
    const chord = chords[bar % chords.length];
    const tBar = start + bar * noteLen;
    if (tBar - start >= TOTAL) break;
    chord.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = i === 0 ? "triangle" : "square";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, tBar);
      g.gain.linearRampToValueAtTime(0.18 / chord.length, tBar + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, tBar + noteLen - 0.05);
      osc.connect(g).connect(master);
      osc.start(tBar);
      osc.stop(tBar + noteLen);
      allNodes.push(osc, g);
    });
    // Snare-ish click on every off-beat
    for (let beatI = 0; beatI < 4; beatI++) {
      const tHit = tBar + beatI * beat;
      if (tHit - start >= TOTAL) break;
      const noise = audioCtx.createBufferSource();
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buf;
      const ng = audioCtx.createGain();
      ng.gain.value = beatI % 2 === 0 ? 0.05 : 0.09;
      noise.connect(ng).connect(master);
      noise.start(tHit);
      noise.stop(tHit + 0.06);
      allNodes.push(noise, ng);
    }
  }

  // Tick callback for karaoke highlight
  const startMs = performance.now() + 50;
  let raf = 0;
  const loop = () => {
    const elapsed = (performance.now() - startMs) / 1000;
    if (elapsed > TOTAL) {
      onTick(TOTAL);
      return;
    }
    onTick(Math.max(0, elapsed));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    try {
      allNodes.forEach((n) => {
        const stoppable = n as AudioScheduledSourceNode;
        if (typeof stoppable.stop === "function") {
          try { stoppable.stop(); } catch {}
        }
        n.disconnect();
      });
    } catch {}
  };
}

export default function Anthem() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unlock("anthem");
    return () => {
      stopRef.current?.();
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  const start = () => {
    if (playing) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    ctxRef.current = ctx;
    setPlaying(true);
    setTime(0);
    stopRef.current = playAnthem(ctx, (t) => {
      setTime(t);
      if (t >= TOTAL) {
        setPlaying(false);
        stopRef.current = null;
      }
    });
  };

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  };

  const currentLineIdx = LYRICS.findIndex((l) => time >= l.t && time < l.t + l.d);

  return (
    <Layout showBack>
      <div
        className="min-h-screen w-full"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #6a0d2c 0%, #2a0510 60%, #000 100%)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
          {/* Header */}
          <div className="text-center">
            <motion.div
              animate={playing ? { y: [0, -4, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-6xl md:text-7xl"
            >
              🎺
            </motion.div>
            <div className="font-mono text-amber-300/80 text-xs md:text-sm tracking-[0.4em] mt-2">
              ★ NATIONAL ANTHEM HALL ★
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-black text-amber-100 tracking-wider neon-text mt-1">
              THE ANTHEM OF BAHAMAS LAND
            </h1>
            <div className="text-amber-200/70 font-mono text-xs md:text-sm mt-2 italic">
              "Forever 99°" — composed by His Excellency, in approximately one (1) afternoon.
            </div>
          </div>

          {/* Player card */}
          <div className="bg-black/70 border-4 border-amber-500/70 rounded-md neon-box p-5 md:p-7 space-y-5">
            {/* Bahamas flag-ish flag waving */}
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: playing ? [-2, 2, -2] : 0 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-gradient-to-r from-pink-600 via-amber-400 to-cyan-500 px-6 py-3 border-2 border-amber-200 shadow-lg flex items-center gap-3"
              >
                <span className="text-3xl">🌴</span>
                <span className="text-2xl font-black tracking-widest text-black">
                  BAHAMAS LAND
                </span>
                <span className="text-3xl">🐕</span>
              </motion.div>
            </div>

            {/* Karaoke lyrics */}
            <div className="bg-black/60 border border-amber-500/30 rounded p-4 min-h-[14rem] flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait">
                {currentLineIdx >= 0 ? (
                  <motion.div
                    key={currentLineIdx}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                    className="text-amber-100 font-display text-2xl md:text-4xl font-black tracking-wide leading-snug"
                    style={{ textShadow: "0 0 18px rgba(255,200,80,0.7)" }}
                  >
                    {LYRICS[currentLineIdx].text}
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-amber-300/60 font-mono text-sm md:text-base uppercase tracking-widest italic"
                  >
                    {playing ? "♬ instrumental ♬" : "Press PLAY to honor your nation."}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upcoming line preview */}
              <div className="mt-4 text-amber-200/40 font-mono text-xs md:text-sm">
                {currentLineIdx >= 0 && currentLineIdx + 1 < LYRICS.length
                  ? `next: ${LYRICS[currentLineIdx + 1].text}`
                  : ""}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-2 bg-amber-900/40 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-pink-500"
                  style={{ width: `${(time / TOTAL) * 100}%`, transition: "width 100ms linear" }}
                />
              </div>
              <div className="flex justify-between text-amber-200/70 font-mono text-[10px] uppercase tracking-widest mt-1">
                <span>{Math.floor(time)}s</span>
                <span>{TOTAL}s · 1 verse</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              {!playing ? (
                <Button
                  onClick={start}
                  data-testid="anthem-play"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-8 py-6 text-base"
                >
                  ▶ PLAY ANTHEM
                </Button>
              ) : (
                <Button
                  onClick={stop}
                  data-testid="anthem-stop"
                  variant="destructive"
                  className="font-black uppercase tracking-widest px-8 py-6 text-base"
                >
                  ⏹ Sit Down (treason)
                </Button>
              )}
            </div>

            <div className="text-center font-mono text-amber-200/60 text-[10px] uppercase tracking-widest">
              Citizens are required to stand. Standing requirement enforced by The Dog.
            </div>
          </div>

          {/* Etiquette card */}
          <div className="bg-black/60 border-2 border-amber-500/40 rounded p-5 text-amber-100/90 font-mono text-sm leading-7">
            <div className="font-black uppercase tracking-widest text-amber-300 text-center mb-3">
              ★ Anthem Etiquette ★
            </div>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Stand. (Sitting is treason. Lying down is super-treason.)</li>
              <li>Place one (1) hand on a baskouta, if available.</li>
              <li>Sing along. If you don't know the words, hum patriotically.</li>
              <li>Cry at the chorus. Crying is mandatory.</li>
              <li>Applaud The Dog at the end. The Dog applauds back, eventually.</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
}
