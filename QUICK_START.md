# Bahamas Land - Quick Start Guide

Deploy to production in **5 minutes**.

---

## Step 1: Supabase Setup (5 min)

```bash
# 1. Go to https://supabase.com → New Project
# 2. Wait for provisioning
# 3. Copy these values:
#    - Project URL → VITE_SUPABASE_URL
#    - Anon key → VITE_SUPABASE_ANON_KEY
#    - Choose admin email → VITE_ADMIN_EMAIL

# 4. In Supabase SQL Editor, paste schema.sql and run:
# artifacts/bahamas-land/supabase/schema.sql
# (edit the admin email line first!)

# 5. Create auth user: Authentication → Users → Add user
#    Email: your admin email
#    Password: strong password
```

---

## Step 2: Deploy to Vercel (2 min)

```bash
# 1. Go to https://vercel.com/new
# 2. Import repository
# 3. Root Directory: artifacts/bahamas-land
# 4. Build Command: pnpm install --frozen-lockfile && pnpm --filter @workspace/bahamas-land build
# 5. Output: dist
# 6. Add 3 env vars (from step 1):
#    - VITE_SUPABASE_URL
#    - VITE_SUPABASE_ANON_KEY
#    - VITE_ADMIN_EMAIL
# 7. Deploy!
```

---

## Step 3: Verify (2 min)

```bash
# 1. Visit your Vercel URL
# 2. Go to /museum → submit artifact
# 3. Go to /adminbahamas → log in with email/password
# 4. Approve the artifact
# ✅ Done!
```

---

## Deploy to Render Instead

```bash
# 1. Go to https://render.com/new
# 2. Select: New → Static Site
# 3. Build Command: pnpm install --frozen-lockfile && pnpm --filter @workspace/bahamas-land build
# 4. Publish directory: artifacts/bahamas-land/dist
# 5. Add 3 env vars (same as Vercel)
# 6. Advanced → Redirect rule: /* → /index.html
# 7. Create!
```

---

## Local Development

```bash
cd artifacts/bahamas-land

# Set env vars
export VITE_SUPABASE_URL="..."
export VITE_SUPABASE_ANON_KEY="..."
export VITE_ADMIN_EMAIL="..."

# Run
pnpm install
pnpm dev

# Visit http://localhost:5173
```

---

## Add More Admins

```sql
-- In Supabase SQL Editor:
insert into public.admins (email) values ('newadmin@example.com');

-- Then create auth user:
-- Authentication → Users → Add user → newadmin@example.com
```

---

## Need More Help?

- **Full deployment guide**: See `DEPLOYMENT_GUIDE.md`
- **Admin setup**: See `ADMIN_SETUP.md`
- **Troubleshooting**: See sections 8-9 in `DEPLOYMENT_GUIDE.md`

---

**That's it!** 🎉 Your Bahamas Land instance is live.
