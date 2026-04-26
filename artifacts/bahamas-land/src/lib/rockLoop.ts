// Procedural rock/metal backing track for the Anthem rhythm game.
//
// Driven by a TrackPreset (see rhythmTracks.ts) which defines the chord
// progression and 16th-grid patterns for guitar / kick / snare / hi-hat /
// bass. The whole track is scheduled up-front using AudioContext timing for
// tight sync with the gameplay note schedule. Returns a stop() function that
// tears everything down. The optional onBeat callback fires (via setTimeout,
// not Web Audio scheduling) on each quarter-note so visuals can pulse.

import type { TrackPreset } from "./rhythmTracks";

export type RockLoopOptions = {
  track: TrackPreset;
  bpm: number;
  durationMs: number;
  onBeat?: (beatIndex: number) => void;
};

export function playRockLoop(
  audioCtx: AudioContext,
  opts: RockLoopOptions,
): () => void {
  const { track, bpm, durationMs, onBeat } = opts;

  const startCt = audioCtx.currentTime + 0.05;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const barLen = beat * 4;
  const totalSec = durationMs / 1000;
  const totalBars = Math.ceil(totalSec / barLen);

  const allNodes: AudioNode[] = [];
  const timeoutIds: number[] = [];

  // Master ----------------------------------------------------------
  const master = audioCtx.createGain();
  master.gain.value = 0.22;
  master.connect(audioCtx.destination);
  allNodes.push(master);

  // Distortion bus for guitars (drive scales with track preset).
  const shaper = audioCtx.createWaveShaper();
  const curve = new Float32Array(2048);
  const k = 10 + track.drive * 30; // 10..40
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";

  const guitarBus = audioCtx.createGain();
  guitarBus.gain.value = track.guitarGain;
  const tone = audioCtx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = track.tone;
  tone.Q.value = 0.6;
  guitarBus.connect(shaper).connect(tone).connect(master);
  allNodes.push(guitarBus, shaper, tone);

  for (let bar = 0; bar < totalBars; bar++) {
    const tBar = startCt + bar * barLen;
    if (tBar - startCt >= totalSec) break;
    const chord = track.chords[bar % track.chords.length];

    // ---- Guitars: power-chord stabs at chugPattern positions ----
    const stabLen = sixteenth * track.chugTailMul;
    track.chugPattern.forEach((pos16) => {
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
          g.gain.linearRampToValueAtTime(0.13 / chord.length, tHit + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, tHit + stabLen);
          osc.connect(g).connect(guitarBus);
          osc.start(tHit);
          osc.stop(tHit + stabLen + 0.02);
          allNodes.push(osc, g);
        }
      });
    });

    // ---- Bass: re-articulate at bassPattern positions, sustain to next ----
    const bassPositions =
      track.bassPattern.length > 0 ? track.bassPattern : [0];
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
      bg.gain.linearRampToValueAtTime(0.22, tHit + 0.02);
      bg.gain.setValueAtTime(0.22, tHit + Math.max(0.02, dur - 0.05));
      bg.gain.exponentialRampToValueAtTime(0.001, tHit + dur);
      bass.connect(bg).connect(master);
      bass.start(tHit);
      bass.stop(tHit + dur + 0.02);
      allNodes.push(bass, bg);
    });

    // ---- Kick ----
    track.kickPattern.forEach((pos16) => {
      const tk = tBar + pos16 * sixteenth;
      if (tk - startCt >= totalSec) return;
      const kosc = audioCtx.createOscillator();
      const kg = audioCtx.createGain();
      kosc.type = "sine";
      kosc.frequency.setValueAtTime(160, tk);
      kosc.frequency.exponentialRampToValueAtTime(45, tk + 0.13);
      kg.gain.setValueAtTime(0.001, tk);
      kg.gain.exponentialRampToValueAtTime(0.55, tk + 0.005);
      kg.gain.exponentialRampToValueAtTime(0.001, tk + 0.18);
      kosc.connect(kg).connect(master);
      kosc.start(tk);
      kosc.stop(tk + 0.2);
      allNodes.push(kosc, kg);
    });

    // ---- Beat tick callback (every quarter note) ----
    if (onBeat) {
      for (let q = 0; q < 4; q++) {
        const tk = tBar + q * beat;
        if (tk - startCt >= totalSec) break;
        const delayMs = Math.max(0, (tk - audioCtx.currentTime) * 1000);
        const idx = bar * 4 + q;
        timeoutIds.push(window.setTimeout(() => onBeat(idx), delayMs));
      }
    }

    // ---- Snare ----
    track.snarePattern.forEach((pos16) => {
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
      const sg = audioCtx.createGain();
      sg.gain.setValueAtTime(0.001, ts);
      sg.gain.exponentialRampToValueAtTime(0.45, ts + 0.005);
      sg.gain.exponentialRampToValueAtTime(0.001, ts + 0.16);
      noise.connect(hp).connect(sg).connect(master);
      noise.start(ts);
      noise.stop(ts + 0.2);
      allNodes.push(noise, hp, sg);
    });

    // ---- Hi-hat ----
    track.hihatPattern.forEach((pos16) => {
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
      hg.gain.value = pos16 % 4 === 0 ? 0.06 : 0.04;
      noise.connect(hp).connect(hg).connect(master);
      noise.start(th);
      noise.stop(th + 0.05);
      allNodes.push(noise, hp, hg);
    });

    // ---- Optional lead arpeggio (high-tier tracks) ----
    if (track.leadEnabled) {
      const arp = [chord[0] * 2, chord[1] * 2, chord[2] * 2, chord[1] * 2];
      for (let q = 0; q < 4; q++) {
        const tn = tBar + q * beat;
        if (tn - startCt >= totalSec) break;
        const note = arp[q % arp.length];
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.value = note;
        const dur = beat * 0.7;
        g.gain.setValueAtTime(0, tn);
        g.gain.linearRampToValueAtTime(0.05, tn + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, tn + dur);
        osc.connect(g).connect(master);
        osc.start(tn);
        osc.stop(tn + dur + 0.02);
        allNodes.push(osc, g);
      }
    }
  }

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
