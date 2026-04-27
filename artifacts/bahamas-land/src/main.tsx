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

type NattounApi = {
  (): string;
  bark: (code?: string) => string;
};

const nattounFn = (() => {
  unlock("og");
  document.body.animate(
    [
      { filter: "hue-rotate(0deg)" },
      { filter: "hue-rotate(360deg)" },
    ],
    { duration: 2000, iterations: 3 }
  );
  return "🐕 NATTOUN APPROVES OF YOUR CURIOSITY. +OG STATUS";
}) as NattounApi;

// Morse pattern: "OG" → "--- --."  (the secret password the Bahamas dog
// only answers to).  Citizens who guess any close variant are rewarded.
const OG_MORSE = "--- --.";
nattounFn.bark = (code?: string) => {
  if (typeof code !== "string") {
    return "🐶 *bark!*  Try: nattoun.bark('--- --.')";
  }
  const cleaned = code.replace(/\s+/g, " ").trim();
  if (cleaned === OG_MORSE) {
    unlock("bark_code");
    try {
      document.body.animate(
        [
          { filter: "hue-rotate(0deg) saturate(1)" },
          { filter: "hue-rotate(720deg) saturate(2)" },
        ],
        { duration: 1800, iterations: 1 }
      );
    } catch {
      /* ignore */
    }
    console.log(
      "%c🐕 BARK BARK BARK! YOU SPEAK DOG. +MORSE BARK STATUS",
      "color:#ff2d8c;font-weight:900;font-size:16px;text-shadow:0 0 6px #ff2d8c"
    );
    return "🐕 OG OG OG — Nattoun salutes you.";
  }
  return "🐶 *confused bark*  That's not a real word in Dog.";
};

(window as unknown as { nattoun: NattounApi }).nattoun = nattounFn;

createRoot(document.getElementById("root")!).render(<App />);
