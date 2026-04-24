import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useUsername, useApplause } from "@/lib/store";
import { motion } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { Castle, Star } from "lucide-react";
import { audio } from "@/lib/audio";

const SPEECHES = [
  "Everything is under control.",
  "Nothing is under control.",
  "We have never lost a war. We have also never been in a war.",
  "The economy is doing exceptionally well. (it isn't.)",
  "[username], you are my favorite citizen. (not really.)",
  "Please stop emailing the palace.",
  "Bahamas Land is the largest country in the world (by vibes)."
];

export default function Palace() {
  const [username] = useUsername();
  const [speechIndex, setSpeechIndex] = useState(0);
  const [applause, setApplause] = useApplause();

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeechIndex((prev) => (prev + 1) % SPEECHES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const currentSpeech = SPEECHES[speechIndex].replace("[username]", username || "Citizen");

  const handleApplaud = () => {
    setApplause((a: number) => a + 1);
    audio.playBlip();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)]">
        
        {/* Stage / Environment */}
        <div className="relative w-full max-w-2xl aspect-[4/3] flex flex-col items-center justify-end overflow-hidden border-b-4 border-primary rounded-t-[50%] bg-gradient-to-t from-primary/20 to-transparent">
          
          {/* Red Carpet / Throne glow */}
          <div className="absolute bottom-0 w-3/4 h-1/2 bg-primary/20 blur-3xl rounded-full" />
          
          {/* Teleprompter / Speech Bubble */}
          <motion.div 
            key={speechIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-10 w-3/4 bg-black/80 border-2 border-secondary p-4 text-center neon-box-cyan rounded-lg z-20"
          >
            <p className="text-secondary font-serif text-xl md:text-2xl italic">"{currentSpeech}"</p>
          </motion.div>

          {/* Nattoun Image */}
          <motion.img 
            src={nattounImg} 
            alt="President Nattoun" 
            className="w-1/2 max-w-[300px] object-cover relative z-10 drop-shadow-[0_0_30px_hsl(var(--primary))]"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          />

          {/* Podium */}
          <div className="w-2/3 h-16 bg-black border-t-2 border-x-2 border-primary relative z-20 flex items-center justify-center">
            <Castle className="text-primary w-8 h-8 opacity-50" />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-12 text-center space-y-4">
          <Button 
            onClick={handleApplaud}
            className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold uppercase tracking-widest px-12 py-6 text-lg group"
          >
            <Star className="w-5 h-5 mr-2 group-hover:fill-black" />
            Applaud President
          </Button>
          
          <div className="text-primary/50 font-mono text-sm">
            Applause level: {applause}
          </div>
          
          {applause >= 100 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-secondary font-mono text-sm mt-8 border border-secondary px-4 py-2 inline-block bg-secondary/10"
            >
              "Nattoun appreciates you. But you are still mid."
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
