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

const TYPE_SEED: Record<MonsterType, string> = {
  dragon:      "seed_23",
  spider:      "seed_0",
  golem:       "seed_18",
  phoenix:     "seed_1",
  crab:        "seed_49",
  shark:       "seed_43",
  octopus:     "seed_3",
  cyclops:     "seed_7",
  minotaur:    "seed_11",
  medusa:      "seed_14",
  centaur:     "seed_21",
  kitsune:     "seed_82",
  fenrir:      "seed_72",
};

function StageCard({
  seed,
  stage,
  glowColor,
}: {
  seed: string;
  stage: "egg" | "baby" | "teen" | "adult" | "final";
  glowColor: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-[160px]">
      <div
        className="w-full overflow-hidden"
        style={{
          aspectRatio: "1 / 1",
          border: `1px solid ${glowColor}33`,
          background: "#050505",
          boxShadow: `0 0 20px ${glowColor}22`,
        }}
      >
        {/* key forces full Canvas remount when monster type changes — prevents wrong GLB cache */}
        <Canvas
          key={`${seed}-${stage}`}
          camera={{ position: [0, 0, CAMERA_Z[stage]], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <MonsterScene kickUsername={seed} stage={stage} status="happy" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI * 0.1}
            maxPolarAngle={Math.PI * 0.9}
            rotateSpeed={0.6}
          />
        </Canvas>
      </div>
      <span
        className="text-[11px] font-mono uppercase tracking-widest"
        style={{ color: `${glowColor}cc` }}
      >
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
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary mb-1">
          Monster Gallery
        </h1>
        <p className="text-white/40 text-xs uppercase tracking-widest">
          All 5 stages · drag to rotate
        </p>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap justify-center gap-2 px-4 mb-6">
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

      {/* Evolution title */}
      <div className="px-4 mb-3 text-center">
        <span
          className="text-xl font-bold tracking-widest uppercase"
          style={{ color: info.secondary }}
        >
          {info.icon} {info.name} — Evolution
        </span>
      </div>

      {/* Stage cards — full width, 5 across on desktop */}
      <div className="px-4 pb-8">
        <div
          className="border p-4"
          style={{
            borderColor: `${info.eggGlow}33`,
            background: `${info.eggGlow}06`,
          }}
        >
          <div className="flex gap-3 flex-wrap">
            {STAGES.map((stage) => (
              <StageCard
                key={`${seed}-${stage}`}
                seed={seed}
                stage={stage}
                glowColor={info.eggGlow}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
