import { useEffect, useRef } from "react";
import { unlock } from "@/lib/achievements";
import { audio } from "@/lib/audio";

// =============================================================================
// HiddenEggs — varied non-typed easter eggs
//
//  • Arrow-key compass:    ↑ ↑ ↓ ↓ ← → ← →
//  • Four-corners:         click TL → TR → BR → BL (clockwise) within 5s
//  • Painter:              draw a closed circle with a continuous mouse drag
//  • PresSnipe:            click any [data-nattoun="true"] image 7× rapidly
//
// Note: hover-hold "patient" lives on the Home page itself because it needs
// to attach to a specific target.
// =============================================================================

const COMPASS = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
];

function flash(text: string, sub?: string) {
  window.dispatchEvent(
    new CustomEvent("egg-flash", { detail: { text, sub } }),
  );
}

export function HiddenEggs() {
  // ---------------------------------------------------------------------------
  // Arrow-key COMPASS sequence
  // ---------------------------------------------------------------------------
  const compassIdx = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isTyping) return;
      if (!e.key.startsWith("Arrow")) return;
      if (e.key === COMPASS[compassIdx.current]) {
        compassIdx.current += 1;
        if (compassIdx.current === COMPASS.length) {
          compassIdx.current = 0;
          unlock("compass");
          flash("🧭 COMPASS ALIGNED", "You found true north. Sort of.");
          try { audio.playCoin(); } catch { /* ignore */ }
        }
      } else {
        compassIdx.current = e.key === COMPASS[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------------------------------------------------------------------------
  // FOUR-CORNERS click sequence (TL → TR → BR → BL within 5s)
  // ---------------------------------------------------------------------------
  const cornerIdx = useRef(0);
  const cornerStart = useRef(0);
  useEffect(() => {
    const PADDING = 80; // px from edge counted as a "corner"
    const onClick = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = e.clientX;
      const y = e.clientY;
      const inTL = x <= PADDING && y <= PADDING;
      const inTR = x >= w - PADDING && y <= PADDING;
      const inBR = x >= w - PADDING && y >= h - PADDING;
      const inBL = x <= PADDING && y >= h - PADDING;
      const expected = [inTL, inTR, inBR, inBL][cornerIdx.current];
      if (expected) {
        if (cornerIdx.current === 0) cornerStart.current = Date.now();
        cornerIdx.current += 1;
        if (cornerIdx.current === 4) {
          cornerIdx.current = 0;
          if (Date.now() - cornerStart.current <= 5000) {
            unlock("cornerguard");
            flash("🔲 FOUR CORNERS SECURED", "The state thanks you.");
            try { audio.playCoin(); } catch { /* ignore */ }
          }
        }
      } else if (inTL || inTR || inBR || inBL) {
        // Restart sequence if a corner was hit out of order
        cornerIdx.current = inTL ? 1 : 0;
        cornerStart.current = inTL ? Date.now() : 0;
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  // ---------------------------------------------------------------------------
  // PAINTER — draw a closed circle by mouse drag (~360° rotation)
  // ---------------------------------------------------------------------------
  const painter = useRef<{
    points: { x: number; y: number; t: number }[];
    drawing: boolean;
  }>({ points: [], drawing: false });
  useEffect(() => {
    const MIN_POINTS = 24;
    const onDown = (e: MouseEvent) => {
      // ignore right-click & inputs
      if (e.button !== 0) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button") return;
      painter.current = {
        points: [{ x: e.clientX, y: e.clientY, t: Date.now() }],
        drawing: true,
      };
    };
    const onMove = (e: MouseEvent) => {
      if (!painter.current.drawing) return;
      painter.current.points.push({
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
      });
      if (painter.current.points.length > 800) {
        painter.current.points = painter.current.points.slice(-600);
      }
    };
    const onUp = () => {
      const pts = painter.current.points;
      painter.current.drawing = false;
      if (pts.length < MIN_POINTS) return;
      const duration = pts[pts.length - 1].t - pts[0].t;
      if (duration < 250 || duration > 6000) return;

      // centroid
      let cx = 0, cy = 0;
      for (const p of pts) { cx += p.x; cy += p.y; }
      cx /= pts.length; cy /= pts.length;

      // mean radius
      const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
      const meanR = radii.reduce((a, b) => a + b, 0) / radii.length;
      if (meanR < 60) return;
      const variance = radii.reduce((s, r) => s + (r - meanR) ** 2, 0) / radii.length;
      const stddev = Math.sqrt(variance);
      // circle if relative variance is small
      if (stddev / meanR > 0.35) return;

      // total angular travel ~ 2π
      let angle = 0;
      let prev = Math.atan2(pts[0].y - cy, pts[0].x - cx);
      for (let i = 1; i < pts.length; i++) {
        const cur = Math.atan2(pts[i].y - cy, pts[i].x - cx);
        let d = cur - prev;
        if (d > Math.PI) d -= Math.PI * 2;
        else if (d < -Math.PI) d += Math.PI * 2;
        angle += d;
        prev = cur;
      }
      if (Math.abs(angle) < Math.PI * 1.6) return;

      // close-loop check
      const dx = pts[0].x - pts[pts.length - 1].x;
      const dy = pts[0].y - pts[pts.length - 1].y;
      if (Math.hypot(dx, dy) > meanR * 0.9) return;

      unlock("painter");
      flash("🎨 NICE CIRCLE", "Picasso called. He wants his style back.");
      try { audio.playCoin(); } catch { /* ignore */ }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // PRESSNIPE — 7 quick clicks on any [data-nattoun="true"] image (< 2.5s)
  // (separate from "bonker" which fires on 10 clicks regardless of pace)
  // ---------------------------------------------------------------------------
  const presnipe = useRef<number[]>([]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const isNat =
        t.tagName === "IMG" && t.getAttribute("data-nattoun") === "true";
      if (!isNat) return;
      const now = Date.now();
      presnipe.current = [...presnipe.current.filter((x) => now - x < 2500), now];
      if (presnipe.current.length >= 7) {
        presnipe.current = [];
        unlock("presnipe");
        flash("🎯 PRESIDENTIAL SNIPE", "Seven for seven. The President noticed.");
        try { audio.playGlitch(); } catch { /* ignore */ }
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
