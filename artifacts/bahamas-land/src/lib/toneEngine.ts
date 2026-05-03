// Tone.js music engine — full-song structure with section dynamics.
// Each section has its own register, velocity, texture and phrase selection.
// Intro builds in instrument by instrument. Chorus is louder, lead up an octave.
// Bridge contrasts. Breakdown strips to kick+bass. Outro fades and drops out.

import * as Tone from "tone";
import type { SongPlan, SongBar } from "./rhythmSong";
import type { SectionType, LeadPhrase, SynthProfile } from "./rhythmTracks";

export type ToneEngineOptions = {
  song: SongPlan;
  durationMs: number;
  onBeat?: (beatIndex: number) => void;
};

// ── helpers ──────────────────────────────────────────────────────────────────

function hzToNote(hz: number): string {
  try {
    const clamped = Math.max(16.35, Math.min(hz, 4186));
    return Tone.Frequency(clamped, "hz").toNote() as string;
  } catch {
    return "C2";
  }
}

function buildChain(
  profile: SynthProfile,
  gainDb: number,
  overrides: Partial<SynthProfile> = {},
): { input: Tone.ToneAudioNode; dispose: () => void } {
  const p = { ...profile, ...overrides };
  const nodes: Tone.ToneAudioNode[] = [];

  const master = new Tone.Gain(Tone.dbToGain(gainDb));
  master.toDestination();
  nodes.push(master);
  let last: Tone.ToneAudioNode = master;

  if (p.reverbDecay > 0) {
    const rev = new Tone.Reverb({ decay: Math.max(0.1, p.reverbDecay), wet: Math.min(0.85, p.reverbDecay * 0.18) });
    rev.connect(last); last = rev; nodes.push(rev);
  }
  const lowCut = new Tone.Filter(110, "highpass");
  lowCut.connect(last);
  last = lowCut;
  nodes.push(lowCut);
  if (p.useChorus) {
    const cho = new Tone.Chorus(4, 2.5, 0.5).start();
    cho.connect(last); last = cho; nodes.push(cho);
  }
  if (p.distortion > 0) {
    const dist = new Tone.Distortion(p.distortion);
    dist.connect(last); last = dist; nodes.push(dist);
  }
  if (p.useBitCrush) {
    const bc = new Tone.BitCrusher(Math.max(2, Math.min(16, p.bitCrushBits)));
    bc.connect(last); last = bc; nodes.push(bc);
  }
  return {
    input: last,
    dispose: () => nodes.forEach((n) => { try { n.dispose(); } catch { /**/ } }),
  };
}

// ── Per-section configuration ─────────────────────────────────────────────────
//
// Controls which instruments play, how loud, and which lead phrase / octave.

type BarConfig = {
  playDrums: boolean;
  playSnare: boolean;
  playHihat: boolean;
  playBass: boolean;
  playChords: boolean;
  playLead: boolean;
  velocity: number;      // 0-1, applied to chord + lead triggers
  leadOctMul: number;    // multiplier on rootHz for lead (4 = 2 oct up, 8 = 3 oct up)
  phraseIdx: number;     // which genre.leadPhrases[] entry to use
};

function getBarConfig(
  section: SectionType,
  barIdxInSec: number,
  secLen: number,
  hasLead: boolean,
  numPhrases: number,
): BarConfig {
  const n = Math.max(1, numPhrases);

  switch (section) {
    case "intro": {
      // Bar 0: just kick+hihat, nothing else (cold open)
      // Bar 1: kick+snare+bass enters
      // Bar 2+: chords enter, lead enters in bar 3+
      const playBass   = barIdxInSec >= 1;
      const playChords = barIdxInSec >= 2;
      const playLead   = hasLead && barIdxInSec >= 3;
      const playSnare  = barIdxInSec >= 1;
      const vel = 0.35 + Math.min(0.25, barIdxInSec * 0.07);
      return { playDrums:true, playSnare, playHihat:true, playBass, playChords, playLead, velocity:vel, leadOctMul:2, phraseIdx:0 };
    }

    case "verse": {
      // Full texture. Phrases cycle through the pool every 2 bars.
      // Octave shifts upward every 4 bars to keep it developing.
      const phraseIdx = Math.floor(barIdxInSec / 2) % n;
      const octShift  = Math.floor(barIdxInSec / 4) % 2; // 0 or +1 octave
      const leadOctMul = octShift === 0 ? 4 : 8;
      const vel = 0.65 + Math.min(0.1, barIdxInSec * 0.015);
      return { playDrums:true, playSnare:true, playHihat:true, playBass:true, playChords:true, playLead:hasLead, velocity:vel, leadOctMul, phraseIdx };
    }

    case "chorus": {
      // Maximum energy. Lead is 1 octave ABOVE verse. Different phrase from verse.
      // Alternate between the last two phrases so chorus never sounds identical across reps.
      const phraseIdx = n < 2 ? 0 : (1 + Math.floor(barIdxInSec / 2)) % (n - 1) + (n > 1 ? 1 : 0);
      return { playDrums:true, playSnare:true, playHihat:true, playBass:true, playChords:true, playLead:hasLead, velocity:0.95, leadOctMul:8, phraseIdx: Math.min(phraseIdx, n-1) };
    }

    case "bridge": {
      // Slightly contrasting. Use the last available phrase. No hihat (breathing room).
      const phraseIdx = n - 1;
      return { playDrums:true, playSnare:true, playHihat:false, playBass:true, playChords:true, playLead:hasLead, velocity:0.78, leadOctMul:4, phraseIdx };
    }

    case "breakdown": {
      // Strip to just kick + bass. Dead silent on everything else.
      return { playDrums:true, playSnare:false, playHihat:false, playBass:true, playChords:false, playLead:false, velocity:0.5, leadOctMul:4, phraseIdx:0 };
    }

    case "outro": {
      // Instruments drop out bar by bar as we fade.
      const barsLeft = secLen - barIdxInSec;
      const playLead   = hasLead && barsLeft > 2;
      const playChords = barsLeft > 1;
      const playBass   = barsLeft > 0;
      const vel = Math.max(0.2, 0.65 - barIdxInSec * 0.09);
      return { playDrums:true, playSnare:barsLeft>1, playHihat:barsLeft>2, playBass, playChords, playLead, velocity:vel, leadOctMul:2, phraseIdx:0 };
    }

    default:
      return { playDrums:true, playSnare:true, playHihat:true, playBass:true, playChords:true, playLead:hasLead, velocity:0.7, leadOctMul:4, phraseIdx:0 };
  }
}

