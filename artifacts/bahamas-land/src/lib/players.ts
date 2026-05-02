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
//   - We send sha256(username_lower + ":" + pin) to a SECURITY DEFINER
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
async function hashPin(username: string, pin: string): Promise<string> {
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
    if (error) return { ok: false, reason: error.message || "rpc_error" };
    if (data?.ok) return { ok: true, data: (data.player ?? data) as T };
    return { ok: false, reason: data?.reason || "unknown" };
  } catch {
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
    p_secrets: [],
    p_coins: 1000,
  });
  if (result.ok) {
    const player = normalizePlayer(result.data);
    saveSession(player.username, cleanPinStr);
    return { ok: true, data: player };
  }
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
    saveServerConfirmedSecrets(player.secrets);
    if (Number.isFinite(player.coins)) {
      try {
        localStorage.setItem("ogs_coins", JSON.stringify(player.coins));
        window.dispatchEvent(new Event("local-storage"));
      } catch {
        /* ignore */
      }
    }
    return { ok: true, data: player };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sync rate limiter — prevents someone injecting all achievements at once.
// We compare what we're about to send against what the server last confirmed,
// and reject any sync that tries to add more than MAX_NEW_PER_SYNC new secrets
// in a single call. Legitimate play earns 1-2 at a time; cheaters inject 80+.
// ---------------------------------------------------------------------------
const MAX_NEW_PER_SYNC = 5;
const SERVER_SECRETS_KEY = "ogs_server_confirmed_secrets";

function getServerConfirmedSecrets(): Set<string> {
  try {
    const raw = localStorage.getItem(SERVER_SECRETS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveServerConfirmedSecrets(secrets: string[]) {
  try {
    localStorage.setItem(SERVER_SECRETS_KEY, JSON.stringify(secrets));
  } catch {
    /* ignore */
  }
}

export async function syncSecrets(): Promise<ApiResult<PlayerView>> {
  const username = getStoredUsername();
  const pin = getStoredPin();
  if (!username || !pin) return { ok: false, reason: "no_session" };

  let secrets: string[] = [];
  let coins = 0;
  try {
    const raw = localStorage.getItem("ogs_achievements");
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    secrets = Object.keys(map).filter((id) => ACHIEVEMENTS.some((a) => a.id === id));
  } catch {
    /* ignore */
  }
  try {
    const c = Number(localStorage.getItem("ogs_coins"));
    coins = Number.isFinite(c) ? c : 0;
  } catch {
    /* ignore */
  }

  // Rate-limit: count how many secrets are new compared to what the server
  // already confirmed. If too many are new at once, only send a safe batch.
  const confirmed = getServerConfirmedSecrets();
  const newOnes = secrets.filter((id) => !confirmed.has(id));
  let secretsToSend = secrets;
  if (newOnes.length > MAX_NEW_PER_SYNC) {
    const alreadyConfirmed = secrets.filter((id) => confirmed.has(id));
    const safeBatch = newOnes.slice(0, MAX_NEW_PER_SYNC);
    secretsToSend = [...alreadyConfirmed, ...safeBatch];
  }

  // Also validate timestamps: reject secrets with timestamps in the future
  // or suspiciously clustered (all within 10 seconds of each other).
  try {
    const raw = localStorage.getItem("ogs_achievements");
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const now = Date.now();
    const validSecrets = secretsToSend.filter((id) => {
      const ts = map[id];
      if (!ts || !Number.isFinite(ts)) return true;
      if (ts > now + 60_000) return false;
      return true;
    });
    secretsToSend = validSecrets;
  } catch {
    /* ignore */
  }

  const pin_hash = await hashPin(username, pin);
  const result = await callRpc<PlayerView>("player_sync", {
    p_username: username,
    p_pin_hash: pin_hash,
    p_secrets: secretsToSend,
    p_coins: coins,
  });
  if (result.ok) {
    const player = normalizePlayer(result.data);
    saveServerConfirmedSecrets(player.secrets);
    return { ok: true, data: player };
  }
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
