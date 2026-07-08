# Controlled Migration Runbook

## 1. Purpose
This runbook prepares the temporary TESTNET_PERSISTENT_DB for public Testnet persistent lifecycle testing.

**Owner-Approved Target:** The existing Supabase main project is used as the temporary Testnet Persistent DB to avoid duplicating work during Testnet validation.

## 2. Scope
- TESTNET_PERSISTENT_DB only.
- This is not final business production.
- This is not a real-money environment.
- No Vercel deployment in this runbook.
- No Stellar mainnet.
- Stellar Testnet only.

## 3. Prerequisites
- clean main at checkpoint/testnet-persistent-db-target-2026-07-08 or later;
- remote TESTNET_PERSISTENT_DB project available;
- service role key available only in secure operator environment;
- database backup/export prepared;
- WALLET_ENCRYPTION_KEY present in secure environment;
- Stellar Testnet RPC configured;
- deployed Soroban Testnet contract configured;
- operator knows this migration changes identifier strategy to profile-first TEXT IDs.

## 4. Actual TESTNET_PERSISTENT_DB schema discovery
- \user_wallets\ may be missing;
- \profiles.auth_user_id\ may be missing;
- \escrow_events.id\ may still be uuid;
- run the focused schema inspection before migration;
- if `user_wallets` is missing, use the schema gap patch migration (`web/supabase/migrations/20260707_testnet_persistent_db_schema_gap_patch.sql`);
- backup via `supabase db dump` may require Docker Desktop;
- if Docker is unavailable, record Docker-unavailable backup limitation and proceed only because owner approved TESTNET_PERSISTENT_DB testnet usage.

### Migration Ordering and Version-Prefix Safety

> [!WARNING]
> Supabase identifies migrations by the timestamp/version prefix before the first underscore (e.g. `20260707` from `20260707_testnet_persistent_db_schema_gap_patch.sql`). Two migration files must **never share the same version prefix**. If both the schema gap patch and the hybrid identity schema alignment migrations are pending, the schema gap patch (prefix `20260707`) must run before the hybrid migration (prefix `20260708`). Do NOT run `supabase db push` if the pending migration order is unsafe or if duplicate version prefixes exist.

**Local Migration Order Check:**
Verify that the schema gap patch sorts BEFORE the hybrid migration locally:
```powershell
Get-ChildItem web/supabase/migrations | Sort-Object Name | Select-Object Name
```

**Version-Prefix Uniqueness Audit:**
Verify no two migrations share the same Supabase version prefix:
```powershell
Get-ChildItem web/supabase/migrations |
  ForEach-Object {
    $name = $_.Name
    $version = ($name -split "_", 2)[0]
    [PSCustomObject]@{
      Name = $name
      VersionPrefix = $version
    }
  } |
  Sort-Object VersionPrefix, Name
```
If any VersionPrefix appears twice, do not proceed with migration until resolved.

**Supabase Migration History Check:**
Verify which migrations have already been applied remotely via SQL Editor:
```sql
select *
from supabase_migrations.schema_migrations
order by version;
```

### Remote migration history observed before execution

Remote applied versions observed:
- 20260615000000
- 20260615000001
- 20260630

Remote not yet applied at time of this fix:
- 20260705000000_offer_negotiation_schema.sql
- 20260705000001_profile_wallets.sql
- 20260706_constrained_failure_states.sql
- 20260707_testnet_persistent_db_schema_gap_patch.sql
- 20260708_hybrid_identity_schema_alignment.sql

## 5. Preflight checklist
- current git commit is checked;
- migration file content is verified;
- no pending migration surprises;
- current schema inspection performed;
- counts of existing profiles/user_wallets/escrow_events checked;
- orphan checks before FK creation completed;
- whether any user_wallets.user_id lacks matching profiles.id verified;
- whether any escrow_events.actor_id lacks matching profiles.id verified;
- whether profiles.auth_user_id already exists verified;

### Focused SQL Snippets for Schema Verification

**Table Existence:**
\\\sql
select
  expected.table_name,
  case when t.table_name is null then 'MISSING' else 'EXISTS' end as status
from (
  values
    ('profiles'),
    ('user_wallets'),
    ('escrow_events'),
    ('deals'),
    ('reputation_events')
) as expected(table_name)
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = expected.table_name
order by expected.table_name;
\\\

