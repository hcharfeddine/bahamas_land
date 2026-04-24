import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import streamBg from "@assets/generated_images/bld_stream_studio.png";
import { useUsername, useCoins, useLocalStorage } from "@/lib/store";
import { audio } from "@/lib/audio";
import { Radio, Send, Eye, Heart, MessageSquare, Calendar } from "lucide-react";
import { unlock } from "@/lib/achievements";

// ============================================================================
// SCHEDULE
// ============================================================================
// Officially "scheduled" at 17:30 every day (local time).
// Window of ~45 minutes is considered the "scheduled live" slot.
// Outside the slot, Nattoun goes live whenever he feels like it (random),
// but always with the same disclaimer: "I open when I want."
// ============================================================================
const SCHED_HOUR = 17;
const SCHED_MIN = 30;
const SCHED_WINDOW_MIN = 45;
const TROLL_LIVE_CHANCE = 0.5; // outside window, 50% chance of "trolling live"

function useStreamStatus() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const schedStart = SCHED_HOUR * 60 + SCHED_MIN;
    const schedEnd = schedStart + SCHED_WINDOW_MIN;
    const inWindow = minutesNow >= schedStart && minutesNow < schedEnd;

    // Use a stable seed based on the day so trolling is consistent for ~minutes
    const seed = Math.floor(now.getTime() / 60_000 / 7);
    const rand = (Math.sin(seed * 9301 + 49297) * 233280) % 1;
    const trolling = !inWindow && Math.abs(rand) < TROLL_LIVE_CHANCE;

    let nextLiveLabel = "";
    if (!inWindow) {
      const minutesUntil =
        minutesNow < schedStart
          ? schedStart - minutesNow
          : 24 * 60 - minutesNow + schedStart;
      const h = Math.floor(minutesUntil / 60);
      const m = minutesUntil % 60;
      nextLiveLabel = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    return {
      now,
      inWindow,
      trolling,
      live: inWindow || trolling,
      nextLiveLabel,
    };
  }, [now]);
}

// ============================================================================
// CONTENT
// ============================================================================
const RULES = [
  "Rule 1: Watch only me. Other streams are illegal in Bahamas Land.",
  "Rule 2: If you blink, Nattoun knows.",
  "Rule 3: Drop a follow or face the Court of OGs.",
  "Rule 4: No backseat governing.",
  "Rule 5: Donations are spiritual. NC are accepted in this dimension only.",
  "Rule 6: 'IRL' streams happen exclusively in Bahamas Land. Tunisia is a rumor.",
  "Rule 7: All clips are property of the President. Royalties: 0%.",
  "Rule 8: Mute is for cowards. Volume is for citizens.",
  "Rule 9: Do not whisper to other streamers. We will know.",
  "Rule 10: There is no rule 10. Stop refreshing.",
];

const SCHED_LINES = [
  "Today's stream: 17:30. Sharp. Like Nattoun's teeth.",
  "Schedule: 17:30 daily. Other times: I open when I want. Like a fridge.",
  "Today: state of the union. Tomorrow: probably more state of the union.",
  "Topic: Bahamas Land economic policy (it's vibes).",
  "Topic: how to be loyal. Spoiler: just keep watching.",
];

const LIVE_QUOTES = [
  "Hello chat. The country is fine. Probably.",
  "[username], you again? Welcome back, suspect.",
  "If you came here for hot takes, congratulations.",
  "Today we are NOT raiding M3kky. (we are.)",
  "Mods, please ban anyone typing 'mid'. Except me.",
  "Subscribe with the button you cannot find on purpose.",
  "I will now read superchats. There are none. Sad.",
  "Question of the day: is bread a sandwich? Yes.",
  "Rumor: Nattoun runs a side server. False. (true.)",
  "Anyone watching another stream right now? You will be exiled.",
];

const TROLL_QUOTES = [
  "I AM LIVE BECAUSE I FEEL LIKE IT.",
  "Did you really just open the stream tab? Loyal.",
  "[username], the schedule said 17:30. It is not 17:30. We do not care.",
  "This is an unscheduled emergency address. About bread.",
  "Breaking news from the President: nothing.",
  "I will go offline in 4 seconds. Or 4 hours. We will see.",
  "The cameras are rolling. The mics are off. The vibes are on.",
];

const OFFLINE_QUOTES = [
  "Stream is offline. The President is sleeping. Or filing taxes.",
  "Come back at 17:30. Or don't. We notice either way.",
  "While you wait, why not visit the Bank? You will lose money. Tradition.",
  "Offline. Officially. Unofficially he is reading your DMs.",
];

