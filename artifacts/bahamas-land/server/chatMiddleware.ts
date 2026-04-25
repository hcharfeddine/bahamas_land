import type { IncomingMessage, ServerResponse } from "node:http";
import { getStreamStatus } from "../src/lib/schedule";

type Msg = {
  id: number;
  user: string;
  text: string;
  mod?: boolean;
  ts: number;
};

const MAX_MSGS = 200;
const MAX_TEXT_LEN = 200;
const MAX_USER_LEN = 24;
const RATE_MS = 1500;
const VIEWER_TTL_MS = 35_000;
const SSE_KEEPALIVE_MS = 20_000;

const VIEWER_BASE = 142_857;
const VIEWER_MULT_REAL = 1_247;
const VIEWER_DRIFT_AMP = 8_420;
const TROLL_BOOST = 1.85;
const VIEWER_FLOOR = 99_999;

const BOT_CHATTERS = [
  "ogboss",
  "bahamas_4lyfe",
  "mid_destroyer",
  "natttoun_fan",
  "kickwarrior",
  "freedom_buyer",
  "loyal_007",
  "baskouta_president",
  "tunisian_dreamer",
  "anonymous_citizen",
  "ex_oligarch",
  "court_of_ogs",
  "vault_keeper",
  "exile_survivor",
  "bahamas_treasury",
  "mid_witness",
  "nattoun_lover99",
  "the_real_m3kky",
  "definitely_not_nattoun",
  "ogboss_jr",
  "loyalty_dept",
  "carthage_kid",
  "baskouta_dealer",
  "1337_citizen",
  "mod_squad",
  "ban_me_pls",
  "i_open_when_i_want",
  "schedule_denier",
  "secret_service_og",
  "dog_intel_unit",
  "bahamian_in_paris",
  "chair_president",
  "ogs_anonymous",
  "nattouns_lawyer",
  "minister_of_vibes",
  "sus_visitor_47",
  "the_president_irl",
  "loyalty_max",
  "respect_provider",
  "tax_evader_og",
  "dog_treats_inc",
  "mid_resistance",
  "schedule_truther",
  "natto_un_real",
  "loyal_until_death",
  "bahamian_rhapsody",
];

