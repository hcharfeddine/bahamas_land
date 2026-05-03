// Tone.js music engine — full-song structure with section dynamics.
// Each bar gets a unique phrase role so the song develops like real music:
//   intro    → sparse, one note at a time, builds instrument by instrument
//   verse    → A phrase (call), then B phrase (response), alternating
//   chorus   → C phrase up an octave, full energy, loud
//   bridge   → B phrase slowed, no hihat, emotional contrast
//   breakdown→ kick + bass only, silence = tension
//   outro    → A phrase fragments fading out, instruments drop one by one

import * as Tone from "tone";
import type { SongPlan, SongBar } from "./rhythmSong";
import type { SectionType, SynthProfile } from "./rhythmTracks";
import { getComposedPhrase } from "./rhythmPhrases";

export type ToneEngineOptions = {
  song: SongPlan;
  durationMs: number;
  onBeat?: (beatIndex: number) => void;
};

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── Bar metadata helper ───────────────────────────────────────────────────────

function buildBarMeta(bars: SongBar[]): Array<{ barIdxInSec: number; secLen: number }> {
  const meta: Array<{ barIdxInSec: number; secLen: number }> = [];
  let i = 0;
  while (i < bars.length) {
    let j = i + 1;
    while (j < bars.length && !bars[j].isFirstInSection) j++;
    const len = j - i;
    for (let k = 0; k < len; k++) meta.push({ barIdxInSec: k, secLen: len });
    i = j;
  }
  return meta;
}

// ── Musical arc per bar ───────────────────────────────────────────────────────
//
// Returns everything needed to play one bar:
//   which instruments are active, velocity, octave multiplier,
//   which composed phrase to use (0=A verse, 1=B chorus, 2=C bridge),
//   and whether to play only the back half (response bars).

type BarPlan = {
  playDrums:  boolean;
  playSnare:  boolean;
  playHihat:  boolean;
  playBass:   boolean;
  playChords: boolean;
  playLead:   boolean;
  velocity:   number;
  leadOctMul: number;   // 2=low, 4=mid, 8=high octave
  phraseRole: number;   // 0=A, 1=B, 2=C
  backHalf:   boolean;  // play only positions 8-15 (response / answer)
  noteSkip:   number;   // 0=play all notes, N=play every Nth note (sparse intro)
};

