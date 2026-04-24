import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMuseum, useUsername } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Upload, Heart } from "lucide-react";
import { audio } from "@/lib/audio";

const LABELS = ["Ancient Artifact", "Certified Mid", "Top Tier OG", "Lost Relic", "Cursed", "Sacred"];

export default function Museum() {
  const [username] = useUsername();
  const [items, setItems] = useMuseum();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [respectsGiven, setRespectsGiven] = useState<Record<string, boolean>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("President Nattoun says: File too big. Max 1MB. We are not paying for this storage.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !image) return;

    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      username: username || "ANONYMOUS CITIZEN",
      caption: caption.trim(),
      image,
      label: LABELS[Math.floor(Math.random() * LABELS.length)],
      respect: 0,
      timestamp: Date.now()
    };

    setItems([newItem, ...items]);
    setCaption("");
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    audio.playGlitch();
  };

  const handleRespect = (id: string) => {
    if (respectsGiven[id]) return;
    
    setItems(items.map(item => 
      item.id === id ? { ...item, respect: item.respect + 1 } : item
    ));
    setRespectsGiven({ ...respectsGiven, [id]: true });
    audio.playBlip();
  };

  return (
    <Layout>
      <div className="w-full space-y-8">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <Building2 className="w-16 h-16 mx-auto text-primary neon-text" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-mono uppercase tracking-widest neon-text">
            MUSEUM OF THE OGs
          </h1>
          <p className="text-secondary font-mono">Ancient Artifacts of Questionable Value</p>
        </motion.div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto bg-black/80 border-2 border-primary p-6 neon-box relative z-20"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-primary text-primary hover:bg-primary/20 shrink-0"
              >
                <Upload className="w-4 h-4 mr-2" />
                {image ? "Image Selected" : "Upload Relic"}
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={100}
                placeholder="Caption this artifact (max 100 chars)"
                className="bg-black border-primary text-primary font-mono"
              />
            </div>
            <Button 
              type="submit" 
              disabled={!caption.trim() && !image}
              className="w-full bg-primary text-black font-bold uppercase tracking-wider hover:bg-primary/80"
            >
              Donate to the Republic
            </Button>
          </form>
        </motion.div>

        <div className="relative min-h-[500px] w-full pt-12 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {items.map((item, i) => {
              const rotation = (Math.random() * 12) - 6; // -6 to +6 degrees
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, rotate: rotation }}
                  whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                  transition={{ delay: (i % 10) * 0.1 }}
                  className="bg-black p-4 border-[3px] border-primary neon-box flex flex-col gap-4 relative max-w-sm mx-auto w-full group"
                >
                  <div className="absolute -top-3 -right-3 bg-secondary text-black font-bold text-xs uppercase px-2 py-1 rotate-[15deg] border border-black shadow-lg">
                    {item.label}
                  </div>
                  
                  {item.image ? (
                    <div className="w-full aspect-square border border-primary/50 overflow-hidden bg-black flex items-center justify-center">
                      <img src={item.image} alt={item.caption} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/1] border border-primary/50 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,255,0.1)_10px,rgba(255,0,255,0.1)_20px)] flex items-center justify-center text-primary/30 font-mono text-xs uppercase text-center p-4">
                      [ Image Corrupted or Missing ]
                    </div>
                  )}

                  <div className="flex-1 text-center">
                    <p className="text-primary font-serif italic text-lg mb-2">"{item.caption}"</p>
                    <p className="text-secondary/70 font-mono text-xs uppercase">Found by: {item.username}</p>
                  </div>

                  <div className="flex justify-between items-center border-t border-primary/30 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRespect(item.id)}
                      disabled={respectsGiven[item.id]}
                      className="text-primary hover:text-primary hover:bg-primary/20 font-mono uppercase text-xs"
                    >
                      <Heart className={`w-4 h-4 mr-2 ${respectsGiven[item.id] ? 'fill-primary' : ''}`} />
                      Respect
                    </Button>
                    <span className="text-primary font-mono font-bold text-lg">{item.respect}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {items.length === 0 && (
            <div className="col-span-full text-center text-primary/50 font-mono text-xl py-24 animate-pulse">
              No artifacts yet. Bahamas Land is still under construction. (forever)
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
