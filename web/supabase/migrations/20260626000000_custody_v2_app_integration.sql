-- Custody V2 application integration projection tables.
-- These tables store public contract links, operation status, event facts, and cursors only.
-- They intentionally do not store private keys, seed phrases, wallet secrets, or raw secret material.

create table if not exists custody_v2_deal_links (
  application_deal_id text primary key references deals(id) on delete cascade,
  rail_version text not null check (rail_version = 'custody_v2_testnet'),
  contract_id text not null,
  contract_deal_id text not null unique,
  terms_schema_version text not null check (terms_schema_version = 'settleway.terms.v1'),
  terms_hash text not null,
  canonical_terms_json text not null,
  canonical_terms_bytes_base64 text not null,
  frozen_at timestamptz not null,
  buyer_address text not null,
  seller_address text not null,
  mediator_address text not null,
  asset_contract_id text not null,
  settlement_asset_label text not null check (settlement_asset_label = 'XLM'),
  principal_base_units text not null,
  buyer_bond_base_units text not null,
  seller_bond_base_units text not null,
  funding_deadline_unix bigint not null,
  delivery_deadline_unix bigint not null,
  inspection_deadline_unix bigint not null,
  latest_contract_state text not null,
  latest_terminal_outcome text,
  last_confirmed_ledger bigint,
  last_reconciled_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint custody_v2_distinct_participants check (buyer_address <> seller_address),
  constraint custody_v2_distinct_mediator check (mediator_address <> buyer_address and mediator_address <> seller_address),
  constraint custody_v2_amount_strings check (
    principal_base_units ~ '^(0|[1-9][0-9]*)$'
    and buyer_bond_base_units ~ '^(0|[1-9][0-9]*)$'
    and seller_bond_base_units ~ '^(0|[1-9][0-9]*)$'
  )
);

create index if not exists custody_v2_deal_links_contract_idx
  on custody_v2_deal_links(contract_id);

create index if not exists custody_v2_deal_links_state_idx
  on custody_v2_deal_links(latest_contract_state);

create table if not exists custody_v2_operations (
  operation_id text primary key,
  application_deal_id text not null references deals(id) on delete cascade,
  contract_deal_id text not null,
  action_type text not null,
  actor_address text not null,
  idempotency_key text not null unique,
  prepared_transaction_body_fingerprint text not null,
  unsigned_transaction_xdr text not null,
  prepared_expires_at timestamptz not null,
  transaction_hash text,
  status text not null,
  rpc_result_category text,
  confirmed_ledger bigint,
  failure_code text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists custody_v2_operations_deal_idx
  on custody_v2_operations(application_deal_id, created_at);

create index if not exists custody_v2_operations_contract_deal_idx
  on custody_v2_operations(contract_deal_id);

create index if not exists custody_v2_operations_tx_idx
  on custody_v2_operations(transaction_hash)
  where transaction_hash is not null;

create table if not exists custody_v2_events (
  event_id text primary key,
  contract_id text not null,
  contract_deal_id text not null,
  event_type text not null,
  ledger bigint not null,
  transaction_hash text not null,
  event_index integer not null,
  decoded_public_facts jsonb not null,
  ingested_at timestamptz not null,
  unique(contract_id, ledger, transaction_hash, event_index)
);

create index if not exists custody_v2_events_deal_idx
  on custody_v2_events(contract_deal_id, ledger, event_index);

create index if not exists custody_v2_events_tx_idx
  on custody_v2_events(transaction_hash);

create table if not exists custody_v2_event_cursors (
  network text not null check (network = 'testnet'),
  contract_id text not null,
  last_processed_ledger bigint,
  cursor text,
  last_successful_ingestion_at timestamptz,
  detected_gap_status text not null check (detected_gap_status in ('none', 'gap_detected', 'stale')),
  primary key(network, contract_id)
);
