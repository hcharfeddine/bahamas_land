// =============================================================================
// players.ts — citizen registry, talks DIRECTLY to Supabase (no /api server).
//
// Why no API routes? The site is deployed as a static SPA on Vercel/Render,
// so there is no Node server to host /api/* endpoints. Supabase plays the
// role of backend for everything else (chat, court, museum) — the player
// registry now follows the same pattern.
//
// PIN security:
//   - Plaintext PIN never leaves the browser.
//   - We send sha256(username_lower ":" pin) to a SECURITY DEFINER
//     RPC that compares it against the stored hash.
//
// Storage keys (localStorage):
//   ogs_v2_setup     "1" once the citizen has registered/logged in
//   ogs_v2_username  the canonical username on file
//   ogs_v2_pin       the PIN, kept locally so we can re-auth on each sync
// =============================================================================

import { ACHIEVEMENTS } from "@/lib/achievements";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const PLAYER_SETUP_KEY = "ogs_v2_setup";
export const PLAYER_USERNAME_KEY = "ogs_v2_username";
export const PLAYER_PIN_KEY = "ogs_v2_pin";
export const PLAYER_BANNED_KEY = "ogs_v2_banned";

// ---------------------------------------------------------------------------
// Ban state — stored locally so banned users see a block screen immediately
// ---------------------------------------------------------------------------
export function markBanned(reason = "banned") {
  try { localStorage.setItem(PLAYER_BANNED_KEY, reason); } catch { /* ignore */ }
  clearSession();
}

export function isBanned(): boolean {
  try { return !!localStorage.getItem(PLAYER_BANNED_KEY); } catch { return false; }
}

export function getBanReason(): string {
  try { return localStorage.getItem(PLAYER_BANNED_KEY) || "banned"; } catch { return "banned"; }
}

export type PlayerView = {
  username: string;
  secrets: string[];
  secretsCount: number;
  coins: number;
  cardJoke: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// PIN hashing — SHA-256(username_lower ":" pin), hex.
// ---------------------------------------------------------------------------
export async function hashPin(username: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${username.trim().toLowerCase()}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePlayer(raw: any): PlayerView {
  return {
    username: String(raw?.username ?? ""),
    secrets: Array.isArray(raw?.secrets) ? raw.secrets.map(String) : [],
    secretsCount: Number(raw?.secretsCount ?? raw?.secrets_count ?? 0),
    coins: Number(raw?.coins ?? 0),
    cardJoke: raw?.cardJoke ?? raw?.card_joke ?? null,
    createdAt: Number(raw?.createdAt ?? raw?.created_at ?? 0),
    updatedAt: Number(raw?.updatedAt ?? raw?.updated_at ?? 0),
  };
}

async function callRpc<T>(
  fn: string,
  args: Record<string, unknown>,
): Promise<ApiResult<T>> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reason: "no_backend" };
  }
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
    
      return { ok: false, reason: error.message || "rpc_error" };
    }
    
    if (data?.ok) return { ok: true, data: (data.player ?? data) as T };
    return { ok: false, reason: data?.reason || "unknown" };
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}

// ---------------------------------------------------------------------------
// Public API — same signatures as before, so callers don't need to change.
// ---------------------------------------------------------------------------

export async function registerPlayer(
  username: string,
  pin: string,
  cardJoke?: string,
): Promise<ApiResult<PlayerView>> {
  const cleanName = username.trim();
  const cleanPinStr = pin.replace(/\D/g, "").slice(0, 6);
  if (cleanName.length < 2) return { ok: false, reason: "bad_username" };
  if (cleanPinStr.length < 4) return { ok: false, reason: "bad_pin" };

  const safeJoke =
    typeof cardJoke === "string" ? cardJoke.replace(/\d/g, "*").slice(0, 24) : "";

  const pin_hash = await hashPin(cleanName, cleanPinStr);
  const result = await callRpc<PlayerView>("player_register", {
    p_username: cleanName,
    p_pin_hash: pin_hash,
    p_card_joke: safeJoke,
  });
  if (result.ok) {
    const player = normalizePlayer(result.data);
    saveSession(player.username, cleanPinStr);
    // Retry any achievements unlocked before the player registered
    import("@/lib/achievements").then((m) => m.retryPendingGrants()).catch(() => {});
    return { ok: true, data: player };
  }
  if (!result.ok && result.reason === "banned") markBanned(result.reason);
  return result;
}

