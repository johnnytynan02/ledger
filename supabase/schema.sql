-- ============================================================
-- Ledger – Supabase schema
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  base_currency text not null default 'GBP',
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Transactions ─────────────────────────────────────────────
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  date          date not null,
  description   text not null,
  amount        numeric(14,4) not null,  -- positive = credit, negative = debit
  currency      text not null default 'GBP',
  account       text not null,           -- 'revolut' | 'wise' | 'lloyds' | 'asb' | 'monzo' | custom
  category      text not null default 'uncategorised',
  confidence    numeric(4,3) default 0,  -- 0.000 – 1.000
  reviewed      boolean not null default false,
  notes         text,
  group_id      uuid,                    -- FK set after group_expenses table is created
  created_at    timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index transactions_user_date on public.transactions (user_id, date desc);
create index transactions_user_month on public.transactions (user_id, date_trunc('month', date));


-- ── Budgets ─────────────────────────────────────────────────
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  category      text not null,
  amount        numeric(10,2) not null,
  created_at    timestamptz default now(),
  unique (user_id, category)
);

alter table public.budgets enable row level security;
create policy "Users manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── Group expenses ───────────────────────────────────────────
create table public.group_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  total_amount  numeric(14,4) not null,
  currency      text not null default 'GBP',
  date          date not null,
  notes         text,
  created_at    timestamptz default now()
);

alter table public.group_expenses enable row level security;
create policy "Users manage own group expenses"
  on public.group_expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Now add the FK from transactions → group_expenses
alter table public.transactions
  add constraint transactions_group_id_fkey
  foreign key (group_id) references public.group_expenses(id) on delete set null;


-- ── Group members ────────────────────────────────────────────
create table public.group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.group_expenses on delete cascade,
  name          text not null,
  share_amount  numeric(14,4) not null
);

alter table public.group_members enable row level security;
create policy "Members visible to group owner"
  on public.group_members for all
  using (
    exists (
      select 1 from public.group_expenses
      where id = group_id and user_id = auth.uid()
    )
  );


-- ── Reimbursements ───────────────────────────────────────────
create table public.reimbursements (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.group_expenses on delete cascade,
  from_name     text not null,
  amount        numeric(14,4) not null,
  date          date,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at    timestamptz default now()
);

alter table public.reimbursements enable row level security;
create policy "Reimbursements visible to group owner"
  on public.reimbursements for all
  using (
    exists (
      select 1 from public.group_expenses
      where id = group_id and user_id = auth.uid()
    )
  );


-- ── FX cache (optional, reduces API calls) ───────────────────
create table public.fx_rates (
  base        text not null,
  quote       text not null,
  rate        numeric(20,8) not null,
  fetched_at  timestamptz default now(),
  primary key (base, quote)
);

-- Anyone can read, only service role can write
alter table public.fx_rates enable row level security;
create policy "Anyone can read fx rates" on public.fx_rates for select using (true);
