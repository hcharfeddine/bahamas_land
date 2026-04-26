// Track presets for the Anthem rhythm game.
//
// Each "track" is a sub-genre with its own chord progression, rhythm patterns
// (kick / snare / hi-hat / guitar chug), bass pattern, and tone. The rhythm
// game cycles tracks every 10 levels so the player hears a clearly different
// song as they climb the difficulty curve.
//
// Patterns are expressed as positions on a 16th-note grid (0..15) within a
// single 4/4 bar. Frequencies are in Hz.

export type TrackPreset = {
  id: string;
  name: string;
  vibe: string;
  // Bar-by-bar chord progression. Each chord is an array of frequencies
  // ([root, fifth, octave]).
  chords: number[][];
  // Power-chord stab positions on the 16th grid.
  chugPattern: number[];
  // Length of each chord stab as a multiple of one 16th note. ~0.5 = palm
  // mute, ~2 = let ring, ~7 = full bar sustain.
  chugTailMul: number;
  // Drum patterns on the 16th grid.
  kickPattern: number[];
  snarePattern: number[];
  hihatPattern: number[];
  // Bass note re-articulation positions on the 16th grid; sustains until the
  // next position (or end of bar).
  bassPattern: number[];
  // Sound shape
  drive: number;     // 0..1 → distortion intensity
  tone: number;      // lowpass cutoff Hz
  guitarGain: number;// 0..1 bus gain
  // Optional lead melody (square-wave arpeggio over the chord).
  leadEnabled?: boolean;
};

// Helper: build a power chord from a root in Hz (root, perfect 5th, octave).
function P(root: number): number[] {
  return [root, root * 1.498307, root * 2];
}

const ALL_16 = Array.from({ length: 16 }, (_, i) => i);
const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const QUARTERS = [0, 4, 8, 12];

