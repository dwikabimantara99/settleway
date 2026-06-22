# 06 - Main Consolidation Report

Date: 2026-06-22

## Scope

This report records Macro Batch 1: a bounded repository consolidation pass that prepares Settleway for a later `main` replacement review.

The batch did not modify `main`, did not delete remote branches, did not force-push, and did not introduce production bank, QRIS, KYC, payout, or custody claims.

## Candidate branch

- Candidate branch: `cleanup/main-candidate-2026-06`
- Candidate base: `origin/phase-10-persistence-identity`
- Candidate base SHA: `74f73b1add301d61c2b67a536753c6c828b071e1`
- Current `main` SHA at batch start: `8c5628d0ca8a2603993ac90d3aec679e8f573fa9`

## Branch audit summary

| Branch | Classification |
|---|---|
| `origin/phase-10-persistence-identity` | Canonical candidate source. |
| `origin/phase-10-scope-definition` | Contained in canonical candidate history. |
| `origin/phase-9-demo-hardening` | Contained in canonical candidate history. |
| `origin/phase-8-proof-reputation` | Contained in canonical candidate history. |
| `origin/phase-7-rebuild` | Contained in canonical candidate history. |
| `origin/phase-6-soroban-contract` | Contained in canonical candidate history. |
| `origin/phase-7-stellar-integration` | Older divergent branch with two unique commits; archived by tag, not merged into candidate. |

## Repository consolidation performed

- Replaced the README with a truthful Settleway front door that points to active product, architecture, status, roadmap, and handoff docs.
- Promoted a small active documentation set under `docs/active/`.
- Moved older handoff, phase, testnet, acceptance, and prompt documents into `docs/archive/`.
- Updated repository agent guidance so future agents read the active docs first.
- Added `web/.env.example` as a safe non-secret environment template.
- Added deterministic web CI for tests, lint, typecheck, and demo-mode production build.
- Added Soroban contract CI for format, clippy, tests, Wasm build, and Wasm artifact upload.
- Added ignore rules for generated Node, Next.js, Rust target, and Soroban test snapshot output.

## Product-code cleanup stance

No product runtime code was removed in this batch. The consolidation intentionally focused on repository authority, documentation structure, CI gates, generated-output hygiene, and candidate-branch packaging.

## Archive tags prepared

- `archive/pre-main-consolidation-8c5628d`
- `archive/phase-6-soroban-0e25219`
- `archive/phase-7-rebuild-09657fd`
- `archive/phase-7-stellar-2e02ed0`
- `archive/phase-8-proof-reputation-5332cee`
- `archive/phase-9-demo-hardening-e2c1e42`
- `archive/phase-10-scope-6f0df03`
- `archive/phase-10-persistence-74f73b1`

## Quality gates

Final gates were rerun from the candidate tree before commit:

| Gate | Result |
|---|---|
| `npm run test` in `web` | Pass: 73 files, 771 tests. |
| `npm run lint` in `web` | Pass. |
| `npm run typecheck` in `web` | Pass. |
| `NEXT_PUBLIC_RUNTIME_MODE=demo npm run build` in `web` | Pass: 17 app routes generated. |
| `cargo fmt --check` in `contracts/settleway_escrow` | Pass. |
| `cargo clippy --all-targets --all-features` in `contracts/settleway_escrow` | Pass with existing warnings. |
| `cargo test --verbose` in `contracts/settleway_escrow` | Pass: 15 tests. |
| `cargo build --target wasm32v1-none --release --verbose` in `contracts/settleway_escrow` | Pass. |
| `git diff --check` | Pass with line-ending warnings only. |
| `npm audit --omit=dev` in `web` | Fails: 4 known vulnerabilities, including `axios` through `@stellar/stellar-sdk` and `postcss` through `next`. |

Known expected distinction:

- Demo-mode web build is the deterministic CI build.
- Persistent-mode web build remains fail-closed unless real Supabase configuration is supplied.

## Remaining risks for Macro Batch 2

- A human architectural review is still required before replacing `main`.
- `origin/phase-7-stellar-integration` is intentionally archived as an older divergent branch; it should be reviewed before remote deletion in a later destructive cleanup batch.
- NPM audit currently reports dependency vulnerabilities. This batch did not run `npm audit fix --force` because it would force breaking upgrades, including a Stellar SDK major-version change.
- Contract Clippy passes but reports historical warnings around deprecated Soroban APIs, unused test variables, and a large contract method argument list.
- Web build passes but emits Node `Buffer()` deprecation warnings during the Next.js build.
- Live Testnet custody and payout completion remain product work, not repository consolidation work.
