import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { unlock } from "@/lib/achievements";
import { audio } from "@/lib/audio";

const TOTAL = 30;

export default function Exile() {
  const [seconds, setSeconds] = useState(TOTAL);
  const [done, setDone] = useState(false);

  useEffect(() => {
    unlock("urlsnoop");
    audio.playGlitch();
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setDone(true);
          unlock("exiled");
          audio.playCoin();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono uppercase tracking-widest p-6 text-center relative overflow-hidden">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,40,80,0.2) 0%, rgba(0,80,160,0.4) 60%, rgba(0,150,200,0.6) 100%)",
        }}
      />
      <div className="relative z-10">
        <div className="text-secondary text-sm mb-3">You have been exiled to</div>
        <h1 className="text-4xl md:text-6xl font-black text-secondary neon-text-cyan mb-8">
          INTERNATIONAL WATERS
        </h1>
        {!done ? (
          <>
            <motion.div
              key={seconds}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-7xl md:text-9xl font-black text-primary neon-text"
            >
              {seconds}
            </motion.div>
            <div className="mt-6 text-white/50 text-xs">Reflect upon what you have done.</div>
          </>
        ) : (
          <>
            <div className="text-3xl md:text-5xl text-primary font-black mb-6 neon-text">
              YOU MAY RETURN
            </div>
            <Link
              href="/world"
              className="bg-primary text-black px-6 py-3 font-black uppercase tracking-widest hover:bg-primary/80 inline-block"
            >
              Re-enter Bahamas Land
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
