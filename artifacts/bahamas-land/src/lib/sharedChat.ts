import { useEffect, useRef, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured, RemoteChatMessage } from "@/lib/supabase";
import { useStreamChat, type ChatMsg } from "@/lib/streamChat";
import { getStreamStatus } from "@/lib/schedule";

export type { ChatMsg };

// ============================================================================
// SHARED CHAT — backed by Supabase, auto-purged after 1 hour
// ============================================================================
// • Real user messages are stored in the `chat_messages` table.
// • Anyone can read messages from the last hour; older rows are invisible
//   (RLS) and lazily deleted by a trigger on insert.
// • Each visitor also sees client-side bot chatter for vibes (NEVER persisted
//   to the DB so the table stays small and cheap).
// • If Supabase is not configured, falls back to the in-memory SSE chat
//   (works in dev / Replit Publish but not on Vercel).
// ============================================================================

const MAX_LOCAL = 80;
const SLOW_MODE_MS = 1500;
const VIEWER_BASE = 142_857;
const VIEWER_MULT_REAL = 1_247;
const VIEWER_DRIFT_AMP = 8_420;
const TROLL_BOOST = 1.85;
const VIEWER_FLOOR = 99_999;

const BOT_USERS = [
  "ogboss", "bahamas_4lyfe", "mid_destroyer", "natttoun_fan", "kickwarrior",
  "freedom_buyer", "loyal_007", "baskouta_president", "bahamas_dreamer",
  "anonymous_citizen", "ex_oligarch", "court_of_ogs", "vault_keeper",
  "exile_survivor", "bahamas_treasury", "mid_witness", "nattoun_lover99",
  "the_real_m3kky", "definitely_not_nattoun", "ogboss_jr", "loyalty_dept",
  "carthage_kid", "baskouta_dealer", "1337_citizen", "mod_squad",
  "ban_me_pls", "i_open_when_i_want", "schedule_denier", "secret_service_og",
  "dog_intel_unit", "bahamian_in_paris", "chair_president", "ogs_anonymous",
  "nattouns_lawyer", "minister_of_vibes", "sus_visitor_47", "loyalty_max",
];

const BOT_LINES = [
  "first", "FIRST!! +respect", "lmao", "natttoun stop staring at me",
  "i opened another tab im sorry", "PRESIDENT FOLLOW ME BACK",
  "is this scheduled?", "the schedule is a suggestion", "W stream", "L take",
  "drop a clip", "im getting exiled aren't i", "+1 NC pls", "is m3kky watching",
  "the baskouta lore is wild", "BAN HIM", "BAN ME",
  "did anyone else see the dog blink", "the rules are getting longer",
  "court of ogs sent me", "🐶👑", "PRESIDENT NOTICE ME",
  "did he just look directly into my soul", "stop reading my dms",
  "🇧🇸🇧🇸🇧🇸", "schedule? in THIS economy?",
  "the dog said something based", "I REFRESHED 47 TIMES SORRY MODS",
  "absolute W from the President", "BAHAMAS LAND NUMBA 1",
  "Nattoun pls fix the bank", "chat is mid today", "no chat is BASED today",
  "anyone else lose 3000 NC at the wheel", "free me from the exile",
  "wen 17:50 wen", "🍪🍪🍪 BASKOUTA BASKOUTA BASKOUTA",
  "pog", "PogChamp", "Pepega", "KEKW", "ratio", "ratio + L + skill issue",
  "the President speaks the truth", "PRESIDENT NATTOUN FOR LIFE",
  "i would die for this dog",
  "Bahamas Land is the only country", "lurking 🫡", "just here to be loyal",
  "the chair is suspicious today", "did the rules change again",
];

const MOD_LINES = [
  "Reminder: watching another stream is treason.",
  "Drop a follow or face the Court of OGs.",
  "President Nattoun has banned the word 'mid' for 30 minutes.",
  "Court of OGs is now in session. Behave.",
  "Loyalty check passed: +1 NC for everyone watching. (Not really.)",

  "Reminder: rule 10 does not exist. Stop asking.",
];

