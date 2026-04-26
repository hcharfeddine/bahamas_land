// Genre templates for the Anthem rhythm game.
//
// Each tier of 10 levels uses one genre template. The template defines the
// SOUND character (distortion / tone / drum patterns / chug patterns) for
// each *section type* (intro / verse / chorus / bridge / breakdown / outro)
// plus pools of chord progressions, lead phrases, song structures, and
// keys. The song planner (rhythmSong.ts) seeds a PRNG by level and draws
// from these pools so each of the 100 levels is a unique composition that
// sounds clearly different from its neighbours while staying inside the
// genre's identity.

export type SectionType =
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "breakdown"
  | "outro";

export type DrumPattern = {
  kick: number[];   // 16th positions
  snare: number[];
  hihat: number[];
};

// One-bar lead phrase. Each event = (16th position, scale-degree index,
// length in 16ths).
export type LeadEvent = { pos: number; deg: number; len: number };
export type LeadPhrase = LeadEvent[];

export type SectionSound = {
  drums: DrumPattern;
  chug: number[];      // 16th positions for guitar power-chord stabs
};

export type SongTemplate = { type: SectionType; bars: number }[];

export type GenreTemplate = {
  id: string;
  name: string;
  vibe: string;
  // 10 unique song titles, one per level inside this tier.
  songNames: string[];
  // Sound character
  drive: number;
  tone: number;
  guitarGain: number;
  chugTailMul: number;
  bassPattern: number[];
  // Per-section sounds
  intro: SectionSound;
  verse: SectionSound;
  chorus: SectionSound;
  bridge: SectionSound;
  breakdown: SectionSound;
  outro: SectionSound;
  // Drum fill played on the LAST bar of each section to mark the transition.
  fill: DrumPattern;
  // Chord progression pool. Each progression is an array of semitone offsets
  // from the song's root note, one entry per bar; the planner picks separate
  // progressions for verse / chorus / bridge.
  progressionPool: number[][];
  // Scale used for lead lines, expressed as semitone offsets from root.
  scale: number[];
  // Pool of one-bar lead phrases (scale-degree indices into `scale`).
  leadPhrases: LeadPhrase[];
  // Song structure templates. The planner picks one and scales bar counts to
  // fit the level's total duration.
  songTemplates: SongTemplate[];
  // Possible song keys (root frequency in Hz).
  keys: number[];
  hasLead: boolean;
  hasCrashOnChorus: boolean;
};

// Pattern shorthand ----------------------------------------------------------

const ALL_16 = Array.from({ length: 16 }, (_, i) => i);
const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const QUARTERS = [0, 4, 8, 12];
const SHUFFLE = [0, 3, 6, 8, 11, 14];
const GALLOP = [0, 3, 4, 7, 8, 11, 12, 15];
const SYNCO = [0, 3, 6, 10, 14];

// Useful scales (semitone offsets across two octaves)
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20];
const BLUES = [0, 3, 5, 6, 7, 10, 12, 15, 17, 18, 19];
const DORIAN = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21];

// Common minor-key chord-root offsets in semitones from root.
//   i = 0, II = +2, III = +3, iv = +5, v = +7, VI = +8, VII = +10
// (and minor-key relatives like ii° = +2, V (harmonic) = +7).

// =========================================================================

