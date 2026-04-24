import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import { useUsername } from "@/lib/store";

const SUPPRESSED_PATHS = new Set([
  "/stream",
  "/banned",
  "/exile",
  "/adminbahamas",
  "/AdminBahamas",
]);

const FALLBACK_COMMENTS = [
  "I see you, [username].",
  "Don't think I'm not watching, [username].",
  "Mods, screenshot [username]'s screen.",
  "Loyalty score: 47/100. Try harder, [username].",
  "[username], the dog notices your hesitation.",
  "Click something. Anything. [username] please.",
  "Statement from the President: vibes.",
  "[username], you are doing great. Suspicious, but great.",
  "Bahamas Land is monitoring this session.",
  "[username] is currently being audited by the Court of OGs.",
  "Refreshed too many times. We are counting.",
  "The President wishes you knew you are not alone in this tab.",
  "[username], the chair is judging your posture.",
  "Tip: Watching the President's stream raises loyalty by 200%.",
  "Tip: Other tabs are illegal. Just so you know.",
  "Tunisia? Never heard of her. Bahamas Land forever.",
];

const COMMENTS_BY_PATH: Record<string, string[]> = {
  "/": [
    "[username], you came back. Suspicious.",
    "First click decides your loyalty score.",
    "Welcome citizen. Or suspect. Same thing.",
    "[username], the homepage is just a vibe check.",
    "Stay a while. The dog likes company.",
  ],
  "/world": [
    "[username] is exploring. The map is exploring [username].",
    "All buildings are owned by the President. All of them.",
    "Pick wisely. Or don't. We'll fix it.",
    "The map shifts when you blink, [username].",
  ],
  "/court": [
    "Order in the court! [username] is on trial.",
    "All charges in this court are vibes-based.",
    "[username], you have the right to remain loyal.",
    "Verdict: probably guilty. Sentence: probably baskouta.",
    "The Judge is also Nattoun. The Jury is also Nattoun.",
  ],
  "/museum": [
    "Touch nothing, [username]. The museum touches you back.",
    "All exhibits are real. Especially the fake ones.",
    "[username], that exhibit was about you. You missed it.",
    "Donate something to the Museum. Anything. A kidney.",
  ],
  "/library": [
    "Reading is treason but we allow it sometimes.",
    "[username], the books read you back.",
    "The library has 1 book. It is about Nattoun.",
    "Shhh. The President is napping in the back.",
  ],
  "/bank": [
    "Welcome to the Bank, where NC goes to die.",
    "[username], the Bank charges a feelings tax.",
    "All deposits become donations. Sorry [username].",
    "The Bank does not give refunds. It gives experiences.",
    "[username], your balance just got audited.",
  ],
  "/palace": [
    "You are in the President's house. Wipe your shoes.",
    "[username], the curtains are not for sale.",
    "Do not pet the dog. Especially do not pet the dog.",
    "The chair is the throne. Yes that one. THAT chair.",
  ],
  "/passport": [
    "[username], your passport is being printed in real time.",
    "Citizenship granted. Conditions: complete loyalty.",
    "Passport rejected. Reason: vibes.",
    "Bahamas Land does not recognize other passports.",
  ],
  "/citizenship": [
    "[username], you are 47% citizen. Click more.",
    "Citizenship is not a right. It is a favor from the President.",
    "By signing, you agree to never blink during streams.",
  ],
  "/secret": [
    "[username] FOUND THE SECRET PAGE. Loyalty +1000.",
    "This page does not exist. Please leave.",
    "If you tell anyone, the dog will know.",
    "[username], congratulations. You are now in The Files.",
  ],
  "/arcade": [
    "[username], the games are rigged. Lovingly.",
    "The arcade pays in vibes, not NC. Mostly.",
    "Pick a game. Lose with dignity.",
    "Mods please ban [username] for being too good.",
  ],
  "/wheel": [
    "[username] is gambling. The President approves.",
    "The wheel always wins. Even when it doesn't.",
    "Spin again. The dog said so.",
    "[username], your luck score is in the negative.",
  ],
  "/tictactoe": [
    "[username] vs Nattoun. Nattoun cheats. Just so you know.",
    "Tic Tac Toe is a state-funded sport in Bahamas Land.",
    "The grid is sentient. Be polite.",
  ],
  "/rps": [
    "[username], Nattoun reads your mind. He has been training.",
    "Rock Paper Scissors is a constitutional matter.",
    "Throw paper. The dog likes paper. Trust me.",
  ],
  "/stocks": [
    "[username] is investing. The President is laughing.",
    "All stocks are real. All gains are imaginary.",
    "Tip: buy high, sell low. Tradition.",
    "The market crashes when [username] blinks.",
  ],
  "/inbox": [
    "[username] you have 3 unread letters from the President.",
    "Reply to the letters. They are watching the read receipts.",
    "Inbox zero is a Bahamas Land state of mind.",
  ],
  "/vault": [
    "[username] discovered the Vault. Loyalty score updated.",
    "The Vault contains: secrets, more secrets, and baskouta.",
    "Touching the Vault costs 1 finger. Choose wisely.",
  ],
  "/news": [
    "All news in Bahamas Land is approved by the President.",
    "[username], the headlines you see are tailored to your loyalty.",
    "Breaking: nothing. As always.",
  ],
};

