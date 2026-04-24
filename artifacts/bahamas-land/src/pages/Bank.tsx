import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCoins } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, TrendingDown, RefreshCcw } from "lucide-react";
import { audio } from "@/lib/audio";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const INVESTMENTS = [
  "MID Token (definitely going up)",
  "DogeNattoun Inu Coin",
  "Tunisian Pyramid Scheme™"
];

const DISASTERS = [
  "You have lost everything. Bahamas Land thanks you for your contribution.",
  "President Nattoun has eaten your savings.",
  "Your investment returned -100%. Impressive.",
  "The market crashed because of YOU."
];

export default function Bank() {
  const [coins, setCoins] = useCoins();
  const [isProcessing, setIsProcessing] = useState(false);
  const [disaster, setDisaster] = useState<string | null>(null);
  
  // A crude way to handle daily allowance - ideally would store a timestamp in localstorage
  const handleAllowance = () => {
    setCoins(coins + 100);
    audio.playCoin();
  };

  const handleInvest = (name: string) => {
    if (coins <= 0) return;
    
    setIsProcessing(true);
    audio.playGlitch();
    
    setTimeout(() => {
      setIsProcessing(false);
      setCoins(0);
      setDisaster(DISASTERS[Math.floor(Math.random() * DISASTERS.length)]);
      audio.playGlitch();
    }, 2000);
  };

  const handleBeg = () => {
    setCoins(5);
    setDisaster(null);
    audio.playCoin();
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
        </motion.div>

        <div className="text-center bg-black/80 border-2 border-accent p-8 relative overflow-hidden" style={{ boxShadow: "0 0 20px hsl(var(--accent)/0.2)" }}>
          <div className="text-accent/50 font-mono mb-2 uppercase">Current Balance</div>
          <div className="text-6xl font-black text-accent tracking-tighter" style={{ textShadow: "0 0 20px hsl(var(--accent))" }}>
            {coins} <span className="text-2xl">NC</span>
          </div>
        </div>

        {coins > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INVESTMENTS.map((inv, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleInvest(inv)}
                disabled={isProcessing}
                className="bg-black border border-primary p-6 flex flex-col items-center justify-center gap-4 group hover:bg-primary/10 transition-colors"
              >
                <TrendingDown className="w-8 h-8 text-primary group-hover:text-accent transition-colors" />
                <span className="font-mono text-sm text-center text-primary">{inv}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="text-destructive font-mono text-xl uppercase animate-pulse">
              [ ACCOUNT LIQUIDATED ]
            </div>
            <Button 
              onClick={handleBeg}
              className="bg-accent text-black font-bold uppercase tracking-widest hover:bg-accent/80 p-8 text-lg"
            >
              Beg President Nattoun for mercy
            </Button>
          </motion.div>
        )}

        <div className="flex justify-center pt-8">
          <Button 
            variant="outline"
            onClick={handleAllowance}
            className="border-secondary text-secondary hover:bg-secondary/20 hover:text-secondary font-mono"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Claim Allowance (100 NC)
          </Button>
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