export async function loginPlayer(
  username: string,
  pin: string,
): Promise<ApiResult<PlayerView>> {
  const cleanName = username.trim();
  const cleanPinStr = pin.replace(/\D/g, "").slice(0, 6);
  if (cleanName.length < 2) return { ok: false, reason: "bad_username" };
  if (cleanPinStr.length < 4) return { ok: false, reason: "bad_pin" };

  const pin_hash = await hashPin(cleanName, cleanPinStr);
  const result = await callRpc<PlayerView>("player_login", {
    p_username: cleanName,
    p_pin_hash: pin_hash,
  });
  if (result.ok) {
    const player = normalizePlayer(result.data);
    saveSession(player.username, cleanPinStr);
    hydrateLocalSecrets(player.secrets);
    if (Number.isFinite(player.coins)) {
      try {
        localStorage.setItem("ogs_coins", JSON.stringify(player.coins));
        window.dispatchEvent(new Event("local-storage"));
      } catch {
        /* ignore */
      }
    }
    // Restore any tokens already issued in previous sessions so syncs still work
    hydrateLocalTokens(cleanName, pin_hash);
    // Retry any achievements that failed to get tokens in previous sessions
    import("@/lib/achievements").then((m) => m.retryPendingGrants()).catch(() => {});
    return { ok: true, data: player };
  }
  if (!result.ok && result.reason === "banned") markBanned(result.reason);
  return result;
}

// ---------------------------------------------------------------------------
// Sync — token-based achievement verification.
//
// Tokens are issued ONLY when unlock() fires in the real game code
// (achievements.ts → requestAchievementToken → unlock_achievement RPC).
// Editing localStorage directly never triggers unlock(), so no token is
// ever issued → player_sync rejects it.
//
// Flow:
//   1. Read tokens from ogs_achievement_tokens (written by unlock()).
//   2. Call player_sync() with the (id, token) pairs.
//      Server verifies each token exists in achievement_grants.
// ---------------------------------------------------------------------------

export async function syncSecrets(): Promise<ApiResult<PlayerView>> {
  const username = getStoredUsername();
  const pin = getStoredPin();
  if (!username || !pin) return { ok: false, reason: "no_session" };
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: "no_backend" };

  let coins = 0;
  try {
    const c = Number(localStorage.getItem("ogs_coins"));
    coins = Number.isFinite(c) ? c : 0;
  } catch {
    /* ignore */
  }

  const pin_hash = await hashPin(username, pin);

  // Read tokens stored by requestAchievementToken() when real game events fired.
  // A cheater who edits ogs_achievements in localStorage gets no tokens here
  // because they never triggered unlock() → no token was ever issued → rejected.
  let grants: Array<{ id: string; token: string }> = [];
  try {
    const raw = localStorage.getItem("ogs_achievement_tokens");
    const tokenMap = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    grants = Object.entries(tokenMap)
      .filter(
        ([id, token]) =>
          typeof token === "string" &&
          token.length > 10 &&
          ACHIEVEMENTS.some((a) => a.id === id),
      )
      .map(([id, token]) => ({ id, token }));
  } catch {
    /* ignore */
  }

  const result = await callRpc<PlayerView>("player_sync", {
    p_username: username,
    p_pin_hash: pin_hash,
    p_grants: grants,
    p_coins: coins,
  });

  if (result.ok) {
    const player = normalizePlayer(result.data);
    hydrateLocalSecrets(player.secrets);
    return { ok: true, data: player };
  }
  if (!result.ok && result.reason === "banned") markBanned(result.reason);
  return result;
}

export type LeaderboardRow = {
  rank: number;
  username: string;
  secretsCount: number;
  coins: number;
  joinedAt: number;
};

