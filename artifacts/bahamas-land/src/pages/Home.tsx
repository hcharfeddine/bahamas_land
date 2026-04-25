import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import m3kkyImg from "@assets/m3kky_1777028672745.png";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";

const PATIENT_MS = 10_000;

export default function Home() {
  const [, setLocation] = useLocation();
  const [isZooming, setIsZooming] = useState(false);
  const patientTimer = useRef<number | null>(null);
  const patientLastMove = useRef(0);

  const handleClick = () => {
    if (isZooming) return;
    setIsZooming(true);
    audio.playZoom();

    // Sequence: zoom for 2s, then navigate
    setTimeout(() => {
      setLocation("/world");
    }, 2000);
  };

  // ---------------------------------------------------------------
  // PATIENT egg: stand still on the home portrait for 10 seconds.
  // Any pointer movement >2px or click resets the timer.
  // ---------------------------------------------------------------
  useEffect(() => {
    let lastX = -1, lastY = -1;
    const start = (e: PointerEvent) => {
      if (isZooming) return;
      lastX = e.clientX;
      lastY = e.clientY;
      patientLastMove.current = Date.now();
      if (patientTimer.current) window.clearTimeout(patientTimer.current);
      patientTimer.current = window.setTimeout(() => {
        if (!isZooming) {
          unlock("patient");
          window.dispatchEvent(
            new CustomEvent("egg-flash", {
              detail: { text: "⏳ PATIENT CITIZEN", sub: "10 seconds. Not one twitch." },
            }),
          );
        }
      }, PATIENT_MS);
    };
    const move = (e: PointerEvent) => {
      if (lastX < 0) return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 2) {
        lastX = e.clientX;
        lastY = e.clientY;
        if (patientTimer.current) window.clearTimeout(patientTimer.current);
        patientTimer.current = window.setTimeout(() => {
          if (!isZooming) {
            unlock("patient");
            window.dispatchEvent(
              new CustomEvent("egg-flash", {
                detail: { text: "⏳ PATIENT CITIZEN", sub: "10 seconds. Not one twitch." },
              }),
            );
          }
        }, PATIENT_MS);
      }
    };
    const stop = () => {
      lastX = -1;
      lastY = -1;
      if (patientTimer.current) {
        window.clearTimeout(patientTimer.current);
        patientTimer.current = null;
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", start);
    window.addEventListener("pointerleave", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("pointerleave", stop);
      if (patientTimer.current) window.clearTimeout(patientTimer.current);
    };
  }, [isZooming]);

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-black overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <motion.div
        className="w-full h-full origin-[60%_42%]" // nose area: shifted up and slightly right
        animate={
          isZooming
            ? { scale: 40, opacity: 0, filter: "blur(10px)" }
            : { scale: 1, opacity: 1, filter: "blur(0px)" }
        }
        transition={{
          duration: 2.2,
          ease: [0.64, 0, 0.78, 0], // dramatic ease-in
        }}
      >
        <img 
          src={m3kkyImg} 
          alt="M3kky" 
          className="w-full h-full object-cover opacity-80 mix-blend-luminosity"
        />
      </motion.div>

      {/* Grain / Noise overlay just for the intro */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')] mix-blend-overlay" />

      <AnimatePresence>
        {!isZooming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-12 left-0 right-0 text-center pointer-events-none"
          >
            <p className="text-primary font-mono text-xl tracking-widest uppercase animate-pulse neon-text">
              [ Click Anywhere to Enter ]
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
