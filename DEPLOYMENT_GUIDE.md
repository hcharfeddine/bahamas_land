# Bahamas Land - Complete Deployment Guide

This guide covers deploying the Bahamas Land application to **Vercel**, **Render**, and **Supabase**.

---

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/hcharfeddine/bahamas_land.git
   cd bahamas_land
   pnpm install
   ```

2. **Set up Supabase** (see Section 1 below)
3. **Deploy frontend** to Vercel or Render (see Sections 2 or 3)

---

## 1. Supabase Setup (One-time, ~10 minutes)

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Select:
   - **Organization** (create one if needed)
   - **Project name** (e.g., "bahamas-land")
   - **Database password** (strong password, save it!)
   - **Region** (choose closest to your users)
4. Wait 2-5 minutes for provisioning to complete

### 1.2 Get API Credentials

1. Once ready, go to **Project Settings → API**
2. Copy and save these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

3. Choose an admin email for the `/adminbahamas` panel → `VITE_ADMIN_EMAIL`

### 1.3 Set Up Database Schema

1. In Supabase, go to **SQL Editor → New query**
2. Open the file: `artifacts/bahamas-land/supabase/schema.sql`
3. Copy all the SQL code
4. Paste into the SQL Editor
5. **Before running**, edit this line to use your admin email:
   ```sql
   insert into public.admins (email) values ('admin@example.com')
   ```
   Replace `admin@example.com` with your real email

6. Click **Run** to execute the schema

### 1.4 Create Admin User

1. Go to **Authentication → Users**
2. Click **Add user → Create new user**
3. Enter:
   - **Email**: same email from step 1.3
   - **Password**: strong password (you'll use this to log in)
   - **Auto confirm user** (optional): check if you want instant access
4. Click **Create user**

Now you have:
- ✅ Public museum read/submissions
- ✅ Admin moderation queue (RLS protected)
- ✅ Real-time updates across browsers

---

## 2. Deploy to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Select **Import Git Repository**
4. Find and select your `bahamas_land` repository
5. Click **Import**

### 2.2 Configure Build Settings

1. In the **Configure Project** screen:

   - **Framework Preset**: Vite
   - **Root Directory**: `artifacts/bahamas-land`
   - **Build Command**: 
     ```
     pnpm install --frozen-lockfile && pnpm --filter @workspace/bahamas-land build
     ```
   - **Output Directory**: `dist`

2. Click **Continue**

### 2.3 Add Environment Variables

1. Click **Environment Variables**
2. Add these three variables:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase URL from step 1.2 |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key from step 1.2 |
   | `VITE_ADMIN_EMAIL` | Your admin email from step 1.3 |

3. Click **Deploy**

### 2.4 Verify Deployment

- ✅ Wait for build to complete (usually 2-3 minutes)
- ✅ Click the deployment URL
- ✅ Open `/museum` and submit a test artifact
- ✅ Go to `/adminbahamas`, log in with your email/password
- ✅ Approve the artifact and see it appear live in `/museum`

**Automatic SPA Fallback**: Vercel uses `vercel.json` (already in the project) to route all requests to `index.html`.

---

## 3. Deploy to Render

### 3.1 Connect Repository

1. Go to [render.com](https://render.com)
2. Click **New → Static Site**
3. Select **Connect a repository** (or paste repo URL)
4. Select your `bahamas_land` repository
5. Click **Connect**

### 3.2 Configure Build Settings

1. In the **Static Site** settings:

   - **Name**: bahamas-land (or any name)
   - **Repository**: your repo URL
   - **Branch**: `main` (or your branch)
   - **Build Command**: 
     ```
     cd artifacts/bahamas-land && pnpm install --frozen-lockfile && pnpm build
     ```
   - **Publish directory**: `artifacts/bahamas-land/dist`

2. Scroll down and click **Advanced**

### 3.3 Add Environment Variables

1. In **Advanced → Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | Your Supabase URL from step 1.2 |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key from step 1.2 |
   | `VITE_ADMIN_EMAIL` | Your admin email from step 1.3 |

### 3.4 Add SPA Fallback Routing

1. In **Advanced → Redirect/Rewrite Rules**:

   ```
   Source: /*
   Destination: /index.html
   ```

2. Click **Create Static Site**

### 3.5 Verify Deployment

- ✅ Wait for build to complete (usually 3-5 minutes)
- ✅ Click the deployment URL
- ✅ Test `/museum` and `/adminbahamas` like in section 2.4

---

## 4. Environment Variables Summary

These **must** be set in both frontend deployments:

| Variable | Source | Example |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | `eyJhbGciOiJIUzI1NiIsI...` |
| `VITE_ADMIN_EMAIL` | Your email | `you@example.com` |

⚠️ **The anon key is safe to expose** — Supabase Row Level Security (RLS) policies protect sensitive data.

---

## 5. Local Development

To test locally before deploying:

```bash
cd artifacts/bahamas-land
pnpm install
```

Set local environment variables in a `.env.local` file (or shell):

```bash
export VITE_SUPABASE_URL=your_url
export VITE_SUPABASE_ANON_KEY=your_key
export VITE_ADMIN_EMAIL=your_email
```

Run dev server:

```bash
pnpm dev
```

Visit `http://localhost:5173`

---

## 6. Admin Panel Usage

### Access Admin Panel

1. Navigate to `/adminbahamas`
2. Click **Sign In**
3. Enter email and password from step 1.4
4. Click **Sign In**

### Moderate Submissions

1. Pending submissions appear in the queue
2. Click each submission to preview
3. Click **Approve** or **Reject**
4. Approved items appear live in `/museum` (real-time!)
5. Rejected items are removed from queue

---

## 7. Features & Architecture

### Frontend Features

- **React 19** + **Vite** (SPA)
- **Supabase Auth** for admin login
- **Real-time subscriptions** for live museum updates
- **Tailwind CSS** for styling

### Backend (Supabase)

- **PostgreSQL** database
- **Row Level Security (RLS)** for data protection:
  - Public can read approved museum items
  - Public can insert new (pending) submissions
  - Only admins can see/approve pending items
- **Real-time** database subscriptions

### Database Schema

- `museum` — approved items (public read)
- `museum_pending` — submissions awaiting approval
- `admins` — authorized moderators (email-based)
- `auth.users` — Supabase Auth users

---

## 8. Customization

### Change Admin Email

1. Go to Supabase → SQL Editor → New query
2. Run:
   ```sql
   update public.admins set email = 'newemail@example.com' where email = 'oldemail@example.com';
   ```
3. Create a new auth user with the new email (see step 1.4)

### Add More Admins

1. In Supabase SQL Editor:
   ```sql
   insert into public.admins (email) values ('admin2@example.com');
   ```
2. Create auth user for that email (step 1.4)

### Change Museum Rules

All museum validation and rules are in:
- Frontend: `artifacts/bahamas-land/src/pages/Museum.tsx`
- Database: `artifacts/bahamas-land/supabase/schema.sql`

---

## 9. Troubleshooting

### "Environment variables not found"

- ✅ Check Vercel/Render dashboard → Settings → Environment Variables
- ✅ Ensure exact variable names: `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
- ✅ Redeploy after adding/changing variables

### Admin login not working

- ✅ Check email in `VITE_ADMIN_EMAIL` matches your auth user email
- ✅ Verify auth user exists in Supabase → Authentication → Users
- ✅ Check Supabase → SQL Editor, run:
  ```sql
  select * from public.admins;
  ```

### Museum submissions not appearing

- ✅ Check Supabase is connected (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set)
- ✅ Check RLS policies in Supabase → Authentication → Policies
- ✅ Check browser console (F12) for errors
- ✅ Verify museum items in Supabase → SQL Editor:
  ```sql
  select * from museum where status = 'approved';
  ```

### Real-time updates not working

- ✅ Ensure WebSocket is allowed (check browser Network tab)
- ✅ Check Supabase project status (Supabase dashboard)
- ✅ Verify RLS policies are enabled

---

## 10. Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **React Docs**: https://react.dev

---

**Deployment complete!** Your Bahamas Land instance is now live. Share the URL with users! 🎉
