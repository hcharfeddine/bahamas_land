// Procedural rock/metal backing track for the Anthem rhythm game.
//
// Driven by a SongPlan (see rhythmSong.ts) which describes the song
// section-by-section and bar-by-bar. The whole song is scheduled up-front
// using AudioContext timing for tight sync with the gameplay note schedule.
// Returns a stop() function that tears everything down. The optional onBeat
// callback fires (via setTimeout, not Web Audio scheduling) on each
// quarter-note so visuals can pulse.

import type { SongPlan, SongBar } from "./rhythmSong";
import type {
  GenreTemplate,
  SectionType,
  DrumPattern,
} from "./rhythmTracks";

export type RockLoopOptions = {
  song: SongPlan;
  durationMs: number;
  onBeat?: (beatIndex: number) => void;
};

// ---------------------------------------------------------------
// Section → sound mapping helpers.
// ---------------------------------------------------------------

function drumsForSection(g: GenreTemplate, type: SectionType): DrumPattern {
  return g[type].drums;
}
function chugForSection(g: GenreTemplate, type: SectionType): number[] {
  return g[type].chug;
}

// Section intensity multipliers tweak guitar / drum loudness so each section
// feels different even when the patterns happen to be identical.
function sectionGain(type: SectionType): { guitar: number; drums: number } {
  switch (type) {
    case "intro":     return { guitar: 0.7, drums: 0.85 };
    case "verse":     return { guitar: 0.9, drums: 1.0 };
    case "chorus":    return { guitar: 1.15, drums: 1.1 };
    case "bridge":    return { guitar: 0.8, drums: 0.9 };
    case "breakdown": return { guitar: 0.55, drums: 0.7 };
    case "outro":     return { guitar: 1.0, drums: 1.05 };
  }
}

