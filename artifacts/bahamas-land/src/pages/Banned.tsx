import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { unlock } from "@/lib/achievements";
import { audio } from "@/lib/audio";

export default function Banned() {
  const [phase, setPhase] = useState<"banned" | "joke">("banned");

  useEffect(() => {
    unlock("urlsnoop");
    unlock("suspect");
    audio.playGlitch();
    const t = window.setTimeout(() => {
      setPhase("joke");
      audio.playBlip();
    }, 3500);
    return () => window.clearTimeout(t);
  }, []);

  if (phase === "banned") {
    return (
      <div className="min-h-screen bg-black text-red-500 flex flex-col items-center justify-center font-mono uppercase tracking-widest p-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl md:text-8xl font-black mb-6"
          style={{ textShadow: "0 0 20px red" }}
        >
          BANNED
        </motion.div>
        <div className="max-w-lg text-center text-sm md:text-base text-red-400 leading-relaxed">
          Your IP address (192.168.PRESIDENT.NATTOUN) has been logged.
          <br />
          You have been permanently exiled from Bahamas Land for the following reasons:
        </div>
        <ul className="mt-4 text-red-300 text-xs md:text-sm space-y-1 text-center">
          <li>• Excessive curiosity</li>
          <li>• Unauthorized URL access</li>
          <li>• Vibes do not match</li>
          <li>• President said so</li>
        </ul>
        <div className="mt-8 text-red-500/60 text-xs animate-pulse">
          Awaiting deportation...
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black text-primary flex flex-col items-center justify-center font-mono uppercase tracking-widest p-6 text-center"
    >
      <motion.img
        src={nattounImg}
        data-nattoun="true"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-40 h-40 object-contain mb-6 cursor-pointer"
        alt="Nattoun"
      />
      <div className="text-4xl md:text-6xl font-black mb-3 neon-text">JUST KIDDING</div>
      <div className="text-secondary text-sm md:text-base mb-6">(KIND OF.)</div>
      <Link
        href="/world"
        className="bg-primary text-black px-6 py-3 font-black uppercase tracking-widest hover:bg-primary/80"
      >
        Return to map
      </Link>
    </motion.div>
  );
}
