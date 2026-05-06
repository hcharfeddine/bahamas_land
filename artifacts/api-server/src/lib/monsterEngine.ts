import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";

// ─── Config ─────────────────────────────────────────────────────────────────
const CHANNEL_SLUG           = process.env["KICK_CHANNEL_SLUG"] || "m3kky";
const STREAM_POLL_MS         = 2 * 60 * 1000;    // check stream status every 2 min
const ACTIVITY_TICK_MS       = 5 * 60 * 1000;    // activity tick every 5 min
const INACTIVE_THRESHOLD_MS  = 10 * 60 * 1000;   // 10 min silence = inactivity damage

const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
const supabaseKey =
  process.env["SUPABASE_SERVICE_KEY"] ||
  process.env["SUPABASE_ANON_KEY"]    ||
  process.env["VITE_SUPABASE_ANON_KEY"] || "";

// ─── State ──────────────────────────────────────────────────────────────────
let _sbClient:      SupabaseClient | null = null;
let _streamPoll:    ReturnType<typeof setInterval> | null = null;
let _activityTick:  ReturnType<typeof setInterval> | null = null;
let _isStreamLive   = false;

function getClient(): SupabaseClient | null {
  if (_sbClient) return _sbClient;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    _sbClient = createClient(supabaseUrl, supabaseKey);
    return _sbClient;
  } catch { return null; }
}

// ─── Stream live check ───────────────────────────────────────────────────────
async function checkStreamLive(): Promise<boolean> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${CHANNEL_SLUG}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const data: any = await res.json();
    // livestream key is non-null when the channel is live
    return data?.livestream != null;
  } catch {
    return false;
  }
}

// ─── Activity tick ───────────────────────────────────────────────────────────
async function runActivityTick(): Promise<void> {
  const sb = getClient();
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc("monster_activity_tick", {
      p_inactive_threshold_ms: INACTIVE_THRESHOLD_MS,
    });
    if (error) {
      logger.warn({ error }, "[MonsterEngine] activity_tick RPC error");
    } else {
      logger.info({ updated: data, streamLive: _isStreamLive }, "[MonsterEngine] Activity tick");
    }
  } catch (err) {
    logger.warn({ err }, "[MonsterEngine] activity_tick exception");
  }
}

// ─── Stream poll handler ─────────────────────────────────────────────────────
async function pollStream(): Promise<void> {
  const wasLive = _isStreamLive;
  _isStreamLive = await checkStreamLive();

  if (_isStreamLive && !wasLive) {
    // Stream just went LIVE — start the activity tick loop
    logger.info("[MonsterEngine] Stream is LIVE — activity ticks started");
    void runActivityTick();   // immediate first tick
    _activityTick = setInterval(() => void runActivityTick(), ACTIVITY_TICK_MS);
  } else if (!_isStreamLive && wasLive) {
    // Stream just went OFFLINE — pause all monster updates
    logger.info("[MonsterEngine] Stream OFFLINE — activity ticks paused");
    if (_activityTick) { clearInterval(_activityTick); _activityTick = null; }
  } else {
    logger.debug({ live: _isStreamLive }, "[MonsterEngine] Stream status polled");
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────
export async function startDecayLoop(): Promise<void> {
  if (!supabaseUrl || !supabaseKey) {
    logger.warn("[MonsterEngine] Supabase not configured — engine disabled");
    return;
  }

  logger.info({ channel: CHANNEL_SLUG }, "[MonsterEngine] Starting stream-aware monster engine");

  // Initial stream check
  await pollStream();

  // Poll stream status every 2 min
  _streamPoll = setInterval(() => void pollStream(), STREAM_POLL_MS);
}

export function stopDecayLoop(): void {
  if (_streamPoll)   { clearInterval(_streamPoll);   _streamPoll   = null; }
  if (_activityTick) { clearInterval(_activityTick); _activityTick = null; }
  _isStreamLive = false;
  logger.info("[MonsterEngine] Stopped");
}

/** Read-only accessor used by health/status endpoints */
export function isStreamLive(): boolean {
  return _isStreamLive;
}
