import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername, useCoins } from "@/lib/store";
import { Layout } from "@/components/Layout";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import bgImg from "@assets/background_1777028829781.webp";

type BuildingShape = "court" | "museum" | "library" | "bank" | "palace" | "arcade";

interface Location {
  id: string;
  path: string;
  label: string;
  sublabel: string;
  shape: BuildingShape;
  color: string;
  delay: number;
}

const LOCATIONS: Location[] = [
  { id: "bank", path: "/bank", label: "BANK", sublabel: "of Nattoun", shape: "bank", color: "hsl(48 100% 60%)", delay: 0.05 },
  { id: "court", path: "/court", label: "COURT", sublabel: "of OGs", shape: "court", color: "hsl(190 100% 60%)", delay: 0.15 },
  { id: "palace", path: "/palace", label: "PALACE", sublabel: "President", shape: "palace", color: "hsl(320 100% 60%)", delay: 0.25 },
  { id: "museum", path: "/museum", label: "MUSEUM", sublabel: "of OGs", shape: "museum", color: "hsl(280 100% 65%)", delay: 0.35 },
  { id: "library", path: "/library", label: "LIBRARY", sublabel: "Forbidden", shape: "library", color: "hsl(140 100% 55%)", delay: 0.45 },
  { id: "arcade", path: "/arcade", label: "ARCADE", sublabel: "State-Licensed", shape: "arcade", color: "hsl(0 100% 60%)", delay: 0.55 },
];

