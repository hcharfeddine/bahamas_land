import WebSocket from "ws";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";

// ─── Config ────────────────────────────────────────────────────────────────
const PUSHER_APP_KEY   = "32cbd69e4b950bf97679";
const CHATROOM_ID      = 26294661;   // m3kky's chatroom (hardcoded for reliability)
const CHANNEL_SLUG     = process.env["KICK_CHANNEL_SLUG"] || "m3kky";
const KICK_BOT_TOKEN   = process.env["KICK_BOT_TOKEN"]   || "";

const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
// Bot MUST use the service role key — anon key cannot call bot-only RPCs
const supabaseKey = process.env["SUPABASE_SERVICE_KEY"] || "";

const RECONNECT_DELAY_MS       = 5_000;
const MAX_RECONNECT_ATTEMPTS   = 20;
const PLAYER_CACHE_REFRESH_MS  = 60_000;   // refresh active-monster player list every 60 s
const CHAT_EVENT_THROTTLE_MS   = 8_000;    // minimum gap between chat_event calls per player

// ─── Module state ───────────────────────────────────────────────────────────
let supabaseClient: SupabaseClient | null = null;
let reconnectAttempts = 0;
let stopped = false;

/** Set of kick_usernames that currently own a live monster */
const activePlayers = new Set<string>();

/** Timestamp of the last monster_chat_event call per player (throttle) */
const lastChatEvent = new Map<string, number>();

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (err) {
    logger.warn({ err }, "[KickBot] Supabase init failed");
    return null;
  }
}

// ─── Active player cache ────────────────────────────────────────────────────
async function refreshActivePlayers(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc("get_active_monster_players");
    if (error) { logger.warn({ error }, "[KickBot] refreshActivePlayers error"); return; }
    activePlayers.clear();
    for (const row of (data as Array<{ kick_username: string }>) || []) {
      activePlayers.add(row.kick_username.toLowerCase());
    }
    logger.debug({ count: activePlayers.size }, "[KickBot] Active player cache refreshed");
  } catch (err) {
    logger.warn({ err }, "[KickBot] refreshActivePlayers exception");
  }
}

// ─── Chat reply ─────────────────────────────────────────────────────────────
async function sendChat(content: string): Promise<void> {
  if (!KICK_BOT_TOKEN) return;
  try {
    await fetch(`https://kick.com/api/v2/messages/send/${CHATROOM_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KICK_BOT_TOKEN}`,
      },
      body: JSON.stringify({ content, type: "message" }),
    });
  } catch (err) {
    logger.warn({ err }, "[KickBot] Failed to send chat message");
  }
}

// ─── !monster command ───────────────────────────────────────────────────────
async function handleMonsterCommand(kickUsername: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc("monster_command", {
      p_kick_username: kickUsername,
      p_command: "monster",
    });
    if (error) { logger.warn({ error, kickUsername }, "[KickBot] monster_command error"); return; }

    const msg: string | null = data?.msg ?? null;
    if (msg) {
      logger.info({ kickUsername, msg }, "[KickBot] !monster processed");
      await sendChat(msg);
    }

    // If a new monster was just created, add to cache immediately
    if (data?.ok && !activePlayers.has(kickUsername)) {
      activePlayers.add(kickUsername);
    }
  } catch (err) {
    logger.warn({ err, kickUsername }, "[KickBot] handleMonsterCommand exception");
  }
}

// ─── Passive chat event ─────────────────────────────────────────────────────
async function handleChatActivity(kickUsername: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  // Throttle: don't hammer Supabase on every single message
  const now = Date.now();
  const last = lastChatEvent.get(kickUsername) ?? 0;
  if (now - last < CHAT_EVENT_THROTTLE_MS) return;
  lastChatEvent.set(kickUsername, now);

  try {
    const { data, error } = await sb.rpc("monster_chat_event", {
      p_kick_username: kickUsername,
    });
    if (error) { logger.warn({ error, kickUsername }, "[KickBot] monster_chat_event error"); return; }

    // Only log/reply when something notable happened (level up, stage change)
    const msg: string | null = data?.msg ?? null;
    if (msg) {
      logger.info({ kickUsername, msg }, "[KickBot] Monster notable event");
      await sendChat(msg);
    }
  } catch (err) {
    logger.warn({ err, kickUsername }, "[KickBot] handleChatActivity exception");
  }
}

