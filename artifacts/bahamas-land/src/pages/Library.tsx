import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Book, ExternalLink } from "lucide-react";
import { audio } from "@/lib/audio";

const LINKS = [
  { id: 1, label: "Forbidden Knowledge", real: "Twitch", url: "https://twitch.tv" },
  { id: 2, label: "Do Not Click", real: "Instagram", url: "https://instagram.com" },
  { id: 3, label: "Cursed Texts", real: "TikTok", url: "https://tiktok.com" },
  { id: 4, label: "The Final Document", real: "YouTube", url: "https://youtube.com" },
  { id: 5, label: "Restricted Archive", real: "X / Twitter", url: "https://x.com" },
  { id: 6, label: "Sealed Until 2049", real: "Discord", url: "https://discord.com" },
];

export default function Library() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full space-y-12">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <Book className="w-16 h-16 mx-auto text-secondary neon-text-cyan" />
          <h1 className="text-4xl md:text-5xl font-bold text-secondary font-mono uppercase tracking-widest neon-text-cyan">
            THE LIBRARY
          </h1>
          <p className="text-primary font-mono">Do not read these. We mean it.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LINKS.map((link, i) => (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ 
                scale: 1.05, 
                rotate: (i % 2 === 0 ? 2 : -2),
                boxShadow: "0 0 20px hsl(var(--secondary))"
              }}
              onMouseEnter={() => audio.playGlitch()}
              className="bg-black border-2 border-secondary/50 p-6 flex flex-col items-center justify-center min-h-[150px] relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-secondary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              
              <Book className="w-8 h-8 text-secondary mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              
              <h3 className="text-primary font-bold text-center font-mono uppercase tracking-wider mb-2 relative z-10">
                {link.label}
              </h3>
              
              <div className="text-xs text-secondary/0 group-hover:text-secondary/80 font-mono transition-colors duration-300 flex items-center gap-1">
                [ {link.real} ] <ExternalLink className="w-3 h-3" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </Layout>
  );
}
