import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { useLocalStorage } from "@/lib/store";
import { unlock } from "@/lib/achievements";
import { playRockLoop } from "@/lib/rockLoop";
import { getSongForLevel, type SongPlan } from "@/lib/rhythmSong";

// ---------------------------------------------------------------
// LANES + CONSTANTS
// ---------------------------------------------------------------

type LaneKey = "ArrowLeft" | "ArrowDown" | "ArrowUp" | "ArrowRight";
const LANES: LaneKey[] = [
  "ArrowLeft",
  "ArrowDown",
  "ArrowUp",
  "ArrowRight",
];
const LANE_GLYPH: Record<LaneKey, string> = {
  ArrowLeft: "◀",
  ArrowDown: "▼",
  ArrowUp: "▲",
  ArrowRight: "▶",
};
const LANE_COLOR: Record<LaneKey, string> = {
  ArrowLeft: "#ef4444",
  ArrowDown: "#22c55e",
  ArrowUp: "#facc15",
  ArrowRight: "#3b82f6",
};

const SYMBOL_NOTES = ["⚡", "✦", "💀", "🔥", "👁"];

// ---------------------------------------------------------------
// MUSIC-DRIVEN NOTE GENERATOR
// Converts a SongPlan's drum/lead patterns into Note objects so
// each level has a unique, genre-accurate note sequence.
// ---------------------------------------------------------------

