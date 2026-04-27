// Vercel serverless function — POST /api/hint
// Self-contained: no relative imports so Vercel can compile it in isolation.
// Full spoiler hints live only in this server-side file and server/hintsData.ts
// — they are never included in the client JS bundle.

type HintEntry = {
  id: string;
  name: string;
  emoji: string;
  difficulty: "easy" | "medium" | "hard" | "insane";
  hint: string;
};

const HINTS: HintEntry[] = [
  // EASY
  { id: "citizen",   name: "Citizen",           emoji: "🏝️", difficulty: "easy",   hint: "On the Home page, click the name field and type any name (2+ characters). Then click 'Become a Citizen'. Done." },
  { id: "tourist",   name: "Tourist",           emoji: "🧳", difficulty: "easy",   hint: "Go to /world, then enter 3 different buildings by clicking them. Each building visit counts as one room. Any 3 rooms unlocks this." },
  { id: "clicker",   name: "Clicky Citizen",    emoji: "🖱️", difficulty: "easy",   hint: "Click anywhere on the site 50 times total. Buttons, images, text — every click counts. The dog approves." },
  { id: "loyal",     name: "Daily Loyalist",    emoji: "📅", difficulty: "easy",   hint: "Visit the site on two different calendar days. Come today, close the tab, and come back tomorrow. The first visit date is recorded automatically." },
  { id: "newshound", name: "Newshound",         emoji: "📰", difficulty: "easy",   hint: "Find the News page (there is a link on the Home page or navigate to /news). Scroll through the state press — reading any article unlocks it." },
  { id: "gambler",   name: "Lil' Gambler",      emoji: "🎲", difficulty: "easy",   hint: "Go to the Arcade (/arcade) and find the Coin Flip game, or visit /coinflip directly. Place a single bet of at least 1 NC and click flip." },
  { id: "scholar",   name: "Scholar",           emoji: "📜", difficulty: "easy",   hint: "Visit the Library (/library). Click every single book on the shelf to read it. You must open ALL books — missing even one won't count." },
  { id: "siuuu",     name: "SIUUUU!",           emoji: "🇵🇹", difficulty: "easy",   hint: "Just type 's', 'i', 'u', 'u', 'u' consecutively anywhere on the site while browsing. No special page needed — just type it." },
  { id: "faddina",   name: "FADDINA UNLEASHED", emoji: "🇹🇳", difficulty: "easy",   hint: "Type 'faddina' letter by letter anywhere on the site. It's a Tunisian rap anthem by Klay BBJ." },
  { id: "kdot",      name: "K.Dot Listener",    emoji: "👑", difficulty: "easy",   hint: "Type 'they not like us' anywhere on the site — those exact words, letter by letter, while browsing." },
  // MEDIUM
  { id: "spy",        name: "Spy",              emoji: "👁️", difficulty: "medium", hint: "Type /secret directly in the URL bar. This page is hidden and not linked anywhere on the map." },
  { id: "og",         name: "OG",               emoji: "🐕", difficulty: "medium", hint: "Open your browser DevTools (press F12), go to the Console tab, and type: nattoun() — then press Enter. The dogs come." },
  { id: "midwit",     name: "Certified Mid",    emoji: "🟨", difficulty: "medium", hint: "Go to the Court (/court) and submit a verdict on yourself. Write something containing the word 'mid' in your submission." },
  { id: "mekkyfan",   name: "M3kky Fan",        emoji: "💜", difficulty: "medium", hint: "Type 'm3kky' letter by letter anywhere on the site while browsing. Note the '3' — it's not an 'e'." },
  { id: "bonker",     name: "Bonker",           emoji: "🔨", difficulty: "medium", hint: "Find any Nattoun image on the site (the president/dog face). Click it rapidly 30+ times without stopping. The Palace has a good one." },
  { id: "curator",    name: "Curator",          emoji: "🎨", difficulty: "medium", hint: "Go to the Museum (/museum) and click 'Submit a Relic'. Upload or describe an item and submit it. It needs to be approved by the state to count." },
  { id: "urlsnoop",   name: "URL Snoop",        emoji: "🔎", difficulty: "medium", hint: "Type any random URL path that doesn't exist — like /banana or /test123. The 404 Not Found page automatically unlocks this when it appears." },
  { id: "vip",        name: "VIP Citizen",      emoji: "⭐", difficulty: "medium", hint: "Stay on the Home page (/) without navigating away for at least 5 continuous minutes. Just leave the tab open on the home screen." },
  { id: "minister",   name: "Minister of Mid",  emoji: "🎖️", difficulty: "medium", hint: "Reach the 'Minister of Mid' citizen rank. Your rank is shown on your Passport (/passport). Unlock more achievements and earn more NC to climb ranks." },
  { id: "subscriber", name: "Paying Citizen",   emoji: "💳", difficulty: "medium", hint: "Go to the Stream page (/stream). Find the subscription button and pay the NC subscription fee to the President's channel." },
  { id: "broke",      name: "Broke Bahamian",   emoji: "📉", difficulty: "medium", hint: "Go to the Bank (/bank) and invest all your NC in any investment scheme. They all crash 100% of the time. This also unlocks 'Bankrupt' (hard)." },
  { id: "reactor",    name: "Reaction Watcher", emoji: "🎥", difficulty: "medium", hint: "Visit the Stream page (/stream) when the daily category is a reaction stream. The category changes every day — check the schedule." },
  { id: "kratos",     name: "Boy.",             emoji: "🪓", difficulty: "medium", hint: "Type the word 'boy' anywhere on the site while browsing. Just the three letters b-o-y, one by one." },
  { id: "wanted",     name: "Most Wanted",      emoji: "🪧", difficulty: "medium", hint: "Visit the Most Wanted board. Go to /world and click the 'Most Wanted' button, or navigate to /wanted directly." },
  { id: "decreed",    name: "Decreed",          emoji: "📜", difficulty: "medium", hint: "Visit the State Decrees archive at /decrees. There is a button for it at the bottom of the /world map page." },
  { id: "weather",    name: "Weather Report",   emoji: "🌦️", difficulty: "medium", hint: "Visit the National Weather page at /weather or enter the Weather building on the /world map." },
  { id: "anthem",     name: "Anthem",           emoji: "🎵", difficulty: "medium", hint: "Visit the Anthem Hall page at /anthem or enter the Anthem Hall building on the /world map." },
  // HARD
  { id: "nightowl",       name: "Night Owl",         emoji: "🌙", difficulty: "hard", hint: "Visit the site between 00:00 and 05:00 local time (midnight to 5am). Your device's clock is used." },
  { id: "suspect",        name: "Suspect",           emoji: "🚫", difficulty: "hard", hint: "Get yourself banned. Go to the Police page (/police) or do something suspicious. Find the way to get added to the Most Wanted list." },
  { id: "bankrupt",       name: "Bankrupt",          emoji: "💸", difficulty: "hard", hint: "Go to the Bank (/bank) and invest any amount of NC. Every investment crashes to zero. Your balance will hit 0 NC and this unlocks automatically." },
  { id: "survivor",       name: "Survivor",          emoji: "⚔️", difficulty: "hard", hint: "Beat Nattoun at Tic-Tac-Toe on /tictactoe. He plays optimally — take the center first, then corner, force two winning lines." },
  { id: "taxpayer",       name: "Taxpayer",          emoji: "💰", difficulty: "hard", hint: "Keep browsing. At a random moment the President will demand a tax payment. When the tax popup appears, pay it without closing it." },
  { id: "chainletter",    name: "Forwarded",         emoji: "📧", difficulty: "hard", hint: "Go to the Post Office (/postoffice) and check your inbox. Open the chain letter that shouldn't be opened. Read it fully." },
  { id: "exiled",         name: "Exiled",            emoji: "🏖️", difficulty: "hard", hint: "Trigger an exile. Some actions (saying the wrong thing or being caught doing treason) send you to /exile for 30 seconds." },
  { id: "denied",         name: "Denied",            emoji: "📝", difficulty: "hard", hint: "Try to claim the Top-100 Reward at /reward before unlocking all achievements. The application will be denied." },
  { id: "nightcrawler",   name: "Nightcrawler",      emoji: "🌑", difficulty: "hard", hint: "Visit the site, leave, and come back after being away for more than 24 hours. The system tracks your last activity timestamp." },
  { id: "nattounsleeper", name: "Don't Wake Him",    emoji: "💤", difficulty: "hard", hint: "On any page, hold down any key on your keyboard for 10 or more continuous seconds without releasing it." },
  { id: "streamer",       name: "Front Row",         emoji: "📺", difficulty: "hard", hint: "Visit /stream exactly when Nattoun goes live. He streams once a day for 60 seconds at a random time — check the schedule and be there." },
  { id: "trollchat",      name: "Chatter",           emoji: "💬", difficulty: "hard", hint: "Go to /stream while the stream is live and send a message in the live chat. The chat is only active during the live 60-second window." },
  { id: "respected",      name: "Respected",         emoji: "🥇", difficulty: "hard", hint: "Beat Nattoun at Tic-Tac-Toe 3 times in a row without losing. Go to /tictactoe — win, win, win. A loss resets the counter." },
  { id: "richman",        name: "Suspiciously Rich",  emoji: "🪙", difficulty: "hard", hint: "Accumulate 10,000 NC in your balance at the same time. Unlock achievements, win games, and avoid losing it all at the Bank." },
  { id: "patriot",        name: "Patriot",           emoji: "🏛️", difficulty: "hard", hint: "Spend a total of 1,000 NC on Nattoun across all interactions. Tipping at the stream, paying taxes, subscribing — all count." },
  { id: "loremaster",     name: "Loremaster",        emoji: "🗝️", difficulty: "hard", hint: "Find every hidden door. Visit all secret pages: /secret, /baskouta, /177, and /freem3kky. All four must be visited." },
  { id: "madridista",     name: "Madridista",        emoji: "🤍", difficulty: "hard", hint: "Type 'hala madrid' anywhere on the site while browsing. Letter by letter — h, a, l, a, space, m, a, d, r, i, d." },
  { id: "treasoncule",    name: "Culé Confession",   emoji: "🚫", difficulty: "hard", hint: "Type 'barca' anywhere on the site while browsing. There will be consequences. You have been warned." },
  { id: "rhythmist",      name: "Rhythmist",         emoji: "🎮", difficulty: "hard", hint: "Beat level 10 of the rhythm game inside Anthem Hall (/anthem). Just play through and hit ~35% of the notes. Very forgiving." },
  { id: "rhythmmaster",   name: "Rhythm Master",     emoji: "🎸", difficulty: "hard", hint: "Beat level 50 of the rhythm game in Anthem Hall (/anthem). Notes are slower than they look — aim for ~38% hit rate to pass." },
  { id: "rigged",         name: "Rigged",            emoji: "🪙", difficulty: "hard", hint: "Play Coin Flip (/coinflip) and lose 5 flips in a row without winning. Keep going — don't reset between flips." },
  // INSANE
  { id: "hacker",        name: "Console Cowboy",        emoji: "🖥️", difficulty: "insane", hint: "Open DevTools (F12), go to Console, and type exactly: bahamas.help() then press Enter. This reveals all console commands." },
  { id: "cheat",         name: "Cheat Code",            emoji: "💳", difficulty: "insane", hint: "In the DevTools Console (F12), type: bahamas.coins(99999) and press Enter. This prints you rich." },
  { id: "traitor",       name: "Traitor",               emoji: "🗡️", difficulty: "insane", hint: "Type the word 'traitor' letter by letter anywhere on the site while browsing. Consequences are immediate." },
  { id: "breadhead",     name: "Baskouta Historian",    emoji: "🦴", difficulty: "insane", hint: "Navigate to the hidden URL /baskouta directly in your browser. It's not linked anywhere on the map." },
  { id: "vaultkeeper",   name: "Vaultkeeper",           emoji: "🔐", difficulty: "insane", hint: "Visit the Vault (/vault) and crack the combination lock. The combination is hidden somewhere on the site." },
  { id: "mastermind",    name: "Mastermind",            emoji: "🧠", difficulty: "insane", hint: "Go to Stocks (/stocks) and make profitable trades several times in a row to be labeled a Mastermind." },
  { id: "loyaltour",     name: "Grand Tour",            emoji: "🗺️", difficulty: "insane", hint: "Visit every public room: Palace, Court, Police HQ, Bank, Museum, Library, Post Office, Weather, Anthem Hall, Arcade — plus /news, /passport, /stream, /chess, /vault, /wanted, /decrees, /ranking." },
  { id: "ascended",      name: "Ascended Citizen",      emoji: "👑", difficulty: "insane", hint: "Reach the 'Protected Class' rank on your Passport (/passport). Requires very high NC balance AND many achievements unlocked." },
  { id: "completionist", name: "Completionist",         emoji: "🌟", difficulty: "insane", hint: "Unlock every other achievement in the game first. The Completionist badge unlocks automatically once all are done." },
  { id: "ghost",         name: "Ghost in the Machine",  emoji: "👻", difficulty: "insane", hint: "Find the hidden name buried in the site. Look at the browser console messages when the page loads — check the ASCII art carefully." },
  { id: "konami",        name: "Baskouta Code",         emoji: "🎮", difficulty: "insane", hint: "On any page press: Arrow Up, Up, Down, Down, Left, Right, Left, Right, B, A. Do it fast without pauses." },
  { id: "rhythmgod",     name: "Rhythm God",            emoji: "👑", difficulty: "insane", hint: "Beat level 100 of the rhythm game in Anthem Hall (/anthem). Threshold is only ~40% of notes hit. Pace yourself, don't panic, you got this." },
  { id: "dna",           name: "DNA",                   emoji: "🧬", difficulty: "insane", hint: "In the browser DevTools Console (F12), type: bahamas.dna() and press Enter." },
  { id: "chessfraud",    name: "Chess Fraud",           emoji: "♟️", difficulty: "insane", hint: "In the DevTools Console (F12), type: bahamas.chess() and press Enter while on the Chess page." },
  { id: "pathfinder",    name: "Pathfinder",            emoji: "🗺️", difficulty: "insane", hint: "Navigate directly to the hidden URL /baskouta in your browser address bar. Not linked anywhere." },
  { id: "seerstone",     name: "Seerstone",             emoji: "🔮", difficulty: "insane", hint: "Navigate directly to the hidden URL /177 in your browser address bar." },
  { id: "freedom",       name: "Freedom",               emoji: "🕊️", difficulty: "insane", hint: "Navigate directly to the hidden URL /freem3kky in your browser. Note the '3' in m3kky." },
  { id: "compass",       name: "Compass",               emoji: "🧭", difficulty: "insane", hint: "Press these arrow keys in order anywhere: Up, Up, Down, Down, Left, Right, Left, Right. Do it quickly." },
  { id: "cornerguard",   name: "Corner Guard",          emoji: "🟦", difficulty: "insane", hint: "Click the four corners of your browser window clockwise within 5 seconds: top-left → top-right → bottom-right → bottom-left." },
  { id: "painter",       name: "Painter",               emoji: "🎨", difficulty: "insane", hint: "Move your mouse in a full circle (360 degrees) on the screen in one smooth motion." },
  { id: "presnipe",      name: "Presnipe",              emoji: "🎯", difficulty: "insane", hint: "Find any Nattoun image and click it exactly 7 times quickly (within a few seconds). The Palace page has a good target." },
  { id: "patient",       name: "Patient",               emoji: "⏳", difficulty: "insane", hint: "On the Home page, hover your mouse over the main title text 'BAHAMAS LAND' and hold it there for 10 full seconds without moving away." },
  { id: "chesschamp",    name: "Chess Champ",           emoji: "♛", difficulty: "insane", hint: "Win a game of Chess on the Chess page (/chess). Nattoun plays with engine assistance — use aggressive openings." },
  { id: "redacted",      name: "Redacted",              emoji: "⬛", difficulty: "insane", hint: "Type the word 'freedom' letter by letter anywhere on the site while browsing. The screen will go REDACTED." },
  { id: "jailbird",      name: "Jailbird",              emoji: "🦅", difficulty: "insane", hint: "Type the word 'prison' letter by letter anywhere on the site while browsing. You know what happens next." },
  { id: "oracle",        name: "Oracle",                emoji: "🔮", difficulty: "insane", hint: "Unlock ALL other achievements first, then go to /reward and claim the Top-100 Loyalist prize." },

  // ── BONUS TUNISIAN EASTER EGGS ──────────────────────────────────────────
  { id: "bark_code",     name: "Morse Bark",            emoji: "🔊", difficulty: "insane", hint: "Open DevTools console and type exactly: nattoun.bark('--- --.')  — that's morse for 'OG'. Three dashes, space, two dashes and a dot." },
  { id: "harrag",        name: "The Harrag",            emoji: "🚤", difficulty: "hard",   hint: "Move your mouse rapidly toward the very top of the screen (toward the browser tab bar) so it leaves the page area. Do this 3 separate times. The President sees every escape attempt." },
  { id: "taxi_driver",   name: "Taxi",                  emoji: "🚕", difficulty: "medium", hint: "Place your mouse at the very LEFT edge of the screen, then sweep it all the way to the very RIGHT edge in less than 0.2 seconds. Tunis taxi speed." },
  { id: "raja3_ghodwa",  name: "Arja3 Ghodwa",          emoji: "📁", difficulty: "hard",   hint: "Visit /passport between 13:00 and 14:00 (LOCAL time on YOUR computer). The office will be closed for lunch. Stay on the page without leaving for a full 60 seconds." },
  { id: "mrigel",        name: "Mrigel Sahbi",          emoji: "🤙", difficulty: "easy",   hint: "Type the word 'mrigel' letter by letter anywhere on the site (don't be in a text input). The classic Tunisian friend-greeting." },
  { id: "ussd_pro",      name: "*100# Expert",          emoji: "📱", difficulty: "easy",   hint: "Type these characters in order anywhere on the site:  *  1  0  0  #  (use Shift+8 for *, then 1, 0, 0, then Shift+3 for #). Old Tunisian USSD code." },
  { id: "tab_hoarder",   name: "Bahamas Resident",      emoji: "📑", difficulty: "insane", hint: "Open Bahamas Land in 5 different browser tabs at the same time, on the same computer. Wait a few seconds — the tabs find each other automatically." },
  { id: "zoom_god",      name: "Magnifying Glass",      emoji: "🔍", difficulty: "medium", hint: "Use Ctrl + (plus) to zoom in to about 200%, then Ctrl - (minus) to zoom out to about 50%. The site rewards extreme curiosity." },
  { id: "3ammar",        name: "3ammar",                emoji: "🚔", difficulty: "hard",   hint: "Open DevTools (F12) and keep them open while browsing the site for a total of 5 minutes. The surveillance team appreciates dedication." },
];

function dayRng(dayKey: number): () => number {
  let s = ((dayKey * 9301 + 49297) % 233280) || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function todayKey(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export default function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "method_not_allowed" }); return; }

  // Vercel automatically parses JSON bodies — req.body is ready to use.
  let dayKey = todayKey();
  try {
    const body = req.body;
    if (body?.day && /^\d{8}$/.test(String(body.day))) {
      dayKey = parseInt(String(body.day), 10);
    }
  } catch { /* use today */ }

  const rng = dayRng(dayKey);
  const idx = Math.floor(rng() * HINTS.length);
  const entry = HINTS[idx];

  res.status(200).json({
    ok: true,
    dayKey,
    achievementId: entry.id,
    achievementName: entry.name,
    emoji: entry.emoji,
    difficulty: entry.difficulty,
    hint: entry.hint,
  });
}
