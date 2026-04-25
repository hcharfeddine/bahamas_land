import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { unlock } from "@/lib/achievements";

type Decree = {
  no: number;
  title: string;
  date: string;
  body: string;
  notes?: string;
};

const DECREES: Decree[] = [
  {
    no: 1,
    title: "On The Permanence Of M3kky's Stream",
    date: "Year 0001 of the Reign",
    body:
      "Effective immediately, M3kky shall stream forever. Without interruption. Without sleep. Without complaint. The microphone is now a state organ. The camera is the eye of the nation.\n\nFailure to stream constitutes a CONSTITUTIONAL CRISIS, punishable by being made to stream more.",
    notes: "M3kky has been informed. M3kky did not respond. The stream continues.",
  },
  {
    no: 7,
    title: "On The Currency Known As 'NC'",
    date: "Year 0001 of the Reign",
    body:
      "All Nattoun Coins (NC) shall remain within the borders of Bahamas Land at all times. NC may not be exported. NC may not be exchanged. NC may not be looked at sideways.\n\nThe value of 1 NC is hereby pegged to: whatever The President says it is, on Tuesdays.",
    notes: "On all other days, the value is approximate.",
  },
  {
    no: 12,
    title: "On The Reform Of Tuesdays",
    date: "Year 0001 of the Reign",
    body:
      "By the powers vested in The President by The President, all Tuesdays are hereby renamed 'Mondays.'\n\nThis means the week shall now consist of: Sunday, Monday, Monday, Wednesday, Thursday, Friday, Saturday. Citizens are expected to adapt within (1) one work cycle.",
    notes: "Wednesday remains under review. Wednesday has been on review since Decree 8.",
  },
  {
    no: 42,
    title: "On The Citizenship Of Cats",
    date: "Year 0001 of the Reign",
    body:
      "All cats currently within the borders of Bahamas Land are granted full citizenship, including the right to vote, the right to own property, and the right to ignore both.\n\nThe Cat known as THE CAT is appointed Honorary Minister of Vibes.",
    notes: "The Cat declined to attend the swearing-in ceremony. This is considered acceptance.",
  },
  {
    no: 77,
    title: "On The Banning Of A Specific Word",
    date: "Year 0001 of the Reign",
    body:
      "The word ████████ (REDACTED) is hereby removed from all official and unofficial vocabulary in Bahamas Land. Citizens caught typing this word into any keyboard, including their own, will be subject to immediate REDACTION.\n\nThe word is so dangerous that this decree itself cannot say it. The Ministry of Internal Harmony will handle violations personally.",
    notes: "If you do not know which word, do not ask. Asking is also banned.",
  },
  {
    no: 101,
    title: "On The Office Of Chief Of Police",
    date: "Year 0001 of the Reign",
    body:
      "The Dog is hereby confirmed as Chief of Police of Bahamas Land, in perpetuity, until The Dog decides otherwise.\n\nThe Dog's salary shall be paid in: belly rubs, treats, and one (1) pillow. The Dog shall not be required to attend cabinet meetings, court sessions, or any meeting at all.",
    notes: "The Dog is currently asleep. Do not wake The Dog. The country is fine.",
  },
  {
    no: 144,
    title: "On The Annexation Of Faddina",
    date: "Year 0001 of the Reign",
    body:
      "The territory known historically and emotionally as FADDINA is hereby declared a sovereign region of Bahamas Land, by unilateral, irrevocable, retroactive proclamation.\n\nNo treaty was signed. No vote was held. No one was consulted. This is, technically, how all good annexations begin.",
    notes: "Faddina has not been informed. This is a feature, not a bug.",
  },
  {
    no: 256,
    title: "On Chess Cheating, Specifically Mine",
    date: "Year 0001 of the Reign",
    body:
      "The President reserves the constitutional right to: move pawns sideways, teleport the king, summon additional knights at will, and declare 'cabinet reshuffle' to swap colors mid-game.\n\nThis is not cheating. This is EXECUTIVE PRIVILEGE in chess form. Citizens claiming victory against The President will receive a loss.",
    notes: "Decree-protected. Any chess engine attempting to enforce FIDE rules will be exiled.",
  },
  {
    no: 412,
    title: "On The Validity Of This Decree",
    date: "Year 0001 of the Reign",
    body:
      "It is hereby decreed that this decree is also a decree, decreed by The President, in accordance with the decree-issuing powers granted by Decree 412.\n\nThis decree is self-validating. Reading it constitutes acceptance of all its terms, including the ones not written here. There are many.",
    notes: "If this decree contradicts another decree, this decree wins. This is also a decree.",
  },
  {
    no: 999,
    title: "On Reading This Decree",
    date: "Year 0001 of the Reign",
    body:
      "Reading this decree is now ILLEGAL. Citizens who have read up to this point are politely asked to forget what they have just read.\n\nThank you for your cooperation. The Ministry of Forgetting will be in touch.",
    notes: "If you remember reading this, please report yourself to the Palace. Bring snacks.",
  },
];

