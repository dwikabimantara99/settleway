-- Phase 10 Schema Foundation

create table if not exists profiles (
  id text primary key,
  display_name text not null,
  role_label text not null,
  location text,
  user_type text not null check (user_type in ('seller','buyer','both','operator')),
  seller_score numeric default 0,
  buyer_score numeric default 0,
  seller_completed_count integer default 0,
  buyer_completed_count integer default 0,
  verified_volume_idr numeric default 0,
  proof_visibility text default 'private' check (proof_visibility in ('public','private')),
  created_at timestamptz default now()
);

create table if not exists listings (
  id text primary key,
  seller_id text references profiles(id),
  commodity text not null,
  variety text,
  status text not null check (status in ('ready_stock','pre_harvest')),
  location text,
  estimated_volume_kg numeric,
  price_per_kg_idr numeric,
  estimated_value_idr numeric,
  harvest_date date,
  description text,
  created_at timestamptz default now()
);

create table if not exists buyer_requests (
  id text primary key,
  buyer_id text references profiles(id),
  commodity text not null,
  required_volume_kg numeric,
  target_price_per_kg_idr numeric,
  delivery_location text,
  required_by date,
  description text,
  status text default 'open' check (status in ('open','matched','closed')),
  created_at timestamptz default now()
);

create table if not exists deals (
  id text primary key,
  listing_id text references listings(id),
  buyer_request_id text references buyer_requests(id),
  buyer_id text references profiles(id),
  seller_id text references profiles(id),
  commodity text not null,
  volume_kg numeric,
  principal_idr numeric not null,
  buyer_bond_idr numeric not null,
  seller_bond_idr numeric not null,
  buyer_fee_idr numeric not null,
  seller_fee_idr numeric not null,
  buyer_total_idr numeric not null,
  seller_total_idr numeric not null,
  status text not null,
  stellar_mode text default 'not_configured',
  stellar_contract_id text,
  stellar_escrow_id text,
  latest_stellar_tx_hash text,
  stellar_sync_status text default 'idle',
  proof_hash text,
  terms jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists escrow_events (
  id uuid primary key default gen_random_uuid(),
  deal_id text references deals(id),
  event_type text not null,
  actor_id text,
  message text,
  tx_hash text,
  proof_hash text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists evidence_files (
  id text primary key,
  deal_id text references deals(id),
  submitted_by text references profiles(id),
  evidence_kind text,
  original_filename text,
  mime_type text,
  byte_size integer,
  sha256_hash text not null,
  display_visibility text default 'private' check (display_visibility in ('public','private','deal_only')),
  chain_operation_reference text,
  created_at timestamptz default now()
);

create table if not exists reputation_events (
  id text primary key,
  profile_id text references profiles(id),
  deal_id text references deals(id),
  participant_id text not null,
  participant_role text not null check (participant_role in ('buyer','seller')),
  reputation_outcome text not null,
  reputation_rule_version text not null,
  idempotency_key text not null unique,
  score_delta numeric default 0,
  volume_delta_idr numeric default 0,
  public_tx_hash text,
  created_at timestamptz default now()
);

create table if not exists stellar_operations (
  idempotency_key text primary key,
  deal_id text references deals(id),
  requested_action text not null,
  expected_local_status text not null,
  target_local_status text not null,
  stellar_method text not null,
  operation_status text not null,
  transaction_hash text,
  result_escrow_id text,
  public_error_code text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_listings_seller on listings(seller_id);
create index if not exists idx_buyer_requests_buyer on buyer_requests(buyer_id);
create index if not exists idx_deals_buyer on deals(buyer_id);
create index if not exists idx_deals_seller on deals(seller_id);
create index if not exists idx_escrow_events_deal on escrow_events(deal_id, created_at);
create index if not exists idx_reputation_events_profile on reputation_events(participant_id, created_at);
create index if not exists idx_stellar_operations_deal on stellar_operations(deal_id);
