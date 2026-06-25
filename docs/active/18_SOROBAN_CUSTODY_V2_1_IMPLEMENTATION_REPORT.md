# Settleway Soroban Custody V2.1 Implementation Report

Status: implemented on `work/soroban-custody-v2`  
Contract: `contracts/trade_assurance_v2`  
Main branch status: unchanged during this batch

## V2.0 Baseline Preserved

Custody V2.0 proved:

- isolated real token custody;
- terms acceptance;
- buyer-first and seller-first funding;
- success settlement;
- funding-expiry refund;
- structured events;
- generated interface and Testnet proof tooling.

The Aurora frontend, application backend, legacy `settleway_escrow` contract, and current application Testnet rail are not integrated with or modified for V2.1 in this batch.

## V2.1 Changes Implemented

The contract now includes:

- immutable treasury address;
- immutable policy snapshot per deal;
- success fee bps;
- seller-breach treasury bps;
- buyer-breach treasury bps;
- mediator per deal;
- cancellation approval flags;
- dispute opener and reason hash;
- terminal outcome tracking;
- `expire_delivery`;
- `expire_inspection`;
- `approve_mutual_cancellation`;
- `raise_dispute`;
- `resolve_dispute`.

Deadline semantics are explicit:

- normal actions require `now < deadline`;
- timeout actions execute at `now >= deadline`.

## Local Evidence

Current local artifact facts before final commit:

- Wasm path: `target/wasm32v1-none/release/trade_assurance_v2.wasm`
- Wasm SHA-256: `76808FB80BDDF432F771FA3106648B47B1E57DBC09FF6847D38719ECD702723C`
- Wasm size: `61234` bytes
- Interface file: `contracts/trade_assurance_v2/interface/trade_assurance_v2.interface.rs`

Local V2.1 focused test suite:

- `cargo test -p trade-assurance-v2 --verbose`: PASS, 26 tests.
- `cargo fmt --all --check`: PASS.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: PASS after a crate-level ABI exception for Soroban public methods with more than seven parameters.
- `cargo build --workspace --target wasm32v1-none --release --verbose`: PASS.

## Test Coverage Added

The V2.1 test suite covers:

- initialization policy validation;
- immutable policy and creator acceptance snapshot;
- invalid parties, mediator, amounts, deadlines, and duplicate deal IDs;
- funding deadline equality;
- exact buyer and seller funding custody;
- funding expiry refund;
- delivery deadline equality;
- seller-breach distribution with non-divisible bond remainder conservation;
- inspection deadline equality;
- buyer-breach distribution with non-divisible bond remainder conservation;
- zero-fee success settlement;
- mutual cancellation in both orders;
- dispute freeze;
- dispute deadline equality;
- mediator authorization;
- mediated success, seller breach, buyer breach, and mutual cancellation outcomes;
- concurrent deal accounting;
- checked multiplication overflow atomicity;
- auth tree visibility;
- event presence without private terms;
- read functions and TTL behavior.

## Testnet Evidence

Verified manifest:

- `contracts/trade_assurance_v2/testnet/manifest.testnet-v2.1-2026-06-25.json`

Deployment:

- Network: Stellar Testnet.
- Asset: native XLM SAC.
- Asset contract: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`.
- Contract ID: `CA5O4INKF4BVRDOSHWH6GVD6GQRGL7P5NIAQHXA2JPQYLRHI3PRNHSSO`.
- Treasury: `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG`.
- Mediator used for proof scenarios: `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG`.
- Wasm upload tx: `9effb38aac4b198fb5d2cfb905fb4539bcef4cd18689b37abfc189056be9877a`.
- Deployment tx: `bdad92d703ec67db421df6cfc22edf2d2fa6857c06f171616ad2cc8045e941b2`.
- Initialization tx: `dfc52afe861df8f4fce2908c43503462a0a90d4a3e9287ba917e0d804a47a297`.

Scenarios completed:

- Scenario A, success: terminal state `5`, terminal outcome `1`.
- Scenario B, funding expiry: terminal state `6`, terminal outcome `2`.
- Scenario C, seller breach timeout: terminal state `7`, terminal outcome `3`; seller bond `50003` split into `40003` to buyer and `10000` to treasury.
- Scenario D, buyer breach timeout: terminal state `8`, terminal outcome `4`; buyer bond `50003` split into `40003` to seller and `10000` to treasury.
- Scenario E, mutual cancellation: terminal state `9`, terminal outcome `5`; no treasury transfer.
- Scenario F, dispute resolution: dispute opened from `Active`; wrong resolver failed before submission; configured mediator resolved to seller breach with terminal state `7`, terminal outcome `3`.

Final native SAC balance for the contract was read as `0` after all completed scenarios.

## Deferred Risks

- V2.1 remains isolated and unaudited for production custody.
- The app does not yet index or project V2.1 events into reputation.
- The Testnet proof uses a configured treasury and mediator address but does not represent final production governance.
- No bank, QRIS, anchor, KYC/KYB, or fiat settlement rail is implemented by this contract.
