import { useEffect, useState } from "react";

export type AchievementId =
  | "citizen"
  | "spy"
  | "og"
  | "bankrupt"
  | "survivor"
  | "konami"
  | "curator"
  | "scholar"
  | "nightowl"
  | "suspect"
  | "urlsnoop"
  | "bonker"
  | "vip"
  | "taxpayer"
  | "loyal"
  | "loremaster"
  | "mastermind"
  | "chainletter"
  | "exiled"
  | "denied"
  | "newshound"
  | "midwit"
  | "mekkyfan"
  | "nightcrawler"
  | "nattounsleeper"
  | "hacker"
  | "cheat"
  | "traitor"
  | "breadhead"
  | "vaultkeeper"
  | "respected"
  | "streamer"
  | "trollchat"
  // ============================
  // NEW EASTER EGGS — DIFFICULTY TIERS
  // ============================
  // EASY
  | "tourist"
  | "clicker"
  | "gambler"
  // MEDIUM
  | "minister"
  | "broke"
  | "subscriber"
  | "reactor"
  // HARD
  | "loyaltour"
  | "richman"
  | "patriot"
  // INSANE
  | "ascended"
  | "completionist"
  | "ghost"
  // ============================
  // MEDIA EASTER EGGS — pop culture
  // ============================
  | "kdot"
  | "siuuu"
  | "kratos"
  | "madridista"
  | "treasoncule"
  | "faddina"
  | "catjam"
  | "cena"
  | "ggez"
  | "drake"
  | "rickroll"
  | "khamsa"
  | "KEKW"
  | "stonecold"
  | "baskouta"
  // ============================
  // NEW VARIED-MECHANIC EASTER EGGS
  // ============================
  | "pathfinder"      // hidden URL /baskouta
  | "seerstone"       // hidden URL /177
  | "freedom"         // hidden URL /freem3kky
  | "compass"         // arrow sequence ↑↑↓↓←→←→
  | "cornerguard"     // click 4 corners clockwise within 5s
  | "painter"         // draw a circle with the mouse
  | "presnipe"        // tap any Nattoun image 7 times fast (lighter than bonker)
  | "patient"         // hold hover on the home title for 10s
  | "dna"             // bahamas.dna() console call
  | "chesschamp"      // "beat" Nattoun at chess
  | "chessfraud"      // bahamas.chess() console flip
  | "oracle";         // claim the Top-100 reward (server-issued)

export type Difficulty = "easy" | "medium" | "hard" | "insane";

export type Achievement = {
  id: AchievementId;
  name: string;
  hint: string;
  emoji: string;
  difficulty: Difficulty;
};

