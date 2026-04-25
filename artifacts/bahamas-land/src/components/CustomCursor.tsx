import { useEffect, useRef, useState } from "react";
import { PawPrint } from "lucide-react";

// =============================================================================
// CustomCursor — paw cursor that follows the pointer.
//
// Performance:
//   • The position is driven by a direct `transform` on a ref so we skip
//     React re-renders on every mousemove (the previous framer-motion
//     spring with mass:2 was visibly laggy).
//   • Hover styling is handled by toggling a small piece of React state,
//     which only changes when the cursor enters/leaves a clickable target,
//     not on every pixel of motion.
// =============================================================================

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    let x = -100;
    let y = -100;
    let pending = false;

    const apply = () => {
      pending = false;
      // translate3d so the browser keeps it on the GPU compositor layer.
      el.style.transform = `translate3d(${x - 12}px, ${y - 12}px, 0)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!pending) {
        pending = true;
        requestAnimationFrame(apply);
      }
    };

    const isClickableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === "button" || tag === "a" || tag === "input" || tag === "textarea" || tag === "select")
        return true;
      if (target.closest("button, a, [role='button'], .clickable")) return true;
      return false;
    };

    const handleMouseOver = (e: MouseEvent) => {
      setIsHovering(isClickableTarget(e.target));
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{
        // Initial off-screen so it doesn't flash at (0,0) before the first
        // mousemove event fires.
        transform: "translate3d(-100px, -100px, 0)",
        willChange: "transform",
      }}
    >
      <div
        className={`relative flex items-center justify-center transition-[color,transform] duration-150 ${
          isHovering ? "text-secondary scale-150" : "text-primary scale-100"
        }`}
      >
        <PawPrint
          className={`w-6 h-6 ${isHovering ? "neon-text-cyan" : "neon-text"}`}
        />
      </div>
    </div>
  );
}
