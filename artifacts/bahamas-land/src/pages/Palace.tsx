import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useUsername, useApplause, useTomatoes, useBoos, useCoins } from "@/lib/store";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { Castle, Star, Camera, Sparkles, Crown, Megaphone } from "lucide-react";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";

const NATTOUN_BOO_COMMENTS = [
  "Booed your president? I just emptied your wallet AND your trophy case. Equal trade, citizen.",
  "Cute. The button is bait. Welcome to ZERO NC and zero achievements, [username].",
  "Bold of you, [username]. The palace just confiscated everything. Try not to cry on camera.",
  "You pressed BOO. I pressed DELETE. Now we are even.",
  "Achievements? Money? Gone. Consider it a tax on bad opinions, citizen.",
  "Imagine booing the GOAT. Couldn't be me. Anyway, you're broke now.",
  "L + ratio + you fell off + your bank is empty + the buttons are off. Goodnight.",
];

const NATTOUN_TOMATO_COMMENTS = [
  "Missed. Ninja training since age 2, [username].",
  "You threw 1 tomato. I dodged 1 tomato. Also I took ALL your NC. Math is math.",
  "Skill issue. Also your wallet is empty now. Don't check.",
  "Tomato? In MY palace? *teleports behind you* Nothing personal, [username].",
  "Cute throw. The label said -1 NC. The fine print said -EVERYTHING. Read next time.",
  "Bahamas Land's #1 dodger, baby. And your bank account just hit rock bottom.",
  "You blinked. I moved. Your coins evaporated. Standard Tuesday.",
];

// ---------------------------------------------------------------
// SPEECHES — way more troll, meme & lore content
// ---------------------------------------------------------------
const SPEECHES = [
  "Everything is under control.",
  "Nothing is under control.",
  "We have never lost a war. We have also never been in a war.",
  "The economy is doing exceptionally well. (it isn't.)",
  "[username], you are my favorite citizen. (not really.)",
  "Please stop emailing the palace.",
  "Bahamas Land is the largest country in the world (by vibes).",
  "We do not negotiate with citizens who say 'erm actually'.",
  "The national bird is whatever I point at.",
  "I have read your DMs, [username]. Disappointing.",
  "Today's weather forecast: chosen by me.",
  "Inflation is, in fact, deflation if you squint.",
  "We outlawed Mondays. You're welcome.",
  "The Wheel was rigged. By me. On purpose.",
  "I single-handedly invented the word 'mid'. No further questions.",
  "M3KKY is on Kick. That's a state-level decree.",
  "Touching grass is forbidden until further notice.",
  "We've added two new colors to the flag overnight.",
  "If you can read this, you owe the palace 5 NattounCoin.",
  "Skill issue is now a constitutional offense.",
  "The court is in session. (it isn't. I'm on lunch.)",
  "Citizen [username] has been promoted to Vice-Mid.",
  "All complaints will be filed under 'L + ratio + you fell off'.",
  "We are negotiating peace with the comments section.",
  "Tomorrow is cancelled. Try again Friday.",
  "The Vault has 0 coins. Don't check.",
  "Anyone caught typing 'first' in chat will be exiled.",
  "Bahamas Land just won the World Cup. (we did not enter.)",
  "We have decided that pineapple does belong on pizza. Disagree → exile.",
  "AFK citizens will be drafted into the Palace Guard.",
  "Reminder: applauding is mandatory. Booing is also mandatory. Pick one.",
  "The president cannot lose. The president can only run out of time.",
  "Treason is when you scroll past my speech.",
  "I have personally banned the number 7. It was being too smug.",
];

