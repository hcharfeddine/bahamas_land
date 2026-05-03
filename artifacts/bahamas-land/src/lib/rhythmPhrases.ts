// rhythmPhrases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Through-composed lead melodies for all 20 level groups.
// Each group has 8 phrases that play IN ORDER across the song's main section,
// forming a complete musical arc: opening → motif → response → development →
// build → climax → resolution → closing.
//
// Each phrase: array of { pos, deg, len }
//   pos = 16th-note position within the bar (0–15)
//   deg = scale degree index into the genre's scale array
//   len = duration in 16th notes
//
// Musical arc per 8 phrases:
//   [0] Sparse opening — quiet, establishes key, 3-4 notes
//   [1] Main motif A   — the iconic hook, 5-7 notes
//   [2] Response B     — answers the hook, descends or pivots
//   [3] Development    — takes the motif somewhere new, adds energy
//   [4] Build          — ascending run, gains momentum
//   [5] Climax         — highest register, widest range, peak energy
//   [6] Resolution     — graceful descent, satisfying landing
//   [7] Closing        — sparse, lands on root, everything fades
// ─────────────────────────────────────────────────────────────────────────────

import type { LeadPhrase } from "./rhythmTracks";

export type PhraseGroup = {
  name: string;
  phrases: LeadPhrase[];
};

