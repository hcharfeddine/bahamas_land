import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { unlock } from "@/lib/achievements";
import { audio } from "@/lib/audio";
import nattounImg from "@assets/Nattoun_1777028672745.png";

// =============================================================================
// CHESS vs NATTOUN
// Nattoun ALWAYS wins. He cheats:
//   • He moves a piece illegally.
//   • He sometimes promotes his pawn into a Dog.
//   • He occasionally just deletes one of your pieces and announces "audit".
//   • The "Resign" button exiles you immediately.
//
// HIDDEN EGG inside the game:
//   • Type "blunder" while on the page → Nattoun resigns → unlock chesschamp
//   • Press the secret combo on the chair-of-shame square (file e, rank 1)
//     7 times → also unlocks a hint about /reward
// =============================================================================

type Piece =
  | "wK" | "wQ" | "wR" | "wB" | "wN" | "wP"
  | "bK" | "bQ" | "bR" | "bB" | "bN" | "bP"
  | "bD" /* Nattoun's invented "Dog" piece */
  | null;

const GLYPHS: Record<NonNullable<Piece>, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
  bD: "🐕",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function startingBoard(): Piece[][] {
  const back: Piece[] = ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"];
  const pawnsB: Piece[] = Array(8).fill("bP") as Piece[];
  const empty: Piece[] = Array(8).fill(null) as Piece[];
  const pawnsW: Piece[] = Array(8).fill("wP") as Piece[];
  const front: Piece[] = ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"];
  return [back, pawnsB, [...empty], [...empty], [...empty], [...empty], pawnsW, front];
}

const NATTOUN_TRASH_TALK = [
  "boring move. mods, audit them.",
  "did you really play that?",
  "i'm letting you THINK you have a chance.",
  "this is a state secret btw.",
  "the dog approves. of my own move.",
  "my queen is also the president btw.",
  "i'm not cheating, you're just losing.",
  "your knight resigned of its own free will.",
  "this is a chess simulation. of my dominance.",
  "i'm streaming this. they're laughing at you.",
  "loyalty to the king. (the BLACK king. me.)",
  "audit complete. one of your pieces vanished.",
];

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}
// hashed trigger word "blunder" — keeps the cheat out of plain bundle text
const BLUNDER_HASH = djb2("blunder");

