# Bahamas Land

A surreal troll/meme website for Tunisian streamer M3kky with a synthwave/vaporwave aesthetic.

**Live Features:**
- 🎮 Minigames: Tic-Tac-Toe, Wheel of Verdicts, Nattoun Coin Stock Exchange
- 🏛️ Museum: User-submitted artifacts with admin moderation
- 📬 Inbox: Presidential letters (generated client-side)
- 🎟️ Passport system and world map exploration
- 🔴 Kick LIVE badge (real-time streamer status)

---

## Quick Links

- 📖 **New to this project?** Start with [QUICK_START.md](./QUICK_START.md) (5 min)
- 🚀 **Deploy to production?** Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 👤 **Manage admins?** Check [ADMIN_SETUP.md](./ADMIN_SETUP.md)
- 🔍 **What changed?** See [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)
- 📚 **Detailed docs?** See [artifacts/bahamas-land/DEPLOY.md](./artifacts/bahamas-land/DEPLOY.md)

---

## 30-Second Setup

```bash
# 1. Get Supabase credentials at https://supabase.com
# 2. Run schema.sql from supabase/ folder
# 3. Create auth user + add to admins table
# 4. Deploy to Vercel or Render with 3 env vars

# Local dev:
cd artifacts/bahamas-land
pnpm install
pnpm dev
```

---

## Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19 + Vite + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Hosting** | Vercel, Render, or any static host |
| **Admin Auth** | Supabase Auth (email/password) |
| **Real-time** | Supabase subscriptions |

---

## Project Structure

```
.
├── artifacts/
│   ├── bahamas-land/          # Main React app
│   │   ├── src/
│   │   │   ├── pages/         # Route pages
│   │   │   ├── components/    # UI components
│   │   │   └── lib/           # Utilities
│   │   ├── supabase/          # Database schema
│   │   └── api/               # Vercel Edge functions
│   └── mockup-sandbox/        # Design sandbox
├── lib/
│   ├── api-spec/              # OpenAPI spec
│   ├── api-zod/               # Zod schemas
│   └── db/                    # Drizzle ORM
├── QUICK_START.md             # 5-min deployment
├── DEPLOYMENT_GUIDE.md        # Full deploy guide
├── ADMIN_SETUP.md             # Admin/auth guide
└── CLEANUP_SUMMARY.md         # What changed
```

---

## Features

### Public Pages
- `/` — Home zoom intro
- `/world` — Neon city map with location links
- `/court`, `/museum`, `/library`, `/bank`, `/palace`, `/secret`, `/passport` — Themed destinations
- `/arcade` — Minigame hub

### Minigames
- `/tictactoe` — Play vs Nattoun (he cheats!)
- `/wheel` — Wheel of Verdicts
- `/stocks` — Nattoun Coin Exchange (fake stock market)
- `/inbox` — Presidential letters (timed releases)

### Admin Panel
- `/adminbahamas` — Moderation queue (Supabase Auth protected)
  - View pending submissions
  - Approve/reject artifacts
  - Real-time updates to `/museum`

---

## Authentication & Authorization

**Public users:**
- ✅ Read approved museum items
- ✅ Submit artifacts (pending review)
- ✅ Play minigames
- ❌ Access admin panel

**Admins:**
- ✅ All public permissions
- ✅ View pending submissions
- ✅ Approve/reject items
- ✅ Real-time moderation updates

**How it works:**
1. Admin email added to `public.admins` table
2. Supabase Auth user created with that email
3. RLS policies check: "is this user in admins table?"
4. Admin panel accessible only if verified

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for details.

---

## Environment Variables

**Required for production:**

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsI...
VITE_ADMIN_EMAIL=admin@example.com
```

**Optional:**
- `VITE_*` — Frontend only (shipped to browser)
- No backend API key needed — Supabase RLS handles security

---

## Deployment Platforms

### ✅ Vercel (Recommended)
- Edge functions for Kick proxy
- Automatic SPA routing
- Free tier available
- [Instructions →](./DEPLOYMENT_GUIDE.md#2-deploy-to-vercel)

### ✅ Render
- Static site hosting
- Free tier available
- Manual SPA routing setup
- [Instructions →](./DEPLOYMENT_GUIDE.md#3-deploy-to-render)

### ✅ Anywhere
- Any static host works (Netlify, Cloudflare Pages, etc.)
- Just serve `dist/` folder
- Requires manual Kick proxy setup

---

## Development

### Local Setup

```bash
git clone https://github.com/hcharfeddine/bahamas_land
cd bahamas_land
pnpm install

# Set env vars
export VITE_SUPABASE_URL="your_url"
export VITE_SUPABASE_ANON_KEY="your_key"
export VITE_ADMIN_EMAIL="your_email"

# Run dev server
cd artifacts/bahamas-land
pnpm dev
```

### Build

```bash
pnpm install --frozen-lockfile
pnpm build

# Output: artifacts/bahamas-land/dist
```

### Database Migrations

```bash
# View current schema
pnpm --filter @workspace/db run introspect

# Generate types
pnpm --filter @workspace/db run generate
```

---

## Admin Management

### Add Admin

```sql
-- In Supabase SQL Editor:
insert into public.admins (email) values ('newadmin@example.com');
```

Then create auth user in Supabase → Authentication → Users.

### Remove Admin

```sql
delete from public.admins where email = 'admin@example.com';
```

Then delete auth user in Supabase dashboard.

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for full admin guide.

---

## Troubleshooting

**Museum submissions not working?**
- ✅ Check Supabase env vars are set
- ✅ Verify `supabase/schema.sql` was run
- ✅ Check RLS policies in Supabase → Authentication

**Admin login fails?**
- ✅ Verify email in `VITE_ADMIN_EMAIL`
- ✅ Check auth user exists in Supabase
- ✅ Verify email is in `public.admins` table

**Build fails?**
- ✅ Run `pnpm install --frozen-lockfile`
- ✅ Check Node.js 24+ installed
- ✅ Clear `pnpm-lock.yaml` and reinstall

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) section 9 for more.

---

## Links

- **Repository**: https://github.com/hcharfeddine/bahamas_land
- **Supabase**: https://supabase.com
- **Vercel**: https://vercel.com
- **React**: https://react.dev
- **Tailwind**: https://tailwindcss.com

---

## License

MIT

---

**Ready to deploy?** Start with [QUICK_START.md](./QUICK_START.md) 🚀
