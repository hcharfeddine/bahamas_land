import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useSecretVisitors } from "@/lib/store";
import { motion } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";

const LORE = [
  "The original capital of Bahamas Land was just a Discord voice channel.",
  "President Nattoun does not actually know how to read.",
  "The economy is backed entirely by stolen memes.",
  "M3kky's aura is technically negative according to state scientists.",
  "This page is illegal in 14 countries.",
  "If you type 'OG' anywhere, the dogs come out. Do not abuse this."
];

export default function Secret() {
  const [visitors, setVisitors] = useSecretVisitors();

  useEffect(() => {
    setVisitors(v => v + 1);
  }, [setVisitors]);

  return (
    <Layout showBack={true}>
      <div className="min-h-[calc(100dvh-100px)] w-full flex flex-col items-center justify-center relative overflow-hidden bg-black">
        
        {/* Rave Lights Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
            className="w-[200vw] h-[200vw] bg-[conic-gradient(from_0deg,transparent,hsl(var(--primary)),transparent,hsl(var(--secondary)),transparent)] blur-3xl"
          />
        </div>

        <motion.div
          animate={{ 
            scale: [1, 1.2, 0.8, 1.1, 1],
            rotate: [0, 15, -15, 5, 0],
            filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(180deg)", "hue-rotate(270deg)", "hue-rotate(360deg)"]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="relative z-10 mb-12"
        >
          <img src={nattounImg} alt="Dancing Nattoun" className="w-48 h-48 object-cover drop-shadow-[0_0_20px_white]" />
        </motion.div>

        <div className="relative z-10 text-center space-y-8 bg-black/80 p-8 border-4 border-dashed border-white neon-box max-w-2xl w-full">
          <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-8 text-center" style={{ textShadow: "0 0 10px white" }}>
            RESTRICTED LORE AREA
          </h1>

          <div className="space-y-4 text-left">
            {LORE.map((line, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="text-secondary font-mono text-sm md:text-base border-l-2 border-primary pl-4"
              >
                {">"} {line}
              </motion.div>
            ))}
          </div>

          <div className="pt-8 mt-8 border-t border-white/20 text-white/50 font-mono text-sm">
            Visitors who found this: {visitors}
          </div>
          
          <div className="text-xs text-primary mt-4 uppercase">
            Speak of this to no one.
          </div>
        </div>
      </div>
    </Layout>
  );
}