export const TRACKS: TrackPreset[] = [
  // Tier 0 · levels 1–9
  {
    id: "bootcamp",
    name: "CITIZEN BOOTCAMP",
    vibe: "easy 4/4 rock · Em – C – G – D",
    chords: [P(82.41), P(65.41), P(98.0), P(73.42)],
    chugPattern: EIGHTHS,
    chugTailMul: 1.6,
    kickPattern: QUARTERS,
    snarePattern: [4, 12],
    hihatPattern: EIGHTHS,
    bassPattern: [0],
    drive: 0.35,
    tone: 2400,
    guitarGain: 0.5,
  },

  // Tier 1 · levels 10–19
  {
    id: "punk",
    name: "NATTOUN'S GARAGE",
    vibe: "garage punk · A – D – E – G · driving 8ths",
    chords: [P(110.0), P(146.83), P(82.41), P(98.0)],
    chugPattern: EIGHTHS,
    chugTailMul: 1.9,
    kickPattern: QUARTERS,
    snarePattern: [4, 12],
    hihatPattern: EIGHTHS,
    bassPattern: [0, 8],
    drive: 0.55,
    tone: 2900,
    guitarGain: 0.55,
  },

  // Tier 2 · levels 20–29
  {
    id: "blues",
    name: "DESERT HIGHWAY",
    vibe: "bluesy rock · E – A – B7 · shuffle feel",
    chords: [P(82.41), P(110.0), P(123.47), P(82.41)],
    chugPattern: [0, 3, 6, 8, 11, 14],
    chugTailMul: 2.2,
    kickPattern: [0, 6, 8, 14],
    snarePattern: [4, 12],
    hihatPattern: [0, 3, 4, 6, 8, 11, 12, 14],
    bassPattern: [0, 4, 8, 12],
    drive: 0.4,
    tone: 2600,
    guitarGain: 0.5,
  },

  // Tier 3 · levels 30–39
  {
    id: "stadium",
    name: "STADIUM ANTHEM",
    vibe: "big sustained power chords · G – D – Em – C",
    chords: [P(98.0), P(73.42), P(82.41), P(65.41)],
    chugPattern: [0, 8],
    chugTailMul: 7.5,
    kickPattern: QUARTERS,
    snarePattern: [4, 12],
    hihatPattern: EIGHTHS,
    bassPattern: [0, 8],
    drive: 0.55,
    tone: 3000,
    guitarGain: 0.6,
    leadEnabled: true,
  },

  // Tier 4 · levels 40–49
  {
    id: "thrash",
    name: "THRASH GALLOP",
    vibe: "palm-muted gallop · Em – D – C – Em",
    chords: [P(82.41), P(73.42), P(65.41), P(82.41)],
    chugPattern: [0, 3, 4, 7, 8, 11, 12, 15],
    chugTailMul: 0.7,
    kickPattern: [0, 3, 4, 7, 8, 11, 12, 15],
    snarePattern: [4, 12],
    hihatPattern: EIGHTHS,
    bassPattern: [0, 4, 8, 12],
    drive: 0.75,
    tone: 3200,
    guitarGain: 0.6,
  },

  // Tier 5 · levels 50–59
  {
    id: "doom",
    name: "DOOM TEMPLE",
    vibe: "doom · half-time · drop-tuned · Dm – B♭m – F – C",
    chords: [P(73.42), P(58.27), P(87.31), P(65.41)],
    chugPattern: [0, 8],
    chugTailMul: 7.0,
    kickPattern: [0, 8],
    snarePattern: [8],
    hihatPattern: QUARTERS,
    bassPattern: [0, 8],
    drive: 0.9,
    tone: 1800,
    guitarGain: 0.7,
  },

  // Tier 6 · levels 60–69
  {
    id: "synth",
    name: "SYNTH METAL",
    vibe: "industrial · 16th hi-hats · Em – Bm – G – A",
    chords: [P(82.41), P(61.74), P(98.0), P(110.0)],
    chugPattern: [0, 4, 8, 12],
    chugTailMul: 3.5,
    kickPattern: EIGHTHS,
    snarePattern: [4, 12],
    hihatPattern: ALL_16,
    bassPattern: [0, 4, 8, 12],
    drive: 0.7,
    tone: 3400,
    guitarGain: 0.55,
    leadEnabled: true,
  },

  // Tier 7 · levels 70–79
  {
    id: "power",
    name: "POWER METAL",
    vibe: "double kick · soaring lead · Em – C – G – D",
    chords: [P(82.41), P(65.41), P(98.0), P(73.42)],
    chugPattern: EIGHTHS,
    chugTailMul: 1.4,
    kickPattern: ALL_16,
    snarePattern: [4, 12],
    hihatPattern: EIGHTHS,
    bassPattern: [0, 4, 8, 12],
    drive: 0.8,
    tone: 3500,
    guitarGain: 0.6,
    leadEnabled: true,
  },

  // Tier 8 · levels 80–89
  {
    id: "black",
    name: "BLACK SKY",
    vibe: "tremolo picking · blast beats · minor harmony",
    chords: [P(82.41), P(77.78), P(98.0), P(87.31)],
    chugPattern: ALL_16,
    chugTailMul: 1.0,
    kickPattern: EIGHTHS,
    snarePattern: [1, 3, 5, 7, 9, 11, 13, 15],
    hihatPattern: QUARTERS,
    bassPattern: [0, 4, 8, 12],
    drive: 0.95,
    tone: 4000,
    guitarGain: 0.5,
  },

  // Tier 9 · levels 90–100
  {
    id: "finalboss",
    name: "FINAL BOSS — NATTOUN UNLEASHED",
    vibe: "🤘 maxed distortion · all 16ths · all kicks 🤘",
    chords: [P(82.41), P(65.41), P(73.42), P(98.0)],
    chugPattern: ALL_16,
    chugTailMul: 1.0,
    kickPattern: ALL_16,
    snarePattern: [2, 6, 10, 14],
    hihatPattern: ALL_16,
    bassPattern: EIGHTHS,
    drive: 1.0,
    tone: 4200,
    guitarGain: 0.55,
    leadEnabled: true,
  },
];

export function getTrackForLevel(level: number): TrackPreset {
  const tier = Math.min(TRACKS.length - 1, Math.floor((level - 1) / 10));
  return TRACKS[tier];
}
