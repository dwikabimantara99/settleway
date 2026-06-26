# 25 - Custody V2 Final Event Hardening Report

Status: completed on `work/custody-v2-app-integration`; not merged to `main`.

## Scope

This batch hardened the Custody V2 application event-ingestion layer only. It preserved the accepted application-layer Testnet success and funding-expiry proof, Aurora frontend, legacy demo rail, and accepted Custody V2.1 contract.

No new contract deployment, new deal proof, production custody claim, bank rail, mainnet rail, breach/dispute integration, or reputation projection was added.

## Implemented

- Preserved exact opaque Stellar RPC event cursors.
- Resumed event polling with cursor-only requests after a cursor exists.
- Added bounded multi-page polling.
- Added same-ledger page safety through opaque cursor pagination.
- Prevented cursor advancement if event persistence fails.
- Stored contract-scoped `init` events with `contract_deal_id = null`.
- Required valid bytes32 deal IDs for deal-scoped events.
- Added stricter event topic count, event type, transaction hash, event ID, ledger, event-index, and non-negative amount validation.
- Added persistent retention-gap audit fields: requested start ledger, oldest available ledger, latest available ledger, first returned event ID, and gap detection time.
- Preserved `gap_detected` state instead of clearing it merely because newer events are returned.
- Separated direct contract-reader decode failures from RPC/simulation failures and added explicit config/info mismatch checks.
- Added an additive Supabase migration for event scope and cursor audit metadata.
- Added a static migration validator for environments without local Supabase tooling.
- Added a read-only forced-pagination Testnet proof harness.
- Added founder browser Freighter acceptance gate documentation.

## Forced-Pagination Testnet Proof

Command:

```powershell
cd web
npm run proof:custody-v2-events
```

Result:

- Network: Stellar Testnet
- Contract ID: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- Start ledger: `3288466`
- Forced page limit: `2`
- First pass: `31` events seen, `31` appended, `16` pages, status `caught_up`
- Replay pass: `0` appended, `0` seen, status `caught_up`
- Persisted cursor: `0014135738098515967-4294967295`
- Gap detected: `false`
- First returned event ID: `0014123931233439744-0000000000`
- Contract-scoped init events with null deal ID: `1`

Accepted scenario verification:

- Success contract deal: `54c6741ef8c941c4aec25b673db0306f5c635680f1a22a3bb4a673df5e1ebf39`
- Success event count: `11`
- Success direct state: `SettledSuccess`
- Success terminal outcome: `SettledSuccess`
- Funding-expiry contract deal: `d0307b1c65779ea8656735f67d1243e94a6936050dbf387fb6fd503a5fa077d1`
- Funding-expiry event count: `6`
- Funding-expiry direct state: `FundingExpired`
- Funding-expiry terminal outcome: `FundingExpired`

## Migration Validation

Docker and Supabase CLI were not available in the execution environment:

- `docker --version`: command not found
- `supabase --version`: command not found

Static migration validation completed:

```powershell
cd web
npm run validate:custody-v2-migrations
```

Result: `Custody V2 migration static validation passed.`

## Tests

Focused custody tests completed:

```powershell
cd web
npm run test -- src/lib/custody-v2/events.test.ts src/lib/custody-v2/repository.test.ts src/lib/custody-v2/contract-reader.test.ts
```

Result: `3` files passed, `11` tests passed.

Typecheck completed:

```powershell
cd web
npm run typecheck
```

Result: passed.

## Remaining Gates

Full repository gates and remote CI are still required before this branch can be considered review-complete. Browser Freighter proof remains a founder/manual acceptance gate and is documented in `docs/active/24_CUSTODY_V2_BROWSER_ACCEPTANCE_GATE.md`.
