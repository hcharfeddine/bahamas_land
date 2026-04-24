import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername, useCoins } from "@/lib/store";
import { Layout } from "@/components/Layout";
import { Scale, Building2, Book, Coins, Castle, Fingerprint } from "lucide-react";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import bgImg from "@assets/background_1777028829781.webp";

const LOCATIONS = [
  { id: "court", path: "/court", label: "COURT OF OGs", icon: Scale, x: "20%", y: "40%", delay: 0.1 },
  { id: "museum", path: "/museum", label: "MUSEUM OF OGs", icon: Building2, x: "70%", y: "30%", delay: 0.2 },
  { id: "library", path: "/library", label: "FORBIDDEN KNOWLEDGE", icon: Book, x: "80%", y: "60%", delay: 0.3 },
  { id: "bank", path: "/bank", label: "BANK OF NATTOUN", icon: Coins, x: "30%", y: "70%", delay: 0.4 },
  { id: "palace", path: "/palace", label: "PRESIDENT PALACE", icon: Castle, x: "50%", y: "50%", delay: 0.5 },
];

export default function World() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useUsername();
  const [, setCoins] = useCoins();
  const [showIntro, setShowIntro] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!username) {
      setShowIntro(true);
    }
  }, [username]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim().length > 0 && nameInput.trim().length <= 20) {
      setUsername(nameInput.trim());
      setCoins(1000);
      setShowIntro(false);
    }
  };

  // Konami Code
  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === konamiCode[konamiIndex] || e.key.toLowerCase() === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          setLocation('/secret');
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: `url(${bgImg})` }}
      />
      
      {/* Grid Floor */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 perspective-[1000px] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,hsl(var(--primary)/0.2)_2%,transparent_3%),linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.2)_2%,transparent_3%)] bg-[size:50px_50px] [transform:rotateX(60deg)_translateY(-100px)_scale(2)] animate-[grid_10s_linear_infinite]" />
      </div>

      <Layout showBack={false}>
        <div className="relative w-full h-[calc(100dvh-100px)] flex flex-col md:block">
          {LOCATIONS.map((loc) => {
            const Icon = loc.icon;
            return (
              <motion.button
                key={loc.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: loc.delay, type: "spring", stiffness: 200, damping: 15 }}
                whileHover={{ scale: 1.2, filter: "brightness(1.5)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setLocation(loc.path)}
                className="absolute md:block flex items-center justify-center flex-col gap-2 group clickable"
                style={{ 
                  left: window.innerWidth > 768 ? loc.x : 'auto', 
                  top: window.innerWidth > 768 ? loc.y : 'auto',
                  position: window.innerWidth > 768 ? 'absolute' : 'relative',
                  margin: window.innerWidth > 768 ? '0' : '1rem auto'
                }}
              >
                <div className="p-4 bg-black/80 border-2 border-primary neon-box rounded-full">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <div className="bg-black/90 border border-secondary text-secondary px-3 py-1 text-xs font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap neon-box-cyan">
                  {loc.label}
                </div>
              </motion.button>
            );
          })}

          {/* Secret invisible click zone */}
          <div 
            className="absolute top-[10%] right-[10%] w-8 h-8 cursor-help opacity-0 hover:opacity-10"
            onClick={() => setLocation('/secret')}
          />
        </div>
      </Layout>

      <Dialog open={showIntro} onOpenChange={() => {}}>
        <DialogContent className="bg-black border-2 border-primary neon-box text-primary font-mono sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl uppercase tracking-widest text-center border-b border-primary pb-4 mb-4">
              Border Control
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 items-start">
            <img src={nattounImg} alt="President Nattoun" className="w-24 h-24 object-cover border border-primary neon-box" />
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-sm leading-relaxed"
              >
                <p>"I am President Nattoun, leader of Bahamas Land."</p>
                <p>"This is a serious country. Please behave."</p>
                <p>"We are watching you."</p>
              </motion.div>
              
              <form onSubmit={handleNameSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-secondary">State your name, citizen:</label>
                  <Input 
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    className="bg-black border-primary text-primary focus-visible:ring-primary uppercase font-mono h-12"
                    placeholder="ENTER NAME..."
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="w-full bg-primary hover:bg-primary/80 text-black uppercase font-bold tracking-widest"
                >
                  Submit to the Republic
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
