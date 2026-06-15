# 23 - Current Handoff

This document records the current operational state for the next Settleway engineering session. It is not a product blueprint and not an implementation plan.

## Current Position

### Verified Fact

- Branch: `phase-7-rebuild`
- Checkpoint: `d12836ce27dd09f09039eb676ad930725163ec41`
- Checkpoint commit: `feat: add local Testnet smoke operator harness`
- The local Testnet operator harness is complete.
- The current Soroban contract artifact has been locally verified from the current checkpoint.
- Canonical Wasm SHA-256: `A73F99E3E1521E581B38488FF8F26F746843F2214282C3286D5334B7BCE04703`
- Working tree was clean before local MSVC repair and contract artifact verification, except for the expected generated `contracts/settleway_escrow/target/` directory during local Cargo execution.
- `contracts/settleway_escrow/src/lib.rs` contains the Tier A Soroban event-contract foundation.
- CI workflow files exist for web test/lint/build and Soroban contract test/build.
- No live deployment has occurred.
- No trusted current contract ID exists yet.
- Phase 8 has not started.

### Reported But Not Independently Verified In This Handoff Update

- Live Testnet deployment, live RPC behavior, live transaction mutation, and live contract invocation remain unverified.
- Current GitHub Actions status after the latest push has not been observed in this session.

## Next Authorized Mission

The next authorized mission is:

```text
synthetic Testnet identity provisioning and fresh contract deployment preparation
```

This mission still does not authorize live network mutation by default.

A separate explicit authorization is required before any of the following:

- deploying the Soroban contract;
- initializing a deployed contract;
- invoking a live contract;
- submitting a transaction;
- confirming or reconciling a live transaction through RPC;
- accessing local secret material;
- wiring live Testnet behavior into product routes or UI.

## Current Testnet Readiness Summary

### Verified From Repository And Local Artifact Validation

- The contract source and tests exist under `contracts/settleway_escrow/`.
- Soroban contract CI is configured to run `cargo test --verbose`, build `wasm32v1-none` release Wasm, and upload `settleway_escrow.wasm`.
- The canonical local contract verification succeeded at checkpoint `d12836ce27dd09f09039eb676ad930725163ec41`.
- The canonical local Wasm artifact path is `contracts/settleway_escrow/target/wasm32v1-none/release/settleway_escrow.wasm`.
- The current canonical Wasm hash is recorded in `docs/25_TESTNET_CONTRACT_ARTIFACT.md`.
- The contract requires one-time `initialize(admin)` before admin-governed execution can proceed.
- Historical deployments must not be treated as trusted for the upcoming smoke.

### Missing Before Live Smoke Authorization

- Fresh deployment of the current contract Wasm.
- Trusted current contract ID tied to the exact source commit and Wasm hash.
- Runtime signer implementation for `admin`, `buyer_demo`, and `seller_demo`.
- Runtime composition root that wires RPC, signer, adapter, persistence, time source, and public metadata.
- Safe deployment and initialization evidence from a fresh synthetic Testnet deployment.
- Human-provided Testnet public addresses, funded accounts, RPC endpoint, fee cap, time-bound policy, deal hash fixture, proof hash fixture, and simulated monetary values.

## Prohibited Scope Until Separately Authorized

- No live RPC.
- No Testnet mutation.
- No secret access.
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