function planBar(
  section: SectionType,
  barIdxInSec: number,
  secLen: number,
  hasLead: boolean,
): BarPlan {
  switch (section) {

    // ── INTRO: cold open, layer in instruments bar by bar ──────────────────
    // Bar 0: kick only — absolute silence except the beat
    // Bar 1: kick + bass enters
    // Bar 2: snare + hihat enter, chords enter softly
    // Bar 3+: lead enters, only first 2 notes (sparse)
    // Bar 5+: lead plays full phrase A
    case "intro": {
      const playBass   = barIdxInSec >= 1;
      const playSnare  = barIdxInSec >= 2;
      const playHihat  = barIdxInSec >= 2;
      const playChords = barIdxInSec >= 2;
      const playLead   = hasLead && barIdxInSec >= 3;
      const vel = 0.3 + Math.min(0.35, barIdxInSec * 0.06);
      // Sparse: only play 1 note in bar 3-4, full phrase from bar 5
      const noteSkip = barIdxInSec < 5 ? 3 : 1;
      return {
        playDrums: true, playSnare, playHihat, playBass, playChords, playLead,
        velocity: vel, leadOctMul: 2, phraseRole: 0, backHalf: false, noteSkip,
      };
    }

    // ── VERSE: A phrase (call) on odd bars, B phrase (response) on even bars
    // Every 4 bars the octave shifts up to keep it developing.
    // Bar 3 of each group: silence on lead (breathing room).
    case "verse": {
      const group      = Math.floor(barIdxInSec / 4);
      const posInGroup = barIdxInSec % 4;
      const leadOctMul = group % 2 === 0 ? 4 : 8; // alternates octave every 4 bars
      // Bar 0: A phrase full
      // Bar 1: B phrase back half (response)
      // Bar 2: A phrase front half (call again, slight variation)
      // Bar 3: silence (rest bar, let the chord breathe)
      const playLead   = hasLead && posInGroup !== 3;
      const phraseRole = posInGroup === 1 ? 1 : 0; // B on bar 1, A otherwise
      const backHalf   = posInGroup === 1;           // response = back half
      const vel = 0.6 + Math.min(0.15, barIdxInSec * 0.012);
      return {
        playDrums: true, playSnare: true, playHihat: true, playBass: true, playChords: true, playLead,
        velocity: vel, leadOctMul, phraseRole, backHalf, noteSkip: 1,
      };
    }

    // ── CHORUS: max energy, C phrase up high, alternates with B phrase
    // Every bar plays — no silence. Octave is always high (leadOctMul 8).
    // Bar 0,2: C phrase (the big chorus hook)
    // Bar 1,3: B phrase at high octave (keeps it from being identical)
    case "chorus": {
      const phraseRole = barIdxInSec % 2 === 0 ? 2 : 1;
      return {
        playDrums: true, playSnare: true, playHihat: true, playBass: true, playChords: true, playLead: hasLead,
        velocity: 0.95, leadOctMul: 8, phraseRole, backHalf: false, noteSkip: 1,
      };
    }

    // ── BRIDGE: emotional contrast — no hihat, slower feel, B phrase mid-octave
    // First half: chords + lead (B phrase)
    // Second half: just bass + lead, stripped back (tension before final chorus)
    case "bridge": {
      const halfWay    = Math.floor(secLen / 2);
      const playChords = barIdxInSec < halfWay;
      const playHihat  = false; // no hihat = breathing room
      const playSnare  = barIdxInSec % 2 === 0; // snare only on even bars
      const vel = 0.7 - Math.min(0.2, barIdxInSec * 0.03); // gets quieter toward the end
      return {
        playDrums: true, playSnare, playHihat, playBass: true, playChords, playLead: hasLead,
        velocity: vel, leadOctMul: 4, phraseRole: 1, backHalf: false, noteSkip: 1,
      };
    }

    // ── BREAKDOWN: kick + bass only. Total silence on melody.
    // This is the tension moment before the final chorus hits.
    case "breakdown": {
      return {
        playDrums: true, playSnare: false, playHihat: false, playBass: true, playChords: false, playLead: false,
        velocity: 0.5, leadOctMul: 4, phraseRole: 0, backHalf: false, noteSkip: 1,
      };
    }

    // ── OUTRO: instruments drop out one by one, A phrase fades away
    // barsLeft 4+: full texture, A phrase
    // barsLeft 3:  no lead
    // barsLeft 2:  no chords
    // barsLeft 1:  bass only
    // barsLeft 0:  silence
    case "outro": {
      const barsLeft   = secLen - barIdxInSec;
      const playLead   = hasLead && barsLeft >= 4;
      const playChords = barsLeft >= 3;
      const playSnare  = barsLeft >= 3;
      const playHihat  = barsLeft >= 4;
      const playBass   = barsLeft >= 2;
      const vel        = Math.max(0.15, 0.7 - barIdxInSec * 0.08);
      // Play only sparse notes (every 2nd) in outro so it fades gracefully
      const noteSkip = barsLeft <= 2 ? 2 : 1;
      return {
        playDrums: true, playSnare, playHihat, playBass, playChords, playLead,
        velocity: vel, leadOctMul: 2, phraseRole: 0, backHalf: false, noteSkip,
      };
    }

    default:
      return {
        playDrums: true, playSnare: true, playHihat: true, playBass: true, playChords: true, playLead: hasLead,
        velocity: 0.7, leadOctMul: 4, phraseRole: 0, backHalf: false, noteSkip: 1,
      };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function playWithTone(opts: ToneEngineOptions): () => void {
  const { song, durationMs, onBeat } = opts;
  const { genre, bpm, bars, scale } = song;
  const profile: SynthProfile = genre.synthProfile;

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.bpm.value = bpm;

  const beat     = 60 / bpm;
  const s16      = beat / 4;
  const barLen   = beat * 4;
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

  // ── Schedule all events ───────────────────────────────────────────────────
  bars.forEach((bar: SongBar, barIdx: number) => {
    const tBar = bar.index * barLen;
    if (tBar >= totalSec) return;

    const { barIdxInSec, secLen } = barMeta[barIdx];
    const plan = planBar(bar.section, barIdxInSec, secLen, bar.hasLead);

    const isFill = bar.isLastInSection;
    const sec = genre[bar.section as SectionType] as {
      drums: { kick: number[]; snare: number[]; hihat: number[] };
      chug: number[];
    };
    const drums = isFill ? genre.fill : sec.drums;
    const chugs = sec.chug;

    // ── Kick ────────────────────────────────────────────────────────────────
    if (plan.playDrums) {
      drums.kick.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        transport.schedule((at: number) => {
          try { kick.triggerAttackRelease("C1", "16n", at, plan.velocity); } catch { /**/ }
        }, t);
      });
    }

    // ── Snare ───────────────────────────────────────────────────────────────
    if (plan.playSnare) {
      drums.snare.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        transport.schedule((at: number) => {
          try { snareNoise.triggerAttackRelease("16n", at, plan.velocity); } catch { /**/ }
        }, t);
      });
    }

    // ── Hi-hat ──────────────────────────────────────────────────────────────
    if (plan.playHihat) {
      drums.hihat.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        transport.schedule((at: number) => {
          try { hihatNoise.triggerAttackRelease("32n", at, plan.velocity * 0.7); } catch { /**/ }
        }, t);
      });
    }

    // ── Chord stabs ──────────────────────────────────────────────────────────
    if (plan.playChords) {
      const stabDur = Math.max(0.04, s16 * genre.chugTailMul);
      chugs.forEach((p16) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        const notes = bar.chord.map(hzToNote);
        transport.schedule((at: number) => {
          try { chordSynth.triggerAttackRelease(notes, stabDur, at, plan.velocity * 0.85); } catch { /**/ }
        }, t);
      });
    }

    // ── Bass ──────────────────────────────────────────────────────────────────
    if (plan.playBass) {
      genre.bassPattern.forEach((p16, i) => {
        const t = tBar + p16 * s16;
        if (t >= totalSec) return;
        const nextPos = genre.bassPattern[i + 1] ?? 16;
        const dur = Math.max(0.04, (nextPos - p16) * s16 * 0.9);
        const bassNote = hzToNote(bar.rootHz / 2);
        transport.schedule((at: number) => {
          try { bassSynth.triggerAttackRelease(bassNote, dur, at, plan.velocity); } catch { /**/ }
        }, t);
      });
    }

    // ── Lead melody ───────────────────────────────────────────────────────────
    // Uses composed phrases from rhythmPhrases.ts — A/B/C per section role.
    // noteSkip controls sparseness (intro = every 3rd note, outro = every 2nd).
    // backHalf = play only positions 8-15 (call & response on verse bar 1).
    if (plan.playLead && !isFill) {
      const phrase = getComposedPhrase(song.level, plan.phraseRole);

      phrase.forEach((ev, evIdx) => {
        // Sparseness filter for intro/outro
        if (plan.noteSkip > 1 && evIdx % plan.noteSkip !== 0) return;
        // Back-half filter for response bars
        if (plan.backHalf && ev.pos < 8) return;

        const t = tBar + ev.pos * s16;
        if (t >= totalSec) return;

        const semis = scale[ev.deg % scale.length] ?? 0;
        const freq   = bar.rootHz * plan.leadOctMul * Math.pow(2, semis / 12);
        const dur    = Math.max(0.04, ev.len * s16 * 0.88);
        const note   = hzToNote(freq);

        transport.schedule((at: number) => {
          try { leadSynth.triggerAttackRelease(note, dur, at, plan.velocity * 0.9); } catch { /**/ }
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