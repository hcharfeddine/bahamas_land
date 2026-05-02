import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// rewardMiddleware — server-verified Top-100 claim flow.
//
//   POST /api/reward/claim
//      body: { visitorId, username, achievements: string[] }
//      → validates the visitor sent EVERY non-trivial achievement id
//      → mints a citizen number (1, 2, 3, … no cap; first 100 are "Top 100")
//      → persists claims in <server>/.reward-claims.json
//      → returns a deterministic seed used by the client to render the NFT
//
//   GET /api/reward/status
//      → { fullCount, top100Remaining }
//
// SECURITY NOTES (sat-fi only — this is satire, not a real chain):
//   • The client MUST send all achievement IDs the server expects. We compare
//     against an expected list defined here, so spoofing achievements via the
//     console alone won't grant the reward (you'd still need the real list).
//   • A visitor can only claim once per visitorId. If they wipe storage they
//     get a new visitorId and slot — that's intentional for a satirical egg.
// =============================================================================

const REQUIRED_IDS = [
  // typed-word eggs
  "loyal", "midwarning", "bonker", "kick", "vault",
  "passport", "subscribe", "treason", "konami", "mekky", "rule10",
  "respect", "ban", "fakeschedule", "exile", "ogs", "secret", "coup",
  "constitution", "ghost",
  // media eggs
  "kdot", "siuuu", "kratos", "madridista", "treasoncule", "faddina",
  "catjam", "cena", "ggez", "drake", "rickroll", "khamsa", "KEKW",
  "stonecold", "baskouta",
  // varied-mechanic eggs
  "pathfinder", "seerstone", "freedom", "compass", "cornerguard",
  "painter", "presnipe", "patient", "dna", "chesschamp", "chessfraud",
  // NOTE: "oracle" intentionally NOT in REQUIRED_IDS — it's the prize itself.
] as const;

type Claim = {
  citizenNumber: number;
  visitorId: string;
  username: string;
  seed: string;
  claimedAt: number;
  isTop100: boolean;
};

const STORE_FILE = path.join(__dirname, ".reward-claims.json");

let cache: { claims: Claim[]; byVisitor: Record<string, Claim> } | null = null;

function loadStore() {
  if (cache) return cache;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Claim[];
      cache = {
        claims: parsed,
        byVisitor: Object.fromEntries(parsed.map((c) => [c.visitorId, c])),
      };
      return cache;
    }
  } catch (e) {
    console.warn("[reward] could not read claims file:", (e as Error).message);
  }
  cache = { claims: [], byVisitor: {} };
  return cache;
}

function saveStore() {
  if (!cache) return;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(cache.claims, null, 2));
  } catch (e) {
    console.warn("[reward] could not write claims file:", (e as Error).message);
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
      if (data.length > 16_000) {
        req.destroy();
        reject(new Error("payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function makeSeed(visitorId: string, citizenNumber: number, username: string) {
  // simple hex digest (xmur3 style)
  let h = 1779033703 ^ (visitorId.length + citizenNumber);
  const s = `${visitorId}|${citizenNumber}|${username}`;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = (h ^ (h >>> 16)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export function rewardMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) {
  const url = req.url || "";
  if (!url.startsWith("/api/reward/")) return next();

  if (url.startsWith("/api/reward/status")) {
    const store = loadStore();
    sendJson(res, 200, {
      fullCount: store.claims.length,
      top100Remaining: Math.max(0, 100 - store.claims.length),
      requiredCount: REQUIRED_IDS.length,
    });
    return;
  }

  if (url.startsWith("/api/reward/claim")) {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, reason: "method_not_allowed" });
      return;
    }
    readBody(req).then((raw) => {
      let body: any = {};
      try { body = raw ? JSON.parse(raw) : {}; }
      catch { sendJson(res, 400, { ok: false, reason: "bad_json" }); return; }

      const visitorId = String(body?.visitorId || "").slice(0, 64).trim();
      const username = String(body?.username || "Citizen").slice(0, 32).trim() || "Citizen";
      const achievements: string[] = Array.isArray(body?.achievements)
        ? body.achievements.map((x: unknown) => String(x)).slice(0, 200)
        : [];

      if (!visitorId) {
        sendJson(res, 400, { ok: false, reason: "no_visitor_id" });
        return;
      }

      const have = new Set(achievements);
      const missing = REQUIRED_IDS.filter((id) => !have.has(id));
      if (missing.length > 0) {
        sendJson(res, 200, { ok: false, reason: "incomplete", missing });
        return;
      }

      const store = loadStore();
      const existing = store.byVisitor[visitorId];
      if (existing) {
        sendJson(res, 200, {
          ok: true,
          citizenNumber: existing.citizenNumber,
          total: store.claims.length,
          fullCount: store.claims.length,
          isTop100: existing.isTop100,
          seed: existing.seed,
          username: existing.username,
          claimedAt: existing.claimedAt,
        });
        return;
      }

      const citizenNumber = store.claims.length + 1;
      const seed = makeSeed(visitorId, citizenNumber, username);
      const claim: Claim = {
        citizenNumber,
        visitorId,
        username,
        seed,
        claimedAt: Date.now(),
        isTop100: citizenNumber <= 100,
      };
      store.claims.push(claim);
      store.byVisitor[visitorId] = claim;
      saveStore();

      sendJson(res, 200, {
        ok: true,
        citizenNumber,
        total: store.claims.length,
        fullCount: store.claims.length,
        isTop100: claim.isTop100,
        seed,
        username,
        claimedAt: claim.claimedAt,
      });
    }).catch((err) => {
      sendJson(res, 400, { ok: false, reason: "bad_body", detail: (err as Error).message });
    });
    return;
  }

  sendJson(res, 404, { ok: false, reason: "not_found" });
}
