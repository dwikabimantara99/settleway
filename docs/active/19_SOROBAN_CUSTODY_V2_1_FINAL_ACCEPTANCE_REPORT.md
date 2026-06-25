# 19 - Soroban Custody V2.1 Final Acceptance Report

Date: 2026-06-25

## Scope

This report records final repository-level security acceptance for the isolated Soroban Custody V2.1 milestone. The milestone is limited to `contracts/trade_assurance_v2`, its generated interface, Testnet proof tooling, Testnet proof manifests, CI coverage, and active documentation.

No Aurora frontend integration, backend invocation integration, event indexing, database migration, reputation projection, bank/QRIS/anchor integration, KYC/KYB, mainnet deployment, upgradeability, emergency withdrawal, or application integration branch is included.

## Starting State

| Reference | SHA |
|---|---|
| Starting candidate branch | `work/soroban-custody-v2` |
| Starting candidate contract commit | `442eb0b2817fe40d2d07b7db8f969d54ed771ad9` |
| Starting `origin/main` | `693da68289c17b8b97eaeeea707d0ebd877175d6` |
| Candidate ancestry | `work/soroban-custody-v2` was verified as a direct descendant of `origin/main` before final edits. |

## Reviewed Contract Path

- Contract crate: `contracts/trade_assurance_v2`
- Legacy contract preserved: `contracts/settleway_escrow`
- Generated interface: `contracts/trade_assurance_v2/interface/trade_assurance_v2.interface.rs`
- Testnet manifest: `contracts/trade_assurance_v2/testnet/manifest.testnet-v2.1-2026-06-25.json`

## Public Interface Summary

The clean-built Wasm interface and committed interface were compared and matched. The accepted V2.1 public methods are:

- `initialize`
- `create_deal`
- `accept_terms`
- `fund_buyer`
- `fund_seller`
- `expire_funding`
- `submit_evidence`
- `accept_delivery`
- `expire_delivery`
- `expire_inspection`
- `approve_mutual_cancellation`
- `raise_dispute`
- `resolve_dispute`
- `get_config`
- `get_deal`
- `deal_exists`
- `get_state`
- `contract_info`

The public ABI includes the expected V2.1 data types: `Config`, `Deal`, `ContractInfo`, `DealState`, `TerminalOutcome`, `DisputeOutcome`, typed errors, and structured event types.

## State And Outcome Summary

States:

- `TermsPending`
- `AwaitingFunding`
- `Active`
- `EvidenceSubmitted`
- `Disputed`
- `SettledSuccess`
- `FundingExpired`
- `SellerBreach`
- `BuyerBreach`
- `MutualCancellation`

Terminal outcomes:

- `SettledSuccess`
- `FundingExpired`
- `SellerBreach`
- `BuyerBreach`
- `MutualCancellation`

Deadline semantics were reviewed in source and tests:

- normal actions require `now < deadline`;
- timeout actions execute at `now >= deadline`.

## Source-Level Security Review

Configuration and authority:

- Initialization is one-time through `DataKey::Config`.
- Initialization requires `initializer.require_auth()`.
- Accepted asset, treasury, policy version, fee bps, and breach treasury bps are stored immutably in instance config and snapshotted into each deal.
- The initializer has no continuing role after initialization.
- No admin role, upgrade function, pause function, emergency withdrawal, treasury pull, or arbitrary settlement recipient function exists.

Parties and terms:

- Buyer and seller cannot be the same.
- Deal creator must be buyer or seller and must authorize.
- Mediator is immutable per deal and cannot be buyer, seller, or the contract address.
- Terms hash, principal, buyer bond, seller bond, deadlines, accepted asset, treasury, and policy values are immutable after deal creation.
- Duplicate deal IDs cannot overwrite persistent storage.

Custody and accounting:

- Buyer funding transfers exactly `principal + buyer_bond`.
- Seller funding transfers exactly `seller_bond`.
- Callers cannot choose partial funding amounts.
- Duplicate funding is rejected.
- Terminal settlement paths use centralized distribution helpers.
- Terminal distributions check exact conservation of `principal + buyer_bond + seller_bond`.
- Breach treasury share uses deterministic floor division and assigns the full remainder to the harmed counterparty.
- Terminal states reject later fund-moving calls.
- Concurrent deal tests prove one terminal deal does not spend another open deal's locked balance.

Liveness:

- Funding before deadline and funding expiry at deadline are both tested.
- Evidence submission before delivery deadline and seller-breach timeout at delivery deadline are both tested.
- Buyer acceptance before inspection deadline and buyer-breach timeout at inspection deadline are both tested.

Cancellation and dispute:

- Mutual cancellation requires buyer and seller approvals.
- One approval moves no funds.
- Cancellation is unavailable after evidence or dispute.
- Dispute can be raised only from eligible non-terminal states and freezes ordinary settlement and timeout paths.
- Only the immutable mediator can resolve.
- The mediator can choose only the finite `DisputeOutcome` enum.
- Mediated success requires evidence.
- Dispute resolution uses the same terminal settlement helpers as deterministic paths.

Events and storage:

- Material transitions publish structured events.
- Full private commercial terms are not emitted; only hashes and material facts are stored/emitted.
- Instance and persistent deal TTL extension is implemented and tested.
- Read methods expose stored contract truth, not optimistic app state.

No blocking source-level contradiction was found during final acceptance review.

## Reproducible Artifact Verification

Clean locked build command:

```powershell
cargo clean
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --verbose
cargo build --workspace --target wasm32v1-none --release --locked --verbose
```

Result: PASS.

Artifact facts:

