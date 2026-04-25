import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { audio } from "@/lib/audio";

import mapBg from "@assets/generated_images/bahamas_map_bg.png";
import bldPalace from "@assets/generated_images/bld_palace.png";
import bldCourt from "@assets/generated_images/bld_court.png";
import bldBank from "@assets/generated_images/bld_bank.png";
import bldArcade from "@assets/generated_images/bld_arcade.png";
import bldLibrary from "@assets/generated_images/bld_library.png";
import bldMuseum from "@assets/generated_images/bld_museum.png";
import bldPolice from "@assets/generated_images/bld_police.png";
import bldPostOffice from "@assets/generated_images/bld_postoffice.png";
import bldStreamStudio from "@assets/generated_images/bld_stream_studio.png";

type Building = {
  id: string;
  label: string;
  route: string;
  img: string;
  /** row: 0 = back (small, far), 1 = middle, 2 = front (big, close) */
  row: 0 | 1 | 2;
  /** column position 0..2 within its row */
  col: 0 | 1 | 2;
};

const BUILDINGS: Building[] = [
  // Back row — small & faded into the horizon
  { id: "palace",     label: "Palace",      route: "/palace",     img: bldPalace,        row: 0, col: 1 },
  { id: "court",      label: "Court",       route: "/court",      img: bldCourt,         row: 0, col: 0 },
  { id: "police",     label: "Police HQ",   route: "/police",     img: bldPolice,        row: 0, col: 2 },
  // Middle row
  { id: "museum",     label: "Museum",      route: "/museum",     img: bldMuseum,        row: 1, col: 0 },
  { id: "postoffice", label: "Post Office", route: "/postoffice", img: bldPostOffice,    row: 1, col: 1 },
  { id: "library",    label: "Library",     route: "/library",    img: bldLibrary,       row: 1, col: 2 },
  // Front row — big & in your face
  { id: "bank",       label: "Bank",        route: "/bank",       img: bldBank,          row: 2, col: 0 },
  { id: "stream",     label: "Stream HQ",   route: "/stream",     img: bldStreamStudio,  row: 2, col: 1 },
  { id: "arcade",     label: "Arcade",      route: "/arcade",     img: bldArcade,        row: 2, col: 2 },
];

/** Perspective: back row sits high & small on the grid, front row low & large. */
const ROW_LAYOUT: Record<0 | 1 | 2, { top: string; height: string; spread: number; opacity: number }> = {
  0: { top: "44%", height: "20%", spread: 28, opacity: 0.78 }, // far
  1: { top: "55%", height: "30%", spread: 34, opacity: 0.92 }, // mid
  2: { top: "68%", height: "42%", spread: 40, opacity: 1.0  }, // near
};

function colToLeft(col: 0 | 1 | 2, spread: number): string {
  // Spread is the horizontal distance (in %) between centers; centered around 50%.
  const offset = (col - 1) * spread;
  return `calc(50% + ${offset}% - ${spread / 2}%)`;
}

export default function World() {
  const [, setLocation] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);

  const go = (route: string) => {
    audio.playBlip();
    setLocation(route);
  };

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto py-2 select-none">
        {/* Title */}
        <div className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-[0.3em] neon-text">
            Bahamas Land
          </h1>
          <p className="text-secondary text-xs md:text-sm font-mono uppercase tracking-[0.4em] mt-1 opacity-80">
            ▸ Choose your destination ◂
          </p>
        </div>

        {/* Map stage */}
        <div
          className="relative w-full overflow-hidden rounded-md border-2 border-primary"
          style={{
            aspectRatio: "1408 / 768",
            boxShadow: "0 0 40px hsl(var(--primary)/0.45), inset 0 0 80px rgba(0,0,0,0.4)",
          }}
        >
          {/* Background */}
          <img
            src={mapBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {/* Vignette / mood overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/55" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.55)_100%)]" />

          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
            }}
          />

          {/* Buildings */}
          {BUILDINGS.map((b) => {
            const layout = ROW_LAYOUT[b.row];
            const isHovered = hovered === b.id;
            const isDimmed = hovered !== null && !isHovered;
            return (
              <motion.button
                key={b.id}
                onClick={() => go(b.route)}
                onMouseEnter={() => setHovered(b.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(b.id)}
                onBlur={() => setHovered(null)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                style={{
                  left: colToLeft(b.col, layout.spread),
                  top: layout.top,
                  height: layout.height,
                  zIndex: 10 + b.row, // closer rows render on top
                }}
                initial={{ opacity: 0, y: 24 }}
                animate={{
                  opacity: isDimmed ? 0.4 : layout.opacity,
                  y: 0,
                }}
                whileHover={{ scale: 1.18, y: -10 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 240, damping: 20 }}
                data-testid={`map-building-${b.id}`}
                aria-label={`Enter ${b.label}`}
              >
                {/* Glow disc under the building */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-300"
                  style={{
                    bottom: "-4%",
                    width: "85%",
                    height: "12%",
                    background: isHovered
                      ? "radial-gradient(ellipse at center, hsl(var(--primary)/0.85), transparent 70%)"
                      : "radial-gradient(ellipse at center, hsl(var(--primary)/0.35), transparent 70%)",
                    filter: isHovered ? "blur(6px)" : "blur(4px)",
                  }}
                />

                {/* Building image */}
                <img
                  src={b.img}
                  alt={b.label}
                  draggable={false}
                  className="relative h-full w-auto pointer-events-none transition-[filter] duration-200"
                  style={{
                    filter: isHovered
                      ? "drop-shadow(0 0 18px hsl(var(--primary))) drop-shadow(0 8px 12px rgba(0,0,0,0.7))"
                      : "drop-shadow(0 6px 10px rgba(0,0,0,0.65))",
                  }}
                />

                {/* Neon label — only visible on hover */}
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
                  style={{ top: "-22px" }}
                  initial={false}
                  animate={{
                    opacity: isHovered ? 1 : 0,
                    y: isHovered ? 0 : 8,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  <span className="block px-3 py-1 bg-black/85 border border-primary text-primary font-mono text-[11px] md:text-sm uppercase tracking-[0.25em] neon-box">
                    {b.label}
                  </span>
                </motion.div>
              </motion.button>
            );
          })}

          {/* Pulsing horizon glow */}
          <motion.div
            className="absolute inset-x-0 pointer-events-none"
            style={{
              top: "38%",
              height: "8%",
              background:
                "linear-gradient(to bottom, transparent, hsl(var(--primary)/0.35), transparent)",
              filter: "blur(8px)",
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Footer hint */}
          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
            <p className="text-primary/80 font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] animate-pulse">
              [ Hover · Click to enter ]
            </p>
          </div>
        </div>

        <div className="text-center mt-3 text-secondary/70 text-xs font-mono uppercase tracking-[0.3em]">
          {BUILDINGS.length} locations · welcome to paradise
        </div>
      </div>
    </Layout>
  );
}