// Quick "breaking news" tickers shown along the bottom
const TICKERS = [
  "🚨 BREAKING: Palace runs out of milk. Crisis declared.",
  "🚨 BREAKING: Citizen [username] caught yawning during decree.",
  "🚨 BREAKING: Approval rating mysteriously redefined.",
  "🚨 BREAKING: M3KKY went live. Roads closed in celebration.",
  "🚨 BREAKING: A pigeon entered the throne room. It is now Minister of Defense.",
  "🚨 BREAKING: Court of OGs found guilty of being too based.",
  "🚨 BREAKING: Tomato shortage after viral 'throw tomato' trend.",
  "🚨 BREAKING: Wheel of Fate audited. Result: still rigged.",
  "🚨 BREAKING: National anthem replaced with the rickroll. Again.",
  "🚨 BREAKING: Bahamas Land annexes the comments section.",
];

// Random crowd noises shown as floating chat bubbles
const CROWD_REACTIONS = [
  "BASED!",
  "MID 📉",
  "W president",
  "L take 💀",
  "fr fr",
  "🦅🦅🦅",
  "ratio + you fell off",
  "this you?",
  "nattoun supremacy",
  "average bahamas land enjoyer",
  "🍅🍅🍅",
  "👏👏👏",
  "REAL",
  "delusional ngl",
  "10/10 speech king",
  "boooo 🔉",
  "common nattoun W",
  "skill issue",
  "🇧🇸🇧🇸🇧🇸",
  "let him cook",
  "buddy thinks he's the protagonist",
  "GOATED",
  "🎤 mic drop",
  "siuuu",
];

const TROLL_BANNERS = [
  { text: "PRESIDENT IS LIVE", color: "#22c55e" },
  { text: "DECREE INCOMING", color: "#facc15" },
  { text: "CENSORED BY ORDER OF NATTOUN", color: "#ef4444" },
  { text: "APPLAUSE REQUIRED", color: "#06b6d4" },
  { text: "DO NOT BOO THE PRESIDENT", color: "#ef4444" },
  { text: "FREE TOMATOES IN THE LOBBY", color: "#f97316" },
];

type FloatingReaction = { id: number; text: string; x: number; emoji?: boolean };
type Tomato = { id: number; x: number; y: number; rot: number };

