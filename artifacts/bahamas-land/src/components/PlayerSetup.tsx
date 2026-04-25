import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import {
  isSetupComplete,
  loginPlayer,
  registerPlayer,
  runMigrationIfNeeded,
} from "@/lib/players";
import { unlock } from "@/lib/achievements";

// =============================================================================
// PlayerSetup — first-visit modal that gates the entire app.
// Steps:
//   1. NAME       — pick a citizen name (2-24 chars).
//   2. PIN        — pick a 4-6 digit PIN that the President will use to
//                   verify it's really you next time.
//   3. CARD JOKE  — the President asks for your card number "to verify
//                   identity" (it is NEVER stored: we strip every digit
//                   client-side and the server replaces them with stars).
//   4. SUBMIT     — register with the server. If the name is taken, we
//                   switch to "login mode" and ask for the PIN.
// =============================================================================

type Step = "intro" | "name" | "pin" | "card" | "login" | "done";

export function PlayerSetup() {
  const [needSetup, setNeedSetup] = useState<boolean>(false);
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [card, setCard] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trollMsg, setTrollMsg] = useState<string | null>(null);
  const [showTrollDialog, setShowTrollDialog] = useState(false);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    runMigrationIfNeeded();
    setNeedSetup(!isSetupComplete());
  }, []);

  if (!needSetup) return null;

  const close = () => {
    setNeedSetup(false);
  };

  const goName = () => {
    setError(null);
    setStep("name");
  };

  const goPin = () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Citizen name must be at least 2 characters.");
      return;
    }
    setStep("pin");
  };

  const goCard = () => {
    setError(null);
    if (pin.replace(/\D/g, "").length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    setStep("card");
  };

  const submit = async (cardJoke?: string) => {
    setBusy(true);
    setError(null);
    const res = await registerPlayer(name.trim(), pin, cardJoke);
    setBusy(false);
    if (res.ok) {
      unlock("citizen");
      setStep("done");
      setTimeout(close, 1100);
      return;
    }
    if (res.reason === "taken") {
      setError(`The name "${name.trim()}" is already taken. Enter the PIN you set last time to log back in.`);
      setStep("login");
      return;
    }
    if (res.reason === "network") {
      setError("Could not reach the President's office. Check your connection and try again.");
      return;
    }
    setError("Something went wrong. Try a different name or PIN.");
  };

  const tryLogin = async () => {
    setBusy(true);
    setError(null);
    const res = await loginPlayer(name.trim(), pin);
    setBusy(false);
    if (res.ok) {
      setStep("done");
      setTimeout(close, 1100);
      return;
    }
    if (res.reason === "bad_pin") {
      setError("Wrong PIN. The President is suspicious.");
      return;
    }
    if (res.reason === "not_found") {
      setError("No citizen with that name. Pick a new one.");
      setStep("name");
      return;
    }
    setError("Could not log you in. Try again.");
  };

  const triggerTroll = () => {
    setTrollMsg(
      "PSYCH! The President was joking. We don't take cards. Your PIN is enough.\n\n(Anything you typed has been redacted into stars.)",
    );
    setShowTrollDialog(true);
  };

  // common card classes
  const cardWrap =
    "w-full max-w-lg bg-black border-4 border-primary p-6 md:p-8 neon-box font-mono text-primary";
  const inputCls =
    "w-full bg-black border-2 border-primary text-secondary px-4 py-3 text-lg uppercase tracking-widest focus:outline-none focus:border-secondary placeholder:text-primary/40";
  const btnPrimary =
    "px-6 py-3 bg-primary text-black font-black uppercase tracking-widest hover:bg-secondary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const btnGhost =
    "px-4 py-2 border-2 border-primary text-primary uppercase tracking-widest text-xs hover:bg-primary/10 transition-colors";

  return (
    <div
      data-testid="player-setup"
      className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      style={{ fontFamily: "monospace" }}
    >
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.25 }}
          className={cardWrap}
        >
          {/* President avatar + header */}
          <div className="flex items-center gap-4 mb-5">
            <motion.img
              src={nattounImg}
              alt=""
              className="w-16 h-16 object-cover border-2 border-secondary"
              animate={{ rotate: [0, -2, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div>
              <div className="text-xs text-secondary uppercase tracking-widest">
                Office of the President
              </div>
              <div className="text-xl md:text-2xl font-black uppercase neon-text">
                Bahamas Land Registry
              </div>
            </div>
          </div>

          {/* INTRO ----------------------------------------------------------- */}
          {step === "intro" && (
            <div className="space-y-4 text-secondary">
              <p className="text-sm leading-relaxed">
                <span className="text-primary font-black">HALT, citizen.</span> Before
                you may roam the land, the State must put you in the books.
              </p>
              <ul className="text-xs space-y-1.5 pl-4 list-disc opacity-90">
                <li>Pick a citizen name.</li>
                <li>Choose a short PIN — that's how we know it's really you.</li>
                <li>Your secrets and your coins now live in the State ledger.</li>
              </ul>
              <p className="text-[11px] uppercase tracking-widest text-primary/70 pt-2">
                ▸ All previous "citizens" have been redacted. Everyone starts at zero. ◂
              </p>
              <div className="flex justify-end pt-2">
                <button onClick={goName} className={btnPrimary} data-testid="player-setup-begin">
                  Begin Registration
                </button>
              </div>
            </div>
          )}

          {/* NAME ------------------------------------------------------------ */}
          {step === "name" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-secondary uppercase tracking-widest mb-2">
                  Citizen Name
                </label>
                <input
                  autoFocus
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^\p{L}\p{N}_\- ]/gu, "").slice(0, 24))}
                  onKeyDown={(e) => e.key === "Enter" && goPin()}
                  placeholder="e.g. M3KKY"
                  maxLength={24}
                  data-testid="player-setup-name-input"
                />
                <div className="text-[10px] text-primary/60 mt-1 uppercase tracking-widest">
                  2-24 letters/numbers. Be cool.
                </div>
              </div>
              {error && <ErrorBox text={error} />}
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setStep("intro")} className={btnGhost}>
                  ← Back
                </button>
                <button onClick={goPin} className={btnPrimary} data-testid="player-setup-name-next">
                  Next: Choose PIN →
                </button>
              </div>
            </div>
          )}

          {/* PIN ------------------------------------------------------------- */}
          {step === "pin" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-secondary uppercase tracking-widest mb-2">
                  Secret PIN (4-6 digits)
                </label>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  className={`${inputCls} text-center text-3xl tracking-[0.6em]`}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && goCard()}
                  placeholder="••••"
                  maxLength={6}
                  data-testid="player-setup-pin-input"
                />
                <div className="text-[10px] text-primary/60 mt-1 uppercase tracking-widest">
                  Don't forget it. The President never forgets.
                </div>
              </div>
              {error && <ErrorBox text={error} />}
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setStep("name")} className={btnGhost}>
                  ← Back
                </button>
                <button onClick={goCard} className={btnPrimary} data-testid="player-setup-pin-next">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* CARD (THE TROLL) ----------------------------------------------- */}
          {step === "card" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-secondary/60 p-3 text-secondary text-xs leading-relaxed">
                <div className="text-primary font-black uppercase tracking-widest mb-1">
                  Optional Verification
                </div>
                The President says: <em>"You can put your card number too if you want.
                Just to be sure it's really you. Trust me."</em>
              </div>
              <div>
                <label className="block text-xs text-secondary uppercase tracking-widest mb-2">
                  Card Number (Optional, NOT recommended)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${inputCls} tracking-widest`}
                  value={card}
                  onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))}
                  placeholder="•••• •••• •••• ••••"
                  maxLength={19}
                  data-testid="player-setup-card-input"
                />
                <div className="text-[10px] text-primary/60 mt-1 uppercase tracking-widest">
                  Anything you type is replaced with stars. We never see the digits.
                </div>
              </div>
              {error && <ErrorBox text={error} />}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2">
                <button onClick={() => setStep("pin")} className={btnGhost}>
                  ← Back
                </button>
                <div className="flex gap-2 justify-end flex-wrap">
                  <button
                    onClick={() => submit()}
                    disabled={busy}
                    className={btnGhost}
                    data-testid="player-setup-skip-card"
                  >
                    Skip — I'm not falling for that
                  </button>
                  <button
                    onClick={() => {
                      if (card.replace(/\D/g, "").length > 0) {
                        triggerTroll();
                      } else {
                        submit();
                      }
                    }}
                    disabled={busy}
                    className={btnPrimary}
                    data-testid="player-setup-submit"
                  >
                    {busy ? "Registering…" : "Become a Citizen"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN MODE ------------------------------------------------------ */}
          {step === "login" && (
            <div className="space-y-4">
              <div className="text-secondary text-sm">
                The name <span className="text-primary font-black">{name}</span> is
                already registered. Enter your PIN to claim it.
              </div>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                className={`${inputCls} text-center text-3xl tracking-[0.6em]`}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && tryLogin()}
                placeholder="••••"
                maxLength={6}
                data-testid="player-login-pin-input"
              />
              {error && <ErrorBox text={error} />}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    setStep("name");
                    setError(null);
                  }}
                  className={btnGhost}
                >
                  ← Use a different name
                </button>
                <button
                  onClick={tryLogin}
                  disabled={busy}
                  className={btnPrimary}
                  data-testid="player-login-submit"
                >
                  {busy ? "Verifying…" : "Log In"}
                </button>
              </div>
            </div>
          )}

          {/* DONE ------------------------------------------------------------ */}
          {step === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-3 py-4"
            >
              <div className="text-3xl font-black neon-text">✅ CITIZEN ON RECORD</div>
              <div className="text-sm text-secondary">
                Welcome to Bahamas Land,{" "}
                <span className="text-primary font-black">{name.trim()}</span>.
              </div>
              <div className="text-xs text-primary/70 uppercase tracking-widest">
                Loading the map…
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* TROLL DIALOG */}
      <AnimatePresence>
        {showTrollDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowTrollDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.7 }}
              transition={{ type: "spring", stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md bg-yellow-300 border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
            >
              <div className="text-2xl font-black uppercase tracking-widest text-black mb-3">
                😂 GOTCHA
              </div>
              <p className="text-black font-mono text-sm leading-relaxed whitespace-pre-line">
                {trollMsg}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  className="px-5 py-2 bg-black text-yellow-300 font-black uppercase tracking-widest hover:bg-zinc-800"
                  onClick={() => {
                    setShowTrollDialog(false);
                    setCard("");
                    submit();
                  }}
                  data-testid="player-troll-continue"
                >
                  Fine, just register me →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="border-2 border-red-500 bg-red-500/10 text-red-300 px-3 py-2 text-xs font-mono">
      {text}
    </div>
  );
}
