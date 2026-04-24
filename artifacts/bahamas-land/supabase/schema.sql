-- =====================================================================
-- Bahamas Land — Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor -> "New query"
-- =====================================================================

-- 1. Admin allowlist (only emails listed here can moderate)
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz default now()
);

-- INSERT YOUR ADMIN EMAIL HERE (replace placeholder):
insert into public.admins (email) values ('admin@example.com')
  on conflict (email) do nothing;

-- 2. Museum items (shared, moderated by admin)
create table if not exists public.museum_items (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  caption text not null default '',
  image_url text,
  label text not null default 'Ancient Artifact',
  respect integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists museum_items_status_idx on public.museum_items (status, created_at desc);

-- 3. Atomic respect (so two users can't race the +1)
create or replace function public.respect_museum_item(item_id uuid)
returns void
language sql
security definer
as $$
  update public.museum_items
  set respect = respect + 1
  where id = item_id and status = 'approved';
$$;

grant execute on function public.respect_museum_item(uuid) to anon, authenticated;

-- 4. Row Level Security
alter table public.museum_items enable row level security;
alter table public.admins enable row level security;

-- Anyone (anon) can read approved items
drop policy if exists "public read approved" on public.museum_items;
create policy "public read approved"
  on public.museum_items
  for select
  using (status = 'approved');

-- Anyone can insert a new submission (always pending)
drop policy if exists "public insert pending" on public.museum_items;
create policy "public insert pending"
  on public.museum_items
  for insert
  with check (status = 'pending');

-- Admins can read everything
drop policy if exists "admins read all" on public.museum_items;
create policy "admins read all"
  on public.museum_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Admins can update / delete
drop policy if exists "admins update" on public.museum_items;
create policy "admins update"
  on public.museum_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "admins delete" on public.museum_items;
create policy "admins delete"
  on public.museum_items
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Admins table: only admins can read it
drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins"
  on public.admins
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admins a2
      where lower(a2.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 5. Realtime: enable for museum_items so the UI live-updates
alter publication supabase_realtime add table public.museum_items;
