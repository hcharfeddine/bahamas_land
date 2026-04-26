import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Book, ExternalLink, X } from "lucide-react";
import { audio } from "@/lib/audio";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { useLocalStorage } from "@/lib/store";
import { unlock } from "@/lib/achievements";

type LibraryLink = {
  id: number;
  label: string;
  real: string;
  url: string;
  trolled?: boolean;
};

const LINKS: LibraryLink[] = [
  { id: 1, label: "Forbidden Knowledge", real: "Kick", url: "https://kick.com/m3kky" },
  { id: 2, label: "Cursed Texts", real: "TikTok", url: "https://www.tiktok.com/@m3kky_official", trolled: true },
  { id: 3, label: "The Final Document", real: "YouTube", url: "https://www.youtube.com/@M3KKYYY" },
  { id: 4, label: "Restricted Outtakes", real: "YouTube Randoms", url: "https://www.youtube.com/@M3KKYRANDOMS" },
  { id: 5, label: "Sealed Until 2049", real: "Discord", url: "https://discord.com/invite/cqHafeyeSp" },
];

const LIBRARY_KEY = "ogs_library_opened";

function readOpened(): number[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export default function Library() {
  const [trollLink, setTrollLink] = useState<string | null>(null);
  const [opened, setOpened] = useLocalStorage<number[]>(LIBRARY_KEY, []);

  // Check on mount — if all books already opened in a previous session, award now
  useEffect(() => {
    if (readOpened().length >= LINKS.length) unlock("scholar");
  }, []);

  const markOpened = (id: number) => {
    // Read directly from localStorage to avoid stale closure bugs
    const current = readOpened();
    if (current.includes(id)) return;
    const next = [...current, id];
    setOpened(next);
    if (next.length >= LINKS.length) unlock("scholar");
  };

  const handleTikTokClick = (e: React.MouseEvent, url: string, id: number) => {
    e.preventDefault();
    audio.playGlitch();
    setTrollLink(url);
    markOpened(id);
  };

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
          {LINKS.map((link, i) => {
            const isTroll = link.trolled === true;
            const commonProps = {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: i * 0.1 },
              whileHover: {
                scale: 1.05,
                rotate: i % 2 === 0 ? 2 : -2,
                boxShadow: "0 0 20px hsl(var(--secondary))",
              },
              onMouseEnter: () => audio.playGlitch(),
              className:
                "bg-black border-2 border-secondary/50 p-6 flex flex-col items-center justify-center min-h-[150px] relative group overflow-hidden cursor-pointer",
            };

            const inner = (
              <>
                <div className="absolute inset-0 bg-secondary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />

                <Book className="w-8 h-8 text-secondary mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />

                <h3 className="text-primary font-bold text-center font-mono uppercase tracking-wider mb-2 relative z-10">
                  {link.label}
                </h3>

                <div className="text-xs text-secondary/0 group-hover:text-secondary/80 font-mono transition-colors duration-300 flex items-center gap-1">
                  [ {link.real} ] <ExternalLink className="w-3 h-3" />
                </div>
              </>
            );

            if (isTroll) {
              return (
                <motion.button
                  key={link.id}
                  type="button"
                  onClick={(e) => handleTikTokClick(e, link.url, link.id)}
                  {...commonProps}
                >
                  {inner}
                </motion.button>
              );
            }

            return (
              <motion.a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markOpened(link.id)}
                {...commonProps}
              >
                {inner}
              </motion.a>
            );
          })}
        </div>
      </div>

      {/* TikTok troll modal */}
      <AnimatePresence>
        {trollLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setTrollLink(null)}
          >
            <motion.div
              initial={{ scale: 0.7, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-black border-2 border-primary neon-box p-6 md:p-8 font-mono"
            >
              <button
                type="button"
                onClick={() => setTrollLink(null)}
                aria-label="Close"
                className="absolute top-2 right-2 p-1 text-primary hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                <motion.img
                  src={nattounImg}
                  data-nattoun="true"
                  alt="President Nattoun"
                  className="w-20 h-20 md:w-28 md:h-28 object-cover border-2 border-primary neon-box flex-shrink-0"
                  initial={{ rotate: -8 }}
                  animate={{ rotate: [-8, 4, -3, 0] }}
                  transition={{ duration: 0.7 }}
                />

                <div className="flex-1 space-y-3">
                  <p className="text-primary text-base md:text-lg leading-snug">
                    "FOR REAL TIKTOK?!"
                  </p>
                  <p className="text-secondary text-xs md:text-sm leading-relaxed">
                    "Bahamas Land does NOT do TikTok. We do not click. We do not
                    scroll. We do not dance. Here is your link, citizen — read it
                    with your eyes only."
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-primary/30 pt-4 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-secondary/70">
                  Official Read-Only Address
                </div>
                <div
                  // Block selection / copying — eyes only
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  className="select-none border border-primary/60 bg-primary/5 px-4 py-3 text-primary text-sm md:text-base break-all neon-text"
                  style={{
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                  }}
                  aria-label="TikTok URL, view only, not selectable"
                >
                  {trollLink}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-primary/60">
                  [ NOT clickable. NOT copyable. President's orders. ]
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setTrollLink(null)}
                  className="bg-primary hover:bg-primary/80 text-black uppercase font-bold tracking-widest px-6 py-2 text-sm clickable"
                >
                  Yes Mr. President
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
