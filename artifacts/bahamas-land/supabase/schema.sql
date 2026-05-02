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

-- =====================================================================
-- COURT OF THE OGs — shared, moderated by President Nattoun
-- Anyone can submit a verdict, every visitor sees the same approved feed,
-- but ONLY the admin (Nattoun) decides what stays.
-- =====================================================================

-- 6. Court verdicts table
create table if not exists public.court_verdicts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  text text not null,
  verdict text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists court_verdicts_status_idx
  on public.court_verdicts (status, pinned desc, created_at desc);

-- 7. Row Level Security
alter table public.court_verdicts enable row level security;

-- Anyone (anon) can read approved verdicts
drop policy if exists "court public read approved" on public.court_verdicts;
create policy "court public read approved"
  on public.court_verdicts
  for select
  using (status = 'approved');

-- Anyone can submit a new verdict (always pending, never pinned)
drop policy if exists "court public insert pending" on public.court_verdicts;
create policy "court public insert pending"
  on public.court_verdicts
  for insert
  with check (status = 'pending' and pinned = false);

-- Admins can read everything
drop policy if exists "court admins read all" on public.court_verdicts;
create policy "court admins read all"
  on public.court_verdicts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Admins can update (approve / reject / pin)
drop policy if exists "court admins update" on public.court_verdicts;
create policy "court admins update"
  on public.court_verdicts
  for update
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Admins can delete
drop policy if exists "court admins delete" on public.court_verdicts;
create policy "court admins delete"
  on public.court_verdicts
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 8. Realtime for court_verdicts
alter publication supabase_realtime add table public.court_verdicts;

-- =====================================================================
-- LIVE CHAT (President Nattoun stream)
-- Messages are shared across all visitors and AUTOMATICALLY DROPPED
-- after 1 hour. Two layers of protection:
--   (a) the SELECT policy hides anything older than 1 hour
--       (so even if rows linger for a few seconds before a delete,
--        nobody can read them)
--   (b) a trigger lazily deletes old rows whenever new ones come in
--       (statement-level, runs ~5% of inserts to stay cheap)
-- =====================================================================

