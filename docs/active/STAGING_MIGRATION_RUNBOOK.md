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
- clean main at checkpoint/staging-operator-env-preflight-2026-07-08 or later;
- remote TESTNET_PERSISTENT_DB project available;
- service role key available only in secure operator environment;
- database backup/export prepared;
- WALLET_ENCRYPTION_KEY present in secure environment;
- Stellar Testnet RPC configured;
- deployed Soroban Testnet contract configured;
- operator knows this migration changes identifier strategy to profile-first TEXT IDs.

## 4. Preflight checklist
- current git commit is checked;
- migration file content is verified;
- no pending migration surprises;
- current schema inspection performed;
- counts of existing profiles/user_wallets/escrow_events checked;
- orphan checks before FK creation completed;
- whether any user_wallets.user_id lacks matching profiles.id verified;
- whether any escrow_events.actor_id lacks matching profiles.id verified;
- whether profiles.auth_user_id already exists verified;

## 5. Backup / export checklist
- Confirm data export is saved locally or safely stored before running any migrations.
- Ensure automated Supabase backups are verified active for the target environment.

## 6. Migration execution sequence
Run the following against the TESTNET_PERSISTENT_DB project to deploy the schema change. Use a secure operator environment variable, secret manager, or Supabase CLI linked project. Do not paste database passwords into shell history.

> [!WARNING]
> Never commit, paste, screenshot, or print TESTNET_DATABASE_URL, STAGING_DATABASE_URL, service role keys, database passwords, WALLET_ENCRYPTION_KEY, or Stellar secrets.

No command should be run until explicit approval.

\\\ash
# Option A: using a secure local operator environment variable
supabase db push --db-url "$TESTNET_DATABASE_URL"

# Option B: using a linked staging project after explicit operator confirmation
supabase link --project-ref <PROJECT_REF>
supabase db push
\\\

## 7. Post-migration schema verification
Connect to the TESTNET_PERSISTENT_DB and verify:
- \profiles.auth_user_id\ exists;
- \profiles.auth_user_id\ is UUID nullable unique;
- \user_wallets.user_id\ is TEXT;
- \user_wallets.user_id\ references \profiles.id\;
- \escrow_events.id\ is TEXT;
- \escrow_events.actor_id\ references \profiles.id\;

## 8. Target seed / profile-wallet verification
- create or verify buyer profile;
- create or verify seller profile;
- provision profile wallets;
- ensure encrypted_secret_key exists server-side only;
- public API must expose public_address but not encrypted_secret_key.

## 9. Persistent-mode full lifecycle smoke test
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

## 10. Abort criteria
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

## 11. Rollback strategy
- restore from backup preferred;
- do not blindly reverse schema if data already converted;
- record migration version and evidence;
- stop public testing until schema restored or repaired.

## 12. Required operator report
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

## 13. Notice
No remote migration was executed in this branch.