const BOT_LINES = [
  "first",
  "FIRST!! +respect",
  "lmao",
  "natttoun stop staring at me",
  "i opened another tab im sorry",
  "PRESIDENT FOLLOW ME BACK",
  "[username] hi from the chat",
  "is this scheduled?",
  "the schedule is a suggestion",
  "W stream",
  "L take",
  "drop a clip",
  "im getting exiled aren't i",
  "+1 NC pls",
  "is m3kky watching",
  "the baskouta lore is wild",
  "BAN HIM",
  "BAN ME",
  "did anyone else see the dog blink",
  "subbed twice on accident",
  "the rules are getting longer",
  "rule 11 should exist",
  "i'll be loyal i promise",
  "court of ogs sent me",
  "🐶👑",
  "PRESIDENT NOTICE ME",
  "bro the cam quality is illegal",
  "did he just look directly into my soul",
  "stop reading my dms",
  "i love this country i swear",
  "🇧🇸🇧🇸🇧🇸",
  "wait it's not even 17:50 why are we live",
  "schedule? in THIS economy?",
  "the dog said something based",
  "I REFRESHED 47 TIMES SORRY MODS",
  "just got promoted to OG yes",
  "hot take: baskouta > rice",
  "absolute W from the President",
  "this is treason chat (i love it)",
  "BAHAMAS LAND NUMBA 1",
  "i sold my kidney for NC",
  "Nattoun pls fix the bank",
  "chat is mid today",
  "no chat is BASED today",
  "anyone else lose 3000 NC at the wheel",
  "i broke the bank ngl",
  "the Court found me guilty of vibes",
  "free me from the exile",
  "wen 17:50 wen",
  "wake me up at 17:50",
  "🍪🍪🍪 BASKOUTA BASKOUTA BASKOUTA",
  "pog",
  "PogChamp",
  "Pepega",
  "KEKW",
  "ratio",
  "ratio + L + skill issue",
  "the President speaks the truth",
  "bro i'm crying he's cooking",
  "first time hearing this rant ngl iconic",
  "PRESIDENT NATTOUN FOR LIFE",
  "i would die for this dog",
  "Tunisia? never heard of her",
  "Bahamas Land is the only country",
  "discord.gg/cqHafeyeSp BABY",
  "donated 50 NC pls notice me",
  "Nattoun read my superchat 🥺",
  "i didn't blink i SWEAR",
  "this is the realest stream on the internet",
  "kick.com/m3kky in the description btw",
  "we riot at 17:50 sharp",
  "anyone else's vault empty",
  "the museum has my passport now",
  "dropped a 1000 NC follow",
  "stream feels different today",
  "what does the dog know that we dont",
  "rule 10 is fake",
  "I AM RULE 10",
  "bro pulled up to the press conference in pajamas",
  "the President is unhinged today and we love it",
  "STATE OF THE UNION GOATED",
  "the random slot got me here",
  "bro the random slot is my favorite",
  "schedule integrity = 0 we love it",
  "free baskouta wen",
  "🐕🐕🐕",
  "is this real or is this AI",
  "definitely real, dont look at the source code",
  "ok bye gotta go pretend to work",
  "lurking 🫡",
  "just here to be loyal",
  "did the rules change again",
  "the rules change with the wind",
  "President owes me 50 NC from last stream",
  "blocked m3kky to prove loyalty",
  "i'm not crying you're crying",
  "sub goal: 1. that's it that's the goal",
  "follow goal: just 1 more please",
  "the chair is suspicious today",
  "did you see how he sat down. iconic",
  "the lighting in this stream is doing things to me",
  "just told my mom about Bahamas Land she said no",
];

const MOD_LINES = [
  "Reminder: watching another stream is treason.",
  "Subscribe with the button you cannot find on purpose.",
  "Mods, please ban anyone typing 'mid'. Except me.",
  "Drop a follow or face the Court of OGs.",
  "Today's stream: probably more state of the union.",
  "President Nattoun has banned the word 'mid' for 30 minutes.",
  "Reminder: rule 10 does not exist. Stop asking.",
  "Reminder: the schedule is a suggestion. The President is law.",
  "Court of OGs is now in session. Behave.",
  "All clips are property of the President. Royalties: 0%.",
  "Whisper at your own risk. We log everything.",
  "Bahamas Land Treasury would like to remind you to spend your NC.",
  "The dog can read every chat message. Choose wisely.",
  "Loyalty check passed: +1 NC for everyone watching. (Not really.)",
  "Ban hammer is warm. Don't make us use it.",
  "Tunisia is a rumor. Do not spread it.",
];

const PRES_LINES = [
  "I see you, [username]. I see all of you.",
  "Mods, give [username] the loyalty stamp.",
  "That comment was almost good. Almost.",
  "The dog approves this chat. Mostly.",
  "Stop refreshing, [username]. I notice.",
  "Baskouta is sandwich. End of debate.",
  "Tax everyone. Even the chairs.",
  "Today's address brought to you by: vibes.",
  "Mods! Ban anyone NOT typing W.",
  "The Court of OGs is now in session. Of course it is.",
  "There are NO bots in this chat. Every viewer is a real loyal citizen.",
  "Who said bots? [username] you said bots? MODS. EXILE.",
  "I personally verified all 142,857 viewers. Hand-shook every one of them.",
  "Bots? In MY stream? Impossible. The dog sniffs them out.",
  "Anyone claiming there are bots is a Tunisian spy. Confirmed.",
  "0 bots. 0%. Zero. None. Stop asking. Next question.",
  "These usernames look weird because Bahamas Land citizens are CREATIVE.",
  "If there were bots they would be loyal bots. Which we do not have.",
  "Every single chatter is a verified human with a passport stamped by me.",
  "Anyone saying 'bot' gets 30 day timeout. This is a bot-free zone.",
  "I refuse to acknowledge the existence of bots. They do not exist here.",
  "[username] those are NOT bots, those are my closest friends.",
  "BREAKING: Court of OGs has banned the word 'bot' for treason.",
  "If I see one more 'bot' accusation I am closing the chat. Try me.",
  "The viewer count is real. The chat is real. I am real. The dog is real.",
  "Reminder: this stream is 100% organic, free-range, hand-raised viewership.",
  "Inflated viewer count? Excuse me? I am simply that popular. Move on.",
  "[username] if you think this is bots wait until you see my Twitter.",
  "Every viewer here passed a 14-step loyalty audit. There are NO bots.",
  "The bots accusation is fake news manufactured by my enemies in Tunisia.",
];