const PRES_LINES = [
  "I see you, [user]. I see all of you.",
  "Mods, give [user] the loyalty stamp.",
  "That comment was almost good. Almost.",
  "The dog approves this chat. Mostly.",
  "Stop refreshing, [user]. I notice.",
  "Baskouta is sandwich. End of debate.",
  "There are NO bots in this chat. Every viewer is loyal.",
  "Mods! Ban anyone NOT typing W.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("ogs_visitor_id");
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem("ogs_visitor_id", id);
    }
    return id;
  } catch {
    return `v_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function inflatedViewerCount(real: number): number {
  const now = Date.now();
  const t = Math.floor(now / 4000);
  const drift = Math.abs(Math.sin(t * 0.3)) * VIEWER_DRIFT_AMP;
  const wobble = Math.abs(Math.sin(t * 1.7)) * 1_300;
  const status = getStreamStatus(new Date(now));
  const boost = status.trolling ? TROLL_BOOST : 1;
  const raw = Math.floor((VIEWER_BASE + real * VIEWER_MULT_REAL + drift + wobble) * boost);
  return Math.max(VIEWER_FLOOR + 1 + Math.floor(wobble), raw);
}

function remoteToLocal(r: RemoteChatMessage): ChatMsg {
  return {
    id: r.id,
    user: r.username,
    text: r.text,
    mod: r.is_mod,
    ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

// Negative IDs guarantee bot messages never collide with Supabase IDs (positive bigserial)
let botIdCounter = -1;
function newBotId(): number {
  return botIdCounter--;
}

function spawnBotMessage(currentUser: string): ChatMsg {
  const roll = Math.random();
  if (roll < 0.08) {
    return { id: newBotId(), user: "NattounBot", text: pick(MOD_LINES), mod: true, ts: Date.now() };
  }
  if (roll < 0.22) {
    return {
      id: newBotId(),
      user: "President_Nattoun",
      text: pick(PRES_LINES).replace("[user]", currentUser || pick(BOT_USERS)),
      mod: true,
      ts: Date.now(),
    };
  }
  return {
    id: newBotId(),
    user: pick(BOT_USERS),
    text: pick(BOT_LINES).replace("[user]", currentUser || pick(BOT_USERS)),
    ts: Date.now(),
  };
}

// ----------------------------------------------------------------------------
// useSupabaseChat — pulls messages from Supabase + adds client-side bot vibes
// ----------------------------------------------------------------------------
function useSupabaseChat(enabled: boolean) {
  const [realMessages, setRealMessages] = useState<ChatMsg[]>([]);
  const [botMessages, setBotMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const [realViewers, setRealViewers] = useState<number>(1);
  const [, setTick] = useState(0);
  const lastSendRef = useRef<number>(0);
  const visitorIdRef = useRef<string>("");

  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
  }, []);

  // ---- Initial fetch + Realtime subscription + Presence -------------------
  useEffect(() => {
    if (!enabled || !supabase) return;
    const client = supabase;
    let cancelled = false;

    const fetchMessages = async () => {
      const { data, error } = await client
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_LOCAL);
      if (cancelled) return;
      if (error) {
        console.warn("[chat] fetch error", error);
        return;
      }
      const msgs = (data || []).map(remoteToLocal).reverse();
      setRealMessages(msgs);
    };

    fetchMessages();

    const channel = client.channel("chat-messages-public", {
      config: { presence: { key: visitorIdRef.current || "anon" } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = remoteToLocal(payload.new as RemoteChatMessage);
          setRealMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev.slice(-(MAX_LOCAL - 1)), m];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const id = (payload.old as { id?: number })?.id;
          if (typeof id === "number") {
            setRealMessages((prev) => prev.filter((m) => m.id !== id));
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setRealViewers(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (cancelled) return;
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          await channel.track({ visitor: visitorIdRef.current, at: Date.now() });
        }
      });

    return () => {
      cancelled = true;
      client.removeChannel(channel);
      setConnected(false);
    };
  }, [enabled]);

  // ---- Periodic prune of messages older than 1h (client-side fail-safe) ---
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      setRealMessages((prev) => prev.filter((m) => m.ts >= cutoff));
      setTick((t) => t + 1); // force viewer-count re-render
    }, 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  // ---- Client-side bot chatter (only when stream is live) -----------------
  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    const tick = () => {
      const status = getStreamStatus();
      if (status.live && !document.hidden) {
        const burst = Math.random() < 0.25 ? 2 : 1;
        const newBots: ChatMsg[] = [];
        for (let i = 0; i < burst; i++) newBots.push(spawnBotMessage(""));
        setBotMessages((prev) => [...prev.slice(-(MAX_LOCAL - 1)), ...newBots]);
      }
      const delay = status.live
        ? 900 + Math.floor(Math.random() * 1700)
        : 9_000 + Math.floor(Math.random() * 4_000);
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 1500);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [enabled]);

  // ---- Send a real message to Supabase ------------------------------------
  const send = useCallback(
    async (user: string, text: string): Promise<{ ok: boolean; error?: string }> => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: "empty" };

      const status = getStreamStatus();
      if (!status.live) return { ok: false, error: "stream_offline" };

      const now = Date.now();
      if (now - lastSendRef.current < SLOW_MODE_MS) {
        return { ok: false, error: "slow_mode" };
      }

      if (!supabase) return { ok: false, error: "network" };

      lastSendRef.current = now;
      const { error } = await supabase.from("chat_messages").insert({
        username: user.slice(0, 32) || "Citizen",
        text: trimmed.slice(0, 200),
        is_mod: false,
      });
      if (error) {
        lastSendRef.current = 0; // allow retry
        console.warn("[chat] insert error", error);
        return { ok: false, error: error.message || "insert_failed" };
      }
      return { ok: true };
    },
    []
  );

  // ---- Merge real + bot messages, sorted by timestamp ---------------------
  const messages: ChatMsg[] = [...realMessages, ...botMessages]
    .sort((a, b) => a.ts - b.ts)
    .slice(-MAX_LOCAL);

  const fake = inflatedViewerCount(realViewers);

  return {
    messages,
    viewers: { real: realViewers, fake },
    connected,
    send,
  };
}

// ----------------------------------------------------------------------------
// Public hook: prefer Supabase when configured, else fall back to in-memory SSE
// ----------------------------------------------------------------------------
export function useSharedChat(enabled: boolean) {
  // Both hooks must be called unconditionally (Rules of Hooks).
  // `isSupabaseConfigured` is a module constant so the branch is stable.
  const supabaseChat = useSupabaseChat(enabled && isSupabaseConfigured);
  const sseChat = useStreamChat(enabled && !isSupabaseConfigured);
  return isSupabaseConfigured ? supabaseChat : sseChat;
}
