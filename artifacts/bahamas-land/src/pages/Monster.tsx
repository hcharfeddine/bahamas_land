import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { supabase, isSupabaseConfigured, type RemoteMonster } from "@/lib/supabase";
import { getMonster } from "@/lib/monsters";
import { Wifi, WifiOff, ExternalLink } from "lucide-react";

const STAGE_EMOJI: Record<string, string> = {
  egg:   "🥚",
  baby:  "🐣",
  teen:  "👾",
  adult: "👹",
  final: "🐉",
};

const STAGE_LABEL: Record<string, string> = {
  egg:   "EGG",
  baby:  "BABY",
  teen:  "TEEN",
  adult: "ADULT",
  final: "FINAL FORM",
};

const STATUS_CONFIG: Record<string, { label: string; glow: string; text: string; border: string }> = {
  happy:   { label: "HAPPY",    glow: "0 0 30px rgba(0,255,60,0.6)",   text: "text-green-400",  border: "border-green-500"  },
  angry:   { label: "ANGRY",    glow: "0 0 30px rgba(255,40,40,0.6)",  text: "text-red-400",    border: "border-red-500"    },
  sleeping:{ label: "SLEEPING", glow: "0 0 30px rgba(60,120,255,0.6)", text: "text-blue-400",   border: "border-blue-500"   },
  dead:    { label: "DEAD",     glow: "0 0 10px rgba(100,100,100,0.3)",text: "text-gray-500",   border: "border-gray-700"   },
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
  if (diff < 60_000)  return "just now";
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
        <span className="text-secondary/80">{icon} {label}</span>
        <span className="text-primary tabular-nums">{value}/100</span>
      </div>
      <div className="h-3 bg-black border border-primary/20 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: barColor, boxShadow: `0 0 8px ${barColor}` }}
          initial={{ width: "0%" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function MonsterCharacter({ monster }: { monster: RemoteMonster }) {
  const cfg = STATUS_CONFIG[monster.status] || STATUS_CONFIG.happy;
  const emoji = monster.status === "dead" ? "💀" : (STAGE_EMOJI[monster.stage] || "👾");

  const animateProps =
    monster.status === "dead"    ? { scale: [1, 0.95, 1], opacity: [0.5, 0.4, 0.5] } :
    monster.status === "angry"   ? { rotate: [-3, 3, -3, 3, 0], scale: [1, 1.05, 1] } :
    monster.status === "sleeping"? { y: [0, -4, 0], opacity: [0.7, 1, 0.7] } :
    monster.stage  === "final"   ? { scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] } :
    monster.stage  === "egg"     ? { scale: [1, 1.04, 1], rotate: [0, -1, 1, 0] } :
                                   { y: [0, -8, 0] };

  const duration =
    monster.status === "dead"     ? 3 :
    monster.status === "angry"    ? 0.4 :
    monster.status === "sleeping" ? 2.5 :
    monster.stage  === "final"    ? 2 :
    monster.stage  === "egg"      ? 2.5 : 1.6;

  return (
    <div
      className={`relative flex items-center justify-center w-40 h-40 mx-auto border-2 ${cfg.border} bg-black/90`}
      style={{ boxShadow: cfg.glow }}
    >
      <motion.div
        animate={animateProps}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: "72px", lineHeight: 1, filter: monster.status === "dead" ? "grayscale(1)" : "none" }}
      >
        {emoji}
      </motion.div>

      {monster.status === "sleeping" && (
        <motion.div
          className="absolute top-2 right-3 text-2xl"
          animate={{ opacity: [0, 1, 0], y: [0, -6, -12] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        >
          💤
        </motion.div>
      )}
    </div>
  );
}

export default function Monster() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const kickUsername = (username || "").toLowerCase().trim();

  const [monster, setMonster] = useState<RemoteMonster | null | undefined>(undefined);
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  useEffect(() => {
    if (!kickUsername) return;
    getMonster(kickUsername).then((m) => setMonster(m ?? null));
  }, [kickUsername]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured || !kickUsername) return;

    const channel = supabase
      .channel(`monster:${kickUsername}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "monsters",
          filter: `kick_username=eq.${kickUsername}`,
        },
        (payload: any) => {
          setMonster(payload.new as RemoteMonster);
        },
      )
      .subscribe((status: string) => {
        setLive(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
    return () => {
      supabase?.removeChannel(channel);
      channelRef.current = null;
    };
  }, [kickUsername]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = monster ? (STATUS_CONFIG[monster.status] || STATUS_CONFIG.happy) : STATUS_CONFIG.happy;

  if (!kickUsername) {
    return (
      <Layout showBack>
        <div className="text-center py-20 font-mono text-primary">Invalid monster URL.</div>
      </Layout>
    );
  }

  return (
    <Layout showBack>
      <div className="w-full max-w-xl mx-auto py-4 space-y-4">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl font-black uppercase tracking-[0.3em] text-primary neon-text"
          >
            Monster Zone
          </motion.h1>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary/70 mt-1">
            ▸ live view — read only ◂
          </p>
        </div>

        {monster === undefined && (
          <div className="text-center py-16 font-mono text-primary/60 uppercase tracking-widest animate-pulse">
            Loading…
          </div>
        )}

        {monster === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 border-2 border-primary/30 bg-black/80 space-y-4 font-mono"
          >
            <div className="text-5xl">❓</div>
            <div className="text-primary uppercase tracking-widest">No monster found</div>
            <div className="text-secondary/60 text-xs uppercase tracking-widest">
              @{kickUsername} has not created a monster yet.
            </div>
            <div className="text-secondary/40 text-[11px] font-mono">
              Type <span className="text-primary">!monster</span> in m3kky's Kick chat to create one.
            </div>
          </motion.div>
        )}

        {monster && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className={`border-2 ${cfg.border} bg-black/90 p-5 space-y-4`} style={{ boxShadow: cfg.glow }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-mono text-secondary/60 uppercase tracking-widest">Kick Viewer</div>
                    <div className="text-primary font-black text-xl uppercase tracking-wider">@{monster.kick_username}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[10px] font-black uppercase tracking-widest ${cfg.border} ${cfg.text}`}>
                      {monster.status === "happy" ? "✅" : monster.status === "angry" ? "😡" : monster.status === "sleeping" ? "😴" : "💀"}
                      {cfg.label}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] font-mono text-secondary/50">
                      {live
                        ? <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-400">LIVE</span></>
                        : <><WifiOff className="w-3 h-3" /><span>SYNC</span></>
                      }
                    </div>
                  </div>
                </div>

                <MonsterCharacter monster={monster} />

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border border-primary/20 bg-black/60 p-2">
                    <div className="text-[10px] font-mono text-secondary/60 uppercase tracking-widest">Stage</div>
                    <div className="text-primary font-black text-sm mt-1">{STAGE_LABEL[monster.stage] || monster.stage}</div>
                  </div>
                  <div className="border border-primary/20 bg-black/60 p-2">
                    <div className="text-[10px] font-mono text-secondary/60 uppercase tracking-widest">Level</div>
                    <div className="text-primary font-black text-2xl tabular-nums">{monster.level}</div>
                  </div>
                  <div className="border border-primary/20 bg-black/60 p-2">
                    <div className="text-[10px] font-mono text-secondary/60 uppercase tracking-widest">Type</div>
                    <div className="text-primary font-black text-sm mt-1">{PERSONALITY_LABEL[monster.personality] || monster.personality}</div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-primary/20 pt-3">
                  <StatBar icon="🍖" label="HUNGER" value={monster.hunger} color="#22c55e" />
                  <StatBar icon="😊" label="MOOD"   value={monster.mood}   color="#22c55e" />
                  <StatBar icon="⚡" label="ENERGY" value={monster.energy} color="#22c55e" />
                </div>

                <div className="border-t border-primary/20 pt-3 flex items-center justify-between text-[10px] font-mono text-secondary/50 uppercase tracking-widest">
                  <span>Last action: {timeAgo(monster.last_updated_at)}</span>
                  <span>Since: {new Date(monster.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="border border-primary/20 bg-black/60 p-4 font-mono space-y-3">
                <div className="text-[10px] text-secondary/60 uppercase tracking-widest text-center">How it works</div>
                <div className="space-y-2 text-xs text-secondary/80">
                  <div className="flex items-start gap-2">
                    <span className="text-primary text-base shrink-0">💬</span>
                    <span><span className="text-primary font-black">Chat during the stream</span> — every message you send randomly boosts your monster's stats. The more active you are, the healthier it gets.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary text-base shrink-0">😴</span>
                    <span><span className="text-primary font-black">Go silent too long</span> — if you haven't typed anything for 10+ minutes while the stream is live, your monster gets hungry and sad.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary text-base shrink-0">📺</span>
                    <span><span className="text-primary font-black">Stream offline = frozen</span> — your monster neither grows nor decays when the stream is not live. No pressure.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary text-base shrink-0">👾</span>
                    <span>Type <span className="text-primary font-black">!monster</span> in{" "}
                      <a href="https://kick.com/m3kky" target="_blank" rel="noopener noreferrer" className="text-primary underline">m3kky's chat</a>{" "}
                      to create yours or check its status.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setLocation("/world")}
                className="w-full border-2 border-primary/40 text-primary/60 font-mono text-xs uppercase tracking-widest py-2 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3 h-3" />
                Back to Bahamas Land
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
}
