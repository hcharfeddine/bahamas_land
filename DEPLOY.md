# Bahamas Land — Deployment Guide

This is a static Vite SPA. Backend, auth, and database all run on Supabase.
You can host the frontend on Vercel, Render, Netlify, or any platform that serves a static `dist/` folder.

---

## 1. Set up Supabase (one-time, ~5 min)

1. Go to https://supabase.com → **New Project**.
2. Pick a name, region, and a strong DB password. Wait for it to provision.
3. **Project Settings → API** — copy:
   - `Project URL`  → this becomes `VITE_SUPABASE_URL`
   - `anon public key`  → this becomes `VITE_SUPABASE_ANON_KEY`
4. **SQL Editor → New query** — paste the entire contents of
   `supabase/schema.sql`.
   - Edit the line `insert into public.admins (email) values ('admin@example.com')`
     and replace with **your real admin email**, then run the query.
5. **Authentication → Users → Add user → Create new user** —
   create a user with the same email and a password you'll remember.
   This is your admin login for `/adminbahamas`.

That's it. You now have:
- Public read of approved museum items
- Public insert of pending submissions
- Admin moderation queue protected by RLS
- Real-time updates pushed to all connected browsers

---

## 2. Required environment variables

| Name                       | Example                                  | Where        |
| -------------------------- | ---------------------------------------- | ------------ |
| `VITE_SUPABASE_URL`        | `https://xxxxx.supabase.co`              | Frontend env |
| `VITE_SUPABASE_ANON_KEY`   | `eyJhbGciOi...`                          | Frontend env |
| `VITE_ADMIN_EMAIL`         | `you@example.com`                        | Frontend env |

> The **anon key is safe to ship to the browser** — Row Level Security
> policies in Supabase decide what each visitor can do.

If these are missing, the site still works in **local mode** (museum
stored in each browser's localStorage, no admin panel, no shared state).

---

## 3. Deploy to Vercel

```bash
# from repo root
pnpm install
```

In the Vercel dashboard:

1. **Import the repo** (or fork it first).
2. **Root Directory:** `artifacts/bahamas-land`
3. **Framework Preset:** Vite
4. **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @workspace/bahamas-land build`
5. **Output Directory:** `dist`
6. **Environment Variables:** add the three from the table above.
7. **Deploy.**

For SPA routing add a `vercel.json` rewriting all paths to `index.html` —
already covered if you keep the project's `vercel.json` (or create one):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 4. Deploy to Render

Render → **New → Static Site**:

- **Build command:** `pnpm install --frozen-lockfile && pnpm --filter @workspace/bahamas-land build`
- **Publish directory:** `artifacts/bahamas-land/dist`
- Add the three env vars.
- **Redirect/rewrite rule:** `/* → /index.html` (SPA fallback).

---

## 5. Verify

- Open `/museum` and submit an artifact → should say "Awaiting presidential approval"
- Open `/adminbahamas`, sign in with the email/password from step 1.5
- Approve the artifact → it appears live in `/museum` (real-time)
- The HUD should show **LIVE** when M3kky is streaming on Kick

---

## Notes & limits

- **Image storage:** submissions store the image as a base64 data URL in
  `image_url`. Fine for ~1 MB images. For heavy use, switch to
  Supabase Storage and upload the file there.
- **Kick LIVE/OFFLINE badge:** the browser cannot call kick.com directly
  (CORS). On Vercel the included Edge function `api/kick-status.ts` is
  used automatically — no setup needed. On Render/Netlify or other static
  hosting there is no `/api` route, so the badge silently hides until
  you add a similar serverless proxy of your own.
- **Inbox letters:** generated client-side (no server cost).
- **Stocks, wheel, tic-tac-toe, passport:** all local — no backend cost.