function Building({ shape, color }: { shape: BuildingShape; color: string }) {
  const stroke = color;
  const fill = "rgba(0, 0, 0, 0.85)";
  const glow = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color})`;
  const common = { stroke, fill, strokeWidth: 2.5, strokeLinejoin: "round" as const };

  switch (shape) {
    case "court":
      return (
        <svg viewBox="0 0 120 140" className="w-full h-full" style={{ filter: glow }}>
          {/* pediment */}
          <polygon points="10,55 60,15 110,55" {...common} />
          {/* architrave */}
          <rect x="8" y="55" width="104" height="10" {...common} />
          {/* columns */}
          <rect x="18" y="65" width="10" height="55" {...common} />
          <rect x="40" y="65" width="10" height="55" {...common} />
          <rect x="70" y="65" width="10" height="55" {...common} />
          <rect x="92" y="65" width="10" height="55" {...common} />
          {/* base */}
          <rect x="5" y="120" width="110" height="14" {...common} />
          {/* steps */}
          <rect x="0" y="134" width="120" height="6" {...common} />
        </svg>
      );
    case "museum":
      return (
        <svg viewBox="0 0 120 140" className="w-full h-full" style={{ filter: glow }}>
          {/* pyramid steps */}
          <polygon points="60,10 35,40 85,40" {...common} />
          <polygon points="25,40 95,40 95,55 25,55" {...common} />
          <polygon points="15,55 105,55 105,75 15,75" {...common} />
          <polygon points="5,75 115,75 115,100 5,100" {...common} />
          <rect x="0" y="100" width="120" height="35" {...common} />
          {/* doorway */}
          <rect x="50" y="110" width="20" height="25" stroke={color} fill={color} opacity="0.4" />
          {/* base line */}
          <line x1="0" y1="135" x2="120" y2="135" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "library":
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" style={{ filter: glow }}>
          {/* spire */}
          <polygon points="60,5 50,25 70,25" {...common} />
          {/* tower top */}
          <rect x="40" y="25" width="40" height="20" {...common} />
          {/* main tower */}
          <rect x="35" y="45" width="50" height="105" {...common} />
          {/* windows */}
          <rect x="48" y="55" width="10" height="14" stroke={color} fill={color} opacity="0.5" />
          <rect x="62" y="55" width="10" height="14" stroke={color} fill={color} opacity="0.5" />
          <rect x="48" y="78" width="10" height="14" stroke={color} fill={color} opacity="0.5" />
          <rect x="62" y="78" width="10" height="14" stroke={color} fill={color} opacity="0.5" />
          <rect x="48" y="101" width="10" height="14" stroke={color} fill={color} opacity="0.5" />
          <rect x="62" y="101" width="10" height="14" stroke={color} fill={color} opacity="0.5" />
          {/* door */}
          <rect x="53" y="125" width="14" height="25" stroke={color} fill={color} opacity="0.4" />
          {/* base */}
          <rect x="20" y="150" width="80" height="8" {...common} />
        </svg>
      );
    case "bank":
      return (
        <svg viewBox="0 0 120 140" className="w-full h-full" style={{ filter: glow }}>
          {/* pediment */}
          <polygon points="5,40 60,10 115,40" {...common} />
          {/* architrave */}
          <rect x="5" y="40" width="110" height="8" {...common} />
          {/* columns */}
          <rect x="15" y="48" width="10" height="65" {...common} />
          <rect x="35" y="48" width="10" height="65" {...common} />
          <rect x="55" y="48" width="10" height="65" {...common} />
          <rect x="75" y="48" width="10" height="65" {...common} />
          <rect x="95" y="48" width="10" height="65" {...common} />
          {/* big door */}
          <rect x="50" y="78" width="20" height="35" stroke={color} fill={color} opacity="0.5" />
          {/* base */}
          <rect x="0" y="113" width="120" height="20" {...common} />
          {/* steps */}
          <rect x="-5" y="133" width="130" height="6" {...common} />
          {/* coin sign */}
          <circle cx="60" cy="28" r="6" stroke={color} fill={color} opacity="0.6" />
        </svg>
      );
    case "arcade":
      return (
        <svg viewBox="0 0 120 140" className="w-full h-full" style={{ filter: glow }}>
          {/* marquee */}
          <rect x="5" y="20" width="110" height="22" {...common} />
          <polygon points="5,20 60,5 115,20" {...common} />
          {/* marquee bulbs */}
          {[15, 30, 45, 60, 75, 90, 105].map((cx) => (
            <circle key={cx} cx={cx} cy="14" r="2.5" stroke={color} fill={color} opacity="0.7" />
          ))}
          {/* facade */}
          <rect x="10" y="42" width="100" height="80" {...common} />
          {/* big window/screen */}
          <rect x="20" y="55" width="80" height="35" stroke={color} fill={color} opacity="0.35" />
          {/* doors */}
          <rect x="40" y="95" width="15" height="27" stroke={color} fill={color} opacity="0.5" />
          <rect x="65" y="95" width="15" height="27" stroke={color} fill={color} opacity="0.5" />
          {/* base */}
          <rect x="0" y="122" width="120" height="14" {...common} />
          <rect x="-5" y="136" width="130" height="4" {...common} />
        </svg>
      );
    case "palace":
      return (
        <svg viewBox="0 0 160 180" className="w-full h-full" style={{ filter: glow }}>
          {/* flag pole + flag */}
          <line x1="80" y1="0" x2="80" y2="20" stroke={color} strokeWidth="2" />
          <polygon points="80,2 100,8 80,14" stroke={color} fill={color} opacity="0.7" />
          {/* central spire */}
          <polygon points="80,20 65,55 95,55" {...common} />
          {/* central tower */}
          <rect x="60" y="55" width="40" height="40" {...common} />
          {/* central tower window */}
          <rect x="72" y="65" width="16" height="20" stroke={color} fill={color} opacity="0.5" />
          {/* left tower */}
          <polygon points="20,40 8,65 32,65" {...common} />
          <rect x="10" y="65" width="22" height="60" {...common} />
          <rect x="14" y="75" width="14" height="14" stroke={color} fill={color} opacity="0.5" />
          {/* right tower */}
          <polygon points="140,40 128,65 152,65" {...common} />
          <rect x="128" y="65" width="22" height="60" {...common} />
          <rect x="132" y="75" width="14" height="14" stroke={color} fill={color} opacity="0.5" />
          {/* main wall */}
          <rect x="32" y="95" width="96" height="55" {...common} />
          {/* battlements */}
          <rect x="32" y="90" width="10" height="8" {...common} />
          <rect x="48" y="90" width="10" height="8" {...common} />
          <rect x="64" y="90" width="10" height="8" {...common} />
          <rect x="80" y="90" width="10" height="8" {...common} />
          <rect x="96" y="90" width="10" height="8" {...common} />
          <rect x="112" y="90" width="10" height="8" {...common} />
          {/* gate */}
          <path d="M 65 150 L 65 120 Q 80 105 95 120 L 95 150 Z" {...common} fill={color} fillOpacity="0.4" />
          {/* base */}
          <rect x="0" y="150" width="160" height="22" {...common} />
          <rect x="-5" y="172" width="170" height="6" {...common} />
        </svg>
      );
  }
}

const buildingHeights: Record<BuildingShape, string> = {
  bank: "h-32 md:h-44",
  court: "h-32 md:h-44",
  palace: "h-44 md:h-64",
  museum: "h-32 md:h-44",
  library: "h-36 md:h-52",
  arcade: "h-32 md:h-44",
};

export default function World() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useUsername();
  const [, setCoins] = useCoins();
  const [showIntro, setShowIntro] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!username) {
      setShowIntro(true);
    }
  }, [username]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim().length > 0 && nameInput.trim().length <= 20) {
      setUsername(nameInput.trim());
      setCoins(1000);
      setShowIntro(false);
    }
  };

  // Konami Code
  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === konamiCode[konamiIndex] || e.key.toLowerCase() === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          setLocation('/secret');
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
      {/* Skyline backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{ backgroundImage: `url(${bgImg})` }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      <Layout showBack={false}>
        <div className="relative w-full min-h-[calc(100dvh-100px)] flex flex-col">
          {/* Welcome banner */}
          <div className="text-center pt-2 pb-4 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-4xl font-bold uppercase tracking-[0.3em] neon-text text-primary"
            >
              Bahamas Land
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-secondary text-xs md:text-sm font-mono uppercase tracking-widest mt-1 opacity-80"
            >
              [ Pick a building. We are watching you. ]
            </motion.p>
          </div>

          {/* DESKTOP: town with road */}
          <div className="relative hidden md:block flex-1 mx-auto w-full max-w-[1400px] px-8">
            {/* Buildings row */}
            <div className="relative flex items-end justify-between gap-4 pt-8">
              {LOCATIONS.map((loc) => (
                <motion.button
                  key={loc.id}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: loc.delay, type: "spring", stiffness: 110, damping: 14 }}
                  whileHover={{ y: -10 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLocation(loc.path)}
                  className="group relative flex-1 max-w-[220px] flex flex-col items-center clickable focus:outline-none"
                >
                  <div className={`relative ${buildingHeights[loc.shape]} w-full flex items-end justify-center transition-transform group-hover:scale-[1.04]`}>
                    <Building shape={loc.shape} color={loc.color} />
                    {/* Glow base */}
                    <div
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{ background: loc.color }}
                    />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* The road */}
            <div className="relative mt-2 mb-8">
              <div className="relative h-24 w-full">
                {/* Road shape (perspective trapezoid) */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 14%) 100%)",
                    clipPath: "polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)",
                    boxShadow: "inset 0 1px 0 hsl(var(--primary) / 0.4), inset 0 -1px 0 hsl(var(--secondary) / 0.4)",
                  }}
                />
                {/* Lane markings */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 flex items-center justify-center gap-6 pointer-events-none">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-12 rounded-full"
                      style={{ background: "hsl(48 100% 70%)", boxShadow: "0 0 8px hsl(48 100% 70%)" }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, delay: i * 0.05, repeat: Infinity }}
                    />
                  ))}
                </div>
                {/* Sign labels above road, anchored to each building */}
              </div>

              {/* Building name signs */}
              <div className="absolute inset-x-0 -top-12 flex items-end justify-between gap-4 px-0 pointer-events-none">
                {LOCATIONS.map((loc) => (
                  <div key={loc.id} className="flex-1 max-w-[220px] flex justify-center">
                    <div
                      className="bg-black/85 border px-3 py-1 text-center font-mono"
                      style={{
                        borderColor: loc.color,
                        boxShadow: `0 0 8px ${loc.color}, inset 0 0 6px ${loc.color}33`,
                      }}
                    >
                      <div className="text-[11px] tracking-[0.25em] font-bold" style={{ color: loc.color }}>
                        {loc.label}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-white/60">
                        {loc.sublabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidewalk / ground */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>

          {/* MOBILE: stacked list of buildings */}
          <div className="md:hidden flex-1 px-4 pb-8 space-y-3">
            {LOCATIONS.map((loc) => (
              <motion.button
                key={loc.id}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: loc.delay }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocation(loc.path)}
                className="w-full flex items-center gap-4 bg-black/70 border-2 p-3 clickable"
                style={{
                  borderColor: loc.color,
                  boxShadow: `0 0 10px ${loc.color}66`,
                }}
              >
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                  <Building shape={loc.shape} color={loc.color} />
                </div>
                <div className="text-left flex-1">
                  <div
                    className="text-base font-bold tracking-widest"
                    style={{ color: loc.color }}
                  >
                    {loc.label}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-white/60">
                    {loc.sublabel}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Secret invisible click zone */}
          <div
            className="absolute top-2 right-2 w-8 h-8 cursor-help opacity-0 hover:opacity-10 z-50"
            onClick={() => setLocation('/secret')}
          />
        </div>
      </Layout>

      <Dialog open={showIntro} onOpenChange={() => {}}>
        <DialogContent className="bg-black border-2 border-primary neon-box text-primary font-mono sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl uppercase tracking-widest text-center border-b border-primary pb-4 mb-4">
              Border Control
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 items-start">
            <img src={nattounImg} alt="President Nattoun" className="w-24 h-24 object-cover border border-primary neon-box" />
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm leading-relaxed"
              >
                <p>"I am President Nattoun, leader of Bahamas Land."</p>
                <p>"This is a serious country. Please behave."</p>
                <p>"We are watching you."</p>
              </motion.div>

              <form onSubmit={handleNameSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-secondary">State your name, citizen:</label>
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    className="bg-black border-primary text-primary focus-visible:ring-primary uppercase font-mono h-12"
                    placeholder="ENTER NAME..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="w-full bg-primary hover:bg-primary/80 text-black uppercase font-bold tracking-widest"
                >
                  Submit to the Republic
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
