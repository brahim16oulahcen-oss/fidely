-- ════════════════════════════════════════════════════════════════════════
-- Fidely — schéma PostgreSQL / Supabase (cible de production)
-- STATUT : schéma de référence NON EXÉCUTÉ dans le prototype. Il reflète
-- src/types/domain.ts et doit être testé sur un projet Supabase avant usage.
-- Principe : chaque table métier porte merchant_id ; les politiques RLS
-- n'autorisent l'accès qu'aux membres du commerce, selon leur rôle.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create type plan_id as enum ('starter', 'pro', 'business');
create type merchant_status as enum ('active', 'trial', 'suspended', 'cancelled');
create type member_role as enum ('owner', 'manager', 'staff');
create type program_type as enum ('stamps', 'points', 'cashback', 'tiers');
create type tier as enum ('bronze', 'silver', 'gold');
create type channel as enum ('email', 'sms', 'wallet');
create type tx_kind as enum ('earn', 'redeem', 'cashback_use', 'welcome', 'adjust');

-- ─── Comptes ────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null default '',
  address text not null default '',
  city text not null default '',
  postal_code text not null default '',
  phone text not null default '',
  email text not null default '',
  siret text,
  logo jsonb not null default '{}'::jsonb,
  colors jsonb not null,
  plan_id plan_id not null default 'pro',
  status merchant_status not null default 'trial',
  primary_program_id uuid,
  onboarding_completed boolean not null default false,
  suspended_reason text,
  settings jsonb not null default '{"minSecondsBetweenVisits":60,"maxAmountCents":50000,"retentionMonths":36,"attributionRate":0.2}'::jsonb,
  created_at timestamptz not null default now()
);

create table memberships (
  user_id uuid not null references profiles (id) on delete cascade,
  merchant_id uuid not null references merchants (id) on delete cascade,
  role member_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, merchant_id)
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  name text not null,
  address text not null default '',
  created_at timestamptz not null default now()
);

-- ─── Fidélité ───────────────────────────────────────────────────────────
create table programs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  name text not null,
  type program_type not null,
  status text not null check (status in ('active', 'inactive')),
  rules jsonb not null,
  rule_version int not null default 1,
  card jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table merchants add constraint merchants_primary_program_fk foreign key (primary_program_id) references programs (id) on delete set null;

-- Historique des versions de règles (non-rétroactivité auditable)
create table program_rule_versions (
  program_id uuid not null references programs (id) on delete cascade,
  merchant_id uuid not null references merchants (id) on delete cascade,
  version int not null,
  rules jsonb not null,
  created_at timestamptz not null default now(),
  primary key (program_id, version)
);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  program_id uuid not null references programs (id) on delete cascade,
  name text not null,
  description text not null default '',
  cost int not null check (cost >= 0),
  validity_days int not null check (validity_days > 0),
  quantity int,
  issued_count int not null default 0,
  active boolean not null default true,
  auto_unlock boolean not null default false,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  email text not null,
  phone text not null default '',
  birthday text,
  consent jsonb not null,
  source text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index customers_merchant_email on customers (merchant_id, lower(email)) where deleted_at is null;

create table cards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  program_id uuid not null references programs (id),
  customer_id uuid not null references customers (id) on delete cascade,
  token_hash text not null unique,        -- on ne stocke que l'empreinte du jeton secret
  scan_code text not null unique,         -- contenu du QR, sans donnée personnelle
  stamps int not null default 0 check (stamps >= 0),
  points int not null default 0 check (points >= 0),
  lifetime_points int not null default 0,
  cashback_cents int not null default 0 check (cashback_cents >= 0),
  tier tier not null default 'bronze',
  visits int not null default 0,
  total_spent_cents bigint not null default 0,
  last_visit_at timestamptz,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  store_id uuid references stores (id),
  program_id uuid not null references programs (id),
  card_id uuid not null references cards (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  kind tx_kind not null,
  amount_cents int,
  stamps_delta int not null default 0,
  points_delta int not null default 0,
  cashback_delta_cents int not null default 0,
  reward_id uuid references rewards (id),
  issuance_id uuid,
  rule_version int not null,
  rule_summary text not null,
  actor_user_id uuid references profiles (id),
  idempotency_key text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)    -- anti double soumission
);
create index transactions_merchant_created on transactions (merchant_id, created_at desc);

