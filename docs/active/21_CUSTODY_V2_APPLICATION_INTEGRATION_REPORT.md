# 21 - Custody V2 Application Integration Report

Status: application integration vertical slice completed on `work/custody-v2-app-integration`; not merged to `main`.

## Implemented

- Preserved `custody_v2_testnet` and `legacy_demo` rail separation.
- Added deterministic `TermsDocumentV1` canonicalization, golden hash vectors, and deterministic contract deal ID derivation.
- Added fail-closed Custody V2 Testnet runtime configuration.
- Added repository records and Supabase migration for custody deal links, operations, events, and event cursors.
- Added freeze, prepare, submit, and confirm routes for allowlisted V2 actions.
- Added signed transaction body fingerprint verification and expected signer verification before RPC submission.
- Added direct Custody V2 contract reads for `get_config`, `get_deal`, `deal_exists`, `get_state`, and `contract_info`.
- Refactored financial projection so confirmed operations reconcile through direct `get_deal`; projection no longer advances from operation type alone.
- Added raw Stellar RPC event polling, SDK/XDR decoding, deduplication, cursor persistence, and gap reporting.
- Added a production-guarded automated Testnet proof harness using Stellar CLI secure-store aliases.
- Added Deal Room action wiring for the Custody V2 rail.
- Deployed a dedicated application-integration Custody V2.1 Testnet contract.
- Completed real application-layer success and funding-expiry proofs on Stellar Testnet.

## Dedicated Testnet Contract

- Contract ID: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- Native XLM SAC: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Deploy transaction: `5ebd96d0b02e8761b9d8ea6e46540ee0e4c0617bfb2e1e8c46f856a174d84166`
- Initialize transaction: `ae2340072955200dd0262e50c21e69c99e26dcfbd5068dba5ce81a185d7de4c5`

Detailed proof is recorded in:

`docs/active/23_CUSTODY_V2_APP_INTEGRATION_TESTNET_PROOF.md`

## Automated Tests Added

- Contract reader config/deal/info decoder coverage.
- Chain projection mismatch guard coverage.
- Operation preparation and signed-envelope verification.
- Repository idempotency and cursor persistence.
- Raw RPC event decode and normalized ingestion coverage.
- Runtime configuration fail-closed behavior.

## Real Testnet Proof

Completed through the application service pipeline.

- Success scenario final state: `SettledSuccess`
- Funding-expiry scenario final state: `FundingExpired`
- Raw event ingestion: completed for both scenarios.
- Direct `get_deal` reads: performed after confirmed transactions.
- Financial projection source: direct contract state.

## Browser Wallet Proof

Not completed in this execution environment. Freighter remains the browser-user signing path. Manual founder verification is documented in:

`docs/active/22_CUSTODY_V2_FREIGHTER_TESTNET_RUNBOOK.md`

## Known Limitations

- Browser Freighter proof remains a manual acceptance gate.
- External Supabase provisioning was not performed because no external credentials were accessed.
- Breach, dispute, mutual-cancellation, mediator-console, and reputation projection from Custody V2.1 events remain deferred.
- Bank/QRIS/anchor integration, stablecoin/IDR asset integration, KYC/KYB, mainnet, and production custody remain out of scope.

## Deferred Boundaries Preserved

The branch does not implement seller-breach UI, buyer-breach UI, mutual-cancellation UI, dispute UI, mediator console, reputation projection from V2.1 breach events, bank/QRIS/anchor integration, stablecoin/IDR asset integration, KYC/KYB, mainnet, production custody, or legacy rail removal.