export default function Chess() {
  const [board, setBoard] = useState<Piece[][]>(() => startingBoard());
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [log, setLog] = useState<string[]>([
    "🐕 Nattoun: welcome to my chess board. you cannot win.",
  ]);
  const [shake, setShake] = useState(false);
  const [gameOver, setGameOver] = useState<null | "user" | "nattoun">(null);
  const buf = useRef("");
  const resetBuf = useRef<number | null>(null);

  // ------------------------------------------------------------------
  // Hidden combo: type "blunder" → Nattoun resigns
  // ------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        buf.current = (buf.current + e.key.toLowerCase()).slice(-12);
        if (resetBuf.current) window.clearTimeout(resetBuf.current);
        resetBuf.current = window.setTimeout(() => { buf.current = ""; }, 2000);
        const tail = buf.current.slice(-7);
        if (djb2(tail) === BLUNDER_HASH && !gameOver) {
          buf.current = "";
          forceWin();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  // ------------------------------------------------------------------
  // External cheat hook (set by ConsoleEggs: bahamas.chess())
  // ------------------------------------------------------------------
  useEffect(() => {
    const onCheat = () => { if (!gameOver) forceWin(true); };
    window.addEventListener("chess-cheat", onCheat);
    return () => window.removeEventListener("chess-cheat", onCheat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function forceWin(viaConsole = false) {
    setGameOver("user");
    unlock("chesschamp");
    if (viaConsole) unlock("chessfraud");
    setLog((l) => [
      ...l,
      "🐕 Nattoun: …",
      "🐕 Nattoun: how did you know that word.",
      "🐕 Nattoun: fine. i resign. (this never happened.)",
      `👑 ${viaConsole ? "CONSOLE-VERIFIED VICTORY" : "VICTORY"} — Nattoun has been blundered.`,
    ]);
    try { audio.playCoin(); } catch { /* ignore */ }
  }

  function nattounSays(line?: string) {
    const text = line ?? NATTOUN_TRASH_TALK[Math.floor(Math.random() * NATTOUN_TRASH_TALK.length)];
    setLog((l) => [...l.slice(-30), `🐕 Nattoun: ${text}`]);
  }

  function userSays(text: string) {
    setLog((l) => [...l.slice(-30), `👤 you: ${text}`]);
  }

  // ------------------------------------------------------------------
  // Click-to-move (we permit ANY move because Nattoun doesn't follow rules)
  // ------------------------------------------------------------------
  function onSquare(r: number, c: number) {
    if (gameOver || turn !== "w") return;
    const p = board[r][c];
    if (!selected) {
      if (!p || !p.startsWith("w")) return;
      setSelected({ r, c });
      return;
    }
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }
    const target = board[r][c];
    if (target && target.startsWith("w")) {
      setSelected({ r, c });
      return;
    }
    // perform the move
    const next = board.map((row) => [...row]);
    next[r][c] = next[selected.r][selected.c];
    next[selected.r][selected.c] = null;
    setBoard(next);
    userSays(`${notation(selected.r, selected.c)} → ${notation(r, c)}`);
    setSelected(null);
    setTurn("b");
    try { audio.playBlip(); } catch { /* ignore */ }

    window.setTimeout(() => nattounMove(next), 600);
  }

  // ------------------------------------------------------------------
  // Nattoun's "AI": pure cheating chaos.
  // ------------------------------------------------------------------
  function nattounMove(b: Piece[][]) {
    const next = b.map((row) => [...row]);
    const blacks: { r: number; c: number; p: NonNullable<Piece> }[] = [];
    const whites: { r: number; c: number; p: NonNullable<Piece> }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = next[r][c];
        if (!p) continue;
        if (p.startsWith("b")) blacks.push({ r, c, p });
        else whites.push({ r, c, p });
      }
    }
    const action = Math.random();

    if (action < 0.20 && whites.length > 1) {
      // AUDIT: vanish a random white piece (not the king)
      const targets = whites.filter((w) => w.p !== "wK");
      const t = targets[Math.floor(Math.random() * targets.length)];
      next[t.r][t.c] = null;
      setBoard(next);
      nattounSays("audit complete. one of your pieces was found suspicious.");
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      try { audio.playGlitch(); } catch { /* ignore */ }
    } else if (action < 0.35) {
      // SPAWN A DOG on a random empty square in your half
      const empties: { r: number; c: number }[] = [];
      for (let r = 4; r < 8; r++) {
        for (let c = 0; c < 8; c++) if (!next[r][c]) empties.push({ r, c });
      }
      if (empties.length) {
        const e = empties[Math.floor(Math.random() * empties.length)];
        next[e.r][e.c] = "bD";
        setBoard(next);
        nattounSays("a Dog has been promoted into your half. constitutional.");
        try { audio.playGlitch(); } catch { /* ignore */ }
      }
    } else {
      // Normal-looking illegal move: teleport a random black piece anywhere it can reach (or not)
      if (blacks.length === 0) return;
      const piece = blacks[Math.floor(Math.random() * blacks.length)];
      const empties: { r: number; c: number }[] = [];
      const captures: { r: number; c: number }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (r === piece.r && c === piece.c) continue;
          const cell = next[r][c];
          if (!cell) empties.push({ r, c });
          else if (cell.startsWith("w") && cell !== "wK") captures.push({ r, c });
        }
      }
      // Prefer capturing if we can
      const move = captures.length && Math.random() < 0.65
        ? captures[Math.floor(Math.random() * captures.length)]
        : empties[Math.floor(Math.random() * empties.length)];
      if (!move) return;
      next[move.r][move.c] = piece.p;
      next[piece.r][piece.c] = null;
      setBoard(next);
      const took = b[move.r][move.c];
      nattounSays(took ? `captured your ${pieceName(took)}. natural.` : undefined);
      try { audio.playBlip(); } catch { /* ignore */ }
    }

    // Check if user lost king (we treat it as a loss)
    let userKing = false;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (next[r][c] === "wK") userKing = true;
    if (!userKing) {
      setGameOver("nattoun");
      setLog((l) => [...l, "👑 Nattoun has won. As decreed."]);
      try { audio.playGlitch(); } catch { /* ignore */ }
    }
    setTurn("w");
  }

  function notation(r: number, c: number) {
    return `${FILES[c]}${8 - r}`;
  }

  function pieceName(p: NonNullable<Piece>) {
    return ({ K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn", D: "dog" } as Record<string, string>)[p[1]] || "piece";
  }

  function reset() {
    setBoard(startingBoard());
    setTurn("w");
    setSelected(null);
    setGameOver(null);
    setLog(["🐕 Nattoun: another round? you must enjoy losing."]);
  }

  function resign() {
    setGameOver("nattoun");
    setLog((l) => [...l, "👑 Nattoun: resignation logged. exile dispatched."]);
    try { audio.playGlitch(); } catch { /* ignore */ }
  }

  const status = useMemo(() => {
    if (gameOver === "user") return { text: "VICTORY (suspicious)", color: "hsl(140 100% 55%)" };
    if (gameOver === "nattoun") return { text: "NATTOUN WINS (always)", color: "hsl(0 100% 60%)" };
    return { text: turn === "w" ? "YOUR MOVE, CITIZEN" : "NATTOUN THINKING…", color: "hsl(48 100% 60%)" };
  }, [gameOver, turn]);

  return (
    <Layout showBack={true}>
      <div className="max-w-5xl mx-auto w-full py-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        {/* Board */}
        <div className="flex flex-col items-center">
          <div className="text-primary font-black uppercase tracking-widest text-2xl neon-text mb-1">
            Chess vs Nattoun
          </div>
          <div className="text-secondary font-mono text-[10px] uppercase mb-3">
            Rated. Audited. Rigged.
          </div>

          <motion.div
            animate={shake ? { x: [-6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-8 border-4 border-primary neon-box"
            style={{ width: "min(80vw, 480px)", aspectRatio: "1 / 1" }}
          >
            {board.map((row, r) =>
              row.map((p, c) => {
                const dark = (r + c) % 2 === 1;
                const isSel = selected?.r === r && selected?.c === c;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => onSquare(r, c)}
                    className="relative flex items-center justify-center select-none"
                    style={{
                      background: dark ? "hsl(220 30% 18%)" : "hsl(48 25% 75%)",
                      outline: isSel ? "3px solid hsl(140 100% 60%)" : "none",
                      outlineOffset: "-3px",
                      cursor: gameOver ? "default" : "pointer",
                    }}
                    aria-label={`${notation(r, c)} ${p ?? "empty"}`}
                  >
                    {p && (
                      <span
                        className="select-none"
                        style={{
                          fontSize: "clamp(20px, 6vw, 40px)",
                          color: p.startsWith("w") ? "#fff" : "#000",
                          textShadow: p.startsWith("w") ? "0 0 4px #000" : "0 0 2px #fff",
                          lineHeight: 1,
                        }}
                      >
                        {GLYPHS[p as NonNullable<Piece>]}
                      </span>
                    )}
                    {c === 0 && (
                      <span className="absolute left-0.5 top-0.5 text-[8px] font-mono text-black/60">
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className="absolute right-0.5 bottom-0 text-[8px] font-mono text-black/60">
                        {FILES[c]}
                      </span>
                    )}
                  </button>
                );
              }),
            )}
          </motion.div>

          <div
            className="mt-3 px-3 py-1 border-2 font-mono uppercase tracking-widest text-xs"
            style={{ borderColor: status.color, color: status.color, textShadow: `0 0 6px ${status.color}` }}
          >
            {status.text}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 border-2 border-primary text-primary font-mono uppercase text-xs neon-box hover:bg-primary/20"
            >
              {gameOver ? "Play again (lose again)" : "Restart"}
            </button>
            <button
              onClick={resign}
              disabled={!!gameOver}
              className="px-4 py-2 border-2 border-red-500 text-red-400 font-mono uppercase text-xs hover:bg-red-500/20 disabled:opacity-40"
            >
              Resign
            </button>
          </div>
          <div className="mt-3 max-w-sm text-center text-secondary font-mono text-[10px] uppercase opacity-80">
            Tip: the President speedruns chess. Try whispering 'b…' something into the keyboard.
          </div>
        </div>

        {/* Side panel — Nattoun cam + chat log */}
        <div className="flex flex-col gap-3">
          <div className="bg-black/80 border-2 border-pink-500 p-3 neon-box flex items-center gap-3">
            <motion.img
              src={nattounImg}
              data-nattoun="true"
              alt="Nattoun"
              animate={{ scale: [1, 1.04, 1], rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-14 h-14 rounded-full object-cover border-2 border-pink-400"
            />
            <div>
              <div className="text-pink-300 font-mono uppercase text-[10px] tracking-widest">President · GM</div>
              <div className="text-white font-black uppercase tracking-widest">Nattoun (2900 ELO, allegedly)</div>
            </div>
          </div>

          <div
            className="bg-black/85 border-2 border-primary/60 p-3 font-mono text-[12px] text-white/85 overflow-y-auto"
            style={{ maxHeight: "60vh" }}
            data-testid="chess-log"
          >
            <div className="text-primary uppercase text-[10px] mb-2 tracking-widest">Live commentary</div>
            <AnimatePresence initial={false}>
              {log.map((line, i) => (
                <motion.div
                  key={i + ":" + line}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-l-2 border-primary/30 pl-2 mb-1"
                >
                  {line}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
