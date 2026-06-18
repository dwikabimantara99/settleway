# 27 - Stellar CLI Secure-Store Signer

## Supersession Note

This document captures the original secure-store signer introduction checkpoint.

It predates the later live Soroban signing hardening where the CLI signer also needed the public RPC URL during `stellar tx sign` for RPC-prepared Soroban transactions.

It remains useful as the origin record for the secure-store signer boundary, but the current live backend/Testnet truth now lives in:

- `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

## Objective

Record the safe public evidence for the local Stellar CLI secure-store signer adapter and the operator harness migration away from raw secret-seed injection.

## Source Checkpoint

- Branch: `phase-7-rebuild`
- Code commit: `3165d9a`
- Code commit message: `feat: add Stellar CLI secure-store signer`

## Implemented Scope

- Added a local Stellar CLI process runner for bounded stdin/stdout/stderr handling.
- Added a `StellarCliSecureStoreSigner` that signs through the official Stellar CLI by local secure-store alias.
- Added local alias-to-public-address verification with `stellar keys public-key`.
- Added offline signer preflight for the admin, buyer demo, and seller demo roles.
- Migrated the local Testnet operator input away from raw secret-seed signer injection.
- Added `signer_preflight` as a local operator command.
- Added `npm.cmd run smoke:testnet:signer-preflight` as the manual signer-preflight entry point.
- Preserved the existing no-network smoke preflight behavior.

## Explicitly Not Implemented

- No Friendbot call.
- No funding.
- No Stellar RPC call.
- No contract deployment.
- No contract initialization.
- No contract invocation.
- No transaction submission.
- No confirmation or live reconciliation.
- No product route, UI, database-schema, workflow, or Phase 8 change.

## Local Public Configuration Used For Validation

- Stellar CLI path: `C:\Users\ACER\.cargo\bin\stellar.exe`
- Stellar CLI version: `26.1.0`
- Config directory: `C:\Users\ACER\AppData\Local\Settleway\stellar-testnet-smoke`
- Network alias: `settleway-testnet`
- Network passphrase: `Test SDF Network ; September 2015`
- Admin alias: `settleway-testnet-admin`
- Buyer demo alias: `settleway-testnet-buyer-demo`
- Seller demo alias: `settleway-testnet-seller-demo`
- Admin public address: `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG`
- Buyer demo public address: `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX`
- Seller demo public address: `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU`

## Validation Results

- `npm.cmd run test -- --reporter=verbose`: passed, 24 files and 551 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run smoke:testnet:preflight`: passed with zero network checks, source-account loads, simulations, submissions, confirmations, and signer calls.
- `npm.cmd run smoke:testnet:signer-preflight`: passed with all three aliases verified and all three synthetic signatures verified.

The build required normal Next.js build-time network access for configured font assets. The signer preflight required access to the local Windows secure store. Neither action called Stellar RPC or mutated Testnet.

## Final Code-Validation Hashes

- `EA70255FE82F3D2AB32EE37C6E1515492E36ACB4738A4E37C557829E35857A63` - `web/package.json`
- `582D9E1C2C0937BDD9ABB5FCF988B441A194B097DEDB642F854579F77D78992F` - `web/src/lib/stellar/server/smoke/index.ts`
- `08611C2EFCA19FA4B7357AE5EFA1AB0F71B73AF700ED774D738925A0C2C7B1CD` - `web/src/lib/stellar/server/smoke/operator-env.test.ts`
- `94A6E137D8D1106891E966F4279B9EAD3741DF0B841106A0AF11F72DF0477B57` - `web/src/lib/stellar/server/smoke/operator-env.ts`
- `71A7405B84D9FB444715CD51114E711138183A5A28D4171A2B0B46AF61E476C2` - `web/src/lib/stellar/server/smoke/testnet-smoke.manual.ts`
- `7CE5FEF8F2EA140601EC17BE3EAD1D737C9915B9BC4F0E45031CC24724AA8F20` - `web/src/lib/stellar/server/smoke/stellar-cli-process-port.ts`
- `1E7BC0EE4B44564FF3FBDE899904256A34674F04DAD0DD7879A071D5BB984D16` - `web/src/lib/stellar/server/smoke/stellar-cli-secure-store-signer.test.ts`
- `3E7AEC897C5352FE0BE8676C37FB07373247899F131DB968CD6F2E22BF83129E` - `web/src/lib/stellar/server/smoke/stellar-cli-secure-store-signer.ts`

## Secret-Handling Confirmation

- No secret seed or seed phrase was displayed.
- No secret was stored in Git or the repository.
- No secret was exported from the secure store.
- No unsigned XDR, signed XDR, signature bytes, or secure-store internals were recorded in this document.
- Operator output safety checks reject XDR, raw signature wording, secret wording, and environment dumps.

## Remaining Steps Before Live Smoke Authorization

- Fund the three synthetic Testnet identities only in a separately authorized task.
- Deploy the current canonical Wasm only in a separately authorized task.
- Record the fresh deployed contract ID and initialization evidence only after the deployment task.
- Run any live transaction scenario only after explicit authorization for Testnet mutation.

## Mainnet Prohibition

These identities and this operator harness remain synthetic Testnet-only tooling and must never be reused for Mainnet.
