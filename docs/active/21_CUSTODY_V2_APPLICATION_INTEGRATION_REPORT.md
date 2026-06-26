# 21 - Custody V2 Application Integration Report

Status: partial implementation on `work/custody-v2-app-integration`.

## Implemented

- Repaired active handoff and roadmap wording for the promoted V2.1 contract.
- Added explicit `custody_v2_testnet` rail alongside `legacy_demo`.
- Added deterministic `TermsDocumentV1` canonicalization, golden hash vectors,
  and deterministic contract deal ID derivation.
- Added fail-closed Custody V2 Testnet runtime configuration.
- Added repository records and Supabase migration for:
  - custody deal links;
  - custody operations;
  - custody events;
  - custody event cursors.
- Added prepare, submit, and confirm API routes for allowlisted V2 actions.
- Added signed transaction body fingerprint verification and expected wallet
  signature verification before RPC submission.
- Added Deal Room action wiring for Custody V2 rail states.
- Added normalized V2.1 event ingestion with idempotency and cursor persistence.
- Added app-integration Testnet manifest placeholder.

## Automated Tests Added

- Canonical terms determinism and rejection behavior.
- Custody V2 runtime configuration fail-closed behavior.
- Operation preparation and signed-envelope verification.
- Repository idempotency and cursor persistence.
- Normalized event ingestion and malformed-event rejection.

## Real Testnet Proof

Not completed in this execution environment.

Blocker: `stellar keys ls` returned no configured local secure-store aliases, so
there were no integration-only Testnet identities available for a dedicated
deployment, success proof, or funding-expiry proof.

No transaction hash, contract ID, deployment hash, or balance movement is
claimed by this report.

## Browser Wallet Proof

Not completed in this execution environment.

The application code path is Freighter-based and rejects missing wallet,
wrong network, wrong participant, and missing evidence hash. Manual founder
verification is documented in:

`docs/active/22_CUSTODY_V2_FREIGHTER_TESTNET_RUNBOOK.md`

## Known Limitations

- Direct `get_deal` contract reads are not yet implemented in the application
  confirm path.
- The event ingester currently accepts normalized public events; full raw RPC
  event polling/decoding is still required.
- Projection currently advances from confirmed operation type plus local V2 link
  state. This is not sufficient for final financial source-of-truth acceptance.
- Evidence commitment requires an existing evidence hash before seller signs
  `SUBMIT_EVIDENCE`.
- Dedicated app-integration Testnet deployment remains blocked until distinct
  buyer, seller, mediator, treasury, and optional keeper identities exist.

## Deferred Boundaries Preserved

The branch does not implement seller-breach UI, buyer-breach UI, mutual
cancellation UI, dispute UI, mediator console, reputation projection from V2.1
breach events, bank/QRIS/anchor integration, stablecoin/IDR asset integration,
KYC/KYB, mainnet, production custody, or legacy rail removal.