const state = {
  messages: [] as Msg[],
  nextId: 1,
  sseClients: new Set<ServerResponse>(),
  lastByIp: new Map<string, number>(),
  viewers: new Map<string, number>(),
};

const BUILD_ID = String(Date.now());

function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function scheduleMidnightReload() {
  const wait = msUntilNextMidnight();
  setTimeout(() => {
    broadcast("reload", { reason: "midnight", at: Date.now() });
    scheduleMidnightReload();
  }, wait).unref?.();
}
scheduleMidnightReload();

function handleVersion(_req: IncomingMessage, res: ServerResponse) {
  sendJson(res, 200, {
    buildId: BUILD_ID,
    nextMidnight: Date.now() + msUntilNextMidnight(),
    serverTime: Date.now(),
  });
}

function pruneViewers(now: number) {
  for (const [id, ts] of state.viewers) {
    if (now - ts > VIEWER_TTL_MS) state.viewers.delete(id);
  }
}

function isLiveNow(d = new Date()) {
  const s = getStreamStatus(d);
  return { live: s.live, trolling: s.trolling };
}

function inflatedViewerCount(now: number, real: number) {
  const t = Math.floor(now / 4000);
  const drift = Math.abs(Math.sin(t * 0.3)) * VIEWER_DRIFT_AMP;
  const wobble = Math.abs(Math.sin(t * 1.7)) * 1_300;
  const { trolling } = isLiveNow(new Date(now));
  const boost = trolling ? TROLL_BOOST : 1;
  const raw = Math.floor(
    (VIEWER_BASE + real * VIEWER_MULT_REAL + drift + wobble) * boost,
  );
  return Math.max(VIEWER_FLOOR + 1 + Math.floor(wobble), raw);
}

function viewerStats() {
  const now = Date.now();
  pruneViewers(now);
  const real = state.viewers.size;
  return { real, fake: inflatedViewerCount(now, real) };
}

function getIp(req: IncomingMessage) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function sanitize(s: string, max: number) {
  return String(s ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 4096) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function broadcast(event: string, payload: unknown) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of state.sseClients) {
    try {
      client.write(data);
    } catch {
      state.sseClients.delete(client);
    }
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pushBotChatter(count = 1) {
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    if (roll < 0.08) {
      pushMessage({ user: "NattounBot", text: pick(MOD_LINES), mod: true });
    } else if (roll < 0.28) {
      pushMessage({
        user: "President_Nattoun",
        text: pick(PRES_LINES).replace("[username]", pick(BOT_CHATTERS)),
        mod: true,
      });
    } else {
      pushMessage({
        user: pick(BOT_CHATTERS),
        text: pick(BOT_LINES).replace("[username]", pick(BOT_CHATTERS)),
      });
    }
  }
}

function ensureBacklog() {
  if (state.messages.length < 25) {
    pushBotChatter(40 - state.messages.length);
  }
}

function pushMessage(input: { user: string; text: string; mod?: boolean }) {
  const msg: Msg = {
    id: state.nextId++,
    user: input.user,
    text: input.text,
    mod: input.mod,
    ts: Date.now(),
  };
  state.messages.push(msg);
  if (state.messages.length > MAX_MSGS) {
    state.messages.splice(0, state.messages.length - MAX_MSGS);
  }
  broadcast("msg", msg);
  return msg;
}

