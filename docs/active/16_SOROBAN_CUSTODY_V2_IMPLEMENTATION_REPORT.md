# 16 - Soroban Custody V2 Implementation Report

Status: completed locally on `work/soroban-custody-v2`; final branch commit is recorded in the delivery report after commit/push.

This report records the isolated Custody V2 milestone. Custody V2 is not integrated into the Aurora frontend, TypeScript backend, existing Testnet rail, Supabase adapters, or legacy `settleway_escrow` contract in this batch.

## Scope Completed

- Added a repository-level Rust workspace containing:
  - `contracts/settleway_escrow`
  - `contracts/trade_assurance_v2`
- Added isolated Soroban contract `contracts/trade_assurance_v2`.
- Implemented one-time immutable accepted-asset configuration.
- Implemented buyer/seller terms acceptance gate.
- Implemented real token custody for:
  - buyer principal;
  - buyer commitment bond;
  - seller performance bond.
- Implemented funding-order-independent activation.
- Implemented funding expiry with exact refund of actual deposits.
- Implemented success settlement with exact principal and bond distribution.
- Implemented evidence commitment hash storage without on-chain file storage.
- Implemented typed errors and structured contract events.
- Added V2 Testnet proof script and manifest template.
- Added verified V2 Testnet proof manifest.
- Updated Soroban Contract CI to check/build both workspace contracts.

## Verified Local Facts

| Gate | Result |
|---|---|
| `cargo fmt --all --check` | PASS |
| `cargo clippy --workspace --all-targets --all-features -- -D warnings` | PASS |
| `cargo test --workspace --verbose` | PASS: legacy contract `15` tests, V2 contract `24` tests |
| `cargo build --workspace --target wasm32v1-none --release --verbose` | PASS |
| `cd web && npm ci` | PASS: 431 packages installed, 0 vulnerabilities reported by install audit |
| `cd web && npm run test` | PASS: 81 files, 787 tests |
| `cd web && npm run lint` | PASS |
| `cd web && npm run typecheck` | PASS |
| `cd web && $env:NEXT_PUBLIC_RUNTIME_MODE="demo"; npm run build` | PASS |
| `cd web && npm audit --omit=dev --audit-level=high` | PASS: 0 vulnerabilities |

Known local environment note: Cargo prints `failed to save last-use data` because its global cache database is read-only in this environment. The affected Cargo commands exited `0`; this is not a repository test failure.

Known web build warning: Next build prints Node `DEP0005 Buffer()` deprecation warnings from dependency/tooling execution. The build completed successfully.

## Contract Artifact

| Field | Value |
|---|---|
| Wasm path | `target/wasm32v1-none/release/trade_assurance_v2.wasm` |
| Wasm size | `43,333` bytes |
| SHA-256 | `932d64218bfcb0d3ab036597b702388768f4250f1f23c15604dfd74fcdcc9604` |
| Interface version | `1` |
| Policy version | `1` |

Machine-readable interface was inspected with:

```powershell
stellar contract info interface --wasm target\wasm32v1-none\release\trade_assurance_v2.wasm
```

## Selected Testnet Asset

Custody V2 Testnet proof used native XLM SAC.

| Field | Value |
|---|---|
| Asset selection | Native XLM Stellar Asset Contract |
| Asset contract ID | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Verification basis | `stellar contract id asset --asset native --network testnet` |
| Reason | No verified Testnet stable asset issuer/SAC/balance bundle was established in-repo; native XLM SAC is the non-misleading proof asset. |

## Testnet Contract

