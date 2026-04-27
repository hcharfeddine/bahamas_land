import type { IncomingMessage, ServerResponse } from "node:http";
import { todayKey, pickHint } from "../server/hintsData";

// =============================================================================
// Vercel serverless function — POST /api/hint
//
// Vercel automatically picks up files in the api/ directory and serves them
// as serverless functions before any rewrites in vercel.json apply.
//
// Full spoiler hints live in server/hintsData.ts — never in the client bundle.
// =============================================================================

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("error", () => sendJson(res, 400, { ok: false, error: "read_error" }));
  req.on("end", () => {
    let dayKey = todayKey();
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (body.day && /^\d{8}$/.test(String(body.day))) {
        dayKey = parseInt(String(body.day), 10);
      }
    } catch { /* use today */ }

    const entry = pickHint(dayKey);
    sendJson(res, 200, {
      ok: true,
      dayKey,
      achievementId: entry.id,
      achievementName: entry.name,
      emoji: entry.emoji,
      difficulty: entry.difficulty,
      hint: entry.hint,
    });
  });
}
