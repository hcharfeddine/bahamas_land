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
    // Fire on startup — runs bulk migration + full sync for logged-in players.
    // 2 s gives Supabase client time to initialise before we hit any RPCs.
    const startupTimer = window.setTimeout(syncAll, 2_000);

    // Repeat every 5 minutes
    const id = window.setInterval(syncAll, SYNC_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // User returned to the tab — sync any achievements missed while away
        syncAll();
      } else {
        // Tab hidden / page closing — best-effort flush of pending tokens
        // (Problem 2 fix: catches the gap between p_sync_grant and syncSecrets)
        import("@/lib/players")
          .then((m) => m.syncSecrets())
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(startupTimer);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
