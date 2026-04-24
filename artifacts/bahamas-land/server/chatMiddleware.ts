import type { IncomingMessage, ServerResponse } from "node:http";
import { getStreamStatus } from "../src/lib/schedule";

type Msg = {
  id: number;
  user: string;
  text: string;
  mod?: boolean;
  ts: number;
};

const MAX_MSGS = 100;
const MAX_TEXT_LEN = 200;
const MAX_USER_LEN = 24;
const RATE_MS = 1500;
const VIEWER_TTL_MS = 35_000;
const SSE_KEEPALIVE_MS = 20_000;

const VIEWER_BASE = 1337;
const VIEWER_MULT_REAL = 247;
const VIEWER_DRIFT_AMP = 420;
const TROLL_BOOST = 2.7;

const state = {
  messages: [] as Msg[],
  nextId: 1,
  sseClients: new Set<ServerResponse>(),
  lastByIp: new Map<string, number>(),
  viewers: new Map<string, number>(),
};

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
  const { trolling } = isLiveNow(new Date(now));
  const boost = trolling ? TROLL_BOOST : 1;
  return Math.floor((VIEWER_BASE + real * VIEWER_MULT_REAL + drift) * boost);
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

function pushBotIfQuiet() {
  const last = state.messages[state.messages.length - 1];
  if (!last || Date.now() - last.ts > 8_000) {
    const lines = [
      "Reminder: watching another stream is treason.",
      "Subscribe with the button you cannot find on purpose.",
      "Mods, please ban anyone typing 'mid'. Except me.",
      "Drop a follow or face the Court of OGs.",
      "Today's stream: probably more state of the union.",
    ];
    pushMessage({
      user: "NattounBot",
      text: lines[Math.floor(Math.random() * lines.length)],
      mod: true,
    });
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

setInterval(() => {
  const { live } = isLiveNow();
  if (live && state.sseClients.size > 0) pushBotIfQuiet();
  const s = viewerStats();
  broadcast("viewers", s);
}, 9_000).unref?.();

export function chatMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) {
  const url = req.url || "";
  if (!url.startsWith("/api/chat/")) return next();

  if (url.startsWith("/api/chat/stream")) return handleStream(req, res);
  if (url.startsWith("/api/chat/send")) return handleSend(req, res);
  if (url.startsWith("/api/chat/state")) return handleState(req, res);
  if (url.startsWith("/api/chat/ping")) return handlePing(req, res);

  sendJson(res, 404, { error: "not_found" });
}
