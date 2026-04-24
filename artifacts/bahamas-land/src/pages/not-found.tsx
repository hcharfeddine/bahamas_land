import { Link } from "wouter";
import { motion } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black relative overflow-hidden p-6">
      {/* Pulsing background */}
      <motion.div
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute inset-0 bg-primary/20 pointer-events-none"
      />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,0,150,0.05)_2px,rgba(255,0,150,0.05)_4px)] pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full text-center space-y-6">
        <motion.img
          src={nattounImg}
          alt="Angry Nattoun"
          className="w-40 h-40 mx-auto object-cover drop-shadow-[0_0_30px_hsl(var(--primary))]"
          animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />

        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl md:text-7xl font-black text-primary uppercase tracking-widest"
          style={{ textShadow: "0 0 12px hsl(var(--primary))" }}
        >
          404
        </motion.h1>

        <h2 className="text-xl md:text-3xl font-bold text-secondary uppercase tracking-wider" style={{ textShadow: "0 0 8px hsl(var(--secondary))" }}>
          Banned from Bahamas Land
        </h2>

        <div className="bg-black/60 border-2 border-primary p-6 neon-box space-y-3 text-left max-w-lg mx-auto">
          <p className="text-primary font-mono text-sm uppercase">
            <span className="text-secondary">{">"}</span> Nattoun: "You went somewhere that does not exist."
          </p>
          <p className="text-primary font-mono text-sm uppercase">
            <span className="text-secondary">{">"}</span> Nattoun: "Suspicious."
          </p>
          <p className="text-primary font-mono text-sm uppercase">
            <span className="text-secondary">{">"}</span> Nattoun: "Return to the map. Now."
          </p>
        </div>

        <Link
          href="/world"
          className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black uppercase font-black tracking-widest text-sm transition-colors neon-box"
        >
          <ChevronLeft className="w-4 h-4" />
          Return to Map
        </Link>
      </div>
    </div>
  );
}
