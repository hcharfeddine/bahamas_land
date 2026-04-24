import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";
import { useCoins, useLocalStorage } from "@/lib/store";

const TOAST_MS = 3500;

type Toast = { id: number; text: string; sub?: string };

export function EasterEggs() {
  const [, setLocation] = useLocation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [midStamp, setMidStamp] = useState(false);
  const [mekkyFlash, setMekkyFlash] = useState(false);
  const [tabAway, setTabAway] = useState(false);
  const [nattounSleep, setNattounSleep] = useState(false);
  const [walker, setWalker] = useState(false);
  const [hour, setHour] = useState(() => new Date().getHours());
  const [, setCoins] = useCoins();
  const [lastDailyVisit, setLastDailyVisit] = useLocalStorage<string>("ogs_daily_visit", "");
  const [bonkCount, setBonkCount] = useLocalStorage<number>("ogs_bonk_count", 0);
  const idleTimer = useRef<number | null>(null);
  const tabAwayAt = useRef<number | null>(null);
  const spaceHeld = useRef<number | null>(null);
  const typedBuffer = useRef<string>("");
  const typedTimer = useRef<number | null>(null);
  const f12Used = useRef<boolean>(false);

  const pushToast = (text: string, sub?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, sub }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_MS);
  };

  // ============================================================
  // Achievement unlock toasts
  // ============================================================
  useEffect(() => {
    const onUnlock = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as string;
      if (!id) return;
      pushToast("ACHIEVEMENT UNLOCKED", id.toUpperCase());
      audio.playCoin();
    };
    window.addEventListener("achievement-unlock", onUnlock);
    return () => window.removeEventListener("achievement-unlock", onUnlock);
  }, []);

  // ============================================================
  // Daily-visit greeting + loyal achievement
  // ============================================================
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastDailyVisit && lastDailyVisit !== today) {
      pushToast("WELCOME BACK, CITIZEN", "Your loyalty has been logged.");
      unlock("loyal");
    }
    if (lastDailyVisit !== today) setLastDailyVisit(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Hour tracker (for 3am dark mode + Tuesday crown)
  // ============================================================
  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const isWitchingHour = hour >= 3 && hour < 4;
  const isTuesday = new Date().getDay() === 2;
  const isAprilFools = (() => {
    const d = new Date();
    return d.getMonth() === 3 && d.getDate() === 1;
  })();

  useEffect(() => {
    if (isWitchingHour) unlock("nightowl");
  }, [isWitchingHour]);

  // ============================================================
  // Tab-away watcher (30s+)
  // ============================================================
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        tabAwayAt.current = Date.now();
      } else if (tabAwayAt.current) {
        const elapsed = Date.now() - tabAwayAt.current;
        tabAwayAt.current = null;
        if (elapsed > 30000) {
          setTabAway(true);
          unlock("nightcrawler");
          window.setTimeout(() => setTabAway(false), 3000);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ============================================================
  // Idle 60s -> Nattoun walks across screen
  // ============================================================
  useEffect(() => {
    const reset = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        setWalker(true);
        window.setTimeout(() => setWalker(false), 8000);
      }, 60000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  // ============================================================
  // Keyboard: typed combos + space-hold + M mute + F12 intercept
  // ============================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // F12 first-time intercept
      if (e.key === "F12" && !f12Used.current) {
        e.preventDefault();
        f12Used.current = true;
        pushToast("HACKING IS ILLEGAL IN BAHAMAS LAND", "Try again. We'll let you in.");
        audio.playGlitch();
        return;
      }
      // 'M' mute toggle (only when not typing in inputs)
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable;
      if (!isTyping && (e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const next = !audio.isMuted();
        audio.setMuted(next);
        pushToast(next ? "AUDIO MUTED" : "AUDIO ON");
      }
      // Space-hold on World page
      if (e.code === "Space" && !isTyping) {
        if (window.location.pathname.endsWith("/world") && spaceHeld.current === null) {
          spaceHeld.current = window.setTimeout(() => {
            setNattounSleep(true);
            unlock("nattounsleeper");
            audio.playGlitch();
            window.setTimeout(() => setNattounSleep(false), 4000);
          }, 5000);
        }
      }
      // Typed buffer for word combos
      if (!isTyping && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        typedBuffer.current = (typedBuffer.current + e.key.toUpperCase()).slice(-16);
        if (typedTimer.current) window.clearTimeout(typedTimer.current);
        typedTimer.current = window.setTimeout(() => {
          typedBuffer.current = "";
        }, 2000);

        const buf = typedBuffer.current;
        if (buf.endsWith("M3KKY")) {
          setMekkyFlash(true);
          unlock("mekkyfan");
          audio.playGlitch();
          window.setTimeout(() => setMekkyFlash(false), 3000);
          typedBuffer.current = "";
        } else if (buf.endsWith("MID")) {
          setMidStamp(true);
          unlock("midwit");
          audio.playGlitch();
          window.setTimeout(() => setMidStamp(false), 2500);
          typedBuffer.current = "";
        } else if (buf.endsWith("RESPECT") && window.location.pathname.endsWith("/museum")) {
          window.dispatchEvent(new CustomEvent("museum-respect"));
          audio.playCoin();
          typedBuffer.current = "";
        } else if (buf.endsWith("VAULT")) {
          setLocation("/vault");
          typedBuffer.current = "";
        } else if (buf.endsWith("BANNED")) {
          setLocation("/banned");
          typedBuffer.current = "";
        } else if (buf.endsWith("EXILE")) {
          setLocation("/exile");
          typedBuffer.current = "";
        } else if (buf.endsWith("GHOST")) {
          unlock("ghost");
          pushToast("👻 GHOST PROTOCOL", "You weren't supposed to find that name.");
          audio.playGlitch();
          typedBuffer.current = "";
        } else if (buf.endsWith("NATTOUN")) {
          unlock("ghost");
          pushToast("THE PRESIDENT SEES YOU", "Identity theft is a Bahamas Land tradition.");
          audio.playGlitch();
          typedBuffer.current = "";
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && spaceHeld.current !== null) {
        window.clearTimeout(spaceHeld.current);
        spaceHeld.current = null;
      }
    };
    const onContext = (e: MouseEvent) => {
      // Intercept right-click once
      if (!f12Used.current) {
        e.preventDefault();
        f12Used.current = true;
        pushToast("NICE TRY", "Right-clicking is for the weak.");
        audio.playGlitch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("contextmenu", onContext);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("contextmenu", onContext);
    };
  }, [setLocation]);

  // ============================================================
  // Bonk Nattoun: any image with data-nattoun="true" rapid clicks
  // ============================================================
  useEffect(() => {
    let recent: number[] = [];
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const isNattoun =
        target.tagName === "IMG" && target.getAttribute("data-nattoun") === "true";
      if (!isNattoun) return;
      const now = Date.now();
      recent = [...recent.filter((t) => now - t < 3000), now];
      target.animate(
        [{ transform: "scale(1)" }, { transform: "scale(0.9) rotate(-5deg)" }, { transform: "scale(1)" }],
        { duration: 200 }
      );
      audio.playBlip();
      if (recent.length >= 10) {
        recent = [];
        const newBonk = bonkCount + 1;
        setBonkCount(newBonk);
        unlock("bonker");
        setCoins((c) => c + 50);
        pushToast("WOOF. +50 NC", "You bonked the President.");
        document.body.animate(
          [{ transform: "translate(0,0)" }, { transform: "translate(-6px,4px)" }, { transform: "translate(6px,-4px)" }, { transform: "translate(0,0)" }],
          { duration: 250, iterations: 2 }
        );
        audio.playGlitch();
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [bonkCount, setBonkCount, setCoins]);

  // ============================================================
  // Scroll to bottom -> "the end. or is it?"
  // ============================================================
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 100) return;
      if (window.scrollY >= total - 4) {
        window.dispatchEvent(new CustomEvent("scrolled-bottom"));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* 3am dark/glitch overlay */}
      {isWitchingHour && (
        <div
          className="fixed inset-0 pointer-events-none z-[60] mix-blend-multiply"
          style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(120,0,0,0.45) 100%)",
          }}
        />
      )}

      {/* Tuesday crown overlay (top-right tiny crown) */}
      {isTuesday && (
        <div className="fixed top-2 right-2 z-[55] pointer-events-none text-2xl select-none" title="It is Tuesday.">👑</div>
      )}

      {/* April Fools tag */}
      {isAprilFools && (
        <div className="fixed bottom-2 left-2 z-[55] pointer-events-none text-[10px] font-mono uppercase text-primary/60">
          STATE HOLIDAY: NATIONAL LIES DAY
        </div>
      )}

      {/* Idle Nattoun walker */}
      <AnimatePresence>
        {walker && (
          <motion.div
            initial={{ x: "-25vw", y: 0 }}
            animate={{ x: "110vw" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 8, ease: "linear" }}
            className="fixed bottom-4 z-[58] pointer-events-none flex items-end gap-2"
          >
            <img src={nattounImg} alt="" className="w-20 h-20 object-contain drop-shadow-[0_0_8px_hsl(var(--primary))]" />
            <div className="bg-black/80 border border-primary text-primary text-xs font-mono uppercase px-2 py-1 mb-12 neon-box">
              are you still loyal?
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MID stamp slam */}
      <AnimatePresence>
        {midStamp && (
          <motion.div
            initial={{ scale: 5, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
          >
            <div className="border-[10px] border-red-500 text-red-500 font-black text-7xl md:text-9xl px-10 py-4 bg-black/30 uppercase tracking-widest" style={{ textShadow: "0 0 20px red" }}>
              CERTIFIED MID
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* M3KKY flash banner */}
      <AnimatePresence>
        {mekkyFlash && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="fixed inset-0 z-[68] bg-white pointer-events-none mix-blend-difference"
            />
            <motion.a
              href="https://kick.com/m3kky"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 18 }}
              className="fixed top-0 left-0 right-0 z-[69] bg-[#53fc18] text-black font-black uppercase tracking-widest text-center py-3 text-lg shadow-2xl"
            >
              ▶ LIVE NOW: M3KKY ON KICK ▶ kick.com/m3kky ◀
            </motion.a>
          </>
        )}
      </AnimatePresence>

      {/* Sleeping Nattoun */}
      <AnimatePresence>
        {nattounSleep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[68] bg-black/85 flex flex-col items-center justify-center text-primary font-mono"
          >
            <img src={nattounImg} alt="" className="w-40 h-40 object-contain opacity-80" />
            <div className="mt-4 text-2xl uppercase tracking-widest neon-text">Nattoun is sleeping.</div>
            <div className="mt-1 text-sm text-secondary">Don't wake him.</div>
            <motion.div
              animate={{ y: [-6, -20, -40], opacity: [1, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute text-3xl text-secondary"
              style={{ top: "30%" }}
            >
              z z z
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab-away "WHERE WERE YOU" */}
      <AnimatePresence>
        {tabAway && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[67] pointer-events-none flex items-center justify-center"
            style={{ background: "rgba(80,0,0,0.35)" }}
          >
            <div className="text-red-400 font-black uppercase tracking-widest text-3xl md:text-5xl text-center" style={{ textShadow: "0 0 20px red" }}>
              WELCOME BACK.
              <br />
              WHERE WERE YOU?
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              className="bg-black/90 border-2 border-primary px-4 py-2 font-mono text-primary neon-box max-w-xs"
            >
              <div className="text-xs font-black uppercase tracking-widest">{t.text}</div>
              {t.sub && <div className="text-[10px] text-secondary uppercase opacity-80">{t.sub}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