function generateNotesFromSong(
  song: SongPlan,
  p: LevelParams,
  bpm: number,
): Note[] {
  // Seeded RNG — same level always produces the same notes.
  let rngState = (song.level * 7919 + 49297) >>> 0;
  const rng = () => {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const beat = 60000 / bpm;
  const sixteenth = beat / 4;
  const barMs = sixteenth * 16;
  const leadIn = 600;
  const genre = song.genre;

  // ── Level-unique lane permutation ────────────────────────────────────────
  // Each level gets its own shuffle of the 4 lanes.  This means:
  //   level 1: kick → ▶, snare → ▲, hihat-on → ◀, hihat-off → ▼  (example)
  //   level 2: kick → ▲, snare → ◀, hihat-on → ▶, hihat-off → ▼  (different)
  // The 4 "roles" are: [kickRole, snareRole, hihatOnRole, hihatOffRole].
  const basePerm = [...LANES] as LaneKey[];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [basePerm[i], basePerm[j]] = [basePerm[j], basePerm[i]];
  }

  // Per-section twist: rotate the permutation differently for each section
  // so verse ≠ chorus ≠ bridge even within the same level.
  const SECTION_TWIST: Record<string, number> = {
    intro: 0,
    verse: Math.floor(rng() * 4),
    chorus: Math.floor(rng() * 4),
    bridge: Math.floor(rng() * 4),
    breakdown: Math.floor(rng() * 4),
    outro: 0,
  };

  // Per-level hihat thinning probability: some levels are denser than others
  // even within the same tier. Range: skip 10% – 45% of hihat hits.
  const hihatSkip = 0.10 + rng() * 0.35;

  type Candidate = {
    spawnAt: number;
    lane: LaneKey;
    isHold: boolean;
    holdMs: number;
    priority: number;
    isLead: boolean;
  };
  const candidates: Candidate[] = [];

  type SecSound = { drums: { kick: number[]; snare: number[]; hihat: number[] }; chug: number[] };
  const secSound = (section: string): SecSound =>
    (genre as unknown as Record<string, SecSound>)[section];

  // Helper: apply a rotation to the base permutation for a given section.
  const permForSection = (section: string): LaneKey[] => {
    const twist = SECTION_TWIST[section] ?? 0;
    return basePerm.map((_, i) => basePerm[(i + twist) % 4]);
  };

  song.bars.forEach((bar) => {
    const barStart = bar.index * barMs + leadIn;
    const isFill = bar.isLastInSection;
    const sec = secSound(bar.section);
    const drums = isFill ? genre.fill : sec.drums;
    const chug = sec.chug;
    const perm = permForSection(bar.section);

    // perm[0] = lane for kick-like beats (strong downbeats)
    // perm[1] = lane for snare-like beats (backbeats)
    // perm[2] = lane for on-beat hi-hats
    // perm[3] = lane for off-beat hi-hats

    // ── Kick (priority 3) ────────────────────────────────────────────────
    drums.kick.forEach((pos16) => {
      candidates.push({ spawnAt: barStart + pos16 * sixteenth, lane: perm[0], isHold: false, holdMs: 0, priority: 3, isLead: false });
    });

    // ── Snare (priority 2) ───────────────────────────────────────────────
    drums.snare.forEach((pos16) => {
      candidates.push({ spawnAt: barStart + pos16 * sixteenth, lane: perm[1], isHold: false, holdMs: 0, priority: 2, isLead: false });
    });

    // ── Hi-hat (priority 1) with per-level thinning ──────────────────────
    drums.hihat.forEach((pos16) => {
      if (rng() < hihatSkip) return; // skip varies per level → unique density
      const isOnBeat = pos16 % 4 === 0;
      candidates.push({ spawnAt: barStart + pos16 * sixteenth, lane: isOnBeat ? perm[2] : perm[3], isHold: false, holdMs: 0, priority: 1, isLead: false });
    });

    // ── Long-sustain holds for doom/stadium genres ───────────────────────
    if (genre.chugTailMul >= 5.0 && p.holdChance > 0) {
      chug.forEach((pos16) => {
        if (pos16 % 8 !== 0) return;
        const holdDur = Math.min(sixteenth * 8, 1000);
        candidates.push({ spawnAt: barStart + pos16 * sixteenth, lane: (pos16 / 8) % 2 === 0 ? perm[2] : perm[3], isHold: true, holdMs: holdDur, priority: 2, isLead: false });
      });
    }

    // ── Lead melody (already unique per level via song.leadPhrase) ────────
    if (bar.hasLead && !isFill && song.leadPhrase.length > 0) {
      song.leadPhrase.forEach((ev) => {
        const spawnAt = barStart + ev.pos * sixteenth;
        const deg = ev.deg % 12;
        // Map scale degree to lane: low→Left, mid-low→Down, mid-high→Up, high→Right
        const lane: LaneKey = deg <= 2 ? "ArrowLeft" : deg <= 5 ? "ArrowDown" : deg <= 8 ? "ArrowUp" : "ArrowRight";
        candidates.push({ spawnAt, lane, isHold: ev.len >= 8, holdMs: ev.len * sixteenth, priority: 3, isLead: true });
      });
    }
  });

  // Sort by time; ties resolved by priority (higher = keep).
  candidates.sort((a, b) => a.spawnAt - b.spawnAt || b.priority - a.priority);

  // Density filter: enforce min gap per lane + global min gap.
  const minLaneGap = Math.max(p.noteSpawnMs * 0.6, 90);
  const minGlobalGap = Math.max(p.noteSpawnMs * 0.22, 40);
  const lastPerLane: Record<LaneKey, number> = { ArrowLeft: -Infinity, ArrowDown: -Infinity, ArrowUp: -Infinity, ArrowRight: -Infinity };
  let lastAny = -Infinity;

  const notes: Note[] = [];
  let idCursor = 0;

  candidates.forEach((c) => {
    if (c.spawnAt - lastPerLane[c.lane] < minLaneGap) return;
    if (c.priority < 2 && c.spawnAt - lastAny < minGlobalGap) return;
    lastPerLane[c.lane] = c.spawnAt;
    lastAny = c.spawnAt;

    const addSymbol = (c.isLead && p.symbolChance > 0) || rng() < p.symbolChance;
    const symbol = addSymbol ? SYMBOL_NOTES[Math.floor(rng() * SYMBOL_NOTES.length)] : undefined;
    const doHold = c.isHold && p.holdChance > 0;

    notes.push({
      id: ++idCursor,
      lane: c.lane,
      spawnAt: c.spawnAt,
      hitAt: c.spawnAt + p.travelMs,
      travelMs: p.travelMs,
      type: doHold ? "hold" : "tap",
      holdMs: doHold ? c.holdMs : 0,
      symbol,
      status: "pending",
    });
  });

  return notes;
}

const MAX_LEVEL = 100;
const HIT_ZONE_PCT = 0.85; // hit line at 85% of canvas height

// ---------------------------------------------------------------
// LEVEL DIFFICULTY CURVE
// ---------------------------------------------------------------

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type LevelParams = {
  durationMs: number;
  noteSpawnMs: number;
  travelMs: number;
  hitWindowMs: number;
  holdChance: number;
  symbolChance: number;
  multiChance: number;
  bpm: number;
  passScorePct: number; // fraction of notes that must be hit to pass
};