create table if not exists public.chat_messages (
  id bigserial primary key,
  username text not null,
  text text not null,
  is_mod boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

-- Anyone can read ONLY messages from the last hour.
-- Older rows are invisible to everyone the instant they age out.
drop policy if exists "chat public read recent" on public.chat_messages;
create policy "chat public read recent"
  on public.chat_messages
  for select
  using (created_at > now() - interval '1 hour');

-- Anyone can post a message (must be a real user message, not flagged as mod)
drop policy if exists "chat public insert" on public.chat_messages;
create policy "chat public insert"
  on public.chat_messages
  for insert
  with check (
    is_mod = false
    and length(text) between 1 and 200
    and length(username) between 1 and 32
  );

-- Admins (Nattoun) can wipe individual messages or the whole table
drop policy if exists "chat admins delete" on public.chat_messages;
create policy "chat admins delete"
  on public.chat_messages
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Lazy auto-cleanup: ~5% of inserts trigger a DELETE of rows > 1h old.
-- No external scheduler / pg_cron needed.
create or replace function public.chat_messages_autoclean()
returns trigger
language plpgsql
as $$
begin
  if random() < 0.05 then
    delete from public.chat_messages
     where created_at < now() - interval '1 hour';
  end if;
  return null;
end;
$$;

drop trigger if exists chat_messages_autoclean_trg on public.chat_messages;
create trigger chat_messages_autoclean_trg
after insert on public.chat_messages
for each statement
execute function public.chat_messages_autoclean();

-- Realtime so every visitor sees new messages instantly
alter publication supabase_realtime add table public.chat_messages;


-- =====================================================================
-- REWARD CLAIMS — permanent Top-100 citizenship NFT registry
-- One row per visitor, sequential citizen_number (1, 2, 3, ...).
-- The first 100 claimants get is_top_100 = true.
-- =====================================================================

create table if not exists public.reward_claims (
  citizen_number  bigint generated always as identity primary key,
  visitor_id      text   not null unique,
  username        text   not null default 'Citizen',
  seed            text   not null,
  is_top_100      boolean not null default false,
  claimed_at      timestamptz not null default now()
);

create index if not exists reward_claims_top100_idx
  on public.reward_claims (citizen_number)
  where is_top_100;

alter table public.reward_claims enable row level security;

-- Anyone may READ the registry (used by the UI to show counts / leaderboards).
drop policy if exists "reward public read" on public.reward_claims;
create policy "reward public read"
  on public.reward_claims
  for select
  using (true);

-- No direct INSERT/UPDATE/DELETE from anon — everything goes through the
-- SECURITY DEFINER functions below so the rules can't be bypassed by spoofing.

-- ---------------------------------------------------------------------
-- public.claim_reward(visitor_id, username, achievements)
-- ---------------------------------------------------------------------
-- Validates that EVERY required egg id is in `p_achievements`. If not,
-- returns { ok:false, reason:'incomplete', missing:[...] }. If yes, mints
-- the next citizen_number atomically (or returns the existing one if this
-- visitor has already claimed) and returns the full claim row.
-- ---------------------------------------------------------------------
create or replace function public.claim_reward(
  p_visitor_id   text,
  p_username     text,
  p_achievements text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  required_ids text[] := array[
    -- typed-word eggs
    'loyal','midwarning','bonker','kick','vault',
    'passport','subscribe','treason','konami','mekky','rule10',
    'respect','ban','fakeschedule','exile','ogs','secret','coup',
    'constitution','ghost',
    -- media eggs
    'kdot','siuuu','kratos','madridista','treasoncule','faddina',
    'catjam','cena','ggez','drake','rickroll','khamsa','KEKW',
    'stonecold','baskouta',
    -- varied-mechanic eggs
    'pathfinder','seerstone','freedom','compass','cornerguard',
    'painter','presnipe','patient','dna','chesschamp','chessfraud'
  ];
  missing text[];
  vid text := nullif(trim(p_visitor_id), '');
  uname text := coalesce(nullif(trim(p_username), ''), 'Citizen');
  existing public.reward_claims%rowtype;
  new_seed text;
  total bigint;
  new_row public.reward_claims%rowtype;
begin
  if vid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_visitor_id');
  end if;

  -- Validate achievement completeness
  select coalesce(array_agg(r), array[]::text[])
    into missing
    from unnest(required_ids) r
    where not (r = any(coalesce(p_achievements, array[]::text[])));

  if array_length(missing, 1) > 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'incomplete',
      'missing', to_jsonb(missing)
    );
  end if;

  -- Already claimed? Return existing record.
  select * into existing from public.reward_claims where visitor_id = vid;
  if found then
    select count(*) into total from public.reward_claims;
    return jsonb_build_object(
      'ok',           true,
      'citizenNumber', existing.citizen_number,
      'total',         total,
      'fullCount',     total,
      'isTop100',      existing.is_top_100,
      'seed',          existing.seed,
      'username',      existing.username,
      'claimedAt',     extract(epoch from existing.claimed_at) * 1000
    );
  end if;

  -- Insert with placeholder, then patch seed/is_top_100 once we know the number.
  insert into public.reward_claims (visitor_id, username, seed, is_top_100)
    values (vid, uname, '', false)
    returning * into new_row;

  new_seed := substr(
    md5(vid || '|' || new_row.citizen_number::text || '|' || uname),
    1, 8
  );

  update public.reward_claims
    set seed = new_seed,
        is_top_100 = (new_row.citizen_number <= 100)
    where citizen_number = new_row.citizen_number
    returning * into new_row;

  select count(*) into total from public.reward_claims;

  return jsonb_build_object(
    'ok',           true,
    'citizenNumber', new_row.citizen_number,
    'total',         total,
    'fullCount',     total,
    'isTop100',      new_row.is_top_100,
    'seed',          new_row.seed,
    'username',      new_row.username,
    'claimedAt',     extract(epoch from new_row.claimed_at) * 1000
  );
end;
$$;

grant execute on function public.claim_reward(text, text, text[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- public.reward_status() — public counters for the reward page
-- ---------------------------------------------------------------------
create or replace function public.reward_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'fullCount',       count(*),
    'top100Remaining', greatest(0, 100 - count(*))::int,
    'requiredCount',   48
  )
  from public.reward_claims;
$$;

grant execute on function public.reward_status() to anon, authenticated;

-- Realtime so the counter updates live as new citizens claim.
alter publication supabase_realtime add table public.reward_claims;
