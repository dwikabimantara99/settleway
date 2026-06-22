# 26 - Testnet Synthetic Identities

## Objective

Record the safe public evidence for the dedicated local Stellar CLI installation and the three synthetic Testnet-only identities provisioned for the future controlled Settleway smoke.

## Source Checkpoint

- Branch: `phase-7-rebuild`
- Commit: `033ccd584129975fc38465800b05ac258244e878`
- Commit message: `docs: freeze current Testnet contract artifact`

## Stellar CLI Package Source

- Package: `stellar-cli`
- Exact version: `26.1.0`
- Source registry: `crates.io`
- Installation command: `cargo install --locked stellar-cli --version 26.1.0 --registry crates-io`

## Installed CLI Version

`stellar 26.1.0 (1228cff8022b804659750b94b315932b0e0f3f6a)`

## Installed Binary Path

`C:\Users\ACER\.cargo\bin\stellar.exe`

## Dedicated Config Directory Path

`C:\Users\ACER\AppData\Local\Settleway\stellar-testnet-smoke`

This directory is outside the repository and is used only through the CLI's explicit `--config-dir` option.

## Local Network Alias

`settleway-testnet`

## Testnet RPC URL

`https://soroban-testnet.stellar.org`

## Testnet Passphrase

`Test SDF Network ; September 2015`

## Identity Aliases

- `settleway-testnet-admin`
- `settleway-testnet-buyer-demo`
- `settleway-testnet-seller-demo`

## Public Role Addresses

- Admin: `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG`
- Buyer demo: `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX`
- Seller demo: `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU`

## Windows Secure-Store Confirmation

The three identities were created with `stellar keys generate --secure-store`, so Windows OS secure-store mode was used instead of plaintext seed-phrase storage.

## Secret-Handling Confirmation

- No secret seed or seed phrase was displayed in the task report.
- No secret was stored in Git or the repository.
- No secret was exported from the secure store.
- No signed XDR or secure-store internals were recorded in this document.

## Funding Status

All three identities are currently unfunded.

## Network-Call Confirmation

No Stellar RPC, network health/info, Friendbot, funding, deployment, initialization, contract invocation, transaction submission, confirmation, or reconciliation command was run in this task.

`crates.io` registry access was used only to verify and install the official Stellar CLI package.

## Current Operator-Harness Compatibility Gap

The current local operator harness cannot sign directly with these secure-store aliases.

Repository evidence:

- `web/src/lib/stellar/server/smoke/operator-env.ts` defines `SETTLEWAY_SMOKE_ADMIN_SECRET_SEED`, `SETTLEWAY_SMOKE_BUYER_DEMO_SECRET_SEED`, and `SETTLEWAY_SMOKE_SELLER_DEMO_SECRET_SEED`.
- `web/src/lib/stellar/server/smoke/operator-env.ts` builds signers with `Keypair.fromSecret(...)`.
- `web/src/lib/stellar/server/smoke/signer.ts` expects injected transaction signers and returns signed XDR from in-process seed-derived keypairs.

## Minimum Next Implementation

The smallest safe next step is a Stellar CLI secure-store signer adapter that:

- accepts unsigned XDR through stdin or a temporary protected pipe or file;
- invokes the official Stellar CLI;
- uses `stellar tx sign --sign-with-key <alias>`;
- uses the dedicated `--config-dir` and the exact Testnet network or passphrase;
- captures only signed XDR in process memory;
- never exports the secure-store secret;
- deletes any temporary file;
- remains compatible with hardened transaction-body and signature verification.

This adapter is not implemented in the current task.

## Mainnet Prohibition

These identities are synthetic Testnet-only identities and must never be reused on Mainnet.

## Remaining Steps Before Funding And Deployment

- Build and validate the Stellar CLI secure-store signer adapter.
- Wire the adapter into the local smoke runtime without reintroducing raw secret-seed injection.
- Decide the public fee cap and time-bound policy.
- Prepare the public deal-hash and proof-hash fixtures.
- Prepare the simulated principal, buyer bond, seller bond, buyer fee, and seller fee values.
- Fund the three synthetic Testnet identities only in a separately authorized task.
- Deploy the current canonical Wasm in a separately authorized task.
- Record the fresh deployed contract ID and initialization evidence in a separately authorized task.
