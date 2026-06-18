# 24 - Controlled Testnet Smoke Runbook

## Supersession Note

This document is historical preparation material.

It was written before the current local secure-store signer wiring, smoke harness confirmation polling, and live public Testnet scenario proofs were completed.

For the current live backend/Testnet truth, read:

- `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

This runbook prepares Settleway for a future controlled Stellar Testnet smoke. It is evidence-driven and repository-bound. It does not authorize live RPC, deployment, contract invocation, transaction submission, secret access, product route wiring, UI work, schema work, contract-source changes, workflow changes, dependency changes, test changes, product-code changes, or Phase 8.

## 1. Objective

Prepare the minimum safe path for proving the current Settleway Tier A event-contract and hardened Testnet adapter against Stellar Testnet, without turning the product routes into live Testnet entry points.

The future smoke must prove:

- current contract source can be locally verified and freshly deployed;
- the deployed contract is initialized by the admin role;
- the adapter preserves canonical intent through RPC preparation;
- signing remains role-bound and cryptographically verified;
- submission and confirmation are handled without blind resubmission;
- confirmed chain outcomes can safely drive local operation and deal-state expectations.

## 2. Current Verified Checkpoint

Verified before this runbook was written:

- Branch: `phase-7-rebuild`
- HEAD: `32d112160e1235d6e9667d8e48d8ea0e19bb5d09`
- Commit: `fix: harden Stellar signer verification`
- Working tree: clean at checkpoint verification
- `git show --check --oneline HEAD`: clean

No live RPC, secret access, deployment, contract invocation, transaction submission, or confirmation was performed while preparing this runbook.

## 3. Repository Readiness Findings

### Verified From Repository

- `contracts/settleway_escrow/Cargo.toml` defines a Soroban SDK `=26.1.0` contract crate with `cdylib` and `rlib` outputs.
- `contracts/settleway_escrow/src/lib.rs` implements Tier A lifecycle storage and events for `initialize`, `create_escrow`, deposits, proof hash, delivery, completion, expiry, refund, and `get_escrow`.
- `contracts/settleway_escrow/src/test.rs` contains local unit tests for deposit ordering, automatic lock, expiry, refund, authorization failure cases, and completion from delivered.
- `.github/workflows/soroban-contract-ci.yml` runs contract tests, builds release Wasm for `wasm32v1-none`, confirms the Wasm output, and uploads `settleway_escrow.wasm`.
- `web/package.json` exposes `test`, `lint`, and `build` scripts.
- `.github/workflows/web-ci.yml` runs web tests, lint, and build on `phase-7-rebuild`.
- `web/src/lib/stellar/server/stellar-sdk-rpc.ts` is a concrete SDK-backed RPC port for network identity, source account lookup, simulation/preparation, submission, and confirmation.
- `web/src/lib/stellar/server/stellar-testnet-adapter.ts` is a hardened isolated adapter that validates Testnet passphrase, fee caps, RPC-prepared intent, signer-returned transaction body identity, expected signer cryptographic signature, and fee-bump rejection.
- `web/src/lib/stellar/server/execution-service.ts` persists pending operations before submit and reconciles existing submitted or unknown operations by transaction hash.
- Deal mutation API routes currently use `mockStore`, the off-chain escrow state machine, and local events. They do not compose the Testnet adapter.

### Reported Historically

- `docs/06_STELLAR_SOROBAN_SPEC.md` documents environment names and a deployment checklist, including an RPC URL, Testnet passphrase, source secret, contract ID, and event-contract mode.
- Root `README.md` and `contracts/README.md` contain stale phase status and must not be used as live readiness authority.
- `contracts/settleway_escrow/README.md` gives `cargo test` and a build command, but its build target differs from current contract CI.

### Missing

- No trusted current Testnet contract ID is committed in repository documentation or source.
- No repository file records a fresh deployment of the current Wasm from checkpoint `32d112160e1235d6e9667d8e48d8ea0e19bb5d09`.
- No concrete runtime signer implementation exists for `StellarSignerPort`.
- No runtime composition root wires `StellarSdkRpc`, `StellarTestnetAdapter`, a signer port, public metadata, persistence, and a time source.
- No local-only controlled Testnet smoke CLI or script exists.
- No deploy script exists for the current contract.
- No initialization script exists for `initialize(admin)`.
- No live confirmation or reconciliation command exists outside the library abstractions.

### Requires Human-Provided Value

- Testnet RPC endpoint.
- Testnet network passphrase.
- Fresh deployed contract ID.
- Admin public address.
- Buyer demo public address.
- Seller demo public address.
- Funded Testnet source accounts for all signer roles.
- Runtime-only signing mechanism for each role.
- Transaction fee cap.
- Transaction expiry or time-bound policy.
- Deal hash fixture.
- Proof hash fixture.
- Five simulated monetary values: principal, buyer bond, seller bond, buyer fee, and seller fee.

### Requires Separate Implementation

- Isolated local smoke tooling.
- Runtime signer adapter.
- Runtime dependency-injection composition root.
- Contract deployment and initialization command.
- Reconciliation command for submitted or unknown operations.

## 4. Required Human-Provided Values

The future smoke requires these values to be supplied through a local runtime boundary, not through committed files, prompts, screenshots, logs, or Markdown:

| Value | Classification | Notes |
|---|---|---|
| Testnet RPC endpoint | Public configuration | Must match the expected network passphrase. |
| Testnet network passphrase | Public configuration | Expected value is the Stellar Testnet passphrase. |
| Fresh contract ID | Public evidence | Must come from the current Wasm deployment. |
| Admin public address | Public identity | Initializes the contract and signs admin actions. |
| Buyer demo public address | Public identity | Signs buyer demo actions. |
| Seller demo public address | Public identity | Signs seller demo actions. |
| Signing mechanism per role | Secret boundary | Private material stays runtime-only. |
| Funded Testnet accounts | Public/operational prerequisite | Each source account must have sequence availability. |
| Fee cap | Public configuration | Adapter rejects prepared fees above cap. |
| Expiry/time-bound policy | Public configuration | Adapter currently supports a max timeout up to 600 seconds. |
| Deal hash fixture | Public evidence | SHA-256 bytes32 fixture for the smoke deal. |
| Proof hash fixture | Public evidence | SHA-256 bytes32 fixture for proof submission. |
| Principal | Public simulated amount | No real funds or custody implied. |
| Buyer bond | Public simulated amount | No real funds or custody implied. |
| Seller bond | Public simulated amount | No real funds or custody implied. |
| Buyer fee | Public simulated amount | No real funds or custody implied. |
| Seller fee | Public simulated amount | No real funds or custody implied. |

Do not infer these values from stale documentation. Do not read `.env` or `.env.*` files during readiness documentation tasks.

## 5. Secret-Handling Rules

- Private seeds must never be pasted into ChatGPT, Codex prompts, Markdown files, Git, logs, screenshots, terminal transcripts, or public output.
- Test accounts must be synthetic Testnet-only identities.
- Public addresses may be reported.
- Secret material must stay inside a local runtime-only signing boundary.
- No production wallet, Mainnet identity, production funds, or real user wallet may be used.
- Logs and public results must not contain signed XDR or raw signature bytes.
- Failed signer and adapter results must expose public error codes only.
- If a secret appears in output, stop immediately, preserve evidence only as needed for local containment, and do not commit.

## 6. Account And Signer-Role Model

The canonical signer roles are:

- `admin`
- `buyer_demo`
- `seller_demo`

Verified role mapping:

- `create_deal` signs as `admin`.
- `buyer_deposit` signs as `buyer_demo`.
- `seller_deposit` signs as `seller_demo`.
- `submit_proof` signs as `seller_demo`.
- `mark_delivered` signs as `seller_demo`.
- `accept_delivery` signs as `buyer_demo`.
- `expire` signs as `admin`.
- `refund` signs as `admin`.

The contract also requires `initialize(admin)` before `create_escrow`. This is a deployment/setup action, not one of the 13 product execution actions.

Each role must use a separate funded synthetic Testnet account unless a future authorization explicitly approves a different model. Reusing production or Mainnet identities is prohibited.

## 7. Local Contract Verification

Before any live Testnet mutation is authorized:

1. Verify the repository is on the approved branch and commit.
2. Run contract tests from `contracts/settleway_escrow`.
3. Build the contract Wasm with the same target used by CI unless a newer approved target is documented.
4. Identify the exact Wasm artifact path.
5. Record the Wasm hash.
6. Verify the public contract methods against the adapter invocation methods:
   - `initialize`
   - `create_escrow`
   - `deposit_buyer`
   - `deposit_seller`
   - `submit_proof_hash`
   - `mark_delivered`
   - `accept_and_complete`
   - `expire_if_unfunded`
   - `refund_before_locked`
   - `get_escrow`
7. Stop if the built artifact, method set, or API shape differs from the committed adapter and invocation builder.

Safe evidence to record:

- branch;
- commit hash;
- contract test result summary;
- build result summary;
- Wasm artifact path;
- Wasm hash.

## 8. Deployment Plan

A fresh deployment is required because the repository does not contain a current trusted contract ID tied to the exact current source and Wasm hash.

The future deployment stage must:

1. Use only the freshly built current Wasm.
2. Deploy to Stellar Testnet with synthetic Testnet-only identity.
3. Record the contract ID.
4. Initialize the contract by calling `initialize(admin)` with the admin public address.
5. Verify that the initialized admin is the intended Testnet admin address through a safe read or through the initialization transaction evidence available from tooling.
6. Treat any previously deployed contract as obsolete or untrusted unless a human can prove the exact commit hash, Wasm hash, contract ID, and initialization identity.

Do not deploy from stale artifacts. Do not reuse an old contract ID for the first controlled smoke.

## 9. Adapter Transport Smoke

The minimum adapter transport smoke must prove this sequence:

1. RPC network identity matches the expected Testnet passphrase.
2. Source account lookup succeeds for the signer role.
3. The transaction factory constructs the expected single Soroban invocation.
4. RPC simulation and preparation succeeds.
5. RPC preparation preserves canonical intent while allowing fee/auth/resource changes.
6. Prepared fee remains at or below the configured cap.
7. The signing boundary signs only for the expected role and address.
8. The signer returns a normal transaction, not `FeeBumpTransaction`.
9. The signed transaction body exactly matches the RPC-prepared unsigned body.
10. The expected public key verifies at least one decorated signature over the correct network hash.
11. Submission happens once.
12. Confirmation lookup happens once by transaction hash.
13. Result decoding matches action expectations:
    - `create_deal` returns an escrow ID.
    - transition actions return void.
14. Operation persistence stores status, transaction hash, result escrow ID when applicable, and public error codes only.

No signed XDR or raw signature bytes may be stored as public smoke evidence.

## 10. Canonical Happy Path

Use synthetic Testnet-only identities and simulated amounts.

Expected sequence:

1. `create_deal`
   - Expected local status: `null`
   - Target local status: `WAITING_DEPOSITS`
   - Contract method: `create_escrow`
   - Signer: `admin`
   - Expected confirmation result: escrow ID
2. `buyer_deposit`
   - Expected local status: `WAITING_DEPOSITS`
   - Target local status: `BUYER_FUNDED`
   - Contract method: `deposit_buyer`
   - Signer: `buyer_demo`
3. `seller_deposit`
   - Expected local status: `BUYER_FUNDED`
   - Target local status: `LOCKED`
   - Contract method: `deposit_seller`
   - Signer: `seller_demo`
4. `submit_proof`
   - Expected local status: `LOCKED`
   - Target local status: `PROOF_SUBMITTED`
   - Contract method: `submit_proof_hash`
   - Signer: `seller_demo`
5. `mark_delivered`
   - Expected local status: `PROOF_SUBMITTED`
   - Target local status: `DELIVERED`
   - Contract method: `mark_delivered`
   - Signer: `seller_demo`
6. `accept_delivery`
   - Expected local status: `DELIVERED`
   - Target local status: `COMPLETED`
   - Contract method: `accept_and_complete`
   - Signer: `buyer_demo`

Expected terminal product state:

```text
COMPLETED
```

## 11. Fallback Paths

Run fallback paths only after the canonical happy path succeeds.

### Unfunded Expiry

1. Create a fresh smoke deal.
2. Do not perform buyer or seller deposit.
3. Wait until the contract expiry condition is valid.
4. Run `expire`.
5. Expected local state: `EXPIRED`.
6. Expected signer: `admin`.

### One-Sided Funded Refund

1. Create a fresh smoke deal.
2. Run exactly one deposit, preferably buyer deposit first for the first smoke.
3. Run `refund`.
4. Expected local state: `REFUNDED`.
5. Expected signer: `admin`.

Do not attempt every permutation in the first live smoke unless a later authorization requires it.

## 12. Safe Evidence Capture

Record only:

- commit hash;
- contract Wasm hash;
- contract ID;
- public signer addresses;
- transaction hashes;
- operation statuses;
- confirmed result summaries;
- local sync outcomes;
- timestamps;
- local test, lint, and build result summaries.

Never record:

- private seeds;
- private keys;
- wallet exports;
- signed XDR;
- raw signature bytes;
- local secret-store paths;
- production wallet identifiers;
- Mainnet identity material.

## 13. Stop Conditions

Stop immediately on:

- network identity mismatch;
- unexpected contract ID;
- unexpected method or argument encoding;
- signer-role mismatch;
- prepared-intent mismatch;
- signed-body mismatch;
- cryptographic signature failure;
- `FeeBumpTransaction` output;
- fee-cap violation;
- unknown submission state;
- confirmation ambiguity;
- contract failure;
- local commit `out_of_sync`;
- secret leakage;
- unexpected file modification.

When stopped, record only safe public evidence and do not continue to the next smoke action.

## 14. Unknown-State Reconciliation

For submitted, pending, or unknown states:

- do not blindly resubmit;
- reconcile by the persisted transaction hash;
- use the existing operation record and its idempotency key;
- confirm existing submitted or unknown operations before considering any new action;
- if persistence failed after a transaction hash was obtained, preserve the transaction hash and reconcile manually before any retry.

This rule comes from the current execution planner, execution service, adapter confirmation behavior, and onboarding blueprint.

## 15. Rollback And Containment Principles

Blockchain state cannot be rolled back. Containment is procedural:

- use synthetic Testnet-only accounts;
- use a fresh smoke-only contract ID;
- stop on the first unsafe condition;
- do not reuse a suspect contract ID;
- do not overwrite or erase local evidence needed for reconciliation;
- reset only local mock/demo state when no live transaction is pending;
- never force product routes or UI into live mode during the first smoke;
- keep production behavior unchanged.

## 16. Minimum Missing Implementation

The current committed code is not sufficient for a safe live smoke because it lacks signer implementation, runtime composition, deployment tooling, and a local smoke entry point.

### Local-Only Smoke CLI

- Likely path: `web/scripts/controlled-testnet-smoke.mjs`
- Responsibility: orchestrate local contract evidence loading, public smoke configuration, action sequencing, adapter calls, confirmation, and safe evidence output.
- Why existing code is insufficient: existing tests are offline and no command invokes the adapter against live Testnet.
- Product routes or UI touched: no.
- Secret handling: should not directly print or persist private material; it may coordinate a signer boundary.
- Production isolation: command is local-only and not imported by application routes.

### Runtime Signer Adapter

- Likely path: `web/src/lib/stellar/server/local-testnet-signer.ts`
- Responsibility: implement `StellarSignerPort` for synthetic Testnet accounts, verify requested role/address, sign prepared XDR, and return signed XDR only to the adapter.
- Why existing code is insufficient: `StellarSignerPort` is currently interface-only, and test signers are fixtures.
- Product routes or UI touched: no.
- Secret handling: yes, but only inside the local runtime boundary; no secret logging or committed values.
- Production isolation: imported only by the local smoke CLI until separately authorized.

### Smoke Composition Root

- Likely path: `web/src/lib/stellar/server/testnet-smoke-runtime.ts`
- Responsibility: wire `StellarSdkRpc`, `StellarTestnetAdapter`, signer, role mapping, config, persistence, and time source for the local smoke.
- Why existing code is insufficient: library functions require injected ports; no runtime wiring exists.
- Product routes or UI touched: no.
- Secret handling: references signer boundary but does not expose private material.
- Production isolation: not used by Next.js routes.

### Deployment And Initialization Script

- Likely path: `contracts/settleway_escrow/scripts/deploy-testnet.ps1`
- Responsibility: deploy the current Wasm, record contract ID, and initialize admin with safe public output only.
- Why existing code is insufficient: current README has build/test commands only, and no deploy/init script exists.
- Product routes or UI touched: no.
- Secret handling: may require local CLI identity access; must not print or persist private material.
- Production isolation: contract-only local operator script.

### Reconciliation Command

- Likely path: `web/scripts/controlled-testnet-reconcile.mjs`
- Responsibility: confirm a persisted transaction hash and summarize confirmed, failed, or unknown status without resubmitting.
- Why existing code is insufficient: adapter exposes confirmation but no local command wraps it for smoke operations.
- Product routes or UI touched: no.
- Secret handling: no signing required for confirmation.
- Production isolation: local-only command.

## 17. Exact Acceptance Gates

Before live smoke authorization:

- Repository branch and commit match the approved checkpoint.
- Working tree is clean.
- No `.env` or `.env.*` file is read by the agent.
- Contract tests pass.
- Contract Wasm builds.
- Wasm hash is recorded.
- Web tests pass.
- Web lint passes.
- Web build passes.
- Fresh deployment produces a new contract ID.
- Contract is initialized by the expected admin public address.
- Runtime public addresses match signer roles.
- All source accounts are funded and sequence lookup succeeds.
- Fee cap is explicit.
- Time-bound policy is explicit.
- Deal hash and proof hash fixtures are valid bytes32 values.
- Public evidence output contains no signed XDR, raw signature bytes, private seeds, or private keys.
- No product route, UI, schema, workflow, dependency, product-code, test, or Phase 8 change is included.

During live smoke:

- Each action uses the canonical method and signer role.
- Each submit is followed by a single confirmation lookup.
- Each unknown state stops and reconciles by transaction hash.
- Local product state advances only after confirmed operation and valid local commit.
- Terminal happy-path state is `COMPLETED`.
- Fallback path states are `EXPIRED` and `REFUNDED` as applicable.

## 18. Explicit Non-Goals

- No Phase 8 implementation.
- No product route wiring to live Testnet.
- No UI changes.
- No database schema changes.
- No Soroban contract changes.
- No dependency changes.
- No workflow changes.
- No production custody.
- No real bank transfer, QRIS, payout, KYC, KYB, insurance, or legal dispute system.
- No token custody mode.
- No Mainnet use.
- No broad permutation testing in the first live smoke.
- No automatic resubmission for pending, submitted, or unknown operations.