export const LEVEL_PHRASES: PhraseGroup[] = [

  // ── GROUP 1 · levels 1-5 · "Welcome to Bahamas Land" ─────────────────────
  // Pokémon Pallet Town DNA: gentle stepwise major pentatonic, warm & inviting.
  {
    name: "Welcome to Bahamas Land",
    phrases: [
      // [0] Opening — three quiet notes, establishes warmth
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 6, deg: 2, len: 3 },
        { pos: 11, deg: 4, len: 4 },
      ],
      // [1] Main motif A — the iconic greeting (step up, skip to 5th, breathe)
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 1, len: 1 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 8, deg: 4, len: 3 },
        { pos: 12, deg: 2, len: 2 },
      ],
      // [2] Response B — answer phrase, descends back home
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 3, len: 1 },
        { pos: 5, deg: 2, len: 1 },
        { pos: 7, deg: 1, len: 2 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // [3] Development — bounces up extra step, gains brightness
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [4] Build — ascending pentatonic run, momentum
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 5, len: 2 },
        { pos: 14, deg: 6, len: 2 },
      ],
      // [5] Climax — high register, joyful peak, wide range
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 6, len: 2 },
        { pos: 9, deg: 4, len: 3 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // [6] Resolution — graceful descent, satisfying close
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 3, len: 2 },
        { pos: 6, deg: 2, len: 2 },
        { pos: 9, deg: 1, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [7] Closing — sparse, land on root, fade
      [
        { pos: 0, deg: 2, len: 2 },
        { pos: 4, deg: 0, len: 4 },
        { pos: 10, deg: 0, len: 5 },
      ],
    ],
  },

  // ── GROUP 2 · levels 6-10 · "The Dog Takes Charge" ───────────────────────
  // Zelda overworld DNA: heroic arpeggio, quest momentum, triumphant landing.
  {
    name: "The Dog Takes Charge",
    phrases: [
      // [0] Opening — single call note, silence, then second note
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 10, deg: 4, len: 5 },
      ],
      // [1] Main motif — heroic fanfare arpeggio (Zelda overworld DNA)
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 7, deg: 6, len: 1 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 3 },
      ],
      // [2] Response — running 8ths, quest momentum
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 1, len: 1 },
        { pos: 8, deg: 0, len: 2 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // [3] Development — wide leap, "Zelda secret found" moment
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 6, len: 1 },
        { pos: 5, deg: 5, len: 2 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 6, len: 1 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // [4] Build — ascending arpeggio stack, tension rising
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 6, len: 2 },
        { pos: 11, deg: 5, len: 2 },
        { pos: 14, deg: 6, len: 1 },
      ],
      // [5] Climax — triumphant fanfare, full range, heroic
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 4, len: 1 },
        { pos: 5, deg: 6, len: 3 },
        { pos: 9, deg: 5, len: 2 },
        { pos: 12, deg: 4, len: 3 },
      ],
      // [6] Resolution — land home via descending scale
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 2, len: 2 },
        { pos: 7, deg: 1, len: 1 },
        { pos: 9, deg: 0, len: 6 },
      ],
      // [7] Closing — horn call echo, three notes, silence
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 4, deg: 2, len: 2 },
        { pos: 8, deg: 0, len: 7 },
      ],
    ],
  },

  // ── GROUP 3 · levels 11-15 · "The Nose Strikes Back" ─────────────────────
  // FF battle theme DNA: syncopated, tense, minor urgency, rising stakes.
  {
    name: "The Nose Strikes Back",
    phrases: [
      // [0] Opening — ominous low notes, wide gap
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 3, len: 2 },
        { pos: 10, deg: 5, len: 5 },
      ],
      // [1] Main motif — syncopated battle motif (off-beat attack)
      [
        { pos: 1, deg: 0, len: 1 },
        { pos: 3, deg: 0, len: 1 },
        { pos: 5, deg: 5, len: 2 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 3, len: 1 },
        { pos: 12, deg: 1, len: 3 },
      ],
      // [2] Response — ascending minor run, tension builds
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 5, len: 2 },
        { pos: 11, deg: 6, len: 1 },
        { pos: 13, deg: 5, len: 2 },
      ],
      // [3] Development — aggressive stabs, battle climax feel
      [
        { pos: 0, deg: 5, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 3, len: 1 },
        { pos: 11, deg: 1, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [4] Build — relentless minor run, every 16th note
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 1 },
        { pos: 12, deg: 5, len: 1 },
        { pos: 14, deg: 6, len: 1 },
      ],
      // [5] Climax — final boss second phase, peak intensity
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 5, len: 1 },
        { pos: 5, deg: 6, len: 3 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [6] Resolution — descending minor, battle cooling
      [
        { pos: 0, deg: 5, len: 2 },
        { pos: 3, deg: 4, len: 2 },
        { pos: 6, deg: 3, len: 2 },
        { pos: 9, deg: 1, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [7] Closing — single low note, two pulses, silence
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 0, len: 2 },
        { pos: 10, deg: 0, len: 5 },
      ],
    ],
  },

  // ── GROUP 4 · levels 16-20 · "Underground Kingdom" ───────────────────────
  // Mario underground DNA: chromatic quirk, funky bouncy, unexpected turns.
  {
    name: "Underground Kingdom",
    phrases: [
      // [0] Opening — low bass motif, sparse, quirky
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 9, deg: 1, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [1] Main motif — classic chromatic descent + bounce
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 1, len: 1 },
        { pos: 8, deg: 0, len: 1 },
        { pos: 10, deg: 2, len: 1 },
        { pos: 12, deg: 4, len: 1 },
        { pos: 14, deg: 3, len: 1 },
      ],
      // [2] Response — funky syncopated hop, off-beat
      [
        { pos: 1, deg: 0, len: 1 },
        { pos: 3, deg: 3, len: 2 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 1, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [3] Development — quirky chromatic needle + unexpected high jump
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 1, len: 1 },
        { pos: 8, deg: 0, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 4, len: 1 },
        { pos: 14, deg: 2, len: 1 },
      ],
      // [4] Build — staccato bounce building up
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 6, len: 2 },
      ],
      // [5] Climax — frantic all-over-the-place underground frenzy
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 6, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [6] Resolution — chromatic slide back home
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 3, len: 1 },
        { pos: 5, deg: 2, len: 1 },
        { pos: 7, deg: 1, len: 2 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // [7] Closing — two little bounces, done
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 7, deg: 0, len: 8 },
      ],
    ],
  },

  // ── GROUP 5 · levels 21-25 · "Kingdom March" ─────────────────────────────
  // Chrono Trigger DNA: wide leaps, major 7th, bittersweet emotional arc.
  {
    name: "Kingdom March",
    phrases: [
      // [0] Opening — two notes, a wide breath, horizon feeling
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 6, deg: 4, len: 4 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // [1] Main motif — Chrono's signature wide leap + float down
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 5, len: 3 },
        { pos: 7, deg: 4, len: 2 },
        { pos: 10, deg: 2, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [2] Response — emotional answer, touches maj7
      [
        { pos: 0, deg: 2, len: 2 },
        { pos: 3, deg: 6, len: 2 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // [3] Development — full arc, question to resolution
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 4, len: 1 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [4] Build — ascend through the scale with feeling
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 5, deg: 4, len: 2 },
        { pos: 8, deg: 5, len: 2 },
        { pos: 11, deg: 6, len: 2 },
        { pos: 14, deg: 5, len: 2 },
      ],
      // [5] Climax — bittersweet peak, maj7 shines
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 6, len: 3 },
        { pos: 11, deg: 4, len: 4 },
      ],
      // [6] Resolution — emotional descent, peaceful landing
      [
        { pos: 0, deg: 5, len: 2 },
        { pos: 3, deg: 4, len: 2 },
        { pos: 6, deg: 2, len: 3 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // [7] Closing — two notes like a farewell wave
      [
        { pos: 0, deg: 2, len: 3 },
        { pos: 5, deg: 0, len: 10 },
      ],
    ],
  },

  // ── GROUP 6 · levels 26-30 · "Danger Zone" ───────────────────────────────
  // Castlevania DNA: harmonic minor, fast descending runs, gothic drama.
  {
    name: "Danger Zone",
    phrases: [
      // [0] Opening — ominous low toll, three dark notes
      [
        { pos: 0, deg: 0, len: 5 },
        { pos: 7, deg: 3, len: 3 },
        { pos: 12, deg: 5, len: 3 },
      ],
      // [1] Main motif — classic Castlevania descending minor run
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 2, len: 1 },
        { pos: 10, deg: 1, len: 1 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [2] Response — dramatic leap up then cascading fall
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 6, len: 2 },
        { pos: 5, deg: 5, len: 1 },
        { pos: 7, deg: 4, len: 1 },
        { pos: 9, deg: 2, len: 1 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // [3] Development — harmonic minor tension, augmented 2nd moment
      [
        { pos: 0, deg: 2, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 6, len: 1 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 3, len: 1 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // [4] Build — gothic ascending run, tension mounting
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 6, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [5] Climax — peak gothic drama, full range
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 3, len: 1 },
        { pos: 5, deg: 6, len: 3 },
        { pos: 9, deg: 5, len: 2 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [6] Resolution — descending minor to root, dramatic close
      [
        { pos: 0, deg: 5, len: 2 },
        { pos: 3, deg: 4, len: 1 },
        { pos: 5, deg: 3, len: 2 },
        { pos: 8, deg: 1, len: 2 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // [7] Closing — two dark tolls, fade
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 6, deg: 0, len: 9 },
      ],
    ],
  },

  // ── GROUP 7 · levels 31-35 · "The Underground" ───────────────────────────
  // Donkey Kong Country DNA: deep groove, soulful, underwater ambience.
  {
    name: "The Underground",
    phrases: [
      // [0] Opening — slow depth, two low notes breathing
      [
        { pos: 0, deg: 0, len: 5 },
        { pos: 8, deg: 2, len: 7 },
      ],
      // [1] Main motif — DKC low groove, slow build
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 4, deg: 2, len: 2 },
        { pos: 7, deg: 3, len: 1 },
        { pos: 9, deg: 4, len: 3 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // [2] Response — swung 8ths, soulful answer
      [
        { pos: 1, deg: 4, len: 2 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 2, len: 2 },
        { pos: 9, deg: 1, len: 1 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // [3] Development — DKC lush moment, wide slow melody
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 4, len: 3 },
        { pos: 7, deg: 6, len: 2 },
        { pos: 10, deg: 4, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [4] Build — bubbling ascent, light filtering through
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 5, deg: 3, len: 2 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 6, len: 2 },
        { pos: 14, deg: 5, len: 2 },
      ],
      // [5] Climax — soulful peak, highest point of the song
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 6, len: 4 },
        { pos: 12, deg: 4, len: 3 },
      ],
      // [6] Resolution — sinking back to the depths, peaceful
      [
        { pos: 0, deg: 4, len: 3 },
        { pos: 4, deg: 2, len: 3 },
        { pos: 8, deg: 1, len: 3 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [7] Closing — one final deep note, silence
      [
        { pos: 0, deg: 0, len: 6 },
        { pos: 9, deg: 0, len: 6 },
      ],
    ],
  },

  // ── GROUP 8 · levels 36-40 · "Nattoun's Rage" ────────────────────────────
  // Mega Man DNA: aggressive, technical, fast 16th-note runs, pure energy.
  {
    name: "Nattoun's Rage",
    phrases: [
      // [0] Opening — two quick punches, silence
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 6, deg: 4, len: 5 },
      ],
      // [1] Main motif — Mega Man rapid-fire 16ths
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 2, len: 1 },
        { pos: 12, deg: 0, len: 1 },
        { pos: 14, deg: 2, len: 1 },
      ],
      // [2] Response — Wily Castle ascending burst
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 6, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 6, len: 1 },
        { pos: 12, deg: 4, len: 3 },
      ],
      // [3] Development — punchy stabs + run to climax
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 3, len: 2 },
        { pos: 7, deg: 4, len: 1 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 6, len: 1 },
        { pos: 13, deg: 5, len: 2 },
      ],
      // [4] Build — full-speed 16th note storm
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 6, len: 1 },
        { pos: 14, deg: 5, len: 1 },
      ],
      // [5] Climax — final stage madness, all energy
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 4, len: 1 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 6, len: 2 },
        { pos: 12, deg: 4, len: 3 },
      ],
      // [6] Resolution — cool down, step back to root
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 1, len: 2 },
        { pos: 9, deg: 0, len: 6 },
      ],
      // [7] Closing — victory fanfare, two punches done
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 8, deg: 0, len: 7 },
      ],
    ],
  },

  // ── GROUP 9 · levels 41-45 · "Ancient Temple" ────────────────────────────
  // Zelda dungeon DNA: sparse, mysterious, tritone colour, eerie silence.
  {
    name: "Ancient Temple",
    phrases: [
      // [0] Opening — one note drops into the void
      [
        { pos: 0, deg: 0, len: 6 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [1] Main motif — sparse dungeon drip (long silences = tension)
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 5, len: 2 },
        { pos: 9, deg: 3, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [2] Response — the tritone moment (dim5 tension)
      [
        { pos: 0, deg: 2, len: 2 },
        { pos: 4, deg: 3, len: 3 },
        { pos: 8, deg: 5, len: 2 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // [3] Development — dark arpeggio rising from the depths
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 5, deg: 3, len: 2 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 2 },
        { pos: 13, deg: 5, len: 2 },
      ],
      // [4] Build — eerie chromatic ascent
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 1, len: 2 },
        { pos: 6, deg: 3, len: 2 },
        { pos: 9, deg: 5, len: 2 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [5] Climax — the heart of the temple, full dread
      [
        { pos: 0, deg: 6, len: 4 },
        { pos: 5, deg: 3, len: 3 },
        { pos: 9, deg: 6, len: 4 },
        { pos: 14, deg: 5, len: 2 },
      ],
      // [6] Resolution — mysterious descent, doesn't fully resolve
      [
        { pos: 0, deg: 5, len: 3 },
        { pos: 4, deg: 3, len: 3 },
        { pos: 8, deg: 2, len: 3 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [7] Closing — one final echo
      [
        { pos: 0, deg: 0, len: 5 },
        { pos: 10, deg: 0, len: 5 },
      ],
    ],
  },

  // ── GROUP 10 · levels 46-50 · "Halfway Boss" ─────────────────────────────
  // FF boss DNA: cinematic, full range, dramatic pauses, orchestral sweep.
  {
    name: "Halfway Boss",
    phrases: [
      // [0] Opening — two bass notes, ominous entry
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 7, deg: 3, len: 4 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [1] Main motif — ominous boss entrance (low → high leap)
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 6, len: 4 },
        { pos: 9, deg: 5, len: 2 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [2] Response — counter-melody descend, orchestral sweep
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 5, len: 1 },
        { pos: 5, deg: 4, len: 1 },
        { pos: 7, deg: 3, len: 2 },
        { pos: 10, deg: 1, len: 1 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [3] Development — dramatic swell, reaches higher
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 6, len: 2 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 3, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [4] Build — the boss second form begins, rapid ascent
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 6, len: 2 },
        { pos: 11, deg: 5, len: 2 },
        { pos: 14, deg: 6, len: 2 },
      ],
      // [5] Climax — full cinematic orchestral peak
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 5, len: 2 },
        { pos: 6, deg: 6, len: 4 },
        { pos: 11, deg: 5, len: 4 },
      ],
      // [6] Resolution — orchestral resolution, majestic landing
      [
        { pos: 0, deg: 5, len: 2 },
        { pos: 3, deg: 4, len: 2 },
        { pos: 6, deg: 3, len: 2 },
        { pos: 9, deg: 1, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [7] Closing — two final dramatic chords worth of melody
      [
        { pos: 0, deg: 3, len: 3 },
        { pos: 5, deg: 0, len: 10 },
      ],
    ],
  },

  // ── GROUP 11 · levels 51-55 · "Electric Storm" ───────────────────────────
  // Sonic DNA: blazing fast, C major rush, upbeat energy, speed IS the melody.
  {
    name: "Electric Storm",
    phrases: [
      // [0] Opening — quick zip then long note
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 10 },
      ],
      // [1] Main motif — Green Hill Zone DNA: bouncy fast major pentatonic
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 0, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 6, len: 2 },
      ],
      // [2] Response — speed burst + land (Chemical Plant feel)
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 6, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 2, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [3] Development — invincibility star pure joy run
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 1 },
        { pos: 12, deg: 4, len: 1 },
        { pos: 14, deg: 2, len: 1 },
      ],
      // [4] Build — full speed ahead, non-stop 16ths
      [
        { pos: 0, deg: 2, len: 1 },
        { pos: 2, deg: 4, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 6, len: 1 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 6, len: 1 },
        { pos: 14, deg: 5, len: 1 },
      ],
      // [5] Climax — Sonic peak speed, highest note
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 6, len: 3 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 6, len: 4 },
      ],
      // [6] Resolution — slowing dash to finish line
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 2, len: 2 },
        { pos: 6, deg: 1, len: 2 },
        { pos: 9, deg: 0, len: 6 },
      ],
      // [7] Closing — two-note jingle, goal reached
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 4, deg: 0, len: 11 },
      ],
    ],
  },

  // ── GROUP 12 · levels 56-60 · "The Forbidden City" ───────────────────────
  // Silent Hill DNA: dissonant, slow, wide intervals, dread and strange beauty.
  {
    name: "The Forbidden City",
    phrases: [
      // [0] Opening — one long haunting note, one answer
      [
        { pos: 0, deg: 0, len: 8 },
        { pos: 11, deg: 3, len: 4 },
      ],
      // [1] Main motif — unsettling slow melody with tritone
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 5, deg: 3, len: 3 },
        { pos: 9, deg: 5, len: 3 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // [2] Response — dissonant answer, minor 2nd rub
      [
        { pos: 0, deg: 5, len: 3 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 3 },
        { pos: 11, deg: 3, len: 4 },
      ],
      // [3] Development — haunting, unresolved
      [
        { pos: 0, deg: 3, len: 2 },
        { pos: 3, deg: 1, len: 3 },
        { pos: 7, deg: 0, len: 4 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [4] Build — slow ascending dread
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 4, deg: 3, len: 3 },
        { pos: 8, deg: 5, len: 3 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [5] Climax — full dread, the forbidden revealed
      [
        { pos: 0, deg: 6, len: 4 },
        { pos: 5, deg: 3, len: 3 },
        { pos: 9, deg: 6, len: 6 },
      ],
      // [6] Resolution — doesn't fully resolve, falls to minor 3rd
      [
        { pos: 0, deg: 5, len: 4 },
        { pos: 5, deg: 3, len: 4 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // [7] Closing — one last breath, unsettling silence
      [
        { pos: 0, deg: 3, len: 4 },
        { pos: 8, deg: 0, len: 7 },
      ],
    ],
  },

  // ── GROUP 13 · levels 61-65 · "Nattoun Goes Supersonic" ──────────────────
  // Tekken/fighting game DNA: punchy rhythmic hits, powerful masculine energy.
  {
    name: "Nattoun Goes Supersonic",
    phrases: [
      // [0] Opening — single power punch
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 6, deg: 4, len: 4 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // [1] Main motif — fighting game punchy stabs
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 4, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [2] Response — aggressive low→high power move
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 6, deg: 6, len: 3 },
        { pos: 10, deg: 5, len: 2 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // [3] Development — combo chain, rapid hits
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [4] Build — rising power combo
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 6, len: 2 },
        { pos: 11, deg: 5, len: 2 },
        { pos: 14, deg: 6, len: 1 },
      ],
      // [5] Climax — K.O. moment, maximum impact
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 4, len: 1 },
        { pos: 5, deg: 6, len: 4 },
        { pos: 10, deg: 5, len: 5 },
      ],
      // [6] Resolution — victory stance, cool down
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 2, len: 2 },
        { pos: 6, deg: 1, len: 2 },
        { pos: 9, deg: 0, len: 6 },
      ],
      // [7] Closing — final victory chord
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 4, len: 2 },
        { pos: 9, deg: 0, len: 6 },
      ],
    ],
  },

  // ── GROUP 14 · levels 66-70 · "The Sad King" ─────────────────────────────
  // FF piano ballad DNA: Aerith theme, slow, ornamental, heartbreaking.
  {
    name: "The Sad King",
    phrases: [
      // [0] Opening — single piano note, gentle
      [
        { pos: 0, deg: 2, len: 5 },
        { pos: 8, deg: 0, len: 7 },
      ],
      // [1] Main motif — Aerith theme DNA: slow descent, emotional
      [
        { pos: 0, deg: 4, len: 3 },
        { pos: 4, deg: 3, len: 2 },
        { pos: 7, deg: 2, len: 3 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // [2] Response — ornamented ascent, reaches for hope
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 2 },
        { pos: 6, deg: 4, len: 2 },
        { pos: 9, deg: 6, len: 3 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // [3] Development — aching resolution phrase
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 5, len: 2 },
        { pos: 6, deg: 4, len: 2 },
        { pos: 9, deg: 2, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [4] Build — emotional crescendo, reaching higher
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 4, len: 3 },
        { pos: 7, deg: 5, len: 2 },
        { pos: 10, deg: 6, len: 3 },
        { pos: 14, deg: 5, len: 2 },
      ],
      // [5] Climax — the heartbreak peak, highest and longest note
      [
        { pos: 0, deg: 6, len: 5 },
        { pos: 6, deg: 5, len: 4 },
        { pos: 11, deg: 6, len: 4 },
      ],
      // [6] Resolution — gentle descent, acceptance
      [
        { pos: 0, deg: 5, len: 3 },
        { pos: 4, deg: 4, len: 3 },
        { pos: 8, deg: 2, len: 3 },
        { pos: 12, deg: 0, len: 4 },
      ],
      // [7] Closing — two soft notes, like a lullaby ending
      [
        { pos: 0, deg: 2, len: 4 },
        { pos: 6, deg: 0, len: 9 },
      ],
    ],
  },

  // ── GROUP 15 · levels 71-75 · "Final Army" ───────────────────────────────
  // Military march DNA: dotted rhythms, brass call-and-response, precise.
  {
    name: "Final Army",
    phrases: [
      // [0] Opening — one brass call, attention!
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 6, deg: 2, len: 3 },
        { pos: 11, deg: 4, len: 4 },
      ],
      // [1] Main motif — dotted march rhythm (long-short-long)
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 0, len: 1 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 4, len: 1 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // [2] Response — brass answer, call-and-response
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 5, len: 1 },
        { pos: 5, deg: 4, len: 1 },
        { pos: 7, deg: 2, len: 2 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // [3] Development — full march climax phrase
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [4] Build — mounting march, drum roll feel
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [5] Climax — battle hymn peak, all brass
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 4, len: 2 },
        { pos: 6, deg: 6, len: 4 },
        { pos: 11, deg: 4, len: 4 },
      ],
      // [6] Resolution — march back to base, orderly descent
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 2, len: 2 },
        { pos: 6, deg: 0, len: 3 },
        { pos: 10, deg: 2, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // [7] Closing — two bugle calls, stand down
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 4, deg: 2, len: 2 },
        { pos: 8, deg: 0, len: 7 },
      ],
    ],
  },

  // ── GROUP 16 · levels 76-80 · "Chaos Realm" ──────────────────────────────
  // Atonal chaos DNA: unpredictable intervals, no tonal center, pure tension.
  {
    name: "Chaos Realm",
    phrases: [
      // [0] Opening — one chaotic leap into silence
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 5, deg: 6, len: 5 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // [1] Main motif — chaotic wide leaps, no stepwise motion
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 6, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 1, len: 1 },
        { pos: 11, deg: 4, len: 1 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // [2] Response — dissonant stutter then leap
      [
        { pos: 0, deg: 3, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 0, len: 2 },
        { pos: 9, deg: 6, len: 2 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // [3] Development — falling apart chromatically
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 2, len: 1 },
        { pos: 10, deg: 1, len: 1 },
        { pos: 12, deg: 0, len: 1 },
        { pos: 14, deg: 6, len: 1 },
      ],
      // [4] Build — total chaos, random extreme leaps
      [
        { pos: 0, deg: 1, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 6, deg: 4, len: 2 },
        { pos: 9, deg: 2, len: 1 },
        { pos: 11, deg: 6, len: 1 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // [5] Climax — absolute chaos, everything at once
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 1, len: 1 },
        { pos: 9, deg: 6, len: 2 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [6] Resolution — slowly finding order from chaos
      [
        { pos: 0, deg: 5, len: 2 },
        { pos: 3, deg: 3, len: 2 },
        { pos: 6, deg: 2, len: 3 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // [7] Closing — silence broken by one last unpredictable note
      [
        { pos: 0, deg: 0, len: 5 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 17 · levels 81-85 · "The Last Kingdom" ─────────────────────────
  // Epic choir DNA: long sustained notes, massive leaps, powerful and noble.
  {
    name: "The Last Kingdom",
    phrases: [
      // [0] Opening — one vast note, like a breath before the storm
      [
        { pos: 0, deg: 0, len: 8 },
        { pos: 12, deg: 4, len: 4 },
      ],
      // [1] Main motif — choir long tones, each held like a breath
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 5, deg: 4, len: 4 },
        { pos: 10, deg: 6, len: 5 },
      ],
      // [2] Response — powerful octave leap then resolution
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 4, deg: 6, len: 4 },
        { pos: 9, deg: 4, len: 3 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // [3] Development — full choir sweep, top to bottom
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 7, deg: 2, len: 3 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // [4] Build — choir swells, expanding range
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 4, deg: 2, len: 2 },
        { pos: 7, deg: 4, len: 3 },
        { pos: 11, deg: 6, len: 4 },
      ],
      // [5] Climax — ALL voices at once, maximum nobility
      [
        { pos: 0, deg: 6, len: 6 },
        { pos: 7, deg: 5, len: 5 },
        { pos: 13, deg: 6, len: 3 },
      ],
      // [6] Resolution — choir resolution, peaceful landing
      [
        { pos: 0, deg: 4, len: 4 },
        { pos: 5, deg: 2, len: 4 },
        { pos: 10, deg: 0, len: 6 },
      ],
      // [7] Closing — the last voice fades
      [
        { pos: 0, deg: 2, len: 5 },
        { pos: 7, deg: 0, len: 8 },
      ],
    ],
  },

  // ── GROUP 18 · levels 86-90 · "Nattoun's True Form" ─────────────────────
  // Glitch/broken DNA: stuttering, bit-crushed, machine becoming human.
  {
    name: "Nattoun's True Form",
    phrases: [
      // [0] Opening — glitchy stutter, only two events
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 4, deg: 0, len: 5 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [1] Main motif — glitchy stutter then sudden burst
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [2] Response — broken arpeggio, pieces falling
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 6, deg: 0, len: 1 },
        { pos: 9, deg: 2, len: 1 },
        { pos: 12, deg: 4, len: 1 },
        { pos: 15, deg: 6, len: 1 },
      ],
      // [3] Development — machine becomes human: chaos → melody
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 2, len: 2 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // [4] Build — more human now, almost melodic
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 5, deg: 4, len: 2 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 2 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // [5] Climax — fully human for one moment, beautiful
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 4, len: 3 },
        { pos: 11, deg: 2, len: 4 },
      ],
      // [6] Resolution — back to machine, but changed
      [
        { pos: 0, deg: 2, len: 2 },
        { pos: 3, deg: 0, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 9, deg: 0, len: 6 },
      ],
      // [7] Closing — final glitch and silence
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 3, deg: 0, len: 1 },
        { pos: 8, deg: 0, len: 7 },
      ],
    ],
  },

  // ── GROUP 19 · levels 91-95 · "One Nose To Rule Them All" ────────────────
  // Final dungeon: everything maxed, relentless runs + long climax notes.
  {
    name: "One Nose To Rule Them All",
    phrases: [
      // [0] Opening — two powerful low notes, the end begins
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 6, deg: 5, len: 4 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // [1] Main motif — relentless final dungeon run
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 6, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 3, len: 1 },
        { pos: 14, deg: 2, len: 1 },
      ],
      // [2] Response — dramatic pause then explosion
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 5, deg: 6, len: 4 },
        { pos: 10, deg: 5, len: 2 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // [3] Development — final boss second phase begins
      [
        { pos: 0, deg: 5, len: 1 },
        { pos: 2, deg: 6, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 1 },
        { pos: 12, deg: 5, len: 3 },
      ],
      // [4] Build — ascending toward the inevitable
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 6, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [5] Climax — the final form, maximum drama
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 3, len: 1 },
        { pos: 5, deg: 6, len: 4 },
        { pos: 10, deg: 5, len: 5 },
      ],
      // [6] Resolution — victorious descent, you won
      [
        { pos: 0, deg: 5, len: 2 },
        { pos: 3, deg: 3, len: 2 },
        { pos: 6, deg: 2, len: 2 },
        { pos: 9, deg: 0, len: 6 },
      ],
      // [7] Closing — two epic final chords
      [
        { pos: 0, deg: 3, len: 3 },
        { pos: 5, deg: 0, len: 10 },
      ],
    ],
  },

  // ── GROUP 20 · levels 96-100 · "BAHAMAS LAND FOREVER" ───────────────────
  // Hall of legends: majestic, complete, references the opening of Group 1.
  {
    name: "BAHAMAS LAND FOREVER",
    phrases: [
      // [0] Opening — the opening theme of group 1 RETURNS, now vast
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 6, deg: 2, len: 3 },
        { pos: 11, deg: 4, len: 4 },
      ],
      // [1] Main motif — grand version of the iconic greeting
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 1, len: 1 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 8, deg: 4, len: 3 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // [2] Response — everything you learned: wide leap + run + resolve
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 4, len: 1 },
        { pos: 5, deg: 2, len: 1 },
        { pos: 7, deg: 4, len: 1 },
        { pos: 9, deg: 6, len: 1 },
        { pos: 11, deg: 5, len: 1 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // [3] Development — the whole game in one phrase
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 6, len: 2 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 4, len: 1 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // [4] Build — ascending through every level
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 6, len: 1 },
        { pos: 14, deg: 5, len: 1 },
      ],
      // [5] Climax — the most majestic moment in the game
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 6, len: 4 },
        { pos: 12, deg: 4, len: 3 },
      ],
      // [6] Resolution — the final cadence, home at last
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 6, len: 2 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 2, len: 1 },
        { pos: 14, deg: 0, len: 2 },
      ],
      // [7] Closing — the first two notes of the very first phrase, echoed
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 6, deg: 0, len: 9 },
      ],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function getPhrasesForLevel(level: number): PhraseGroup {
  const idx = Math.min(19, Math.floor((Math.max(1, level) - 1) / 5));
  return LEVEL_PHRASES[idx];
}

export function getComposedPhrase(level: number, phraseRole: number): LeadPhrase {
  const group = getPhrasesForLevel(level);
  return group.phrases[phraseRole % group.phrases.length];
}

export function getNumPhrases(level: number): number {
  return getPhrasesForLevel(level).phrases.length;
}
