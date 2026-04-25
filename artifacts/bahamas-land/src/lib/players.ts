// =============================================================================
// players.ts — talks to /__player/* (the playerMiddleware backend) and
// keeps a tiny session in localStorage so the user stays logged in.
//
// Storage keys:
//   ogs_v2_setup           "1" once the citizen has registered/logged in.
//   ogs_v2_username        the canonical username on file.
//   ogs_v2_pin             the PIN, kept locally so we can re-auth on each
//                          sync without prompting. (This is a satirical game,
//                          not a bank — see the joke "card number" field.)
// =============================================================================

import { ACHIEVEMENTS } from "@/lib/achievements";

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

function apiBase(): string {
  const base = (import.meta as any).env?.BASE_URL || "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // 5xx and 4xx (other than the JSON 200 responses below) signal that the
    // request never reached the playerMiddleware — usually because the tab is
    // running a stale bundle whose URL points at a path now owned by another
    // service. Surface a distinct reason so the UI can tell the citizen to
    // refresh instead of silently retrying forever.
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      return { ok: false, reason: "bad_response" };
    }
    if (data?.ok) return { ok: true, data: (data.player ?? data) as T };
    return { ok: false, reason: data?.reason || "unknown" };
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}

export async function registerPlayer(
  username: string,
  pin: string,
  cardJoke?: string,
): Promise<ApiResult<PlayerView>> {
  const result = await post<PlayerView>("/__player/register", {
    username,
    pin,
    cardJoke: cardJoke || undefined,
    secrets: [],
    coins: 1000,
  });
  if (result.ok) saveSession(result.data.username, pin);
  return result;
}

export async function loginPlayer(
  username: string,
  pin: string,
): Promise<ApiResult<PlayerView>> {
  const result = await post<PlayerView>("/__player/login", { username, pin });
  if (result.ok) {
    saveSession(result.data.username, pin);
    // Pull cloud secrets down into localStorage so the UI shows them.
    hydrateLocalSecrets(result.data.secrets);
    if (Number.isFinite(result.data.coins)) {
      try {
        localStorage.setItem("ogs_coins", JSON.stringify(result.data.coins));
        window.dispatchEvent(new Event("local-storage"));
      } catch {
        /* ignore */
      }
    }
  }
  return result;
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

  return post<PlayerView>("/__player/sync", { username, pin, secrets, coins });
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
  try {
    const res = await fetch(`${apiBase()}/__player/leaderboard`);
    const data = await res.json();
    if (data?.ok) {
      return { total: data.total ?? 0, ranking: data.ranking ?? [] };
    }
  } catch {
    /* ignore */
  }
  return { total: 0, ranking: [] };
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
