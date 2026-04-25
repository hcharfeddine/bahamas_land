import { useEffect } from "react";
import { useLocation } from "wouter";
import { audio } from "@/lib/audio";
import { unlock } from "@/lib/achievements";

// ============================================================================
// CONSOLE EASTER EGGS
// ============================================================================
// Anyone who opens DevTools is greeted with a banner from President Nattoun
// and gets access to a small "official" command-line API:
//
//   bahamas.help()              → list all commands
//   bahamas.whoami()            → return current citizen profile
//   bahamas.coins(n)            → set NC balance (also unlocks 'cheat')
//   bahamas.exile()             → instant exile
//   bahamas.bann()              → instant ban
//   bahamas.vault()             → goto vault
//   bahamas.secret()            → goto secret area
//   bahamas.nattoun()           → speech from the president
//   bahamas.sudo("...")         → escalate, sometimes works
//   bahamas.baskouta()          → reveal baskouta lore
//   bahamas.rules()             → list of stream rules
//   bahamas.coup()              → DO NOT
//
// ============================================================================

const BANNER = `
%cBAHAMAS LAND OFFICIAL CONSOLE
%cWelcome, suspicious citizen.
%cType  bahamas.help()  to see commands.
%cWatching another stream is treason.`;

const HELP_LINES: Array<[string, string]> = [
  ["bahamas.help()", "list every official command"],
  ["bahamas.whoami()", "show your citizen profile"],
  ["bahamas.coins(n)", "set Nattoun Coin balance (illegal but fun)"],
  ["bahamas.exile()", "self-exile (no take-backs)"],
  ["bahamas.bann()", "request immediate ban"],
  ["bahamas.vault()", "open the secret vault"],
  ["bahamas.secret()", "go to the secret area"],
  ["bahamas.nattoun()", "speech from the president"],
  ["bahamas.sudo(cmd)", "try to escalate (rarely works)"],
  ["bahamas.baskouta()", "reveal baskouta lore"],
  ["bahamas.rules()", "stream rules"],
  ["bahamas.coup()", "do not"],
  ["bahamas.dna()", "request the President's DNA sample"],
  ["bahamas.chess()", "flip the board (if you're playing chess)"],
  ["bahamas.chemins()", "list of hidden chemins (declassified)"],
];

declare global {
  interface Window {
    bahamas?: any;
    bld?: any;
  }
}

