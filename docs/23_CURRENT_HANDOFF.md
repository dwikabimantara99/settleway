# 23 - Current Handoff

This document records the current operational state for the next Settleway engineering session. It is not a product blueprint and not an implementation plan.

## Current Position

### Verified fact

- Branch: `phase-7-rebuild`
- Starting HEAD: `397e1d12bed394e0954f4941ed603a59623ce3b2`
- Current phase: `Phase 7N - isolated Stellar Testnet adapter hardening`
- Working tree was clean at onboarding checkpoint.
- `web/src/lib/stellar/server/` contains action policy, invocation builder, execution reducer, execution planner, execution service, execution-input assembler, deal sync policy, local commit planner, deal execution coordinator, persistence ports, SDK codec, SDK/RPC port, transaction factory, signer port, and isolated Testnet adapter modules.
- `contracts/settleway_escrow/src/lib.rs` contains the Tier A Soroban event-contract foundation.
- Git history contains checkpoints for offline Stellar operation foundation, action policy, adapter contracts, invocation builder, reducer, planner, persistence-safe execution service, execution assembler, offline deal synchronization, whitespace cleanup, and isolated Stellar Testnet adapter foundation.
- A read-only filesystem count found 21 TypeScript test files under `web/src`.
- CI workflow files exist for web test/lint/build and Soroban contract test/build.

### Reported but not independently verified

- Reported baseline: 21 test files and 453 tests.
- Static source search found 21 TypeScript test files, but this session did not run tests and did not independently verify a 453-test runtime count.
- Lint and build are reportedly passing, but this session did not run lint, build, or observe live CI results.
- Live Testnet deployment, live RPC behavior, and live transaction mutation were not independently verified.

## Verified Completed Offline Execution Foundation

### Verified fact

Repository evidence supports that the offline execution foundation includes:

- canonical 13-plan action policy;
- invocation builder with exact method and argument construction;
- pure execution reducer;
- persistence-safe execution planner;
- operation persistence over the mock store;
- execution service with persist-before-submit behavior;
- execution-input assembler;
- atomic local deal compare-and-swap behavior;
- deal synchronization policy;
- local-commit planner;
- restart-safe deal execution coordinator;
- offline integration coverage for all 13 canonical action/status plans.

The initial isolated Stellar SDK/RPC adapter commit added SDK argument encoding, Soroban transaction construction, explicit time bounds, RPC abstraction, injected signing boundary, network identity checking, simulation/fee-cap handling, submission, single confirmation lookup, and result decoding.

## Remaining Risks

### Remaining risk

1. Complete transaction-body identity must be enforced for signer-returned transactions.
2. Expected-signer verification must remain cryptographic, not hint-only.
3. `FeeBumpTransaction` must be rejected at runtime, not narrowed away by a cast.
4. Final frozen-source validation evidence remains incomplete.

These risks are specific to Phase 7N adapter hardening. They do not change the product direction or authorize broader product scope.

## Next Authorized Mission

### Next authorized mission

The next code mission is Phase 7N isolated Stellar Testnet adapter hardening. Its acceptance should prove the remaining adapter security properties without changing product scope.

This handoff does not itself authorize code changes. It records that the expected inspection/modification scope for the next separately authorized Phase 7N adapter-hardening coding task is limited to:

- `web/src/lib/stellar/server/stellar-testnet-adapter.ts`
- `web/src/lib/stellar/server/stellar-testnet-adapter.test.ts`
- `web/src/lib/stellar/server/stellar-testnet-adapter-integration.test.ts`

This handoff does not authorize Phase 8, product UI work, route rewrites, database-schema changes, Soroban-contract changes, workflow changes, dependency changes, deployments, live RPC mutation, or secret handling.

## Prohibited Scope

### Prohibited scope

- No live RPC.
- No Testnet mutation.
- No secrets.
- No deployment.
- No product-code changes outside the explicitly authorized Phase 7N adapter-hardening scope.
- No route, UI, database-schema, Soroban-contract, workflow, dependency, or Phase 8 changes.
- No changes to custody claims, payment claims, KYC/KYB claims, or product non-goals.

## Acceptance Gates

### Acceptance gates

Before the next code commit, the Phase 7N work should have evidence that:

- only the authorized adapter hardening scope changed;
- complete transaction-body identity is enforced for signer-returned transactions;
- expected-signer verification is cryptographic;
- `FeeBumpTransaction` is rejected at runtime;
- final frozen-source validation evidence is recorded in tests or source review artifacts;
- all affected registered tests pass;
- lint/build status is observed or failures are recorded honestly;
- no secrets, live RPC mutation, deployment, route/UI/database-schema/Soroban-contract/workflow/dependency changes, or Phase 8 files are included.

## Documentation Staleness To Correct Later

### Verified fact

- Root `README.md` still reports completed checkpoints only through Phase 4 and lists later phases as pending.
- `contracts/README.md` says the Soroban contract will be implemented in Phase 6, while `contracts/settleway_escrow/` now exists.
- `web/README.md` is still the default Next.js README.
- The Deal Room page still contains phase-stale UI copy such as "Phase 5 Notice", "Phase 8", and future Stellar wording.
- `docs/21_GEMINI_HANDOFF_JSON_CONTRACT.md` lists a narrower source-of-truth set than the updated onboarding/precedence model.

These are documentation or UI-copy staleness issues to correct later. They are not part of this documentation-only handoff task.
