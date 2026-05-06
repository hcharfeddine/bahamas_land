import { Layout } from "@/components/Layout";
import { useUsername, useCoins, useVerdicts, useMuseum, useApplause, useSecretVisitors, useFirstVisit } from "@/lib/store";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { Stamp, ShieldAlert, Link, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import {
  getPlayerKickUsername,
  linkKickUsername,
  loadKickUsernameFromServer,
} from "@/lib/monsters";
import {
  ACHIEVEMENTS,
  DIFFICULTY_COLOR,
  DIFFICULTY_LABEL,
  DIFFICULTY_REWARDS,
  type Difficulty,
  unlock,
  useAchievements,
  useAchievementsByDifficulty,
} from "@/lib/achievements";
import { AchievementBook } from "@/components/AchievementBook";

function rank(coins: number, verdicts: number, applause: number) {
  const score = coins / 100 + verdicts * 5 + applause * 0.5;
  if (score < 5) return "TOURIST";
  if (score < 25) return "RESIDENT";
  if (score < 75) return "OG";
  if (score < 200) return "MINISTER OF MID";
  return "PROTECTED CLASS";
}

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "??/??/????";
  }
}

const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard", "insane"];

export default function Passport() {
  const [, setLocation] = useLocation();
  const [username] = useUsername();
  const [coins] = useCoins();
  const [verdicts] = useVerdicts();
  const [museum] = useMuseum();
  const [applause] = useApplause();
  const [secretVisitors] = useSecretVisitors();
  const [firstVisit] = useFirstVisit();
  const { data: achData, unlockedCount, total } = useAchievements();
  const byDiff = useAchievementsByDifficulty();

  const [kickUsername, setKickUsername] = useState<string | null>(null);
  const [kickInput, setKickInput] = useState("");
  const [kickBusy, setKickBusy] = useState(false);
  const [kickError, setKickError] = useState<string | null>(null);
  const [kickSuccess, setKickSuccess] = useState(false);

  useEffect(() => {
    const cached = getPlayerKickUsername();
    if (cached) { setKickUsername(cached); return; }
    loadKickUsernameFromServer().then((ku) => {
      if (ku) setKickUsername(ku);
    });
  }, []);

  const handleLinkKick = async () => {
    if (!kickInput || kickBusy) return;
    setKickBusy(true);
    setKickError(null);
    setKickSuccess(false);
    const res = await linkKickUsername(kickInput);
    setKickBusy(false);
    if (res.ok) {
      setKickUsername(res.data);
      setKickInput("");
      setKickSuccess(true);
    } else {
      const msgs: Record<string, string> = {
        bad_format:  "Kick username must be 2-30 letters/numbers/underscores only.",
        not_found:   "Your citizen account was not found. Try logging in again.",
        bad_pin:     "PIN verification failed. Try logging in again.",
        kick_taken:  "That Kick username is already linked to another account.",
        no_session:  "You are not logged in. Please refresh the page.",
        no_backend:  "Could not reach the server. Try again later.",
        network:     "Network error. Check your connection and try again.",
      };
      setKickError(msgs[res.reason] || `Error: ${res.reason}`);
    }
  };

  // Demo helper: append `?seed=cards` to the URL to instantly unlock the first
  // 10 easy achievements that have AI-generated portraits, so visitors can
  // preview the unlocked card design without playing through the game.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("seed") !== "cards") return;
    const easyIds = ACHIEVEMENTS.filter((a) => a.difficulty === "easy")
      .slice(0, 10)
      .map((a) => a.id);
    let needsUnlock = false;
    for (const id of easyIds) {
      if (!achData[id]) {
        needsUnlock = true;
        break;
      }
    }
    if (needsUnlock) {
      easyIds.forEach((id) => unlock(id));
    }
  }, [achData]);

  const lastVerdict = verdicts.length > 0 ? verdicts[verdicts.length - 1] : null;
  const citizenRank = rank(coins, verdicts.length, applause);
  const idNumber = (username || "GHOST").toUpperCase().padEnd(6, "X").slice(0, 6) + "-" +
    String(Math.abs((username || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 31)).slice(0, 4);

  const totalReward = ACHIEVEMENTS.reduce(
    (sum, a) => sum + (achData[a.id] ? DIFFICULTY_REWARDS[a.difficulty] : 0),
    0,
  );
  const possibleReward = ACHIEVEMENTS.reduce(
    (sum, a) => sum + DIFFICULTY_REWARDS[a.difficulty],
    0,
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center py-8 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ duration: 0.6 }}
          className="w-full bg-gradient-to-br from-secondary/10 to-primary/10 border-4 border-double border-secondary p-1 neon-box-cyan"
        >
          <div className="bg-black/90 border border-secondary/50 p-6 md:p-10 relative overflow-hidden">
            
            {/* Background watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <img src={nattounImg} alt="" className="w-2/3 object-contain" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start border-b-2 border-secondary pb-4 mb-6">
              <div>
                <div className="text-[10px] uppercase text-secondary/70 font-mono tracking-widest">Republic of</div>
                <h1 className="text-2xl md:text-4xl font-black text-secondary uppercase tracking-widest" style={{ textShadow: "0 0 8px hsl(var(--secondary))" }}>
                  Bahamas Land
                </h1>
                <div className="text-xs text-primary uppercase font-mono mt-1">Official Citizen Passport</div>
              </div>
              <div className="text-right text-[10px] font-mono text-secondary/70 uppercase">
                <div>Issued by</div>
                <div className="text-primary">President Nattoun</div>
                <div className="mt-2">No. {idNumber}</div>
              </div>
            </div>

            {/* Body grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo */}
              <div className="md:col-span-1 flex flex-col items-center">
                <div className="w-full aspect-square border-2 border-secondary bg-black/60 p-2 relative">
                  <img src={nattounImg} alt="Citizen" className="w-full h-full object-cover grayscale contrast-125" style={{ filter: "grayscale(100%) contrast(1.25) brightness(0.9)" }} />
                  <div className="absolute bottom-1 left-1 right-1 text-[9px] font-mono text-secondary bg-black/70 px-1 text-center">
                    PHOTO LOST IN COURT
                  </div>
                </div>
                <div className="mt-3 w-full text-center">
                  <div className="text-[10px] uppercase text-secondary/70 font-mono">Rank</div>
                  <div className="text-primary font-black uppercase tracking-widest text-sm" style={{ textShadow: "0 0 6px hsl(var(--primary))" }}>
                    {citizenRank}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="md:col-span-2 space-y-3 font-mono text-sm">
                <Field label="Name" value={username || "UNKNOWN ENTITY"} />
                <Field label="Date of Citizenship" value={formatDate(firstVisit)} />
                <Field label="Nattoun Coin Balance" value={`${coins} NC`} />
                <Field label="Verdicts Received" value={String(verdicts.length)} />
                <Field label="Museum Contributions" value={String(museum.length)} />
                <Field label="Applauses Given" value={String(applause)} />
                <Field label="Secret Area Found" value={secretVisitors > 0 ? "YES (suspicious)" : "NO"} />
                <Field label="Secrets Unlocked" value={`${unlockedCount} / ${total}`} />
                <Field label="Reward Earned" value={`${totalReward} / ${possibleReward} NC`} />
                <Field label="Last Verdict" value={lastVerdict ? lastVerdict.verdict : "Never been judged. Yet."} />
              </div>
            </div>

            {/* Stamps */}
            <div className="relative z-10 mt-8 pt-6 border-t-2 border-dashed border-primary/50 flex flex-wrap items-center justify-around gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: -12 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="border-4 border-primary text-primary px-4 py-2 uppercase font-black tracking-widest text-xs flex items-center gap-2"
                style={{ textShadow: "0 0 6px hsl(var(--primary))", boxShadow: "0 0 12px hsl(var(--primary)/0.5)" }}
              >
                <Stamp className="w-4 h-4" />
                Approved by Nattoun
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 7 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="border-4 border-secondary text-secondary px-4 py-2 uppercase font-black tracking-widest text-xs flex items-center gap-2"
                style={{ textShadow: "0 0 6px hsl(var(--secondary))" }}
              >
                <ShieldAlert className="w-4 h-4" />
                Subject to Random Audits
              </motion.div>
            </div>

            {/* Footer */}
            <div className="relative z-10 mt-6 text-[10px] uppercase font-mono text-secondary/60 text-center tracking-widest">
              This document is non-transferable, non-refundable, and possibly non-real.
            </div>
          </div>
        </motion.div>

        {/* ==================== MONSTER ID CARD ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full bg-black/85 border-2 border-primary neon-box p-5"
        >
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b-2 border-primary/40">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-primary uppercase tracking-widest neon-text flex items-center gap-2">
                <span>👾</span> Monster ID
              </h2>
              <p className="text-secondary/70 font-mono text-[11px] uppercase mt-1 tracking-widest">
                Link your Kick username to enter the Monster Zone
              </p>
            </div>
          </div>

          {kickUsername ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 border border-green-500/40 bg-green-500/5 p-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-secondary/60 uppercase tracking-widest">Linked Kick Account</div>
                  <div className="text-green-400 font-black uppercase tracking-wider">@{kickUsername}</div>
                </div>
                <button
                  onClick={() => setLocation(`/monster/${kickUsername}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary font-mono text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Monster
                </button>
              </div>
              <div className="font-mono text-[10px] text-secondary/50 uppercase tracking-widest">
                Type <span className="text-primary font-black">!join</span> in{" "}
                <a href={`https://kick.com/m3kky`} target="_blank" rel="noopener noreferrer" className="text-primary underline">m3kky's Kick chat</a>{" "}
                to create your monster, then use{" "}
                <span className="text-primary">!feed !play !sleep !train !hug !status</span> to care for it.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-mono text-sm text-secondary/80">
                Enter your Kick username below to link your account. Once linked, type{" "}
                <span className="text-primary font-black">!join</span> in m3kky's chat to create your monster.
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center border-2 border-primary bg-black overflow-hidden">
                    <span className="px-3 text-secondary/60 font-mono text-sm select-none">@</span>
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-secondary py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none placeholder:text-primary/30"
                      placeholder="your_kick_name"
                      value={kickInput}
                      onChange={(e) =>
                        setKickInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && kickInput.length >= 2 && !kickBusy) {
                          void handleLinkKick();
                        }
                      }}
                      maxLength={30}
                    />
                  </div>
                  <div className="text-[10px] text-primary/50 font-mono mt-1 uppercase tracking-widest">
                    Letters, numbers and _ only · 2-30 characters
                  </div>
                </div>
                <button
                  onClick={() => void handleLinkKick()}
                  disabled={kickBusy || kickInput.length < 2}
                  className="px-4 py-2.5 bg-primary text-black font-black uppercase tracking-widest text-sm hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 self-start"
                >
                  {kickBusy
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Link className="w-4 h-4" />
                  }
                  {kickBusy ? "Linking…" : "Link"}
                </button>
              </div>
              {kickError && (
                <div className="border border-red-500/60 bg-red-500/10 text-red-300 px-3 py-2 text-xs font-mono">
                  {kickError}
                </div>
              )}
              {kickSuccess && (
                <div className="border border-green-500/60 bg-green-500/10 text-green-300 px-3 py-2 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Kick account linked! Now type !join in chat.
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ==================== SECRETS LOG ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full bg-black/85 border-2 border-primary neon-box p-6"
        >
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b-2 border-primary/40">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-primary uppercase tracking-widest neon-text">
                Secret Log
              </h2>
              <p className="text-secondary/80 font-mono text-[11px] uppercase mt-1 tracking-widest">
                {unlockedCount}/{total} secrets discovered • {totalReward}/{possibleReward} NC reward earned
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-secondary/70 font-mono">Completion</div>
              <div className="text-primary font-black text-2xl tabular-nums">
                {Math.round((unlockedCount / total) * 100)}%
              </div>
            </div>
          </div>

          {/* Difficulty progress bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {DIFF_ORDER.map((d) => {
              const stats = byDiff[d];
              const pct = stats.total === 0 ? 0 : Math.round((stats.unlocked / stats.total) * 100);
              return (
                <div
                  key={d}
                  className="border-2 p-3 bg-black/60"
                  style={{ borderColor: DIFFICULTY_COLOR[d] }}
                >
                  <div
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: DIFFICULTY_COLOR[d] }}
                  >
                    {DIFFICULTY_LABEL[d]}
                  </div>
                  <div className="text-white font-black text-lg tabular-nums">
                    {stats.unlocked}<span className="text-white/40">/{stats.total}</span>
                  </div>
                  <div className="h-1.5 mt-1 bg-white/10 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, background: DIFFICULTY_COLOR[d] }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-white/50 mt-1 uppercase">
                    {DIFFICULTY_REWARDS[d]} NC each
                  </div>
                </div>
              );
            })}
          </div>

        </motion.div>

        <AchievementBook />

        <div className="text-center text-xs font-mono text-primary/60 uppercase">
          Take a screenshot. Brag responsibly.
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline border-b border-secondary/20 pb-1 gap-3">
      <span className="text-secondary/70 uppercase text-[10px] tracking-widest shrink-0">{label}</span>
      <span className="text-primary text-right uppercase truncate">{value}</span>
    </div>
  );
}
