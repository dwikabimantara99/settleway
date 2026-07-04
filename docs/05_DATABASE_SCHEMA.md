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
  rail_version text not null default 'legacy_demo' check (rail_version in ('legacy_demo', 'custody_v2_testnet', 'managed_custody_testnet')),
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

### custody_v2_deal_links

```sql
create table custody_v2_deal_links (
  application_deal_id text primary key references deals(id),
  rail_version text not null check (rail_version in ('custody_v2_testnet', 'managed_custody_testnet')),
  contract_id text not null,
  contract_deal_id text not null unique,
  terms_schema_version text not null,
  terms_hash text not null,
  canonical_terms_json text not null,
  canonical_terms_bytes_base64 text not null,
  frozen_at timestamptz not null,
  buyer_address text not null,
  seller_address text not null,
  mediator_address text not null,
  asset_contract_id text not null,
  settlement_asset_label text not null,
  principal_base_units text not null,
  buyer_bond_base_units text not null,
  seller_bond_base_units text not null,
  funding_deadline_unix bigint not null,
  delivery_deadline_unix bigint not null,
  inspection_deadline_unix bigint not null,
  buyer_funded_tx text,
  seller_funded_tx text,
  settlement_tx text,
  latest_contract_state text not null,
  latest_terminal_outcome text,
  last_confirmed_ledger bigint,
  last_reconciled_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

### custody_v2_operations

```sql
create table custody_v2_operations (
  operation_id text primary key default gen_random_uuid()::text,
  application_deal_id text references deals(id),
  contract_deal_id text not null,
  action_type text not null check (action_type in ('CREATE_DEAL', 'ACCEPT_TERMS', 'FUND_BUYER', 'FUND_SELLER', 'SUBMIT_EVIDENCE', 'ACCEPT_DELIVERY', 'EXPIRE_FUNDING')),
  actor_address text not null,
  idempotency_key text not null unique,
  prepared_transaction_body_fingerprint text not null,
  unsigned_transaction_xdr text not null,
  prepared_expires_at timestamptz not null,
  transaction_hash text,
  status text not null check (status in ('prepared', 'submitted', 'confirmed', 'failed', 'expired')),
  rpc_result_category text,
  confirmed_ledger bigint,
  failure_code text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

### custody_v2_events

```sql
create table custody_v2_events (
  event_id text primary key,
  contract_id text not null,
  contract_deal_id text,
  event_type text not null,
  ledger bigint not null,
  transaction_hash text not null,
  event_index integer not null,
  decoded_public_facts jsonb not null,
  ingested_at timestamptz default now() not null,
  unique (contract_id, transaction_hash, event_index)
);
```

### custody_v2_event_cursors

```sql
create table custody_v2_event_cursors (
  network text not null,
  contract_id text not null,
  last_processed_ledger bigint,
  cursor text,
  last_successful_ingestion_at timestamptz,
  detected_gap_status text not null,
  requested_start_ledger bigint,
  oldest_available_ledger bigint,
  latest_available_ledger bigint,
  first_returned_event_id text,
  gap_detected_at timestamptz,
  primary key (network, contract_id)
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
create index idx_custody_v2_ops_deal on custody_v2_operations(application_deal_id);
create index idx_custody_v2_events_deal_ledger on custody_v2_events(contract_deal_id, ledger, event_index);
```

## Custody V2 Security Model

The Custody V2 tables enforce a strict server-controlled RLS model to protect blockchain-derived state and transactional integrity:

*   **custody_v2_deal_links**: Participant-readable where appropriate.
*   **custody_v2_operations**: Participant-readable where appropriate.
*   **custody_v2_events**: Participant-readable where appropriate.
*   **custody_v2_event_cursors**: Strictly server-only. No participant access.

**Security Constraints**: Custody V2 internal tables are server-controlled for writes. Direct participant `INSERT`, `UPDATE`, and `DELETE` are not allowed. All persistent Custody V2 mutations require the server-side service-role writer.

*Note: The 20260630_custody_v2_persistence.sql migration defines this schema but has not been applied to any Supabase project yet. Actual Supabase remote readiness remains unverified.*
