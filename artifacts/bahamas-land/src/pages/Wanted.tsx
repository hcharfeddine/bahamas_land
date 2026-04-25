import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { unlock } from "@/lib/achievements";
import m3kkyImg from "@assets/m3kky_1777028672745.png";
import nattounImg from "@assets/Nattoun_1777028672745.png";

type Bounty = {
  id: string;
  alias: string;
  realName: string;
  emoji: string;
  photo?: string;
  charges: string[];
  bounty: number;
  status: "AT LARGE" | "ARMED & STREAMING" | "WANTED ALIVE ONLY" | "DO NOT APPROACH" | "ASLEEP";
  lastSeen: string;
  notes: string;
};

const BOUNTIES: Bounty[] = [
  {
    id: "m3kky",
    alias: "M3KKY",
    realName: "Mehdi 'The Streamer' Ben-something",
    emoji: "🎮",
    photo: m3kkyImg,
    charges: [
      "Operating an unlicensed national broadcast.",
      "Saying things on stream the President now regrets.",
      "Possession of a microphone without a permit.",
      "Aggravated catjamming.",
    ],
    bounty: 999_999,
    status: "ARMED & STREAMING",
    lastSeen: "Last seen at his desk. He hasn't moved in 4 days.",
    notes:
      "Founder of The OGs. Known accomplice of Nattoun. The President owes him money but will not admit it on camera.",
  },
  {
    id: "nattoun",
    alias: "PRESIDENT NATTOUN",
    realName: "His Excellency, The Eternal President",
    emoji: "🐕",
    photo: nattounImg,
    charges: [
      "Self-coronation without paperwork.",
      "Issuing 412 decrees in a single afternoon.",
      "Eating the Constitution. Twice.",
      "Tax fraud against himself.",
    ],
    bounty: 0,
    status: "DO NOT APPROACH",
    lastSeen: "The Palace. Always. Forever.",
    notes:
      "REWARD VOID — Subject is the one offering the rewards. Citizens who attempt arrest will be arrested.",
  },
  {
    id: "baskouta",
    alias: "THE BASKOUTA TWINS",
    realName: "Two guys. Allegedly.",
    emoji: "🍪",
    charges: [
      "Smuggling unregulated baskoutas across the border.",
      "Operating a baskouta cartel from inside a Discord call.",
      "Refusing to share. On principle.",
    ],
    bounty: 250_000,
    status: "AT LARGE",
    lastSeen: "Buying flour in bulk. Suspicious quantity.",
    notes: "Always together. If you see one, the other is behind a wall, watching.",
  },
  {
    id: "catjam",
    alias: "THE CAT",
    realName: "Unknown. The cat will not say.",
    emoji: "🐈",
    charges: [
      "Vibing without a license.",
      "Unauthorised head-bobbing in a state building.",
      "Being too small to handcuff.",
    ],
    bounty: 50_000,
    status: "WANTED ALIVE ONLY",
    lastSeen: "On a desk. On a different desk. On YOUR desk now.",
    notes: "Reward payable in tuna. Subject does not respond to its own name.",
  },
  {
    id: "thedog",
    alias: "CHIEF OF POLICE (THE DOG)",
    realName: "Classified. Even the dog forgot.",
    emoji: "🦮",
    charges: [
      "Sleeping on duty for 1,460 consecutive days.",
      "Eating one (1) entire criminal investigation.",
      "Conflict of interest: also the suspect.",
    ],
    bounty: 1,
    status: "ASLEEP",
    lastSeen: "Under the President's desk. Snoring.",
    notes: "Dog is also the Chief of Police. Do not attempt arrest. Dog will lick you and continue.",
  },
  {
    id: "yourself",
    alias: "YOU, THE READER",
    realName: "Citizen #" + Math.floor(Math.random() * 9000 + 1000),
    emoji: "👤",
    charges: [
      "Reading state classified posters without a clearance.",
      "Curiosity in the third degree.",
      "Knowing too much about the catjam situation.",
    ],
    bounty: 12,
    status: "AT LARGE",
    lastSeen: "Right now. This URL. We see you.",
    notes: "Subject is currently viewing this poster. Suspicious.",
  },
];

function fmtBounty(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("en-US") + " NC";
}

