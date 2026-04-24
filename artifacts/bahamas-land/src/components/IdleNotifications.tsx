import { useEffect, useRef } from "react";
import { audio } from "@/lib/audio";

// ============================================================================
// IDLE NOTIFICATIONS
// ============================================================================
// If the page has been idle / blurred for 5 minutes, the President starts
// pinging the user:
//   - Plays a "message arrived" tone
//   - Flashes the document title between alert messages
//   - Switches the favicon to a red dot variant
//   - Tries to send a Web Notification (if permission was granted)
// If the user STILL doesn't return, escalation kicks in: more frequent pings,
// louder taunts, and a sustained title spam loop.
// Coming back to the tab cancels everything and restores the original state.
// ============================================================================

const IDLE_MS = 5 * 60 * 1000; // 5 minutes
const PING_EVERY_MS = 12_000; // first phase
const ESCALATE_AFTER_MS = 90_000; // escalate after 90s of pinging
const ESCALATED_PING_MS = 4_500;

const FIRST_LINES = [
  "📢 Nattoun is calling…",
  "🐶 The President misses you.",
  "📨 New message from Bahamas Land",
  "👁 We see the other tab.",
  "🚨 Where did you go?",
  "💌 [1] Open the tab. Now.",
];
const SPAM_LINES = [
  "🚨🚨 EXILE PENDING",
  "‼ Citizen, return.",
  "📢 LAST WARNING",
  "🐕 NATTOUN IS BARKING",
  "💔 You broke his little heart",
  "🔥 Bahamas Land is on fire (probably)",
  "🚓 Border patrol dispatched",
];

const RED_DOT_FAVICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='black'/><circle cx='16' cy='16' r='10' fill='%23ff2d2d'/><circle cx='16' cy='16' r='5' fill='white'/></svg>`,
  );

export function IdleNotifications() {
  const idleTimer = useRef<number | null>(null);
  const pingTimer = useRef<number | null>(null);
  const escalateTimer = useRef<number | null>(null);
  const titleTimer = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const originalTitle = useRef<string>(
    typeof document !== "undefined" ? document.title : "",
  );
  const originalFavicon = useRef<string | null>(null);
  const isPinging = useRef<boolean>(false);
  const escalated = useRef<boolean>(false);
  const lineIndex = useRef<number>(0);

  const setFavicon = (href: string | null) => {
    let link =
      (document.querySelector("link[rel*='icon']") as HTMLLinkElement | null) ??
      null;
    if (!originalFavicon.current && link) {
      originalFavicon.current = link.href;
    }
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (href === null) {
      // restore
      if (originalFavicon.current) link.href = originalFavicon.current;
    } else {
      link.href = href;
    }
  };

  const playPingSound = () => {
    try {
      audio.playCoin();
    } catch {
      /* ignore */
    }
  };

  const playSpamSound = () => {
    try {
      audio.playGlitch();
      window.setTimeout(() => audio.playBlip(), 120);
      window.setTimeout(() => audio.playBlip(), 240);
    } catch {
      /* ignore */
    }
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* user dismissed */
      }
    }
  };

  const tryNotify = (title: string, body: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body, icon: RED_DOT_FAVICON, silent: false });
    } catch {
      /* ignore */
    }
  };

  const startTitleFlash = () => {
    if (titleTimer.current) return;
    let toggle = false;
    titleTimer.current = window.setInterval(() => {
      const lines = escalated.current ? SPAM_LINES : FIRST_LINES;
      const line = lines[lineIndex.current % lines.length];
      document.title = toggle ? originalTitle.current : line;
      toggle = !toggle;
      lineIndex.current += 1;
    }, escalated.current ? 700 : 1400);
  };

  const stopTitleFlash = () => {
    if (titleTimer.current) {
      window.clearInterval(titleTimer.current);
      titleTimer.current = null;
    }
    document.title = originalTitle.current;
  };

  const ping = () => {
    if (!document.hidden) return; // only ping if tab is hidden
    const lines = escalated.current ? SPAM_LINES : FIRST_LINES;
    const line = lines[lineIndex.current % lines.length];
    if (escalated.current) {
      playSpamSound();
      tryNotify("🚨 BAHAMAS LAND ALERT", line);
    } else {
      playPingSound();
      tryNotify("📢 President Nattoun", line);
    }
  };

  const startPinging = () => {
    if (isPinging.current) return;
    isPinging.current = true;
    startedAt.current = Date.now();
    setFavicon(RED_DOT_FAVICON);
    startTitleFlash();
    ping();
    pingTimer.current = window.setInterval(ping, PING_EVERY_MS);
    escalateTimer.current = window.setTimeout(() => {
      escalated.current = true;
      // Restart loops on faster cadence
      if (pingTimer.current) window.clearInterval(pingTimer.current);
      pingTimer.current = window.setInterval(ping, ESCALATED_PING_MS);
      stopTitleFlash();
      startTitleFlash();
    }, ESCALATE_AFTER_MS);
  };

  const stopPinging = () => {
    if (pingTimer.current) {
      window.clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
    if (escalateTimer.current) {
      window.clearTimeout(escalateTimer.current);
      escalateTimer.current = null;
    }
    stopTitleFlash();
    setFavicon(null);
    isPinging.current = false;
    escalated.current = false;
    lineIndex.current = 0;
    startedAt.current = null;
  };

  const armIdle = () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      // We waited IDLE_MS. Only escalate to pinging if the tab is hidden.
      if (document.hidden) startPinging();
    }, IDLE_MS);
  };

  useEffect(() => {
    // Save original title once
    originalTitle.current = document.title;

    const onActivity = () => {
      // Only fully reset when the user is back on the tab
      if (!document.hidden) {
        stopPinging();
        armIdle();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        // Started looking at something else → arm the timer
        armIdle();
      } else {
        // Came back → cancel any spam
        stopPinging();
        if (idleTimer.current) {
          window.clearTimeout(idleTimer.current);
          idleTimer.current = null;
        }
        armIdle();
      }
    };

    const onFirstClick = () => {
      // We can only request notification permission after a user gesture
      requestPermission();
      window.removeEventListener("pointerdown", onFirstClick);
      window.removeEventListener("keydown", onFirstClick);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true } as any),
    );
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onFirstClick, { once: false });
    window.addEventListener("keydown", onFirstClick, { once: false });

    armIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onFirstClick);
      window.removeEventListener("keydown", onFirstClick);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      stopPinging();
    };
  }, []);

  return null;
}
