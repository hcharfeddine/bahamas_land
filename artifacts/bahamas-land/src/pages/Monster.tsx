import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured, type RemoteMonster } from "@/lib/supabase";
import { getMonster } from "@/lib/monsters";
import { Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { Monster3DViewer, getMonsterType, MONSTER_INFO } from "@/components/Monster3D";


const STAGE_LABEL: Record<string, string> = {
  egg:   "EGG",
  baby:  "BABY",
  teen:  "TEEN",
  adult: "ADULT",
  final: "FINAL FORM",
};

const STATUS_CONFIG: Record<string, { label: string; glow: string; text: string; border: string; color: string }> = {
  happy:    { label: "HAPPY",    glow: "0 0 30px rgba(0,255,60,0.6)",    text: "text-green-400",  border: "border-green-500",  color: "#22c55e" },
  angry:    { label: "ANGRY",    glow: "0 0 30px rgba(255,40,40,0.6)",   text: "text-red-400",    border: "border-red-500",    color: "#ef4444" },
  sleeping: { label: "SLEEPING", glow: "0 0 30px rgba(60,120,255,0.6)",  text: "text-blue-400",   border: "border-blue-500",   color: "#60a5fa" },
  critical: { label: "CRITICAL", glow: "0 0 30px rgba(255,140,0,0.8)",   text: "text-orange-400", border: "border-orange-500", color: "#f97316" },
  dead:     { label: "DEAD",     glow: "0 0 10px rgba(100,100,100,0.3)", text: "text-gray-500",   border: "border-gray-700",   color: "#6b7280" },
};

const PERSONALITY_LABEL: Record<string, string> = {
  lazy:       "LAZY",
  aggressive: "AGGRESSIVE",
  happy:      "CHEERFUL",
  calm:       "CALM",
  normal:     "NORMAL",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000)   return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function StatBar({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const danger = value >= 80;
  const warn   = value >= 60;
  const barColor =
    label === "HUNGER"
      ? danger ? "#ef4444" : warn ? "#f59e0b" : "#22c55e"
      : value <= 20 ? "#ef4444" : value <= 40 ? "#f59e0b" : color;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest">
        <span className="text-white/60">{icon} {label}</span>
        <span className="tabular-nums" style={{ color: barColor }}>{value}/100</span>
      </div>
      <div className="h-2 bg-black border border-white/10 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: barColor, boxShadow: `0 0 6px ${barColor}` }}
          initial={{ width: "0%" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function Monster() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const kickUsername = (username || "").toLowerCase().trim();

  const [monster, setMonster] = useState<RemoteMonster | null | undefined>(undefined);
  const [live, setLive] = useState(false);
  const [, setTick] = useState(0);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  useEffect(() => {
    if (!kickUsername) return;
    getMonster(kickUsername).then((m) => setMonster(m ?? null));
  }, [kickUsername]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured || !kickUsername) return;
    const channel = supabase
      .channel(`monster:${kickUsername}`)
      .on("postgres_changes" as any, {
        event: "UPDATE", schema: "public", table: "monsters",
        filter: `kick_username=eq.${kickUsername}`,
      }, (payload: any) => { setMonster(payload.new as RemoteMonster); })
      .subscribe((status: string) => { setLive(status === "SUBSCRIBED"); });
    channelRef.current = channel;
    return () => { supabase?.removeChannel(channel); channelRef.current = null; };
  }, [kickUsername]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!kickUsername) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-primary font-mono">
        Invalid monster URL.
      </div>
    );
  }

  if (monster === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-primary font-mono text-xs uppercase tracking-widest animate-pulse">
        Loading…
      </div>
    );
  }

  if (monster === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono gap-4 p-6">
        <div className="text-5xl">❓</div>
        <div className="text-primary uppercase tracking-widest">No monster found</div>
        <div className="text-white/50 text-xs uppercase tracking-widest">@{kickUsername} has not created a monster yet.</div>
        <div className="text-white/30 text-[11px]">Type <span className="text-primary">!monster</span> in m3kky's Kick chat to create one.</div>
        <button
          onClick={() => setLocation("/world")}
          className="mt-4 border border-primary/40 text-primary/60 px-4 py-2 text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
      </div>
    );
  }

  const monsterType = getMonsterType(monster.kick_username);
  const info = MONSTER_INFO[monsterType] ?? MONSTER_INFO.dragon;
  const cfg = STATUS_CONFIG[monster.status] || STATUS_CONFIG.happy;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-mono" style={{ height: "100dvh" }}>

      {/* Fullscreen 3D viewer — takes all available height minus stats panel */}
      <div className="relative flex-1 min-h-0">
        <Monster3DViewer
          kickUsername={monster.kick_username}
          stage={monster.stage}
          status={monster.status}
          fullscreen
        />

        {/* Top-left back button overlay */}
        <button
          onClick={() => setLocation("/world")}
          className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 border border-white/20 bg-black/60 text-white/60 text-[10px] uppercase tracking-widest hover:border-white/50 hover:text-white transition-colors backdrop-blur-sm"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>

        {/* Top-right status + live indicator overlay */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest bg-black/70 backdrop-blur-sm ${cfg.border} ${cfg.text}`}
          >
            {monster.status === "happy" ? "✅" : monster.status === "angry" ? "😡" : monster.status === "sleeping" ? "😴" : monster.status === "critical" ? "🚨" : "💀"}
            {cfg.label}
          </div>
          <div className="flex items-center gap-1 text-[10px] bg-black/60 px-2 py-0.5 border border-white/10 backdrop-blur-sm">
            {live
              ? <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-400">LIVE</span></>
              : <><WifiOff className="w-3 h-3 text-white/30" /><span className="text-white/30">SYNC</span></>
            }
          </div>
        </div>

        {/* Bottom name overlay */}
        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
          <div className="text-primary font-black text-2xl uppercase tracking-[0.3em] drop-shadow-lg neon-text">
            @{monster.kick_username}
          </div>
          <div className="text-white/40 text-[10px] uppercase tracking-widest mt-0.5">
            {info.icon} {info.name} · {STAGE_LABEL[monster.stage] || monster.stage} · Lv.{monster.level}
          </div>
        </div>

        {monster.status === "critical" && (
          <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
            <span className="text-orange-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
              ⚠ DYING — {monster.critical_ticks}/3 TICKS
            </span>
          </div>
        )}
        {monster.stage === "final" && monster.status !== "dead" && (
          <div className="absolute top-12 left-0 right-0 text-center pointer-events-none">
            <span className="text-yellow-400 text-xs font-black tracking-widest">★ FINAL FORM ★</span>
          </div>
        )}
        {monster.status === "sleeping" && (
          <motion.div
            className="absolute top-16 right-8 text-3xl pointer-events-none"
            animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          >
            💤
          </motion.div>
        )}
      </div>

      {/* Stats panel — fixed height at bottom */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="shrink-0 border-t bg-black/95 backdrop-blur-sm p-4 space-y-3"
          style={{ borderColor: cfg.color + "44" }}
        >
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
            <div className="border border-white/10 bg-black/60 p-2">
              <div className="text-white/40 text-[9px] uppercase tracking-widest">Stage</div>
              <div className="text-primary font-black mt-0.5">{STAGE_LABEL[monster.stage] || monster.stage}</div>
            </div>
            <div className="border border-white/10 bg-black/60 p-2">
              <div className="text-white/40 text-[9px] uppercase tracking-widest">Level</div>
              <div className="text-primary font-black text-lg tabular-nums mt-0.5">{monster.level}</div>
            </div>
            <div className="border border-white/10 bg-black/60 p-2">
              <div className="text-white/40 text-[9px] uppercase tracking-widest">Type</div>
              <div className="text-primary font-black mt-0.5">{PERSONALITY_LABEL[monster.personality] || monster.personality}</div>
            </div>
          </div>

          <StatBar icon="🍖" label="HUNGER" value={monster.hunger} color="#22c55e" />
          <StatBar icon="😊" label="MOOD"   value={monster.mood}   color="#22c55e" />
          <StatBar icon="⚡" label="ENERGY" value={monster.energy} color="#22c55e" />

          <div className="flex items-center justify-between text-[9px] text-white/30 uppercase tracking-widest pt-1 border-t border-white/5">
            <span>Last action: {timeAgo(monster.last_updated_at)}</span>
            <span>Since: {new Date(monster.created_at).toLocaleDateString()}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