export async function fetchLeaderboard(): Promise<{
  total: number;
  ranking: LeaderboardRow[];
}> {
  if (!isSupabaseConfigured || !supabase) return { total: 0, ranking: [] };
  try {
    const { data, error } = await supabase.rpc("players_leaderboard");
    if (error || !data?.ok) return { total: 0, ranking: [] };
    const ranking: LeaderboardRow[] = Array.isArray(data.ranking)
      ? data.ranking.map((r: any) => ({
          rank: Number(r.rank ?? 0),
          username: String(r.username ?? ""),
          secretsCount: Number(r.secretsCount ?? 0),
          coins: Number(r.coins ?? 0),
          joinedAt: Number(r.joinedAt ?? 0),
        }))
      : [];
    return { total: Number(data.total ?? 0), ranking };
  } catch {
    return { total: 0, ranking: [] };
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export function saveSession(username: string, pin: string) {
  try {
    localStorage.setItem(PLAYER_SETUP_KEY, "1");
    localStorage.setItem(PLAYER_USERNAME_KEY, username);
    localStorage.setItem(PLAYER_PIN_KEY, pin);
    // Mirror the canonical username into the legacy slot the rest of the app
    // already reads (Layout, etc.) so the HUD renders without changes.
    localStorage.setItem("ogs_username", JSON.stringify(username));
    window.dispatchEvent(new Event("local-storage"));
  } catch {
    /* ignore */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(PLAYER_SETUP_KEY);
    localStorage.removeItem(PLAYER_USERNAME_KEY);
    localStorage.removeItem(PLAYER_PIN_KEY);
  } catch {
    /* ignore */
  }
}

export function isSetupComplete(): boolean {
  try {
    return localStorage.getItem(PLAYER_SETUP_KEY) === "1";
  } catch {
    return false;
  }
}

export function getStoredUsername(): string {
  try {
    return localStorage.getItem(PLAYER_USERNAME_KEY) || "";
  } catch {
    return "";
  }
}

export function getStoredPin(): string {
  try {
    return localStorage.getItem(PLAYER_PIN_KEY) || "";
  } catch {
    return "";
  }
}

function hydrateLocalSecrets(secrets: string[]) {
  try {
    const raw = localStorage.getItem("ogs_achievements");
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    let changed = false;
    for (const id of secrets) {
      if (!map[id]) {
        map[id] = Date.now();
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("ogs_achievements", JSON.stringify(map));
      window.dispatchEvent(new CustomEvent("achievement-change"));
    }
  } catch {
    /* ignore */
  }
}

// On login: fetch any tokens already issued server-side in previous sessions
// and store them in ogs_achievement_tokens so syncSecrets() works immediately.
// After hydrating, clean up fake achievements that were injected after the
// token system launched and never received a server-issued token.
// Fire-and-forget — login is not blocked by this.
async function hydrateLocalTokens(username: string, pin_hash: string) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data } = await supabase.rpc("get_player_tokens", {
      p_username: username,
      p_pin_hash: pin_hash,
    });
    if (!data || typeof data !== "object" || (data as Record<string, string>).error) return;
    const incoming = data as Record<string, string>;
    const raw = localStorage.getItem("ogs_achievement_tokens");
    const existing: Record<string, string> = raw ? JSON.parse(raw) : {};
    let changed = false;
    for (const [id, token] of Object.entries(incoming)) {
      if (!existing[id] && typeof token === "string" && token.length > 10) {
        existing[id] = token;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("ogs_achievement_tokens", JSON.stringify(existing));
    }
    // After tokens are up to date, remove fakes
    cleanupFakeAchievements(existing);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Fake achievement cleanup
//
// Any achievement that:
//   1. Was added AFTER the token system launched (TOKEN_SYSTEM_START), AND
//   2. Has sat for more than FAKE_TTL_MS without receiving a server token
// is considered fraudulent and removed from localStorage.
//
// Achievements that pre-date the token system are NEVER touched — this
// protects every player who had real progress before this security layer
// was introduced.
// ---------------------------------------------------------------------------

// The date the HMAC token system went live. Achievements with a stored
// timestamp older than this are legacy-legitimate and are never cleaned up.
const TOKEN_SYSTEM_START = new Date("2025-05-06T00:00:00Z").getTime();

// How long a token-less achievement is tolerated before being removed.
// 7 days gives legitimate players time to retry even if the backend was down
// or they were offline when they first unlocked.
const FAKE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanupFakeAchievements(confirmedTokens: Record<string, string>) {
  try {
    const raw = localStorage.getItem("ogs_achievements");
    if (!raw) return;
    const achievements: Record<string, number> = JSON.parse(raw);
    const now = Date.now();

    // Any achievement that is still waiting for a retry should never be wiped.
    // retryPendingGrants() is called after login, so if the player is logged in
    // and the grant still fails it will be retried automatically.
    // We only clean up achievements that have no confirmed token AND no active
    // retry path — i.e. a logged-in user whose sync keeps failing for 7+ days.
    const hasSession = !!localStorage.getItem("ogs_v2_username");

    let changed = false;
    for (const [id, ts] of Object.entries(achievements)) {
      // Skip legacy achievements (existed before the token system)
      if (ts < TOKEN_SYSTEM_START) continue;
      // Skip achievements that already have a confirmed server token
      if (confirmedTokens[id]) continue;
      // If the player has an active session, retries will keep running — protect them
      if (hasSession) continue;
      // Remove token-less achievements for logged-out players after the TTL
      if (now - ts > FAKE_TTL_MS) {
        delete achievements[id];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("ogs_achievements", JSON.stringify(achievements));
      window.dispatchEvent(new CustomEvent("achievement-change"));
    }
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Migration: any visitor who was here BEFORE the citizen registry shipped
// is wiped to zero so everyone follows the same path. We detect the v1 era
// by the presence of the legacy username slot (or any v1 achievements) AND
// the absence of v2 setup.
// ---------------------------------------------------------------------------

const MIGRATION_KEY = "ogs_v2_migrated";

export function runMigrationIfNeeded() {
  try {
    if (localStorage.getItem(MIGRATION_KEY) === "1") return;
    if (isSetupComplete()) {
      // already on v2 — just stamp the flag.
      localStorage.setItem(MIGRATION_KEY, "1");
      return;
    }

    // Wipe v1 progress so the citizen restarts from zero.
    const wipeKeys = [
      "ogs_username",
      "ogs_achievements",
      "ogs_coins",
      "ogs_secret_visitors",
      "ogs_reward_claim",
      "ogs_visitor_id",
      "ogs_first_visit",
      "ogs_applause",
      "ogs_tomatoes",
      "ogs_boos",
    ];
    for (const k of wipeKeys) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(MIGRATION_KEY, "1");
    window.dispatchEvent(new Event("local-storage"));
  } catch {
    /* ignore */
  }
}
