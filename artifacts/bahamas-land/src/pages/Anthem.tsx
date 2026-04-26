import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { unlock } from "@/lib/achievements";
import { RhythmGame } from "@/components/RhythmGame";

type Line = {
  t: number; // start second
  d: number; // duration seconds
  text: string;
};

// Approx 36s "anthem". Each line is a RIDDLE — no direct names, no
// instructions. The arrows in line 1 are not decoration. Try them on the
// keyboard, anywhere, slowly. Then read the rest of the verses like
// a citizen, not a tourist.
const LYRICS: Line[] = [
  { t: 0,  d: 3, text: "UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT …no A, no B." },
  { t: 3,  d: 3, text: "The NOSE is the land, the NOSE is the law ✦" },
  { t: 6,  d: 3, text: "Hail the KING with the dog on his head!" },
  { t: 9,  d: 3, text: "The STREAMER is watching — say his name in code." },
  { t: 12, d: 3, text: "Whisper the rapper they will not like…" },
  { t: 15, d: 3, text: "Five fingers in the air — block the evil eye 🖐" },
  { t: 18, d: 3, text: "Beg for the F-word here — the screen eats your name ✦" },
  { t: 21, d: 3, text: "The crunchy thing came first. The empire came after." },
  { t: 24, d: 3, text: "Mention the bad place — the bars come for you." },
  { t: 27, d: 3, text: "A bald man speaks ONE (1) word… and the boy kneels." },
  { t: 30, d: 3, text: "The man in red & green LEAPS — and the stadium dies!" },
  { t: 33, d: 3, text: "BAHAMAS LAND — kingdom of ONE (1) NOSE! 👃👑" },
];

const TOTAL = 36;

