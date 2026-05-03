// Tone.js based music engine — replaces rockLoop.ts
// Schedules drums, bass, chords and lead lines using Tone.Transport so every
// tier sounds distinctly different depending on its SynthProfile.

import * as Tone from "tone";
import type { SongPlan, SongBar } from "./rhythmSong";
import type { SectionType, SynthProfile } from "./rhythmTracks";

export type ToneEngineOptions = {
  song: SongPlan;
  durationMs: number;
  onBeat?: (beatIndex: number) => void;
};

// ── helpers ──────────────────────────────────────────────────────────────────

function hzToNote(hz: number): string {
  try {
    // Clamp to audible piano range (C0–C8)
    const clamped = Math.max(16.35, Math.min(hz, 4186));
    return Tone.Frequency(clamped, "hz").toNote() as string;
  } catch {
    return "C2";
  }
}

// Build a signal chain: master gain → optional effects → Tone.Destination.
// Returns the node synths should connect to.
function buildChain(
  profile: SynthProfile,
  gainDb: number,
): { input: Tone.ToneAudioNode; dispose: () => void } {
  const nodes: Tone.ToneAudioNode[] = [];

  const master = new Tone.Gain(Tone.dbToGain(gainDb));
  master.toDestination();
  nodes.push(master);

  let last: Tone.ToneAudioNode = master;

  if (profile.reverb > 0) {
    const rev = new Tone.Reverb({
      decay: Math.max(0.1, profile.reverbDecay),
      wet: Math.min(0.9, profile.reverbDecay * 0.18),
    });
    rev.connect(last);
    last = rev;
    nodes.push(rev);
  }

  if (profile.useChorus) {
    const cho = new Tone.Chorus(4, 2.5, 0.5).start();
    cho.connect(last);
    last = cho;
    nodes.push(cho);
  }

  if (profile.distortion > 0) {
    const dist = new Tone.Distortion(profile.distortion);
    dist.connect(last);
    last = dist;
    nodes.push(dist);
  }

  if (profile.useBitCrush) {
    const bc = new Tone.BitCrusher(Math.max(2, Math.min(16, profile.bitCrushBits)));
    bc.connect(last);
    last = bc;
    nodes.push(bc);
  }

  return {
    input: last,
    dispose: () => nodes.forEach((n) => { try { n.dispose(); } catch { /* */ } }),
  };
}

// ── main export ──────────────────────────────────────────────────────────────

