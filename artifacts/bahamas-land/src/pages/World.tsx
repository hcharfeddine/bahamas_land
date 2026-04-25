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
  /** % position of the building on the map (top-left of the sprite) */
  x: number;
  y: number;
  /** width as % of map width */
  w: number;
};

const BUILDINGS: Building[] = [
  { id: "palace",     label: "Palace",       route: "/palace",     img: bldPalace,       x: 42, y:  6, w: 18 },
  { id: "court",      label: "Court",        route: "/court",      img: bldCourt,        x: 14, y: 22, w: 16 },
  { id: "police",     label: "Police",       route: "/police",     img: bldPolice,       x: 70, y: 22, w: 16 },
  { id: "bank",       label: "Bank",         route: "/bank",       img: bldBank,         x: 30, y: 40, w: 16 },
  { id: "museum",     label: "Museum",       route: "/museum",     img: bldMuseum,       x: 56, y: 40, w: 16 },
  { id: "library",    label: "Library",      route: "/library",    img: bldLibrary,      x: 10, y: 58, w: 16 },
  { id: "postoffice", label: "Post Office",  route: "/postoffice", img: bldPostOffice,   x: 42, y: 60, w: 18 },
  { id: "arcade",     label: "Arcade",       route: "/arcade",     img: bldArcade,       x: 74, y: 58, w: 16 },
  { id: "stream",     label: "Stream Studio", route: "/stream",    img: bldStreamStudio, x: 42, y: 78, w: 18 },
];

export default function World() {
  const [, setLocation] = useLocation();

  const go = (route: string) => {
    audio.playBlip();
    setLocation(route);
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto py-2 select-none">
        <div className="text-center mb-3">
          <h1 className="text-2xl md:text-4xl font-black text-primary uppercase tracking-[0.25em] neon-text">
            Bahamas Land — World Map
          </h1>
          <p className="text-secondary text-xs md:text-sm font-mono uppercase tracking-widest mt-1 opacity-80">
            [ Click a building to enter ]
          </p>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-md border-2 border-primary"
          style={{
            aspectRatio: "16 / 10",
            backgroundImage: `url(${mapBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 0 30px hsl(var(--primary)/0.25)",
          }}
        >
          {BUILDINGS.map((b) => (
            <motion.button
              key={b.id}
              onClick={() => go(b.route)}
              className="absolute group cursor-pointer focus:outline-none"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.w}%`,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              data-testid={`map-building-${b.id}`}
              aria-label={`Enter ${b.label}`}
            >
              <img
                src={b.img}
                alt={b.label}
                className="w-full h-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)] transition-[filter] duration-200 group-hover:drop-shadow-[0_0_12px_hsl(var(--primary))]"
                draggable={false}
              />
              <span
                className="block text-center mt-1 font-mono uppercase tracking-widest text-[10px] md:text-xs px-1.5 py-0.5 bg-black/70 border border-primary text-primary group-hover:bg-primary group-hover:text-black transition-colors"
              >
                {b.label}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="text-center mt-3 text-secondary/80 text-xs font-mono uppercase tracking-widest">
          {BUILDINGS.length} locations · more coming soon
        </div>
      </div>
    </Layout>
  );
}
