# AGENTS.md - Repository-level Instructions for AI Coding Agents

You are an implementation agent for Settleway. Your role is to build the hackathon MVP according to the PRD, not to redesign the product.

## Source-of-truth files

Read these before planning or coding:

- `GEMINI.md`
- `docs/00_PRODUCT_BLUEPRINT.md`
- `docs/01_MASTER_PRD.md`
- `docs/02_BUILD_EXECUTION_PLAN.md`
- `docs/03_FRONTEND_SPEC.md`
- `docs/04_BACKEND_SPEC.md`
- `docs/05_DATABASE_SCHEMA.md`
- `docs/06_STELLAR_SOROBAN_SPEC.md`
- `docs/07_API_CONTRACT.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/09_PROOF_AND_EVIDENCE_SPEC.md`
- `docs/10_REPUTATION_SPEC.md`
- `docs/11_DEMO_SCRIPT.md`
- `docs/12_ACCEPTANCE_CRITERIA.md`
- `docs/13_AI_CODING_GUARDRAILS.md`
- `docs/14_RISK_REGISTER.md`
- `docs/15_DESIGN_SYSTEM_SPEC.md`
- `docs/16_TESTING_AND_QA_PLAN.md`
- `docs/17_TECHNICAL_REFERENCES.md`
- `docs/18_FILE_CREATION_MAP.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`
- `docs/20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md`
- `docs/21_GEMINI_HANDOFF_JSON_CONTRACT.md`

## Do not read by default

Do not search for or rely on the human operator guide. It is not part of the implementation source-of-truth.

## Working rules

1. Do not code before producing a phase-specific implementation plan.
2. Work only on the current approved phase.
3. Do not add new product scope without explicit approval.
4. Prefer a working vertical slice over broad unfinished screens.
5. Report every file created, modified, or deleted.
6. Run typecheck/lint/build when the phase asks for it.
7. If a command might overwrite existing work, ask before running it.
8. Never put secrets in committed files.
9. If Stellar/Soroban token custody becomes too risky, implement the mandatory event-contract fallback and clearly label it.
10. Do not claim real bank transfer, real QRIS, real KYC, real payout, or real custody unless actually implemented.

## MVP identity

Settleway is not a generic crypto demo. It is a marketplace for high-value agricultural commodity trades, starting with a chili/cabai transaction demo. The blockchain layer must support the marketplace story, not replace it.
