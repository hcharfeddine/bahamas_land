// Genre templates for the Anthem rhythm game.
// 20 tiers × 5 levels each = 100 levels total.
// Each tier has a completely unique musical identity: scale, drum pattern,
// chord language, and Tone.js synth profile.

export type SectionType =
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "breakdown"
  | "outro";

export type DrumPattern = {
  kick: number[];
  snare: number[];
  hihat: number[];
};

export type LeadEvent = { pos: number; deg: number; len: number };
export type LeadPhrase = LeadEvent[];

export type SectionSound = {
  drums: DrumPattern;
  chug: number[];
};

export type SongTemplate = { type: SectionType; bars: number }[];

export type SynthProfile = {
  chordOsc: OscillatorType;
  leadOsc: OscillatorType;
  bassOsc: OscillatorType;
  distortion: number;
  reverbDecay: number;
  useChorus: boolean;
  useBitCrush: boolean;
  bitCrushBits: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  kickDecay: number;
  kickOctaves: number;
  snareDecay: number;
  masterGain: number;
};

export type GenreTemplate = {
  id: string;
  name: string;
  vibe: string;
  songNames: string[];
  drive: number;
  tone: number;
  guitarGain: number;
  chugTailMul: number;
  bassPattern: number[];
  synthProfile: SynthProfile;
  intro: SectionSound;
  verse: SectionSound;
  chorus: SectionSound;
  bridge: SectionSound;
  breakdown: SectionSound;
  outro: SectionSound;
  fill: DrumPattern;
  progressionPool: number[][];
  scale: number[];
  leadPhrases: LeadPhrase[];
  songTemplates: SongTemplate[];
  keys: number[];
  hasLead: boolean;
  hasCrashOnChorus: boolean;
};

// ── Scales (semitone offsets, 2 octaves) ─────────────────────────────────────
const MAJOR_PENTA  = [0,2,4,7,9,12,14,16,19,21];
const MAJOR        = [0,2,4,5,7,9,11,12,14,16,17,19];
const NATURAL_MINOR= [0,2,3,5,7,8,10,12,14,15,17,19];
const DORIAN       = [0,2,3,5,7,9,10,12,14,15,17,19];
const HIJAZ        = [0,1,4,5,7,8,10,12,13,16,17,19];
const MIXOLYDIAN   = [0,2,4,5,7,9,10,12,14,16,17,19];
const PHRYGIAN_DOM = [0,1,4,5,7,8,10,12,13,16,17,19];
const PHRYGIAN     = [0,1,3,5,7,8,10,12,13,15,17,19];
const LYDIAN       = [0,2,4,6,7,9,11,12,14,16,18,19];
const HARMONIC_MINOR=[0,2,3,5,7,8,11,12,14,15,17,19];
const WHOLE_TONE   = [0,2,4,6,8,10,12,14,16,18,20,22];
const CHROMATIC    = [0,1,2,3,4,5,6,7,8,9,10,11,12];
const DIMINISHED   = [0,3,6,9,12,15,18,21];
const BLUES        = [0,3,5,6,7,10,12,15,17,18];

// ── Drum shorthand ────────────────────────────────────────────────────────────
const ALL16   = Array.from({length:16},(_,i)=>i);
const EIGHTHS = [0,2,4,6,8,10,12,14];
const QUARTERS= [0,4,8,12];
const GALLOP  = [0,3,4,7,8,11,12,15];
const SHUFFLE = [0,3,6,8,11,14];
const FUNK16  = [0,1,3,5,8,9,11,13];
const BLAST   = [1,3,5,7,9,11,13,15];
const MILITARY= [0,1,2,3,5,6,9,10,11,13];
const GLITCH  = [0,2,5,9,11,14];
const CHAOS_K = [0,5,7,13];
const CHAOS_S = [3,9,14];
const CHAOS_H = [0,2,5,9,11,14];
const TRESILLO= [0,3,7,10];

// ── Chord progression shorthand ───────────────────────────────────────────────
// Semitone offsets from root. i=0, VII=10, VI=8, III=3, iv=5, v=7, bII=1
const PROGS_MAJOR       = [[0,7,9,5],[0,5,7,0],[0,9,5,7],[4,7,9,5]];
const PROGS_MINOR       = [[0,8,3,10],[0,5,8,7],[0,10,3,0],[0,5,7,0]];
const PROGS_ARABIC      = [[0,1,0,7],[0,5,1,0],[0,1,5,7],[0,7,1,5]];
const PROGS_MIXO        = [[0,7,5,10],[0,5,10,7],[0,10,7,5],[0,5,0,10]];
const PROGS_PHRYGIAN_D  = [[0,1,0,7],[0,1,5,0],[0,5,1,7],[0,7,1,0]];
const PROGS_DOOM        = [[0,8,5,0],[0,1,5,0],[0,8,1,0],[0,5,8,0]];
const PROGS_PHRYGIAN    = [[0,1,0,10],[0,3,8,0],[0,1,3,0],[0,10,1,0]];
const PROGS_LYDIAN      = [[0,2,7,9],[0,9,2,7],[0,7,9,2],[0,2,9,7]];
const PROGS_HARM_MINOR  = [[0,5,7,0],[0,5,8,7],[0,8,5,7],[0,7,8,5]];
const PROGS_WHOLETONE   = [[0,2,4,6],[0,4,8,2],[0,6,4,2],[0,4,2,8]];
const PROGS_CHROMATIC   = [[0,1,2,1],[0,11,10,9],[0,2,1,0],[0,10,11,0]];
const PROGS_DIMINISHED  = [[0,3,6,9],[0,9,6,3],[0,3,9,6],[0,6,3,9]];
const PROGS_DRAMA       = [[0,8,5,7],[0,5,7,8],[0,7,8,5],[0,8,7,5]];

// ── Song structure templates ──────────────────────────────────────────────────
// THROUGH_STRUCT: intro → complete through-composed melody → outro.
// No repeating verse/chorus cycles. The "verse" section carries the full
// melodic journey (8 sequential phrases, each bar plays the next one).
const THROUGH_STRUCT: SongTemplate[] = [[
  {type:"intro",bars:4},{type:"verse",bars:24},{type:"outro",bars:4},
]];
// Keep legacy names pointing to the same through-composed structure.
const SIMPLE_STRUCT   = THROUGH_STRUCT;
const STANDARD_STRUCT = THROUGH_STRUCT;
const EPIC_STRUCT     = THROUGH_STRUCT;
const BALLAD_STRUCT   = THROUGH_STRUCT;

