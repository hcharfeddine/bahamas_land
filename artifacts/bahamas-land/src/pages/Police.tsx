import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { audio } from "@/lib/audio";
import { useCoins } from "@/lib/store";

const TROLL_LINES = [
  "Nothing to do here.",
  "We built it because we could. That is the whole point.",
  "There is no police force. There never was.",
  "If you came to report something, congratulations: it has been ignored.",
  "Officer? No. We are out of officers. We are out of officers permanently.",
  "This building exists for the skyline. Please leave.",
  "Press charges? Against who? The dog? Be serious.",
  "Lost something? You probably gave it to the Bank already.",
];

const SUB_LINES = [
  "Bahamas Land Police Department est. 5 minutes ago.",
  "Officially closed. Officially still on payroll.",
  "Active cases: 0. Solved cases: 0. Vibes: maximum.",
  "The dog is the chief of police. The dog is asleep.",
];

const FAKE_REPORTS = [
  "Citizen reports own NC missing. Suspect: themselves.",
  "Loud barking near the Palace. Investigation: declined.",
  "Baskouta theft (again). Filed under 'tradition'.",
  "Someone typed 'mid' in chat. Already handled by EXILE.",
  "Reported stream lag. Reroute: M3kky's fault.",
  "Suspicious citizen named [you]. We are watching.",
];

export default function Police() {
  const [, setLocation] = useLocation();
  const [coins, setCoins] = useCoins();
  const [trollIdx, setTrollIdx] = useState(0);
  const [reportIdx, setReportIdx] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [snackTaken, setSnackTaken] = useState(false);
  const [reportFlash, setReportFlash] = useState<string | null>(null);

  // Rotate the lines so the troll never stops trolling.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTrollIdx((i) => (i + 1) % TROLL_LINES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setReportIdx((i) => (i + 1) % FAKE_REPORTS.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const fileReport = () => {
    setTickets((t) => t + 1);
    const line = FAKE_REPORTS[Math.floor(Math.random() * FAKE_REPORTS.length)];
    setReportFlash(line);
    audio.playGlitch();
    window.setTimeout(() => setReportFlash(null), 2600);
  };

  // The "donation jar" — clicking it costs 1 NC and the President pockets it.
  const tipTheDog = () => {
    if (coins < 1) {
      setReportFlash("You don't even have 1 NC. Pathetic.");
      window.setTimeout(() => setReportFlash(null), 2600);
      audio.playGlitch();
      return;
    }
    setCoins((c) => c - 1);
    audio.playCoin();
    setReportFlash("THANK YOU FOR YOUR CONTRIBUTION TO NOTHING.");
    window.setTimeout(() => setReportFlash(null), 2600);
  };

  const eatTheSnack = () => {
    if (snackTaken) {
      setReportFlash("The snack is gone. You ate it. Move on.");
      window.setTimeout(() => setReportFlash(null), 2200);
      return;
    }
    setSnackTaken(true);
    setReportFlash("You ate the only piece of evidence. Nice work.");
    audio.playBlip();
    window.setTimeout(() => setReportFlash(null), 2600);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <Shield
            className="w-14 h-14 mx-auto text-blue-400"
            style={{ filter: "drop-shadow(0 0 10px hsl(210 100% 60%))" }}
          />
          <h1
            className="text-3xl md:text-5xl font-black uppercase tracking-widest text-blue-400"
            style={{ textShadow: "0 0 12px hsl(210 100% 60%)" }}
          >
            Police Station
          </h1>
          <p className="text-secondary font-mono text-xs uppercase tracking-widest opacity-80">
            Bahamas Land Department of Vibes & Enforcement
          </p>
        </motion.div>

        {/* Big sign */}
        <div className="border-4 border-blue-500 bg-black/85 p-6 text-center font-mono uppercase relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(210 100% 60% / 0.15) 0 8px, transparent 8px 18px)",
            }}
          />
          <div className="relative">
            <div className="text-yellow-400 font-black text-xs tracking-widest mb-2 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" /> OFFICIAL SIGN <AlertTriangle className="w-4 h-4" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={trollIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-blue-300 text-lg md:text-2xl font-black tracking-wider"
              >
                "{TROLL_LINES[trollIdx]}"
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 text-[10px] text-white/50 tracking-widest">
              {SUB_LINES[trollIdx % SUB_LINES.length]}
            </div>
          </div>
        </div>

        {/* Nattoun saying it bluntly */}
        <div className="flex items-center gap-4 bg-black/70 border-2 border-secondary p-4 neon-box-cyan">
          <img
            src={nattounImg}
            alt="Nattoun"
            data-nattoun="true"
            className="w-16 h-16 object-cover border-2 border-secondary rounded-full"
          />
          <div className="font-mono text-secondary text-sm leading-snug">
            "We built this building because we could. That is the only reason.
            There are no laws. There are no officers. There is only me. And the dog.
            You may now leave."
          </div>
        </div>

        {/* Useless interactive toys */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={fileReport}
            className="bg-black/70 border-2 border-blue-500 p-4 text-blue-300 font-mono uppercase text-xs tracking-widest text-left clickable hover:bg-blue-500/10"
          >
            <div className="font-black mb-1">📎 File a Report</div>
            <div className="text-white/60 normal-case">
              Filed: {tickets}. Resolved: 0. None of them mattered.
            </div>
          </button>
          <button
            onClick={tipTheDog}
            className="bg-black/70 border-2 border-yellow-500 p-4 text-yellow-300 font-mono uppercase text-xs tracking-widest text-left clickable hover:bg-yellow-500/10"
          >
            <div className="font-black mb-1">🪙 Tip the Dog (-1 NC)</div>
            <div className="text-white/60 normal-case">
              Donations go straight to Nattoun's pocket. Allegedly.
            </div>
          </button>
          <button
            onClick={eatTheSnack}
            className="bg-black/70 border-2 border-pink-500 p-4 text-pink-300 font-mono uppercase text-xs tracking-widest text-left clickable hover:bg-pink-500/10"
          >
            <div className="font-black mb-1">🍞 {snackTaken ? "(eaten)" : "Snack on Desk"}</div>
            <div className="text-white/60 normal-case">
              {snackTaken
                ? "You ate it. There is nothing left."
                : "It is unclear if this is evidence."}
            </div>
          </button>
        </div>

        {/* Live "incident report" feed */}
        <div className="bg-black/70 border-2 border-blue-500 p-4 font-mono text-xs">
          <div className="text-blue-400 font-black uppercase tracking-widest mb-2">
            ▌ Active Incident Feed
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={reportIdx}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="text-white/80"
            >
              → {FAKE_REPORTS[reportIdx]}
            </motion.div>
          </AnimatePresence>
          <div className="mt-2 text-[10px] text-white/40 uppercase tracking-widest">
            Status: nobody is responding. Nobody ever will.
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {reportFlash && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black border-2 border-blue-500 px-4 py-2 font-mono uppercase text-xs text-blue-300 tracking-widest neon-box-cyan max-w-[90%] text-center"
            >
              {reportFlash}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Way out */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => setLocation("/world")}
            className="bg-transparent border-2 border-blue-500 text-blue-300 hover:bg-blue-500 hover:text-black uppercase font-bold tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Leave Quietly
          </Button>
        </div>

        <p className="text-center text-[10px] font-mono uppercase text-white/40 tracking-widest pt-4">
          Reminder from the President: this building is decoration. Stop coming back.
        </p>
      </div>
    </Layout>
  );
}
