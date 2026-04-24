import { useEffect, useState } from "react";

const CHANNEL = "m3kky";
const POLL_MS = 60_000;

export type KickStatus = "live" | "offline" | "unknown";

export function useKickStatus(): { status: KickStatus; viewers: number | null } {
  const [status, setStatus] = useState<KickStatus>("unknown");
  const [viewers, setViewers] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Try local serverless proxy first (works on Vercel). Fall back to direct
      // Kick fetch (likely to fail in browsers due to CORS — that's OK, badge hides).
      const baseUrl = (import.meta as any).env?.BASE_URL || "/";
      const candidates = [
        `${baseUrl}api/kick-status?slug=${CHANNEL}`,
        `https://kick.com/api/v2/channels/${CHANNEL}`,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
          if (!res.ok) continue;
          const data: any = await res.json();
          if (cancelled) return;
          // Proxy shape: { live, viewers }; Kick shape: { livestream: {...} }
          const live = typeof data.live === "boolean" ? data.live : Boolean(data?.livestream);
          const v =
            typeof data.viewers === "number"
              ? data.viewers
              : typeof data?.livestream?.viewer_count === "number"
              ? data.livestream.viewer_count
              : null;
          setStatus(live ? "live" : "offline");
          setViewers(live ? v : null);
          return;
        } catch {
          // try next candidate
        }
      }
      if (!cancelled) {
        setStatus("unknown");
        setViewers(null);
      }
    };

    check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { status, viewers };
}