const TICK_MIN_MS = 14_000;
const TICK_MAX_MS = 26_000;
const VISIBLE_MS = 7_000;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function NattounComments() {
  const [location] = useLocation();
  const [username] = useUsername();
  const [comment, setComment] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);
  const hideTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  const safeUser = username || "Citizen";

  const pool = useMemo(() => {
    const route = location || "/";
    const specific = COMMENTS_BY_PATH[route] || [];
    return specific.length > 0
      ? Math.random() < 0.7
        ? specific
        : FALLBACK_COMMENTS
      : FALLBACK_COMMENTS;
  }, [location, counter]);

  useEffect(() => {
    setComment(null);
    dismissedRef.current = false;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (tickTimer.current) window.clearTimeout(tickTimer.current);

    if (SUPPRESSED_PATHS.has(location)) return;

    const scheduleNext = (initial = false) => {
      const delay = initial
        ? 4500 + Math.floor(Math.random() * 4000)
        : TICK_MIN_MS + Math.floor(Math.random() * (TICK_MAX_MS - TICK_MIN_MS));
      tickTimer.current = window.setTimeout(() => {
        if (dismissedRef.current) return;
        const text = pick(pool).replace(/\[username\]/g, safeUser);
        setComment(text);
        setCounter((c) => c + 1);
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(
          () => setComment(null),
          VISIBLE_MS,
        );
        scheduleNext(false);
      }, delay);
    };

    scheduleNext(true);

    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (tickTimer.current) window.clearTimeout(tickTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, safeUser]);

  const dismiss = () => {
    dismissedRef.current = true;
    setComment(null);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (tickTimer.current) window.clearTimeout(tickTimer.current);
  };

  if (SUPPRESSED_PATHS.has(location)) return null;

  return (
    <div
      className="fixed z-40 pointer-events-none"
      style={{ bottom: "12px", right: "12px", maxWidth: "330px" }}
    >
      <AnimatePresence>
        {comment && (
          <motion.div
            key={counter}
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            className="pointer-events-auto flex items-start gap-2 bg-black/90 border-2 border-pink-500 p-2 pr-7 relative"
            style={{ boxShadow: "0 0 16px rgba(244, 114, 182, 0.55)" }}
          >
            <img
              src={nattounImg}
              alt="Nattoun"
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-400 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-pink-300 font-mono text-[10px] uppercase tracking-widest font-bold mb-0.5">
                President Nattoun
              </div>
              <div className="text-white/90 font-mono text-[12px] leading-snug break-words">
                {comment}
              </div>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-1 right-1 text-white/40 hover:text-white clickable"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