export const ACHIEVEMENTS: Achievement[] = [
  // EASY TIER — first-time visitor stuff
  { id: "citizen", name: "Citizen", hint: "Pick a name. Become a person.", emoji: "🏝️", difficulty: "easy" },
  { id: "tourist", name: "Tourist", hint: "Visit 3 different rooms in Bahamas Land.", emoji: "🧳", difficulty: "easy" },
  { id: "clicker", name: "Clicky Citizen", hint: "Click around. The dog appreciates it.", emoji: "🖱️", difficulty: "easy" },
  { id: "loyal", name: "Daily Loyalist", hint: "Show up every day.", emoji: "📅", difficulty: "easy" },
  { id: "newshound", name: "Newshound", hint: "Read the state press.", emoji: "📰", difficulty: "easy" },
  { id: "konami", name: "Baskouta Code", hint: "An ancient code, with extra crumbs at the end.", emoji: "🎮", difficulty: "insane" },
  { id: "gambler", name: "Lil' Gambler", hint: "Bet a single coin and survive the consequences.", emoji: "🎲", difficulty: "easy" },

  // MEDIUM TIER — mild effort required
  { id: "spy", name: "Spy", hint: "Some doors don't have handles.", emoji: "👁️", difficulty: "medium" },
  { id: "og", name: "OG", hint: "Two letters. The dogs come.", emoji: "🐕", difficulty: "medium" },
  { id: "midwit", name: "Certified Mid", hint: "Type the verdict on yourself.", emoji: "🟨", difficulty: "medium" },
  { id: "mekkyfan", name: "M3kky Fan", hint: "Spell his name.", emoji: "💜", difficulty: "medium" },
  { id: "bonker", name: "Bonker", hint: "Bonk the President. A lot.", emoji: "🔨", difficulty: "medium" },
  { id: "curator", name: "Curator", hint: "Get a relic approved.", emoji: "🎨", difficulty: "medium" },
  { id: "urlsnoop", name: "URL Snoop", hint: "Type a path that isn't there.", emoji: "🔎", difficulty: "medium" },
  { id: "vip", name: "VIP Citizen", hint: "Refuse to leave the front door.", emoji: "⭐", difficulty: "medium" },
  { id: "minister", name: "Minister of Mid", hint: "Reach the official rank of Minister.", emoji: "🎖️", difficulty: "medium" },
  { id: "subscriber", name: "Paying Citizen", hint: "Subscribe to the President's stream. Yes, with NC.", emoji: "💳", difficulty: "medium" },
  { id: "broke", name: "Broke Bahamian", hint: "Lose every coin to the Bank.", emoji: "📉", difficulty: "medium" },
  { id: "reactor", name: "Reaction Watcher", hint: "Catch the President reacting to a video.", emoji: "🎥", difficulty: "medium" },

  // HARD TIER — needs a real visit pattern or mini-skill
  { id: "scholar", name: "Scholar", hint: "Read every book in the library.", emoji: "📜", difficulty: "hard" },
  { id: "nightowl", name: "Night Owl", hint: "Visit when the world sleeps.", emoji: "🌙", difficulty: "hard" },
  { id: "suspect", name: "Suspect", hint: "Get banned (sort of).", emoji: "🚫", difficulty: "hard" },
  { id: "bankrupt", name: "Bankrupt", hint: "Lose everything at the bank.", emoji: "💸", difficulty: "hard" },
  { id: "survivor", name: "Survivor", hint: "Beat Nattoun. Somehow.", emoji: "⚔️", difficulty: "hard" },
  { id: "taxpayer", name: "Taxpayer", hint: "The President wants his cut.", emoji: "💰", difficulty: "hard" },
  { id: "chainletter", name: "Forwarded", hint: "Open a letter you shouldn't have.", emoji: "📧", difficulty: "hard" },
  { id: "exiled", name: "Exiled", hint: "Take a 30-second vacation.", emoji: "🏖️", difficulty: "hard" },
  { id: "denied", name: "Denied", hint: "Apply for what you cannot have.", emoji: "📝", difficulty: "hard" },
  { id: "nightcrawler", name: "Nightcrawler", hint: "Be away. Come back.", emoji: "🌑", difficulty: "hard" },
  { id: "nattounsleeper", name: "Don't Wake Him", hint: "Hold a key. Patiently.", emoji: "💤", difficulty: "hard" },
  { id: "streamer", name: "Front Row", hint: "Catch the President live.", emoji: "📺", difficulty: "hard" },
  { id: "trollchat", name: "Chatter", hint: "Say something to the President directly.", emoji: "💬", difficulty: "hard" },
  { id: "respected", name: "Respected", hint: "Beat Nattoun three times in a row.", emoji: "🥇", difficulty: "hard" },
  { id: "richman", name: "Suspiciously Rich", hint: "Stack 10,000 NC. The Bank is watching.", emoji: "🪙", difficulty: "hard" },
  { id: "patriot", name: "Patriot", hint: "Spend 1,000 NC on the President. Worth it.", emoji: "🏛️", difficulty: "hard" },
  { id: "loremaster", name: "Loremaster", hint: "Find every hidden door.", emoji: "🗝️", difficulty: "hard" },

  // INSANE TIER — chef's special
  { id: "hacker", name: "Console Cowboy", hint: "Open the place where the truth lives.", emoji: "🖥️", difficulty: "insane" },
  { id: "cheat", name: "Cheat Code", hint: "Print yourself rich.", emoji: "💳", difficulty: "insane" },
  { id: "traitor", name: "Traitor", hint: "Don't even type the word.", emoji: "🗡️", difficulty: "insane" },
  { id: "breadhead", name: "Baskouta Historian", hint: "Baskouta came first. We just took credit.", emoji: "🦴", difficulty: "insane" },
  { id: "vaultkeeper", name: "Vaultkeeper", hint: "Crack the dog's piggy bank.", emoji: "🔐", difficulty: "insane" },
  { id: "mastermind", name: "Mastermind", hint: "Trade like the President watches.", emoji: "🧠", difficulty: "insane" },
  { id: "loyaltour", name: "Grand Tour", hint: "Visit every public room of Bahamas Land.", emoji: "🗺️", difficulty: "insane" },
  { id: "ascended", name: "Ascended Citizen", hint: "Reach the rank of Protected Class.", emoji: "👑", difficulty: "insane" },
  { id: "completionist", name: "Completionist", hint: "Unlock everything else first.", emoji: "🌟", difficulty: "insane" },
  { id: "ghost", name: "Ghost in the Machine", hint: "Discover a name no one was meant to find.", emoji: "👻", difficulty: "insane" },

  // ============================
  // MEDIA EASTER EGGS — type the magic words anywhere
  // ============================
  { id: "siuuu", name: "SIUUUU!", hint: "Spell the celebration of a man in a Portugal kit.", emoji: "🇵🇹", difficulty: "easy" },
  { id: "kdot", name: "K.Dot Listener", hint: "They not… you know the rest. Type it. The track plays.", emoji: "👑", difficulty: "easy" },
  { id: "kratos", name: "Boy.", hint: "Spartan rage. One single word from the bald god.", emoji: "🪓", difficulty: "medium" },
  { id: "madridista", name: "Madridista", hint: "Hala the white club. The real anthem plays itself.", emoji: "🤍", difficulty: "hard" },
  { id: "treasoncule", name: "Culé Confession", hint: "Mention the rival club. Suffer the consequences.", emoji: "🚫", difficulty: "hard" },
  // M3kky community + Tunisia memes
  { id: "faddina", name: "FADDINA UNLEASHED", hint: "Type the name of the OG Tunisian rap anthem. Klay knows.", emoji: "🇹🇳", difficulty: "easy" },
  { id: "khamsa", name: "Khamsa Aleik", hint: "Five fingers in your face. Block the evil eye.", emoji: "🖐", difficulty: "medium" },
  { id: "baskouta", name: "Cookie Inspector", hint: "The Crunchiest Word. Three syllables, very Tunisian.", emoji: "🍪", difficulty: "easy" },
  // Internet / gaming / rap memes
  { id: "catjam", name: "CAT JAM", hint: "When the cat vibes, the OGs vibe. Type the meme.", emoji: "🐈", difficulty: "easy" },
  { id: "cena", name: "AND HIS NAME IS…", hint: "Trumpets in your ears. Spell the bald champion.", emoji: "🎺", difficulty: "medium" },
  { id: "ggez", name: "GG EZ", hint: "The two letters that get you reported in any lobby.", emoji: "🎮", difficulty: "easy" },
  { id: "drake", name: "Hotline Bling", hint: "Certified", emoji: "📞", difficulty: "medium" },
  { id: "rickroll", name: "Rickrolled Yourself", hint: "Never gonna give it up. Type the surname.", emoji: "🕺", difficulty: "easy" },
  { id: "KEKW", name: "KEKW", hint: "The biggest Kick laugh emote. Type it.", emoji: "🤣", difficulty: "easy" },
  { id: "stonecold", name: "WHAT? WHAT?", hint: "Glass shatters. Beer cans fly. Spell the Texas Rattlesnake.", emoji: "🍺", difficulty: "medium" },

  // ============================
  // NEW VARIED-MECHANIC EGGS — chemins, gestures, console traps
  // ============================
  { id: "pathfinder", name: "Pathfinder", hint: "The crunchiest path is also a chemin. Type it after the slash.", emoji: "🛤️", difficulty: "easy" },
  { id: "seerstone", name: "Year Zero", hint: "There is a year the dog refuses to forget. Three digits. Try it as a path.", emoji: "🏺", difficulty: "hard" },
  { id: "freedom", name: "Free The Streamer", hint: "Every citizen wants something free. The streamer most of all. /free…", emoji: "🆓", difficulty: "hard" },
  { id: "compass", name: "Compass", hint: "North north south south east west east west. No A. No B.", emoji: "🧭", difficulty: "medium" },
  { id: "cornerguard", name: "Four Corners", hint: "Touch every corner of the screen. Clockwise. Like you mean it.", emoji: "🔲", difficulty: "medium" },
  { id: "painter", name: "Painter", hint: "Draw a circle on the page with your mouse. The dog appreciates art.", emoji: "🎨", difficulty: "hard" },
  { id: "presnipe", name: "Presidential Snipe", hint: "Click the President's face seven times in a row. Quickly. Lovingly.", emoji: "🎯", difficulty: "medium" },
  { id: "patient", name: "Patient Citizen", hint: "On the home screen, hover the portrait. Don't move. Don't click. Ten seconds.", emoji: "⏳", difficulty: "hard" },
  { id: "dna", name: "DNA Sample", hint: "The console knows what the dog is made of. Ask it.", emoji: "🧬", difficulty: "insane" },
  { id: "chesschamp", name: "Grandmaster", hint: "Beat the President at chess. He cheats. Cheat back.", emoji: "♟️", difficulty: "insane" },
  { id: "chessfraud", name: "Console Grandmaster", hint: "Console-flip the chessboard. Embarrassing but effective.", emoji: "🤖", difficulty: "insane" },
  { id: "oracle", name: "The Oracle (Top 100)", hint: "Collect EVERY secret. Visit /reward. Server-verified.", emoji: "🔮", difficulty: "insane" },
];