export default function Wanted() {
  const [stamp] = useState(() => new Date().toUTCString().slice(5, 16));
  const caseNo = useMemo(() => "BL-" + Math.floor(Math.random() * 90000 + 10000), []);

  useEffect(() => {
    unlock("wanted");
  }, []);

  return (
    <Layout showBack>
      <div className="min-h-screen w-full" style={{ background: "#3a2a18" }}>
        {/* paper backdrop */}
        <div
          className="min-h-screen w-full px-3 py-6 md:px-8 md:py-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 6px), radial-gradient(circle at 30% 20%, rgba(255,230,180,0.08) 0%, transparent 60%)",
          }}
        >
          <div className="mx-auto max-w-6xl">
            {/* Top header band */}
            <div className="border-4 border-amber-200/80 bg-amber-100 text-stone-900 p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                 style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}>
              <div className="flex items-center justify-between text-xs md:text-sm uppercase tracking-widest">
                <span>★ Bahamas Land Bureau of Investigation ★</span>
                <span>FILE {caseNo} • UPDATED {stamp}</span>
              </div>
              <h1 className="text-center text-5xl md:text-7xl font-black tracking-[0.25em] my-3">
                WANTED
              </h1>
              <div className="text-center text-sm md:text-base font-bold uppercase">
                — By Direct Order Of The President —
              </div>
              <div className="text-center text-xs md:text-sm mt-1 italic">
                Citizens are reminded: do not approach. Do not befriend. Do not stream with.
              </div>
            </div>

            {/* Posters grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {BOUNTIES.map((b, i) => (
                <Poster key={b.id} b={b} idx={i} />
              ))}
            </div>

            {/* Footer band */}
            <div className="mt-6 border-4 border-amber-200/80 bg-amber-100 text-stone-900 p-4 md:p-5 text-xs md:text-sm"
                 style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}>
              <div className="font-black tracking-widest text-center mb-2">
                ★ HOW TO COLLECT YOUR REWARD ★
              </div>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Apprehend suspect using only kindness and verbal encouragement.</li>
                <li>Bring suspect to the Palace. Ring the bell. Wait approximately forever.</li>
                <li>Submit Form 41-B in triplicate. The form does not exist.</li>
                <li>Reward will be wired to an account that also does not exist.</li>
                <li>Thank you for your service to Bahamas Land. ♥</li>
              </ol>
              <div className="mt-3 text-center italic opacity-70">
                — Signed, the Office of the President. Stamp included. The stamp is also fake.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Poster({ b, idx }: { b: Bounty; idx: number }) {
  const tilt = (idx % 2 === 0 ? -1 : 1) * (0.6 + (idx % 3) * 0.4);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ scale: 1.02, rotate: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.06 }}
      className="bg-amber-50 border-4 border-amber-900/80 text-stone-900 p-4 shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
      style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}
      data-testid={`wanted-${b.id}`}
    >
      <div className="text-center text-2xl font-black tracking-[0.3em] border-y-4 border-stone-900 py-1">
        WANTED
      </div>
      <div className="text-center text-[10px] uppercase tracking-widest mt-1 mb-2 opacity-70">
        Status: <span className="font-black text-red-700">{b.status}</span>
      </div>

      <div className="aspect-square w-full bg-stone-200 border-2 border-stone-800 flex items-center justify-center overflow-hidden relative">
        {b.photo ? (
          <img
            src={b.photo}
            alt={b.alias}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(0.95) contrast(1.1) sepia(0.2)" }}
          />
        ) : (
          <div className="text-[7rem] leading-none" style={{ filter: "grayscale(0.7)" }}>
            {b.emoji}
          </div>
        )}
        {/* fake number plaque */}
        <div className="absolute bottom-1 left-1 right-1 bg-stone-900 text-amber-100 text-[10px] tracking-widest text-center py-0.5">
          BL-{(1000 + idx * 137) % 9999} ★ FRONT
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-2xl md:text-3xl font-black tracking-[0.15em]">{b.alias}</div>
        <div className="text-[11px] italic opacity-70">a.k.a. {b.realName}</div>
      </div>

      <div className="mt-3 text-[11px] leading-5">
        <div className="font-black uppercase tracking-widest">Charges:</div>
        <ul className="list-disc pl-4">
          {b.charges.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 text-[11px] leading-5 border-t border-dashed border-stone-700 pt-2">
        <div><span className="font-black">LAST SEEN:</span> {b.lastSeen}</div>
        <div className="italic opacity-80 mt-1">{b.notes}</div>
      </div>

      <div className="mt-3 bg-stone-900 text-amber-200 text-center py-2 border-2 border-amber-700">
        <div className="text-[10px] tracking-widest uppercase opacity-80">REWARD</div>
        <div className="text-2xl font-black tracking-widest">{fmtBounty(b.bounty)}</div>
      </div>
    </motion.div>
  );
}
