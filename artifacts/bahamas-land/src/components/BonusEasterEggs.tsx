import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { unlock, isUnlocked } from "@/lib/achievements";

// ============================================================================
// BONUS EASTER EGGS
// ----------------------------------------------------------------------------
// 1. harrag        — try to leave the viewport upward 3 times
// 2. taxi_driver   — sweep mouse from left edge to right edge in <200ms
// 3. raja3_ghodwa  — visit /passport during 13:00-14:00, stay 60s
// 4. mrigel        — type "mrigel" anywhere
// 5. ussd_pro      — type "*100#" anywhere
// 6. tab_hoarder   — be opened in 5+ tabs at once
// (bark_code lives in main.tsx as nattoun.bark())
// ============================================================================

export function BonusEasterEggs() {
  const [location] = useLocation();
  const [lunchOverlay, setLunchOverlay] = useState(false);
  const [lunchSeconds, setLunchSeconds] = useState(0);

  // -------------------------------------------------------------------------
  // 1. HARRAG — count attempts to leave viewport upward (toward tab bar)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isUnlocked("harrag")) return;
    let count = 0;
    let lastY = 999;
    let lastT = 0;
    const onMove = (e: MouseEvent) => {
      lastY = e.clientY;
      lastT = performance.now();
    };
    const onLeave = (e: MouseEvent) => {
      // mouseout with no related target = left the document area
      if ((e as any).relatedTarget) return;
      // Only count exits from the TOP edge (mouse was high & moving up).
      const wasNearTop = lastY < 80;
      const recently = performance.now() - lastT < 250;
      if (wasNearTop && recently) {
        count += 1;
        if (count >= 3) {
          unlock("harrag");
        }
      }
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  // -------------------------------------------------------------------------
  // 2. TAXI DRIVER — left edge to right edge in <200ms
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isUnlocked("taxi_driver")) return;
    let leftHitT = 0;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const xPct = e.clientX / w;
      const now = performance.now();
      if (xPct < 0.05) {
        leftHitT = now;
      } else if (xPct > 0.95 && leftHitT > 0) {
        if (now - leftHitT < 200) {
          unlock("taxi_driver");
        }
        leftHitT = 0;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // -------------------------------------------------------------------------
  // 3. RAJA3 GHODWA — /passport between 13:00-14:00, stay 60s
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isUnlocked("raja3_ghodwa")) {
      setLunchOverlay(false);
      return;
    }
    const onPassport = location === "/passport" || location.startsWith("/passport");
    const hour = new Date().getHours();
    const isLunch = hour === 13;
    if (!onPassport || !isLunch) {
      setLunchOverlay(false);
      setLunchSeconds(0);
      return;
    }
    setLunchOverlay(true);
    setLunchSeconds(0);
    let secs = 0;
    const t = window.setInterval(() => {
      secs += 1;
      setLunchSeconds(secs);
      if (secs >= 60) {
        unlock("raja3_ghodwa");
        window.clearInterval(t);
        setLunchOverlay(false);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [location]);

  // -------------------------------------------------------------------------
  // 4 + 5. KEYBOARD WORDS: "mrigel" and "*100#"
  // -------------------------------------------------------------------------
  useEffect(() => {
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      // Ignore typing inside text fields.
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          (tgt as HTMLElement).isContentEditable)
      ) {
        return;
      }
      const k = e.key;
      if (k.length !== 1) return;
      buf = (buf + k).slice(-32);
      const lower = buf.toLowerCase();
      if (!isUnlocked("mrigel") && lower.endsWith("mrigel")) {
        unlock("mrigel");
      }
      if (!isUnlocked("ussd_pro") && buf.endsWith("*100#")) {
        unlock("ussd_pro");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // -------------------------------------------------------------------------
  // 6. TAB HOARDER — 5+ tabs of Bahamas Land open at once
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isUnlocked("tab_hoarder")) return;
    if (typeof BroadcastChannel === "undefined") return;
    const myId = Math.random().toString(36).slice(2);
    const seen = new Map<string, number>();
    let bc: BroadcastChannel;
    try {
      bc = new BroadcastChannel("bahamas_tabs");
    } catch {
      return;
    }
    const announce = () => {
      try {
        bc.postMessage({ type: "ping", id: myId, t: Date.now() });
      } catch {
        /* ignore */
      }
    };
    const cleanupAndCheck = () => {
      const now = Date.now();
      for (const [id, t] of seen) {
        if (now - t > 4000) seen.delete(id);
      }
      const total = seen.size + 1; // include self
      if (total >= 5) {
        unlock("tab_hoarder");
      }
    };
    bc.onmessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string; id?: string };
      if (!data || !data.id || data.id === myId) return;
      if (data.type === "ping" || data.type === "pong") {
        seen.set(data.id, Date.now());
        cleanupAndCheck();
        if (data.type === "ping") {
          // Reply so newcomers learn we exist.
          try {
            bc.postMessage({ type: "pong", id: myId, t: Date.now() });
          } catch {
            /* ignore */
          }
        }
      }
    };
    announce();
    const ping = window.setInterval(announce, 1500);
    const sweep = window.setInterval(cleanupAndCheck, 1500);
    return () => {
      window.clearInterval(ping);
      window.clearInterval(sweep);
      try {
        bc.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // RAJA3 GHODWA — overlay shown only while at /passport during lunch hour
  // -------------------------------------------------------------------------
  return (
    <AnimatePresence>
      {lunchOverlay && (
        <motion.div
          key="lunch"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            background:
              "repeating-linear-gradient(45deg, #1a0f00 0 24px, #2b1700 24px 48px)",
            color: "#ffd76b",
            fontFamily: "monospace",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🍽️</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: 2,
                color: "#ff7a1a",
                textShadow: "0 0 12px rgba(255,122,26,0.6)",
              }}
            >
              ARJA3 GHODWA
            </div>
            <div style={{ fontSize: 18, marginTop: 8, opacity: 0.9 }}>
              The Passport Office is closed for lunch (13:00 — 14:00).
            </div>
            <div style={{ fontSize: 14, marginTop: 16, opacity: 0.7 }}>
              Stand in line. Earn the State's respect.
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: 2,
              }}
            >
              {lunchSeconds}s / 60s
            </div>
            <div
              style={{
                marginTop: 12,
                height: 8,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (lunchSeconds / 60) * 100)}%`,
                  background:
                    "linear-gradient(90deg, #ff7a1a, #ffd76b)",
                  transition: "width 0.5s linear",
                }}
              />
            </div>
            <div style={{ fontSize: 11, marginTop: 18, opacity: 0.55 }}>
              (Leave this page and the queue resets. The Administration sees all.)
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
