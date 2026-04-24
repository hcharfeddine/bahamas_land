// Vercel Serverless Function (Edge runtime).
// Proxies kick.com so the browser can fetch the live status without CORS errors.
// On hosts that don't support /api routes (Render static, Replit Vite preview),
// the frontend falls back to a direct fetch — which most browsers will block,
// resulting in the badge silently hiding. Add this proxy to enable LIVE/OFFLINE.

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "m3kky";

  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ live: false, source: "kick", status: res.status }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=30",
        },
      });
    }
    const data: any = await res.json();
    const live = Boolean(data?.livestream);
    const viewers = Number(data?.livestream?.viewer_count ?? 0);
    const title = String(data?.livestream?.session_title ?? "");
    return new Response(JSON.stringify({ live, viewers, title, source: "kick" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=30",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ live: false, error: String(e) }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
    });
  }
}