export default function Palace() {
  const [username] = useUsername();
  const [speechIndex, setSpeechIndex] = useState(0);
  const [applause, setApplause] = useApplause();
  const [tomatoes, setTomatoes] = useTomatoes();
  const [boos, setBoos] = useBoos();
  const [, setCoins] = useCoins();

  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [splats, setSplats] = useState<Tomato[]>([]);
  const [paparazziFlash, setPaparazziFlash] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState<number | null>(null);
  const [approvalRating, setApprovalRating] = useState(72);
  const [crownMode, setCrownMode] = useState(false);
  const [decreePopup, setDecreePopup] = useState<string | null>(null);
  const [megaCheers, setMegaCheers] = useState(false);

  const reactionId = useRef(0);
  const tomatoId = useRef(0);

  // Troll button state: once the user falls for BOO, both buttons are dead.
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  // Speech bubble Nattoun fires back at the user after a troll click.
  const [nattounComment, setNattounComment] = useState<string | null>(null);
  const commentTimeoutRef = useRef<number | null>(null);
  // Animation controls so Nattoun can ninja-dodge incoming tomatoes.
  const dodgeControls = useAnimation();

  const currentSpeech = useMemo(
    () => SPEECHES[speechIndex].replace("[username]", username || "Citizen"),
    [speechIndex, username]
  );

  const currentTicker = useMemo(
    () => TICKERS[tickerIndex].replace("[username]", username || "Citizen"),
    [tickerIndex, username]
  );

  // ============================================================
  // Speech rotation
  // ============================================================
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSpeechIndex((prev) => (prev + 1) % SPEECHES.length);
    }, 5500);
    return () => window.clearInterval(interval);
  }, []);

  // ============================================================
  // Ticker rotation
  // ============================================================
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKERS.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, []);

  // ============================================================
  // Random ambient crowd reactions (continuous background activity)
  // ============================================================
  const pushReaction = useCallback((text?: string) => {
    const t = text ?? CROWD_REACTIONS[Math.floor(Math.random() * CROWD_REACTIONS.length)];
    const id = ++reactionId.current;
    const x = 5 + Math.random() * 90;
    setReactions((r) => [...r, { id, text: t, x }]);
    window.setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => {
        if (document.hidden) return;
        pushReaction();
      },
      900 + Math.random() * 1100
    );
    return () => window.clearInterval(interval);
  }, [pushReaction]);

  // ============================================================
  // Random paparazzi flashes
  // ============================================================
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) {
        setPaparazziFlash(true);
        window.setTimeout(() => setPaparazziFlash(false), 180);
      }
    };
    const interval = window.setInterval(tick, 4500 + Math.random() * 4500);
    return () => window.clearInterval(interval);
  }, []);

  // ============================================================
  // Approval rating drifts randomly (troll meter)
  // ============================================================
  useEffect(() => {
    const interval = window.setInterval(() => {
      setApprovalRating((prev) => {
        const drift = Math.round((Math.random() - 0.45) * 8);
        return Math.max(3, Math.min(99, prev + drift));
      });
    }, 2200);
    return () => window.clearInterval(interval);
  }, []);

  // ============================================================
  // Random troll banners drop in occasionally
  // ============================================================
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      const idx = Math.floor(Math.random() * TROLL_BANNERS.length);
      setBannerIndex(idx);
      window.setTimeout(() => setBannerIndex(null), 2600);
    };
    const interval = window.setInterval(tick, 9500 + Math.random() * 6000);
    return () => window.clearInterval(interval);
  }, []);

  // ============================================================
  // Random "DECREE" popups (silly fake laws)
  // ============================================================
  useEffect(() => {
    const DECREES = [
      "DECREE #404: Looking sad on a Sunday is now illegal.",
      "DECREE #777: Every citizen owes the palace one (1) compliment.",
      "DECREE #123: Cats now outrank generals.",
      "DECREE #069: 'Nice' is a banned word in formal speech.",
      "DECREE #999: All sneezes must be approved in writing.",
      "DECREE #001: Naming a child 'Brayden' is a fineable offense.",
      "DECREE #042: The answer to everything is now 'mid'.",
    ];
    const tick = () => {
      if (document.hidden) return;
      setDecreePopup(DECREES[Math.floor(Math.random() * DECREES.length)]);
      audio.playGlitch();
      window.setTimeout(() => setDecreePopup(null), 4500);
    };
    const interval = window.setInterval(tick, 18000 + Math.random() * 12000);
    return () => window.clearInterval(interval);
  }, []);

  // ============================================================
  // Konami-ish: K toggles crown mode
  // ============================================================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "k" || e.key === "K") {
        setCrownMode((c) => !c);
        audio.playBlip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ============================================================
  // Actions
  // ============================================================
  // Show a Nattoun speech-bubble comment for ~5 seconds.
  const sayNattoun = useCallback(
    (line: string) => {
      const filled = line.replace("[username]", username || "Citizen");
      setNattounComment(filled);
      if (commentTimeoutRef.current) {
        window.clearTimeout(commentTimeoutRef.current);
      }
      commentTimeoutRef.current = window.setTimeout(() => {
        setNattounComment(null);
        commentTimeoutRef.current = null;
      }, 5200);
    },
    [username]
  );

  useEffect(() => {
    return () => {
      if (commentTimeoutRef.current) {
        window.clearTimeout(commentTimeoutRef.current);
      }
    };
  }, []);

  const handleApplaud = () => {
    if (buttonsDisabled) return;
    setApplause((a: number) => a + 1);
    setApprovalRating((r) => Math.min(99, r + 1));
    audio.playBlip();
    pushReaction("👏👏👏");
    if (((applause + 1) % 25) === 0) {
      setMegaCheers(true);
      window.setTimeout(() => setMegaCheers(false), 2200);
      unlock("loyal");
    }
  };

  // TROLL BOO — bait button. Pretends to do nothing visible, but actually
  // wipes ALL the user's NC, ALL their easter-egg achievements, and disables
  // both palace buttons forever (this session). Nattoun then taunts them.
  const handleBoo = () => {
    if (buttonsDisabled) return;
    setButtonsDisabled(true);
    setCoins(() => 0);
    try {
      window.localStorage.removeItem("ogs_achievements");
      window.dispatchEvent(new CustomEvent("achievement-change"));
      window.dispatchEvent(new Event("local-storage"));
    } catch {
      /* ignore */
    }
    audio.playGlitch();
    sayNattoun(
      NATTOUN_BOO_COMMENTS[Math.floor(Math.random() * NATTOUN_BOO_COMMENTS.length)]
    );
  };

  // Core throw: deducts EXACTLY 1 NC, adds a splat at the given percentage
  // coordinates (0-100) inside the image wrapper. If no coords given, picks
  // a random spot ON the image so the tomato actually lands.
  const fireTomato = (atXPct?: number, atYPct?: number) => {
    setCoins((c) => {
      if (c < 1) return c; // not enough NC, refuse
      const id = ++tomatoId.current;
      const x = atXPct ?? 30 + Math.random() * 40;
      const y = atYPct ?? 30 + Math.random() * 40;
      setSplats((s) => [...s, { id, x, y, rot: Math.random() * 360 }]);
      setTomatoes((t: number) => t + 1);
      setApprovalRating((r) => Math.max(3, r - 3));
      audio.playGlitch();
      pushReaction("🍅 SPLAT");
      window.setTimeout(
        () => setSplats((s) => s.filter((sp) => sp.id !== id)),
        4500
      );
      return c - 1; // exactly -1 NC, atomically
    });
    if (tomatoes + 1 >= 10) unlock("bonker");
  };

  // Click directly on the image: throw at the click point (in % of image size)
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      fireTomato();
      return;
    }
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    fireTomato(
      Math.max(0, Math.min(100, x)),
      Math.max(0, Math.min(100, y))
    );
  };

  // TROLL TOMATO — the button advertises "-1 NC", but actually drains the
  // ENTIRE wallet and the President ninja-dodges so no splat ever lands.
  // No tomato counter increment. Nattoun then taunts the user.
  const handleButtonThrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonsDisabled) return;
    setCoins(() => 0);
    setApprovalRating((r) => Math.max(3, r - 1));
    audio.playGlitch();
    pushReaction("💨 DODGED");
    // Ninja-dodge animation: zip aside, then back.
    dodgeControls.start({
      x: [0, -140, 130, -40, 0],
      y: [0, -30, -10, 0, 0],
      rotate: [0, -10, 8, -3, 0],
      transition: { duration: 0.55, ease: "easeOut" },
    });
    sayNattoun(
      NATTOUN_TOMATO_COMMENTS[
        Math.floor(Math.random() * NATTOUN_TOMATO_COMMENTS.length)
      ]
    );
  };

  const ratingColor =
    approvalRating > 70 ? "text-green-400" : approvalRating > 35 ? "text-yellow-400" : "text-red-400";
  const ratingBg =
    approvalRating > 70 ? "bg-green-400" : approvalRating > 35 ? "bg-yellow-400" : "bg-red-400";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] relative">
        {/* Paparazzi flash */}
        <AnimatePresence>
          {paparazziFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[60] bg-white pointer-events-none mix-blend-screen"
            />
          )}
        </AnimatePresence>

        {/* Approval rating header */}
        <div className="w-full max-w-2xl mb-6 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
            <span className="text-primary/70 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> APPROVAL RATING
            </span>
            <span className={`${ratingColor} font-bold`}>{approvalRating}%</span>
          </div>
          <div className="w-full h-2 bg-black/70 border border-primary/30 overflow-hidden">
            <motion.div
              className={`h-full ${ratingBg}`}
              animate={{ width: `${approvalRating}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono uppercase text-primary/40">
            <span>👏 Applause: {applause}</span>
            <span>📢 Boos: {boos}</span>
            <span>🍅 Tomatoes: {tomatoes}</span>
          </div>
        </div>

        {/* Stage / Environment */}
        <div className="relative w-full max-w-2xl aspect-[4/3] flex flex-col items-center justify-end overflow-hidden border-b-4 border-primary rounded-t-[50%] bg-gradient-to-t from-primary/20 to-transparent">
          {/* Spotlight sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(255,255,180,0.25), transparent 40%)",
            }}
            animate={{ x: ["-20%", "20%", "-20%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Red carpet glow */}
          <div className="absolute bottom-0 w-3/4 h-1/2 bg-primary/20 blur-3xl rounded-full" />

          {/* Floating crowd reactions */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ y: "90%", x: `${r.x}%`, opacity: 0, scale: 0.8 }}
                  animate={{ y: "5%", opacity: [0, 1, 1, 0], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 4, ease: "easeOut" }}
                  className="absolute font-mono uppercase text-[11px] tracking-widest text-secondary/90 bg-black/70 border border-secondary/40 px-2 py-0.5 rounded-sm whitespace-nowrap"
                >
                  {r.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Teleprompter */}
          <motion.div
            key={speechIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-6 w-[88%] md:w-3/4 bg-black/80 border-2 border-secondary p-4 text-center neon-box-cyan rounded-lg z-20"
          >
            <p className="text-secondary font-serif text-base md:text-2xl italic break-words">
              "{currentSpeech}"
            </p>
          </motion.div>

          {/* Crown when crown mode */}
          <AnimatePresence>
            {crownMode && (
              <motion.div
                initial={{ y: -40, opacity: 0, scale: 0.6 }}
                animate={{ y: -10, opacity: 1, scale: 1 }}
                exit={{ y: -40, opacity: 0 }}
                className="absolute top-1/3 z-20 text-5xl md:text-7xl drop-shadow-[0_0_20px_gold]"
              >
                👑
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nattoun image — also the tomato target.
              Outer wrapper handles ninja-dodge animation (triggered by the
              troll Throw Tomato button). Inner wrapper handles the idle bob. */}
          <motion.div
            className="relative z-10 w-1/2 max-w-[300px]"
            animate={dodgeControls}
          >
          {/* Speech bubble — Nattoun's troll comeback after a button click. */}
          <AnimatePresence>
            {nattounComment && (
              <motion.div
                key={nattounComment}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 -translate-y-full z-30 w-[260px] md:w-[320px] bg-black/90 border-2 border-yellow-400 text-yellow-300 font-mono text-[11px] md:text-xs uppercase tracking-wider p-2 rounded-md shadow-[0_0_18px_rgba(250,204,21,0.55)]"
                data-testid="text-nattoun-comment"
              >
                <div className="text-[9px] text-yellow-400/80 mb-1">
                  👑 PRESIDENT NATTOUN SAYS
                </div>
                {nattounComment}
                <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-3 h-3 rotate-45 bg-black border-r-2 border-b-2 border-yellow-400" />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            className="relative cursor-crosshair w-full"
            onClick={handleImageClick}
            title="Click to throw a tomato (-1 NC)"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <img
              src={nattounImg}
              data-nattoun="true"
              alt="President Nattoun"
              className="w-full h-auto object-cover drop-shadow-[0_0_30px_hsl(var(--primary))] pointer-events-none select-none"
              draggable={false}
            />

            {/* Tomato splats — positioned by % of the wrapper, so they stay
                attached to the President even as he bobs up and down. */}
            <AnimatePresence>
              {splats.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 3, opacity: 0, rotate: 0 }}
                  animate={{ scale: 1, opacity: 1, rotate: s.rot }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="absolute pointer-events-none text-3xl select-none"
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: "translate(-50%, -50%)",
                    filter: "drop-shadow(0 0 6px rgba(220,38,38,0.8))",
                  }}
                >
                  🍅
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          </motion.div>

          {/* Podium */}
          <div className="w-2/3 h-16 bg-black border-t-2 border-x-2 border-primary relative z-20 flex items-center justify-center">
            <Castle className="text-primary w-8 h-8 opacity-50" />
          </div>

          {/* Mega cheers overlay */}
          <AnimatePresence>
            {megaCheers && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
              >
                <div className="text-5xl md:text-7xl font-black text-secondary uppercase tracking-widest neon-text-cyan">
                  STANDING OVATION!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ticker */}
        <div className="w-full max-w-2xl mt-4 border border-primary/40 bg-black/70 overflow-hidden">
          <motion.div
            key={tickerIndex}
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{ duration: 14, ease: "linear" }}
            className="font-mono text-xs uppercase tracking-widest text-yellow-400 py-1 whitespace-nowrap"
          >
            {currentTicker} &nbsp;&nbsp;&nbsp; {currentTicker}
          </motion.div>
        </div>

        {/* Banners */}
        <AnimatePresence>
          {bannerIndex !== null && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: "spring", damping: 18 }}
              className="fixed top-2 left-1/2 -translate-x-1/2 z-[55] font-black uppercase tracking-widest text-sm md:text-base px-6 py-2 border-2 shadow-2xl"
              style={{
                color: TROLL_BANNERS[bannerIndex].color,
                borderColor: TROLL_BANNERS[bannerIndex].color,
                background: "rgba(0,0,0,0.85)",
                textShadow: `0 0 12px ${TROLL_BANNERS[bannerIndex].color}`,
              }}
            >
              <Megaphone className="w-4 h-4 inline mr-2" />
              {TROLL_BANNERS[bannerIndex].text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Random decree popup */}
        <AnimatePresence>
          {decreePopup && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="fixed bottom-24 right-4 z-[55] max-w-xs bg-black/90 border-2 border-yellow-400 text-yellow-400 font-mono text-xs uppercase tracking-widest p-3 shadow-[0_0_18px_rgba(250,204,21,0.5)]"
            >
              <div className="flex items-center gap-1 text-[9px] mb-1 text-yellow-300">
                <Crown className="w-3 h-3" /> NEW DECREE
              </div>
              {decreePopup}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-8 text-center space-y-3 w-full max-w-2xl">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleApplaud}
              className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold uppercase tracking-widest px-8 py-5 text-base group"
            >
              <Star className="w-5 h-5 mr-2 group-hover:fill-black" />
              Applaud
            </Button>
            <Button
              onClick={handleBoo}
              disabled={buttonsDisabled}
              data-testid="button-boo"
              className="bg-transparent border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold uppercase tracking-widest px-8 py-5 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-yellow-400"
            >
              📢 Boo
            </Button>
            <Button
              onClick={handleButtonThrow}
              disabled={buttonsDisabled}
              data-testid="button-throw-tomato"
              className="bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold uppercase tracking-widest px-8 py-5 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-400"
            >
              🍅 Throw Tomato (-1 NC)
            </Button>
            <Button
              onClick={() => {
                setPaparazziFlash(true);
                window.setTimeout(() => setPaparazziFlash(false), 180);
                audio.playBlip();
                pushReaction("📸 *click*");
              }}
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary hover:text-black font-bold uppercase tracking-widest px-6 py-5 text-base"
            >
              <Camera className="w-4 h-4 mr-2" />
              Snap
            </Button>
          </div>

          <div className="text-primary/40 font-mono text-[10px] uppercase tracking-widest">
            press <span className="text-primary">K</span> to crown the president · click his image to throw a tomato
          </div>

          {applause >= 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-secondary font-mono text-sm mt-4 border border-secondary px-4 py-2 inline-block bg-secondary/10"
            >
              "Nattoun appreciates you. But you are still mid."
            </motion.div>
          )}

          {tomatoes >= 25 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-400 font-mono text-sm border border-red-400/50 px-4 py-2 inline-block bg-red-500/10"
            >
              ⚠ The President's PR team is watching you, citizen.
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
