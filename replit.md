# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### bahamas-land (web)
React + Vite SPA — surreal troll/meme site for Tunisian streamer M3kky.
Synthwave/vaporwave neon aesthetic, framer-motion, no emojis.

**Routes:**
- `/` — Home zoom intro
- `/world` — neon city map (Bank, Court, Museum, Library, Palace, Arcade)
- `/court`, `/museum`, `/library`, `/bank`, `/palace`, `/secret`, `/passport` — themed pages
- `/arcade` — minigame hub
- `/wheel` — Wheel of Verdicts
- `/tictactoe` — Tic-Tac-Toe vs Nattoun (cheats by flipping X→O after you win)
- `/stocks` — Nattoun Coin Exchange (fake stock chart, buy/sell, P/L)
- `/inbox` — Presidential letters (parchment modal, ~5min interval)
- `/adminbahamas` — Supabase Auth-gated moderation queue

**Backend:** Supabase (optional). When the three env vars below are unset, the
site runs in local-only mode (museum stored in localStorage, no admin panel,
no shared state). When set, museum submissions go through a pending →
approved/rejected pipeline with realtime updates.

**Required env vars (frontend, prefixed `VITE_` so they ship to the browser):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — anon/public key (safe to expose; protected by RLS)
- `VITE_ADMIN_EMAIL` — email allowed to log into `/adminbahamas`

**Setup:** see `artifacts/bahamas-land/DEPLOY.md` and run
`artifacts/bahamas-land/supabase/schema.sql` in the Supabase SQL editor.

**Kick LIVE badge:** browsers can't call `kick.com` directly (CORS). The
included Vercel Edge function `artifacts/bahamas-land/api/kick-status.ts`
proxies it. On hosts without `/api` routes the badge silently hides.

**Easter eggs:** type "OG" anywhere → 14 falling Nattouns; "M3KKY" reveals secret link.