| Field | Value |
|---|---|
| Contract ID | `CBRYEOJLG4LB5KDOJUV3HLOSFFX7PZZZJRT5QMAN7CLMDUAZ5FLPYOKA` |
| Wasm upload tx | `ea29c2df1c8c53df4a53c18acb0a7a907e701839d56a41612933c5257814ddf7` |
| Wasm upload ledger | `3269682` |
| Deploy tx | `e35db99730d7bd43763a852cf52b599dd166fc34e9dbdb2fd0edbb5469492571` |
| Deploy ledger | `3269684` |
| Initialize tx | `44aa0a249c1cbb61089a7bfbb69ec849429c334deb12c4c943ccde2e4b4e062b` |
| Initialize ledger | `3269693` |
| Deployer/initializer public address | `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG` |

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
| Terminal state | `SettledSuccess` |
| Contract balance after settlement | `0` |

Transactions:

| Step | Transaction hash |
|---|---|
| create deal | `43d71a95560dd83d74f123ca5d106c103cb4b0fac04e61dd152a4fda38784558` |
| seller accepts terms | `32a227c4846f3b099f81574228ac5cee418a93f7b988464eac7ffc30f4caffce` |
| buyer funds | `7baf5602e848bb552393b49a4141cb332c0b46fff43f9ae68361844dac247cc0` |
| seller funds | `ff6e0ba0615880ee65ab371d44a601f7893b1aa404927d15cf205dccdb1be40f` |
| seller submits evidence | `56d5413ab3b888a770e64942b70ee22107ee74632510eaec1eb31cca25aed8c2` |
| buyer accepts delivery | `ada2eacb868c15b5aba6e4d5f0bed621b6529a50e39c8928231923d8997616d6` |

Observed contract/SAC events prove:

- buyer transferred `10,500,000` stroops into contract custody;
- seller transferred `500,000` stroops into contract custody;
- contract transferred `10,000,000` stroops to seller;
- contract refunded `500,000` stroops buyer bond;
- contract refunded `500,000` stroops seller bond.

Balance evidence:

| Account | Before success | After success |
|---|---:|---:|
| Buyer | `10000.1966239` XLM | `9999.1035903` XLM, calculated from public fees and net `-1` XLM principal |
| Seller | `10000.2171047` XLM | `10001.2110840` XLM, calculated from public fees and net `+1` XLM principal |

## Testnet Scenario B - Funding Expiry

| Field | Value |
|---|---|
| Deal ID | `0ecb1ee229f9cc3b9b39c13363110417a5a8a08e5733ddc479e3804156121630` |
| Buyer | `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX` |
| Seller | `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU` |
| Buyer funded | `10,500,000` stroops |
| Seller funded | `0` stroops |
| Buyer refund | `10,500,000` stroops |
| Seller refund | `0` stroops |
| Terminal state | `FundingExpired` |
| Contract balance after expiry | `0` |

Transactions:

| Step | Transaction hash |
|---|---|
| create deal | `52402535bb3d7f6cb1a5f8ef6be9e5a0d27a6a82fd6a70ada15fca19685c5214` |
| seller accepts terms | `78af7cc35d618dc1853389a8b0923878c91cdb5ada4f5bb0d39dcef806dc5c8f` |
| buyer funds | `c05a3087176ffd879bf1e3e5481cefccc2c030781c68e95170c92307f1f35211` |
| expire funding | `2ff7e7ad669f6a967206407b046740ae320d4484f2db8a2dd5d5c3b712c4ec4b` |

Balance evidence:

| Account | Before expiry | After expiry |
|---|---:|---:|
| Buyer | `9999.1035903` XLM | `9999.0535249` XLM; funding was fully refunded and only transaction fees remained |
| Seller | `10001.2110840` XLM | `10001.2099797` XLM; seller only paid acceptance transaction fee |

## Deployment Tooling

- Script: `contracts/trade_assurance_v2/scripts/testnet-proof.ps1`
- Default mode: dry-run only.
- Live execution requires `-Execute`.
- The script rejects Stellar secret-key-shaped values and expects local Stellar CLI aliases or public addresses.
- Manifest template: `contracts/trade_assurance_v2/testnet/manifest.example.json`
- Verified manifest: `contracts/trade_assurance_v2/testnet/manifest.testnet.json`

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