// ── Default synth profiles per archetype ─────────────────────────────────────
const PROF_BELL: SynthProfile = {
  chordOsc:'triangle',leadOsc:'sine',bassOsc:'sine',
  distortion:0,reverbDecay:2.5,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.3,sustain:0.1,release:0.5,
  kickDecay:0.04,kickOctaves:5,snareDecay:0.07,masterGain:0.42,
};
const PROF_ROCK: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'sawtooth',bassOsc:'triangle',
  distortion:0.45,reverbDecay:0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.005,decay:0.1,sustain:0.5,release:0.3,
  kickDecay:0.12,kickOctaves:8,snareDecay:0.14,masterGain:0.48,
};
const PROF_FUNK: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'square',bassOsc:'sawtooth',
  distortion:0.2,reverbDecay:0,useChorus:true,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.08,sustain:0.4,release:0.2,
  kickDecay:0.08,kickOctaves:7,snareDecay:0.1,masterGain:0.46,
};
const PROF_ARABIC: SynthProfile = {
  chordOsc:'triangle',leadOsc:'triangle',bassOsc:'triangle',
  distortion:0.15,reverbDecay:1.0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.05,decay:0.2,sustain:0.6,release:0.4,
  kickDecay:0.06,kickOctaves:6,snareDecay:0.09,masterGain:0.44,
};
const PROF_BRASS: SynthProfile = {
  chordOsc:'square',leadOsc:'square',bassOsc:'square',
  distortion:0.1,reverbDecay:1.5,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.02,decay:0.1,sustain:0.7,release:0.4,
  kickDecay:0.1,kickOctaves:7,snareDecay:0.18,masterGain:0.5,
};
const PROF_DANGER: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'sawtooth',bassOsc:'triangle',
  distortion:0.6,reverbDecay:0.5,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.005,decay:0.1,sustain:0.6,release:0.4,
  kickDecay:0.14,kickOctaves:9,snareDecay:0.15,masterGain:0.5,
};
const PROF_DOOM: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'triangle',bassOsc:'sine',
  distortion:0.7,reverbDecay:0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.02,decay:0.3,sustain:0.7,release:0.5,
  kickDecay:0.22,kickOctaves:10,snareDecay:0.18,masterGain:0.52,
};
const PROF_RAGE: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'sawtooth',bassOsc:'sawtooth',
  distortion:0.85,reverbDecay:0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.05,sustain:0.7,release:0.15,
  kickDecay:0.1,kickOctaves:10,snareDecay:0.12,masterGain:0.52,
};
const PROF_TEMPLE: SynthProfile = {
  chordOsc:'triangle',leadOsc:'sine',bassOsc:'sine',
  distortion:0,reverbDecay:3.0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.4,sustain:0.05,release:0.6,
  kickDecay:0.07,kickOctaves:6,snareDecay:0.1,masterGain:0.42,
};
const PROF_ORCHESTRAL: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'square',bassOsc:'triangle',
  distortion:0.3,reverbDecay:2.0,useChorus:true,useBitCrush:false,bitCrushBits:16,
  attack:0.01,decay:0.15,sustain:0.6,release:0.5,
  kickDecay:0.15,kickOctaves:9,snareDecay:0.16,masterGain:0.5,
};
const PROF_CYBER: SynthProfile = {
  chordOsc:'square',leadOsc:'sawtooth',bassOsc:'square',
  distortion:0.5,reverbDecay:0,useChorus:false,useBitCrush:true,bitCrushBits:8,
  attack:0.001,decay:0.08,sustain:0.6,release:0.2,
  kickDecay:0.09,kickOctaves:8,snareDecay:0.1,masterGain:0.48,
};
const PROF_MYSTERY: SynthProfile = {
  chordOsc:'sine',leadOsc:'triangle',bassOsc:'sine',
  distortion:0.1,reverbDecay:3.5,useChorus:true,useBitCrush:false,bitCrushBits:16,
  attack:0.1,decay:0.3,sustain:0.5,release:0.8,
  kickDecay:0.1,kickOctaves:5,snareDecay:0.12,masterGain:0.4,
};
const PROF_BLAST: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'sawtooth',bassOsc:'sawtooth',
  distortion:0.95,reverbDecay:0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.04,sustain:0.8,release:0.1,
  kickDecay:0.08,kickOctaves:10,snareDecay:0.09,masterGain:0.54,
};
const PROF_PIANO: SynthProfile = {
  chordOsc:'triangle',leadOsc:'triangle',bassOsc:'sine',
  distortion:0,reverbDecay:1.8,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.5,sustain:0.0,release:1.0,
  kickDecay:0.04,kickOctaves:4,snareDecay:0.06,masterGain:0.38,
};
const PROF_MILITARY: SynthProfile = {
  chordOsc:'square',leadOsc:'square',bassOsc:'square',
  distortion:0.2,reverbDecay:1.0,useChorus:false,useBitCrush:false,bitCrushBits:16,
  attack:0.01,decay:0.1,sustain:0.6,release:0.3,
  kickDecay:0.12,kickOctaves:7,snareDecay:0.22,masterGain:0.5,
};
const PROF_CHAOS: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'sawtooth',bassOsc:'square',
  distortion:0.8,reverbDecay:0.5,useChorus:false,useBitCrush:true,bitCrushBits:5,
  attack:0.001,decay:0.06,sustain:0.7,release:0.2,
  kickDecay:0.1,kickOctaves:9,snareDecay:0.11,masterGain:0.5,
};
const PROF_CHOIR: SynthProfile = {
  chordOsc:'triangle',leadOsc:'sine',bassOsc:'triangle',
  distortion:0.05,reverbDecay:4.0,useChorus:true,useBitCrush:false,bitCrushBits:16,
  attack:0.08,decay:0.2,sustain:0.7,release:1.0,
  kickDecay:0.15,kickOctaves:8,snareDecay:0.2,masterGain:0.48,
};
const PROF_GLITCH: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'square',bassOsc:'sawtooth',
  distortion:0.9,reverbDecay:0,useChorus:false,useBitCrush:true,bitCrushBits:4,
  attack:0.001,decay:0.05,sustain:0.8,release:0.1,
  kickDecay:0.08,kickOctaves:10,snareDecay:0.08,masterGain:0.52,
};
const PROF_DRAMA: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'triangle',bassOsc:'triangle',
  distortion:0.55,reverbDecay:2.5,useChorus:true,useBitCrush:false,bitCrushBits:16,
  attack:0.02,decay:0.2,sustain:0.6,release:0.6,
  kickDecay:0.16,kickOctaves:10,snareDecay:0.18,masterGain:0.52,
};
const PROF_MAX: SynthProfile = {
  chordOsc:'sawtooth',leadOsc:'sawtooth',bassOsc:'sawtooth',
  distortion:1.0,reverbDecay:1.5,useChorus:true,useBitCrush:false,bitCrushBits:16,
  attack:0.001,decay:0.08,sustain:0.8,release:0.3,
  kickDecay:0.1,kickOctaves:10,snareDecay:0.1,masterGain:0.55,
};

