import { useEffect } from "react";

const API_URL        = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "");
const PING_INTERVAL_MS = 14 * 60 * 1000;
const SYNC_INTERVAL_MS =  5 * 60 * 1000;

// Retry any achievements without server tokens (fresh HMAC each time)
function retryGrants() {
  import("@/lib/achievements")
    .then((m) => m.retryPendingGrants())
    .catch(() => {});
}

// Full sync: push tokens → receive back confirmed achievement list from server.
// This restores achievements that are in the DB but got wiped from localStorage.
function fullSync() {
  import("@/lib/players")
    .then((m) => m.syncSecrets())
    .catch(() => {});
}

// Combined: get missing tokens first, then sync to/from server
async function syncAll() {
  try {
    const achievements = await import("@/lib/achievements");
    await achievements.retryPendingGrants();
  } catch { /* ignore */ }
  try {
    const players = await import("@/lib/players");
    await players.syncSecrets();
  } catch { /* ignore */ }
}

export function KeepAlive() {
  // --- Render keep-alive ping (only when API_URL is configured) -------------
  useEffect(() => {
    if (!API_URL) return;

    const ping = async () => {
      try {
        await fetch(`${API_URL}/api/healthz`, {
          method: "GET",
          signal: AbortSignal.timeout(10_000),
        });
        // Backend is awake — retry any achievement grants that previously failed
        retryGrants();
      } catch {
        // Ignore — just keeping the backend warm
      }
    };

    ping();
    const id = window.setInterval(ping, PING_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // --- Achievement sync (always runs, uses Supabase directly) ---------------
  useEffect(() => {
    // On startup: retry missing tokens, then do a full sync.
    // This recovers achievements that are in the DB but were wiped from
    // localStorage, and pushes any locally-unlocked but unsynced achievements
    // up to the server — all without requiring a logout/login.
    const startupTimer = window.setTimeout(syncAll, 5_000);

    // Keep syncing every 5 minutes so any gap heals automatically
    const id = window.setInterval(syncAll, SYNC_INTERVAL_MS);

    // Also sync when the user comes back to the tab
    const onVisible = () => {
      if (document.visibilityState === "visible") syncAll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(startupTimer);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