export const GENRES: GenreTemplate[] = [
  // ----- TIER 0 · levels 1-10 · CITIZEN BOOTCAMP --------------------------
  {
    id: "bootcamp",
    name: "CITIZEN BOOTCAMP",
    vibe: "easy 4/4 rock · for new recruits",
    songNames: [
      "Recruit's First Step",
      "Reveille at the Dog Statue",
      "Salute the Nose",
      "Citizen Drill",
      "Boot Stomp Boulevard",
      "Lieutenant Nattoun",
      "Marching to the Palace",
      "Roll Call",
      "Hut Hut Hooah",
      "Graduation Parade",
    ],
    drive: 0.35,
    tone: 2400,
    guitarGain: 0.5,
    chugTailMul: 1.6,
    bassPattern: [0, 8],
    intro:     { drums: { kick: QUARTERS, snare: [],         hihat: QUARTERS }, chug: [0, 8] },
    verse:     { drums: { kick: QUARTERS, snare: [4, 12],    hihat: EIGHTHS },  chug: EIGHTHS },
    chorus:    { drums: { kick: [0, 4, 6, 8, 12], snare: [4, 12], hihat: EIGHTHS }, chug: EIGHTHS },
    bridge:    { drums: { kick: [0, 8],   snare: [4, 12],    hihat: QUARTERS }, chug: [0, 8] },
    breakdown: { drums: { kick: QUARTERS, snare: [],         hihat: [] },       chug: [] },
    outro:     { drums: { kick: QUARTERS, snare: [4, 12],    hihat: EIGHTHS },  chug: [0, 8] },
    fill:      { kick: [0, 4, 6, 8, 10, 12, 14, 15], snare: [12, 14, 15], hihat: [0, 4] },
    progressionPool: [
      [0, -4, 3, -2],   // i  VI  III  VII (Em-C-G-D in E minor)
      [0, 5, -4, 7],    // i  iv  VI  v
      [0, -2, 3, 0],    // i  VII  III  i
      [0, 5, 0, 7],     // i  iv  i  v
    ],
    scale: NATURAL_MINOR,
    leadPhrases: [
      [{ pos: 0, deg: 0, len: 4 }, { pos: 4, deg: 2, len: 4 }, { pos: 8, deg: 4, len: 8 }],
      [{ pos: 0, deg: 4, len: 2 }, { pos: 2, deg: 3, len: 2 }, { pos: 4, deg: 2, len: 4 }, { pos: 12, deg: 0, len: 4 }],
      [{ pos: 0, deg: 2, len: 4 }, { pos: 6, deg: 4, len: 2 }, { pos: 10, deg: 5, len: 6 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 2 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 4 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 4 },
        { type: "outro", bars: 2 },
      ],
      [
        { type: "intro", bars: 2 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 4 },
        { type: "bridge", bars: 2 },
        { type: "chorus", bars: 4 },
        { type: "outro", bars: 2 },
      ],
    ],
    keys: [82.41 /* E2 */, 87.31 /* F2 */, 98.0 /* G2 */, 110.0 /* A2 */],
    hasLead: false,
    hasCrashOnChorus: true,
  },

  // ----- TIER 1 · levels 11-20 · NATTOUN'S GARAGE PUNK --------------------
  {
    id: "punk",
    name: "NATTOUN'S GARAGE",
    vibe: "garage punk · three chords · loud",
    songNames: [
      "Three Chord Treason",
      "Skate Park Curfew",
      "Lo-Fi Riot",
      "Garage Rats",
      "Mosh by the Sea",
      "Doc Martens for the Dog",
      "Anti-Citizen #1",
      "Cassette Tape Coup",
      "President in the Pit",
      "Last Punk in Bahamas Land",
    ],
    drive: 0.55,
    tone: 2900,
    guitarGain: 0.55,
    chugTailMul: 1.9,
    bassPattern: [0, 8],
    intro:     { drums: { kick: QUARTERS, snare: [4, 12],   hihat: EIGHTHS },  chug: EIGHTHS },
    verse:     { drums: { kick: QUARTERS, snare: [4, 12],   hihat: EIGHTHS },  chug: EIGHTHS },
    chorus:    { drums: { kick: [0, 2, 4, 8, 10, 12], snare: [4, 12], hihat: EIGHTHS }, chug: EIGHTHS },
    bridge:    { drums: { kick: [0, 8],   snare: [4, 12],   hihat: QUARTERS }, chug: [0, 4, 8, 12] },
    breakdown: { drums: { kick: [0, 4, 8, 12], snare: [],   hihat: [] },       chug: [] },
    outro:     { drums: { kick: QUARTERS, snare: [4, 12],   hihat: EIGHTHS },  chug: ALL_16 },
    fill:      { kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [10, 12, 14, 15], hihat: [] },
    progressionPool: [
      [0, 5, 7, 0],     // i iv v i
      [0, 5, -4, 7],    // i iv VI v
      [0, 7, 5, 0],     // i v iv i
      [0, -4, 5, 7],    // i VI iv v
    ],
    scale: NATURAL_MINOR,
    leadPhrases: [
      [{ pos: 0, deg: 0, len: 2 }, { pos: 2, deg: 2, len: 2 }, { pos: 4, deg: 4, len: 4 }, { pos: 8, deg: 7, len: 8 }],
      [{ pos: 0, deg: 4, len: 4 }, { pos: 4, deg: 7, len: 4 }, { pos: 8, deg: 4, len: 4 }, { pos: 12, deg: 2, len: 4 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 2 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 4 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 4 },
        { type: "bridge", bars: 2 },
        { type: "chorus", bars: 4 },
        { type: "outro", bars: 2 },
      ],
    ],
    keys: [82.41, 110.0, 146.83 /* D3 */, 130.81 /* C3 */],
    hasLead: false,
    hasCrashOnChorus: true,
  },

  // ----- TIER 2 · levels 21-30 · DESERT HIGHWAY (BLUES ROCK) --------------
  {
    id: "blues",
    name: "DESERT HIGHWAY",
    vibe: "bluesy rock · shuffle feel · sand on the strings",
    songNames: [
      "Sand in the Strings",
      "Tunis Truck Stop Blues",
      "12 Bars to Bahamas",
      "Highway Dust",
      "Lonely Dog at Dusk",
      "Whiskey by the Date Palm",
      "Slide Guitar Citizen",
      "Hammond at Sunset",
      "Caravan Coda",
      "Last Mile to the Palace",
    ],
    drive: 0.4,
    tone: 2600,
    guitarGain: 0.5,
    chugTailMul: 2.2,
    bassPattern: [0, 4, 8, 12],
    intro:     { drums: { kick: [0, 8],   snare: [],        hihat: SHUFFLE },  chug: [0, 8] },
    verse:     { drums: { kick: [0, 8, 14], snare: [4, 12], hihat: SHUFFLE },  chug: SHUFFLE },
    chorus:    { drums: { kick: [0, 6, 8, 14], snare: [4, 12], hihat: EIGHTHS }, chug: SHUFFLE },
    bridge:    { drums: { kick: [0, 8],   snare: [4, 12],   hihat: QUARTERS }, chug: [0, 6, 12] },
    breakdown: { drums: { kick: [0],      snare: [12],      hihat: SHUFFLE },  chug: [0] },
    outro:     { drums: { kick: [0, 8],   snare: [4, 12],   hihat: SHUFFLE },  chug: SHUFFLE },
    fill:      { kick: [0, 4, 8, 12, 14], snare: [10, 12, 14, 15], hihat: [0, 4] },
    progressionPool: [
      [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], // 12-bar blues in i, iv, v
      [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 0],
      [0, 0, 5, 0, 7, 5, 0, 7],              // shorter blues turnaround
    ],
    scale: BLUES,
    leadPhrases: [
      [{ pos: 0, deg: 3, len: 2 }, { pos: 2, deg: 4, len: 2 }, { pos: 4, deg: 5, len: 4 }, { pos: 10, deg: 4, len: 6 }],
      [{ pos: 0, deg: 5, len: 4 }, { pos: 6, deg: 4, len: 2 }, { pos: 8, deg: 3, len: 4 }, { pos: 12, deg: 2, len: 4 }],
      [{ pos: 0, deg: 0, len: 4 }, { pos: 6, deg: 3, len: 2 }, { pos: 10, deg: 5, len: 6 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 4 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [82.41, 110.0, 73.42 /* D2 */, 98.0],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 3 · levels 31-40 · STADIUM ANTHEM ---------------------------
  {
    id: "stadium",
    name: "STADIUM ANTHEM",
    vibe: "huge sustained chords · sing-along chorus",
    songNames: [
      "Hands Up, Bahamas",
      "Anthem of Ones",
      "Chorus of the Crowd",
      "Lift Off",
      "Lighters in the Dark",
      "Encore for the Dog",
      "Roar of 99°",
      "Banner Up High",
      "Oceans in the Stadium",
      "President's Encore",
    ],
    drive: 0.55,
    tone: 3000,
    guitarGain: 0.6,
    chugTailMul: 7.5,
    bassPattern: [0, 8],
    intro:     { drums: { kick: QUARTERS, snare: [12],     hihat: EIGHTHS },  chug: [0] },
    verse:     { drums: { kick: QUARTERS, snare: [4, 12],  hihat: EIGHTHS },  chug: [0, 8] },
    chorus:    { drums: { kick: [0, 4, 6, 8, 12], snare: [4, 12], hihat: EIGHTHS }, chug: [0, 8] },
    bridge:    { drums: { kick: [0, 8],   snare: [4, 12],  hihat: QUARTERS }, chug: [0] },
    breakdown: { drums: { kick: [0],      snare: [12],     hihat: QUARTERS }, chug: [] },
    outro:     { drums: { kick: QUARTERS, snare: [4, 12],  hihat: EIGHTHS },  chug: [0] },
    fill:      { kick: [0, 4, 8, 10, 12, 14], snare: [8, 10, 12, 14, 15], hihat: [0, 4] },
    progressionPool: [
      [-4, 3, 0, -2],   // VI III i VII (uplifting)
      [0, -2, -4, 3],   // i VII VI III
      [3, -2, 0, -4],   // III VII i VI
      [0, 5, -4, 7],
    ],
    scale: NATURAL_MINOR,
    leadPhrases: [
      [{ pos: 0, deg: 4, len: 4 }, { pos: 4, deg: 5, len: 4 }, { pos: 8, deg: 7, len: 8 }],
      [{ pos: 0, deg: 7, len: 2 }, { pos: 2, deg: 5, len: 2 }, { pos: 4, deg: 4, len: 4 }, { pos: 8, deg: 5, len: 8 }],
      [{ pos: 0, deg: 4, len: 2 }, { pos: 2, deg: 7, len: 2 }, { pos: 4, deg: 9, len: 4 }, { pos: 8, deg: 7, len: 8 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "bridge", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [98.0, 73.42, 87.31, 65.41],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 4 · levels 41-50 · THRASH GALLOP ----------------------------
  {
    id: "thrash",
    name: "THRASH GALLOP",
    vibe: "palm-muted gallop · stacked riffs",
    songNames: [
      "Concrete Boots",
      "Faddina's Wrath",
      "Steel Gallop",
      "Riff Brigade",
      "Mosh Pit Mayor",
      "Rage Across Tunis",
      "Distortion Doctrine",
      "Citizen of Steel",
      "Speed Limit Treason",
      "Shred or Be Shredded",
    ],
    drive: 0.75,
    tone: 3200,
    guitarGain: 0.6,
    chugTailMul: 0.7,
    bassPattern: [0, 4, 8, 12],
    intro:     { drums: { kick: [0, 4, 8, 12], snare: [],     hihat: EIGHTHS }, chug: GALLOP },
    verse:     { drums: { kick: GALLOP, snare: [4, 12],       hihat: EIGHTHS }, chug: GALLOP },
    chorus:    { drums: { kick: GALLOP, snare: [4, 12],       hihat: EIGHTHS }, chug: ALL_16 },
    bridge:    { drums: { kick: [0, 4, 8, 12], snare: [4, 12], hihat: QUARTERS }, chug: [0, 4, 8, 12] },
    breakdown: { drums: { kick: [0, 8], snare: [4, 12],       hihat: [] },       chug: [0, 8] },
    outro:     { drums: { kick: GALLOP, snare: [4, 12],       hihat: EIGHTHS }, chug: GALLOP },
    fill:      { kick: ALL_16, snare: [10, 12, 13, 14, 15], hihat: [0, 4] },
    progressionPool: [
      [0, -2, -4, 0],   // i VII VI i
      [0, 1, 0, -2],    // i bII i VII (phrygian)
      [0, 0, -2, -4],   // i i VII VI
      [0, 5, 0, -2],    // i iv i VII
    ],
    scale: PHRYGIAN,
    leadPhrases: [
      [{ pos: 0, deg: 0, len: 1 }, { pos: 1, deg: 1, len: 1 }, { pos: 2, deg: 3, len: 2 }, { pos: 4, deg: 5, len: 4 }, { pos: 8, deg: 7, len: 8 }],
      [{ pos: 0, deg: 7, len: 2 }, { pos: 4, deg: 5, len: 2 }, { pos: 8, deg: 3, len: 4 }, { pos: 14, deg: 1, len: 2 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "breakdown", bars: 4 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [82.41, 73.42, 65.41, 87.31],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 5 · levels 51-60 · DOOM TEMPLE ------------------------------
  {
    id: "doom",
    name: "DOOM TEMPLE",
    vibe: "doom · half-time · drop-tuned · slow bleed",
    songNames: [
      "Tombstone March",
      "Granite Lung",
      "Three Riffs to Hell",
      "Slow Bleed Cathedral",
      "The Dog at the Gate",
      "Citizens of Tar",
      "Ash Procession",
      "Black Sun over Tunis",
      "Funereal Decree",
      "Eternal Static",
    ],
    drive: 0.9,
    tone: 1800,
    guitarGain: 0.7,
    chugTailMul: 7.0,
    bassPattern: [0, 8],
    intro:     { drums: { kick: [0],     snare: [],     hihat: [0, 8] },  chug: [0] },
    verse:     { drums: { kick: [0, 8],  snare: [8],    hihat: QUARTERS }, chug: [0, 8] },
    chorus:    { drums: { kick: [0, 6, 8, 14], snare: [4, 12], hihat: QUARTERS }, chug: [0, 4, 8, 12] },
    bridge:    { drums: { kick: [0, 8],  snare: [8],    hihat: [0, 8] },  chug: [0] },
    breakdown: { drums: { kick: [0],     snare: [],     hihat: [] },      chug: [0] },
    outro:     { drums: { kick: [0, 8],  snare: [8],    hihat: QUARTERS }, chug: [0, 8] },
    fill:      { kick: [0, 4, 6, 8, 12, 14], snare: [12, 14, 15], hihat: [0] },
    progressionPool: [
      [0, -4, 5, 0],    // i VI iv i
      [0, 1, 5, 0],     // i bII iv i
      [0, -4, 0, 5],
      [0, 0, -4, 5],
    ],
    scale: PHRYGIAN,
    leadPhrases: [
      [{ pos: 0, deg: 0, len: 8 }, { pos: 8, deg: 3, len: 8 }],
      [{ pos: 0, deg: 5, len: 6 }, { pos: 6, deg: 3, len: 4 }, { pos: 12, deg: 1, len: 4 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 4 },
        { type: "breakdown", bars: 4 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [73.42, 61.74 /* B1 */, 65.41, 58.27 /* Bb1 */],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 6 · levels 61-70 · SYNTH METAL ------------------------------
  {
    id: "synth",
    name: "SYNTH METAL",
    vibe: "industrial · 16th hi-hats · arpeggiated leads",
    songNames: [
      "Neon Cathedral",
      "Circuit Goth",
      "808 Citizen",
      "Static Empire",
      "Wire & Iron",
      "Dataloss Dance",
      "Hex Ritual",
      "VHS Apocalypse",
      "Modem Wail",
      "Glitch in the Anthem",
    ],
    drive: 0.7,
    tone: 3400,
    guitarGain: 0.55,
    chugTailMul: 3.5,
    bassPattern: [0, 4, 8, 12],
    intro:     { drums: { kick: QUARTERS, snare: [],         hihat: ALL_16 }, chug: [0, 8] },
    verse:     { drums: { kick: EIGHTHS,  snare: [4, 12],    hihat: ALL_16 }, chug: [0, 4, 8, 12] },
    chorus:    { drums: { kick: ALL_16,   snare: [4, 12],    hihat: ALL_16 }, chug: [0, 4, 8, 12] },
    bridge:    { drums: { kick: SYNCO,    snare: [4, 12],    hihat: EIGHTHS }, chug: [0, 6, 10] },
    breakdown: { drums: { kick: [0, 8],   snare: [],         hihat: ALL_16 }, chug: [] },
    outro:     { drums: { kick: EIGHTHS,  snare: [4, 12],    hihat: ALL_16 }, chug: [0, 4, 8, 12] },
    fill:      { kick: ALL_16, snare: [12, 14, 15], hihat: ALL_16 },
    progressionPool: [
      [0, -2, 5, 7],    // i VII iv v
      [0, 5, -4, 3],    // i iv VI III
      [0, 1, 7, 5],
      [0, -4, -2, 0],
    ],
    scale: HARMONIC_MINOR,
    leadPhrases: [
      [{ pos: 0, deg: 0, len: 2 }, { pos: 2, deg: 2, len: 2 }, { pos: 4, deg: 5, len: 2 }, { pos: 6, deg: 4, len: 2 }, { pos: 8, deg: 7, len: 4 }, { pos: 12, deg: 5, len: 4 }],
      [{ pos: 0, deg: 7, len: 1 }, { pos: 2, deg: 4, len: 1 }, { pos: 4, deg: 5, len: 1 }, { pos: 6, deg: 7, len: 2 }, { pos: 8, deg: 9, len: 2 }, { pos: 12, deg: 7, len: 4 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "breakdown", bars: 4 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "bridge", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "outro", bars: 2 },
      ],
    ],
    keys: [82.41, 87.31, 110.0, 73.42],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 7 · levels 71-80 · POWER METAL ------------------------------
  {
    id: "power",
    name: "POWER METAL",
    vibe: "double kick · soaring lead · galloping anthem",
    songNames: [
      "Dragon Patrol",
      "Sky Castle Run",
      "Falsetto Flame",
      "Galloping Stars",
      "Sword of Bahamas",
      "Phoenix Decree",
      "Knights of Nattoun",
      "Iron Halo",
      "Chariot of Fire",
      "Eternal Crusade",
    ],
    drive: 0.8,
    tone: 3500,
    guitarGain: 0.6,
    chugTailMul: 1.4,
    bassPattern: [0, 4, 8, 12],
    intro:     { drums: { kick: [0, 4, 8, 12], snare: [],    hihat: EIGHTHS }, chug: EIGHTHS },
    verse:     { drums: { kick: ALL_16,  snare: [4, 12],     hihat: EIGHTHS }, chug: EIGHTHS },
    chorus:    { drums: { kick: ALL_16,  snare: [4, 12],     hihat: EIGHTHS }, chug: EIGHTHS },
    bridge:    { drums: { kick: [0, 4, 8, 12], snare: [4, 12], hihat: QUARTERS }, chug: [0, 4, 8, 12] },
    breakdown: { drums: { kick: [0, 4, 8, 12], snare: [4, 12], hihat: EIGHTHS }, chug: [] },
    outro:     { drums: { kick: ALL_16,  snare: [4, 12],     hihat: EIGHTHS }, chug: EIGHTHS },
    fill:      { kick: ALL_16, snare: [8, 10, 12, 13, 14, 15], hihat: [0, 4] },
    progressionPool: [
      [0, 5, -4, 7],    // i iv VI v
      [-4, 3, 0, -2],   // VI III i VII
      [0, -2, 5, -4],
      [0, 7, -4, 3],
    ],
    scale: HARMONIC_MINOR,
    leadPhrases: [
      [{ pos: 0, deg: 4, len: 1 }, { pos: 1, deg: 5, len: 1 }, { pos: 2, deg: 7, len: 2 }, { pos: 4, deg: 9, len: 2 }, { pos: 6, deg: 7, len: 2 }, { pos: 8, deg: 11, len: 4 }, { pos: 12, deg: 9, len: 4 }],
      [{ pos: 0, deg: 7, len: 2 }, { pos: 2, deg: 9, len: 2 }, { pos: 4, deg: 11, len: 4 }, { pos: 8, deg: 9, len: 2 }, { pos: 10, deg: 7, len: 2 }, { pos: 12, deg: 4, len: 4 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "verse", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "bridge", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [82.41, 87.31, 73.42, 65.41],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 8 · levels 81-90 · BLACK SKY --------------------------------
  {
    id: "black",
    name: "BLACK SKY",
    vibe: "tremolo picking · blast beats · cold harmony",
    songNames: [
      "Frostbitten Date Palm",
      "Cold Sea Witch",
      "Tremolo Eternal",
      "Horns Above Tunis",
      "Charcoal Throne",
      "Pale Citizen",
      "Moon over the Palace",
      "Iron Wind",
      "Black Sand Procession",
      "The Dog Howls Forever",
    ],
    drive: 0.95,
    tone: 4000,
    guitarGain: 0.5,
    chugTailMul: 1.0,
    bassPattern: [0, 4, 8, 12],
    intro:     { drums: { kick: [0, 4, 8, 12], snare: [],    hihat: QUARTERS }, chug: ALL_16 },
    verse:     { drums: { kick: EIGHTHS, snare: [1, 3, 5, 7, 9, 11, 13, 15], hihat: QUARTERS }, chug: ALL_16 },
    chorus:    { drums: { kick: ALL_16,  snare: [1, 3, 5, 7, 9, 11, 13, 15], hihat: QUARTERS }, chug: ALL_16 },
    bridge:    { drums: { kick: [0, 8],  snare: [4, 12],    hihat: QUARTERS }, chug: [0, 4, 8, 12] },
    breakdown: { drums: { kick: [0],     snare: [12],       hihat: [0, 8] },  chug: [0] },
    outro:     { drums: { kick: EIGHTHS, snare: [1, 5, 9, 13], hihat: QUARTERS }, chug: ALL_16 },
    fill:      { kick: ALL_16, snare: ALL_16, hihat: [0] },
    progressionPool: [
      [0, -4, 1, -2],   // i VI bII VII (cold)
      [0, 3, -4, 1],
      [0, -2, 1, 3],
      [0, 1, 3, -4],
    ],
    scale: PHRYGIAN,
    leadPhrases: [
      [{ pos: 0, deg: 7, len: 1 }, { pos: 1, deg: 5, len: 1 }, { pos: 2, deg: 3, len: 1 }, { pos: 3, deg: 5, len: 1 }, { pos: 4, deg: 7, len: 1 }, { pos: 5, deg: 9, len: 1 }, { pos: 6, deg: 11, len: 1 }, { pos: 7, deg: 9, len: 1 }, { pos: 8, deg: 7, len: 8 }],
      [{ pos: 0, deg: 3, len: 1 }, { pos: 1, deg: 5, len: 1 }, { pos: 2, deg: 7, len: 1 }, { pos: 3, deg: 5, len: 1 }, { pos: 4, deg: 7, len: 1 }, { pos: 5, deg: 9, len: 1 }, { pos: 6, deg: 7, len: 2 }, { pos: 8, deg: 11, len: 8 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "breakdown", bars: 2 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "bridge", bars: 4 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [82.41, 77.78 /* D#2 */, 87.31, 73.42],
    hasLead: true,
    hasCrashOnChorus: true,
  },

  // ----- TIER 9 · levels 91-100 · FINAL BOSS ------------------------------
  {
    id: "finalboss",
    name: "FINAL BOSS",
    vibe: "🤘 maxed distortion · all 16ths · all kicks 🤘",
    songNames: [
      "Nattoun, Final Form",
      "The Last Citizen",
      "Bahamas Burns",
      "Apocalypse Mode",
      "Endgame for the Dog",
      "Treason Symphony",
      "100% Treason",
      "The Crown Cracks",
      "President's Last Stream",
      "GAME OVER, MAN",
    ],
    drive: 1.0,
    tone: 4200,
    guitarGain: 0.55,
    chugTailMul: 1.0,
    bassPattern: EIGHTHS,
    intro:     { drums: { kick: ALL_16, snare: [],         hihat: ALL_16 }, chug: ALL_16 },
    verse:     { drums: { kick: ALL_16, snare: [4, 12],    hihat: ALL_16 }, chug: ALL_16 },
    chorus:    { drums: { kick: ALL_16, snare: [2, 6, 10, 14], hihat: ALL_16 }, chug: ALL_16 },
    bridge:    { drums: { kick: EIGHTHS, snare: [4, 12],   hihat: ALL_16 }, chug: [0, 4, 8, 12] },
    breakdown: { drums: { kick: [0, 8], snare: [4, 12],    hihat: [] },     chug: [0, 8] },
    outro:     { drums: { kick: ALL_16, snare: [2, 6, 10, 14], hihat: ALL_16 }, chug: ALL_16 },
    fill:      { kick: ALL_16, snare: ALL_16, hihat: ALL_16 },
    progressionPool: [
      [0, 1, -4, 0],    // i bII VI i (sinister)
      [0, -2, 1, 5],
      [0, 5, 1, -4],
      [0, 0, 1, -2],
    ],
    scale: HARMONIC_MINOR,
    leadPhrases: [
      [{ pos: 0, deg: 0, len: 1 }, { pos: 1, deg: 1, len: 1 }, { pos: 2, deg: 3, len: 1 }, { pos: 3, deg: 5, len: 1 }, { pos: 4, deg: 7, len: 1 }, { pos: 5, deg: 9, len: 1 }, { pos: 6, deg: 11, len: 1 }, { pos: 7, deg: 9, len: 1 }, { pos: 8, deg: 7, len: 4 }, { pos: 12, deg: 11, len: 4 }],
      [{ pos: 0, deg: 11, len: 2 }, { pos: 4, deg: 9, len: 2 }, { pos: 8, deg: 7, len: 2 }, { pos: 12, deg: 5, len: 4 }],
    ],
    songTemplates: [
      [
        { type: "intro", bars: 4 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "breakdown", bars: 2 },
        { type: "verse", bars: 8 },
        { type: "chorus", bars: 8 },
        { type: "bridge", bars: 4 },
        { type: "chorus", bars: 8 },
        { type: "outro", bars: 4 },
      ],
    ],
    keys: [82.41, 73.42, 87.31, 65.41],
    hasLead: true,
    hasCrashOnChorus: true,
  },
];

export function getGenreForLevel(level: number): GenreTemplate {
  const tier = Math.min(GENRES.length - 1, Math.floor((level - 1) / 10));
  return GENRES[tier];
}
