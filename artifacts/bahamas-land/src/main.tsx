import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { unlock } from "./lib/achievements";

const NATTOUN_ASCII = `
        ▄▄▄▄▄▄▄
     ▄█▀░░░░░░░▀█▄
   ▄█░░  ●   ●  ░░█▄
  █░░░░░░░ω░░░░░░░░█
  █░░░░░░░░░░░░░░░░█
   █▄░░ NATTOUN  ░▄█
     ▀█▄▄▄▄▄▄▄▄▄█▀
        ░║░░░║░
        ░╨░░░╨░
`;

console.log(
  "%cBAHAMAS LAND — STATE SECRETS BELOW",
  "color:#ff00ff; font-size:24px; font-weight:bold; text-shadow: 0 0 10px #ff00ff;"
);
console.log(
  "%c" + NATTOUN_ASCII,
  "color:#0ff; font-family:monospace; font-size:11px;"
);
console.log(
  "%cIf you are reading this, you are not normal. Try: nattoun()",
  "color:#0f0; font-size:13px; font-family:monospace;"
);
console.log(
  "%cTalk to the President: discord.gg/cqHafeyeSp · Watch live: kick.com/m3kky",
  "color:#888; font-size:11px;"
);

(window as unknown as { nattoun: () => string }).nattoun = () => {
  unlock("og");
  document.body.animate(
    [
      { filter: "hue-rotate(0deg)" },
      { filter: "hue-rotate(360deg)" },
    ],
    { duration: 2000, iterations: 3 }
  );
  return "🐕 NATTOUN APPROVES OF YOUR CURIOSITY. +OG STATUS";
};

createRoot(document.getElementById("root")!).render(<App />);
