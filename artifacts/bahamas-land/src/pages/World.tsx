import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, useMotionValue } from "framer-motion";
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
import bldWeather from "@assets/generated_images/bld_weather.png";
import bldAnthem from "@assets/generated_images/bld_anthem.png";
import bldCustomerService from "@assets/generated_images/bld_customer_service.png";

type Building = {
  id: string;
  label: string;
  route: string;
  img: string;
  /** Optional height multiplier (1 = default). Use < 1 for very wide art. */
  scale?: number;
};

const BUILDINGS: Building[] = [
  { id: "palace",     label: "Palace",      route: "/palace",     img: bldPalace },
  { id: "court",      label: "Court",       route: "/court",      img: bldCourt },
  { id: "police",     label: "Police HQ",   route: "/police",     img: bldPolice },
  { id: "bank",       label: "Bank",        route: "/bank",       img: bldBank },
  { id: "museum",     label: "Museum",      route: "/museum",     img: bldMuseum },
  { id: "library",    label: "Library",     route: "/library",    img: bldLibrary },
  { id: "postoffice", label: "Post Office", route: "/postoffice", img: bldPostOffice },
  { id: "weather",    label: "Weather",     route: "/weather",    img: bldWeather },
  { id: "anthem",     label: "Anthem Hall", route: "/anthem",     img: bldAnthem },
  { id: "arcade",          label: "Arcade",           route: "/arcade",           img: bldArcade },
  { id: "customer-service", label: "Customer Service", route: "/customer-service", img: bldCustomerService },
];

