import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { audio } from "@/lib/audio";

type Cell = "X" | "O" | null;

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(b: Cell[]): { winner: Cell; line: number[] | null } {
  for (const line of WINS) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line };
  }
  return { winner: null, line: null };
}

function bestMove(b: Cell[]): number {
  // Nattoun cheats. He wins if possible, blocks if needed, otherwise picks center, then corners.
  // Try to win
  for (const line of WINS) {
    const cells = line.map((i) => b[i]);
    if (cells.filter((c) => c === "O").length === 2 && cells.includes(null)) {
      return line[cells.indexOf(null)];
    }
  }
  // Block
  for (const line of WINS) {
    const cells = line.map((i) => b[i]);
    if (cells.filter((c) => c === "X").length === 2 && cells.includes(null)) {
      return line[cells.indexOf(null)];
    }
  }
  if (b[4] === null) return 4;
  for (const i of [0, 2, 6, 8]) if (b[i] === null) return i;
  for (const i of [1, 3, 5, 7]) if (b[i] === null) return i;
  return -1;
}

const TAUNTS = [
  "Pathetic.",
  "I have been playing tic-tac-toe since you were nothing.",
  "This is what you call strategy?",
  "Nattoun is winning. Nattoun is always winning.",
  "Try harder. Or do not.",
  "I trained on the chat.",
  "You should consider a new hobby.",
];

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [taunt, setTaunt] = useState("Your move, citizen.");
  const [score, setScore] = useState({ you: 0, dog: 0, draws: 0 });
  const [cheated, setCheated] = useState<number | null>(null);

  const result = checkWinner(board);
  const isFull = board.every((c) => c !== null);
  const gameOver = !!result.winner || isFull;

  useEffect(() => {
    if (gameOver) {
      if (result.winner === "X") {
        // Nattoun "cheats": flips one of your X to O after a delay
        const xs = board.map((c, i) => (c === "X" ? i : -1)).filter((i) => i >= 0);
        const flip = xs[Math.floor(Math.random() * xs.length)];
        window.setTimeout(() => {
          setCheated(flip);
          setTaunt("INVALID MOVE. Reviewing tape... Nattoun wins.");
          window.setTimeout(() => {
            const newBoard = [...board];
            newBoard[flip] = "O";
            setBoard(newBoard);
            setScore((s) => ({ ...s, dog: s.dog + 1 }));
            setCheated(null);
          }, 1500);
        }, 600);
      } else if (result.winner === "O") {
        setTaunt("Nattoun wins. Naturally.");
        setScore((s) => ({ ...s, dog: s.dog + 1 }));
      } else {
        setTaunt("Draw. Nattoun does not accept draws. He will return.");
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, result.winner]);

  useEffect(() => {
    if (turn === "O" && !gameOver) {
      const timer = window.setTimeout(() => {
        const move = bestMove(board);
        if (move >= 0) {
          const next = [...board];
          next[move] = "O";
          setBoard(next);
          setTurn("X");
          setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
          audio.playBlip();
        }
      }, 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [turn, board, gameOver]);

  const handleClick = (i: number) => {
    if (board[i] || gameOver || turn !== "X" || cheated !== null) return;
    const next = [...board];
    next[i] = "X";
    setBoard(next);
    setTurn("O");
    audio.playBlip();
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setTaunt("Your move, citizen.");
    setCheated(null);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-widest neon-text">
            Tic-Tac-Toe vs Nattoun
          </h1>
          <p className="text-secondary font-mono text-xs uppercase mt-2">You are X. He is O. He is also the referee.</p>
        </div>

        <div className="flex items-center gap-4">
          <img src={nattounImg} alt="Nattoun" className="w-16 h-16 object-cover border-2 border-primary neon-box" />
          <div className="bg-black/80 border-2 border-secondary px-4 py-2 max-w-xs neon-box-cyan">
            <p className="text-secondary font-mono text-sm">"{taunt}"</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-primary/10 p-2 border-2 border-primary neon-box">
          {board.map((c, i) => (
            <motion.button
              key={i}
              onClick={() => handleClick(i)}
              whileHover={!c && !gameOver && turn === "X" ? { scale: 1.05 } : {}}
              whileTap={!c && !gameOver && turn === "X" ? { scale: 0.95 } : {}}
              className={`w-20 h-20 md:w-24 md:h-24 bg-black border border-primary/50 text-4xl md:text-5xl font-black flex items-center justify-center transition-colors clickable ${
                cheated === i ? "border-secondary" : ""
              } ${result.line?.includes(i) ? "bg-primary/20" : ""}`}
              style={{
                color: c === "X" ? "hsl(var(--secondary))" : "hsl(var(--primary))",
                textShadow: c ? `0 0 8px ${c === "X" ? "hsl(var(--secondary))" : "hsl(var(--primary))"}` : undefined,
              }}
            >
              {c}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
          <div className="text-secondary">YOU: {score.you}</div>
          <div className="text-primary">NATTOUN: {score.dog}</div>
          <div className="text-white/50">DRAWS: {score.draws}</div>
        </div>

        <Button
          onClick={reset}
          className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black uppercase font-bold tracking-widest"
        >
          New Game
        </Button>
      </div>
    </Layout>
  );
}
