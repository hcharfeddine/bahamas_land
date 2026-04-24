import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Gamepad2, Dices, TrendingUp, Hash, Scissors, Radio } from "lucide-react";

const GAMES = [
  { path: "/wheel", title: "Wheel of Verdicts", desc: "Spin the wheel. Receive justice.", icon: Dices, color: "hsl(320 100% 60%)" },
  { path: "/stocks", title: "Nattoun Coin Exchange", desc: "Real fake money. Real emotional damage.", icon: TrendingUp, color: "hsl(140 100% 55%)" },
  { path: "/tictactoe", title: "Tic-Tac-Toe vs Nattoun", desc: "He cheats. He still wins.", icon: Hash, color: "hsl(190 100% 60%)" },
  { path: "/rps", title: "Rock · Paper · Scissors", desc: "He guesses your moves. He guesses correctly.", icon: Scissors, color: "hsl(48 100% 60%)" },
  { path: "/stream", title: "Live Stream Hub", desc: "Daily 17:30. He opens whenever else.", icon: Radio, color: "hsl(0 100% 60%)" },
];

export default function Arcade() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full py-6 space-y-8">
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 mx-auto text-primary neon-text" />
          <h1 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-widest neon-text mt-2">
            The Arcade
          </h1>
          <p className="text-secondary font-mono text-xs uppercase mt-2">State-licensed entertainment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GAMES.map((g, i) => (
            <motion.div
              key={g.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={g.path}
                className="block bg-black/70 border-2 p-6 hover:scale-[1.03] transition-transform clickable h-full"
                style={{ borderColor: g.color, boxShadow: `0 0 12px ${g.color}66, inset 0 0 12px ${g.color}22` }}
              >
                <g.icon className="w-10 h-10 mb-3" style={{ color: g.color }} />
                <h3 className="font-black uppercase tracking-widest text-base mb-1" style={{ color: g.color }}>
                  {g.title}
                </h3>
                <p className="text-white/60 font-mono text-xs uppercase">{g.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
