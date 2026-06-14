# 23 - Current Handoff

This document records the current operational state for the next Settleway engineering session. It is not a product blueprint and not an implementation plan.

## Current Position

### Verified Fact

- Branch: `phase-7-rebuild`
- Checkpoint: `32d112160e1235d6e9667d8e48d8ea0e19bb5d09`
- Checkpoint commit: `fix: harden Stellar signer verification`
- Working tree was clean at the controlled Testnet smoke readiness checkpoint.
- Mega-Phase 7N network adapter foundation: complete.
- The isolated Stellar Testnet adapter now enforces normal transaction parsing, RPC-prepared intent preservation, fee-cap validation, signer-returned transaction body identity, expected-signer cryptographic verification, and `FeeBumpTransaction` rejection.
- Registered offline web validation was last observed during the 7N hardening task as 21 test files and 488 passing tests, with lint and build passing.
- `contracts/settleway_escrow/src/lib.rs` contains the Tier A Soroban event-contract foundation.
- CI workflow files exist for web test/lint/build and Soroban contract test/build.

### Reported But Not Independently Verified In This Handoff Update

- Live Testnet deployment, live RPC behavior, live transaction mutation, and live contract invocation remain unverified.
- Current GitHub Actions status after the latest push has not been observed in this session.
- No current trusted deployed contract ID has been verified from repository files.

## Next Authorized Mission

### Next Authorized Mission

The next authorized mission is:

```text
Controlled Testnet smoke readiness and isolated smoke tooling
```

This mission is readiness and documentation first. It does not authorize live network mutation yet.

A separate explicit authorization is required before any of the following:

- deploying the Soroban contract;
- initializing a deployed contract;
- invoking a live contract;
- submitting a transaction;
- confirming or reconciling a live transaction through RPC;
- accessing local secret material;
- wiring live Testnet behavior into product routes or UI.

Phase 8 has not started. Product routes and UI remain outside the current scope.

## Current Testnet Readiness Summary

### Verified From Repository

- The contract source and tests exist under `contracts/settleway_escrow/`.
- Soroban contract CI is configured to run `cargo test --verbose`, build `wasm32v1-none` release Wasm, and upload `settleway_escrow.wasm`.
- Web CI is configured to run `npm run test`, `npm run lint`, and `npm run build`.
- The web code contains an SDK-backed RPC port and a hardened isolated Testnet adapter.
- The signer boundary is interface-only.
- The Deal API mutation routes currently use the mock store and off-chain state machine rather than the Testnet adapter.

### Missing Before Live Smoke Authorization

- Fresh deployment of the current contract Wasm.
- Trusted current contract ID tied to the exact source commit and Wasm hash.
- Runtime signer implementation for `admin`, `buyer_demo`, and `seller_demo`.
- Runtime composition root that wires RPC, signer, adapter, persistence, time source, and public metadata.
- Local-only smoke CLI or harness.
- Deployment and initialization procedure that records only safe evidence.
- Human-provided Testnet public addresses, funded accounts, RPC endpoint, fee cap, time-bound policy, deal hash fixture, proof hash fixture, and simulated monetary values.

## Prohibited Scope Until Separately Authorized

- No live RPC.
- No Testnet mutation.
- No secret access.
- No deployment.
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