const FAKE_VIEWERS_BASE = 1337;
const FAKE_CHATTERS = [
  "ogboss",
  "bahamas_4lyfe",
  "mid_destroyer",
  "natttoun_fan",
  "kickwarrior",
  "freedom_buyer",
  "loyal_007",
  "bread_president",
  "tunisian_dreamer",
  "anonymous_citizen",
  "ex_oligarch",
];

const FAKE_CHAT_MESSAGES = [
  "first",
  "FIRST!! +respect",
  "lmao",
  "natttoun stop staring at me",
  "i opened another tab im sorry",
  "PRESIDENT FOLLOW ME BACK",
  "[username] hi from the chat",
  "is this scheduled?",
  "the schedule is a suggestion",
  "W stream",
  "L take",
  "drop a clip",
  "im getting exiled aren't i",
  "+1 NC pls",
  "is m3kky watching",
  "the bread lore is wild",
  "BAN HIM",
  "BAN ME",
  "did anyone else see the dog blink",
  "subbed twice on accident",
  "the rules are getting longer",
  "rule 11 should exist",
  "i'll be loyal i promise",
  "court of ogs sent me",
  "🐶👑",
];

type ChatMsg = { id: number; user: string; text: string; mod?: boolean };

// ============================================================================
// COMPONENT
// ============================================================================
export default function Stream() {
  const [username] = useUsername();
  const status = useStreamStatus();
  const [, setCoins] = useCoins();
  const [followed, setFollowed] = useLocalStorage<boolean>(
    "ogs_stream_followed",
    false,
  );
  const [subbed, setSubbed] = useLocalStorage<boolean>(
    "ogs_stream_subbed",
    false,
  );
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const heartTimer = useRef<number | null>(null);

  const safeUser = username || "Citizen";

  const activeQuotes = status.live
    ? status.trolling
      ? TROLL_QUOTES
      : LIVE_QUOTES
    : OFFLINE_QUOTES;

  const fakeViewers = useMemo(() => {
    if (!status.live) return 0;
    const t = Math.floor(status.now.getTime() / 4000);
    const drift = Math.abs(Math.sin(t * 0.3)) * 240;
    const base = status.trolling ? 420 : FAKE_VIEWERS_BASE;
    return Math.floor(base + drift) + (followed ? 1 : 0) + (subbed ? 1 : 0);
  }, [status.live, status.now, status.trolling, followed, subbed]);

  // Streamer achievement when catching live
  useEffect(() => {
    if (status.live) unlock("streamer");
  }, [status.live]);

  // Rotating quote
  useEffect(() => {
    setQuoteIndex(0);
    const id = window.setInterval(() => {
      setQuoteIndex((q) => (q + 1) % activeQuotes.length);
    }, 5500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.live, status.trolling]);

  // Auto-fake-chat
  useEffect(() => {
    if (!status.live) {
      setChat([]);
      return;
    }
    let id = 1;
    const tick = () => {
      const u = FAKE_CHATTERS[Math.floor(Math.random() * FAKE_CHATTERS.length)];
      const t = FAKE_CHAT_MESSAGES[
        Math.floor(Math.random() * FAKE_CHAT_MESSAGES.length)
      ].replace("[username]", safeUser);
      setChat((c) => {
        const next = [...c, { id: id++, user: u, text: t }];
        return next.slice(-60);
      });
    };
    tick();
    const interval = window.setInterval(tick, 1800);
    return () => window.clearInterval(interval);
  }, [status.live, safeUser]);

  // Periodic mod messages
  useEffect(() => {
    if (!status.live) return;
    const interval = window.setInterval(() => {
      setChat((c) => [
        ...c,
        {
          id: Date.now() + Math.random(),
          user: "NattounBot",
          text: "Reminder: watching another stream is treason.",
          mod: true,
        },
      ]);
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [status.live]);

  // Scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat.length]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!status.live) return;
    const text = input.trim();
    if (!text) return;
    setChat((c) => [
      ...c.slice(-59),
      { id: Date.now(), user: safeUser, text },
    ]);
    setInput("");
    audio.playBlip();
    unlock("trollchat");
    // Random mod reply
    if (Math.random() < 0.35) {
      window.setTimeout(() => {
        const replies = [
          `${safeUser}, suspicious message logged.`,
          `${safeUser}, +1 loyalty point.`,
          `${safeUser}, that was mid.`,
          `${safeUser}, the President read it. He nodded.`,
          `${safeUser}, banned for 0 minutes.`,
        ];
        setChat((c) => [
          ...c.slice(-59),
          {
            id: Date.now(),
            user: "NattounBot",
            text: replies[Math.floor(Math.random() * replies.length)],
            mod: true,
          },
        ]);
      }, 700);
    }
  };

  const handleHeart = () => {
    audio.playBlip();
    const id = Date.now() + Math.random();
    setHearts((h) => [...h, { id, x: Math.random() * 80 + 10 }]);
    if (heartTimer.current) window.clearTimeout(heartTimer.current);
    heartTimer.current = window.setTimeout(() => setHearts([]), 2400);
  };

  const handleFollow = () => {
    if (!followed) {
      setFollowed(true);
      setCoins((c) => c + 25);
      audio.playCoin();
      unlock("loyal");
    }
  };

  const handleSubscribe = () => {
    if (!subbed) {
      setSubbed(true);
      setCoins((c) => Math.max(0, c - 100));
      audio.playGlitch();
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full py-4 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-widest neon-text flex items-center justify-center gap-3">
            <Radio className="w-8 h-8 md:w-10 md:h-10" />
            President Nattoun LIVE
          </h1>
          <p className="text-secondary font-mono text-xs uppercase tracking-widest">
            Scheduled daily at 17:30 — otherwise I open when I want.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* PLAYER */}
          <div className="space-y-3">
            <div
              className="relative aspect-video w-full overflow-hidden border-2 border-primary neon-box bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${streamBg})` }}
            >
              {/* Vignette */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/85 pointer-events-none" />
              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)",
                }}
              />

              {/* LIVE badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {status.live ? (
                  <motion.div
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="bg-red-600 text-white px-2 py-1 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-red-400"
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                    LIVE
                  </motion.div>
                ) : (
                  <div className="bg-black/80 text-white/60 px-2 py-1 text-xs font-black uppercase tracking-widest border border-white/30">
                    OFFLINE
                  </div>
                )}
                {status.trolling && (
                  <div className="bg-secondary text-black px-2 py-1 text-xs font-black uppercase tracking-widest border border-secondary">
                    UNSCHEDULED
                  </div>
                )}
                <div className="bg-black/70 text-white px-2 py-1 text-[11px] font-mono flex items-center gap-1 border border-white/30">
                  <Eye className="w-3 h-3" />
                  {fakeViewers.toLocaleString()}
                </div>
              </div>

              {/* President on screen */}
              <div className="absolute inset-0 flex items-end justify-center pb-12 pt-8">
                <motion.div
                  className="relative"
                  animate={
                    status.live
                      ? { y: [0, -8, 0], rotate: [0, 1.5, -1.5, 0] }
                      : { y: [0, -3, 0] }
                  }
                  transition={{
                    duration: status.live ? 3.2 : 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <img
                    src={nattounImg}
                    data-nattoun="true"
                    alt="President Nattoun"
                    className="w-44 h-44 md:w-56 md:h-56 object-cover rounded-full border-4 border-primary drop-shadow-[0_0_30px_hsl(var(--primary))]"
                  />
                  {status.live && (
                    <motion.div
                      animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-4 border-primary"
                    />
                  )}
                </motion.div>
              </div>

              {/* Speech caption */}
              <div className="absolute bottom-3 left-3 right-3 z-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex + (status.live ? "live" : "off")}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="bg-black/85 border-2 border-secondary px-4 py-2 text-secondary font-mono text-sm md:text-base neon-box-cyan"
                  >
                    "
                    {activeQuotes[quoteIndex].replace(
                      "[username]",
                      safeUser,
                    )}
                    "
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Floating hearts */}
              <AnimatePresence>
                {hearts.map((h) => (
                  <motion.div
                    key={h.id}
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: -240, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.2, ease: "easeOut" }}
                    className="absolute bottom-16 pointer-events-none text-3xl"
                    style={{ left: `${h.x}%` }}
                  >
                    💖
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleFollow}
                disabled={followed}
                className={`px-4 py-2 font-black uppercase tracking-widest text-sm border-2 clickable transition-colors ${
                  followed
                    ? "border-primary/30 text-primary/40 cursor-not-allowed"
                    : "border-primary text-primary hover:bg-primary hover:text-black"
                }`}
              >
                {followed ? "Following ✓" : "Follow (+25 NC)"}
              </button>
              <button
                onClick={handleSubscribe}
                disabled={subbed}
                className={`px-4 py-2 font-black uppercase tracking-widest text-sm border-2 clickable transition-colors ${
                  subbed
                    ? "border-secondary/30 text-secondary/40 cursor-not-allowed"
                    : "border-secondary text-secondary hover:bg-secondary hover:text-black"
                }`}
              >
                {subbed ? "Subscribed ✓" : "Subscribe (-100 NC)"}
              </button>
              <button
                onClick={handleHeart}
                className="px-4 py-2 font-black uppercase tracking-widest text-sm border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-black clickable"
              >
                <Heart className="w-4 h-4 inline mr-1" /> Heart
              </button>
              <a
                href="https://kick.com/m3kky"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto px-4 py-2 font-black uppercase tracking-widest text-sm border-2 border-[#53fc18] text-[#53fc18] hover:bg-[#53fc18] hover:text-black clickable"
              >
                Watch M3kky on Kick →
              </a>
            </div>

            {/* Title block */}
            <div className="bg-black/70 border-2 border-primary p-4 neon-box">
              <div className="flex items-start gap-4">
                <img
                  src={nattounImg}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border border-primary"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-primary font-black uppercase text-base md:text-lg tracking-wider truncate">
                    {status.live
                      ? status.trolling
                        ? "EMERGENCY ADDRESS — UNSCHEDULED — DEAL WITH IT"
                        : "STATE OF THE UNION — DAILY 17:30"
                      : `OFFLINE — NEXT SCHEDULED IN ${status.nextLiveLabel}`}
                  </h2>
                  <p className="text-secondary font-mono text-xs uppercase mt-1">
                    President Nattoun • Bahamas Land Government Channel
                  </p>
                  <p className="text-white/60 font-mono text-xs mt-2">
                    Watch only me. Other streams are illegal in Bahamas Land.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CHAT */}
          <div className="flex flex-col bg-black/80 border-2 border-secondary neon-box-cyan h-[420px] lg:h-auto lg:max-h-[640px]">
            <div className="border-b-2 border-secondary px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-secondary font-black uppercase text-xs tracking-widest">
                <MessageSquare className="w-4 h-4" /> Stream Chat
              </div>
              <div className="text-[10px] font-mono text-white/50 uppercase">
                {status.live ? "LIVE MODE" : "READ ONLY"}
              </div>
            </div>
            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto px-2 py-2 space-y-1 font-mono text-xs"
            >
              {chat.length === 0 && (
                <div className="text-white/40 italic px-2 py-3 text-center">
                  Stream is offline. Chat returns when Nattoun returns.
                </div>
              )}
              {chat.map((m) => (
                <div key={m.id} className="leading-snug px-1 break-words">
                  {m.mod && (
                    <span className="bg-primary text-black text-[9px] font-black px-1 mr-1 align-middle">
                      MOD
                    </span>
                  )}
                  <span
                    className={`font-bold ${
                      m.mod
                        ? "text-primary"
                        : m.user === safeUser
                          ? "text-white"
                          : "text-secondary/80"
                    }`}
                  >
                    {m.user}:
                  </span>{" "}
                  <span className="text-white/85">{m.text}</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={sendMessage}
              className="border-t-2 border-secondary p-2 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!status.live}
                maxLength={120}
                placeholder={
                  status.live ? "Send a message…" : "Stream is offline."
                }
                className="flex-1 bg-black border border-secondary text-white px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!status.live || !input.trim()}
                className="px-3 py-1 bg-secondary text-black font-black uppercase text-xs tracking-widest disabled:opacity-30 clickable"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* Schedule + Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/70 border-2 border-primary p-4 neon-box">
            <h3 className="text-primary font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Official Schedule
            </h3>
            <ul className="space-y-1 text-secondary font-mono text-xs">
              {SCHED_LINES.map((line) => (
                <li key={line} className="leading-snug">
                  → {line.replace("[username]", safeUser)}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-black/70 border-2 border-secondary p-4 neon-box-cyan">
            <h3 className="text-secondary font-black uppercase tracking-widest text-sm mb-2">
              Bahamas Land Stream Rules
            </h3>
            <ol className="space-y-1 text-white/80 font-mono text-xs list-none">
              {RULES.map((r) => (
                <li key={r} className="leading-snug">
                  • {r.replace("[username]", safeUser)}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
}
