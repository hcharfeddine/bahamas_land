import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { unlock } from "@/lib/achievements";
import { useLocalStorage } from "@/lib/store";
import { audio } from "@/lib/audio";

export default function Vault() {
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useLocalStorage<number>("ogs_vault_attempts", 0);
  const [shake, setShake] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    unlock("urlsnoop");
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) return;
    setAttempts(attempts + 1);
    setDenied(true);
    setShake(true);
    audio.playGlitch();
    window.setTimeout(() => setShake(false), 400);
    window.setTimeout(() => setDenied(false), 2200);
    setCode("");
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full py-10 space-y-8">
        <div className="text-center space-y-3">
          <Lock className="w-16 h-16 mx-auto text-accent" style={{ filter: "drop-shadow(0 0 10px hsl(var(--accent)))" }} />
          <h1 className="text-4xl md:text-5xl font-black uppercase text-accent tracking-widest" style={{ textShadow: "0 0 12px hsl(var(--accent))" }}>
            The Vault
          </h1>
          <p className="text-secondary font-mono text-xs uppercase">
            Property of President Nattoun · No Trespassing
          </p>
        </div>

        <motion.form
          onSubmit={submit}
          animate={shake ? { x: [-12, 12, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-black/90 border-4 border-accent p-8 space-y-6 neon-box"
          style={{ boxShadow: "0 0 30px hsl(var(--accent)/0.4)" }}
        >
          <div className="text-center space-y-2">
            <div className="text-accent font-mono uppercase text-sm tracking-widest">Enter Vault Code</div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              className="bg-black border-2 border-accent text-accent text-center text-5xl font-mono py-4 w-full tracking-widest outline-none focus:border-primary"
              style={{ textShadow: "0 0 8px hsl(var(--accent))" }}
            />
          </div>
          <Button
            type="submit"
            disabled={code.length !== 4}
            className="w-full bg-accent text-black font-bold uppercase tracking-widest hover:bg-accent/80"
          >
            Unlock
          </Button>
          <div className="text-center text-xs font-mono text-accent/50 uppercase">
            Failed attempts: {attempts} · Reported to President Nattoun: {attempts}
          </div>
        </motion.form>

        <AnimatePresence>
          {denied && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center pointer-events-none"
            >
              <AlertTriangle className="w-24 h-24 text-red-500 mb-4" />
              <div className="text-red-500 font-black text-4xl uppercase tracking-widest" style={{ textShadow: "0 0 12px red" }}>
                WRONG CODE
              </div>
              <div className="text-red-400 font-mono uppercase mt-2">Suspicious activity logged.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
