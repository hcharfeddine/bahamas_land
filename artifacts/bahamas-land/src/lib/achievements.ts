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
  | "nattounsleeper";

export type Achievement = {
  id: AchievementId;
  name: string;
  hint: string;
  emoji: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "citizen", name: "Citizen", hint: "Pick a name. Become a person.", emoji: "🏝️" },
  { id: "spy", name: "Spy", hint: "Some doors don't have handles.", emoji: "👁️" },
  { id: "og", name: "OG", hint: "Two letters. The dogs come.", emoji: "🐕" },
  { id: "konami", name: "Konami Veteran", hint: "A code older than time.", emoji: "🎮" },
  { id: "bankrupt", name: "Bankrupt", hint: "Lose everything at the bank.", emoji: "💸" },
  { id: "survivor", name: "Survivor", hint: "Beat Nattoun. Somehow.", emoji: "⚔️" },
  { id: "curator", name: "Curator", hint: "Get a relic approved.", emoji: "🎨" },
  { id: "scholar", name: "Scholar", hint: "Read every book in the library.", emoji: "📜" },
  { id: "nightowl", name: "Night Owl", hint: "Visit when the world sleeps.", emoji: "🌙" },
  { id: "suspect", name: "Suspect", hint: "Get banned (sort of).", emoji: "🚫" },
  { id: "urlsnoop", name: "URL Snoop", hint: "Type a path that isn't there.", emoji: "🔎" },
  { id: "bonker", name: "Bonker", hint: "Bonk the President. A lot.", emoji: "🔨" },
  { id: "vip", name: "VIP Citizen", hint: "Refuse to leave the front door.", emoji: "⭐" },
  { id: "taxpayer", name: "Taxpayer", hint: "The President wants his cut.", emoji: "💰" },
  { id: "loyal", name: "Daily Loyalist", hint: "Show up every day.", emoji: "📅" },
  { id: "loremaster", name: "Loremaster", hint: "Find every hidden door.", emoji: "🗝️" },
  { id: "mastermind", name: "Mastermind", hint: "Trade like the President watches.", emoji: "🧠" },
  { id: "chainletter", name: "Forwarded", hint: "Open a letter you shouldn't have.", emoji: "📧" },
  { id: "exiled", name: "Exiled", hint: "Take a 30-second vacation.", emoji: "🏖️" },
  { id: "denied", name: "Denied", hint: "Apply for what you cannot have.", emoji: "📝" },
  { id: "newshound", name: "Newshound", hint: "Read the state press.", emoji: "📰" },
  { id: "midwit", name: "Certified Mid", hint: "Type the verdict on yourself.", emoji: "🟨" },
  { id: "mekkyfan", name: "M3kky Fan", hint: "Spell his name.", emoji: "💜" },
  { id: "nightcrawler", name: "Nightcrawler", hint: "Be away. Come back.", emoji: "🌑" },
  { id: "nattounsleeper", name: "Don't Wake Him", hint: "Hold a key. Patiently.", emoji: "💤" },
];

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
  const unlockedCount = Object.keys(data).length;
  if (unlockedCount === ACHIEVEMENTS.length) {
    if (!data["loremaster"]) {
      // safety: loremaster auto-fires when all hidden URLs visited; not all achievements
    }
  }
  return { data, unlockedCount, total: ACHIEVEMENTS.length };
}
