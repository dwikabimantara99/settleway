# Recovery Milestone 1 Implementation Report

## Branch

- Branch: `recovery/custody-v2-product-corridor-1`
- Baseline: clean canonical `main` at `2654530d3a5fd2c195d5c68c6e0f324fc9a51f55`
- Quarantined branch: `work/custody-v2-app-integration`
- Quarantined branch was not merged or rebased into this branch.

## Scope Implemented

This milestone rebuilds the normal product corridor through the first Custody V2 application slice:

```text
Marketplace or Buyer Request
-> Submit Offer
-> Recorded Negotiation
-> Terms Accepted
-> Mutual Open Deal Room
-> Custody V2 Deal Room
-> Buyer can create the deal on Stellar
```

The branch stops before funding, evidence, settlement, breach, dispute, cancellation, or reputation projection actions.

## Modules Salvaged

The selective salvage manifest is `docs/active/31_CUSTODY_V2_SELECTIVE_SALVAGE_MANIFEST.md`.

Salvaged technical modules were copied or ported from the quarantined branch only after file-level classification:

- Custody V2 public runtime configuration validation.
- Canonical `TermsDocumentV1` serialization, hashing, and deterministic contract deal ID.
- Custody V2 contract operation preparation/submission/confirmation helpers.
- Direct contract reader, event decoder, projection, and repository tests.
- Custody V2 API service boundary for `CREATE_DEAL` and `ACCEPT_TERMS`.

The development-only browser setup route, hard-coded demo deal navigation, and role logic that mixed `mock_actor` with wallet financial authority were not ported.

## Modules Reimplemented

- Normal `performOpenDealRoomCommitment` now creates a `custody_v2_testnet` Deal Room only after accepted terms, mutual Open Deal Room commitment, distinct buyer/seller Testnet wallet bindings, and valid Custody V2 runtime configuration.
- Custody V2 deal creation freezes canonical terms and stores the immutable buyer address, seller address, terms hash, contract deal ID, native XLM SAC, contract ID, and funding deadlines.
- `mock_actor` remains a demo application session only. It does not authorize Custody V2 financial actions.
- `resolveCustodyV2WalletRole` derives buyer, seller, unmatched, or disconnected financial role only from the connected profile wallet address and immutable custody link addresses.
- `/deals` is now a real deal discovery route. Authenticated navigation no longer points to `/deals/demo-cabai-001`.
- Custody V2 Deal Room has a dedicated Aurora state-to-screen surface rather than reusing the legacy Deal Room.

## Implemented State-to-Screen Coverage

Binding contract: `docs/active/30_CUSTODY_V2_STATE_TO_SCREEN_CONTRACT.md`.

Implemented states:

- `OFF_CHAIN_TERMS_AGREED`
- `ON_CHAIN_DEAL_NOT_CREATED`
- `WAITING_COUNTERPARTY_ACCEPTANCE`
- transition target `AWAITING_FUNDING` in UI and operation model

The current browser evidence covers:

- Buyer sees `Create on Stellar` when the wallet role matches the immutable buyer address.
- Seller sees a waiting explanation before buyer creation and no dead action button.
- Both views show `Custody V2 · Stellar Testnet`, contract ID, native XLM SAC, buyer/seller addresses, principal, buyer bond, seller bond, terms hash, and contract deal ID.
- Deals index rediscovery lists the generated V2 deal.

## Normal Corridor Evidence

Runtime mode used for local browser evidence:

```text
RUNTIME_MODE=demo
NEXT_PUBLIC_RUNTIME_MODE=demo
NEXT_PUBLIC_CUSTODY_V2_ENABLED=true
NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID=CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4
NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS=GARSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSG6NV
```

Normal API/browser corridor created:

- Offer: `offer-1782533103756`
- Deal: `deal-offer-1782533103756`
- Rail: `custody_v2_testnet`
- Contract: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- Asset: native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Contract deal ID: `4fcda7fc06343f45551fa371c3d7f0328994d9aedc1924cd0c85aafc4ab697cb`
- Terms hash: `6f0b15cc3d54c327465b015a30889dbcc857fa96c5dfd2cf3be2d6ae05ac10ca`

Screenshots are stored in `docs/active/recovery-corridor-1-screenshots/`.

## Quality Gates

Web:

- `cd web && npm run test` - PASS, 89 files, 812 tests.
- `cd web && npm run lint` - PASS.
- `cd web && npm run typecheck` - PASS.
- `cd web && NEXT_PUBLIC_RUNTIME_MODE=demo ... npm run build` - PASS.
- `cd web && npm audit --omit=dev --audit-level=high` - PASS, 0 vulnerabilities.

Rust/Soroban:

- `cargo fmt --all --check` - PASS.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings` - PASS.
- `cargo test --workspace --verbose` - PASS, 41 tests.
- `cargo build --workspace --target wasm32v1-none --release --locked --verbose` - PASS.

Known warning:

- The Next.js production build still emits the existing transitive Node `Buffer()` deprecation warning from Stellar-related dependencies. No first-party `Buffer()` constructor was added in this milestone.

## Real Freighter Evidence

The code path for buyer `Create on Stellar` and seller `Accept terms on Stellar` is implemented through Freighter signing and Custody V2 API preparation/submission/confirmation.

This run did not complete real Freighter popup approval in the founder's two Edge profiles. The evidence therefore proves the normal V2 Deal Room creation and role-specific first-action surface, but does not claim confirmed on-chain buyer creation or seller acceptance.

Manual founder acceptance should start from:

```text
http://127.0.0.1:3000/deals/deal-offer-1782533103756
```

Use the buyer profile with the buyer Freighter wallet for `Create on Stellar`, then the seller profile with the seller Freighter wallet for `Accept terms on Stellar`.

## Deferred Work

Recovery Milestone 2 should implement and prove:

- buyer funding;
- seller funding;
- escrow lock;
- evidence;
- buyer review;
- success settlement;
- funding expiry;
- V2 event-driven reputation projection.