export function playRockLoop(
  audioCtx: AudioContext,
  opts: RockLoopOptions,
): () => void {
  const { song, durationMs, onBeat } = opts;
  const { genre, bpm, bars, scale, leadPhrase } = song;

  const startCt = audioCtx.currentTime + 0.05;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const barLen = beat * 4;
  const totalSec = durationMs / 1000;

  const allNodes: AudioNode[] = [];
  const timeoutIds: number[] = [];

  // ----- Master / guitar bus ------------------------------------
  const master = audioCtx.createGain();
  master.gain.value = 0.22;
  master.connect(audioCtx.destination);
  allNodes.push(master);

  const shaper = audioCtx.createWaveShaper();
  const curve = new Float32Array(2048);
  const k = 10 + genre.drive * 30;
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";

  const guitarBus = audioCtx.createGain();
  guitarBus.gain.value = genre.guitarGain;
  const tone = audioCtx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = genre.tone;
  tone.Q.value = 0.6;
  guitarBus.connect(shaper).connect(tone).connect(master);
  allNodes.push(guitarBus, shaper, tone);

  // Lead bus has its own (lighter) shaping so leads cut through.
  const leadBus = audioCtx.createGain();
  leadBus.gain.value = 0.15;
  const leadTone = audioCtx.createBiquadFilter();
  leadTone.type = "lowpass";
  leadTone.frequency.value = 5500;
  leadBus.connect(leadTone).connect(master);
  allNodes.push(leadBus, leadTone);

  // ---------------------------------------------------------------
  // Per-bar scheduling.
  // ---------------------------------------------------------------

  bars.forEach((bar: SongBar) => {
    const tBar = startCt + bar.index * barLen;
    if (tBar - startCt >= totalSec) return;

    const isFill = bar.isLastInSection;
    const drums = isFill ? genre.fill : drumsForSection(genre, bar.section);
    const chug = chugForSection(genre, bar.section);
    const sg = sectionGain(bar.section);
    const chord = bar.chord;
    const stabLen = sixteenth * genre.chugTailMul;

    // ---- Guitars: power-chord stabs ----
    chug.forEach((pos16) => {
      const tHit = tBar + pos16 * sixteenth;
      if (tHit - startCt >= totalSec) return;
      chord.forEach((freq) => {
        for (const detune of [-7, +7]) {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.value = freq;
          osc.detune.value = detune;
          g.gain.setValueAtTime(0, tHit);
          g.gain.linearRampToValueAtTime(
            (0.13 / chord.length) * sg.guitar,
            tHit + 0.005,
          );
          g.gain.exponentialRampToValueAtTime(0.001, tHit + stabLen);
          osc.connect(g).connect(guitarBus);
          osc.start(tHit);
          osc.stop(tHit + stabLen + 0.02);
          allNodes.push(osc, g);
        }
      });
    });

    // ---- Bass ----
    const bassPositions =
      genre.bassPattern.length > 0 ? genre.bassPattern : [0];
    bassPositions.forEach((pos16, idx) => {
      const tHit = tBar + pos16 * sixteenth;
      if (tHit - startCt >= totalSec) return;
      const nextPos = bassPositions[idx + 1] ?? 16;
      const dur = (nextPos - pos16) * sixteenth;
      const bass = audioCtx.createOscillator();
      const bg = audioCtx.createGain();
      bass.type = "triangle";
      bass.frequency.value = chord[0] / 2;
      bg.gain.setValueAtTime(0, tHit);
      bg.gain.linearRampToValueAtTime(0.22 * sg.guitar, tHit + 0.02);
      bg.gain.setValueAtTime(0.22 * sg.guitar, tHit + Math.max(0.02, dur - 0.05));
      bg.gain.exponentialRampToValueAtTime(0.001, tHit + dur);
      bass.connect(bg).connect(master);
      bass.start(tHit);
      bass.stop(tHit + dur + 0.02);
      allNodes.push(bass, bg);
    });

    // ---- Kick ----
    drums.kick.forEach((pos16) => {
      const tk = tBar + pos16 * sixteenth;
      if (tk - startCt >= totalSec) return;
      const kosc = audioCtx.createOscillator();
      const kg = audioCtx.createGain();
      kosc.type = "sine";
      kosc.frequency.setValueAtTime(160, tk);
      kosc.frequency.exponentialRampToValueAtTime(45, tk + 0.13);
      kg.gain.setValueAtTime(0.001, tk);
      kg.gain.exponentialRampToValueAtTime(0.55 * sg.drums, tk + 0.005);
      kg.gain.exponentialRampToValueAtTime(0.001, tk + 0.18);
      kosc.connect(kg).connect(master);
      kosc.start(tk);
      kosc.stop(tk + 0.2);
      allNodes.push(kosc, kg);
    });

    // ---- Beat tick callback ----
    if (onBeat) {
      for (let q = 0; q < 4; q++) {
        const tk = tBar + q * beat;
        if (tk - startCt >= totalSec) break;
        const delayMs = Math.max(0, (tk - audioCtx.currentTime) * 1000);
        const idx = bar.index * 4 + q;
        timeoutIds.push(window.setTimeout(() => onBeat(idx), delayMs));
      }
    }

    // ---- Snare ----
    drums.snare.forEach((pos16) => {
      const ts = tBar + pos16 * sixteenth;
      if (ts - startCt >= totalSec) return;
      const noise = audioCtx.createBufferSource();
      const buf = audioCtx.createBuffer(
        1,
        Math.max(1, Math.floor(audioCtx.sampleRate * 0.18)),
        audioCtx.sampleRate,
      );
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1500;
      const sgain = audioCtx.createGain();
      sgain.gain.setValueAtTime(0.001, ts);
      sgain.gain.exponentialRampToValueAtTime(0.45 * sg.drums, ts + 0.005);
      sgain.gain.exponentialRampToValueAtTime(0.001, ts + 0.16);
      noise.connect(hp).connect(sgain).connect(master);
      noise.start(ts);
      noise.stop(ts + 0.2);
      allNodes.push(noise, hp, sgain);
    });

    // ---- Hi-hat ----
    drums.hihat.forEach((pos16) => {
      const th = tBar + pos16 * sixteenth;
      if (th - startCt >= totalSec) return;
      const noise = audioCtx.createBufferSource();
      const buf = audioCtx.createBuffer(
        1,
        Math.max(1, Math.floor(audioCtx.sampleRate * 0.04)),
        audioCtx.sampleRate,
      );
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const hg = audioCtx.createGain();
      hg.gain.value = (pos16 % 4 === 0 ? 0.06 : 0.04) * sg.drums;
      noise.connect(hp).connect(hg).connect(master);
      noise.start(th);
      noise.stop(th + 0.05);
      allNodes.push(noise, hp, hg);
    });

    // ---- Crash on first bar of chorus / outro ----
    if (
      genre.hasCrashOnChorus &&
      bar.isFirstInSection &&
      (bar.section === "chorus" || bar.section === "outro")
    ) {
      const tc = tBar;
      if (tc - startCt < totalSec) {
        const noise = audioCtx.createBufferSource();
        const buf = audioCtx.createBuffer(
          1,
          Math.max(1, Math.floor(audioCtx.sampleRate * 1.2)),
          audioCtx.sampleRate,
        );
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length / 0.4);
        }
        noise.buffer = buf;
        const hp = audioCtx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 5000;
        const cg = audioCtx.createGain();
        cg.gain.setValueAtTime(0.001, tc);
        cg.gain.exponentialRampToValueAtTime(0.35, tc + 0.003);
        cg.gain.exponentialRampToValueAtTime(0.001, tc + 1.1);
        noise.connect(hp).connect(cg).connect(master);
        noise.start(tc);
        noise.stop(tc + 1.3);
        allNodes.push(noise, hp, cg);
      }
    }

    // ---- Lead phrase ----
    if (bar.hasLead && !isFill && leadPhrase.length > 0) {
      // Two octaves above the song root, transposed by this bar's chord.
      const leadRoot =
        bar.rootHz * 4 * (bar.section === "bridge" ? 0.5 : 1.0); // bridge an octave lower
      leadPhrase.forEach((ev) => {
        const tn = tBar + ev.pos * sixteenth;
        if (tn - startCt >= totalSec) return;
        const semis = scale[ev.deg % scale.length] ?? 0;
        const freq = leadRoot * Math.pow(2, semis / 12);
        const dur = ev.len * sixteenth;
        // Two oscillators (square + saw) for a richer lead.
        const o1 = audioCtx.createOscillator();
        const o2 = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o1.type = "square";
        o2.type = "sawtooth";
        o1.frequency.value = freq;
        o2.frequency.value = freq;
        o2.detune.value = 8;
        g.gain.setValueAtTime(0, tn);
        g.gain.linearRampToValueAtTime(0.12, tn + 0.008);
        g.gain.setValueAtTime(0.1, tn + Math.max(0.01, dur - 0.04));
        g.gain.exponentialRampToValueAtTime(0.001, tn + dur);
        o1.connect(g);
        o2.connect(g);
        g.connect(leadBus);
        o1.start(tn);
        o2.start(tn);
        o1.stop(tn + dur + 0.02);
        o2.stop(tn + dur + 0.02);
        allNodes.push(o1, o2, g);
      });
    }
  });

  return () => {
    timeoutIds.forEach((id) => window.clearTimeout(id));
    try {
      allNodes.forEach((n) => {
        const stoppable = n as AudioScheduledSourceNode;
        if (typeof stoppable.stop === "function") {
          try {
            stoppable.stop();
          } catch {
            /* already stopped */
          }
        }
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
  };
}