// ── Precompute barIndexInSection ──────────────────────────────────────────────

function buildBarMeta(bars: SongBar[]): Array<{ barIdxInSec: number; secLen: number }> {
  const meta: Array<{ barIdxInSec: number; secLen: number }> = [];
  let i = 0;
  while (i < bars.length) {
    // Find end of this section run
    let j = i + 1;
    while (j < bars.length && !bars[j].isFirstInSection) j++;
    const len = j - i;
    for (let k = 0; k < len; k++) meta.push({ barIdxInSec: k, secLen: len });
    i = j;
  }
  return meta;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function playWithTone(opts: ToneEngineOptions): () => void {
  const { song, durationMs, onBeat } = opts;
  const { genre, bpm, bars, scale } = song;
  const profile: SynthProfile = genre.synthProfile;
  const phrases: LeadPhrase[] = genre.leadPhrases;

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.bpm.value = bpm;

  const beat    = 60 / bpm;
  const s16     = beat / 4;
  const barLen  = beat * 4;
  const totalSec = (durationMs + 200) / 1000;

  const disposeList: (() => void)[] = [];

  // ── Effects chains ────────────────────────────────────────────────────────
  const chordChain = buildChain(profile, -13);
  const bassChain  = buildChain(profile, -12, { distortion: profile.distortion * 0.2, reverbDecay: 0, useBitCrush: false, useChorus: false });
  const leadChain  = buildChain(profile, -16, { distortion: profile.distortion * 0.35, reverbDecay: profile.reverbDecay * 0.3, useBitCrush: false, useChorus: false });
  const drumChain  = buildChain(profile, -5,  { distortion: 0, reverbDecay: 0, useBitCrush: false, useChorus: false });

  disposeList.push(chordChain.dispose, bassChain.dispose, leadChain.dispose, drumChain.dispose);

  // ── Instruments ───────────────────────────────────────────────────────────

  const chordSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: profile.chordOsc },
    envelope: { attack: profile.attack, decay: profile.decay, sustain: profile.sustain, release: profile.release },
  });
  chordSynth.connect(chordChain.input);
  chordSynth.volume.value = -4;
  disposeList.push(() => chordSynth.dispose());

  const leadSynth = new Tone.Synth({
    oscillator: { type: profile.leadOsc },
    envelope: { attack: 0.008, decay: 0.14, sustain: 0.5, release: 0.22 },
  });
  leadSynth.connect(leadChain.input);
  leadSynth.volume.value = 1;
  disposeList.push(() => leadSynth.dispose());

  const bassSynth = new Tone.Synth({
    oscillator: { type: profile.bassOsc },
    envelope: { attack: 0.018, decay: 0.22, sustain: 0.55, release: 0.28 },
  });
  bassSynth.connect(bassChain.input);
  bassSynth.volume.value = 0;
  disposeList.push(() => bassSynth.dispose());

  const kick = new Tone.MembraneSynth({
    pitchDecay: profile.kickDecay,
    octaves: profile.kickOctaves,
    envelope: { attack: 0.001, decay: profile.kickDecay * 1.5, sustain: 0, release: 0.08 },
  });
  kick.connect(drumChain.input);
  kick.volume.value = 3;
  disposeList.push(() => kick.dispose());

  const snareNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: profile.snareDecay, sustain: 0, release: 0.05 },
  });
  const snareHp = new Tone.Filter(2000, "highpass");
  snareNoise.connect(snareHp);
  snareHp.connect(drumChain.input);
  snareNoise.volume.value = -3;
  disposeList.push(() => { snareNoise.dispose(); snareHp.dispose(); });

  const hihatNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
  });
  const hihatHp = new Tone.Filter(9500, "highpass");
  hihatNoise.connect(hihatHp);
  hihatHp.connect(drumChain.input);
  hihatNoise.volume.value = -16;
  disposeList.push(() => { hihatNoise.dispose(); hihatHp.dispose(); });

  // ── Bar metadata ──────────────────────────────────────────────────────────
  const barMeta = buildBarMeta(bars);

  // ── Schedule events ───────────────────────────────────────────────────────
  bars.forEach((bar: SongBar, barIdx: number) => {
    const tBar = bar.index * barLen;
    if (tBar >= totalSec) return;

    const { barIdxInSec, secLen } = barMeta[barIdx];
    const cfg = getBarConfig(bar.section, barIdxInSec, secLen, bar.hasLead, phrases.length);

    const isFill = bar.isLastInSection;
    const sec = genre[bar.section as SectionType] as { drums: { kick: number[]; snare: number[]; hihat: number[] }; chug: number[] };
    const drums = isFill ? genre.fill : sec.drums;
    const chugs = sec.chug;

    // ── Kick ────────────────────────────────────────────────────────────────
    if (cfg.playDrums) {
      drums.kick.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        transport.schedule((at: number) => {
          try { kick.triggerAttackRelease("C1", "16n", at, cfg.velocity); } catch { /**/ }
        }, t);
      });
    }

    // ── Snare ───────────────────────────────────────────────────────────────
    if (cfg.playSnare) {
      drums.snare.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        transport.schedule((at: number) => {
          try { snareNoise.triggerAttackRelease("16n", at, cfg.velocity); } catch { /**/ }
        }, t);
      });
    }

    // ── Hi-hat ──────────────────────────────────────────────────────────────
    if (cfg.playHihat) {
      drums.hihat.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        transport.schedule((at: number) => {
          try { hihatNoise.triggerAttackRelease("32n", at, cfg.velocity * 0.7); } catch { /**/ }
        }, t);
      });
    }

    // ── Chord stabs ─────────────────────────────────────────────────────────
    if (cfg.playChords) {
      const stabDur = Math.max(0.04, s16 * genre.chugTailMul);
      chugs.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        const notes = bar.chord.map(hzToNote);
        transport.schedule((at: number) => {
          try { chordSynth.triggerAttackRelease(notes, stabDur, at, cfg.velocity * 0.85); } catch { /**/ }
        }, t);
      });
    }

    // ── Bass ─────────────────────────────────────────────────────────────────
    if (cfg.playBass) {
      genre.bassPattern.forEach((p16, i) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        const nextPos = genre.bassPattern[i + 1] ?? 16;
        const dur = Math.max(0.04, (nextPos - p16) * s16 * 0.9);
        const bassNote = hzToNote(bar.rootHz / 2);
        transport.schedule((at: number) => {
          try { bassSynth.triggerAttackRelease(bassNote, dur, at, cfg.velocity); } catch { /**/ }
        }, t);
      });
    }

    // ── Lead melody ──────────────────────────────────────────────────────────
    // Pick phrase for this bar, skip on fills (fills = transition drum rolls).
    if (cfg.playLead && !isFill && phrases.length > 0) {
      const phrase = phrases[Math.min(cfg.phraseIdx, phrases.length - 1)];

      // On odd bars within the section, play only the "back half" of the phrase
      // (positions 8-15) to create call-and-response and break the loop feel.
      const useBackHalf = barIdxInSec % 2 === 1 && phrase.length > 3;

      phrase.forEach((ev) => {
        if (useBackHalf && ev.pos < 8) return; // skip front half on response bars
        const t = tBar + ev.pos * s16;
        if (t >= totalSec) return;
        const semis = scale[ev.deg % scale.length] ?? 0;
        const freq = bar.rootHz * cfg.leadOctMul * Math.pow(2, semis / 12);
        const dur = Math.max(0.04, ev.len * s16 * 0.88);
        const leadNote = hzToNote(freq);
        transport.schedule((at: number) => {
          try { leadSynth.triggerAttackRelease(leadNote, dur, at, cfg.velocity * 0.9); } catch { /**/ }
        }, t);
      });
    }
  });

  // ── Beat callback ─────────────────────────────────────────────────────────
  let beatIdx = 0;
  let beatEventId: number | null = null;
  if (onBeat) {
    beatEventId = transport.scheduleRepeat((at: number) => {
      const b = beatIdx++;
      const delay = Math.max(0, (at - Tone.now()) * 1000);
      setTimeout(() => onBeat(b), delay);
    }, "4n");
  }

  transport.start("+0.05");

  return () => {
    transport.stop();
    transport.cancel();
    if (beatEventId !== null) { try { transport.clear(beatEventId); } catch { /**/ } }
    beatIdx = 0;
    disposeList.forEach((fn) => { try { fn(); } catch { /**/ } });
  };
}
