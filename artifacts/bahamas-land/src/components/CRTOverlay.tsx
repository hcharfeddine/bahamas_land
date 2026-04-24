import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUsername } from "@/lib/store";

const SNARKY_LINES = [
  "stop clicking everything.",
  "you are being monitored.",
  "President Nattoun has noted your behavior.",
  "this is your final warning. (it isn't.)",
  "we know what you did.",
  "your vibes are currently mid.",
  "please remain calm. the simulation is stable."
];

export function CRTOverlay() {
  const { toast } = useToast();
  const [username] = useUsername();

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const line = SNARKY_LINES[Math.floor(Math.random() * SNARKY_LINES.length)];
        toast({
          title: "SYSTEM ALERT",
          description: username ? `${username}, ${line}` : line,
          variant: "destructive",
          className: "bg-black border-primary text-primary neon-box rounded-none font-mono uppercase",
        });
      }
    }, 45000); // Every 45s roughly

    return () => clearInterval(interval);
  }, [username, toast]);

  return (
    <>
      <div className="crt-overlay" />
      <div className="scanlines" />
    </>
  );
}
