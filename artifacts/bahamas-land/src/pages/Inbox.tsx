import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useUsername } from "@/lib/store";
import { useLetters, useLastLetterAt, generateLetter, generateChainLetter, Letter } from "@/lib/inbox";
import { Mail, MailOpen, Stamp } from "lucide-react";
import { unlock } from "@/lib/achievements";

const LETTER_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes between auto-letters

export default function Inbox() {
  const [username] = useUsername();
  const [letters, setLetters] = useLetters();
  const [lastAt, setLastAt] = useLastLetterAt();
  const [open, setOpen] = useState<Letter | null>(null);

  useEffect(() => {
    // First time: seed an inbox with a welcome letter + the chain letter
    if (letters.length === 0) {
      const seed = generateLetter(username);
      seed.subject = "Welcome to the inbox you did not sign up for";
      seed.body = `Dear ${username || "Citizen"},\n\nYou have been added to the Presidential Mailing List. You cannot unsubscribe. We tried.\n\nExpect mail at random intervals. Open at your own risk.\n\n— The Office of the President`;
      const chain = generateChainLetter(username);
      setLetters([chain, seed]);
      setLastAt(Date.now());
      return;
    }
    // Inject chain letter if it's somehow missing
    const hasChain = letters.some((l) => l.id === "chainletter-special");
    if (!hasChain) {
      const chain = generateChainLetter(username);
      setLetters([chain, ...letters]);
    }
    // Send a new letter if enough time has passed
    if (Date.now() - lastAt > LETTER_INTERVAL_MS) {
      const next = generateLetter(username);
      setLetters((prev) => [next, ...prev]);
      setLastAt(Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLetter = (l: Letter) => {
    setOpen(l);
    if (!l.read) {
      setLetters(letters.map((x) => (x.id === l.id ? { ...x, read: true } : x)));
      if (l.stamp === "DO NOT OPEN") unlock("chainletter");
    }
  };

  const unread = letters.filter((l) => !l.read).length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full py-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-widest neon-text flex items-center justify-center gap-3">
            <Mail className="w-8 h-8" />
            Presidential Inbox
          </h1>
          <p className="text-secondary font-mono text-xs uppercase mt-2">
            {unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Inbox empty (suspicious)"}
          </p>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {letters.map((l, i) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
                onClick={() => openLetter(l)}
                className={`w-full flex items-center gap-3 p-3 text-left border-2 transition-colors clickable ${
                  l.read
                    ? "border-primary/30 bg-black/30 text-white/60"
                    : "border-primary bg-black/70 text-primary neon-box"
                }`}
              >
                {l.read ? <MailOpen className="w-5 h-5 shrink-0" /> : <Mail className="w-5 h-5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-mono uppercase text-sm font-bold truncate">{l.subject}</div>
                  <div className="text-[10px] uppercase opacity-60">
                    {new Date(l.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <span className="text-[9px] border border-current px-2 py-0.5 uppercase font-bold">{l.stamp}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, rotate: -1 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-amber-50/95 text-black p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              <div className="border-b-2 border-black/30 pb-3 mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-black/60">Republic of Bahamas Land</div>
                  <h2 className="text-xl font-bold uppercase">{open.subject}</h2>
                </div>
                <div className="border-2 border-red-700 text-red-700 px-2 py-1 rotate-[8deg] text-[10px] uppercase font-bold flex items-center gap-1">
                  <Stamp className="w-3 h-3" />
                  {open.stamp}
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{open.body}</pre>
              <div className="text-[10px] text-black/40 mt-6 border-t border-black/20 pt-2 uppercase tracking-widest">
                Received {new Date(open.timestamp).toLocaleString()}
              </div>
              <Button
                onClick={() => setOpen(null)}
                className="mt-4 w-full bg-black text-amber-50 hover:bg-black/80 uppercase font-bold tracking-widest"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
