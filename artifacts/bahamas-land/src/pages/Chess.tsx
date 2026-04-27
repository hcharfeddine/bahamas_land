import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { unlock } from "@/lib/achievements";
import { audio } from "@/lib/audio";
import nattounImg from "@assets/Nattoun_1777028672745.png";

// =============================================================================
// CHESS vs NATTOUN — REAL RULES (for you), TOTAL ANARCHY (for him)
//
// You play by the FIDE rules: piece-correct moves, no leaving your king in
// check, real check / checkmate / stalemate detection, auto-queen promotion.
//
// Nattoun cheats. He may:
//   • Make a normal legal move (boring tier)
//   • Move a knight 3+1, 3+2, 2+3, 1+3 etc. when it lets him grab a piece
//   • Teleport a piece to capture you ("treaty between squares")
//   • "Audit" one of your pieces (delete it from the board)
//   • CONSTITUTIONAL REFORM — when he's losing, he just SWAPS sides with you.
//     He becomes whichever color is winning. The board doesn't change.
//
// You can never capture his king — he teleports it to safety AND audits a
// piece of yours as a "federal warning". He always wins.
//
// HIDDEN EGGS:
//   • Type "blunder" while on the page → Nattoun resigns → unlock chesschamp
//   • Console: bahamas.chess() (set up in ConsoleEggs) → unlock chessfraud
// =============================================================================

type Color = "w" | "b";
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = `${Color}${PieceType}` | null;
type Coord = [number, number];

const PIECE_VALUES: Record<string, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0,
};

const GLYPHS_W: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
};
const GLYPHS_B: Record<string, string> = {
  K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function glyphFor(p: NonNullable<Piece>): string {
  const color = p[0] as Color;
  const type = p[1];
  return color === "w" ? GLYPHS_W[type] : GLYPHS_B[type];
}

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
  "my queen is also the president btw.",
  "i'm not cheating, you're just losing.",
  "this is a chess simulation. of my dominance.",
  "i'm streaming this. they're laughing at you.",
  "loyalty to the king. (the BLACK king. me.)",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function pieceColor(p: Piece): Color | null {
  if (!p) return null;
  return p[0] as Color;
}

function pieceName(p: NonNullable<Piece>) {
  return ({ K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" } as Record<string, string>)[p[1]] || "piece";
}

function notation(r: number, c: number) {
  return `${FILES[c]}${8 - r}`;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}
const BLUNDER_HASH = djb2("blunder");

// ---------------------------------------------------------------------------
// FIDE-style pseudo-legal moves (no castling / en-passant — kept simple)
// ---------------------------------------------------------------------------
function pseudoLegalMoves(board: Piece[][], r: number, c: number): Coord[] {
  const p = board[r][c];
  if (!p) return [];
  const color = pieceColor(p)!;
  const enemy: Color = color === "w" ? "b" : "w";
  const type = p[1];
  const out: Coord[] = [];

  const slide = (dr: number, dc: number) => {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const t = board[nr][nc];
      if (!t) {
        out.push([nr, nc]);
      } else {
        if (pieceColor(t) === enemy) out.push([nr, nc]);
        break;
      }
      nr += dr;
      nc += dc;
    }
  };

  const step = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return;
    const t = board[nr][nc];
    if (!t || pieceColor(t) === enemy) out.push([nr, nc]);
  };

  switch (type) {
    case "P": {
      // White moves up the board (r decreases). Black moves down (r increases).
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const oneR = r + dir;
      if (inBounds(oneR, c) && !board[oneR][c]) {
        out.push([oneR, c]);
        const twoR = r + 2 * dir;
        if (r === startRow && inBounds(twoR, c) && !board[twoR][c]) {
          out.push([twoR, c]);
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const t = board[nr][nc];
        if (t && pieceColor(t) === enemy) out.push([nr, nc]);
      }
      break;
    }
    case "N": {
      const deltas: Coord[] = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of deltas) step(r + dr, c + dc);
      break;
    }
    case "B": {
      slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
      break;
    }
    case "R": {
      slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
      break;
    }
    case "Q": {
      slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
      slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
      break;
    }
    case "K": {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          step(r + dr, c + dc);
        }
      }
      break;
    }
  }
  return out;
}

