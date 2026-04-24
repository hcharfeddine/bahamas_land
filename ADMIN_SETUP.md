# Admin Setup & Authentication Guide

This guide covers setting up admin users and managing the Supabase authentication system for Bahamas Land.

---

## Overview

Bahamas Land uses **Supabase Authentication** to protect the admin panel at `/adminbahamas`. The authentication system:

- ✅ Uses **Email + Password** authentication
- ✅ Leverages **Supabase Auth** (user management + session tokens)
- ✅ Protects admin routes with **Row Level Security (RLS)**
- ✅ Supports **multiple admins** via the `public.admins` table

---

## 1. Initial Admin Setup (One-time)

### Step 1: Create Supabase Auth User

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add user → Create new user**
3. Fill in:
   - **Email**: Your email (e.g., `admin@example.com`)
   - **Password**: Strong password (you'll use this to log in)
   - **Auto confirm user**: Check this to enable login immediately
   - (Optional) **Generate password**: Leave unchecked
4. Click **Create user**

### Step 2: Add to Admins Table

This was done automatically if you ran `artifacts/bahamas-land/supabase/schema.sql` during setup. To verify:

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Run:
   ```sql
   select * from public.admins;
   ```
3. You should see your email in the list

If not, add it manually:

```sql
insert into public.admins (email) values ('admin@example.com');
```

### Step 3: Test Login

1. Deploy or run the app locally
2. Navigate to `/adminbahamas`
3. Click **Sign In**
4. Enter your email and password
5. Click **Sign In**

If successful, you'll see the moderation queue!

---

## 2. Add More Admins

### Method 1: Via Supabase Dashboard (Recommended)

#### 2.1 Create Auth User

1. **Supabase → Authentication → Users → Add user → Create new user**
2. Fill in:
   - **Email**: New admin email
   - **Password**: Strong password (give to admin securely)
   - **Auto confirm user**: Check
3. Click **Create user**

#### 2.2 Add to Admins Table

1. **SQL Editor → New query**
2. Run:
   ```sql
   insert into public.admins (email) values ('newadmin@example.com');
   ```
3. Click **Run**

Now the new admin can log in at `/adminbahamas`!

### Method 2: Bulk Add Admins via SQL

```sql
insert into public.admins (email) values
  ('admin1@example.com'),
  ('admin2@example.com'),
  ('admin3@example.com');
```

(Don't forget to create auth users for each email!)

---

## 3. Manage Existing Admins

### View All Admins

**Supabase → SQL Editor → New query:**

```sql
select 
  email, 
  created_at 
from public.admins
order by created_at desc;
```

### Remove an Admin

```sql
delete from public.admins 
where email = 'old-admin@example.com';
```

⚠️ **Note**: This removes admin access but doesn't delete the auth user. If you want to fully disable the user:

1. Go to **Authentication → Users**
2. Find the user
3. Click **⋮ → Delete user** (if you want to remove completely)

### Reset Admin Password

1. Go to **Authentication → Users**
2. Find the admin
3. Click **⋮ → Reset password**
4. An email will be sent to them to reset their password

---

## 4. How Authentication Works

### Login Flow

```
User enters email/password
        ↓
Supabase Auth API validates
        ↓
Returns session token (JWT)
        ↓
Frontend stores in localStorage
        ↓
Frontend sends token with requests
        ↓
Supabase RLS checks: is this user in admins table?
        ↓
If yes → allow access
If no → deny (403 Forbidden)
```

### Row Level Security (RLS) Policies

The database has RLS policies that enforce:

1. **Public read**: Anyone can read approved museum items
   ```sql
   select * from museum where status = 'approved'
   ```

2. **Public insert**: Anyone can submit pending items
   ```sql
   insert into museum_pending (...)
   ```

3. **Admin only**: Only admins can see pending submissions
   ```sql
   select * from museum_pending
   -- where auth.uid() in (select id from public.admins)
   ```

Check these policies in **Supabase → Authentication → Policies**.

---

## 5. Environment Variables for Auth

These variables **must be set** in your deployment (Vercel, Render):

| Variable | Where to Find | Purpose |
|----------|---------------|---------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API | Connect to Supabase |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API | Public API key for client |
| `VITE_ADMIN_EMAIL` | Your choice | Display on `/adminbahamas` |

**Example values:**
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_EMAIL=admin@example.com
```

---

## 6. Session Management

### How Sessions Work

1. User logs in → Supabase returns JWT token
2. Token is stored in `localStorage` (key: `sb-auth-token`)
3. Token is sent with every Supabase API request
4. Token expires after **1 week** (default)
5. User can click **Sign Out** to clear token

### Session Timeout

Sessions automatically expire after 1 week. User will need to log in again.

To customize expiration, edit:
- **Supabase → Settings → Auth → JWT Expiration** (default: 3600 seconds for access token)

### Check Active Sessions

In **Supabase → Authentication → Users**, click an admin user to see:
- Last signed in
- Sign-in history
- Active sessions

---

## 7. Security Best Practices

### ✅ Do's

- ✅ Use **strong passwords** (16+ characters, mix of upper/lower/numbers/symbols)
- ✅ **Restrict `VITE_SUPABASE_ANON_KEY`** in Supabase → Settings → API → Restrict access
- ✅ **Enable 2FA** in Supabase if available (check Project Settings)
- ✅ **Audit admin access** regularly (check SQL query in section 3)
- ✅ **Remove inactive admins** if they leave the team
- ✅ **Change passwords** periodically

### ❌ Don'ts

- ❌ Don't share `VITE_SUPABASE_ANON_KEY` publicly (it's in frontend code, but RLS protects data)
- ❌ Don't reuse passwords
- ❌ Don't store passwords in code or Git
- ❌ Don't expose `VITE_SUPABASE_URL` to untrusted sources

---

## 8. Troubleshooting Auth Issues

### "Invalid email or password"

**Cause**: Email doesn't exist in auth or password is wrong.

**Fix**:
1. Check email spelling
2. Verify user exists in **Supabase → Authentication → Users**
3. Reset password (see section 3)

### "User is not an admin"

**Cause**: Email is in Supabase Auth but NOT in `public.admins` table.

**Fix**:
```sql
select * from public.admins where email = 'your-email@example.com';
```

If empty, add them:
```sql
insert into public.admins (email) values ('your-email@example.com');
```

### "Session expired" after login

**Cause**: Token expired or localStorage cleared.

**Fix**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Log in again
3. If issue persists, check Supabase → Settings → Auth → JWT Expiration

### "/adminbahamas shows blank page"

**Cause**: Missing environment variables or RLS policy issue.

**Fix**:
1. Check browser console (F12 → Console tab) for errors
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Check Supabase → Authentication → Policies (RLS enabled?)
4. Run SQL to verify admin exists:
   ```sql
   select * from public.admins where email = 'your-email@example.com';
   ```

---

## 9. Code Reference

### Frontend Auth Code

The admin panel uses Supabase Auth:

```typescript
// File: artifacts/bahamas-land/src/pages/AdminBahamas.tsx

import { supabase } from '@/lib/supabase';

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Database Auth Functions

```sql
-- File: artifacts/bahamas-land/supabase/schema.sql

-- Check if current user is admin
select exists(
  select 1 
  from public.admins 
  where email = auth.jwt() ->> 'email'
);
```

---

## 10. Multi-Environment Setup

### Development (Local)

```bash
# Set env vars locally
export VITE_SUPABASE_URL="https://dev.supabase.co"
export VITE_SUPABASE_ANON_KEY="dev-key..."
export VITE_ADMIN_EMAIL="dev-admin@example.com"

pnpm dev
```

### Staging (Optional)

Use a separate Supabase project for staging:

1. Create new Supabase project
2. Run schema.sql there
3. Add staging admins
4. Deploy to separate Vercel/Render project

### Production

Use the main Supabase project:

1. Production Supabase project (created in step 1)
2. Vercel/Render production deployment
3. Production admins only

---

## 11. Advanced: Custom Auth Rules

To enforce additional auth rules, edit:

**Frontend validation**: `artifacts/bahamas-land/src/pages/AdminBahamas.tsx`
- Add email domain restrictions (e.g., only @company.com)
- Require specific email patterns

**Database rules**: `artifacts/bahamas-land/supabase/schema.sql`
- Modify RLS policies
- Add roles beyond admin/user

Example: Allow only specific email domain:

```sql
-- RLS policy for museum_pending
create policy "Only admins from specific domain can view"
on museum_pending
for select
using (
  auth.jwt() ->> 'email' LIKE '%@company.com'
  AND EXISTS(
    SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'
  )
);
```

---

## Summary

✅ **Admins are managed by:**
1. Creating email/password users in **Supabase Auth**
2. Adding their email to **public.admins** table
3. They can then log in to `/adminbahamas`

✅ **Security is enforced by:**
1. Supabase JWT tokens (session management)
2. Row Level Security (RLS) policies in PostgreSQL
3. Email validation

---

**Ready to manage your admins!** 🎉