export default function World() {
  const [, setLocation] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [dragLimits, setDragLimits] = useState({ left: 0, right: 0 });
  const [dragging, setDragging] = useState(false);
  const dragMoved = useRef(0);

  // Compute drag bounds whenever the viewport / track resize.
  useEffect(() => {
    const update = () => {
      const vw = viewportRef.current?.clientWidth ?? 0;
      const tw = trackRef.current?.scrollWidth ?? 0;
      const overflow = Math.max(0, tw - vw);
      setDragLimits({ left: -overflow, right: 0 });
    };
    update();
    const ro = new ResizeObserver(update);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const go = (route: string) => {
    audio.playBlip();
    setLocation(route);
  };

  return (
    <Layout showBack={false}>
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

        {/* How to use — explicit instructions */}
        <div className="mx-auto mb-3 max-w-2xl rounded-md border-2 border-primary bg-black/70 px-4 py-2 text-center neon-box">
          <p className="font-mono text-[11px] md:text-sm uppercase tracking-[0.2em] text-primary">
            ◀ Click &amp; drag the map left or right to explore the city ▶
          </p>
          <p className="font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] text-secondary mt-1 opacity-90">
            Click any building to enter
          </p>
        </div>

        {/* Map stage — fixed viewport, draggable horizontal track inside */}
        <div
          ref={viewportRef}
          className="relative w-full overflow-hidden rounded-md border-2 border-primary"
          style={{
            aspectRatio: "1408 / 768",
            boxShadow: "0 0 40px hsl(var(--primary)/0.45), inset 0 0 80px rgba(0,0,0,0.4)",
          }}
        >
          {/* Static background fills the viewport */}
          <img
            src={mapBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {/* Vignette + scanlines */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/55" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.55)_100%)]" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
            }}
          />

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

          {/* Edge fade hints (so the user senses there's more off-screen) */}
          <div className="absolute inset-y-0 left-0 w-12 md:w-20 pointer-events-none bg-gradient-to-r from-black/70 to-transparent z-30" />
          <div className="absolute inset-y-0 right-0 w-12 md:w-20 pointer-events-none bg-gradient-to-l from-black/70 to-transparent z-30" />

          {/* Animated arrow hints */}
          <motion.div
            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 pointer-events-none z-40 text-primary text-2xl md:text-4xl font-black neon-text"
            animate={{ x: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            ◀
          </motion.div>
          <motion.div
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 pointer-events-none z-40 text-primary text-2xl md:text-4xl font-black neon-text"
            animate={{ x: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            ▶
          </motion.div>

          {/* Draggable building track — single row */}
          <motion.div
            ref={trackRef}
            drag="x"
            dragConstraints={dragLimits}
            dragElastic={0.08}
            dragMomentum
            onDragStart={() => {
              setDragging(true);
              dragMoved.current = 0;
            }}
            onDrag={(_, info) => {
              dragMoved.current = Math.max(dragMoved.current, Math.abs(info.offset.x));
            }}
            onDragEnd={() => {
              // Let the synthetic click that fires right after release read dragMoved
              // (so a real drag doesn't accidentally enter a building), then clear it
              // so the *next* clean click on a building works.
              window.setTimeout(() => {
                setDragging(false);
                dragMoved.current = 0;
              }, 120);
            }}
            className="absolute inset-y-0 left-0 flex items-end gap-6 md:gap-10 px-[10%] cursor-grab active:cursor-grabbing z-20"
            style={{ x, touchAction: "pan-y" }}
          >
            {BUILDINGS.map((b) => {
              const isHovered = hovered === b.id;
              const isDimmed = hovered !== null && !isHovered;
              return (
                <motion.button
                  key={b.id}
                  onClick={() => {
                    // suppress click if the user actually dragged, then clear
                    // the flag so the very next plain click works.
                    if (dragMoved.current > 6) {
                      dragMoved.current = 0;
                      return;
                    }
                    go(b.route);
                  }}
                  onMouseEnter={() => !dragging && setHovered(b.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(b.id)}
                  onBlur={() => setHovered(null)}
                  className="relative flex-shrink-0 group focus:outline-none flex items-end"
                  style={{
                    height: `${70 * (b.scale ?? 1)}%`,
                    marginBottom: "4%",
                  }}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{
                    opacity: isDimmed ? 0.45 : 1,
                    y: 0,
                  }}
                  whileHover={{ scale: 1.08, y: -8 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                  data-testid={`map-building-${b.id}`}
                  aria-label={`Enter ${b.label}`}
                  draggable={false}
                >
                  {/* Glow disc under the building */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-300"
                    style={{
                      bottom: "-10%",
                      width: "85%",
                      height: "14%",
                      background: isHovered
                        ? "radial-gradient(ellipse at center, hsl(var(--primary)/0.85), transparent 70%)"
                        : "radial-gradient(ellipse at center, hsl(var(--primary)/0.4), transparent 70%)",
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

                  {/* Always-visible label so users know what each is */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-7 md:-top-8 pointer-events-none whitespace-nowrap">
                    <span
                      className={`block px-2.5 py-1 bg-black/85 border border-primary font-mono text-[10px] md:text-xs uppercase tracking-[0.25em] transition-colors ${
                        isHovered ? "bg-primary text-black neon-box" : "text-primary"
                      }`}
                    >
                      {b.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Footer hint */}
          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-40">
            <p className="text-primary/80 font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] animate-pulse">
              [ Drag to explore · Click to enter ]
            </p>
          </div>
        </div>

        <div className="text-center mt-3 text-secondary/70 text-xs font-mono uppercase tracking-[0.3em]">
          {BUILDINGS.length} locations · welcome to paradise
        </div>

        {/* State archives — wanted board + decrees */}
        <div className="mt-4 mb-2 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-secondary/60 mr-1">
            ★ State Archives ★
          </span>
          <button
            onClick={() => setLocation("/wanted")}
            data-testid="link-wanted"
            className="px-3 py-1.5 text-xs md:text-sm font-mono uppercase tracking-widest border-2 border-amber-500/70 bg-amber-100 text-stone-900 hover:bg-amber-200 transition shadow-md"
          >
            🪧 Most Wanted
          </button>
          <button
            onClick={() => setLocation("/decrees")}
            data-testid="link-decrees"
            className="px-3 py-1.5 text-xs md:text-sm font-mono uppercase tracking-widest border-2 border-red-700/70 bg-amber-50 text-stone-900 hover:bg-amber-100 transition shadow-md"
          >
            📜 State Decrees
          </button>
          <button
            onClick={() => setLocation("/ranking")}
            data-testid="link-ranking"
            className="px-3 py-1.5 text-xs md:text-sm font-mono uppercase tracking-widest border-2 border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-400 hover:text-black transition shadow-md neon-box"
          >
            🏆 Citizens Ranking
          </button>
        </div>
      </div>
    </Layout>
  );
}
