# 25 - Testnet Contract Artifact

## Objective

Record the trusted local verification evidence for the current `settleway_escrow` Soroban contract artifact before any future fresh Testnet deployment.

## Source Checkpoint

- Branch: `phase-7-rebuild`
- Commit: `d12836ce27dd09f09039eb676ad930725163ec41`
- Commit message: `feat: add local Testnet smoke operator harness`

## Contract Package

- Cargo package: `settleway-escrow`
- Canonical Wasm filename: `settleway_escrow.wasm`
- Crate types: `cdylib`, `rlib`

## Pinned Dependency Evidence

- `contracts/settleway_escrow/Cargo.toml` pins `soroban-sdk = "=26.1.0"` in `[dependencies]`.
- `contracts/settleway_escrow/Cargo.toml` pins `soroban-sdk = "=26.1.0"` with `features = ["testutils"]` in `[dev-dependencies]`.
- The contract CI workflow builds with Cargo directly and targets `wasm32v1-none`.

## Local Toolchain Versions

- `rustc 1.96.0 (ac68faa20 2026-05-25)`
- `cargo 1.96.0 (30a34c682 2026-05-25)`
- `rustup 1.29.0 (28d1352db 2026-03-05)`
- Installed Rust targets: `wasm32v1-none`, `x86_64-pc-windows-msvc`
- Microsoft Visual Studio Build Tools 2022 installation path: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools`
- MSVC toolset directory: `14.44.35207`
- Microsoft linker path used for host builds: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\link.exe`
- `link /?` banner version: `14.44.35228.0`
- `cl` banner version: `19.44.35228 for x64`
- Windows SDK directory observed: `10.0.26100.0`
- `stellar` CLI: not installed locally
- `soroban` CLI: not installed locally

## Canonical Contract Test Command And Result

- Command: `cargo test --verbose`
- Working directory: `contracts/settleway_escrow`
- Host environment: temporary x64 Developer Command shell via `VsDevCmd.bat -arch=x64 -host_arch=x64`
- Result: passed
- Test totals: 15 passed, 0 failed, 0 ignored, 0 measured, 0 filtered out
- Doc-tests: 0 passed, 0 failed
- Observed warnings:
  - Cargo emitted a local cache warning about failing to save last-use data because of a readonly global cache database.
  - The contract and tests emitted deprecation and unused-variable warnings.

## Canonical Build Command And Result

- Command: `cargo build --target wasm32v1-none --release --verbose`
- Working directory: `contracts/settleway_escrow`
- Host environment: temporary x64 Developer Command shell via `VsDevCmd.bat -arch=x64 -host_arch=x64`
- Result: passed
- Observed warnings:
  - Cargo emitted the same readonly global cache last-use warning.
  - The contract emitted Soroban SDK deprecation warnings during release build.

## Canonical Generated Wasm Path

`contracts/settleway_escrow/target/wasm32v1-none/release/settleway_escrow.wasm`

This is the canonical artifact because `.github/workflows/soroban-contract-ci.yml` builds `wasm32v1-none` release output and uploads exactly this file path.

## Wasm Byte Size

`29673` bytes

## Wasm Hashes

- SHA-256: `A73F99E3E1521E581B38488FF8F26F746843F2214282C3286D5334B7BCE04703`
- SHA-512: `A228307A14AD498EEB2E0627714F0FAA2761B9735E9A426E360C7CC8316EDF3DD8EF0405AEFE6D0EA7DF7F33E2A078410C4B8BF703BE6B9E4D62E30782EA88A`

## ABI Or Spec Inspection Status

Direct offline Wasm ABI/spec inspection was not performed because no local `stellar`, `soroban`, or `wasm-tools` CLI was available in this session.

Interface verification in this document is source-and-test based, using the committed contract source, committed tests, and the successful canonical local build.

## Verified Method Set

The current committed contract interface contains:

- `initialize(admin)`
- `create_escrow(deal_hash, buyer, seller, principal, buyer_bond, seller_bond, buyer_fee, seller_fee, expires_at)`
- `deposit_buyer(escrow_id, actor)`
- `deposit_seller(escrow_id, actor)`
- `submit_proof_hash(escrow_id, actor, proof_hash)`
- `mark_delivered(escrow_id, actor)`
- `accept_and_complete(escrow_id, actor)`
- `expire_if_unfunded(escrow_id)`
- `refund_before_locked(escrow_id)`
- `get_escrow(escrow_id)`

`initialize` and `get_escrow` are utility or read methods and do not change the product policy that only 13 canonical execution plans exist.

## Initialization Requirements

- Initialization is mandatory before admin-governed contract execution can proceed.
- Initialization is one-time only.
- The initializing role must be the intended `admin` public address for the fresh deployment.
- `initialize` panics with `Already initialized` if called again after admin storage already exists.
- `create_escrow`, `expire_if_unfunded`, and `refund_before_locked` read the stored admin and fail with `Not initialized` before initialization.

## Fresh Deployment Requirement

- A fresh deployment should use a new contract ID tied to the current source commit and current Wasm SHA-256.
- No trusted current contract ID exists yet for this smoke.
- Historical deployments are not trusted for this smoke unless a human separately proves exact commit identity, exact Wasm hash, exact contract ID, and exact initialization identity.

## Safe Evidence To Record After Deployment

After a future authorized fresh deployment, record only safe public evidence:

- branch
- commit hash
- Wasm SHA-256
- deployed contract ID
- admin public address
- buyer demo public address
- seller demo public address
- deployment transaction hash
- initialization transaction hash
- confirmation that the initialized admin matches the intended admin public address
- RPC endpoint
- network passphrase
- fee cap
- time-bound policy

## Explicit Non-Goals And Prohibited Actions

- No Stellar RPC access in this artifact-freeze task.
- No Friendbot use.
- No Testnet mutation.
- No contract deployment.
- No contract initialization.
- No live contract invocation.
- No transaction submission or confirmation.
- No secret access.
- No route or UI wiring.
- No schema changes.
- No Soroban contract source changes.
- No workflow changes.
- No dependency or package changes.
- No operator-harness or Phase 8 changes.

## Remaining Human Or Operator Steps

Before a fresh Testnet smoke can happen, a separately authorized operator task still must:

- provide synthetic Testnet-only public identities for `admin`, `buyer_demo`, and `seller_demo`
- provide a runtime-only signing boundary for those identities
- provide the RPC endpoint, Testnet passphrase, fee cap, and time-bound policy
- provide deal-hash and proof-hash fixtures
- provide simulated principal, buyer bond, seller bond, buyer fee, and seller fee values
- deploy the current canonical Wasm
- record the fresh contract ID
- initialize the contract exactly once with the intended admin public address
- capture only safe public evidence for later smoke execution and reconciliation