export function playWithTone(opts: ToneEngineOptions): () => void {
  const { song, durationMs, onBeat } = opts;
  const { genre, bpm, bars, scale, leadPhrase } = song;
  const profile: SynthProfile = genre.synthProfile;

  // ── Reset & configure Transport ──────────────────────────────────────────
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.bpm.value = bpm;

  const beat = 60 / bpm;          // seconds per beat
  const s16  = beat / 4;          // seconds per 16th note
  const barLen = beat * 4;        // seconds per bar
  const totalSec = (durationMs + 200) / 1000;

  const disposeList: (() => void)[] = [];

  // ── Effects chains ───────────────────────────────────────────────────────
  const chordChain = buildChain(profile, -14);
  const bassChain  = buildChain({ ...profile, distortion: profile.distortion * 0.4, reverb: 0, useBitCrush: false, useChorus: false }, -10);
  const leadChain  = buildChain({ ...profile, distortion: profile.distortion * 0.6, reverb: profile.reverbDecay * 0.5, useBitCrush: false, useChorus: false }, -16);
  const drumChain  = buildChain({ ...profile, distortion: 0, reverb: 0, useBitCrush: false, useChorus: false }, -6);

  disposeList.push(chordChain.dispose, bassChain.dispose, leadChain.dispose, drumChain.dispose);

  // ── Instruments ──────────────────────────────────────────────────────────

  // Chord poly synth
  const chordSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: profile.chordOsc },
    envelope: {
      attack: profile.attack,
      decay: profile.decay,
      sustain: profile.sustain,
      release: profile.release,
    },
  });
  chordSynth.connect(chordChain.input);
  chordSynth.volume.value = -4;
  disposeList.push(() => chordSynth.dispose());

  // Lead synth
  const leadSynth = new Tone.Synth({
    oscillator: { type: profile.leadOsc },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.55, release: 0.2 },
  });
  leadSynth.connect(leadChain.input);
  leadSynth.volume.value = 0;
  disposeList.push(() => leadSynth.dispose());

  // Bass synth
  const bassSynth = new Tone.Synth({
    oscillator: { type: profile.bassOsc },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.55, release: 0.3 },
  });
  bassSynth.connect(bassChain.input);
  bassSynth.volume.value = 4;
  disposeList.push(() => bassSynth.dispose());

  // Kick drum
  const kick = new Tone.MembraneSynth({
    pitchDecay: profile.kickDecay,
    octaves: profile.kickOctaves,
    envelope: {
      attack: 0.001,
      decay: profile.kickDecay * 1.4,
      sustain: 0,
      release: 0.08,
    },
  });
  kick.connect(drumChain.input);
  kick.volume.value = 2;
  disposeList.push(() => kick.dispose());

  // Snare
  const snareNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: {
      attack: 0.001,
      decay: profile.snareDecay,
      sustain: 0,
      release: 0.05,
    },
  });
  const snareHp = new Tone.Filter(2200, "highpass");
  snareNoise.connect(snareHp);
  snareHp.connect(drumChain.input);
  snareNoise.volume.value = -4;
  disposeList.push(() => { snareNoise.dispose(); snareHp.dispose(); });

  // Hi-hat
  const hihatNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.022, sustain: 0, release: 0.01 },
  });
  const hihatHp = new Tone.Filter(9000, "highpass");
  hihatNoise.connect(hihatHp);
  hihatHp.connect(drumChain.input);
  hihatNoise.volume.value = -16;
  disposeList.push(() => { hihatNoise.dispose(); hihatHp.dispose(); });

  // ── Schedule bars ────────────────────────────────────────────────────────

  bars.forEach((bar: SongBar) => {
    const tBar = bar.index * barLen;
    if (tBar >= totalSec) return;

    const isFill = bar.isLastInSection;
    const sec = genre[bar.section as SectionType] as { drums: { kick: number[]; snare: number[]; hihat: number[] }; chug: number[] };
    const drums = isFill ? genre.fill : sec.drums;
    const chugs = sec.chug;

    // Kick
    drums.kick.forEach((p16) => {
      const t = tBar + p16 * s16;
      if (t >= totalSec) return;
      transport.schedule((audioTime) => {
        try { kick.triggerAttackRelease("C1", "16n", audioTime); } catch { /* */ }
      }, t);
    });

    // Snare
    drums.snare.forEach((p16) => {
      const t = tBar + p16 * s16;
      if (t >= totalSec) return;
      transport.schedule((audioTime) => {
        try { snareNoise.triggerAttackRelease("16n", audioTime); } catch { /* */ }
      }, t);
    });

    // Hi-hat
    drums.hihat.forEach((p16) => {
      const t = tBar + p16 * s16;
      if (t >= totalSec) return;
      transport.schedule((audioTime) => {
        try { hihatNoise.triggerAttackRelease("32n", audioTime); } catch { /* */ }
      }, t);
    });

    // Chord stabs
    const stabDur = Math.max(0.04, s16 * genre.chugTailMul);
    chugs.forEach((p16) => {
      const t = tBar + p16 * s16;
      if (t >= totalSec) return;
      const notes = bar.chord.map(hzToNote);
      transport.schedule((audioTime) => {
        try { chordSynth.triggerAttackRelease(notes, stabDur, audioTime); } catch { /* */ }
      }, t);
    });

    // Bass line
    genre.bassPattern.forEach((p16, i) => {
      const t = tBar + p16 * s16;
      if (t >= totalSec) return;
      const nextPos = genre.bassPattern[i + 1] ?? 16;
      const dur = Math.max(0.04, (nextPos - p16) * s16 * 0.9);
      const bassNote = hzToNote(bar.rootHz / 2);
      transport.schedule((audioTime) => {
        try { bassSynth.triggerAttackRelease(bassNote, dur, audioTime); } catch { /* */ }
      }, t);
    });

    // Lead melody
    if (bar.hasLead && !isFill && leadPhrase.length > 0) {
      leadPhrase.forEach((ev) => {
        const t = tBar + ev.pos * s16;
        if (t >= totalSec) return;
        const semis = scale[ev.deg % scale.length] ?? 0;
        const freq = bar.rootHz * 4 * Math.pow(2, semis / 12);
        const dur = Math.max(0.04, ev.len * s16 * 0.88);
        const leadNote = hzToNote(freq);
        transport.schedule((audioTime) => {
          try { leadSynth.triggerAttackRelease(leadNote, dur, audioTime); } catch { /* */ }
        }, t);
      });
    }
  });

  // ── Beat callback ────────────────────────────────────────────────────────
  let beatIdx = 0;
  let beatEventId: number | null = null;

  if (onBeat) {
    beatEventId = transport.scheduleRepeat((audioTime) => {
      const b = beatIdx++;
      const delay = Math.max(0, (audioTime - Tone.now()) * 1000);
      setTimeout(() => onBeat(b), delay);
    }, "4n");
  }

  // ── Start ────────────────────────────────────────────────────────────────
  transport.start("+0.05");

  // ── Cleanup ──────────────────────────────────────────────────────────────
  return () => {
    transport.stop();
    transport.cancel();
    if (beatEventId !== null) {
      try { transport.clear(beatEventId); } catch { /* */ }
    }
    beatIdx = 0;
    disposeList.forEach((fn) => { try { fn(); } catch { /* */ } });
  };
}
