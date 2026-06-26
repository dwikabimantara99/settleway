-- Custody V2 final event hardening.
-- Allows contract-scoped init events, preserves opaque RPC cursors, and records
-- retention-gap audit metadata without storing private wallet material.

alter table custody_v2_events
  alter column contract_deal_id drop not null;

alter table custody_v2_events
  add constraint custody_v2_events_scope_check check (
    (
      event_type = 'init'
      and contract_deal_id is null
    )
    or (
      event_type <> 'init'
      and contract_deal_id is not null
      and contract_deal_id ~ '^[0-9a-f]{64}$'
    )
  );

create index if not exists custody_v2_events_contract_scope_idx
  on custody_v2_events(contract_id, ledger, event_index)
  where contract_deal_id is null;

alter table custody_v2_event_cursors
  add column if not exists requested_start_ledger bigint,
  add column if not exists oldest_available_ledger bigint,
  add column if not exists latest_available_ledger bigint,
  add column if not exists first_returned_event_id text,
  add column if not exists gap_detected_at timestamptz;
