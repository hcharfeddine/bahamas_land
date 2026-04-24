import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { unlock } from "@/lib/achievements";

type Dog = { id: number; x: number; delay: number; rot: number; size: number };

export function OGCheat() {
  const [active, setActive] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);

  useEffect(() => {
    let buffer = "";
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (!/^[a-zA-Z]$/.test(e.key)) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-2);
      if (buffer === "og") {
        buffer = "";
        trigger();
      }
    };

    const trigger = () => {
      unlock("og");
      const newDogs: Dog[] = Array.from({ length: 14 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        rot: (Math.random() - 0.5) * 720,
        size: 60 + Math.random() * 80,
      }));
      setDogs(newDogs);
      setActive(true);
      window.setTimeout(() => {
        setActive(false);
        setDogs([]);
      }, 5000);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-[60] overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/80 border-2 border-primary px-6 py-2 text-primary uppercase tracking-widest font-black text-sm neon-box"
            style={{ textShadow: "0 0 8px hsl(var(--primary))" }}
          >
            OG MODE ACTIVATED
          </motion.div>

          {dogs.map((d) => (
            <motion.img
              key={d.id}
              src={nattounImg}
              alt=""
              initial={{ y: -200, x: `${d.x}vw`, rotate: 0, opacity: 0 }}
              animate={{ y: "110vh", rotate: d.rot, opacity: [0, 1, 1, 0.8, 0] }}
              transition={{ duration: 4, delay: d.delay, ease: "easeIn" }}
              style={{
                position: "absolute",
                width: d.size,
                height: d.size,
                objectFit: "cover",
                filter: "drop-shadow(0 0 12px hsl(var(--primary)))",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
