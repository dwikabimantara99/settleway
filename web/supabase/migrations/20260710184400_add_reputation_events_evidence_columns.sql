alter table public.reputation_events
  add column if not exists proof_hash text;

alter table public.reputation_events
  add column if not exists transaction_hash text;

alter table public.reputation_events
  add column if not exists settlement_reference text;

alter table public.reputation_events
  add column if not exists settled_at timestamptz;
