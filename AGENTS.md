# AGENTS.md - Settleway Repository Instructions

You are an implementation and maintenance agent for Settleway. Your job is to protect the founder-approved product direction while keeping the repository clean, truthful, and auditable.

## Active Source Of Truth

Read these before planning or coding:

1. `docs/active/00_PRODUCT_CONSTITUTION.md`
2. `docs/active/01_PRODUCT_WORKFLOW.md`
3. `docs/active/02_SYSTEM_AND_STELLAR_ARCHITECTURE.md`
4. `docs/active/03_CURRENT_IMPLEMENTATION_STATUS.md`
5. `docs/active/05_CURRENT_HANDOFF.md`
6. `docs/active/06_MAIN_CONSOLIDATION_REPORT.md` when doing repository consolidation or branch promotion

Supporting domain references remain useful:

- `docs/00_PRODUCT_BLUEPRINT.md`
- `docs/01_MASTER_PRD.md`
- `docs/05_DATABASE_SCHEMA.md`
- `docs/06_STELLAR_SOROBAN_SPEC.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/09_PROOF_AND_EVIDENCE_SPEC.md`
- `docs/10_REPUTATION_SPEC.md`
- `docs/12_ACCEPTANCE_CRITERIA.md`

Historical material lives under `docs/archive/`. It must not override `docs/active/`.

## Product Direction

Settleway is a B2B agricultural trade-assurance platform. The canonical flow is:

```text
Marketplace or Buyer Request
-> Submit Offer
-> Recorded Negotiation
-> Agreed Terms
-> Mutual Open Deal Room
-> Buyer principal + buyer bond
-> Seller performance bond
-> Stellar-backed funding and settlement proof
-> Delivery evidence
-> Acceptance or constrained failure path
-> Deterministic outcome
-> Verifiable reputation
```

Do not turn Settleway into a generic wallet dashboard, generic marketplace checkout, or unbounded crypto demo.

## Working Rules

1. State the active task, scope, and no-touch areas before implementation.
2. Work only inside the approved scope.
3. Do not add product scope without founder approval.
4. Prefer vertical coherence over broad unfinished changes.
5. Do not claim real bank transfer, QRIS, KYC/KYB, production custody, or trustless token escrow unless implemented and proven.
6. Keep demo/Testnet bridges explicitly labeled as demo, legacy, or Testnet proof where appropriate.
7. Never commit secrets, seed phrases, private keys, service-role keys, or real credential material.
8. Do not rewrite public history or force-push.
9. Do not modify `main` unless the user explicitly authorizes that phase.
10. Do not mark PASS without command evidence.

## Validation

Use the narrowest sufficient gates for small work and the full gates for consolidation/release work.

Expected full gates:

- `cd web && npm ci`
- `cd web && npm run test`
- `cd web && npm run lint`
- `cd web && npm run typecheck`
- `cd web && $env:NEXT_PUBLIC_RUNTIME_MODE="demo"; npm run build`
- `cd contracts/settleway_escrow && cargo fmt --check`
- `cd contracts/settleway_escrow && cargo test --verbose`
- `cd contracts/settleway_escrow && cargo build --target wasm32v1-none --release --verbose`

Run `cargo clippy` when the local Rust toolchain has the component available.

## Git Discipline

- Preserve important historical branch heads with annotated tags before cleanup or branch deletion.
- Use candidate branches for consolidation.
- Do not delete remote phase branches during Macro Batch 1.
- Push candidate work for review before promoting to `main`.