function getLevelParams(level: number): LevelParams {
  const t = (level - 1) / (MAX_LEVEL - 1); // 0..1
  // BPM bumps up within each tier so the music keeps getting faster even
  // while the track preset stays the same for ~10 levels.
  const tierStep = ((level - 1) % 10) / 9; // 0..1 within tier
  const tierBaseBpm = lerp(108, 200, t);
  const bpm = Math.round(tierBaseBpm + tierStep * 12);
  return {
    durationMs: Math.round(lerp(28000, 75000, t)),
    noteSpawnMs: Math.round(lerp(950, 230, t)),
    travelMs: Math.round(lerp(1700, 520, t)),
    hitWindowMs: Math.round(lerp(220, 90, t)),
    holdChance: level >= 8 ? Math.min(0.5, (level - 8) / 60) : 0,
    symbolChance: level >= 20 ? Math.min(0.4, (level - 20) / 80) : 0,
    multiChance: level >= 40 ? Math.min(0.35, (level - 40) / 70) : 0,
    bpm,
    passScorePct: lerp(0.45, 0.7, t),
  };
}

// ---------------------------------------------------------------
// NOTE TYPES
// ---------------------------------------------------------------

type Note = {
  id: number;
  lane: LaneKey;
  spawnAt: number; // ms from game start
  hitAt: number;   // ms from game start (when it reaches hit zone)
  travelMs: number;
  type: "tap" | "hold";
  holdMs: number;  // 0 for tap
  symbol?: string; // overlay
  status: "pending" | "active" | "holding" | "hit" | "miss";
  hitMs?: number;  // when player started hit (for hold)
  pointsAwarded?: number;
};

type GameState = {
  startedAt: number;
  notes: Note[];
  spawnCursor: number; // ms — next time we should spawn
  noteIdCursor: number;
  score: number;
  combo: number;
  bestCombo: number;
  hp: number;
  hits: number;
  misses: number;
  perfects: number;
  pulse: number; // visual pulse 0..1
};

// ---------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------

type Mode = "menu" | "playing" | "won" | "lost";

