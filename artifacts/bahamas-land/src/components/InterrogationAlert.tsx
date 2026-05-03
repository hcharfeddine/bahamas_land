import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured, RemoteInterrogation } from "@/lib/supabase";
import { getStoredUsername } from "@/lib/players";
import { ACHIEVEMENTS } from "@/lib/achievements";

export function InterrogationAlert() {
  const [interrogation, setInterrogation] = useState<RemoteInterrogation | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const username = getStoredUsername();
    if (!username) return;

    const check = async () => {
      const { data } = await supabase!
        .from("interrogations")
        .select("*")
        .eq("username", username)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setInterrogation(data as RemoteInterrogation);
        setOpen(true);
      }
    };
    check();
  }, []);

  const achievement = interrogation
    ? ACHIEVEMENTS.find((a) => a.id === interrogation.achievement_id)
    : null;

  const handleSubmit = async () => {
    if (!interrogation || !supabase || !answer.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("interrogations")
      .update({
        answer: answer.trim(),
        status: "answered",
        answered_at: new Date().toISOString(),
      })
      .eq("id", interrogation.id);
    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      setTimeout(() => setOpen(false), 3000);
    }
  };

  if (!open || !interrogation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="bg-black border-2 border-red-500 max-w-lg w-full p-6 space-y-5 shadow-[0_0_40px_rgba(239,68,68,0.4)]"
        >
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <p className="text-green-400 font-mono uppercase text-sm tracking-widest">
                Response Received. The Administration Will Review.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h2 className="text-red-400 font-black uppercase tracking-widest text-lg">
                    Presidential Inquiry
                  </h2>
                  <p className="text-white/50 font-mono text-xs uppercase mt-1">
                    The State requires your testimony.
                  </p>
                </div>
              </div>

              <div className="border border-red-500/40 bg-red-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-mono text-xs uppercase">
                  <span className="text-white/40">Achievement under review:</span>
                  <span className="font-bold">
                    {achievement ? `${achievement.emoji} ${achievement.name}` : interrogation.achievement_name}
                  </span>
                </div>
                <p className="text-primary font-serif italic text-sm leading-relaxed">
                  "Citizen, explain in your own words how you unlocked this achievement. Be specific — the President is watching."
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-white/50 font-mono text-xs uppercase">Your testimony:</label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Describe exactly how you got this achievement..."
                  rows={5}
                  maxLength={1000}
                  className="w-full bg-black border border-primary/40 text-primary font-mono text-sm p-3 resize-none focus:border-primary focus:outline-none placeholder:text-white/20"
                />
                <div className="text-white/20 font-mono text-[10px] text-right">{answer.length}/1000</div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || answer.trim().length < 10}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold uppercase tracking-widest"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Sending..." : "Submit Testimony"}
                </Button>
              </div>

              <p className="text-white/20 font-mono text-[10px] text-center uppercase">
                Failure to respond may result in administrative action.
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
