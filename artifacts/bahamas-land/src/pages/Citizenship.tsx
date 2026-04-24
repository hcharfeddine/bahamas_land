import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Stamp, X } from "lucide-react";
import { unlock } from "@/lib/achievements";
import { audio } from "@/lib/audio";

const REASONS = [
  "Vibes insufficient",
  "Suspected of being mid",
  "Did not bring snacks for President",
  "Spelled 'Bahamas' wrong (we did not check)",
  "Insufficient loyalty quotient",
  "President was napping. We assumed no.",
  "We just don't like your face. No offense.",
  "Quota for new citizens reached for the next 800 years.",
];

export default function Citizenship() {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [snacks, setSnacks] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    unlock("urlsnoop");
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitted(true);
    unlock("denied");
    audio.playGlitch();
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full py-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black text-secondary uppercase tracking-widest neon-text-cyan">
            Citizenship Application
          </h1>
          <p className="text-primary font-mono text-xs uppercase mt-2">Form B-7 (Rev. 47)</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-amber-50/95 text-black p-6 space-y-4 shadow-2xl"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          <div className="border-b-2 border-black/30 pb-2 text-[10px] uppercase tracking-widest text-black/60">
            Republic of Bahamas Land · Office of New Citizens
          </div>
          <Field label="Full legal name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              className="w-full bg-transparent border-b border-black/40 outline-none p-1"
            />
          </Field>
          <Field label="Reason for wanting citizenship">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={120}
              className="w-full bg-transparent border-b border-black/40 outline-none p-1"
            />
          </Field>
          <Field label="Snacks brought for President (be specific)">
            <input
              value={snacks}
              onChange={(e) => setSnacks(e.target.value)}
              maxLength={80}
              className="w-full bg-transparent border-b border-black/40 outline-none p-1"
            />
          </Field>
          <div className="flex items-start gap-2 text-xs">
            <input type="checkbox" required className="mt-1" />
            <label>I solemnly swear loyalty to President Nattoun and accept that he can revoke this citizenship for any reason or no reason.</label>
          </div>
          <Button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-black text-amber-50 hover:bg-black/80 uppercase font-bold tracking-widest"
          >
            Submit Application
          </Button>
        </form>

        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubmitted(false)}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: 5 }}
                animate={{ scale: 1, rotate: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-amber-50 text-black p-6 max-w-md w-full relative shadow-2xl"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <button
                  onClick={() => setSubmitted(false)}
                  className="absolute top-2 right-2 text-black/50 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-[10px] uppercase tracking-widest text-black/60 border-b-2 border-black/30 pb-2 mb-4">
                  Office of New Citizens · Determination
                </div>
                <h2 className="text-2xl font-black uppercase mb-4">Application: DENIED</h2>
                <div className="text-sm leading-relaxed mb-6">
                  Dear <strong>{name || "Applicant"}</strong>,<br />
                  <br />
                  We regret to inform you that your application for citizenship in the
                  Republic of Bahamas Land has been <strong>DENIED</strong>.
                  <br />
                  <br />
                  Reason: <strong>{REASONS[Math.floor(Math.random() * REASONS.length)]}</strong>
                </div>
                <div className="border-4 border-red-700 text-red-700 px-3 py-1 font-black uppercase rotate-[-8deg] inline-flex items-center gap-2 text-sm">
                  <Stamp className="w-4 h-4" />
                  REJECTED
                </div>
                <div className="text-[10px] mt-6 text-black/40 border-t border-black/20 pt-2 uppercase">
                  You may reapply in 800 years.
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-black/70">{label}</span>
      {children}
    </label>
  );
}
