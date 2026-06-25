# 16 - Soroban Custody V2 Implementation Report

Status: completed locally and on Stellar Testnet on `work/soroban-custody-v2`.

This report records the isolated Custody V2 milestone. Custody V2 is not integrated into the Aurora frontend, TypeScript backend, existing Testnet rail, Supabase adapters, or legacy `settleway_escrow` contract in this batch.

## Scope Completed

- Added repository-level Rust workspace containing:
  - `contracts/settleway_escrow`
  - `contracts/trade_assurance_v2`
- Added isolated Soroban custody contract at `contracts/trade_assurance_v2`.
- Implemented immutable one-time accepted-asset configuration.
- Implemented buyer/seller terms acceptance gate.
- Implemented real token custody for buyer principal, buyer commitment bond, and seller performance bond.
- Implemented funding-order-independent activation.
- Implemented funding expiry with exact refund of actual deposits.
- Implemented success settlement with exact principal and bond distribution.
- Implemented evidence commitment hash storage without on-chain file storage.
- Implemented typed errors and structured contract events.
- Added V2 Testnet proof script and public manifests.
- Updated Soroban Contract CI to check/build both workspace contracts.

## Verified Local Facts

| Gate | Result |
|---|---|
| `cargo fmt --all --check` | PASS |
| `cargo clippy --workspace --all-targets --all-features -- -D warnings` | PASS |
| `cargo test --workspace --verbose` | PASS: legacy contract `15` tests, Custody V2 `24` tests |
| `cargo build --workspace --target wasm32v1-none --release --verbose` | PASS |
| `cd web && npm ci` | PASS: 431 packages installed, 0 vulnerabilities reported by install audit |
| `cd web && npm run test` | PASS: 81 files, 787 tests |
| `cd web && npm run lint` | PASS |
| `cd web && npm run typecheck` | PASS |
| `cd web && $env:NEXT_PUBLIC_RUNTIME_MODE="demo"; npm run build` | PASS |
| `cd web && npm audit --omit=dev --audit-level=high` | PASS: 0 vulnerabilities |

Known local environment notes:

- Cargo printed `failed to save last-use data` because its global cache database is read-only in this environment. The affected Cargo commands exited `0`; this is not a repository test failure.
- Next build printed Node `DEP0005 Buffer()` deprecation warnings from dependency/tooling execution. The build completed successfully.

## Contract Artifact

| Field | Value |
|---|---|
| Wasm path | `target/wasm32v1-none/release/trade_assurance_v2.wasm` |
| Wasm size | `43,333` bytes |
| SHA-256 | `932d64218bfcb0d3ab036597b702388768f4250f1f23c15604dfd74fcdcc9604` |
| Interface version | `1` |
| Policy version | `1` |
| Interface artifact | `contracts/trade_assurance_v2/interface/trade_assurance_v2.interface.rs` |

The machine-readable interface was generated from the built Wasm with:

```powershell
stellar contract info interface --wasm target\wasm32v1-none\release\trade_assurance_v2.wasm
```

## Selected Testnet Asset

Custody V2 Testnet proof used native XLM SAC.

| Field | Value |
|---|---|
| Asset selection | Native XLM Stellar Asset Contract |
| Asset code | `native` |
| Issuer | none |
| Asset contract ID | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Verification basis | `stellar contract id asset --asset native --network testnet` |
| Reason | No verified Testnet stable asset issuer/SAC/balance bundle was established in-repo; native XLM SAC is explicit and non-misleading as a custody proof asset. |

## Testnet Contract

| Field | Value |
|---|---|
| Contract ID | `CCK4RJT5TGMPFM7V7KY56RS3RYK6OMKM5JW45QZF46XJIE6GDL3FTZFW` |
| Deploy tx | `0ade6fa57d384e115d0825dcd3346cecfa220a1a8eac62ba34e9a833ed4b478a` |
| Deploy ledger | `3271674` |
| Deploy time | `2026-06-25T07:26:20Z` |
| Initialize tx | `1d14edd74653cb1109d8280a3a4026da65caa9a016bc2cb7409a4232275d47bd` |
| Initialize ledger | `3271676` |
| Initialize time | `2026-06-25T07:26:30Z` |
| Deployer/initializer public address | `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG` |
| Verified manifest | `contracts/trade_assurance_v2/testnet/manifest.testnet-2026-06-25.json` |