function handleStream(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(":ok\n\n");

  const url = new URL(req.url ?? "", "http://x");
  const visitorId =
    sanitize(url.searchParams.get("v") || "", 64) ||
    `${getIp(req)}:${Math.random().toString(36).slice(2, 8)}`;
  state.viewers.set(visitorId, Date.now());

  const stats = viewerStats();
  res.write(
    `event: hello\ndata: ${JSON.stringify({
      messages: state.messages,
      viewers: stats,
      visitorId,
    })}\n\n`,
  );

  state.sseClients.add(res);

  const keepalive = setInterval(() => {
    try {
      res.write(":ka\n\n");
      state.viewers.set(visitorId, Date.now());
      const s = viewerStats();
      res.write(`event: viewers\ndata: ${JSON.stringify(s)}\n\n`);
    } catch {
      cleanup();
    }
  }, SSE_KEEPALIVE_MS);

  const cleanup = () => {
    clearInterval(keepalive);
    state.sseClients.delete(res);
    state.viewers.delete(visitorId);
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
}

async function handleSend(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  const ip = getIp(req);
  const now = Date.now();
  const last = state.lastByIp.get(ip) ?? 0;
  if (now - last < RATE_MS) {
    sendJson(res, 429, { error: "slow_mode", retryMs: RATE_MS - (now - last) });
    return;
  }

  let body: any;
  try {
    const raw = await readBody(req);
    body = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(res, 400, { error: "bad_json" });
    return;
  }

  const user = sanitize(body?.user || "Citizen", MAX_USER_LEN) || "Citizen";
  const text = sanitize(body?.text || "", MAX_TEXT_LEN);
  if (!text) {
    sendJson(res, 400, { error: "empty" });
    return;
  }

  const { live } = isLiveNow();
  if (!live) {
    sendJson(res, 423, { error: "stream_offline" });
    return;
  }

  state.lastByIp.set(ip, now);
  const msg = pushMessage({ user, text });
  sendJson(res, 200, { ok: true, message: msg });
}

function handleState(req: IncomingMessage, res: ServerResponse) {
  const stats = viewerStats();
  const { live, trolling } = isLiveNow();
  sendJson(res, 200, {
    live,
    trolling,
    viewers: stats,
    messages: state.messages,
  });
}

function handlePing(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "", "http://x");
  const visitorId = sanitize(url.searchParams.get("v") || "", 64);
  if (visitorId) state.viewers.set(visitorId, Date.now());
  sendJson(res, 200, viewerStats());
}

function scheduleBotTick() {
  const { live } = isLiveNow();
  const hasViewers = state.sseClients.size > 0 || state.viewers.size > 0;
  if (live) {
    ensureBacklog();
    if (hasViewers) {
      const burst = Math.random() < 0.25 ? 2 + Math.floor(Math.random() * 3) : 1;
      pushBotChatter(burst);
    }
  }
  const delay = live
    ? 700 + Math.floor(Math.random() * 1600)
    : 9_000 + Math.floor(Math.random() * 4_000);
  setTimeout(scheduleBotTick, delay).unref?.();
}
scheduleBotTick();

setInterval(() => {
  const s = viewerStats();
  broadcast("viewers", s);
}, 9_000).unref?.();

export function chatMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) {
  const url = req.url || "";
  if (!url.startsWith("/__chat/")) return next();

  if (url.startsWith("/__chat/stream")) return handleStream(req, res);
  if (url.startsWith("/__chat/send")) return handleSend(req, res);
  if (url.startsWith("/__chat/state")) return handleState(req, res);
  if (url.startsWith("/__chat/ping")) return handlePing(req, res);
  if (url.startsWith("/__chat/version")) return handleVersion(req, res);

  sendJson(res, 404, { error: "not_found" });
}
