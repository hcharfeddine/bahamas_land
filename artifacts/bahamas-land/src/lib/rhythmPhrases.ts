// rhythmPhrases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hand-composed lead phrases for all 20 level groups (every 5 levels).
// Each phrase is a LeadPhrase: array of { pos, deg, len }
//   pos = 16th-note position within the bar (0–15)
//   deg = scale degree (0=root, 1=2nd, 2=3rd, 3=4th, 4=5th, 5=6th, 6=7th)
//   len = duration in 16th notes
//
// Musical DNA per group:
//   1-5   → Pokémon town: cheerful, stepwise, major pentatonic
//   6-10  → Zelda overworld: heroic, bouncy, arpeggios
//   11-15 → FF battle: tense, syncopated, minor
//   16-20 → Mario underground: quirky, chromatic, funky
//   21-25 → Chrono Trigger: emotional, wide leaps, major 7th
//   26-30 → Castlevania: dark, fast runs, harmonic minor
//   31-35 → Donkey Kong Country: groovy, bass-led, swung
//   36-40 → Mega Man: aggressive, technical, fast 16ths
//   41-45 → Zelda dungeon: mysterious, sparse, tritone
//   46-50 → FF boss: cinematic, dramatic, full range
//   51-55 → Sonic: blazing fast, major, upbeat rush
//   56-60 → Silent Hill-ish: dissonant, slow, unsettling
//   61-65 → Tekken/fighting: punchy, rhythmic, powerful
//   66-70 → FF piano ballad: slow, emotional, ornamental
//   71-75 → Military march: dotted rhythms, brass-like
//   76-80 → Chaos realm: atonal bursts, unpredictable
//   81-85 → Epic choir: long notes, powerful leaps
//   86-90 → Glitch/broken: stuttering, bit-crushed feel
//   91-95 → Final dungeon: everything fast + dramatic
//   96-100 → Hall of legends: majestic, complete, iconic
// ─────────────────────────────────────────────────────────────────────────────

import type { LeadPhrase } from "./rhythmTracks";

// Each group has multiple phrases (A, B, C) so verse/chorus/bridge all differ.
export type PhraseGroup = {
  name: string;
  phrases: LeadPhrase[];
};

