import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MonsterScene, MONSTER_INFO } from "@/components/Monster3D";
import type { MonsterType } from "@/components/Monster3D";

const STAGES = ["egg", "baby", "teen", "adult", "final"] as const;

const STAGE_LABELS: Record<string, string> = {
  egg:   "🥚 Egg",
  baby:  "👶 Baby",
  teen:  "🧒 Teen",
  adult: "💪 Adult",
  final: "⭐ Final Form",
};

const CAMERA_Z: Record<string, number> = {
  egg: 2.8, baby: 2.6, teen: 3.0, adult: 3.5, final: 3.8,
};

const TYPES = Object.keys(MONSTER_INFO) as MonsterType[];

// Pre-computed seeds — each username hashes to exactly that monster type
const TYPE_SEED: Record<MonsterType, string> = {
  dragon:      "seed_23",
  spider:      "seed_0",
  golem:       "seed_18",
  phoenix:     "seed_1",
  crab:        "seed_49",
  serpent:     "seed_9",
  shark:       "seed_43",
  bear:        "seed_16",
  scorpion:    "seed_30",
  octopus:     "seed_3",
  cyclops:     "seed_7",
  minotaur:    "seed_11",
  medusa:      "seed_14",
  centaur:     "seed_21",
  siren:       "seed_33",
  chimera:     "seed_40",
  sphinx:      "seed_52",
  fenrir:      "seed_60",
  jormungandr: "seed_71",
  kitsune:     "seed_82",
  oni:         "seed_91",
  qilin:       "seed_99",
};

function StageCard({
  seed,
  stage,
}: {
  seed: string;
  stage: "egg" | "baby" | "teen" | "adult" | "final";
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="border border-white/10 bg-black overflow-hidden"
        style={{ width: 150, height: 150 }}
      >
        <Canvas
          camera={{ position: [0, 0, CAMERA_Z[stage]], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <MonsterScene kickUsername={seed} stage={stage} status="happy" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI * 0.2}
            maxPolarAngle={Math.PI * 0.8}
            rotateSpeed={0.6}
          />
        </Canvas>
      </div>
      <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">
        {STAGE_LABELS[stage]}
      </span>
    </div>
  );
}

export default function MonsterGallery() {
  const [selected, setSelected] = useState<MonsterType>("dragon");
  const info = MONSTER_INFO[selected];
  const seed = TYPE_SEED[selected];

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono">
      <h1 className="text-2xl font-bold text-center mb-1 uppercase tracking-widest text-primary">
        Monster Gallery
      </h1>
      <p className="text-center text-white/40 text-xs mb-6 uppercase tracking-widest">
        All 5 stages · drag to rotate each
      </p>

      {/* Type selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {TYPES.map((type) => {
          const t = MONSTER_INFO[type];
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 border text-xs uppercase tracking-widest transition-all"
              style={{
                borderColor: selected === type ? t.eggGlow : "rgba(255,255,255,0.12)",
                background:  selected === type ? `${t.eggGlow}22` : "transparent",
                color:       selected === type ? t.secondary : "rgba(255,255,255,0.5)",
                boxShadow:   selected === type ? `0 0 12px ${t.eggGlow}55` : "none",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Stage showcase */}
      <div
        className="border p-4 mb-6 text-center"
        style={{ borderColor: `${info.eggGlow}44`, background: `${info.eggGlow}08` }}
      >
        <div className="text-lg font-bold mb-4 tracking-widest" style={{ color: info.secondary }}>
          {info.icon} {info.name} — Evolution
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {STAGES.map((stage) => (
            <StageCard key={stage} seed={seed} stage={stage} />
          ))}
        </div>
      </div>

      {/* All 12 types — adult form */}
      <div className="mt-8">
        <p className="text-center text-white/30 text-[10px] uppercase tracking-widest mb-4">
          All 12 types — adult form · click to inspect
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {TYPES.map((type) => {
            const t = MONSTER_INFO[type];
            const s = TYPE_SEED[type];
            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className="border overflow-hidden transition-all"
                  style={{
                    width: 80, height: 80,
                    borderColor: selected === type ? t.eggGlow : "rgba(255,255,255,0.08)",
                    boxShadow:   selected === type ? `0 0 10px ${t.eggGlow}66` : "none",
                  }}
                >
                  <Canvas
                    camera={{ position: [0, 0, 3.5], fov: 42 }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <MonsterScene kickUsername={s} stage="adult" status="happy" />
                  </Canvas>
                </div>
                <span className="text-[9px] text-white/40 uppercase tracking-widest group-hover:text-white/70 transition-colors">
                  {t.icon} {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
