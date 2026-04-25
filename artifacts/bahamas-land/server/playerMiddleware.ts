import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// =============================================================================
// playerMiddleware — citizen registry for Bahamas Land.
//
//   POST /api/player/register
//      body: { username, pin, cardJoke? }
//      → creates a new player, hashes the PIN (scrypt + salt)
//      → returns { ok, player } or { ok:false, reason:"taken" }
//
//   POST /api/player/login
//      body: { username, pin }
//      → verifies and returns the player record incl. unlocked secrets
//
//   POST /api/player/sync
//      body: { username, pin, secrets: string[], coins?: number }
//      → verifies PIN, replaces secrets with the union of old + new
//      → returns the updated player
//
//   GET  /api/player/leaderboard
//      → returns the top 100 players ordered by # of secrets
//
// All data lives in <server>/.player-data.json — same lo-fi pattern as the
// reward middleware. Anyone deploying to a real host should swap this for
// Supabase later, but this works locally and on any Node dev server.
// =============================================================================

type Player = {
  username: string;
  usernameLower: string;
  pinHash: string;
  pinSalt: string;
  cardJoke: string | null;
  secrets: string[];
  coins: number;
  createdAt: number;
  updatedAt: number;
};

type Store = {
  players: Player[];
  byUsername: Record<string, Player>;
};

const STORE_FILE = path.join(__dirname, ".player-data.json");

let cache: Store | null = null;

function loadStore(): Store {
  if (cache) return cache;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Player[];
      cache = {
        players: parsed,
        byUsername: Object.fromEntries(parsed.map((p) => [p.usernameLower, p])),
      };
      return cache;
    }
  } catch (e) {
    console.warn("[player] could not read store:", (e as Error).message);
  }
  cache = { players: [], byUsername: {} };
  return cache;
}

function saveStore() {
  if (!cache) return;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(cache.players, null, 2));
  } catch (e) {
    console.warn("[player] could not write store:", (e as Error).message);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 32_000) {
        req.destroy();
        reject(new Error("payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function hashPin(pin: string, salt?: string): { pinHash: string; pinSalt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, useSalt, 32).toString("hex");
  return { pinHash: derived, pinSalt: useSalt };
}

function verifyPin(pin: string, player: Player): boolean {
  if (!player.pinSalt || !player.pinHash) return false;
  const { pinHash } = hashPin(pin, player.pinSalt);
  // constant-time compare
  const a = Buffer.from(pinHash, "hex");
  const b = Buffer.from(player.pinHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function publicView(p: Player) {
  return {
    username: p.username,
    secrets: p.secrets,
    secretsCount: p.secrets.length,
    coins: p.coins,
    cardJoke: p.cardJoke,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function cleanUsername(raw: unknown): string {
  return String(raw || "")
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .trim()
    .slice(0, 24);
}

function cleanPin(raw: unknown): string {
  return String(raw || "").replace(/\D/g, "").slice(0, 6);
}

function cleanSecrets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const s of raw) {
    const v = String(s).slice(0, 32);
    if (/^[a-zA-Z0-9_-]+$/.test(v)) out.add(v);
    if (out.size >= 250) break;
  }
  return Array.from(out);
}

export function playerMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) {
  const url = req.url || "";
  if (!url.startsWith("/api/player/")) return next();

  // ----- LEADERBOARD (GET) -----
  if (url.startsWith("/api/player/leaderboard")) {
    const store = loadStore();
    const ranking = [...store.players]
      .sort((a, b) => {
        if (b.secrets.length !== a.secrets.length) return b.secrets.length - a.secrets.length;
        return a.createdAt - b.createdAt; // earlier registration wins ties
      })
      .slice(0, 100)
      .map((p, i) => ({
        rank: i + 1,
        username: p.username,
        secretsCount: p.secrets.length,
        coins: p.coins,
        joinedAt: p.createdAt,
      }));
    sendJson(res, 200, {
      ok: true,
      total: store.players.length,
      ranking,
    });
    return;
  }

  // ----- everything else is POST -----
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, reason: "method_not_allowed" });
    return;
  }

  readBody(req)
    .then((raw) => {
      let body: any = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        sendJson(res, 400, { ok: false, reason: "bad_json" });
        return;
      }

      const username = cleanUsername(body?.username);
      const pin = cleanPin(body?.pin);

      if (!username || username.length < 2) {
        sendJson(res, 200, { ok: false, reason: "bad_username" });
        return;
      }
      if (pin.length < 4) {
        sendJson(res, 200, { ok: false, reason: "bad_pin" });
        return;
      }

      const store = loadStore();
      const key = username.toLowerCase();

      // ----- REGISTER -----
      if (url.startsWith("/api/player/register")) {
        if (store.byUsername[key]) {
          sendJson(res, 200, { ok: false, reason: "taken" });
          return;
        }
        const { pinHash, pinSalt } = hashPin(pin);
        const cardJoke =
          typeof body?.cardJoke === "string"
            ? body.cardJoke.replace(/\d/g, "*").slice(0, 24) || null
            : null;
        const player: Player = {
          username,
          usernameLower: key,
          pinHash,
          pinSalt,
          cardJoke,
          secrets: cleanSecrets(body?.secrets),
          coins: Number.isFinite(body?.coins) ? Math.max(0, Math.min(1_000_000, Math.floor(body.coins))) : 1000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        store.players.push(player);
        store.byUsername[key] = player;
        saveStore();
        sendJson(res, 200, { ok: true, player: publicView(player) });
        return;
      }

      // ----- LOGIN -----
      if (url.startsWith("/api/player/login")) {
        const player = store.byUsername[key];
        if (!player) {
          sendJson(res, 200, { ok: false, reason: "not_found" });
          return;
        }
        if (!verifyPin(pin, player)) {
          sendJson(res, 200, { ok: false, reason: "bad_pin" });
          return;
        }
        sendJson(res, 200, { ok: true, player: publicView(player) });
        return;
      }

      // ----- SYNC -----
      if (url.startsWith("/api/player/sync")) {
        const player = store.byUsername[key];
        if (!player) {
          sendJson(res, 200, { ok: false, reason: "not_found" });
          return;
        }
        if (!verifyPin(pin, player)) {
          sendJson(res, 200, { ok: false, reason: "bad_pin" });
          return;
        }
        const incoming = cleanSecrets(body?.secrets);
        const merged = new Set<string>(player.secrets);
        for (const s of incoming) merged.add(s);
        player.secrets = Array.from(merged);
        if (Number.isFinite(body?.coins)) {
          // accept the higher of (current, incoming) so refresh-spam can't lower it
          const inc = Math.max(0, Math.min(1_000_000, Math.floor(body.coins)));
          if (inc > player.coins) player.coins = inc;
        }
        player.updatedAt = Date.now();
        saveStore();
        sendJson(res, 200, { ok: true, player: publicView(player) });
        return;
      }

      sendJson(res, 404, { ok: false, reason: "not_found" });
    })
    .catch((err) => {
      sendJson(res, 400, {
        ok: false,
        reason: "bad_body",
        detail: (err as Error).message,
      });
    });
}
