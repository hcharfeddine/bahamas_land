import { useEffect } from "react";

const API_URL          = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "");
const PING_INTERVAL_MS = 14 * 60 * 1000;
const SYNC_INTERVAL_MS =  5 * 60 * 1000;

// Retry any achievements without server tokens (fresh HMAC each time)
function retryGrants() {
  import("@/lib/achievements")
    .then((m) => m.retryPendingGrants())
    .catch(() => {});
}

// Full cycle: bulk-migrate → retry missing tokens → push/pull from server
async function syncAll() {
  try {
    const players = await import("@/lib/players");
    // 1. Bulk migration — sends ALL local achievements to DB bypassing tokens.
    //    Runs once per device (self-marks as done in localStorage).
    await players.bulkSyncAchievements();
    // 2. Regular sync — pushes tokens and pulls confirmed achievements back.
    await players.syncSecrets();
  } catch { /* ignore */ }

  try {
    const achievements = await import("@/lib/achievements");
    // 3. Retry any that still don't have tokens (picks up anything new since bulk)
    await achievements.retryPendingGrants();
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
    // Fire on startup after a short delay — runs the full sync cycle for
    // every logged-in player, including the one-time bulk migration
    const startupTimer = window.setTimeout(syncAll, 5_000);

    // Repeat every 5 minutes
    const id = window.setInterval(syncAll, SYNC_INTERVAL_MS);

    // Also sync when the user returns to the tab
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