| Field | Value |
|---|---|
| V2.1 Wasm path | `target/wasm32v1-none/release/trade_assurance_v2.wasm` |
| V2.1 Wasm size | `61,234` bytes |
| V2.1 Wasm SHA-256 | `76808FB80BDDF432F771FA3106648B47B1E57DBC09FF6847D38719ECD702723C` |
| Legacy Wasm path | `target/wasm32v1-none/release/settleway_escrow.wasm` |
| Legacy Wasm size | `29,697` bytes |
| Legacy Wasm SHA-256 | `9E645F9721B9D103AE205BA44625C16F520BE77CD30E29FC9D4CBC7D094110EC` |

The clean-built V2.1 Wasm hash reproduces the accepted Testnet report hash exactly.

GitHub Actions artifact archive digest is intentionally recorded separately from the Wasm file SHA-256. It must be filled from the final remote CI run after candidate and main verification.

## Toolchain Versions

| Tool | Version |
|---|---|
| `rustup` | `1.29.0 (28d1352db 2026-03-05)` |
| `rustc` | `1.96.0 (ac68faa20 2026-05-25)` |
| `cargo` | `1.96.0 (30a34c682 2026-05-25)` |
| Stellar CLI | `stellar 26.1.0 (1228cff8022b804659750b94b315932b0e0f3f6a)` |
| `stellar-xdr` | `26.0.1 (b0436c147ec871e4f4e503e764f4c3944960d858)` |

## Dependency And Advisory Review

`cargo tree --workspace` completed.

`cargo tree --workspace --duplicates` completed. Duplicate versions are transitive through the Soroban SDK and Stellar XDR dependency graph; no direct first-party duplicate dependency was introduced for Settleway code.

`cargo audit` was unavailable in this environment (`cargo` reported `no such command: audit`). Therefore no Rust advisory PASS is claimed from `cargo audit`.

The web production dependency audit must pass through:

```powershell
cd web
npm audit --omit=dev --audit-level=high
```

## Secret And Manifest Review

Candidate diff and Testnet manifests were reviewed for:

- secret keys;
- seed phrases;
- `.env` files;
- local Stellar identity material;
- Supabase secrets;
- service-role keys;
- private RPC credentials;
- committed `target/` artifacts;
- signed or unsigned XDR payloads;
- private signer internals.

No committed secret material was found. Manifest contents are public contract IDs, public addresses, transaction hashes, ledgers, timestamps, policy values, Wasm hash/size, and proof summaries.

## Testnet Evidence Coherence

Accepted proof:

| Field | Value |
|---|---|
| Network | Stellar Testnet |
| Asset | Native XLM SAC |
| Asset contract | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| V2.1 contract | `CA5O4INKF4BVRDOSHWH6GVD6GQRGL7P5NIAQHXA2JPQYLRHI3PRNHSSO` |
| Treasury | `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG` |
| Mediator | `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG` |
| Final native SAC contract balance | `0` |

Live Testnet read/simulation verified:

- contract interface can be read;
- `get_config` returns initialized config with policy version `2`, interface version `2`, success fee `0`, seller breach treasury bps `2000`, buyer breach treasury bps `2000`;
- `contract_info` returns `settleway_trade_assurance_v2_1`;
- scenario A deal reads terminal state `5` and terminal outcome `1`;
- native SAC balance for the V2.1 contract reads `0`.

Proof-only governance limitation: the Testnet proof uses the same public address for treasury and mediator. This was acceptable for proof execution only. Application integration must configure explicit roles and must not silently inherit proof governance.

## Local Quality Gates

Final local validation after the documentation update:

| Gate | Result |
|---|---|
| `cargo fmt --all --check` | PASS |
| `cargo clippy --workspace --all-targets --all-features -- -D warnings` | PASS |
| `cargo test --workspace --verbose` | PASS: legacy `settleway_escrow` 15 tests; Custody V2.1 `trade_assurance_v2` 26 tests; doc tests 0/0. |
| `cargo build --workspace --target wasm32v1-none --release --locked --verbose` | PASS |
| `cd web && npm ci` | PASS: 431 packages audited, 0 vulnerabilities. |
| `cd web && npm run test` | PASS: 81 files, 787 tests. |
| `cd web && npm run lint` | PASS |
| `cd web && npm run typecheck` | PASS |
| `cd web && $env:NEXT_PUBLIC_RUNTIME_MODE="demo"; npm run build` | PASS: 19 static pages generated. Known `Buffer()` deprecation warnings remain non-blocking; first-party source search found no `Buffer()` constructor use. |
| `cd web && npm audit --omit=dev --audit-level=high` | PASS: 0 vulnerabilities. |
| `git diff --check` | PASS with Windows line-ending conversion warnings only. |

The final V2.1 Wasm hash after full validation remained `76808FB80BDDF432F771FA3106648B47B1E57DBC09FF6847D38719ECD702723C`.

## Remote Candidate Verification

Candidate CI run IDs, conclusions, and artifact archive digest are recorded in the final operator evidence after pushing the final candidate SHA.

## Main Promotion, Tag, And Cleanup

Final main SHA, main CI run IDs, release tag, branch deletion, final branch list, and clean working tree are recorded in the final operator evidence after successful fast-forward promotion.

## Deferred Risks

- Custody V2.1 is not externally audited.
- Custody V2.1 is not mainnet-ready.
- Custody V2.1 is not integrated into the application backend, Aurora frontend, event indexer, database records, or reputation projection.
- The legacy application rail remains active until application integration is separately accepted.
- Native XLM SAC was used for proof instead of a production stablecoin or fiat-backed asset.
- Bank, QRIS, anchors, KYC/KYB, fiat settlement, passkeys, and production key management remain out of scope.
