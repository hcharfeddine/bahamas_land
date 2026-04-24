import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import nattounImg from "@assets/Nattoun_1777028672745.png";
import streamBg from "@assets/generated_images/bld_stream_studio.png";
import { useUsername, useCoins, useLocalStorage } from "@/lib/store";
import { audio } from "@/lib/audio";
import { Radio, Send, Eye, Heart, MessageSquare, Calendar, Coins } from "lucide-react";
import { unlock } from "@/lib/achievements";
import { PresidentBroadcast } from "@/components/PresidentBroadcast";
import { useStreamChat, type ChatMsg as ServerChatMsg } from "@/lib/streamChat";
import {
  getStreamStatus,
  formatSlot,
  formatCountdown,
  type StreamStatus,
  type SlotCategory,
} from "@/lib/schedule";

// ============================================================================
// SCHEDULE
// ============================================================================
// Each calendar day picks ONE random "live mode" deterministically:
//   clips    — clip compilation
//   chatting — just chatting
//   kick     — kick simulcast
//   t5athel  — President is NOT streaming today, just send tips
// And on non-t5athel days, ONE single random slot opens for ~25-45 min.
// ============================================================================

function useStreamStatus(): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>(() => getStreamStatus());
  useEffect(() => {
    const id = window.setInterval(
      () => setStatus(getStreamStatus(new Date())),
      30_000,
    );
    return () => window.clearInterval(id);
  }, []);
  return status;
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

const CATEGORY_QUOTES: Record<Exclude<SlotCategory, "t5athel">, string[]> = {
  clips: [
    "Welcome to Clip Hour. The President personally curated these. (he didn't.)",
    "[username], do not reupload these clips. They are state property.",
    "Today's run: 100% pure baskouta-grade content.",
    "Clip incoming in 3… 2… already missed it. Loyal.",
    "Clip vault unsealed for ONE hour. Document everything. Report nothing.",
    "If you laugh at this clip you are loyal. If not, exile.",
  ],
  chatting: [
    "Just chatting today. Tell me your problems. I will not solve them.",
    "[username], how was your day? Be honest. Mods are ranking the answers.",
    "No game, no script, just vibes and light interrogation.",
    "Drop a question in chat. I will answer with another question.",
    "Today the President is in his 'wise older dog' arc.",
    "Reminder: anything you say in chat is canon.",
  ],
  kick: [
    "We are LIVE on Kick today. Watch only me. Twitch is a rumor.",
    "Kick.com/m3kky in the description. Click it. Loyalty audit at the end.",
    "Multistreaming? We do not know her. Kick exclusive for the day.",
    "[username], the Kick chat is faster. The President is jealous.",
    "Today's bandwidth: 100% Kick. 0% backup. Pray for the wifi.",
    "Watching from the wrong site? You are technically committing treason.",
  ],
};

const TROLL_QUOTES = [
  "I AM LIVE BECAUSE I FEEL LIKE IT.",
  "Did you really just open the stream tab? Loyal.",
  "[username], the schedule said something. It is not that. We do not care.",
  "This is an unscheduled emergency address. About baskouta.",
  "Breaking news from the President: nothing.",
  "I will go offline in 4 seconds. Or 4 hours. We will see.",
  "The cameras are rolling. The mics are off. The vibes are on.",
];

const OFFLINE_QUOTES = [
  "Stream is offline. The President is sleeping. Or filing taxes.",
  "Come back at the scheduled slot. Or don't. We notice either way.",
  "While you wait, why not visit the Bank? You will lose money. Tradition.",
  "Offline. Officially. Unofficially he is reading your DMs.",
  "One slot a day. That's the deal. Today's slot was already chosen.",
];

const CRASHED_QUOTES = [
  "T5ATHELT. Today's slot is burned. Try tomorrow.",
  "T5ATHELT. The vibes left the building. Come back another day.",
  "T5ATHELT. The mic broke. The dog ate it. Cope.",
  "T5ATHELT. Loyalty audit interrupted the stream. Sorry not sorry.",
];

