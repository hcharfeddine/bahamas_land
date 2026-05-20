import { useEffect } from "react";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "");
const PING_INTERVAL_MS   = 14 * 60 * 1000;
const GRANT_RETRY_MS     =  5 * 60 * 1000;

function retryGrants() {
  import("@/lib/achievements")
    .then((m) => m.retryPendingGrants())
    .catch(() => {});
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

  // --- Achievement grant retry (always runs, uses Supabase directly) --------
  useEffect(() => {
    // Fire once on startup after a short delay (catches achievements unlocked
    // in a previous session before the player had a registered account)
    const startupTimer = window.setTimeout(retryGrants, 5_000);

    // Then keep retrying every 5 minutes so any network blip is healed quickly
    const id = window.setInterval(retryGrants, GRANT_RETRY_MS);

    // Also retry whenever the user comes back to the tab
    const onVisible = () => {
      if (document.visibilityState === "visible") retryGrants();
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