export const LEVEL_PHRASES: PhraseGroup[] = [

  // ── GROUP 1 · levels 1-5 · "Welcome to Bahamas Land" ─────────────────────
  // Pokémon Pallet Town DNA: gentle stepwise ascent, land on the 5th, breathe.
  {
    name: "Welcome to Bahamas Land",
    phrases: [
      // A — the iconic greeting motif (step up, skip, resolve)
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 1, len: 1 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 8, deg: 4, len: 3 },
        { pos: 12, deg: 2, len: 2 },
      ],
      // B — answer phrase, descends back home
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 3, len: 1 },
        { pos: 5, deg: 2, len: 1 },
        { pos: 7, deg: 1, len: 2 },
        { pos: 10, deg: 0, len: 4 },
      ],
      // C — chorus lift, reaches the octave
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 6, len: 2 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 2 · levels 6-10 · "The Dog Takes Charge" ───────────────────────
  // Zelda overworld DNA: heroic arpeggio launch, bouncy rhythm, triumphant land.
  {
    name: "The Dog Takes Charge",
    phrases: [
      // A — heroic fanfare arpeggio
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 7, deg: 6, len: 1 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 3 },
      ],
      // B — running 8ths, quest feeling
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 1, len: 1 },
        { pos: 8, deg: 0, len: 2 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // C — wide leap, Zelda secret-found moment
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 6, len: 1 },
        { pos: 5, deg: 4, len: 2 },
        { pos: 8, deg: 2, len: 2 },
        { pos: 11, deg: 0, len: 4 },
      ],
    ],
  },

  // ── GROUP 3 · levels 11-15 · "The Nose Strikes Back" ─────────────────────
  // FF battle theme DNA: syncopated, tense, minor key urgency.
  {
    name: "The Nose Strikes Back",
    phrases: [
      // A — syncopated battle motif (off-beat attack)
      [
        { pos: 1, deg: 0, len: 1 },
        { pos: 3, deg: 0, len: 1 },
        { pos: 5, deg: 5, len: 2 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 3, len: 1 },
        { pos: 12, deg: 1, len: 3 },
      ],
      // B — ascending minor run, tension builds
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 5, len: 2 },
        { pos: 11, deg: 6, len: 1 },
        { pos: 13, deg: 5, len: 2 },
      ],
      // C — aggressive stabs, FF climax feel
      [
        { pos: 0, deg: 5, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 3, len: 1 },
        { pos: 11, deg: 1, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 4 · levels 16-20 · "Underground Kingdom" ───────────────────────
  // Mario underground DNA: chromatic quirk, funky bouncy feel, unexpected turns.
  {
    name: "Underground Kingdom",
    phrases: [
      // A — the classic chromatic descend + bounce
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
      // B — funky syncopated hop
      [
        { pos: 1, deg: 0, len: 1 },
        { pos: 3, deg: 3, len: 2 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 1, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // C — quirky chromatic needle (the "underground" moment)
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 1, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 1, len: 1 },
        { pos: 8, deg: 0, len: 2 },
        { pos: 11, deg: 4, len: 1 },
        { pos: 13, deg: 2, len: 2 },
      ],
    ],
  },

  // ── GROUP 5 · levels 21-25 · "Kingdom March" ─────────────────────────────
  // Chrono Trigger DNA: emotional wide leaps, major 7th colour, bittersweet.
  {
    name: "Kingdom March",
    phrases: [
      // A — Chrono's signature wide leap + float down
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 5, len: 3 },
        { pos: 7, deg: 4, len: 2 },
        { pos: 10, deg: 2, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // B — the emotional answer, touches maj7
      [
        { pos: 0, deg: 2, len: 2 },
        { pos: 3, deg: 6, len: 2 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // C — full arc, question to resolution
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 4, len: 1 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 6 · levels 26-30 · "Danger Zone" ───────────────────────────────
  // Castlevania DNA: harmonic minor, fast descending runs, gothic drama.
  {
    name: "Danger Zone",
    phrases: [
      // A — the classic Castlevania descending minor run
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 2, len: 1 },
        { pos: 10, deg: 1, len: 1 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // B — dramatic leap up then fall
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 6, len: 2 },
        { pos: 5, deg: 5, len: 1 },
        { pos: 7, deg: 4, len: 1 },
        { pos: 9, deg: 2, len: 1 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // C — harmonic minor tension: the augmented 2nd moment
      [
        { pos: 0, deg: 2, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 2 },
        { pos: 7, deg: 6, len: 1 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 3, len: 1 },
        { pos: 13, deg: 2, len: 2 },
      ],
    ],
  },

  // ── GROUP 7 · levels 31-35 · "The Underground" ───────────────────────────
  // Donkey Kong Country DNA: deep groove, bass-first, swung feel, soulful.
  {
    name: "The Underground",
    phrases: [
      // A — low groove, slow build (DKC aquatic feeling)
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 4, deg: 2, len: 2 },
        { pos: 7, deg: 3, len: 1 },
        { pos: 9, deg: 4, len: 3 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // B — swung 8ths, soulful answer
      [
        { pos: 1, deg: 4, len: 2 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 2, len: 2 },
        { pos: 9, deg: 1, len: 1 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // C — big DKC lush moment, wide + slow
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 4, len: 3 },
        { pos: 7, deg: 6, len: 2 },
        { pos: 10, deg: 4, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 8 · levels 36-40 · "Nattoun's Rage" ────────────────────────────
  // Mega Man DNA: aggressive, technical, fast 16th-note runs, pure energy.
  {
    name: "Nattoun's Rage",
    phrases: [
      // A — Mega Man rapid-fire 16ths
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
      // B — the Wily Castle ascending burst
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 6, len: 1 },
        { pos: 6, deg: 5, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 6, len: 1 },
        { pos: 12, deg: 4, len: 3 },
      ],
      // C — punchy stabs + run to climax
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 3, len: 2 },
        { pos: 7, deg: 4, len: 1 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 6, len: 1 },
        { pos: 13, deg: 5, len: 2 },
      ],
    ],
  },

  // ── GROUP 9 · levels 41-45 · "Ancient Temple" ────────────────────────────
  // Zelda dungeon DNA: sparse, mysterious, tritone colour, eerie silence.
  {
    name: "Ancient Temple",
    phrases: [
      // A — sparse dungeon drip (long silences = tension)
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 5, deg: 5, len: 2 },
        { pos: 9, deg: 3, len: 2 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // B — the tritone moment (deg 3 = diminished 5th in minor)
      [
        { pos: 0, deg: 2, len: 2 },
        { pos: 4, deg: 3, len: 3 },
        { pos: 8, deg: 5, len: 2 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // C — dark arpeggio rising from the depths
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 5, deg: 3, len: 2 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 2 },
        { pos: 13, deg: 5, len: 2 },
      ],
    ],
  },

  // ── GROUP 10 · levels 46-50 · "Halfway Boss" ─────────────────────────────
  // FF boss DNA: cinematic, full range, dramatic pauses, orchestral sweep.
  {
    name: "Halfway Boss",
    phrases: [
      // A — the ominous boss entrance (low → high leap)
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 6, len: 4 },
        { pos: 9, deg: 5, len: 2 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // B — ff boss second theme: counter-melody descend
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 5, len: 1 },
        { pos: 5, deg: 4, len: 1 },
        { pos: 7, deg: 3, len: 2 },
        { pos: 10, deg: 1, len: 1 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // C — full climax sweep, everything at once
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 6, len: 2 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 11, deg: 3, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 11 · levels 51-55 · "Electric Storm" ───────────────────────────
  // Sonic DNA: blazing fast, C major rush, upbeat energy, speed is the melody.
  {
    name: "Electric Storm",
    phrases: [
      // A — Green Hill Zone DNA: bouncy, fast, major pentatonic run
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 0, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 6, len: 2 },
      ],
      // B — speed burst + land (Chemical Plant feel)
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 6, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 4, len: 1 },
        { pos: 8, deg: 2, len: 1 },
        { pos: 10, deg: 4, len: 1 },
        { pos: 12, deg: 0, len: 3 },
      ],
      // C — Sonic invincibility: pure joy run
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
    ],
  },

  // ── GROUP 12 · levels 56-60 · "The Forbidden City" ───────────────────────
  // Silent Hill DNA: dissonant, slow, wide interval leaps, dread & beauty.
  {
    name: "The Forbidden City",
    phrases: [
      // A — unsettling slow melody with tritone
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 5, deg: 3, len: 3 },
        { pos: 9, deg: 5, len: 3 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // B — dissonant answer, minor 2nd rub
      [
        { pos: 0, deg: 5, len: 3 },
        { pos: 4, deg: 6, len: 2 },
        { pos: 7, deg: 5, len: 3 },
        { pos: 11, deg: 3, len: 4 },
      ],
      // C — the haunting resolution that doesn't fully resolve
      [
        { pos: 0, deg: 3, len: 2 },
        { pos: 3, deg: 1, len: 3 },
        { pos: 7, deg: 0, len: 4 },
        { pos: 12, deg: 3, len: 3 },
      ],
    ],
  },

  // ── GROUP 13 · levels 61-65 · "Nattoun Goes Supersonic" ──────────────────
  // Tekken/fighting game DNA: punchy rhythmic hits, powerful, masculine energy.
  {
    name: "Nattoun Goes Supersonic",
    phrases: [
      // A — fighting game punchy stabs
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 4, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
      // B — aggressive low→high power move
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 6, deg: 6, len: 3 },
        { pos: 10, deg: 5, len: 2 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // C — victory riff, strong and complete
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 2, deg: 5, len: 1 },
        { pos: 4, deg: 4, len: 1 },
        { pos: 6, deg: 2, len: 1 },
        { pos: 8, deg: 4, len: 1 },
        { pos: 10, deg: 5, len: 1 },
        { pos: 12, deg: 6, len: 3 },
      ],
    ],
  },

  // ── GROUP 14 · levels 66-70 · "The Sad King" ─────────────────────────────
  // FF piano ballad DNA: slow, ornamental, emotional, heartbreaking resolution.
  {
    name: "The Sad King",
    phrases: [
      // A — Aerith's theme DNA: slow descent, emotional
      [
        { pos: 0, deg: 4, len: 3 },
        { pos: 4, deg: 3, len: 2 },
        { pos: 7, deg: 2, len: 3 },
        { pos: 11, deg: 0, len: 4 },
      ],
      // B — ornamented ascent, reaches for hope
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 2, len: 2 },
        { pos: 6, deg: 4, len: 2 },
        { pos: 9, deg: 6, len: 3 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // C — the aching resolution
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 5, len: 2 },
        { pos: 6, deg: 4, len: 2 },
        { pos: 9, deg: 2, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
    ],
  },

  // ── GROUP 15 · levels 71-75 · "Final Army" ───────────────────────────────
  // Military march DNA: dotted rhythms, brass call-and-response, precise.
  {
    name: "Final Army",
    phrases: [
      // A — dotted march rhythm (long-short-long pattern)
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 0, len: 1 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 8, deg: 4, len: 2 },
        { pos: 11, deg: 4, len: 1 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // B — response phrase, brass answer
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 5, len: 1 },
        { pos: 5, deg: 4, len: 1 },
        { pos: 7, deg: 2, len: 2 },
        { pos: 10, deg: 0, len: 5 },
      ],
      // C — full march climax
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 2, len: 1 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 4, len: 1 },
        { pos: 11, deg: 2, len: 1 },
        { pos: 13, deg: 0, len: 2 },
      ],
    ],
  },

  // ── GROUP 16 · levels 76-80 · "Chaos Realm" ──────────────────────────────
  // Atonal/chaos DNA: unpredictable intervals, no tonal center, pure tension.
  {
    name: "Chaos Realm",
    phrases: [
      // A — chaotic wide leaps, no stepwise motion at all
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 6, len: 1 },
        { pos: 4, deg: 2, len: 1 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 1, len: 1 },
        { pos: 11, deg: 4, len: 1 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // B — dissonant stutter (same note repeated then sudden leap)
      [
        { pos: 0, deg: 3, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 3, len: 1 },
        { pos: 6, deg: 0, len: 2 },
        { pos: 9, deg: 6, len: 2 },
        { pos: 12, deg: 2, len: 3 },
      ],
      // C — falling apart (descends chromatically through the scale)
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
    ],
  },

  // ── GROUP 17 · levels 81-85 · "The Last Kingdom" ─────────────────────────
  // Epic choir DNA: long sustained notes, massive leaps, powerful + noble.
  {
    name: "The Last Kingdom",
    phrases: [
      // A — choir long tones, each note held like a breath
      [
        { pos: 0, deg: 0, len: 4 },
        { pos: 5, deg: 4, len: 4 },
        { pos: 10, deg: 6, len: 5 },
      ],
      // B — powerful octave leap then resolution
      [
        { pos: 0, deg: 0, len: 3 },
        { pos: 4, deg: 6, len: 4 },
        { pos: 9, deg: 4, len: 3 },
        { pos: 13, deg: 2, len: 2 },
      ],
      // C — full choir sweep, top to bottom
      [
        { pos: 0, deg: 6, len: 3 },
        { pos: 4, deg: 4, len: 2 },
        { pos: 7, deg: 2, len: 3 },
        { pos: 11, deg: 0, len: 4 },
      ],
    ],
  },

  // ── GROUP 18 · levels 86-90 · "Nattoun's True Form" ─────────────────────
  // Glitch/broken DNA: stuttering, unexpected rests, mechanical then human.
  {
    name: "Nattoun's True Form",
    phrases: [
      // A — glitchy stutter then sudden burst
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 4, deg: 0, len: 1 },
        { pos: 7, deg: 5, len: 1 },
        { pos: 9, deg: 5, len: 1 },
        { pos: 12, deg: 3, len: 3 },
      ],
      // B — broken arpeggio, pieces falling
      [
        { pos: 0, deg: 4, len: 1 },
        { pos: 3, deg: 2, len: 1 },
        { pos: 6, deg: 0, len: 1 },
        { pos: 9, deg: 2, len: 1 },
        { pos: 12, deg: 4, len: 1 },
        { pos: 15, deg: 6, len: 1 },
      ],
      // C — machine becomes human: chaos → melody
      [
        { pos: 0, deg: 6, len: 1 },
        { pos: 2, deg: 3, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 2, len: 2 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 0, len: 3 },
      ],
    ],
  },

  // ── GROUP 19 · levels 91-95 · "One Nose To Rule Them All" ────────────────
  // Final dungeon DNA: everything maxed, dramatic runs + long climax notes.
  {
    name: "One Nose To Rule Them All",
    phrases: [
      // A — relentless final dungeon run
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
      // B — the dramatic pause then explosion
      [
        { pos: 0, deg: 0, len: 1 },
        { pos: 2, deg: 0, len: 1 },
        { pos: 5, deg: 6, len: 4 },
        { pos: 10, deg: 5, len: 2 },
        { pos: 13, deg: 3, len: 2 },
      ],
      // C — final boss second phase: pure intensity
      [
        { pos: 0, deg: 5, len: 1 },
        { pos: 2, deg: 6, len: 1 },
        { pos: 4, deg: 5, len: 1 },
        { pos: 6, deg: 3, len: 1 },
        { pos: 8, deg: 5, len: 1 },
        { pos: 10, deg: 6, len: 1 },
        { pos: 12, deg: 5, len: 3 },
      ],
    ],
  },

  // ── GROUP 20 · levels 96-100 · "BAHAMAS LAND FOREVER" ───────────────────
  // Hall of legends DNA: majestic, complete, every technique combined.
  // References the opening melody of group 1 — the game remembers where you began.
  {
    name: "BAHAMAS LAND FOREVER",
    phrases: [
      // A — the opening theme RETURNS, now grand and full
      [
        { pos: 0, deg: 0, len: 2 },
        { pos: 3, deg: 1, len: 1 },
        { pos: 5, deg: 2, len: 2 },
        { pos: 8, deg: 4, len: 3 },
        { pos: 12, deg: 6, len: 3 },
      ],
      // B — everything you learned: wide leap + fast run + resolution
      [
        { pos: 0, deg: 6, len: 2 },
        { pos: 3, deg: 4, len: 1 },
        { pos: 5, deg: 2, len: 1 },
        { pos: 7, deg: 4, len: 1 },
        { pos: 9, deg: 6, len: 1 },
        { pos: 11, deg: 5, len: 1 },
        { pos: 13, deg: 4, len: 2 },
      ],
      // C — the final cadence: the one (1) nose to rule them all lands home
      [
        { pos: 0, deg: 4, len: 2 },
        { pos: 3, deg: 6, len: 2 },
        { pos: 6, deg: 5, len: 2 },
        { pos: 9, deg: 4, len: 2 },
        { pos: 12, deg: 2, len: 1 },
        { pos: 14, deg: 0, len: 2 },
      ],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Public API: get the phrase group for a given level (1-100).
// ─────────────────────────────────────────────────────────────────────────────

export function getPhrasesForLevel(level: number): PhraseGroup {
  const idx = Math.min(19, Math.floor((Math.max(1, level) - 1) / 5));
  return LEVEL_PHRASES[idx];
}

// Drop-in replacement for genLeadPhrase in rhythmSong.ts.
// Call this instead of the random generator.
// phraseRole: 0=verse(A), 1=chorus(B), 2=bridge(C)
export function getComposedPhrase(level: number, phraseRole: number): LeadPhrase {
  const group = getPhrasesForLevel(level);
  return group.phrases[phraseRole % group.phrases.length];
}