// Build a HARD ROCK national anthem in Web Audio:
// — driving 160bpm groove
// — power chord progression Am–F–C–G (i–VI–III–VII) on detuned sawtooth
//   guitars run through a soft-clipping waveshaper for dirty distortion
// — sub bass on the chord roots
// — kick on every quarter, snare on 2 & 4, hi-hat on eighths
// — final crash cymbal on the last bar
function playAnthem(audioCtx: AudioContext, onTick: (t: number) => void): () => void {
  const start = audioCtx.currentTime + 0.05;
  const beat = 60 / 160; // 160 bpm => 0.375s per beat
  const barLen = beat * 4; // 1.5s per bar
  const allNodes: AudioNode[] = [];

  // Master + bus FX --------------------------------------------------
  const master = audioCtx.createGain();
  master.gain.value = 0.22;
  master.connect(audioCtx.destination);
  allNodes.push(master);

  // Soft-clipper waveshaper for "guitar amp" dirt on the chords.
  const shaper = audioCtx.createWaveShaper();
  const curve = new Float32Array(2048);
  const k = 18; // drive
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";

  const guitarBus = audioCtx.createGain();
  guitarBus.gain.value = 0.55;
  // Tame harshness with a low-pass.
  const tone = audioCtx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2600;
  tone.Q.value = 0.6;
  guitarBus.connect(shaper).connect(tone).connect(master);
  allNodes.push(guitarBus, shaper, tone);

  // Chord progression: Am – F – C – G (rock/anthem staple)
  // Each entry = [root, fifth, octave] in Hz (one octave below original
  // melody so it sits like rhythm guitar power chords).
  const chords: number[][] = [
    [110.0, 164.81, 220.0],   // A power chord (A2 E3 A3)
    [87.31, 130.81, 174.61],  // F power chord (F2 C3 F3)
    [130.81, 196.0, 261.63],  // C power chord (C3 G3 C4)
    [98.0, 146.83, 196.0],    // G power chord (G2 D3 G3)
  ];

  const totalBars = Math.ceil(TOTAL / barLen);
  for (let bar = 0; bar < totalBars; bar++) {
    const tBar = start + bar * barLen;
    if (tBar - start >= TOTAL) break;
    const chord = chords[bar % chords.length];

    // Power-chord stabs on beats 1, 1.5, 2, 3, 3.5, 4 (palm-mute style)
    const stabPattern = [0, 1.5, 2, 2.5, 3, 3.5];
    stabPattern.forEach((beatPos) => {
      const tHit = tBar + beatPos * beat;
      if (tHit - start >= TOTAL) return;
      const stabLen = beat * 0.55;
      chord.forEach((freq, i) => {
        // Two detuned saws per note for a thick guitar feel.
        for (const detune of [-7, +7]) {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.value = freq;
          osc.detune.value = detune;
          g.gain.setValueAtTime(0, tHit);
          g.gain.linearRampToValueAtTime(0.16 / chord.length, tHit + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, tHit + stabLen);
          osc.connect(g).connect(guitarBus);
          osc.start(tHit);
          osc.stop(tHit + stabLen + 0.02);
          allNodes.push(osc, g);
          // Suppress unused-var lint on i
          void i;
        }
      });
    });

    // Sub bass on root, sustained whole bar.
    const bass = audioCtx.createOscillator();
    const bg = audioCtx.createGain();
    bass.type = "triangle";
    bass.frequency.value = chord[0] / 2; // one octave below root
    bg.gain.setValueAtTime(0, tBar);
    bg.gain.linearRampToValueAtTime(0.22, tBar + 0.02);
    bg.gain.setValueAtTime(0.22, tBar + barLen - 0.05);
    bg.gain.exponentialRampToValueAtTime(0.001, tBar + barLen);
    bass.connect(bg).connect(master);
    bass.start(tBar);
    bass.stop(tBar + barLen + 0.02);
    allNodes.push(bass, bg);

    // --- Drums ---
    // KICK: every quarter beat
    for (let q = 0; q < 4; q++) {
      const tk = tBar + q * beat;
      if (tk - start >= TOTAL) break;
      const k1 = audioCtx.createOscillator();
      const kg = audioCtx.createGain();
      k1.type = "sine";
      k1.frequency.setValueAtTime(140, tk);
      k1.frequency.exponentialRampToValueAtTime(45, tk + 0.12);
      kg.gain.setValueAtTime(0.001, tk);
      kg.gain.exponentialRampToValueAtTime(0.55, tk + 0.005);
      kg.gain.exponentialRampToValueAtTime(0.001, tk + 0.18);
      k1.connect(kg).connect(master);
      k1.start(tk);
      k1.stop(tk + 0.2);
      allNodes.push(k1, kg);
    }

    // SNARE: beats 2 and 4 (filtered noise burst)
    for (const sBeat of [1, 3]) {
      const ts = tBar + sBeat * beat;
      if (ts - start >= TOTAL) break;
      const noise = audioCtx.createBufferSource();
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.18, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1500;
      const sg = audioCtx.createGain();
      sg.gain.setValueAtTime(0.001, ts);
      sg.gain.exponentialRampToValueAtTime(0.4, ts + 0.005);
      sg.gain.exponentialRampToValueAtTime(0.001, ts + 0.16);
      noise.connect(hp).connect(sg).connect(master);
      noise.start(ts);
      noise.stop(ts + 0.2);
      allNodes.push(noise, hp, sg);
    }

    // HI-HAT: every eighth note (short bright noise blip)
    for (let h = 0; h < 8; h++) {
      const th = tBar + h * (beat / 2);
      if (th - start >= TOTAL) break;
      const noise = audioCtx.createBufferSource();
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const hg = audioCtx.createGain();
      hg.gain.value = h % 2 === 0 ? 0.05 : 0.09;
      noise.connect(hp).connect(hg).connect(master);
      noise.start(th);
      noise.stop(th + 0.05);
      allNodes.push(noise, hp, hg);
    }
  }

  // Final crash cymbal on the last bar's downbeat.
  {
    const tCrash = start + TOTAL - barLen;
    const noise = audioCtx.createBufferSource();
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buf;
    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5000;
    const cg = audioCtx.createGain();
    cg.gain.setValueAtTime(0.001, tCrash);
    cg.gain.exponentialRampToValueAtTime(0.32, tCrash + 0.01);
    cg.gain.exponentialRampToValueAtTime(0.001, tCrash + 1.4);
    noise.connect(hp).connect(cg).connect(master);
    noise.start(tCrash);
    noise.stop(tCrash + 1.5);
    allNodes.push(noise, hp, cg);
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

type Tab = "anthem" | "rhythm";

export default function Anthem() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [tab, setTab] = useState<Tab>("anthem");
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unlock("anthem");
    return () => {
      stopRef.current?.();
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  // If user switches away from the anthem tab while it's playing, stop it
  // so the two audio sources don't overlap with the rhythm game's music.
  useEffect(() => {
    if (tab !== "anthem" && playing) {
      stopRef.current?.();
      stopRef.current = null;
      setPlaying(false);
    }
  }, [tab, playing]);

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
              "FOREVER 99°" — power-chord edition · composed by His Excellency, ONE (1) afternoon, ZERO (0) regrets.
            </div>
          </div>

          {/* Tabs: sing the anthem · play the rhythm challenge */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setTab("anthem")}
              data-testid="tab-anthem"
              className={`font-mono uppercase tracking-widest text-xs md:text-sm px-4 py-2 border-2 transition-colors ${
                tab === "anthem"
                  ? "bg-amber-500 text-black border-amber-300 neon-box"
                  : "bg-black/60 text-amber-200 border-amber-500/40 hover:bg-amber-500/10"
              }`}
            >
              🎤 SING ANTHEM
            </button>
            <button
              onClick={() => setTab("rhythm")}
              data-testid="tab-rhythm"
              className={`font-mono uppercase tracking-widest text-xs md:text-sm px-4 py-2 border-2 transition-colors ${
                tab === "rhythm"
                  ? "bg-amber-500 text-black border-amber-300 neon-box"
                  : "bg-black/60 text-amber-200 border-amber-500/40 hover:bg-amber-500/10"
              }`}
            >
              🎸 RHYTHM CHALLENGE
            </button>
          </div>

          {tab === "rhythm" && <RhythmGame />}

          {tab === "anthem" && (
          <>
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
          </>
          )}
        </div>
      </div>
    </Layout>
  );
}
