import { useEffect, useRef } from "react";

const BASE = import.meta.env.BASE_URL;
const VERSION_URL = `${BASE}api/chat/version`;
const POLL_MS = 30_000;
const STORAGE_KEY = "bahamas_build_id";

export function AutoReload() {
  const knownIdRef = useRef<string | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const doReload = (reason: string) => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      try {
        sessionStorage.setItem("bahamas_reload_reason", reason);
      } catch {}
      window.location.reload();
    };

    const check = async () => {
      try {
        const res = await fetch(VERSION_URL, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { buildId?: string };
        const id = data?.buildId;
        if (!id) return;

        if (knownIdRef.current === null) {
          let stored: string | null = null;
          try {
            stored = sessionStorage.getItem(STORAGE_KEY);
          } catch {}
          if (stored && stored !== id) {
            try {
              sessionStorage.setItem(STORAGE_KEY, id);
            } catch {}
            knownIdRef.current = id;
            doReload("server-restart");
            return;
          }
          knownIdRef.current = id;
          try {
            sessionStorage.setItem(STORAGE_KEY, id);
          } catch {}
          return;
        }

        if (id !== knownIdRef.current) {
          try {
            sessionStorage.setItem(STORAGE_KEY, id);
          } catch {}
          knownIdRef.current = id;
          doReload("new-build");
        }
      } catch {
        // network blip — ignore
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        await check();
        schedule();
      }, POLL_MS);
    };

    check();
    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    const checkMidnight = () => {
      const now = new Date();
      if (
        now.getHours() === 0 &&
        now.getMinutes() === 0 &&
        now.getSeconds() < 30
      ) {
        doReload("midnight-client");
      }
    };
    const midnightTimer = window.setInterval(checkMidnight, 15_000);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.clearInterval(midnightTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