const T5ATHEL_DAY_QUOTES = [
  "T5ATHELT. I am NOT streaming today. Just send tips.",
  "[username], the stream is closed. The TIP JAR is open. Choose wisely.",
  "Today is a rest day. The dog needs his beauty sleep. Send NC.",
  "No live. No clips. No chatting. Only tips. Such is the law.",
  "Streaming is hard. Tipping is easy. Be helpful, [username].",
  "T5ATHELT day. The President is on a strategic nap. Fund it.",
];

const CATEGORY_BADGE: Record<SlotCategory, { text: string; tone: string }> = {
  clips: { text: "CLIPS", tone: "bg-fuchsia-500 text-black border-fuchsia-300" },
  chatting: { text: "JUST CHATTING", tone: "bg-cyan-400 text-black border-cyan-200" },
  kick: { text: "KICK", tone: "bg-[#53fc18] text-black border-[#53fc18]" },
  t5athel: { text: "T5ATHELT", tone: "bg-yellow-400 text-black border-yellow-200" },
};

type ChatMsg = ServerChatMsg;

// ============================================================================
// COMPONENT
// ============================================================================
export default function Stream() {
  const [username] = useUsername();
  const status = useStreamStatus();
  const [coins, setCoins] = useCoins();
  const [followed, setFollowed] = useLocalStorage<boolean>(
    "ogs_stream_followed",
    false,
  );
  const [subbed, setSubbed] = useLocalStorage<boolean>(
    "ogs_stream_subbed",
    false,
  );
  const [tipsSent, setTipsSent] = useLocalStorage<number>(
    "ogs_stream_tips_sent",
    0,
  );
  const [input, setInput] = useState("");
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [chatError, setChatError] = useState<string>("");
  const [tipFlash, setTipFlash] = useState<string>("");
  const chatRef = useRef<HTMLDivElement>(null);
  const heartTimer = useRef<number | null>(null);

  const safeUser = username || "Citizen";

  const {
    messages: chat,
    viewers,
    connected,
    send,
  } = useStreamChat(true);

  const isT5athelDay = status.category === "t5athel";

  const activeQuotes = useMemo(() => {
    if (status.live && status.current) {
      if (status.trolling) return TROLL_QUOTES;
      const cat = status.current.category;
      if (cat !== "t5athel") return CATEGORY_QUOTES[cat];
      return OFFLINE_QUOTES;
    }
    if (isT5athelDay) return T5ATHEL_DAY_QUOTES;
    if (status.crashed) return CRASHED_QUOTES;
    return OFFLINE_QUOTES;
  }, [status.live, status.trolling, status.current, status.crashed, isT5athelDay]);

  const fakeViewers = useMemo(() => {
    if (!status.live) return 0;
    const followBoost = (followed ? 1 : 0) + (subbed ? 1 : 0);
    return viewers.fake + followBoost;
  }, [status.live, viewers.fake, followed, subbed]);

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
  }, [activeQuotes]);

  // Scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat.length]);

  // Clear transient chat error after a moment
  useEffect(() => {
    if (!chatError) return;
    const id = window.setTimeout(() => setChatError(""), 2400);
    return () => window.clearTimeout(id);
  }, [chatError]);

  // Clear tip flash after a moment
  useEffect(() => {
    if (!tipFlash) return;
    const id = window.setTimeout(() => setTipFlash(""), 2400);
    return () => window.clearTimeout(id);
  }, [tipFlash]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status.live) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    audio.playBlip();
    const result = await send(safeUser, text);
    if (result.ok) {
      unlock("trollchat");
    } else if (result.error === "slow_mode") {
      setChatError("Slow down, citizen. Mods are watching.");
    } else if (result.error === "stream_offline") {
      setChatError(
        isT5athelDay
          ? "T5ATHELT. No stream today. Just send tips."
          : status.crashed
            ? "T5ATHELT. The President quit. Chat closed for today."
            : "Stream is offline. Try again when Nattoun returns.",
      );
    } else if (result.error === "empty") {
      setChatError("Type something first, citizen.");
    } else if (result.error === "bad_json" || result.error === "network") {
      setChatError("Network glitch. Mods blame the dog. Try again.");
    } else {
      setChatError(`Chat rejected (${result.error || "unknown"}). Try again.`);
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
      unlock("subscriber");
      audio.playGlitch();
    }
  };

  const handleTip = (amount: number) => {
    if (coins < amount) {
      setTipFlash(`You need ${amount} NC to tip. Visit the Bank.`);
      audio.playGlitch();
      return;
    }
    setCoins((c) => Math.max(0, c - amount));
    setTipsSent((t) => t + amount);
    audio.playCoin();
    const lines = [
      `Tip received: ${amount} NC. Loyalty +${Math.floor(amount / 10)}.`,
      `+${amount} NC. The dog tilts his head approvingly.`,
      `+${amount} NC. President noted. (probably.)`,
      `+${amount} NC. Receipt printed in Comic Sans.`,
    ];
    setTipFlash(lines[Math.floor(Math.random() * lines.length)]);
  };

  const headerSubtitle = isT5athelDay
    ? "Today: T5ATHELT. No stream. Just send tips."
    : status.slot
      ? `One slot today at ${formatSlot(status.slot)} — that's it.`
      : "One slot a day. Today's was canceled.";

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
            {headerSubtitle}
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

              {/* LIVE badge + category */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-30 flex-wrap">
                {status.live ? (
                  <motion.div
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="bg-red-600 text-white px-2 py-1 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-red-400"
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                    LIVE
                  </motion.div>
                ) : status.crashed || isT5athelDay ? (
                  <div className="bg-yellow-500 text-black px-2 py-1 text-xs font-black uppercase tracking-widest border border-yellow-300">
                    T5ATHELT
                  </div>
                ) : (
                  <div className="bg-black/80 text-white/60 px-2 py-1 text-xs font-black uppercase tracking-widest border border-white/30">
                    OFFLINE
                  </div>
                )}
                <div
                  className={`px-2 py-1 text-xs font-black uppercase tracking-widest border ${
                    CATEGORY_BADGE[status.category].tone
                  }`}
                >
                  {CATEGORY_BADGE[status.category].text}
                </div>
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
                  style={
                    status.crashed || isT5athelDay
                      ? { filter: "grayscale(1) blur(2px)", opacity: 0.4 }
                      : undefined
                  }
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

              {/* T5ATHELT crash overlay (slot burned OR full t5athel day) */}
              {(status.crashed || isT5athelDay) && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div
                    className="absolute inset-0 opacity-60 mix-blend-screen"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 5px), repeating-linear-gradient(90deg, rgba(255,0,128,0.05) 0 3px, transparent 3px 7px)",
                    }}
                  />
                  <div className="absolute inset-0 bg-black/55" />
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 14 }}
                    className="relative text-center px-6 py-5 border-4 border-yellow-400 bg-black/85"
                    style={{
                      boxShadow:
                        "0 0 40px rgba(250, 204, 21, 0.8), inset 0 0 24px rgba(250, 204, 21, 0.35)",
                    }}
                  >
                    <motion.div
                      animate={{ x: [0, -2, 2, -1, 1, 0] }}
                      transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.2 }}
                      className="text-yellow-400 font-black uppercase tracking-[0.5em] text-4xl md:text-6xl"
                      style={{ textShadow: "0 0 18px rgba(250, 204, 21, 0.9)" }}
                    >
                      T5ATHELT
                    </motion.div>
                    <div className="mt-2 text-white/80 font-mono text-[11px] uppercase tracking-widest">
                      {isT5athelDay
                        ? "Not streaming today — just send tips"
                        : "Today's stream slot is burned"}
                    </div>
                    <div className="mt-1 text-yellow-300/70 font-mono text-[10px] uppercase tracking-widest">
                      Try again tomorrow. Or do not. He notices either way.
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Speech caption */}
              <div className="absolute bottom-3 left-3 right-3 z-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex + (status.live ? "live" : isT5athelDay ? "t5" : "off")}
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
                  <h2
                    className={`font-black uppercase text-base md:text-lg tracking-wider truncate ${
                      status.crashed || isT5athelDay
                        ? "text-yellow-400"
                        : "text-primary"
                    }`}
                  >
                    {status.live && status.current
                      ? `${status.current.label} — LIVE NOW`
                      : isT5athelDay
                        ? "T5ATHELT — NO STREAM TODAY (TIPS ONLY)"
                        : status.crashed
                          ? "T5ATHELT — TODAY'S SLOT IS BURNED"
                          : status.next
                            ? `LIVE OPENS IN ${formatCountdown(status.next.minutesUntil)}${status.next.isToday ? "" : " (TOMORROW)"}`
                            : "LIVE IS CLOSED"}
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
              <div className="text-[10px] font-mono text-white/50 uppercase flex items-center gap-2">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    connected ? "bg-green-400" : "bg-white/30"
                  }`}
                />
                {viewers.real} online ·{" "}
                {status.live
                  ? "LIVE"
                  : isT5athelDay || status.crashed
                    ? "T5ATHELT"
                    : "READ ONLY"}
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
            {chatError && (
              <div className="px-2 pb-1 text-[10px] font-mono text-red-400 uppercase tracking-wider">
                ⚠ {chatError}
              </div>
            )}
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

        {/* President's broadcast (random: reacts OR watches M3kky) */}
        <PresidentBroadcast />

        {/* Today's slot OR Tip Jar (t5athel) + Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isT5athelDay ? (
            <div className="bg-black/70 border-2 border-yellow-400 p-4 neon-box">
              <h3 className="text-yellow-400 font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4" /> Tip Jar — T5ATHELT Day
              </h3>
              <p className="text-white/80 font-mono text-xs leading-relaxed mb-3">
                The President is NOT streaming today. He demands tips instead.
                Choose your tier of loyalty:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { amount: 10, label: "10 NC" },
                  { amount: 50, label: "50 NC" },
                  { amount: 200, label: "200 NC" },
                ].map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => handleTip(tier.amount)}
                    disabled={coins < tier.amount}
                    className="px-2 py-2 border-2 border-yellow-400 text-yellow-400 font-black uppercase text-xs tracking-widest hover:bg-yellow-400 hover:text-black clickable disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] font-mono text-white/60 uppercase tracking-wider">
                Tips sent today (and forever): {tipsSent} NC
              </div>
              {tipFlash && (
                <div className="mt-2 text-[11px] font-mono text-yellow-300 uppercase tracking-wider">
                  ✓ {tipFlash}
                </div>
              )}
              <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-3 border-t border-yellow-400/30 pt-2">
                Tomorrow may be: clips, just chatting, kick — or another t5athel day. Roll the dice.
              </p>
            </div>
          ) : (
            <div className="bg-black/70 border-2 border-primary p-4 neon-box">
              <h3 className="text-primary font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Today's Stream
              </h3>
              {status.slot ? (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 uppercase tracking-widest">
                      Mode
                    </span>
                    <span
                      className={`px-2 py-0.5 font-black uppercase tracking-widest border ${
                        CATEGORY_BADGE[status.slot.category].tone
                      }`}
                    >
                      {status.slot.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 uppercase tracking-widest">
                      Slot
                    </span>
                    <span className="text-secondary tabular-nums">
                      {formatSlot(status.slot)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 uppercase tracking-widest">
                      Status
                    </span>
                    <span
                      className={`font-black uppercase tracking-widest ${
                        status.live
                          ? "text-pink-400"
                          : status.crashed
                            ? "text-yellow-400"
                            : "text-secondary"
                      }`}
                    >
                      {status.live
                        ? "● LIVE NOW"
                        : status.crashed
                          ? "T5ATHELT — burned"
                          : status.next?.isToday
                            ? `OPENS IN ${formatCountdown(status.next.minutesUntil)}`
                            : "DONE FOR TODAY"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-white/60 font-mono text-xs">
                  No slot today. The President is on a strategic absence.
                </p>
              )}
              <p className="text-secondary/70 font-mono text-[11px] mt-3 border-t border-primary/30 pt-2 leading-snug">
                → ONE slot per day. ONE category. No reruns. No second chances.
                Catch it or wait for tomorrow.
              </p>
            </div>
          )}
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