// =============================================================================
// 20 GENRE TIERS
// =============================================================================

export const GENRES: GenreTemplate[] = [

  // ── TIER 0 · Levels 1-5 · POKEMON TOWN ─────────────────────────────────────
  {
    id: "pokemon",
    name: "POKEMON TOWN",
    vibe: "cheerful · major pentatonic · bright bells",
    songNames: [
      "Pallet Town Patriot",
      "Rival Encounter",
      "Salute the Nose",
      "The Elite Four",
      "Champion's Theme",
    ],
    drive: 0.1, tone: 3000, guitarGain: 0.3, chugTailMul: 3.0,
    bassPattern: [0, 8],
    synthProfile: PROF_BELL,
    intro:     { drums:{kick:[0,8],snare:[],hihat:QUARTERS},   chug:[0,8] },
    verse:     { drums:{kick:QUARTERS,snare:[4,12],hihat:EIGHTHS}, chug:[0,8] },
    chorus:    { drums:{kick:[0,4,8,12],snare:[4,12],hihat:EIGHTHS}, chug:EIGHTHS },
    bridge:    { drums:{kick:[0,8],snare:[4,12],hihat:QUARTERS},  chug:[0,8] },
    breakdown: { drums:{kick:[0,8],snare:[],hihat:[]},           chug:[] },
    outro:     { drums:{kick:QUARTERS,snare:[4,12],hihat:EIGHTHS}, chug:[0,8] },
    fill:      { kick:[0,4,6,8,10,12,14],snare:[12,14,15],hihat:[0,4] },
    progressionPool: PROGS_MAJOR,
    scale: MAJOR_PENTA,
    leadPhrases: [
      [{pos:0,deg:2,len:4},{pos:4,deg:4,len:4},{pos:8,deg:6,len:8}],
      [{pos:0,deg:0,len:2},{pos:2,deg:2,len:2},{pos:4,deg:4,len:4},{pos:8,deg:6,len:8}],
    ],
    songTemplates: SIMPLE_STRUCT,
    keys: [130.81,146.83,164.81,174.61],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 1 · Levels 6-10 · ROCK RISING ──────────────────────────────────────
  {
    id: "rock",
    name: "ROCK RISING",
    vibe: "classic rock · power chords · 8th hihat",
    songNames: [
      "Amp Check",
      "First Power Chord",
      "Opening Riff",
      "Crowd Assembles",
      "Static Rising",
    ],
    drive: 0.45, tone: 2800, guitarGain: 0.5, chugTailMul: 1.8,
    bassPattern: [0, 8],
    synthProfile: PROF_ROCK,
    intro:     { drums:{kick:QUARTERS,snare:[],hihat:QUARTERS},     chug:[0,8] },
    verse:     { drums:{kick:[0,6,8],snare:[4,12],hihat:EIGHTHS},   chug:EIGHTHS },
    chorus:    { drums:{kick:[0,4,6,8,12],snare:[4,12],hihat:EIGHTHS}, chug:EIGHTHS },
    bridge:    { drums:{kick:[0,8],snare:[4,12],hihat:QUARTERS},    chug:[0,4,8,12] },
    breakdown: { drums:{kick:QUARTERS,snare:[],hihat:[]},           chug:[] },
    outro:     { drums:{kick:QUARTERS,snare:[4,12],hihat:EIGHTHS},  chug:[0,8] },
    fill:      { kick:[0,4,6,8,10,12,14,15],snare:[12,14,15],hihat:[0,4] },
    progressionPool: PROGS_MINOR,
    scale: NATURAL_MINOR,
    leadPhrases: [
      [{pos:0,deg:0,len:4},{pos:4,deg:2,len:4},{pos:8,deg:4,len:8}],
      [{pos:0,deg:4,len:2},{pos:2,deg:3,len:2},{pos:4,deg:2,len:4},{pos:12,deg:0,len:4}],
    ],
    songTemplates: SIMPLE_STRUCT,
    keys: [82.41,87.31,98.0,110.0],
    hasLead: false, hasCrashOnChorus: true,
  },

  // ── TIER 2 · Levels 11-15 · THE DOG TAKES OVER ──────────────────────────────
  {
    id: "funky",
    name: "THE DOG TAKES OVER",
    vibe: "funky · dorian · syncopated 16ths · chorus bass",
    songNames: [
      "Wag & Groove",
      "Bassline of the Dog",
      "Funk the Citizen",
      "Collar Jam",
      "Paw Percussion",
    ],
    drive: 0.25, tone: 2900, guitarGain: 0.45, chugTailMul: 0.8,
    bassPattern: [0,3,8,11],
    synthProfile: PROF_FUNK,
    intro:     { drums:{kick:[0,8],snare:[4,12],hihat:EIGHTHS},    chug:[0,8] },
    verse:     { drums:{kick:[0,3,8,11],snare:[4,12],hihat:FUNK16}, chug:[0,3,8,11] },
    chorus:    { drums:{kick:[0,3,6,8,11,14],snare:[4,12],hihat:FUNK16}, chug:[0,3,8] },
    bridge:    { drums:{kick:[0,8],snare:[4,12],hihat:EIGHTHS},    chug:[0,8] },
    breakdown: { drums:{kick:[0,8],snare:[],hihat:EIGHTHS},        chug:[0,8] },
    outro:     { drums:{kick:[0,3,8],snare:[4,12],hihat:FUNK16},   chug:[0,3,8] },
    fill:      { kick:[0,3,4,8,11,12,15],snare:[10,12,14,15],hihat:[] },
    progressionPool: PROGS_MINOR.map(p=>[...p]),
    scale: DORIAN,
    leadPhrases: [
      [{pos:0,deg:1,len:2},{pos:2,deg:3,len:2},{pos:4,deg:5,len:4},{pos:10,deg:4,len:6}],
      [{pos:0,deg:5,len:4},{pos:6,deg:4,len:2},{pos:8,deg:3,len:4},{pos:12,deg:2,len:4}],
    ],
    songTemplates: STANDARD_STRUCT,
    keys: [82.41,110.0,73.42,98.0],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 3 · Levels 16-20 · DESERT HEAT ─────────────────────────────────────
  {
    id: "desert",
    name: "DESERT HEAT",
    vibe: "hijaz scale · darbouka rhythm · arabic fire",
    songNames: [
      "Maqam of Bahamas",
      "Sand & Oud",
      "The Hijaz Riff",
      "Desert Stomp",
      "Mirage March",
    ],
    drive: 0.2, tone: 2600, guitarGain: 0.42, chugTailMul: 2.5,
    bassPattern: [0,5,8,13],
    synthProfile: PROF_ARABIC,
    intro:     { drums:{kick:[0,3,8],snare:[],hihat:[0,8]},        chug:[0,8] },
    verse:     { drums:{kick:[0,3,8],snare:[5,13],hihat:TRESILLO}, chug:[0,3,8] },
    chorus:    { drums:{kick:[0,3,6,8,11],snare:[5,13],hihat:TRESILLO}, chug:[0,3,8,11] },
    bridge:    { drums:{kick:[0,8],snare:[5],hihat:[0,8]},         chug:[0,8] },
    breakdown: { drums:{kick:[0],snare:[],hihat:[0]},              chug:[0] },
    outro:     { drums:{kick:[0,3,8],snare:[5,13],hihat:TRESILLO}, chug:[0,8] },
    fill:      { kick:[0,3,4,8,11,12],snare:[10,12,14],hihat:[0,4] },
    progressionPool: PROGS_ARABIC,
    scale: HIJAZ,
    leadPhrases: [
      [{pos:0,deg:1,len:3},{pos:3,deg:3,len:3},{pos:6,deg:4,len:4},{pos:10,deg:3,len:6}],
      [{pos:0,deg:4,len:4},{pos:6,deg:3,len:2},{pos:8,deg:1,len:4},{pos:12,deg:0,len:4}],
    ],
    songTemplates: STANDARD_STRUCT,
    keys: [110.0,98.0,82.41,73.42],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 4 · Levels 21-25 · KINGDOM MARCH ───────────────────────────────────
  {
    id: "march",
    name: "KINGDOM MARCH",
    vibe: "mixolydian · brass triumphant · FF boss vibes",
    songNames: [
      "Knights of the Nose",
      "Royal Fanfare",
      "Chocobo Crown",
      "March of Citizens",
      "Final Fantasy Decree",
    ],
    drive: 0.15, tone: 3500, guitarGain: 0.55, chugTailMul: 3.5,
    bassPattern: [0,4,8,12],
    synthProfile: PROF_BRASS,
    intro:     { drums:{kick:QUARTERS,snare:[],hihat:QUARTERS},    chug:[0,4,8,12] },
    verse:     { drums:{kick:QUARTERS,snare:[4,12],hihat:EIGHTHS}, chug:[0,8] },
    chorus:    { drums:{kick:[0,4,8,12],snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    bridge:    { drums:{kick:[0,8],snare:[2,4,6,10,12,14],hihat:[]}, chug:[0,8] },
    breakdown: { drums:{kick:[0,4,8,12],snare:[2,6,10,14],hihat:[]}, chug:[] },
    outro:     { drums:{kick:QUARTERS,snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    fill:      { kick:[0,4,8,10,12,14],snare:[8,10,12,14,15],hihat:[0,4] },
    progressionPool: PROGS_MIXO,
    scale: MIXOLYDIAN,
    leadPhrases: [
      [{pos:0,deg:4,len:4},{pos:4,deg:5,len:4},{pos:8,deg:6,len:8}],
      [{pos:0,deg:6,len:2},{pos:2,deg:5,len:2},{pos:4,deg:4,len:4},{pos:8,deg:6,len:8}],
      [{pos:0,deg:2,len:2},{pos:4,deg:4,len:4},{pos:8,deg:6,len:2},{pos:10,deg:5,len:6}],
    ],
    songTemplates: STANDARD_STRUCT,
    keys: [98.0,87.31,73.42,65.41],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 5 · Levels 26-30 · DANGER ZONE ─────────────────────────────────────
  {
    id: "danger",
    name: "DANGER ZONE",
    vibe: "phrygian dominant · minor key tense · cinematic suspense",
    songNames: [
      "Hot Pursuit",
      "Wanted Poster",
      "Suspect in Minor",
      "Tension Wire",
      "Code Red",
    ],
    drive: 0.6, tone: 3000, guitarGain: 0.55, chugTailMul: 1.4,
    bassPattern: [0,10],
    synthProfile: PROF_DANGER,
    intro:     { drums:{kick:[0,10],snare:[8],hihat:EIGHTHS},       chug:[0,10] },
    verse:     { drums:{kick:[0,6,10],snare:[8],hihat:EIGHTHS},     chug:[0,10] },
    chorus:    { drums:{kick:[0,4,8,10,14],snare:[8],hihat:EIGHTHS}, chug:[0,4,8,10] },
    bridge:    { drums:{kick:[0,10],snare:[4,12],hihat:QUARTERS},   chug:[0,8] },
    breakdown: { drums:{kick:[0],snare:[8],hihat:EIGHTHS},          chug:[] },
    outro:     { drums:{kick:[0,10],snare:[8],hihat:EIGHTHS},       chug:[0,10] },
    fill:      { kick:[0,4,6,8,10,12,14],snare:[12,14,15],hihat:[0,4] },
    progressionPool: PROGS_PHRYGIAN_D,
    scale: PHRYGIAN_DOM,
    leadPhrases: [
      [{pos:0,deg:1,len:2},{pos:2,deg:3,len:4},{pos:6,deg:4,len:2},{pos:8,deg:3,len:8}],
      [{pos:0,deg:4,len:4},{pos:4,deg:3,len:2},{pos:6,deg:1,len:2},{pos:8,deg:4,len:8}],
    ],
    songTemplates: STANDARD_STRUCT,
    keys: [82.41,73.42,87.31,65.41],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 6 · Levels 31-35 · THE UNDERGROUND ─────────────────────────────────
  {
    id: "underground",
    name: "THE UNDERGROUND",
    vibe: "half-time sludge · sub bass · dark groove",
    songNames: [
      "Sub-Bass Citizens",
      "Basement Manifesto",
      "Deep State Groove",
      "Low Frequency Law",
      "Underground Parliament",
    ],
    drive: 0.7, tone: 1800, guitarGain: 0.65, chugTailMul: 6.0,
    bassPattern: [0,6],
    synthProfile: PROF_DOOM,
    intro:     { drums:{kick:[0],snare:[],hihat:[0,8]},            chug:[0] },
    verse:     { drums:{kick:[0,6,14],snare:[8],hihat:QUARTERS},   chug:[0,6] },
    chorus:    { drums:{kick:[0,6,8,14],snare:[4,12],hihat:QUARTERS}, chug:[0,8] },
    bridge:    { drums:{kick:[0,8],snare:[8],hihat:[0,8]},         chug:[0] },
    breakdown: { drums:{kick:[0],snare:[],hihat:[]},               chug:[0] },
    outro:     { drums:{kick:[0,6,14],snare:[8],hihat:QUARTERS},   chug:[0,6] },
    fill:      { kick:[0,4,6,8,12,14],snare:[12,14,15],hihat:[0] },
    progressionPool: PROGS_DOOM,
    scale: NATURAL_MINOR,
    leadPhrases: [
      [{pos:0,deg:0,len:8},{pos:8,deg:3,len:8}],
      [{pos:0,deg:5,len:6},{pos:6,deg:3,len:4},{pos:12,deg:1,len:4}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [73.42,61.74,65.41,58.27],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 7 · Levels 36-40 · NATTOUN'S RAGE ──────────────────────────────────
  {
    id: "rage",
    name: "NATTOUN'S RAGE",
    vibe: "phrygian · d-beat gallop · max aggression",
    songNames: [
      "Nattoun Smashes",
      "Fury of the Nose",
      "Presidential Meltdown",
      "Rage Protocol",
      "Full Explosion",
    ],
    drive: 0.9, tone: 3200, guitarGain: 0.62, chugTailMul: 0.65,
    bassPattern: [0,4,8,12],
    synthProfile: PROF_RAGE,
    intro:     { drums:{kick:QUARTERS,snare:[],hihat:EIGHTHS},       chug:GALLOP },
    verse:     { drums:{kick:GALLOP,snare:[4,12],hihat:EIGHTHS},     chug:GALLOP },
    chorus:    { drums:{kick:GALLOP,snare:[4,12],hihat:EIGHTHS},     chug:ALL16 },
    bridge:    { drums:{kick:[0,4,8,12],snare:[4,12],hihat:QUARTERS}, chug:[0,4,8,12] },
    breakdown: { drums:{kick:[0,8],snare:[4,12],hihat:[]},           chug:[0,8] },
    outro:     { drums:{kick:GALLOP,snare:[4,12],hihat:EIGHTHS},     chug:GALLOP },
    fill:      { kick:ALL16,snare:[10,12,13,14,15],hihat:[0,4] },
    progressionPool: PROGS_PHRYGIAN,
    scale: PHRYGIAN,
    leadPhrases: [
      [{pos:0,deg:0,len:1},{pos:1,deg:1,len:1},{pos:2,deg:3,len:2},{pos:4,deg:5,len:4},{pos:8,deg:7,len:8}],
      [{pos:0,deg:7,len:2},{pos:4,deg:5,len:2},{pos:8,deg:3,len:4},{pos:14,deg:1,len:2}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,73.42,65.41,87.31],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 8 · Levels 41-45 · ANCIENT TEMPLE ──────────────────────────────────
  {
    id: "temple",
    name: "ANCIENT TEMPLE",
    vibe: "lydian · zelda dungeon · bell reverb · tribal",
    songNames: [
      "Stone Keys",
      "Temple Guardian",
      "Dungeon Wisdom",
      "Lost Chamber",
      "Sacred Riff",
    ],
    drive: 0.05, tone: 5000, guitarGain: 0.35, chugTailMul: 4.0,
    bassPattern: [0,6,10],
    synthProfile: PROF_TEMPLE,
    intro:     { drums:{kick:[0,6,10],snare:[],hihat:[0,8]},        chug:[0,8] },
    verse:     { drums:{kick:[0,6,10],snare:[3,11],hihat:QUARTERS}, chug:[0,6,10] },
    chorus:    { drums:{kick:[0,4,6,10,12],snare:[3,11],hihat:QUARTERS}, chug:[0,6,10] },
    bridge:    { drums:{kick:[0,10],snare:[6],hihat:[0,8]},         chug:[0,10] },
    breakdown: { drums:{kick:[0],snare:[],hihat:[0,8]},             chug:[0] },
    outro:     { drums:{kick:[0,6,10],snare:[3,11],hihat:QUARTERS}, chug:[0,10] },
    fill:      { kick:[0,4,6,10,12,14],snare:[12,14,15],hihat:[0,8] },
    progressionPool: PROGS_LYDIAN,
    scale: LYDIAN,
    leadPhrases: [
      [{pos:0,deg:3,len:4},{pos:4,deg:5,len:4},{pos:8,deg:6,len:8}],
      [{pos:0,deg:6,len:2},{pos:2,deg:5,len:2},{pos:4,deg:3,len:4},{pos:8,deg:6,len:8}],
      [{pos:0,deg:1,len:3},{pos:3,deg:3,len:3},{pos:6,deg:5,len:2},{pos:8,deg:6,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [98.0,87.31,82.41,73.42],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 9 · Levels 46-50 · HALFWAY BOSS ────────────────────────────────────
  {
    id: "boss",
    name: "HALFWAY BOSS",
    vibe: "harmonic minor · full orchestral · double kick · epic hit",
    songNames: [
      "Colossus Awakens",
      "Boss Theme Alpha",
      "The Halfway Mark",
      "Orchestral Mayhem",
      "All Instruments Fire",
    ],
    drive: 0.55, tone: 3600, guitarGain: 0.6, chugTailMul: 1.2,
    bassPattern: [0,1,4,5,8,9,12,13],
    synthProfile: PROF_ORCHESTRAL,
    intro:     { drums:{kick:[0,4,8,12],snare:[],hihat:EIGHTHS},   chug:[0,8] },
    verse:     { drums:{kick:[0,1,4,5,8,9,12,13],snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    chorus:    { drums:{kick:[0,1,4,5,8,9,12,13],snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    bridge:    { drums:{kick:[0,4,8,12],snare:[4,12],hihat:QUARTERS}, chug:[0,8] },
    breakdown: { drums:{kick:[0,8],snare:[4,12],hihat:[]},         chug:[0,8] },
    outro:     { drums:{kick:[0,1,4,5,8,9,12,13],snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    fill:      { kick:ALL16,snare:[8,10,12,13,14,15],hihat:[0,4] },
    progressionPool: PROGS_HARM_MINOR,
    scale: HARMONIC_MINOR,
    leadPhrases: [
      [{pos:0,deg:4,len:4},{pos:4,deg:5,len:4},{pos:8,deg:7,len:8}],
      [{pos:0,deg:7,len:2},{pos:2,deg:9,len:2},{pos:4,deg:7,len:4},{pos:8,deg:5,len:8}],
      [{pos:0,deg:5,len:1},{pos:1,deg:6,len:1},{pos:2,deg:7,len:2},{pos:4,deg:9,len:4},{pos:8,deg:11,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,87.31,73.42,65.41],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 10 · Levels 51-55 · ELECTRIC STORM ─────────────────────────────────
  {
    id: "cyber",
    name: "ELECTRIC STORM",
    vibe: "whole-tone scale · synth · cyberpunk · bit-crushed",
    songNames: [
      "Neon Rain",
      "Circuit Breaker",
      "Data Storm",
      "Synth Surge",
      "Cyberpunk Citizen",
    ],
    drive: 0.55, tone: 4000, guitarGain: 0.55, chugTailMul: 0.8,
    bassPattern: [0,4,8,12],
    synthProfile: PROF_CYBER,
    intro:     { drums:{kick:QUARTERS,snare:[],hihat:ALL16},        chug:[0,8] },
    verse:     { drums:{kick:EIGHTHS,snare:[4,12],hihat:ALL16},     chug:[0,4,8,12] },
    chorus:    { drums:{kick:ALL16,snare:[4,12],hihat:ALL16},       chug:[0,4,8,12] },
    bridge:    { drums:{kick:[0,6,10],snare:[4,12],hihat:EIGHTHS},  chug:[0,6,10] },
    breakdown: { drums:{kick:[0,8],snare:[],hihat:ALL16},           chug:[] },
    outro:     { drums:{kick:EIGHTHS,snare:[4,12],hihat:ALL16},     chug:[0,4,8,12] },
    fill:      { kick:ALL16,snare:[12,14,15],hihat:ALL16 },
    progressionPool: PROGS_WHOLETONE,
    scale: WHOLE_TONE,
    leadPhrases: [
      [{pos:0,deg:0,len:2},{pos:2,deg:2,len:2},{pos:4,deg:4,len:2},{pos:6,deg:3,len:2},{pos:8,deg:5,len:4},{pos:12,deg:4,len:4}],
      [{pos:0,deg:5,len:1},{pos:2,deg:4,len:1},{pos:4,deg:3,len:1},{pos:6,deg:5,len:2},{pos:8,deg:4,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,87.31,110.0,73.42],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 11 · Levels 56-60 · THE FORBIDDEN CITY ─────────────────────────────
  {
    id: "forbidden",
    name: "THE FORBIDDEN CITY",
    vibe: "chromatic · mysterious · slow tension · deep reverb",
    songNames: [
      "Beyond the Wall",
      "Chromatic Gate",
      "The Hidden Palace",
      "Forbidden Scale",
      "Chromatic Whispers",
    ],
    drive: 0.12, tone: 2000, guitarGain: 0.45, chugTailMul: 8.0,
    bassPattern: [0,14],
    synthProfile: PROF_MYSTERY,
    intro:     { drums:{kick:[0],snare:[],hihat:[0,8]},             chug:[0] },
    verse:     { drums:{kick:[0,14],snare:[6],hihat:[0,8]},         chug:[0,14] },
    chorus:    { drums:{kick:[0,10,14],snare:[6,12],hihat:[0,8]},   chug:[0,10] },
    bridge:    { drums:{kick:[0],snare:[8],hihat:[0]},              chug:[0] },
    breakdown: { drums:{kick:[0],snare:[],hihat:[]},                chug:[] },
    outro:     { drums:{kick:[0,14],snare:[6],hihat:[0,8]},         chug:[0] },
    fill:      { kick:[0,6,8,14],snare:[12,14,15],hihat:[0] },
    progressionPool: PROGS_CHROMATIC,
    scale: CHROMATIC,
    leadPhrases: [
      [{pos:0,deg:0,len:8},{pos:8,deg:2,len:8}],
      [{pos:0,deg:3,len:6},{pos:6,deg:2,len:4},{pos:10,deg:1,len:6}],
    ],
    songTemplates: BALLAD_STRUCT,
    keys: [82.41,73.42,65.41,87.31],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 12 · Levels 61-65 · NATTOUN GOES SUPERSONIC ────────────────────────
  {
    id: "supersonic",
    name: "NATTOUN GOES SUPERSONIC",
    vibe: "breakneck · blast beats · phrygian shred · max speed",
    songNames: [
      "Mach-1 Nattoun",
      "Speed of Nose",
      "Blast Beat Boulevard",
      "Sub-Second Citizen",
      "Breaking the Sound Decree",
    ],
    drive: 0.95, tone: 4200, guitarGain: 0.6, chugTailMul: 0.6,
    bassPattern: EIGHTHS,
    synthProfile: PROF_BLAST,
    intro:     { drums:{kick:[0,4,8,12],snare:[],hihat:EIGHTHS},    chug:GALLOP },
    verse:     { drums:{kick:GALLOP,snare:BLAST,hihat:QUARTERS},    chug:ALL16 },
    chorus:    { drums:{kick:ALL16,snare:BLAST,hihat:QUARTERS},     chug:ALL16 },
    bridge:    { drums:{kick:EIGHTHS,snare:[4,12],hihat:QUARTERS},  chug:[0,4,8,12] },
    breakdown: { drums:{kick:[0,8],snare:[4,12],hihat:[]},          chug:[0,8] },
    outro:     { drums:{kick:ALL16,snare:BLAST,hihat:QUARTERS},     chug:ALL16 },
    fill:      { kick:ALL16,snare:ALL16,hihat:[0,4] },
    progressionPool: PROGS_PHRYGIAN,
    scale: PHRYGIAN,
    leadPhrases: [
      [{pos:0,deg:7,len:1},{pos:1,deg:5,len:1},{pos:2,deg:3,len:1},{pos:3,deg:5,len:1},{pos:4,deg:7,len:1},{pos:5,deg:9,len:1},{pos:6,deg:11,len:1},{pos:7,deg:9,len:1},{pos:8,deg:7,len:8}],
      [{pos:0,deg:3,len:1},{pos:1,deg:5,len:1},{pos:2,deg:7,len:1},{pos:3,deg:5,len:1},{pos:4,deg:7,len:1},{pos:5,deg:9,len:1},{pos:6,deg:7,len:2},{pos:8,deg:11,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,77.78,87.31,73.42],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 13 · Levels 66-70 · THE SAD KING ────────────────────────────────────
  {
    id: "sadking",
    name: "THE SAD KING",
    vibe: "emotional · piano solo · natural minor · ultra sparse",
    songNames: [
      "Throne of Tears",
      "Elegy for Bahamas",
      "The Rain Decree",
      "Lonely at the Palace",
      "Piano Sorrow",
    ],
    drive: 0.0, tone: 6000, guitarGain: 0.3, chugTailMul: 5.0,
    bassPattern: [0,8],
    synthProfile: PROF_PIANO,
    intro:     { drums:{kick:[0],snare:[],hihat:[]},               chug:[0] },
    verse:     { drums:{kick:[0],snare:[8],hihat:[]},              chug:[0,8] },
    chorus:    { drums:{kick:[0,8],snare:[4,12],hihat:QUARTERS},   chug:[0,8] },
    bridge:    { drums:{kick:[0],snare:[],hihat:[]},               chug:[0] },
    breakdown: { drums:{kick:[],snare:[],hihat:[]},                chug:[] },
    outro:     { drums:{kick:[0],snare:[8],hihat:[]},              chug:[0] },
    fill:      { kick:[0,8,12,14],snare:[12,14,15],hihat:[0] },
    progressionPool: PROGS_MINOR,
    scale: NATURAL_MINOR,
    leadPhrases: [
      [{pos:0,deg:0,len:6},{pos:6,deg:2,len:4},{pos:10,deg:3,len:6}],
      [{pos:0,deg:4,len:8},{pos:8,deg:3,len:4},{pos:12,deg:2,len:4}],
    ],
    songTemplates: BALLAD_STRUCT,
    keys: [130.81,146.83,110.0,123.47],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 14 · Levels 71-75 · FINAL ARMY ─────────────────────────────────────
  {
    id: "army",
    name: "FINAL ARMY",
    vibe: "major · military march · brass + drum corps",
    songNames: [
      "March of 99",
      "Brass and Bayonets",
      "The Last Parade",
      "Regiment of the Nose",
      "Victory Fanfare",
    ],
    drive: 0.22, tone: 3800, guitarGain: 0.58, chugTailMul: 2.8,
    bassPattern: [0,4,8,12],
    synthProfile: PROF_MILITARY,
    intro:     { drums:{kick:[0,8],snare:MILITARY,hihat:[]},       chug:[0,4,8,12] },
    verse:     { drums:{kick:QUARTERS,snare:MILITARY,hihat:[]},    chug:[0,8] },
    chorus:    { drums:{kick:[0,4,8,12],snare:MILITARY,hihat:[]},  chug:[0,4,8,12] },
    bridge:    { drums:{kick:[0,8],snare:[1,3,5,9,11,13],hihat:[]}, chug:[0,8] },
    breakdown: { drums:{kick:[0,8],snare:[0,1,2,3,4,5,6,7],hihat:[]}, chug:[] },
    outro:     { drums:{kick:QUARTERS,snare:MILITARY,hihat:[]},    chug:[0,4,8,12] },
    fill:      { kick:[0,4,8,10,12,14],snare:[0,2,4,6,8,10,12,14,15],hihat:[] },
    progressionPool: PROGS_MAJOR,
    scale: MAJOR,
    leadPhrases: [
      [{pos:0,deg:4,len:4},{pos:4,deg:5,len:4},{pos:8,deg:7,len:8}],
      [{pos:0,deg:7,len:2},{pos:2,deg:5,len:2},{pos:4,deg:4,len:4},{pos:8,deg:5,len:8}],
      [{pos:0,deg:2,len:2},{pos:4,deg:4,len:2},{pos:6,deg:5,len:2},{pos:8,deg:7,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [98.0,87.31,73.42,82.41],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 15 · Levels 76-80 · CHAOS REALM ────────────────────────────────────
  {
    id: "chaos",
    name: "CHAOS REALM",
    vibe: "chromatic atonal · dissonant · unpredictable · bit-crush",
    songNames: [
      "Reality Fracture",
      "Atonal Uprising",
      "Dissonant Decree",
      "The Glitch Throne",
      "Chaos Protocol",
    ],
    drive: 0.85, tone: 4500, guitarGain: 0.58, chugTailMul: 0.9,
    bassPattern: CHAOS_K,
    synthProfile: PROF_CHAOS,
    intro:     { drums:{kick:QUARTERS,snare:[],hihat:EIGHTHS},     chug:CHAOS_K },
    verse:     { drums:{kick:CHAOS_K,snare:CHAOS_S,hihat:CHAOS_H}, chug:CHAOS_K },
    chorus:    { drums:{kick:ALL16,snare:CHAOS_S,hihat:CHAOS_H},   chug:ALL16 },
    bridge:    { drums:{kick:CHAOS_K,snare:[9,14],hihat:CHAOS_H},  chug:CHAOS_K },
    breakdown: { drums:{kick:[0,5],snare:[7],hihat:CHAOS_H},       chug:[0,5] },
    outro:     { drums:{kick:CHAOS_K,snare:CHAOS_S,hihat:CHAOS_H}, chug:CHAOS_K },
    fill:      { kick:ALL16,snare:[10,11,12,13,14,15],hihat:[0,7] },
    progressionPool: PROGS_CHROMATIC,
    scale: CHROMATIC,
    leadPhrases: [
      [{pos:0,deg:0,len:1},{pos:1,deg:2,len:1},{pos:2,deg:1,len:1},{pos:3,deg:3,len:1},{pos:4,deg:5,len:4},{pos:8,deg:4,len:8}],
      [{pos:0,deg:7,len:2},{pos:4,deg:6,len:2},{pos:8,deg:9,len:2},{pos:12,deg:11,len:4}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,87.31,77.78,73.42],
    hasLead: true, hasCrashOnChorus: false,
  },

  // ── TIER 16 · Levels 81-85 · THE LAST KINGDOM ───────────────────────────────
  {
    id: "kingdom",
    name: "THE LAST KINGDOM",
    vibe: "epic choir · major scale · orchestral grandeur · reverb cathedral",
    songNames: [
      "Hall of Thousand Noses",
      "Choir of Citizens",
      "Epic Finale I",
      "The Last Battle Hymn",
      "Kingdom Eternal",
    ],
    drive: 0.08, tone: 4000, guitarGain: 0.55, chugTailMul: 6.0,
    bassPattern: [0,8],
    synthProfile: PROF_CHOIR,
    intro:     { drums:{kick:[0,4,8,12],snare:[],hihat:QUARTERS},    chug:[0,8] },
    verse:     { drums:{kick:QUARTERS,snare:[4,12],hihat:QUARTERS},  chug:[0,8] },
    chorus:    { drums:{kick:[0,4,8,12],snare:[4,8,12,14,15],hihat:QUARTERS}, chug:[0,8] },
    bridge:    { drums:{kick:[0,8],snare:[4,12],hihat:QUARTERS},     chug:[0] },
    breakdown: { drums:{kick:[0,8],snare:[],hihat:[]},               chug:[] },
    outro:     { drums:{kick:QUARTERS,snare:[4,12],hihat:QUARTERS},  chug:[0,8] },
    fill:      { kick:[0,4,8,10,12,14],snare:[8,10,12,14,15],hihat:[0,4] },
    progressionPool: PROGS_MAJOR,
    scale: MAJOR,
    leadPhrases: [
      [{pos:0,deg:4,len:4},{pos:4,deg:5,len:4},{pos:8,deg:7,len:8}],
      [{pos:0,deg:7,len:2},{pos:2,deg:9,len:2},{pos:4,deg:7,len:4},{pos:8,deg:5,len:8}],
      [{pos:0,deg:5,len:2},{pos:4,deg:7,len:4},{pos:8,deg:9,len:2},{pos:10,deg:7,len:6}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [98.0,87.31,82.41,73.42],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 17 · Levels 86-90 · NATTOUN'S TRUE FORM ────────────────────────────
  {
    id: "trueform",
    name: "NATTOUN'S TRUE FORM",
    vibe: "diminished · glitchy · distorted · corrupted signal",
    songNames: [
      "Corrupted Protocol",
      "Nattoun Glitches",
      "True Form Revealed",
      "Digital Rage",
      "System Override",
    ],
    drive: 0.92, tone: 5000, guitarGain: 0.58, chugTailMul: 0.6,
    bassPattern: GLITCH,
    synthProfile: PROF_GLITCH,
    intro:     { drums:{kick:[0,4,8,12],snare:[],hihat:EIGHTHS},   chug:GLITCH },
    verse:     { drums:{kick:GLITCH,snare:[4,6,13],hihat:GLITCH},  chug:GLITCH },
    chorus:    { drums:{kick:ALL16,snare:[4,6,13],hihat:GLITCH},   chug:ALL16 },
    bridge:    { drums:{kick:GLITCH,snare:[9,14],hihat:GLITCH},    chug:GLITCH },
    breakdown: { drums:{kick:[0,2,7],snare:[5],hihat:[]},          chug:[0,2,7] },
    outro:     { drums:{kick:GLITCH,snare:[4,6,13],hihat:GLITCH},  chug:GLITCH },
    fill:      { kick:ALL16,snare:ALL16,hihat:[0] },
    progressionPool: PROGS_DIMINISHED,
    scale: DIMINISHED,
    leadPhrases: [
      [{pos:0,deg:1,len:1},{pos:1,deg:2,len:1},{pos:2,deg:3,len:1},{pos:3,deg:2,len:1},{pos:4,deg:3,len:4},{pos:8,deg:2,len:8}],
      [{pos:0,deg:3,len:2},{pos:2,deg:2,len:1},{pos:3,deg:1,len:1},{pos:4,deg:3,len:4},{pos:8,deg:1,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,87.31,77.78,73.42],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 18 · Levels 91-95 · ONE NOSE TO RULE THEM ALL ──────────────────────
  {
    id: "onenose",
    name: "ONE NOSE TO RULE THEM ALL",
    vibe: "maximum drama · harmonic minor · orchestral overload",
    songNames: [
      "The Nose Awakens",
      "Maximum Drama I",
      "Maximum Drama II",
      "Everything is Nose",
      "The Final Nose",
    ],
    drive: 0.7, tone: 3800, guitarGain: 0.62, chugTailMul: 1.3,
    bassPattern: [0,1,4,5,8,9,12,13],
    synthProfile: PROF_DRAMA,
    intro:     { drums:{kick:[0,4,8,12],snare:[],hihat:EIGHTHS},   chug:[0,8] },
    verse:     { drums:{kick:[0,1,4,5,8,9,12,13],snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    chorus:    { drums:{kick:[0,1,4,5,8,9,12,13],snare:[4,10,12,15],hihat:EIGHTHS}, chug:[0,4,8,12,15] },
    bridge:    { drums:{kick:[0,4,8,12],snare:[4,12],hihat:QUARTERS}, chug:[0,8] },
    breakdown: { drums:{kick:[0,8],snare:[4,12],hihat:[]},         chug:[0,8] },
    outro:     { drums:{kick:[0,1,4,5,8,9,12,13],snare:[4,12],hihat:EIGHTHS}, chug:[0,4,8,12] },
    fill:      { kick:ALL16,snare:[8,10,12,13,14,15],hihat:[0,4] },
    progressionPool: PROGS_DRAMA,
    scale: HARMONIC_MINOR,
    leadPhrases: [
      [{pos:0,deg:4,len:4},{pos:4,deg:5,len:4},{pos:8,deg:7,len:8}],
      [{pos:0,deg:7,len:2},{pos:2,deg:9,len:2},{pos:4,deg:11,len:4},{pos:8,deg:9,len:2},{pos:10,deg:7,len:2},{pos:12,deg:4,len:4}],
      [{pos:0,deg:5,len:1},{pos:1,deg:6,len:1},{pos:2,deg:7,len:2},{pos:4,deg:9,len:4},{pos:8,deg:11,len:8}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,87.31,73.42,65.41],
    hasLead: true, hasCrashOnChorus: true,
  },

  // ── TIER 19 · Levels 96-100 · BAHAMAS LAND FOREVER ──────────────────────────
  {
    id: "forever",
    name: "BAHAMAS LAND FOREVER",
    vibe: "🤘 EVERYTHING AT ONCE · max distortion · all 16ths · legendary 🤘",
    songNames: [
      "BAHAMAS LAND FOREVER I",
      "BAHAMAS LAND FOREVER II",
      "BAHAMAS LAND FOREVER III",
      "BAHAMAS LAND FOREVER IV",
      "THE END OF ALL THINGS",
    ],
    drive: 1.0, tone: 4500, guitarGain: 0.65, chugTailMul: 0.55,
    bassPattern: EIGHTHS,
    synthProfile: PROF_MAX,
    intro:     { drums:{kick:ALL16,snare:[],hihat:ALL16},          chug:ALL16 },
    verse:     { drums:{kick:ALL16,snare:[4,12],hihat:ALL16},      chug:ALL16 },
    chorus:    { drums:{kick:ALL16,snare:[2,6,10,14],hihat:ALL16}, chug:ALL16 },
    bridge:    { drums:{kick:EIGHTHS,snare:[4,12],hihat:ALL16},    chug:[0,4,8,12] },
    breakdown: { drums:{kick:[0,8],snare:[4,12],hihat:[]},         chug:[0,8] },
    outro:     { drums:{kick:ALL16,snare:[2,6,10,14],hihat:ALL16}, chug:ALL16 },
    fill:      { kick:ALL16,snare:ALL16,hihat:ALL16 },
    progressionPool: PROGS_DRAMA,
    scale: HARMONIC_MINOR,
    leadPhrases: [
      [{pos:0,deg:0,len:1},{pos:1,deg:1,len:1},{pos:2,deg:3,len:1},{pos:3,deg:5,len:1},{pos:4,deg:7,len:1},{pos:5,deg:9,len:1},{pos:6,deg:11,len:1},{pos:7,deg:9,len:1},{pos:8,deg:7,len:4},{pos:12,deg:11,len:4}],
      [{pos:0,deg:11,len:2},{pos:4,deg:9,len:2},{pos:8,deg:7,len:2},{pos:12,deg:5,len:4}],
    ],
    songTemplates: EPIC_STRUCT,
    keys: [82.41,73.42,87.31,65.41],
    hasLead: true, hasCrashOnChorus: true,
  },
];

export function getGenreForLevel(level: number): GenreTemplate {
  const tier = Math.min(GENRES.length - 1, Math.floor((level - 1) / 5));
  return GENRES[tier];
}