// ─── Emoji-spam filter ──────────────────────────────────────────────────────
/**
 * Returns true only if the message contains real text (at least 2 non-emoji,
 * non-whitespace characters). Pure emoji blasts like "😂😂😂" are rejected.
 */
function isRealMessage(text: string): boolean {
  const stripped = text
    .replace(/\p{Extended_Pictographic}/gu, "") // remove pictographic emojis
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")    // remove flag sequences
    .replace(/[\u200D\uFE0F\u20E3]/gu, "")     // remove ZWJ / variation / keycap
    .replace(/\s/g, "");                         // remove whitespace
  return stripped.length >= 2;
}

// ─── WebSocket connection ───────────────────────────────────────────────────
function connectToKick(): void {
  if (stopped) return;

  const wsUrl    = `wss://ws-us2.pusher.com/app/${PUSHER_APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
  const channel  = `chatrooms.${CHATROOM_ID}.v2`;

  logger.info({ channel, slug: CHANNEL_SLUG }, "[KickBot] Connecting to Kick WebSocket");

  const ws = new WebSocket(wsUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Origin: "https://kick.com" },
  });

  let pingInterval: ReturnType<typeof setInterval> | null = null;

  ws.on("open", () => {
    logger.info("[KickBot] WebSocket connected");
    reconnectAttempts = 0;

    ws.send(JSON.stringify({
      event: "pusher:subscribe",
      data: { auth: "", channel },
    }));

    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: "pusher:ping", data: {} }));
      }
    }, 30_000);
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const frame = JSON.parse(raw.toString());
      if (frame.event !== "App\\Events\\ChatMessageEvent") return;

      const msgData = typeof frame.data === "string"
        ? JSON.parse(frame.data) : frame.data;

      const content: string = (msgData?.content || "").trim();
      const sender: string  = (msgData?.sender?.username || "").toLowerCase().trim();
      if (!sender) return;

      // Handle !monster command (case-insensitive)
      if (/^!monster\b/i.test(content)) {
        logger.info({ sender }, "[KickBot] !monster command");
        void handleMonsterCommand(sender);
        return;
      }

      // Passive: any message from a player with an active monster
      // Ignore emoji-only spam — only real text messages count
      if (activePlayers.has(sender) && isRealMessage(content)) {
        void handleChatActivity(sender);
      }
    } catch {
      /* ignore parse errors */
    }
  });

  ws.on("error", (err) => {
    logger.warn({ err: err.message }, "[KickBot] WebSocket error");
  });

  ws.on("close", (code, reason) => {
    if (pingInterval) clearInterval(pingInterval);
    logger.warn({ code, reason: reason.toString() }, "[KickBot] WebSocket closed");

    if (!stopped && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 6);
      logger.info({ attempt: reconnectAttempts, delay }, "[KickBot] Reconnecting…");
      setTimeout(() => connectToKick(), delay);
    }
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────
export async function startKickBot(): Promise<void> {
  logger.info({ slug: CHANNEL_SLUG, chatroomId: CHATROOM_ID }, "[KickBot] Starting Kick bot");

  if (!supabaseUrl || !supabaseKey) {
    logger.warn("[KickBot] Supabase not configured — monster DB calls will be skipped, WebSocket still connecting");
  } else {
    // Prime the active-player cache, then refresh it periodically
    await refreshActivePlayers();
    setInterval(() => void refreshActivePlayers(), PLAYER_CACHE_REFRESH_MS);
  }

  stopped = false;
  connectToKick();
}

export function stopKickBot(): void {
  stopped = true;
}
