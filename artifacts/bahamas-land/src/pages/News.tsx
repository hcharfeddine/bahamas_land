import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper } from "lucide-react";
import { unlock } from "@/lib/achievements";

const SUBJECTS = [
  "President Nattoun",
  "M3kky",
  "The Bank of Nattoun",
  "The Court of OGs",
  "A confused tourist",
  "The Museum of Mid",
  "An anonymous OG",
  "The Library",
  "Tuesday",
  "The economy",
  "All five citizens",
];

const VERBS = [
  "declares war on",
  "officially bans",
  "buys 80% of",
  "loses interest in",
  "gets cancelled by",
  "is investigating",
  "blames the inflation on",
  "renames the country after",
  "trades places with",
  "files a lawsuit against",
];

const OBJECTS = [
  "Tuesday",
  "the concept of mid",
  "all stocks",
  "the wifi",
  "your username",
  "this very newspaper",
  "the dog from /tictactoe",
  "international waters",
  "the alphabet",
  "everyone named Steve",
];

const CHYRON = [
  "BREAKING: Nattoun ate the economy.",
  "BREAKING: Court reverses every verdict made before lunch.",
  "BREAKING: Bank loses small change. Refuses to elaborate.",
  "BREAKING: Citizen reports being 'mid'. Court agrees.",
  "BREAKING: Stocks pump after Nattoun barks once.",
  "BREAKING: M3kky goes live. Population doubles.",
  "BREAKING: Library is missing a page. Suspect: a mouse.",
  "BREAKING: Museum receives donation. Donation runs away.",
];

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

function makeHeadline() {
  return `${pick(SUBJECTS)} ${pick(VERBS)} ${pick(OBJECTS)}.`;
}

export default function News() {
  const [headlines, setHeadlines] = useState<string[]>(() =>
    Array.from({ length: 8 }, makeHeadline)
  );
  const [chyron, setChyron] = useState(pick(CHYRON));

  useEffect(() => {
    unlock("urlsnoop");
    unlock("newshound");
    const id = window.setInterval(() => {
      setHeadlines((h) => [makeHeadline(), ...h.slice(0, 7)]);
    }, 3500);
    const id2 = window.setInterval(() => setChyron(pick(CHYRON)), 5000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(id2);
    };
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full py-6 space-y-6">
        <div className="text-center space-y-2">
          <Newspaper className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-3xl md:text-4xl font-black uppercase text-primary tracking-widest neon-text">
            State Press
          </h1>
          <p className="text-secondary font-mono text-xs uppercase">
            All news 100% real · Ministry of Approved Truth
          </p>
        </div>

        {/* Chyron */}
        <div className="bg-red-700 text-white font-black uppercase tracking-widest py-2 overflow-hidden whitespace-nowrap">
          <motion.div
            key={chyron}
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{ duration: 12, ease: "linear" }}
            className="inline-block"
          >
            ◆ {chyron} &nbsp;&nbsp;&nbsp; ◆ {chyron} &nbsp;&nbsp;&nbsp; ◆ {chyron}
          </motion.div>
        </div>

        <div className="bg-amber-50/95 text-black p-6 space-y-3" style={{ fontFamily: "'Times New Roman', serif" }}>
          <div className="border-b-4 border-double border-black pb-2 mb-3">
            <div className="text-[10px] uppercase tracking-widest text-black/60">
              Issue #{Math.floor(Math.random() * 9000) + 1000} · {new Date().toLocaleDateString()}
            </div>
            <div className="text-3xl font-black uppercase">The Daily Nattoun</div>
            <div className="text-xs italic">"All the news that fits the President's mood."</div>
          </div>
          <AnimatePresence>
            {headlines.map((h, i) => (
              <motion.div
                key={`${h}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-b border-black/30 pb-2"
              >
                <div className="text-[10px] uppercase text-red-700 font-bold">
                  {i === 0 ? "BREAKING" : "TOP STORY"}
                </div>
                <h3 className={`${i === 0 ? "text-2xl" : "text-lg"} font-black leading-tight`}>{h}</h3>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
