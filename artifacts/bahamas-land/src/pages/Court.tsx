import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUsername } from "@/lib/store";
import { useSharedCourt } from "@/lib/sharedCourt";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Gavel, Pin, Wifi, WifiOff, Hourglass } from "lucide-react";
import { audio } from "@/lib/audio";

const VERDICTS = [
  "GUILTY of being MID",
  "INNOCENT but suspicious",
  "BANNED (not really)",
  "SENTENCED to vibes",
  "CERTIFIED CRINGE",
  "FREE TO LEAVE (we are watching)",
  "GUILTY of having no aura",
  "INNOCENT but cringe",
  "EXILED to the comments section",
  "GUILTY of touching grass (rare)",
  "SENTENCED to read the terms",
  "ACQUITTED but make it ironic",
  "GUILTY of using comic sans",
  "10 YEARS in the discord",
  "FINED 1 NattounCoin",
  "GUILTY of skill issue",
  "INNOCENT (Nattoun owes them money)",
];

const PROFANITY = ["fuck", "shit", "bitch", "ass", "cunt"];

export default function Court() {
  const [username] = useUsername();
  const { items, submit, isShared, loading } = useSharedCourt();
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "pending" | "live" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || cooldown > 0 || submitState === "submitting") return;

    const lowerText = text.toLowerCase();
    if (PROFANITY.some((w) => lowerText.includes(w))) {
      setErrorMsg("President Nattoun rejected this text for being too un-chill.");
      setSubmitState("error");
      window.setTimeout(() => {
        setSubmitState("idle");
        setErrorMsg(null);
      }, 2500);
      return;
    }

    setSubmitState("submitting");
    setErrorMsg(null);
    const verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];

    const res = await submit({
      username: username || "ANONYMOUS CITIZEN",
      text: text.trim(),
      verdict,
    });

    if (!res.ok) {
      setErrorMsg(res.error || "Submission failed.");
      setSubmitState("error");
      window.setTimeout(() => {
        setSubmitState("idle");
        setErrorMsg(null);
      }, 3000);
      return;
    }

    setText("");
    setCooldown(15);
    audio.playGlitch();
    setSubmitState(res.pending ? "pending" : "live");
    window.setTimeout(() => setSubmitState("idle"), 4500);
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) !== 0) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return b.timestamp - a.timestamp;
    });
  }, [items]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-8">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <Scale className="w-16 h-16 mx-auto text-primary neon-text" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-mono uppercase tracking-widest neon-text">
            COURT OF THE OGs
          </h1>
          <p className="text-secondary font-mono">Justice will be served (mid).</p>

          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest border border-primary/40 px-3 py-1 bg-black/60">
            {isShared ? (
              <>
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="text-green-400">PUBLIC RECORD · ALL CITIZENS SEE THIS</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400">LOCAL ONLY · BACKEND OFFLINE</span>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-black/80 border-2 border-primary p-6 neon-box relative overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={150}
              placeholder="Confess your crimes or accuse another..."
              className="bg-transparent border-primary/50 text-primary font-mono min-h-[100px] resize-none focus-visible:ring-primary"
            />
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <span className="text-xs text-primary/50 font-mono">{text.length}/150</span>
              <Button
                type="submit"
                disabled={!text.trim() || cooldown > 0 || submitState === "submitting"}
                className="bg-primary text-black font-bold uppercase tracking-wider hover:bg-primary/80 gap-2"
              >
                <Gavel className="w-4 h-4" />
                {submitState === "submitting"
                  ? "Filing..."
                  : cooldown > 0
                    ? `Cooldown (${cooldown}s)`
                    : "Submit Verdict"}
              </Button>
            </div>

            <AnimatePresence>
              {submitState === "pending" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-mono uppercase tracking-widest text-yellow-400 border border-yellow-400/40 bg-yellow-400/5 px-3 py-2 flex items-center gap-2"
                >
                  <Hourglass className="w-3 h-3" />
                  Filed. Awaiting President Nattoun's decision.
                </motion.div>
              )}
              {submitState === "live" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-mono uppercase tracking-widest text-green-400 border border-green-400/40 bg-green-400/5 px-3 py-2"
                >
                  ✓ Logged to the public record.
                </motion.div>
              )}
              {submitState === "error" && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-mono uppercase tracking-widest text-red-400 border border-red-400/40 bg-red-400/5 px-3 py-2"
                >
                  ⨯ {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        <div className="space-y-6 pt-8">
          <div className="flex items-end justify-between border-b border-secondary pb-2">
            <h2 className="text-2xl font-mono text-secondary neon-text-cyan">OFFICIAL RECORDS</h2>
            <span className="text-[10px] font-mono uppercase text-secondary/60">
              {loading ? "loading…" : `${sortedItems.length} on file`}
            </span>
          </div>

          <AnimatePresence>
            {sortedItems.map((v, i) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={`bg-black/50 border p-6 relative group transition-colors ${
                  v.pinned
                    ? "border-yellow-400/70 hover:border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.25)]"
                    : "border-primary/30 hover:border-primary/80"
                }`}
              >
                {v.pinned && (
                  <div className="absolute -top-3 left-4 flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-yellow-400 bg-black border border-yellow-400/70 px-2 py-0.5">
                    <Pin className="w-3 h-3" />
                    PINNED BY PRESIDENT
                  </div>
                )}
                <div className="absolute top-2 right-2 text-xs text-primary/40 font-mono">
                  {new Date(v.timestamp).toLocaleDateString()}
                </div>
                <div className="text-sm text-secondary font-mono mb-2 uppercase">
                  DEFENDANT: {v.username}
                </div>
                <p className="text-lg text-primary/90 font-serif italic mb-6 break-words pr-2">
                  "{v.text}"
                </p>

                <div className="absolute bottom-4 right-4 rotate-[-15deg] border-4 border-red-500 text-red-500 font-black text-xl px-4 py-1 uppercase tracking-widest bg-black/80 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                  {v.verdict}
                </div>
              </motion.div>
            ))}
            {!loading && sortedItems.length === 0 && (
              <div className="text-center text-primary/50 font-mono py-12">
                No crimes reported yet. (Suspicious.)
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