export default function Decrees() {
  const seal = useMemo(() => "BL-PRES-" + Math.floor(Math.random() * 9000 + 1000), []);

  useEffect(() => {
    unlock("decreed");
  }, []);

  return (
    <Layout showBack>
      <div className="min-h-screen w-full" style={{ background: "#1a1410" }}>
        <div
          className="min-h-screen w-full px-3 py-6 md:px-8 md:py-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(255,200,120,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(180,80,40,0.05) 0%, transparent 50%)",
          }}
        >
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-amber-300/80 text-xs md:text-sm tracking-[0.4em] mb-2"
              >
                ★ OFFICIAL STATE PUBLICATION ★ {seal} ★
              </motion.div>
              <h1 className="font-display text-4xl md:text-6xl font-black text-amber-100 tracking-wider">
                THE STATE DECREES
              </h1>
              <div className="font-mono text-amber-200/70 text-xs md:text-sm mt-2 max-w-2xl mx-auto">
                A complete and binding archive of every order issued by His Excellency,
                President Nattoun, Eternal Steward of Bahamas Land, Defender of NC, and
                Honorary Doctor of Cats.
              </div>
            </div>

            {/* Decree cards */}
            <div className="space-y-6">
              {DECREES.map((d, i) => (
                <DecreeCard key={d.no} d={d} idx={i} seal={seal} />
              ))}
            </div>

            {/* Footer */}
            <div className="mt-10 text-center text-amber-200/50 font-mono text-xs">
              — End of public archive —
              <br />
              <span className="italic">Additional decrees exist. They are classified.</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function DecreeCard({ d, idx, seal }: { d: Decree; idx: number; seal: string }) {
  const [seen, setSeen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setSeen(true)}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="relative bg-amber-50 text-stone-900 border-4 border-amber-900 shadow-[0_15px_30px_rgba(0,0,0,0.6)] p-5 md:p-7"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      data-testid={`decree-${d.no}`}
    >
      {/* paper grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(120,80,40,0.05) 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, rgba(120,80,40,0.05) 0 1px, transparent 1px 4px)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between text-[10px] md:text-xs uppercase tracking-widest font-mono text-stone-700 border-b border-stone-400 pb-2">
          <span>Decree N° {String(d.no).padStart(3, "0")}</span>
          <span>{d.date}</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-center my-4 tracking-wide">
          {d.title}
        </h2>

        <div className="text-center text-xs uppercase tracking-widest text-stone-600 mb-4">
          By Order Of His Excellency, President Nattoun
        </div>

        <div className="whitespace-pre-line leading-7 md:leading-8 text-[15px] md:text-base text-stone-800 first-letter:text-5xl first-letter:font-black first-letter:float-left first-letter:mr-2 first-letter:leading-none first-letter:font-serif">
          {d.body}
        </div>

        {d.notes && (
          <div className="mt-5 border-t border-dashed border-stone-400 pt-3 text-xs md:text-sm italic text-stone-700">
            ※ {d.notes}
          </div>
        )}

        {/* Signature block */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="text-[10px] md:text-xs font-mono text-stone-600">
            FILED: {seal}-{String(d.no).padStart(3, "0")}
            <br />
            ARCHIVE: PALACE BASEMENT, 3rd shelf
          </div>
          <div className="text-right">
            <motion.div
              initial={{ pathLength: 0 }}
              animate={seen ? { pathLength: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.3 + idx * 0.05 }}
              className="font-display text-3xl md:text-4xl text-red-700 italic"
              style={{
                fontFamily: "'Brush Script MT', 'Snell Roundhand', cursive",
                transform: "rotate(-6deg)",
              }}
            >
              ~Nattoun~
            </motion.div>
            <div className="text-[10px] md:text-xs uppercase tracking-widest font-mono text-stone-700 mt-1">
              The President
            </div>
          </div>
        </div>

        {/* Wax seal */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={seen ? { scale: 1, rotate: idx % 2 === 0 ? -8 : 8 } : {}}
          transition={{ duration: 0.5, delay: 0.6 + idx * 0.05 }}
          className="absolute -right-3 -bottom-3 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-4 border-red-900"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #d04030 0%, #8a1a10 70%, #5a0a05 100%)",
          }}
        >
          <div className="text-amber-100 text-center leading-tight">
            <div className="text-[8px] md:text-[10px] tracking-widest font-mono opacity-80">
              ★ BL ★
            </div>
            <div className="text-2xl md:text-3xl">🐕</div>
            <div className="text-[7px] md:text-[8px] tracking-widest font-mono opacity-80">
              PRES
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
