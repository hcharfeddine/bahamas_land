import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PawPrint } from "lucide-react";

export function CustomCursor() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") ||
        target.closest("a") ||
        target.classList.contains("clickable")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[100]"
      animate={{
        x: mousePos.x - 12,
        y: mousePos.y - 12,
        scale: isHovering ? 1.5 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 1000,
        damping: 50,
        mass: 2,
      }}
    >
      <div className={`relative flex items-center justify-center transition-colors duration-200 ${isHovering ? "text-secondary" : "text-primary"}`}>
        <PawPrint className={`w-6 h-6 ${isHovering ? "neon-text-cyan" : "neon-text"}`} />
      </div>
    </motion.div>
  );
}