export const DIFFICULTY_REWARDS: Record<Difficulty, number> = {
  easy: 25,
  medium: 75,
  hard: 200,
  insane: 750,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
  insane: "INSANE",
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "hsl(140 80% 55%)",
  medium: "hsl(48 100% 60%)",
  hard: "hsl(20 100% 60%)",
  insane: "hsl(320 100% 65%)",
};

const STORAGE_KEY = "ogs_achievements";

function read(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(data: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("achievement-change"));
  } catch {
    /* ignore */
  }
}

export function unlock(id: AchievementId) {
  const data = read();
  if (data[id]) return false;
  data[id] = Date.now();
  write(data);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("achievement-unlock", { detail: { id } }));
    // Auto-pay reward into NC bank
    try {
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      if (ach) {
        const reward = DIFFICULTY_REWARDS[ach.difficulty];
        const cur = Number(window.localStorage.getItem("ogs_coins"));
        const safeCur = Number.isFinite(cur) ? cur : 0;
        window.localStorage.setItem("ogs_coins", JSON.stringify(safeCur + reward));
        window.dispatchEvent(new Event("local-storage"));
      }
    } catch {
      /* ignore */
    }
  }
  return true;
}

export function isUnlocked(id: AchievementId): boolean {
  return !!read()[id];
}

export function getAllUnlocked(): Record<string, number> {
  return read();
}

export function useAchievements() {
  const [data, setData] = useState<Record<string, number>>(() => read());
  useEffect(() => {
    const refresh = () => setData(read());
    window.addEventListener("achievement-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("achievement-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const unlockedCount = Object.keys(data).filter((k) =>
    ACHIEVEMENTS.some((a) => a.id === k),
  ).length;
  return { data, unlockedCount, total: ACHIEVEMENTS.length };
}

export function useAchievementsByDifficulty() {
  const { data } = useAchievements();
  const byDiff: Record<Difficulty, { total: number; unlocked: number }> = {
    easy: { total: 0, unlocked: 0 },
    medium: { total: 0, unlocked: 0 },
    hard: { total: 0, unlocked: 0 },
    insane: { total: 0, unlocked: 0 },
  };
  for (const a of ACHIEVEMENTS) {
    byDiff[a.difficulty].total += 1;
    if (data[a.id]) byDiff[a.difficulty].unlocked += 1;
  }
  return byDiff;
}