export function ConsoleEggs() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // ----- Welcome banner --------------------------------------------------
    try {
      console.log(
        BANNER,
        "color:#ff2d8c;font-weight:900;font-size:18px;text-shadow:0 0 6px #ff2d8c",
        "color:#3df7ff;font-weight:bold;font-size:13px",
        "color:#fff;font-family:monospace;font-size:12px",
        "color:#ff2d8c;font-family:monospace;font-size:11px;font-style:italic",
      );
    } catch {
      /* ignore */
    }

    // ----- API definition --------------------------------------------------
    const log = (msg: string, color = "#3df7ff") => {
      console.log(
        `%c${msg}`,
        `color:${color};font-family:monospace;font-size:12px`,
      );
    };
    const speak = (msg: string) =>
      log(`🐶 Nattoun: ${msg}`, "#ff2d8c");

    const getUsername = () =>
      JSON.parse(localStorage.getItem("ogs_username") || '""') || "Citizen";

    const setLS = (key: string, val: any) => {
      localStorage.setItem(key, JSON.stringify(val));
      window.dispatchEvent(new Event("local-storage"));
    };

    const api = {
      help() {
        log(
          "─── Bahamas Land Console ─────────────────────────",
          "#3df7ff",
        );
        for (const [cmd, desc] of HELP_LINES) {
          console.log(
            `  %c${cmd.padEnd(22)}%c → ${desc}`,
            "color:#ff2d8c;font-family:monospace;font-weight:bold",
            "color:#fff;font-family:monospace",
          );
        }
        log("─────────────────────────────────────────────────", "#3df7ff");
        unlock("hacker");
        return "👀";
      },

      whoami() {
        const username = getUsername();
        const coins = JSON.parse(
          localStorage.getItem("ogs_coins") || "1000",
        );
        return {
          username,
          balance: `${coins} NC`,
          status: "loyalty=questionable",
          watchedBy: "President Nattoun",
        };
      },

      coins(n: number) {
        if (typeof n !== "number" || !isFinite(n)) {
          speak("Try coins(1000). Or coins(0) if you want pain.");
          return;
        }
        const clamped = Math.max(0, Math.min(99_999_999, Math.floor(n)));
        setLS("ogs_coins", clamped);
        unlock("cheat");
        speak(`Balance set to ${clamped} NC. The auditors saw that.`);
        try {
          audio.playCoin();
        } catch {
          /* ignore */
        }
        return clamped;
      },

      exile() {
        speak(`Exiled. Goodbye, ${getUsername()}. We will not miss you.`);
        try {
          audio.playGlitch();
        } catch {
          /* ignore */
        }
        setLocation("/exile");
        return "exiled";
      },

      bann() {
        speak("Ban request received. Approved. Approved again.");
        try {
          audio.playGlitch();
        } catch {
          /* ignore */
        }
        setLocation("/banned");
        return "banned";
      },

      vault() {
        speak("Vault opened. Don't tell the auditors.");
        unlock("vaultkeeper");
        setLocation("/vault");
        return "vault";
      },

      secret() {
        speak("You found me. Or I found you.");
        setLocation("/secret");
        return "secret";
      },

      nattoun() {
        const speeches = [
          "I am the President. The dog. The legend. The baskouta enthusiast.",
          "Bahamas Land is a serious country. (it isn't.)",
          "We have never lost an election. We have never held one.",
          "Today's policy: vibes.",
          "Subscribe to M3kky. That's an order.",
        ];
        speak(speeches[Math.floor(Math.random() * speeches.length)]);
        return "🐶";
      },

      sudo(cmd?: string) {
        if (cmd === "coup") {
          speak("Denied. The dog has more guards than you have neurons.");
          return "denied";
        }
        speak(`sudo: '${cmd ?? ""}' denied. Try begging instead.`);
        return "denied";
      },

      baskouta() {
        speak("BASKOUTA LORE: In year 0, the President invented baskouta.");
        speak("It was already invented. He took credit anyway.");
        unlock("breadhead");
        return "🍪";
      },

      rules() {
        const rules = [
          "1. Watch only me.",
          "2. Other streams are treason.",
          "3. Donations are spiritual.",
          "4. Do not whisper to other streamers.",
          "5. There is no rule 5.",
        ];
        for (const r of rules) log(r, "#ff2d8c");
        return "★";
      },

      coup() {
        speak("…");
        speak("Did you really type that out loud?");
        speak("Border patrol dispatched.");
        try {
          audio.playGlitch();
        } catch {
          /* ignore */
        }
        unlock("traitor");
        setLocation("/banned");
        return "💀";
      },

      dna() {
        speak("Sample requested. Lab results below.");
        const seq = Array.from({ length: 32 }, () =>
          "AGCT"[Math.floor(Math.random() * 4)],
        ).join("");
        log(`> 5'-${seq}-3'`, "#3df7ff");
        log("Result: 73% baskouta. 22% president. 5% dog.", "#ff2d8c");
        log("Top-secret: server-verified reward at  /reward", "#3df7ff");
        unlock("dna");
        return seq;
      },

      chess() {
        speak("Flipping the board. Tell no one.");
        unlock("chessfraud");
        window.dispatchEvent(new Event("chess-cheat"));
        try { audio.playGlitch(); } catch { /* ignore */ }
        setLocation("/chess");
        return "♟️";
      },

      chemins() {
        log("─── Declassified chemins (handle with care) ──", "#3df7ff");
        log("  /baskouta    — the crunchiest chemin", "#ff2d8c");
        log("  /177         — a year the dog won't forget", "#ff2d8c");
        log("  /freem3kky   — underground movement", "#ff2d8c");
        log("  /chess       — challenge the President", "#ff2d8c");
        log("  /reward      — Top-100 server-verified prize", "#ff2d8c");
        log("──────────────────────────────────────────────", "#3df7ff");
        return "🗺️";
      },
    };

    window.bahamas = api;
    window.bld = api;

    // Stub property to bait inspectors
    Object.defineProperty(window.bahamas, "secretKey", {
      get() {
        speak("Nice try. There is no secret key. (yes there is.)");
        unlock("hacker");
        return "n4ttoun_was_here";
      },
    });

    return () => {
      // keep them around even after unmount; leaving the React tree shouldn't
      // remove the console API
    };
  }, [setLocation]);

  return null;
}
