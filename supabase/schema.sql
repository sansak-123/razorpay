-- Run this in the Supabase dashboard's SQL Editor (Project -> SQL Editor).
-- Not something this codebase executes itself -- Supabase schema changes
-- go through their dashboard/CLI, not a local migration runner here.
--
-- Both tables store the whole computed object as a single jsonb column per
-- row, deliberately not normalized into per-exception/per-message tables --
-- this is a hackathon-scale feature, and a flat jsonb blob is queryable
-- enough (Postgres jsonb operators work fine on it later) without the
-- schema complexity a fully normalized design would add for no current
-- benefit.

create table public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  report jsonb not null,
  -- The raw GeneratedData (orders/settlementLines/bankRows) alongside the
  -- computed Report -- the Settlements page's buildBatchSummaries() needs
  -- the raw settlement lines to group into batches, which the Report object
  -- alone doesn't carry.
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.reconciliation_runs enable row level security;

create policy "select own runs" on public.reconciliation_runs
  for select using (auth.uid() = user_id);

create policy "insert own runs" on public.reconciliation_runs
  for insert with check (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  ai_answered boolean,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "select own messages" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "insert own messages" on public.chat_messages
  for insert with check (auth.uid() = user_id);
