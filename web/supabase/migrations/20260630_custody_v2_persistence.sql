-- 1. Add rail_version to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rail_version text NOT NULL DEFAULT 'legacy_demo' CHECK (rail_version IN ('legacy_demo', 'custody_v2_testnet', 'managed_custody_testnet'));

-- 2. Custody V2 Deal Links
CREATE TABLE IF NOT EXISTS custody_v2_deal_links (
  application_deal_id text PRIMARY KEY REFERENCES deals(id),
  rail_version text NOT NULL CHECK (rail_version IN ('custody_v2_testnet', 'managed_custody_testnet')),
  contract_id text NOT NULL,
  contract_deal_id text NOT NULL UNIQUE,
  terms_schema_version text NOT NULL,
  terms_hash text NOT NULL,
  canonical_terms_json text NOT NULL,
  canonical_terms_bytes_base64 text NOT NULL,
  frozen_at timestamptz NOT NULL,
  buyer_address text NOT NULL,
  seller_address text NOT NULL,
  mediator_address text NOT NULL,
  asset_contract_id text NOT NULL,
  settlement_asset_label text NOT NULL,
  principal_base_units text NOT NULL,
  buyer_bond_base_units text NOT NULL,
  seller_bond_base_units text NOT NULL,
  funding_deadline_unix bigint NOT NULL,
  delivery_deadline_unix bigint NOT NULL,
  inspection_deadline_unix bigint NOT NULL,
  buyer_funded_tx text,
  seller_funded_tx text,
  settlement_tx text,
  latest_contract_state text NOT NULL,
  latest_terminal_outcome text,
  last_confirmed_ledger bigint,
  last_reconciled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Custody V2 Operations
CREATE TABLE IF NOT EXISTS custody_v2_operations (
  operation_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  application_deal_id text REFERENCES deals(id),
  contract_deal_id text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('CREATE_DEAL', 'ACCEPT_TERMS', 'FUND_BUYER', 'FUND_SELLER', 'SUBMIT_EVIDENCE', 'ACCEPT_DELIVERY', 'EXPIRE_FUNDING')),
  actor_address text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  prepared_transaction_body_fingerprint text NOT NULL,
  unsigned_transaction_xdr text NOT NULL,
  prepared_expires_at timestamptz NOT NULL,
  transaction_hash text,
  status text NOT NULL CHECK (status IN ('prepared', 'submitted', 'confirmed', 'failed', 'expired')),
  rpc_result_category text,
  confirmed_ledger bigint,
  failure_code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custody_v2_ops_deal ON custody_v2_operations(application_deal_id);

-- 4. Custody V2 Events
CREATE TABLE IF NOT EXISTS custody_v2_events (
  event_id text PRIMARY KEY,
  contract_id text NOT NULL,
  contract_deal_id text,
  event_type text NOT NULL,
  ledger bigint NOT NULL,
  transaction_hash text NOT NULL,
  event_index integer NOT NULL,
  decoded_public_facts jsonb NOT NULL,
  ingested_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (contract_id, transaction_hash, event_index)
);

CREATE INDEX IF NOT EXISTS idx_custody_v2_events_deal_ledger ON custody_v2_events(contract_deal_id, ledger, event_index);

-- 5. Custody V2 Event Cursors
CREATE TABLE IF NOT EXISTS custody_v2_event_cursors (
  network text NOT NULL,
  contract_id text NOT NULL,
  last_processed_ledger bigint,
  cursor text,
  last_successful_ingestion_at timestamptz,
  detected_gap_status text NOT NULL,
  requested_start_ledger bigint,
  oldest_available_ledger bigint,
  latest_available_ledger bigint,
  first_returned_event_id text,
  gap_detected_at timestamptz,
  PRIMARY KEY (network, contract_id)
);

-- RLS Enablement
ALTER TABLE custody_v2_deal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_v2_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_v2_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_v2_event_cursors ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation

-- custody_v2_deal_links
DROP POLICY IF EXISTS "Deal links select by participants" ON custody_v2_deal_links;
CREATE POLICY "Deal links select by participants" ON custody_v2_deal_links FOR SELECT
USING (EXISTS (SELECT 1 FROM deals d WHERE d.id = application_deal_id AND (d.buyer_id = auth.uid()::text OR d.seller_id = auth.uid()::text)));

DROP POLICY IF EXISTS "Deal links insert by participants" ON custody_v2_deal_links;
DROP POLICY IF EXISTS "Deal links update by participants" ON custody_v2_deal_links;

-- custody_v2_operations
DROP POLICY IF EXISTS "Custody ops select by participants" ON custody_v2_operations;
CREATE POLICY "Custody ops select by participants" ON custody_v2_operations FOR SELECT
USING (EXISTS (SELECT 1 FROM deals d WHERE d.id = application_deal_id AND (d.buyer_id = auth.uid()::text OR d.seller_id = auth.uid()::text)));

DROP POLICY IF EXISTS "Custody ops insert by participants" ON custody_v2_operations;
DROP POLICY IF EXISTS "Custody ops update by participants" ON custody_v2_operations;

-- custody_v2_events (Append-Only)
DROP POLICY IF EXISTS "Custody events select by participants" ON custody_v2_events;
CREATE POLICY "Custody events select by participants" ON custody_v2_events FOR SELECT
USING (
  (contract_deal_id IS NOT NULL AND EXISTS (SELECT 1 FROM custody_v2_deal_links l JOIN deals d ON d.id = l.application_deal_id WHERE l.contract_deal_id = custody_v2_events.contract_deal_id AND (d.buyer_id = auth.uid()::text OR d.seller_id = auth.uid()::text)))
  OR
  (contract_deal_id IS NULL AND EXISTS (SELECT 1 FROM custody_v2_deal_links l JOIN deals d ON d.id = l.application_deal_id WHERE l.contract_id = custody_v2_events.contract_id AND (d.buyer_id = auth.uid()::text OR d.seller_id = auth.uid()::text)))
);

DROP POLICY IF EXISTS "Custody events insert by participants" ON custody_v2_events;

-- custody_v2_event_cursors
DROP POLICY IF EXISTS "Cursors select by participants" ON custody_v2_event_cursors;

DROP POLICY IF EXISTS "Cursors insert by participants" ON custody_v2_event_cursors;
DROP POLICY IF EXISTS "Cursors update by participants" ON custody_v2_event_cursors;