create table reward_issuances (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  reward_id uuid not null references rewards (id),
  card_id uuid not null references cards (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  status text not null check (status in ('available', 'redeemed', 'expired')),
  unlocked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references profiles (id),
  redeem_transaction_id uuid references transactions (id)
);

-- ─── Marketing ──────────────────────────────────────────────────────────
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  name text not null, channel channel not null, segment text not null,
  subject text, message text not null,
  status text not null check (status in ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_at timestamptz, sent_at timestamptz, automation text,
  stats jsonb not null default '{}'::jsonb,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create table automations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  trigger text not null, enabled boolean not null default false,
  channel channel not null, message text not null, last_run_at timestamptz,
  unique (merchant_id, trigger)
);
create table message_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  channel channel not null, status text not null, preview text not null,
  created_at timestamptz not null default now()
);
create table consent_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  channel text not null, granted boolean not null, source text not null,
  created_at timestamptz not null default now()
);

-- ─── Facturation, support, audit ────────────────────────────────────────
create table subscriptions (
  merchant_id uuid primary key references merchants (id) on delete cascade,
  plan_id plan_id not null, status text not null, provider text not null,
  stripe_customer_id text, stripe_subscription_id text,
  started_at timestamptz not null, current_period_end timestamptz not null, cancelled_at timestamptz
);
create table invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  number text not null unique, plan_id plan_id not null, amount_cents int not null,
  issued_at timestamptz not null, period_start timestamptz not null, period_end timestamptz not null,
  status text not null
);
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  subject text not null, body text not null, status text not null, priority text not null, kind text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid, actor_label text not null,
  merchant_id uuid references merchants (id) on delete set null,
  action text not null, target text not null, metadata jsonb,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false)
$$;

create or replace function member_role_of(m uuid) returns member_role
language sql stable security definer set search_path = public as $$
  select role from memberships where user_id = auth.uid() and merchant_id = m
$$;

create or replace function is_member(m uuid) returns boolean
language sql stable as $$ select member_role_of(m) is not null $$;

create or replace function is_manager(m uuid) returns boolean
language sql stable as $$ select member_role_of(m) in ('owner', 'manager') $$;

do $$
declare t text;
begin
  foreach t in array array['stores','programs','program_rule_versions','rewards','customers','cards','transactions',
    'reward_issuances','campaigns','automations','message_logs','consent_logs','invoices','support_tickets'] loop
    execute format('alter table %I enable row level security', t);
    -- Lecture : membres du commerce (et admin plateforme)
    execute format('create policy %I on %I for select using (is_member(merchant_id) or is_platform_admin())', t || '_read', t);
  end loop;
end $$;

alter table merchants enable row level security;
alter table memberships enable row level security;
alter table subscriptions enable row level security;
alter table audit_logs enable row level security;
alter table profiles enable row level security;

create policy merchants_read on merchants for select using (is_member(id) or is_platform_admin());
create policy merchants_update on merchants for update using (member_role_of(id) = 'owner') with check (member_role_of(id) = 'owner');
create policy memberships_read on memberships for select using (user_id = auth.uid() or is_manager(merchant_id) or is_platform_admin());
create policy subscriptions_read on subscriptions for select using (member_role_of(merchant_id) = 'owner' or is_platform_admin());
create policy audit_read on audit_logs for select using (is_platform_admin() or (merchant_id is not null and is_manager(merchant_id)));
create policy profiles_self on profiles for select using (id = auth.uid() or is_platform_admin());

-- Écritures de gestion réservées aux propriétaires/managers
create policy programs_write on programs for all using (is_manager(merchant_id)) with check (is_manager(merchant_id));
create policy rewards_write on rewards for all using (is_manager(merchant_id)) with check (is_manager(merchant_id));
create policy campaigns_write on campaigns for all using (is_manager(merchant_id)) with check (is_manager(merchant_id));
create policy automations_write on automations for all using (is_manager(merchant_id)) with check (is_manager(merchant_id));
create policy tickets_write on support_tickets for insert with check (is_manager(merchant_id));

-- Les opérations de fidélité (cards, transactions, reward_issuances) ne sont JAMAIS
-- écrites directement par le client SQL : elles passent par des fonctions serveur
-- (service role) qui appliquent verrou, idempotence, anti-fraude et audit, comme
-- src/features/loyalty/operations.ts. Aucune politique d'écriture n'est donc ouverte.
-- Le client final (sans compte) accède à sa carte via le jeton secret, côté serveur uniquement.