export function RhythmGame() {
  const [highestLevel, setHighestLevel] = useLocalStorage<number>(
    "ogs_rhythm_highest",
    1,
  );
  const [selectedLevel, setSelectedLevel] = useLocalStorage<number>(
    "ogs_rhythm_selected",
    1,
  );
  const [mode, setMode] = useState<Mode>("menu");
  const [tick, setTick] = useState(0);
  const [musicBeat, setMusicBeat] = useState(0);

  const params = getLevelParams(selectedLevel);

  const stateRef = useRef<GameState>({
    startedAt: 0,
    notes: [],
    spawnCursor: 0,
    noteIdCursor: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hp: 100,
    hits: 0,
    misses: 0,
    perfects: 0,
    pulse: 0,
  });
  const keysDownRef = useRef<Record<LaneKey, boolean>>({
    ArrowLeft: false,
    ArrowDown: false,
    ArrowUp: false,
    ArrowRight: false,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopMusicRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const flashRef = useRef<Record<LaneKey, number>>({
    ArrowLeft: 0,
    ArrowDown: 0,
    ArrowUp: 0,
    ArrowRight: 0,
  });

  // -------------------------------------------------------------
  // GAME LIFECYCLE
  // -------------------------------------------------------------

  const startLevel = useCallback(() => {
    const p = getLevelParams(selectedLevel);
    // Build the song plan first — it's used for both note generation and audio.
    const song = getSongForLevel(selectedLevel, p.bpm, p.durationMs + 1500);
    // Pre-generate the full note sequence from the song's musical structure.
    const preNotes = generateNotesFromSong(song, p, p.bpm);
    stateRef.current = {
      startedAt: performance.now(),
      notes: preNotes,
      spawnCursor: Infinity, // disabled — notes are pre-generated
      noteIdCursor: preNotes.length,
      score: 0,
      combo: 0,
      bestCombo: 0,
      hp: 100,
      hits: 0,
      misses: 0,
      perfects: 0,
      pulse: 0,
    };
    keysDownRef.current = {
      ArrowLeft: false,
      ArrowDown: false,
      ArrowUp: false,
      ArrowRight: false,
    };
    setMode("playing");

    // Music
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = audioCtxRef.current ?? new Ctx();
      if (ctx.state === "suspended") void ctx.resume();
      audioCtxRef.current = ctx;
      stopMusicRef.current?.();
      stopMusicRef.current = playRockLoop(ctx, {
        song,
        durationMs: p.durationMs + 1500,
        onBeat: (b) => setMusicBeat(b),
      });
    } catch {
      /* ignore audio failure */
    }
  }, [selectedLevel]);

  const stopMusic = useCallback(() => {
    stopMusicRef.current?.();
    stopMusicRef.current = null;
  }, []);

  const exitToMenu = useCallback(() => {
    stopMusic();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setMode("menu");
  }, [stopMusic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        audioCtxRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, [stopMusic]);

  // -------------------------------------------------------------
  // GAME LOOP
  // -------------------------------------------------------------

  useEffect(() => {
    if (mode !== "playing") return;
    const p = getLevelParams(selectedLevel);

    const checkExpired = (nowMs: number) => {
      const s = stateRef.current;
      for (const n of s.notes) {
        if (n.status === "hit" || n.status === "miss") continue;
        const tailMs = n.hitAt + (n.type === "hold" ? n.holdMs : 0);
        if (nowMs > tailMs + p.hitWindowMs) {
          if (n.status === "holding") {
            // Released too early or never released — partial credit handled
            // when key was released; if still holding we count miss.
            n.status = "miss";
          } else {
            n.status = "miss";
          }
          s.misses += 1;
          s.combo = 0;
          s.hp = Math.max(0, s.hp - 10);
        }
      }
    };

    const loop = () => {
      const s = stateRef.current;
      const nowMs = performance.now() - s.startedAt;

      checkExpired(nowMs);

      // Decay flashes
      Object.keys(flashRef.current).forEach((k) => {
        const lk = k as LaneKey;
        if (flashRef.current[lk] > 0) {
          flashRef.current[lk] = Math.max(0, flashRef.current[lk] - 0.06);
        }
      });

      // Pulse
      s.pulse = Math.max(0, s.pulse - 0.04);

      // End conditions
      if (s.hp <= 0) {
        setMode("lost");
        stopMusic();
        return;
      }
      const songOver = nowMs > p.durationMs + p.travelMs + 600;
      const allResolved = s.notes.every(
        (n) => n.status === "hit" || n.status === "miss",
      );
      if (songOver && allResolved) {
        const totalNotes = Math.max(1, s.hits + s.misses);
        const perfect = s.hits;
        const pct = perfect / totalNotes;
        const pass = pct >= p.passScorePct;
        if (pass) {
          if (selectedLevel >= highestLevel) {
            setHighestLevel(() => Math.min(MAX_LEVEL, selectedLevel + 1));
          }
          if (selectedLevel >= 10) unlock("rhythmist");
          if (selectedLevel >= 50) unlock("rhythmmaster");
          if (selectedLevel >= 100) unlock("rhythmgod");
          setMode("won");
        } else {
          setMode("lost");
        }
        stopMusic();
        return;
      }

      setTick((x) => x + 1);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedLevel]);

  // -------------------------------------------------------------
  // KEYBOARD HANDLING
  // -------------------------------------------------------------

  const handleKeyDown = useCallback(
    (lane: LaneKey) => {
      if (mode !== "playing") return;
      if (keysDownRef.current[lane]) return;
      keysDownRef.current[lane] = true;
      flashRef.current[lane] = 1;

      const s = stateRef.current;
      const p = getLevelParams(selectedLevel);
      const nowMs = performance.now() - s.startedAt;

      // Find closest pending/active note in this lane within window.
      let bestIdx = -1;
      let bestDelta = Infinity;
      for (let i = 0; i < s.notes.length; i++) {
        const n = s.notes[i];
        if (n.lane !== lane) continue;
        if (n.status === "hit" || n.status === "miss") continue;
        if (n.status === "holding") continue;
        const delta = Math.abs(nowMs - n.hitAt);
        if (delta < bestDelta && delta <= p.hitWindowMs) {
          bestDelta = delta;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) {
        // Whiff — small HP penalty so spamming has a cost.
        s.combo = 0;
        s.hp = Math.max(0, s.hp - 3);
        return;
      }

      const n = s.notes[bestIdx];
      // Quality based on closeness
      const quality =
        bestDelta < p.hitWindowMs * 0.35
          ? "perfect"
          : bestDelta < p.hitWindowMs * 0.7
            ? "great"
            : "good";
      const baseScore = quality === "perfect" ? 120 : quality === "great" ? 80 : 50;
      const bonus = n.symbol ? 60 : 0;

      if (n.type === "tap") {
        n.status = "hit";
        n.pointsAwarded = baseScore + bonus;
        s.score += (baseScore + bonus) * (1 + s.combo * 0.05);
        s.combo += 1;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        s.hits += 1;
        if (quality === "perfect") s.perfects += 1;
        s.hp = Math.min(100, s.hp + (quality === "perfect" ? 4 : 2));
        s.pulse = 1;
      } else {
        // Hold note: start holding
        n.status = "holding";
        n.hitMs = nowMs;
        s.pulse = 1;
      }
    },
    [mode, selectedLevel],
  );

  const handleKeyUp = useCallback(
    (lane: LaneKey) => {
      keysDownRef.current[lane] = false;

      if (mode !== "playing") return;
      const s = stateRef.current;
      const p = getLevelParams(selectedLevel);
      const nowMs = performance.now() - s.startedAt;

      for (const n of s.notes) {
        if (n.lane !== lane) continue;
        if (n.status !== "holding") continue;
        const tailExpected = n.hitAt + n.holdMs;
        const delta = Math.abs(nowMs - tailExpected);
        if (delta <= p.hitWindowMs * 1.4) {
          // Successful hold
          n.status = "hit";
          const base = 200 + (n.symbol ? 80 : 0);
          n.pointsAwarded = base;
          s.score += base * (1 + s.combo * 0.05);
          s.combo += 1;
          s.bestCombo = Math.max(s.bestCombo, s.combo);
          s.hits += 1;
          s.hp = Math.min(100, s.hp + 4);
          s.pulse = 1;
        } else {
          n.status = "miss";
          s.misses += 1;
          s.combo = 0;
          s.hp = Math.max(0, s.hp - 8);
        }
      }
    },
    [mode, selectedLevel],
  );

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if ((LANES as readonly string[]).includes(e.key)) {
        e.preventDefault();
        handleKeyDown(e.key as LaneKey);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if ((LANES as readonly string[]).includes(e.key)) {
        e.preventDefault();
        handleKeyUp(e.key as LaneKey);
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  const s = stateRef.current;
  const nowMs = mode === "playing" ? performance.now() - s.startedAt : 0;
  const songProgress =
    mode === "playing" ? Math.min(1, nowMs / params.durationMs) : 0;

  // Suppress unused tick lint
  void tick;

  return (
    <div className="space-y-4">
      {mode === "menu" && (
        <RhythmMenu
          highestLevel={highestLevel}
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          onStart={startLevel}
        />
      )}

      {mode === "playing" && (
        <div className="space-y-3">
          {/* HUD */}
          <div className="space-y-1">
            <div className="bg-black/70 border-2 border-amber-500/70 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-300 flex items-center justify-between gap-2">
              <span>♪ NOW PLAYING:</span>
              <span className="text-amber-100 font-black truncate">
                "{getSongForLevel(selectedLevel, params.bpm, params.durationMs).songName}"
              </span>
              <span className="text-amber-200/70">{params.bpm} BPM</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-black/70 border-2 border-amber-500/70 px-3 py-2 font-mono text-[11px] uppercase tracking-widest">
              <span className="text-amber-300">LV {selectedLevel}/100</span>
              <span className="text-amber-100">SCORE {Math.floor(s.score)}</span>
              <span className="text-pink-400">x{s.combo}</span>
              <span className="text-emerald-400">BEST x{s.bestCombo}</span>
              <span className="text-red-400">HP {s.hp}</span>
              <span className="text-amber-200/70">{Math.floor(nowMs / 1000)}s</span>
            </div>
          </div>
          {/* HP & song progress bars */}
          <div className="flex gap-2">
            <div className="flex-1 h-2 bg-red-900/40 border border-red-500/40 overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${s.hp}%`, transition: "width 80ms linear" }} />
            </div>
            <div className="flex-1 h-2 bg-amber-900/40 border border-amber-500/40 overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${songProgress * 100}%`, transition: "width 80ms linear" }} />
            </div>
          </div>

          {/* Game canvas */}
          <GameCanvas
            notes={s.notes}
            nowMs={nowMs}
            params={params}
            flashes={flashRef.current}
            keysDown={keysDownRef.current}
            pulse={s.pulse}
            musicBeat={musicBeat}
          />

          <div className="flex justify-between items-center gap-3">
            <div className="text-amber-200/60 font-mono text-[10px] uppercase tracking-widest">
              press <span className="text-amber-300">← ↓ ↑ →</span> · hold long bars · keep your HP above 0
            </div>
            <Button
              onClick={exitToMenu}
              variant="destructive"
              className="font-black uppercase tracking-widest text-[11px] px-3 py-2"
            >
              ABANDON
            </Button>
          </div>
        </div>
      )}

      {(mode === "won" || mode === "lost") && (
        <RhythmResult
          mode={mode}
          level={selectedLevel}
          score={Math.floor(s.score)}
          bestCombo={s.bestCombo}
          hits={s.hits}
          misses={s.misses}
          perfects={s.perfects}
          highestLevel={highestLevel}
          onReplay={() => startLevel()}
          onBackToMenu={exitToMenu}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------

function RhythmMenu({
  highestLevel,
  selectedLevel,
  setSelectedLevel,
  onStart,
}: {
  highestLevel: number;
  selectedLevel: number;
  setSelectedLevel: (fn: (v: number) => number) => void;
  onStart: () => void;
}) {
  const params = getLevelParams(selectedLevel);
  const tier =
    selectedLevel < 10
      ? "WARM-UP"
      : selectedLevel < 25
        ? "ROOKIE"
        : selectedLevel < 50
          ? "VETERAN"
          : selectedLevel < 75
            ? "BRUTAL"
            : selectedLevel < 100
              ? "INSANE"
              : "GOD MODE";

  const setLevel = (n: number) =>
    setSelectedLevel(() =>
      Math.max(1, Math.min(highestLevel, Math.min(MAX_LEVEL, n))),
    );

  return (
    <div className="bg-black/70 border-4 border-amber-500/70 rounded-md neon-box p-5 md:p-7 space-y-5">
      <div className="flex items-center justify-center gap-4">
        <img
          src={nattounImg}
          alt="Nattoun"
          className="w-16 h-16 md:w-20 md:h-20 object-cover border-2 border-amber-400 neon-box"
        />
        <div>
          <div className="font-mono text-amber-300/80 text-[11px] tracking-[0.4em]">
            ★ NATTOUN'S RHYTHM CHALLENGE ★
          </div>
          <div className="font-display text-2xl md:text-3xl font-black text-amber-100 tracking-wider neon-text">
            FOLLOW THE ARROWS HE THROWS
          </div>
          <div className="text-amber-200/70 font-mono text-xs italic">
            Hit ← ↓ ↑ → in time. Hold long bars. Survive 100 levels of rock.
          </div>
        </div>
      </div>

      {/* Song preview */}
      {(() => {
        const previewParams = getLevelParams(selectedLevel);
        const song = getSongForLevel(
          selectedLevel,
          previewParams.bpm,
          previewParams.durationMs,
        );
        // Build a compact section roadmap to preview the song shape.
        const roadmap: { type: string; bars: number }[] = [];
        song.bars.forEach((b) => {
          const last = roadmap[roadmap.length - 1];
          if (last && last.type === b.section) last.bars += 1;
          else roadmap.push({ type: b.section, bars: 1 });
        });
        return (
          <div className="bg-gradient-to-r from-pink-900/40 via-amber-900/30 to-cyan-900/40 border-2 border-amber-500/60 p-3 text-center space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300">
              ♪ {song.genre.name} · LV {selectedLevel} / {MAX_LEVEL}
            </div>
            <div className="font-display text-xl md:text-2xl font-black text-amber-100 neon-text tracking-widest">
              "{song.songName}"
            </div>
            <div className="font-mono text-[11px] text-amber-200/80 italic">
              {song.vibe}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
              {roadmap.map((s, i) => (
                <span
                  key={i}
                  className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${
                    s.type === "chorus"
                      ? "bg-pink-600/30 border-pink-400/60 text-pink-200"
                      : s.type === "verse"
                      ? "bg-amber-600/20 border-amber-400/50 text-amber-200"
                      : s.type === "bridge"
                      ? "bg-cyan-600/20 border-cyan-400/50 text-cyan-200"
                      : s.type === "breakdown"
                      ? "bg-red-600/20 border-red-400/50 text-red-200"
                      : "bg-white/10 border-white/30 text-white/70"
                  }`}
                >
                  {s.type}·{s.bars}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Level selector */}
      <div className="bg-black/60 border-2 border-amber-500/40 p-4 space-y-3">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-amber-200/80">
          <span>LEVEL</span>
          <span>HIGHEST UNLOCKED: {highestLevel} / {MAX_LEVEL}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLevel(selectedLevel - 10)}
            disabled={selectedLevel <= 1}
            className="bg-amber-900/40 hover:bg-amber-700 text-amber-100 font-black px-3"
          >
            -10
          </Button>
          <Button
            onClick={() => setLevel(selectedLevel - 1)}
            disabled={selectedLevel <= 1}
            className="bg-amber-900/40 hover:bg-amber-700 text-amber-100 font-black px-3"
          >
            -1
          </Button>
          <div className="flex-1 text-center">
            <div className="font-display text-5xl font-black text-amber-100 leading-none">
              {selectedLevel}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mt-1">
              {tier}
            </div>
          </div>
          <Button
            onClick={() => setLevel(selectedLevel + 1)}
            disabled={selectedLevel >= highestLevel}
            className="bg-amber-900/40 hover:bg-amber-700 text-amber-100 font-black px-3"
          >
            +1
          </Button>
          <Button
            onClick={() => setLevel(selectedLevel + 10)}
            disabled={selectedLevel >= highestLevel}
            className="bg-amber-900/40 hover:bg-amber-700 text-amber-100 font-black px-3"
          >
            +10
          </Button>
        </div>

        {/* Difficulty meter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-200/80">
          <Stat label="BPM" value={`${params.bpm}`} />
          <Stat label="SPEED" value={`${Math.round(1700 / params.travelMs * 100) / 100}x`} />
          <Stat
            label="WINDOW"
            value={`${params.hitWindowMs}ms`}
          />
          <Stat label="DURATION" value={`${Math.round(params.durationMs / 1000)}s`} />
          <Stat
            label="HOLDS"
            value={params.holdChance > 0 ? `${Math.round(params.holdChance * 100)}%` : "—"}
          />
          <Stat
            label="SYMBOLS"
            value={params.symbolChance > 0 ? `${Math.round(params.symbolChance * 100)}%` : "—"}
          />
          <Stat
            label="DOUBLES"
            value={params.multiChance > 0 ? `${Math.round(params.multiChance * 100)}%` : "—"}
          />
          <Stat label="PASS" value={`${Math.round(params.passScorePct * 100)}%`} />
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onStart}
          data-testid="rhythm-start"
          className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-8 py-6 text-base"
        >
          🎸 PLAY LEVEL {selectedLevel}
        </Button>
      </div>

      <div className="text-center font-mono text-amber-200/60 text-[10px] uppercase tracking-widest leading-relaxed">
        Pass a level to unlock the next one. Beat level 10 for{" "}
        <span className="text-amber-300">RHYTHMIST</span>, 50 for{" "}
        <span className="text-amber-300">RHYTHM MASTER</span>, 100 for{" "}
        <span className="text-amber-300">RHYTHM GOD</span>.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-amber-500/5 border border-amber-500/30 px-2 py-1 flex items-center justify-between">
      <span className="text-amber-200/50">{label}</span>
      <span className="text-amber-100 font-bold">{value}</span>
    </div>
  );
}

function GameCanvas({
  notes,
  nowMs,
  params,
  flashes,
  keysDown,
  pulse,
  musicBeat,
}: {
  notes: Note[];
  nowMs: number;
  params: LevelParams;
  flashes: Record<LaneKey, number>;
  keysDown: Record<LaneKey, boolean>;
  pulse: number;
  musicBeat: number;
}) {
  return (
    <div
      className="relative w-full bg-black/80 border-4 border-amber-500/70 overflow-hidden"
      style={{ height: "min(60vh, 480px)", boxShadow: `0 0 ${20 + pulse * 30}px rgba(255,180,40,${0.3 + pulse * 0.4})` }}
    >
      {/* Nattoun "throws" notes from the top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
        <motion.img
          src={nattounImg}
          alt="Nattoun"
          className="w-14 h-14 md:w-16 md:h-16 object-cover border-2 border-amber-400 rounded-sm"
          animate={{ scale: 1 + pulse * 0.18, rotate: pulse > 0.5 ? [-3, 3, -3] : 0 }}
          transition={{ duration: 0.2 }}
        />
        <div className="text-center text-amber-300/70 font-mono text-[9px] uppercase tracking-widest mt-1">
          BEAT {musicBeat}
        </div>
      </div>

      {/* Lanes */}
      <div className="absolute inset-0 grid grid-cols-4">
        {LANES.map((lane) => (
          <div
            key={lane}
            className="relative border-l border-r border-amber-500/10"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,180,40,0.04) 0%, rgba(0,0,0,0) 60%)",
            }}
          >
            {/* Lane glow when flashing */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(180deg, transparent 60%, ${LANE_COLOR[lane]}55 ${HIT_ZONE_PCT * 100}%, transparent ${HIT_ZONE_PCT * 100 + 10}%)`,
                opacity: flashes[lane],
              }}
            />
          </div>
        ))}
      </div>

      {/* Hit line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-amber-300/80"
        style={{
          top: `${HIT_ZONE_PCT * 100}%`,
          boxShadow: "0 0 16px rgba(255,200,80,0.8)",
        }}
      />

      {/* Notes */}
      {notes.map((note) => {
        if (note.status === "hit" || note.status === "miss") return null;
        const lifeMs = nowMs - note.spawnAt;
        const t = lifeMs / note.travelMs; // 0 at spawn, 1 at hit zone
        if (t < -0.05) return null;
        const topPct = t * HIT_ZONE_PCT * 100;
        if (topPct > 105) return null;
        const laneIdx = LANES.indexOf(note.lane);
        const leftPct = (laneIdx + 0.5) * 25;
        const isHolding = note.status === "holding";
        const tailHeightPct =
          note.type === "hold"
            ? (note.holdMs / note.travelMs) * HIT_ZONE_PCT * 100
            : 0;

        return (
          <div
            key={note.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              willChange: "top",
            }}
          >
            {/* Tail for hold notes */}
            {note.type === "hold" && (
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-0 rounded-sm"
                style={{
                  width: 18,
                  height: `${Math.max(0, tailHeightPct * 4.8)}px`,
                  background: `linear-gradient(180deg, ${LANE_COLOR[note.lane]}99, ${LANE_COLOR[note.lane]}33)`,
                  transform: "translate(-50%, -100%)",
                  border: `1px solid ${LANE_COLOR[note.lane]}`,
                  boxShadow: isHolding
                    ? `0 0 14px ${LANE_COLOR[note.lane]}`
                    : "none",
                }}
              />
            )}
            {/* Note head */}
            <div
              className="flex items-center justify-center font-black text-2xl md:text-3xl"
              style={{
                width: 48,
                height: 48,
                color: LANE_COLOR[note.lane],
                background: "rgba(0,0,0,0.85)",
                border: `2px solid ${LANE_COLOR[note.lane]}`,
                borderRadius: 6,
                boxShadow: `0 0 12px ${LANE_COLOR[note.lane]}`,
                transform: isHolding ? "scale(1.15)" : "scale(1)",
              }}
            >
              {note.symbol ?? LANE_GLYPH[note.lane]}
            </div>
          </div>
        );
      })}

      {/* Hit zone targets */}
      <div className="absolute left-0 right-0 grid grid-cols-4" style={{ top: `${HIT_ZONE_PCT * 100}%`, transform: "translateY(-50%)" }}>
        {LANES.map((lane) => (
          <div key={lane} className="flex items-center justify-center">
            <div
              className="flex items-center justify-center font-black text-2xl md:text-3xl"
              style={{
                width: 52,
                height: 52,
                color: LANE_COLOR[lane],
                background: keysDown[lane] ? `${LANE_COLOR[lane]}55` : "rgba(0,0,0,0.6)",
                border: `2px dashed ${LANE_COLOR[lane]}`,
                borderRadius: 6,
                opacity: 0.85 + flashes[lane] * 0.15,
                transform: keysDown[lane] ? "scale(1.1)" : "scale(1)",
                transition: "transform 80ms",
              }}
            >
              {LANE_GLYPH[lane]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RhythmResult({
  mode,
  level,
  score,
  bestCombo,
  hits,
  misses,
  perfects,
  highestLevel,
  onReplay,
  onBackToMenu,
}: {
  mode: "won" | "lost";
  level: number;
  score: number;
  bestCombo: number;
  hits: number;
  misses: number;
  perfects: number;
  highestLevel: number;
  onReplay: () => void;
  onBackToMenu: () => void;
}) {
  const total = Math.max(1, hits + misses);
  const acc = Math.round((hits / total) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-black/80 border-4 ${mode === "won" ? "border-amber-400" : "border-red-500"} p-5 md:p-7 space-y-4`}
      >
        <div className="text-center">
          <div className="text-5xl mb-2">{mode === "won" ? "🏆" : "💀"}</div>
          <div className={`font-display text-3xl md:text-4xl font-black tracking-widest ${mode === "won" ? "text-amber-100" : "text-red-300"} neon-text`}>
            {mode === "won" ? "LEVEL CLEARED" : "WIPEOUT"}
          </div>
          <div className="font-mono text-amber-200/70 text-xs uppercase tracking-widest mt-1">
            {mode === "won"
              ? level >= MAX_LEVEL
                ? "Nattoun bows. You broke the meter."
                : `Level ${level + 1} unlocked.`
              : "Nattoun mocks you. Try again, citizen."}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs uppercase tracking-widest">
          <Stat label="LEVEL" value={`${level}/100`} />
          <Stat label="SCORE" value={`${score}`} />
          <Stat label="BEST COMBO" value={`x${bestCombo}`} />
          <Stat label="HITS" value={`${hits}`} />
          <Stat label="MISSES" value={`${misses}`} />
          <Stat label="PERFECTS" value={`${perfects}`} />
          <Stat label="ACCURACY" value={`${acc}%`} />
          <Stat label="HIGHEST" value={`${highestLevel}`} />
        </div>

        <div className="flex justify-center gap-3">
          <Button
            onClick={onReplay}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-6 py-5"
          >
            🔁 RETRY
          </Button>
          <Button
            onClick={onBackToMenu}
            variant="outline"
            className="border-amber-400 text-amber-200 hover:bg-amber-400 hover:text-black font-black uppercase tracking-widest px-6 py-5"
          >
            ← MENU
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
