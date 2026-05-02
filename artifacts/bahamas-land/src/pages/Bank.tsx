import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, TrendingDown } from "lucide-react";
import { audio } from "@/lib/audio";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { unlock } from "@/lib/achievements";
import nattounImg from "@assets/Nattoun_1777028672745.png";

const INVESTMENTS = [
  { name: "MID Token (definitely going up)", min: 50 },
  { name: "DogeNattoun Inu Coin", min: 100 },
  { name: "Bahamas Land Pyramid Scheme™", min: 250 },
];

const DISASTERS = [
  "You have lost everything. Bahamas Land thanks you for your contribution.",
  "President Nattoun has eaten your savings.",
  "Your investment returned -100%. Impressive.",
  "The market crashed because of YOU.",
  "Audit complete. Conclusion: you owed it.",
];

const BEG_LINES = [
  "Fine. 5 NC. Don't tell the dog.",
  "The President drops a single coin.",
  "Charity is illegal but Nattoun is in a mood.",
  "5 NC. Now go away.",
];

const REJECT_LINES = [
  "No. Beg again later.",
  "The Bank is closed for the next 3 seconds.",
  "Nattoun is napping. Try again.",
  "Begging permit denied. Reapply.",
  "The treasury is full of vibes only.",
];

export default function Bank() {
  const [coins, setCoins] = useCoins();
  const [isProcessing, setIsProcessing] = useState(false);
  const [disaster, setDisaster] = useState<string | null>(null);
  const [begMessage, setBegMessage] = useState<string | null>(null);
  const [begCooldown, setBegCooldown] = useState(false);

  const handleInvest = (inv: { name: string; min: number }) => {
    if (coins < inv.min || isProcessing) return;
    setIsProcessing(true);
    audio.playGlitch();

    setTimeout(() => {
      setIsProcessing(false);
      // Investments always lose. Welcome to Bahamas Land.
      setCoins(0);
      unlock("bankrupt");
      unlock("broke");
      setDisaster(DISASTERS[Math.floor(Math.random() * DISASTERS.length)]);
      audio.playGlitch();
    }, 2000);
  };

  // ============================================================
  // "Beg the President" — replaces the old free allowance.
  // - Costs nothing to beg, but the President usually says no.
  // - Successful begs only return 5 NC and only when you're VERY broke.
  // - Has a 4 second cooldown so you can't farm it.
  // ============================================================
  const handleBeg = () => {
    if (begCooldown) return;
    setBegCooldown(true);
    window.setTimeout(() => setBegCooldown(false), 4000);

    // Only the truly broke get pity. < 10 NC + 35% chance.
    if (coins < 10 && Math.random() < 0.35) {
      setCoins((c) => c + 5);
      setBegMessage(BEG_LINES[Math.floor(Math.random() * BEG_LINES.length)]);
      audio.playCoin();
    } else {
      setBegMessage(REJECT_LINES[Math.floor(Math.random() * REJECT_LINES.length)]);
      audio.playGlitch();
    }
    setDisaster(null);
    window.setTimeout(() => setBegMessage(null), 3000);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-12">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <Coins className="w-16 h-16 mx-auto text-accent neon-text" style={{ textShadow: "0 0 10px hsl(var(--accent))" }} />
          <h1 className="text-4xl md:text-5xl font-bold text-accent font-mono uppercase tracking-widest" style={{ textShadow: "0 0 10px hsl(var(--accent))" }}>
            BANK OF NATTOUN
          </h1>
          <p className="text-primary font-mono">Where wealth comes to die.</p>
          <p className="text-secondary/80 font-mono text-xs uppercase tracking-widest">
            No allowance. No loans. No mercy.
          </p>
        </motion.div>

        <div className="text-center bg-black/80 border-2 border-accent p-8 relative overflow-hidden" style={{ boxShadow: "0 0 20px hsl(var(--accent)/0.2)" }}>
          <div className="text-accent/50 font-mono mb-2 uppercase">Current Balance</div>
          <div className="text-6xl font-black text-accent tracking-tighter" style={{ textShadow: "0 0 20px hsl(var(--accent))" }}>
            {coins} <span className="text-2xl">NC</span>
          </div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-secondary/60">
            NC is the only currency in Bahamas Land. Spend wisely.
          </div>
        </div>

        {coins > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INVESTMENTS.map((inv, i) => {
              const canAfford = coins >= inv.min;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={canAfford ? { scale: 1.05 } : undefined}
                  whileTap={canAfford ? { scale: 0.95 } : undefined}
                  onClick={() => handleInvest(inv)}
                  disabled={isProcessing || !canAfford}
                  className="bg-black border border-primary p-6 flex flex-col items-center justify-center gap-3 group hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <TrendingDown className="w-8 h-8 text-primary group-hover:text-accent transition-colors" />
                  <span className="font-mono text-sm text-center text-primary">{inv.name}</span>
                  <span className="text-[10px] font-mono uppercase text-accent border border-accent/50 px-2 py-0.5">
                    Min stake: {inv.min} NC
                  </span>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="text-destructive font-mono text-xl uppercase animate-pulse">
              [ ACCOUNT LIQUIDATED ]
            </div>
            <p className="text-secondary/70 font-mono text-xs uppercase text-center max-w-md">
              No allowance, no loans. The Bank does not give handouts.
              Your only option is to beg the President. Politely. Repeatedly.
              He rarely answers.
            </p>
          </motion.div>
        )}

        <div className="flex flex-col items-center gap-3 pt-4">
          <Button
            onClick={handleBeg}
            disabled={begCooldown}
            className="border-2 border-secondary bg-transparent text-secondary hover:bg-secondary/10 font-mono uppercase tracking-widest disabled:opacity-30"
          >
            <img src={nattounImg} alt="" className="w-5 h-5 rounded-full mr-2 border border-secondary/50" />
            Beg President Nattoun
          </Button>
          <AnimatePresence>
            {begMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-secondary text-xs font-mono uppercase border border-secondary/50 px-3 py-1 bg-black/70"
              >
                {begMessage}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-[10px] font-mono uppercase text-white/40 text-center max-w-md">
            Begging is free. Most of the time he says no.
            Earn NC by completing secrets, winning games, or surviving the President's stream.
          </p>
        </div>
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center font-mono text-accent text-2xl tracking-widest uppercase"
          >
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              Processing Transaction...
            </motion.div>
            <div className="mt-4 text-sm text-primary animate-pulse">Finalizing... Transferring... Losing...</div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!disaster} onOpenChange={() => setDisaster(null)}>
        <DialogContent className="bg-black border-2 border-destructive text-destructive font-mono sm:max-w-md [&>button]:hidden">
          <DialogTitle className="text-2xl uppercase text-center border-b border-destructive pb-4">
            Financial Disaster
          </DialogTitle>
          <DialogDescription className="text-center pt-4 text-lg text-primary leading-relaxed">
            {disaster}
          </DialogDescription>
          <Button
            onClick={() => setDisaster(null)}
            className="mt-6 w-full bg-destructive text-black hover:bg-destructive/80 font-bold uppercase"
          >
            Accept Fate
          </Button>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
