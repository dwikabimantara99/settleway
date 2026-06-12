# 05 - Database Schema

Use Supabase Postgres for production-like persistence. Use a mock fallback while developing.

## Tables

### profiles

```sql
create table profiles (
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
```

### listings

```sql
create table listings (
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
```

### buyer_requests

```sql
create table buyer_requests (
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
```

### deals

```sql
create table deals (
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
  contract_id text,
  latest_tx_hash text,
  proof_hash text,
  terms jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### escrow_events

```sql
create table escrow_events (
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
```

### evidence_files

```sql
create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  deal_id text references deals(id),
  uploader_id text references profiles(id),
  file_name text,
  storage_path text,
  mime_type text,
  file_size_bytes integer,
  sha256_hash text not null,
  created_at timestamptz default now()
);
```

### reputation_events

```sql
create table reputation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id text references profiles(id),
  deal_id text references deals(id),
  role_context text not null check (role_context in ('buyer','seller')),
  event_type text not null,
  score_delta numeric default 0,
  volume_delta_idr numeric default 0,
  public_tx_hash text,
  created_at timestamptz default now()
);
```

## Indexes

```sql
create index idx_listings_seller on listings(seller_id);
create index idx_buyer_requests_buyer on buyer_requests(buyer_id);
create index idx_deals_buyer on deals(buyer_id);
create index idx_deals_seller on deals(seller_id);
create index idx_escrow_events_deal on escrow_events(deal_id, created_at);
create index idx_reputation_events_profile on reputation_events(profile_id, created_at);
```
