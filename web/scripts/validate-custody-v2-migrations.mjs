import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260626010000_custody_v2_event_hardening.sql'), 'utf8');

const required = [
  /alter table custody_v2_events\s+alter column contract_deal_id drop not null;/i,
  /event_type = 'init'\s+and contract_deal_id is null/i,
  /event_type <> 'init'\s+and contract_deal_id is not null/i,
  /create index if not exists custody_v2_events_contract_scope_idx/i,
  /add column if not exists requested_start_ledger bigint/i,
  /add column if not exists oldest_available_ledger bigint/i,
  /add column if not exists latest_available_ledger bigint/i,
  /add column if not exists first_returned_event_id text/i,
  /add column if not exists gap_detected_at timestamptz/i,
];

const missing = required.filter((pattern) => !pattern.test(migration));
if (missing.length > 0) {
  process.stderr.write(`Custody V2 migration validation failed: ${missing.length} required patterns missing.\n`);
  process.exit(1);
}

const forbidden = [
  /secret/i,
  /seed/i,
  /private[_ -]?key/i,
];
const forbiddenHits = forbidden.filter((pattern) => pattern.test(migration));
if (forbiddenHits.length > 0) {
  process.stderr.write('Custody V2 migration validation failed: forbidden secret-like wording found.\n');
  process.exit(1);
}

process.stdout.write('Custody V2 migration static validation passed.\n');