function findKing(board: Piece[][], color: Color): Coord | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}K`) return [r, c];
    }
  }
  return null;
}

function isSquareAttacked(board: Piece[][], r: number, c: number, byColor: Color): boolean {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (!p || pieceColor(p) !== byColor) continue;
      const moves = pseudoLegalMoves(board, rr, cc);
      for (const [mr, mc] of moves) {
        if (mr === r && mc === c) return true;
      }
    }
  }
  return false;
}

function isInCheck(board: Piece[][], color: Color): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  const enemy: Color = color === "w" ? "b" : "w";
  return isSquareAttacked(board, king[0], king[1], enemy);
}

function legalMovesFor(board: Piece[][], r: number, c: number): Coord[] {
  const p = board[r][c];
  if (!p) return [];
  const color = pieceColor(p)!;
  const moves = pseudoLegalMoves(board, r, c);
  return moves.filter(([nr, nc]) => {
    const next = board.map((row) => [...row]);
    let mover: Piece = next[r][c];
    if (mover && mover[1] === "P" && (nr === 0 || nr === 7)) {
      mover = `${color}Q` as Piece;
    }
    next[nr][nc] = mover;
    next[r][c] = null;
    return !isInCheck(next, color);
  });
}

function getAllLegalMoves(
  board: Piece[][],
  color: Color,
): Array<{ from: Coord; to: Coord }> {
  const out: Array<{ from: Coord; to: Coord }> = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || pieceColor(p) !== color) continue;
      for (const m of legalMovesFor(board, r, c)) {
        out.push({ from: [r, c], to: m });
      }
    }
  }
  return out;
}

function materialOf(board: Piece[][], color: Color): number {
  let total = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || pieceColor(p) !== color) continue;
      total += PIECE_VALUES[p[1]] || 0;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Chess() {
  const [board, setBoard] = useState<Piece[][]>(() => startingBoard());
  // Which color the player controls. Starts as white. Nattoun may swap this.
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [turn, setTurn] = useState<Color>("w");
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [log, setLog] = useState<string[]>([
    "🐕 Nattoun: welcome to my chess board. you cannot win.",
  ]);
  const [shake, setShake] = useState(false);
  const [colorFlash, setColorFlash] = useState(false);
  const [gameOver, setGameOver] = useState<null | "user" | "nattoun">(null);
  const [reformCount, setReformCount] = useState(0);
  const buf = useRef("");
  const resetBuf = useRef<number | null>(null);

  const nattounColor: Color = playerColor === "w" ? "b" : "w";

  const validMoves = useMemo(() => {
    if (!selected) return [] as Coord[];
    return legalMovesFor(board, selected.r, selected.c);
  }, [selected, board]);

  const playerInCheck = useMemo(
    () => isInCheck(board, playerColor),
    [board, playerColor],
  );

  // --------------------------------------------------------------
  // Hidden combo: type "blunder" → Nattoun resigns
  // --------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        buf.current = (buf.current + e.key.toLowerCase()).slice(-12);
        if (resetBuf.current) window.clearTimeout(resetBuf.current);
        resetBuf.current = window.setTimeout(() => {
          buf.current = "";
        }, 2000);
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

  // --------------------------------------------------------------
  // External cheat hook (set by ConsoleEggs: bahamas.chess())
  // --------------------------------------------------------------
  useEffect(() => {
    const onCheat = () => {
      if (!gameOver) forceWin(true);
    };
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

  function systemLog(text: string) {
    setLog((l) => [...l.slice(-30), text]);
  }

  // --------------------------------------------------------------
  // CONSTITUTIONAL REFORM — the color-swap cheat.
  // The pieces on the board don't move. We just swap WHO controls
  // each color. Since Nattoun only triggers this when he's losing,
  // the player suddenly inherits the losing position.
  // --------------------------------------------------------------
  function constitutionalReform() {
    setColorFlash(true);
    window.setTimeout(() => setColorFlash(false), 1100);
    setPlayerColor((c) => (c === "w" ? "b" : "w"));
    setReformCount((n) => n + 1);
    nattounSays("🚨 CONSTITUTIONAL REFORM. ratified by me. i am the winning side now.");
    systemLog(`🚨 NATTOUN HAS SWITCHED COLORS — you are now the losing side.`);
    try { audio.playGlitch(); } catch { /* ignore */ }
    // turn was nattounColor (his). After swap, that same color is now the
    // player's. So just leave `turn` alone — it now belongs to the player.
  }

  // --------------------------------------------------------------
  // Player tries to take Nattoun's king → cheat escape.
  // --------------------------------------------------------------
  function escapeKing() {
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
    nattounSays("you can't capture the president. that's a federal crime.");
    const next = board.map((row) => [...row]);
    const empties: Coord[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!next[r][c]) empties.push([r, c]);
      }
    }
    const king = findKing(next, nattounColor);
    if (king && empties.length) {
      // Pick a square not currently attacked by the player.
      const safe = empties.filter(
        ([r, c]) => !isSquareAttacked(next, r, c, playerColor),
      );
      const pool = safe.length ? safe : empties;
      const [tr, tc] = pool[Math.floor(Math.random() * pool.length)];
      next[tr][tc] = next[king[0]][king[1]];
      next[king[0]][king[1]] = null;
    }
    // Audit a player piece (not king)
    const targets: Coord[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = next[r][c];
        if (p && pieceColor(p) === playerColor && p[1] !== "K") targets.push([r, c]);
      }
    }
    if (targets.length) {
      const [tr, tc] = targets[Math.floor(Math.random() * targets.length)];
      next[tr][tc] = null;
      nattounSays("audit complete. one of your pieces was tax-evading.");
    }
    setBoard(next);
    try { audio.playGlitch(); } catch { /* ignore */ }
  }

  // --------------------------------------------------------------
  // Click-to-move (legality enforced for the player)
  // --------------------------------------------------------------
  function onSquare(r: number, c: number) {
    if (gameOver || turn !== playerColor) return;
    const p = board[r][c];
    if (!selected) {
      if (!p || pieceColor(p) !== playerColor) return;
      setSelected({ r, c });
      return;
    }
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }
    if (p && pieceColor(p) === playerColor) {
      setSelected({ r, c });
      return;
    }
    const isLegal = validMoves.some(([mr, mc]) => mr === r && mc === c);
    if (!isLegal) {
      setShake(true);
      window.setTimeout(() => setShake(false), 250);
      nattounSays("illegal move. unlike me, you have to follow the rules.");
      return;
    }

    // Did the player try to capture Nattoun's king?
    const target = board[r][c];
    if (target && target === `${nattounColor}K`) {
      escapeKing();
      setSelected(null);
      return;
    }

    const next = board.map((row) => [...row]);
    let mover: Piece = next[selected.r][selected.c];
    if (mover && mover[1] === "P" && (r === 0 || r === 7)) {
      mover = `${playerColor}Q` as Piece;
    }
    next[r][c] = mover;
    next[selected.r][selected.c] = null;
    setBoard(next);
    userSays(`${notation(selected.r, selected.c)} → ${notation(r, c)}`);
    setSelected(null);
    setTurn(nattounColor);
    try { audio.playBlip(); } catch { /* ignore */ }

    window.setTimeout(() => nattounMove(next), 650);
  }

  // --------------------------------------------------------------
  // Nattoun's "AI": cheating chaos with a sprinkle of legality
  // --------------------------------------------------------------
  function nattounMove(b: Piece[][]) {
    if (gameOver) return;
    const next = b.map((row) => [...row]);

    const playerMat = materialOf(next, playerColor);
    const nattounMat = materialOf(next, nattounColor);
    const losing = nattounMat <= playerMat - 6;
    const myLegal = getAllLegalMoves(next, nattounColor);
    const myInCheck = isInCheck(next, nattounColor);

    // CHEAT 0 — if Nattoun has no moves (mate/stalemate) OR is losing badly,
    // do CONSTITUTIONAL REFORM. Cap to 3 reforms per game so it doesn't loop.
    if (
      reformCount < 3 &&
      (myLegal.length === 0 || (losing && Math.random() < 0.55))
    ) {
      constitutionalReform();
      return;
    }

    const action = Math.random();

    // CHEAT 1 — AUDIT: vanish a random non-king player piece
    if (action < 0.10) {
      const targets: Coord[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = next[r][c];
          if (p && pieceColor(p) === playerColor && p[1] !== "K") targets.push([r, c]);
        }
      }
      if (targets.length) {
        const [tr, tc] = targets[Math.floor(Math.random() * targets.length)];
        const took = next[tr][tc];
        next[tr][tc] = null;
        setBoard(next);
        nattounSays(`audit complete. your ${pieceName(took!)} was found suspicious.`);
        setShake(true);
        window.setTimeout(() => setShake(false), 350);
        try { audio.playGlitch(); } catch { /* ignore */ }
        finishNattounTurn(next);
        return;
      }
    }

    // CHEAT 2 — EXTENDED KNIGHT: knight goes 3+1, 3+2, 1+3, 2+3 to capture
    if (action < 0.42) {
      const knights: Coord[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (next[r][c] === `${nattounColor}N`) knights.push([r, c]);
        }
      }
      if (knights.length) {
        const cheatDeltas: Coord[] = [];
        for (const a of [-3, -2, -1, 1, 2, 3]) {
          for (const d of [-3, -2, -1, 1, 2, 3]) {
            // Skip the standard 2/1 knight pattern (boring) and same-axis
            if (Math.abs(a) === Math.abs(d)) continue;
            if ((Math.abs(a) === 2 && Math.abs(d) === 1) || (Math.abs(a) === 1 && Math.abs(d) === 2)) continue;
            cheatDeltas.push([a, d]);
          }
        }
        for (const [kr, kc] of knights) {
          const captures: Coord[] = [];
          for (const [dr, dc] of cheatDeltas) {
            const nr = kr + dr;
            const nc = kc + dc;
            if (!inBounds(nr, nc)) continue;
            const t = next[nr][nc];
            if (t && pieceColor(t) === playerColor && t[1] !== "K") {
              captures.push([nr, nc]);
            }
          }
          if (captures.length) {
            const [tr, tc] = captures[Math.floor(Math.random() * captures.length)];
            const took = next[tr][tc];
            const dr = tr - kr;
            const dc = tc - kc;
            next[tr][tc] = next[kr][kc];
            next[kr][kc] = null;
            setBoard(next);
            nattounSays(
              `my knight just went ${Math.abs(dr)}+${Math.abs(dc)}. that's how i play. (took your ${pieceName(took!)}.)`,
            );
            try { audio.playBlip(); } catch { /* ignore */ }
            finishNattounTurn(next);
            return;
          }
        }
      }
    }

    // BORING TIER — legal move, prefer captures
    let chosen: { from: Coord; to: Coord } | null = null;
    if (myLegal.length > 0) {
      const captures = myLegal.filter(({ to }) => {
        const t = next[to[0]][to[1]];
        return t && pieceColor(t) === playerColor;
      });
      chosen = captures.length
        ? captures[Math.floor(Math.random() * captures.length)]
        : myLegal[Math.floor(Math.random() * myLegal.length)];
    }

    // CHEAT 3 — TELEPORT: 30% of the time replace the chosen move with an
    // illegal teleport-capture of any player piece (except the king).
    if (Math.random() < 0.3 || !chosen) {
      const myPieces: Coord[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = next[r][c];
          if (p && pieceColor(p) === nattounColor && p[1] !== "K") myPieces.push([r, c]);
        }
      }
      const playerCaptures: Coord[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = next[r][c];
          if (p && pieceColor(p) === playerColor && p[1] !== "K") playerCaptures.push([r, c]);
        }
      }
      if (myPieces.length && playerCaptures.length) {
        const from = myPieces[Math.floor(Math.random() * myPieces.length)];
        const to = playerCaptures[Math.floor(Math.random() * playerCaptures.length)];
        chosen = { from, to };
      }
    }

    if (chosen) {
      const took = next[chosen.to[0]][chosen.to[1]];
      // pawn promo for nattoun too
      let mover: Piece = next[chosen.from[0]][chosen.from[1]];
      if (mover && mover[1] === "P" && (chosen.to[0] === 0 || chosen.to[0] === 7)) {
        mover = `${nattounColor}Q` as Piece;
      }
      next[chosen.to[0]][chosen.to[1]] = mover;
      next[chosen.from[0]][chosen.from[1]] = null;
      setBoard(next);
      if (took) nattounSays(`captured your ${pieceName(took)}.`);
      else if (myInCheck) nattounSays("escaped check. obviously.");
      else nattounSays();
      try { audio.playBlip(); } catch { /* ignore */ }
    } else {
      nattounSays("i pass. (i don't really. i'm thinking.)");
    }

    finishNattounTurn(next);
  }

  function finishNattounTurn(b: Piece[][]) {
    // Player king missing? Nattoun wins.
    const king = findKing(b, playerColor);
    if (!king) {
      setGameOver("nattoun");
      systemLog("👑 Nattoun has captured your king. As decreed.");
      try { audio.playGlitch(); } catch { /* ignore */ }
      return;
    }
    // Real check / checkmate / stalemate detection on the player.
    const playerMoves = getAllLegalMoves(b, playerColor);
    const inCheck = isInCheck(b, playerColor);
    if (playerMoves.length === 0) {
      setGameOver("nattoun");
      if (inCheck) {
        systemLog("👑 CHECKMATE. Nattoun wins. As always.");
        nattounSays("checkmate. signed, the president.");
      } else {
        systemLog("👑 'Stalemate'? In MY palace? You lose anyway.");
        nattounSays("stalemate is a loss when i say it is.");
      }
      try { audio.playGlitch(); } catch { /* ignore */ }
      return;
    }
    if (inCheck) systemLog("⚠ check.");
    setTurn(playerColor);
  }

  function reset() {
    setBoard(startingBoard());
    setPlayerColor("w");
    setTurn("w");
    setSelected(null);
    setGameOver(null);
    setReformCount(0);
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
    if (turn === playerColor) {
      return playerInCheck
        ? { text: "YOU ARE IN CHECK", color: "hsl(0 100% 60%)" }
        : { text: "YOUR MOVE, CITIZEN", color: "hsl(48 100% 60%)" };
    }
    return { text: "NATTOUN THINKING…", color: "hsl(48 100% 60%)" };
  }, [gameOver, turn, playerColor, playerInCheck]);

  // --------------------------------------------------------------
  // Render
  // --------------------------------------------------------------
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

          {/* Constitutional reform flash overlay */}
          <AnimatePresence>
            {colorFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, rgba(255,0,128,0.25) 0 12px, rgba(0,0,0,0.5) 12px 24px)",
                }}
              >
                <div className="text-pink-300 font-black uppercase tracking-widest text-3xl md:text-5xl text-center px-4">
                  🚨 CONSTITUTIONAL REFORM 🚨
                  <div className="text-yellow-300 text-xs md:text-base mt-2 font-mono">
                    Nattoun is now {nattounColor === "w" ? "WHITE" : "BLACK"}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fixed-size board wrapper. The board is exactly 480x480 and stays
              that size regardless of viewport — overflow scrolls horizontally
              on tiny screens so the squares never distort. */}
          <div className="w-full overflow-x-auto flex justify-center">
            <motion.div
              animate={shake ? { x: [-6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-8 grid-rows-8 border-4 border-primary neon-box"
              style={{
                width: "480px",
                height: "480px",
                flexShrink: 0,
              }}
              data-testid="chess-board"
            >
              {board.map((row, r) =>
                row.map((p, c) => {
                  const dark = (r + c) % 2 === 1;
                  const isSel = selected?.r === r && selected?.c === c;
                  const isMoveTarget = selected
                    ? validMoves.some(([mr, mc]) => mr === r && mc === c)
                    : false;
                  const isCapture = isMoveTarget && !!p;
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => onSquare(r, c)}
                      className="relative flex items-center justify-center select-none"
                      style={{
                        width: "60px",
                        height: "60px",
                        background: dark ? "hsl(220 30% 18%)" : "hsl(48 25% 75%)",
                        outline: isSel ? "3px solid hsl(140 100% 60%)" : "none",
                        outlineOffset: "-3px",
                        cursor: gameOver || turn !== playerColor ? "default" : "pointer",
                      }}
                      aria-label={`${notation(r, c)} ${p ?? "empty"}`}
                      data-testid={`square-${notation(r, c)}`}
                    >
                      {p && (
                        <span
                          className="select-none"
                          style={{
                            fontSize: "40px",
                            lineHeight: 1,
                            color: p[0] === "w" ? "#fff" : "#000",
                            textShadow: p[0] === "w" ? "0 0 4px #000" : "0 0 2px #fff",
                          }}
                        >
                          {glyphFor(p)}
                        </span>
                      )}
                      {/* Move-target dot / capture ring */}
                      {isMoveTarget && !isCapture && (
                        <span
                          className="absolute pointer-events-none rounded-full"
                          style={{
                            width: "16px",
                            height: "16px",
                            background: "hsla(140, 100%, 55%, 0.55)",
                          }}
                        />
                      )}
                      {isCapture && (
                        <span
                          className="absolute inset-1 pointer-events-none rounded-full"
                          style={{
                            border: "3px solid hsla(0, 100%, 60%, 0.7)",
                          }}
                        />
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
          </div>

          <div
            className="mt-3 px-3 py-1 border-2 font-mono uppercase tracking-widest text-xs"
            style={{
              borderColor: status.color,
              color: status.color,
              textShadow: `0 0 6px ${status.color}`,
            }}
            data-testid="text-game-status"
          >
            {status.text}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 justify-center text-[10px] font-mono uppercase tracking-widest">
            <span className="px-2 py-1 border border-primary/40 text-primary/80">
              You: {playerColor === "w" ? "WHITE ♔" : "BLACK ♚"}
            </span>
            <span className="px-2 py-1 border border-pink-400/40 text-pink-300">
              Nattoun: {nattounColor === "w" ? "WHITE ♔" : "BLACK ♚"}
            </span>
            {reformCount > 0 && (
              <span className="px-2 py-1 border border-yellow-400/60 text-yellow-300">
                Reforms: {reformCount}
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={reset}
              data-testid="button-restart"
              className="px-4 py-2 border-2 border-primary text-primary font-mono uppercase text-xs neon-box hover:bg-primary/20"
            >
              {gameOver ? "Play again (lose again)" : "Restart"}
            </button>
            <button
              onClick={resign}
              disabled={!!gameOver}
              data-testid="button-resign"
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
