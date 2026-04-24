import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVerdicts, useUsername } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Gavel } from "lucide-react";
import { audio } from "@/lib/audio";

const VERDICTS = [
  "GUILTY of being MID", 
  "INNOCENT but suspicious", 
  "BANNED (not really)", 
  "SENTENCED to vibes",
  "CERTIFIED CRINGE", 
  "FREE TO LEAVE (we are watching)", 
  "GUILTY of having no aura", 
  "INNOCENT but cringe"
];

const PROFANITY = ["fuck", "shit", "bitch", "ass", "cunt"]; // basic

export default function Court() {
  const [username] = useUsername();
  const [verdicts, setVerdicts] = useVerdicts();
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || cooldown > 0) return;

    let isClean = true;
    const lowerText = text.toLowerCase();
    PROFANITY.forEach(word => {
      if (lowerText.includes(word)) isClean = false;
    });

    if (!isClean) {
      alert("President Nattoun rejected this text for being too un-chill.");
      return;
    }

    const newVerdict = {
      id: Math.random().toString(36).substr(2, 9),
      username: username || "ANONYMOUS CITIZEN",
      text: text.trim(),
      verdict: VERDICTS[Math.floor(Math.random() * VERDICTS.length)],
      timestamp: Date.now()
    };

    setVerdicts([newVerdict, ...verdicts]);
    setText("");
    setCooldown(15);
    audio.playGlitch();

    const timer = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

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
            <div className="flex justify-between items-center">
              <span className="text-xs text-primary/50 font-mono">{text.length}/150</span>
              <Button 
                type="submit" 
                disabled={!text.trim() || cooldown > 0}
                className="bg-primary text-black font-bold uppercase tracking-wider hover:bg-primary/80 gap-2"
              >
                <Gavel className="w-4 h-4" />
                {cooldown > 0 ? `Cooldown (${cooldown}s)` : "Submit Verdict"}
              </Button>
            </div>
          </form>
        </motion.div>

        <div className="space-y-6 pt-8">
          <h2 className="text-2xl font-mono text-secondary neon-text-cyan border-b border-secondary pb-2">
            OFFICIAL RECORDS
          </h2>
          <AnimatePresence>
            {verdicts.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-black/50 border border-primary/30 p-6 relative group hover:border-primary/80 transition-colors"
              >
                <div className="absolute top-2 right-2 text-xs text-primary/40 font-mono">
                  {new Date(v.timestamp).toLocaleDateString()}
                </div>
                <div className="text-sm text-secondary font-mono mb-2 uppercase">DEFENDANT: {v.username}</div>
                <p className="text-lg text-primary/90 font-serif italic mb-6">"{v.text}"</p>
                
                <div className="absolute bottom-4 right-4 rotate-[-15deg] border-4 border-red-500 text-red-500 font-black text-xl px-4 py-1 uppercase tracking-widest bg-black/80 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                  {v.verdict}
                </div>
              </motion.div>
            ))}
            {verdicts.length === 0 && (
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