The initialization event recorded accepted asset `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, policy version `1`, and interface version `1`.

## Testnet Scenario A - Success

| Field | Value |
|---|---|
| Deal ID | `89cf97d6bd48fdaf2334ff0048ef0622c395a778452d842d5a449c4168258469` |
| Buyer | `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX` |
| Seller | `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU` |
| Principal | `10,000,000` stroops |
| Buyer bond | `500,000` stroops |
| Seller bond | `500,000` stroops |
| Terminal state | `SettledSuccess` (`state = 4`) |
| Terminal outcome | `SettledSuccess` (`terminal_outcome = 1`) |

Transactions:

| Step | Transaction hash | Ledger |
|---|---|---:|
| create deal | `15e94f9bb65db0c291575255fd8ec365cdd144958ff3f0b142cf88ac3e90be07` | `3271687` |
| seller accepts terms | `f9835615aec7053d8daca7162aee5f854c4d37610679ff0bfda6f95af6c9267d` | `3271689` |
| buyer funds | `0d71bee42219fcce61736819405b570069c82a626cf5dd11eab1d927feb17f86` | `3271691` |
| seller funds | `00eb537f2dea35f2c5627007b4db259e618baff969347ccc8e66ddeaa039b7c2` | `3271693` |
| seller submits evidence | `c5b98f4103ba743f9da730c20daf97b4b6ea3ee6a3bcd3644e8e961e90a76360` | `3271695` |
| buyer accepts delivery | `34d5d89a4275a4b2b2932f36c9f3a3c88c1982461971470069345988b77d430f` | `3271697` |

Observed contract/SAC events prove:

- buyer transferred `10,500,000` stroops into contract custody;
- seller transferred `500,000` stroops into contract custody;
- contract transferred `10,000,000` stroops principal to seller;
- contract refunded `500,000` stroops buyer bond;
- contract refunded `500,000` stroops seller bond.

## Testnet Scenario B - Funding Expiry

| Field | Value |
|---|---|
| Deal ID | `0ecb1ee229f9cc3b9b39c13363110417a5a8a08e5733ddc479e3804156121630` |
| Buyer | `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX` |
| Seller | `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU` |
| Principal | `1,000,000` stroops |
| Buyer bond | `50,000` stroops |
| Seller bond | `50,000` stroops |
| Buyer funded | `1,050,000` stroops |
| Seller funded | `0` stroops |
| Buyer refund | `1,050,000` stroops |
| Seller refund | `0` stroops |
| Terminal state | `FundingExpired` (`state = 5`) |
| Terminal outcome | `FundingExpired` (`terminal_outcome = 2`) |

Transactions:

| Step | Transaction hash | Ledger |
|---|---|---:|
| create deal | `bdf27fdbd26358f0d6941053af61076e37a22cd29d87ab8746b66d7f39eb5afc` | `3271716` |
| seller accepts terms | `41ccc36de0887ea42ce2c18d165b361e9db0aebf6f1190d3b5bb43c463530a5a` | `3271717` |
| buyer funds | `c956dcacdfe584762ff02dcfcfb35461e4de404ed5b7fc410d96efac11cb66b9` | `3271719` |
| expire funding | `efd937e55ab32249040593a89e2210d413f4ab05d595fe6020b4bf10a3e3da6b` | `3271726` |

Observed contract/SAC events prove:

- buyer transferred `1,050,000` stroops into contract custody;
- contract refunded `1,050,000` stroops to buyer;
- seller funded flag remained false;
- seller refund was `0`.

Post-proof native SAC balance checks:

| Account | Balance |
|---|---:|
| Custody V2 contract | `0` |
| Buyer | `99,979,081,773` stroops |
| Seller | `100,022,028,271` stroops |

Standalone pre-scenario balance snapshots were not captured before the two live scenarios. The proof relies on successful transaction records, contract read results, exact SAC transfer events, and final custody contract balance `0`.

## Deployment Tooling

- Script: `contracts/trade_assurance_v2/scripts/testnet-proof.ps1`
- Default mode: dry-run only.
- Live execution requires `-Execute`.
- The script rejects Stellar secret-key-shaped values and expects local Stellar CLI aliases or public addresses.
- Manifest template: `contracts/trade_assurance_v2/testnet/manifest.example.json`
- Verified manifest: `contracts/trade_assurance_v2/testnet/manifest.testnet-2026-06-25.json`

## Assumptions

- Stellar CLI `26.1.0` is available locally.
- Testnet proof uses local secure-store aliases; no secret values are recorded.
- Native XLM SAC is used only as a Testnet custody proof asset, not as a production settlement asset commitment.

## Not Integrated In This Batch

- No frontend funding integration.
- No backend/indexer integration.
- No database migration.
- No replacement of the existing managed-account Testnet demonstration rail.
- No changes to the completed Aurora frontend.
- No changes to the legacy contract behavior.
- No mainnet deployment.

## Remaining Before Architectural Review

- Push `work/soroban-custody-v2`.
- Record remote CI run IDs and conclusions after GitHub Actions completes.
- Review Custody V2 for economic/security edge cases before any integration branch starts.

## Remaining Risks

- Custody V2 has not been externally audited.
- Custody V2 is not integrated with application state, event indexing, database records, profile reputation, or Aurora UI.
- V2.0 intentionally excludes platform fees, dispute outcomes, mediator powers, production custody controls, and fiat rails.
- Testnet proof used native XLM SAC, not a verified stablecoin or SETIDR asset.
