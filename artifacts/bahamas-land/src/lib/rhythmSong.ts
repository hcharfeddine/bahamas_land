// Per-level song planner for the Anthem rhythm game.
//
// Given a level number + total duration + bpm, this returns a SongPlan: a
// concrete list of bars, each bar tagged with its section type and assigned
// a chord (root frequency + power chord). The same level always produces
// the same song (PRNG seeded by level). Different levels produce different
// keys / progressions / lead phrases, and the song structure is sized to
// fill the entire level duration so it never just loops a 4-bar pattern.

import {
  type GenreTemplate,
  type SectionType,
  type LeadPhrase,
  getGenreForLevel,
} from "./rhythmTracks";

import { getComposedPhrase } from "./rhythmPhrases";

export type SongBar = {
  index: number;
  section: SectionType;
  isLastInSection: boolean;
  isFirstInSection: boolean;
  chord: number[]; // [root, fifth, octave] in Hz
  rootHz: number;
  hasLead: boolean;
};

export type SongPlan = {
  level: number;
  genre: GenreTemplate;
  songName: string;
  vibe: string;
  bpm: number;
  rootHz: number;
  bars: SongBar[];
  scale: number[];      // semitone offsets from root for lead notes
  leadPhrase: LeadPhrase;
};

// ---------------------------------------------------------------
// Tiny seeded PRNG (mulberry32) so a given level always sounds the same.
// ---------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------------------------------------------------------------
// Build a power chord from a root frequency.
// ---------------------------------------------------------------

function powerChord(rootHz: number): number[] {
  return [rootHz, rootHz * 1.498307, rootHz * 2];
}

// Apply a semitone offset (positive or negative) to a frequency.
function transpose(rootHz: number, semitones: number): number {
  return rootHz * Math.pow(2, semitones / 12);
}

// ---------------------------------------------------------------
// Procedural music generators — every level gets unique values.
// ---------------------------------------------------------------

// Generate a root frequency from a chromatic grid spanning the genre's
// register ± 5 semitones.  With ~15 possible semitone values this gives
// far more variety than the 4-key pool while staying in the genre's range.
function genRootHz(rng: () => number, genreKeys: number[]): number {
  const A0 = 27.5; // reference: A0
  const semis = genreKeys.map((hz) => Math.round(Math.log2(hz / A0) * 12));
  const lo = Math.min(...semis) - 3;
  const hi = Math.max(...semis) + 5;
  const chosen = lo + Math.floor(rng() * (hi - lo + 1));
  return A0 * Math.pow(2, chosen / 12);
}

// Extract all unique chord offset values from the genre's progression pool.
// These are the "valid" semitone offsets for this genre's harmonic language.
function extractVocab(pool: number[][]): number[] {
  const set = new Set<number>();
  pool.forEach((prog) => prog.forEach((o) => set.add(o)));
  return Array.from(set);
}

// Build a unique chord progression from the genre's vocabulary.
// Length varies between 3 and 6 chords for maximum variety.
function genProgression(rng: () => number, vocab: number[]): number[] {
  const len = 3 + Math.floor(rng() * 4); // 3..6 chords
  const prog: number[] = [0]; // root chord always first
  for (let i = 1; i < len; i++) {
    prog.push(vocab[Math.floor(rng() * vocab.length)]);
  }
  return prog;
}

// ---------------------------------------------------------------
// Section-type → chosen progression mapping.
// ---------------------------------------------------------------

function chordsForSectionType(
  type: SectionType,
  verseProg: number[],
  chorusProg: number[],
  bridgeProg: number[],
): number[] {
  switch (type) {
    case "intro":
    case "verse":
    case "outro":
      return verseProg;
    case "chorus":
      return chorusProg;
    case "bridge":
    case "breakdown":
      return bridgeProg;
  }
}

// ---------------------------------------------------------------
// Fit the song template to the available number of bars.
// ---------------------------------------------------------------

function fitTemplate(
  template: { type: SectionType; bars: number }[],
  totalBars: number,
): { type: SectionType; bars: number }[] {
  const baseSum = template.reduce((s, x) => s + x.bars, 0);
  if (baseSum <= 0) return [{ type: "verse", bars: totalBars }];

  // Scale section bar counts proportionally.
  const scale = totalBars / baseSum;
  const scaled = template.map((s) => ({
    type: s.type,
    bars: Math.max(1, Math.round(s.bars * scale)),
  }));

  // Trim or pad to hit totalBars exactly.
  let sum = scaled.reduce((s, x) => s + x.bars, 0);
  let i = scaled.length - 1;
  while (sum > totalBars && i >= 0) {
    if (scaled[i].bars > 1) {
      scaled[i].bars -= 1;
      sum -= 1;
    } else {
      i -= 1;
    }
  }
  while (sum < totalBars) {
    // Extend the longest section (usually a chorus) so the song really fills.
    let longest = 0;
    for (let j = 1; j < scaled.length; j++) {
      if (scaled[j].bars > scaled[longest].bars) longest = j;
    }
    scaled[longest].bars += 1;
    sum += 1;
  }
  return scaled;
}

// ---------------------------------------------------------------
// Public: plan a song for a given level.
// ---------------------------------------------------------------

export function getSongForLevel(
  level: number,
  bpm: number,
  durationMs: number,
): SongPlan {
  const genre = getGenreForLevel(level);
  const rng = mulberry32(level * 9301 + 49297);

  // Root key: pick from chromatic grid spanning genre's register ± 5 semitones.
  const rootHz = genRootHz(rng, genre.keys);

  // Song name: cycle through genre's curated names.
  const songName = genre.songNames[(level - 1) % genre.songNames.length];

  // Chord progressions: generate unique sequences from the genre's chord vocabulary.
  const vocab = extractVocab(genre.progressionPool);
  const verseProg = genProgression(rng, vocab);
  const chorusProg = genProgression(rng, vocab);
  const bridgeProg = genProgression(rng, vocab);

  // ── Lead melody: hand-composed iconic phrase per level group ──────────────
  // Verse (phraseRole 0), chorus (1), bridge (2) each get a different phrase.
  // getComposedPhrase maps level → one of 20 groups × 3 phrases = 60 melodies.
  const leadPhrase = getComposedPhrase(level, 0); // verse phrase by default

  const template = pick(rng, genre.songTemplates);

  // Compute total bars from duration & bpm.
  const beat = 60 / bpm;
  const barLen = beat * 4; // seconds
  const totalBars = Math.max(4, Math.floor(durationMs / 1000 / barLen));

  const sections = fitTemplate(template, totalBars);

  // Walk sections → bars, assigning chords from the right progression.
  const bars: SongBar[] = [];
  let barIdx = 0;
  sections.forEach((sec) => {
    const prog = chordsForSectionType(
      sec.type,
      verseProg,
      chorusProg,
      bridgeProg,
    );
    for (let b = 0; b < sec.bars; b++) {
      const chordOffset = prog[b % prog.length];
      const chordRoot = transpose(rootHz, chordOffset);
      bars.push({
        index: barIdx,
        section: sec.type,
        isFirstInSection: b === 0,
        isLastInSection: b === sec.bars - 1,
        chord: powerChord(chordRoot),
        rootHz: chordRoot,
        // Lead is active on all bars; planBar handles per-bar dynamics.
        hasLead: genre.hasLead,
      });
      barIdx += 1;
    }
  });

  return {
    level,
    genre,
    songName,
    vibe: genre.vibe,
    bpm,
    rootHz,
    bars,
    scale: genre.scale,
    leadPhrase,
  };
}