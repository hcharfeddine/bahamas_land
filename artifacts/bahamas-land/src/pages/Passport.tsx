import { Layout } from "@/components/Layout";
import { useUsername, useCoins, useVerdicts, useMuseum, useApplause, useSecretVisitors, useFirstVisit } from "@/lib/store";
import { motion } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { Stamp, ShieldAlert } from "lucide-react";

function rank(coins: number, verdicts: number, applause: number) {
  const score = coins / 100 + verdicts * 5 + applause * 0.5;
  if (score < 5) return "TOURIST";
  if (score < 25) return "RESIDENT";
  if (score < 75) return "OG";
  if (score < 200) return "MINISTER OF MID";
  return "PROTECTED CLASS";
}

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "??/??/????";
  }
}

export default function Passport() {
  const [username] = useUsername();
  const [coins] = useCoins();
  const [verdicts] = useVerdicts();
  const [museum] = useMuseum();
  const [applause] = useApplause();
  const [secretVisitors] = useSecretVisitors();
  const [firstVisit] = useFirstVisit();

  const lastVerdict = verdicts.length > 0 ? verdicts[verdicts.length - 1] : null;
  const citizenRank = rank(coins, verdicts.length, applause);
  const idNumber = (username || "GHOST").toUpperCase().padEnd(6, "X").slice(0, 6) + "-" +
    String(Math.abs((username || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 31)).slice(0, 4);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] py-8">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ duration: 0.6 }}
          className="w-full bg-gradient-to-br from-secondary/10 to-primary/10 border-4 border-double border-secondary p-1 neon-box-cyan"
        >
          <div className="bg-black/90 border border-secondary/50 p-6 md:p-10 relative overflow-hidden">
            
            {/* Background watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <img src={nattounImg} alt="" className="w-2/3 object-contain" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start border-b-2 border-secondary pb-4 mb-6">
              <div>
                <div className="text-[10px] uppercase text-secondary/70 font-mono tracking-widest">Republic of</div>
                <h1 className="text-2xl md:text-4xl font-black text-secondary uppercase tracking-widest" style={{ textShadow: "0 0 8px hsl(var(--secondary))" }}>
                  Bahamas Land
                </h1>
                <div className="text-xs text-primary uppercase font-mono mt-1">Official Citizen Passport</div>
              </div>
              <div className="text-right text-[10px] font-mono text-secondary/70 uppercase">
                <div>Issued by</div>
                <div className="text-primary">President Nattoun</div>
                <div className="mt-2">No. {idNumber}</div>
              </div>
            </div>

            {/* Body grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo */}
              <div className="md:col-span-1 flex flex-col items-center">
                <div className="w-full aspect-square border-2 border-secondary bg-black/60 p-2 relative">
                  <img src={nattounImg} alt="Citizen" className="w-full h-full object-cover grayscale contrast-125" style={{ filter: "grayscale(100%) contrast(1.25) brightness(0.9)" }} />
                  <div className="absolute bottom-1 left-1 right-1 text-[9px] font-mono text-secondary bg-black/70 px-1 text-center">
                    PHOTO LOST IN COURT
                  </div>
                </div>
                <div className="mt-3 w-full text-center">
                  <div className="text-[10px] uppercase text-secondary/70 font-mono">Rank</div>
                  <div className="text-primary font-black uppercase tracking-widest text-sm" style={{ textShadow: "0 0 6px hsl(var(--primary))" }}>
                    {citizenRank}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="md:col-span-2 space-y-3 font-mono text-sm">
                <Field label="Name" value={username || "UNKNOWN ENTITY"} />
                <Field label="Date of Citizenship" value={formatDate(firstVisit)} />
                <Field label="Nattoun Coin Balance" value={`${coins} NC`} />
                <Field label="Verdicts Received" value={String(verdicts.length)} />
                <Field label="Museum Contributions" value={String(museum.length)} />
                <Field label="Applauses Given" value={String(applause)} />
                <Field label="Secret Area Found" value={secretVisitors > 0 ? "YES (suspicious)" : "NO"} />
                <Field label="Last Verdict" value={lastVerdict ? lastVerdict.verdict : "Never been judged. Yet."} />
              </div>
            </div>

            {/* Stamps */}
            <div className="relative z-10 mt-8 pt-6 border-t-2 border-dashed border-primary/50 flex flex-wrap items-center justify-around gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: -12 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="border-4 border-primary text-primary px-4 py-2 uppercase font-black tracking-widest text-xs flex items-center gap-2"
                style={{ textShadow: "0 0 6px hsl(var(--primary))", boxShadow: "0 0 12px hsl(var(--primary)/0.5)" }}
              >
                <Stamp className="w-4 h-4" />
                Approved by Nattoun
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 7 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="border-4 border-secondary text-secondary px-4 py-2 uppercase font-black tracking-widest text-xs flex items-center gap-2"
                style={{ textShadow: "0 0 6px hsl(var(--secondary))" }}
              >
                <ShieldAlert className="w-4 h-4" />
                Subject to Random Audits
              </motion.div>
            </div>

            {/* Footer */}
            <div className="relative z-10 mt-6 text-[10px] uppercase font-mono text-secondary/60 text-center tracking-widest">
              This document is non-transferable, non-refundable, and possibly non-real.
            </div>
          </div>
        </motion.div>

        <div className="mt-6 text-center text-xs font-mono text-primary/60 uppercase">
          Take a screenshot. Brag responsibly.
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline border-b border-secondary/20 pb-1 gap-3">
      <span className="text-secondary/70 uppercase text-[10px] tracking-widest shrink-0">{label}</span>
      <span className="text-primary text-right uppercase truncate">{value}</span>
    </div>
  );
}