**Column Types:**
\\\sql
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'user_wallets',
    'escrow_events',
    'deals',
    'reputation_events'
  )
order by table_name, ordinal_position;
\\\

**Safe Orphan Check (escrow_events.actor_id):**
\\\sql
select e.id, e.actor_id
from public.escrow_events e
left join public.profiles p on e.actor_id = p.id
where p.id is null and e.actor_id is not null;
\\\

**Safe Orphan Check (user_wallets.user_id):**
\\\sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_wallets'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM public.user_wallets w
            LEFT JOIN public.profiles p ON w.user_id::text = p.id
            WHERE p.id IS NULL
        ) THEN
            RAISE EXCEPTION 'Orphans found in user_wallets.';
        ELSE
            RAISE NOTICE 'No orphans found in user_wallets.';
        END IF;
    ELSE
        RAISE NOTICE 'Table user_wallets does not exist. Skipping orphan check.';
    END IF;
END
$$;
\\\

## 6. Backup / export checklist
- Confirm data export is saved locally or safely stored before running any migrations.
- Ensure automated Supabase backups are verified active for the target environment.
- If Docker is unavailable and supabase db dump fails, manually export data via SQL Editor if possible, or proceed under owner's TESTNET_PERSISTENT_DB approval risk acceptance.

## 7. Migration execution sequence
Run the following against the TESTNET_PERSISTENT_DB project to deploy the schema change. Use a secure operator environment variable, secret manager, or Supabase CLI linked project. Do not paste database passwords into shell history.

> [!WARNING]
> Never commit, paste, screenshot, or print TESTNET_DATABASE_URL, STAGING_DATABASE_URL, service role keys, database passwords, WALLET_ENCRYPTION_KEY, or Stellar secrets.

No command should be run until explicit approval.

\\\ash
# Option A: using a secure local operator environment variable
supabase db push --db-url "$TESTNET_DATABASE_URL"

# Option B: using a linked TESTNET_PERSISTENT_DB project after explicit operator confirmation
supabase link --project-ref <PROJECT_REF>
supabase db push
\\\

## 8. Post-migration schema verification
Connect to the TESTNET_PERSISTENT_DB and verify:
- \profiles.auth_user_id\ exists;
- \profiles.auth_user_id\ is UUID nullable unique;
- \user_wallets.user_id\ is TEXT;
- \user_wallets.user_id\ references \profiles.id\;
- \escrow_events.id\ is TEXT;
- \escrow_events.actor_id\ references \profiles.id\;

## 9. Target seed / profile-wallet verification
- create or verify buyer profile;
- create or verify seller profile;
- provision profile wallets;
- ensure encrypted_secret_key exists server-side only;
- public API must expose public_address but not encrypted_secret_key.

## 10. Persistent-mode full lifecycle smoke test
Required lifecycle steps:
WAITING_DEPOSITS
-> BUYER_FUNDED
-> LOCKED
-> PROOF_SUBMITTED
-> DELIVERED
-> COMPLETED

Capture evidence:
- buyer profile id;
- seller profile id;
- buyer public wallet;
- seller public wallet;
- buyer deposit tx hash;
- seller deposit tx hash;
- proof tx hash;
- mark delivered tx hash;
- settlement tx hash;
- final deal state;
- latest_stellar_tx_hash;
- Supabase row proof for deals/events/wallets;
- no secret exposure.

**Note:** Reputation work starts only after persistent lifecycle is confirmed.

## 11. Abort criteria
- backup missing;
- unknown pending migrations;
- orphan rows exist;
- FK creation would fail;
- service role key leaks;
- WALLET_ENCRYPTION_KEY missing;
- migration syntax fails;
- public API exposes encrypted_secret_key;
- lifecycle diverges from expected state machine;
- tx hash missing after state transition;
- any blocker occurs (stop immediately).

## 12. Rollback strategy
- restore from backup preferred;
- do not blindly reverse schema if data already converted;
- record migration version and evidence;
- stop public testing until schema restored or repaired.

## 13. Required operator report
- environment;
- git SHA;
- migration version applied;
- preflight results;
- backup confirmation;
- schema verification results;
- lifecycle tx hashes;
- final state;
- persistence proof;
- security scan result;
- blockers;
- classification.

## 14. Notice
No remote migration was executed in this branch.
