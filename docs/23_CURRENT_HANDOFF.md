# 23 - Current Handoff

This document records the current operational state for the next Settleway engineering session. It is not a product blueprint and not an implementation plan.

## Current Position

### Verified Fact

- Branch: `phase-7-rebuild`
- Checkpoint: `033ccd584129975fc38465800b05ac258244e878`
- Checkpoint commit: `docs: freeze current Testnet contract artifact`
- Stellar CLI `26.1.0` is installed from `crates.io`.
- Three synthetic Testnet-only secure-store identities have been provisioned.
- Public role addresses are recorded in `docs/26_TESTNET_SYNTHETIC_IDENTITIES.md`.
- The Stellar CLI secure-store signer adapter has been implemented and validated.
- Secure-store signer readiness is recorded in `docs/27_STELLAR_CLI_SECURE_STORE_SIGNER.md`.
- The identities remain unfunded.
- The current Soroban contract artifact has been locally verified and documented.
- No trusted deployed contract ID exists.
- No Friendbot or funding occurred.
- No Stellar RPC call occurred for the local Testnet alias or identity provisioning task.
- No deployment or initialization occurred.
- No secret was exported.
- Phase 8 has not started.

### Reported But Not Independently Verified In This Handoff Update

- Live Testnet deployment, live RPC behavior, live transaction mutation, and live contract invocation remain unverified.
- Current GitHub Actions status after the latest push has not been observed in this session.

## Next Authorized Mission

The next authorized mission is:

```text
prepare the next explicitly authorized Testnet-readiness task
```

No next task authorizes live network mutation by default.

A separate explicit authorization is required before any of the following:

- funding the synthetic Testnet identities;
- deploying the Soroban contract;
- initializing a deployed contract;
- invoking a live contract;
- submitting a transaction;
- confirming or reconciling a live transaction through RPC;
- accessing local secret material;
- wiring live Testnet behavior into product routes or UI.

Live mutation still requires separate authorization.

## Current Testnet Readiness Summary

### Verified From Repository And Local Operator Setup

- The contract source and tests exist under `contracts/settleway_escrow/`.
- Soroban contract CI is configured to run `cargo test --verbose`, build `wasm32v1-none` release Wasm, and upload `settleway_escrow.wasm`.
- The canonical local Wasm SHA-256 remains `A73F99E3E1521E581B38488FF8F26F746843F2214282C3286D5334B7BCE04703`.
- The dedicated local Stellar CLI config directory exists outside the repository at `%LOCALAPPDATA%\\Settleway\\stellar-testnet-smoke`.
- The local network alias `settleway-testnet` is configured with the public Testnet RPC URL and Testnet passphrase.
- The role aliases `settleway-testnet-admin`, `settleway-testnet-buyer-demo`, and `settleway-testnet-seller-demo` exist in Windows secure-store mode.
- The current operator harness rejects raw secret-seed inputs and can run a local `signer_preflight` through the secure-store aliases.
- The secure-store signer preflight has verified all three aliases, preserved synthetic transaction bodies, verified all three signatures, and performed zero RPC calls, submissions, or confirmations.

### Missing Before Live Smoke Authorization

- Funding of the synthetic Testnet identities.
- Fresh deployment of the current contract Wasm.
- Trusted current contract ID tied to the exact source commit and Wasm hash.
- Safe deployment and initialization evidence from a fresh synthetic Testnet deployment.
- Human-provided fee cap, time-bound policy, deal hash fixture, proof hash fixture, and simulated monetary values for the first controlled smoke.

## Prohibited Scope Until Separately Authorized

- No Friendbot.
- No funding.
- No live RPC.
- No Testnet mutation.
- No deployment.
- No contract initialization.
- No contract invocation.
- No transaction submission.
- No route, UI, database-schema, Soroban-contract, workflow, dependency, product-code, test, or Phase 8 changes.
- No production wallet, Mainnet identity, real funds, custody claim, payment claim, or KYC/KYB claim.

## Documentation Staleness To Correct Later

### Verified Fact

- Root `README.md` still reports completed checkpoints only through Phase 4 and lists later phases as pending.
- `contracts/README.md` says the Soroban contract will be implemented in Phase 6, while `contracts/settleway_escrow/` now exists.
- `contracts/settleway_escrow/README.md` lists `wasm32-unknown-unknown`, while current Soroban contract CI builds `wasm32v1-none`.
- `web/README.md` is still the default Next.js README.
- The Deal Room page still contains phase-stale UI copy such as "Phase 5 Notice", "Phase 8", and future Stellar wording.
- `docs/21_GEMINI_HANDOFF_JSON_CONTRACT.md` lists a narrower source-of-truth set than the updated onboarding/precedence model.

These are documentation or UI-copy staleness issues to correct in a separately authorized task.
