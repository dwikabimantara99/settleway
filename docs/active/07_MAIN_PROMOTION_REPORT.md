# 07 - Main Promotion Report

Date: 2026-06-22

## Starting SHAs

| Reference | SHA |
|---|---|
| Starting candidate | `1161326f8ac0214376a8505c4ec6ef7d51df6cbe` |
| Starting `origin/main` | `8c5628d0ca8a2603993ac90d3aec679e8f573fa9` |
| Final candidate | Pending remote CI verification |
| Final `main` | Pending promotion |

## Cross-Platform CI Correction

GitHub-hosted Web CI run `27946524559` failed on Ubuntu because Testnet configuration tests used Windows-only absolute paths. The fix replaces developer-machine paths with host-platform absolute fixture paths generated at test runtime and adds regression coverage that relative signer paths remain invalid.

## Dead-Code And Asset Cleanup

Removed after repository-wide reference checks:

| Path group | Reason | Rollback source |
|---|---|---|
| `web/public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Unreferenced default Next.js public assets. | Git history before Macro Batch 2 commit. |
| `web/src/components/profile/PayoutDestinationCard.tsx` and test | Superseded profile UI; no production import remained. | Git history before Macro Batch 2 commit. |
| `web/src/components/ui/StatCard.tsx` | Unused shared component; no import remained. | Git history before Macro Batch 2 commit. |
| `web/src/components/ui/Timeline.tsx` | Unused shared component; active Deal Room uses its own rendered execution timeline. | Git history before Macro Batch 2 commit. |

No current demo/Testnet rails, custody sweep helpers, settlement helpers, external payout experiment modules, operator smoke tooling, or Soroban event-contract baseline were removed.

## Dependency Vulnerability Disposition

| Package | Severity before fix | Path | Runtime reachability | Fix | Change type | Action |
|---|---:|---|---|---|---|---|
| `axios` | High | Transitive through `@stellar/stellar-sdk` | Runtime Stellar/Testnet helper dependency | `@stellar/stellar-sdk@16.0.1` | Major SDK upgrade, locally validated | Upgraded and validated. |
| `@stellar/stellar-sdk` | High via `axios` | Direct dependency | Runtime Stellar/Testnet helper dependency | `16.0.1` | Major | Upgraded because it removed the production high-severity audit blocker. |
| `postcss` | Moderate | Transitive through `next` | Build/runtime framework dependency | `overrides.postcss=8.5.15` | Transitive override | Added narrow override and validated gates. |
| `next` | Moderate via `postcss` | Direct dependency | App framework | `postcss` override | Transitive remediation | No direct Next upgrade available in current installed major set during this cleanup. |

`npm audit --omit=dev --audit-level=high` passes locally after remediation. Major dev-tool updates (`@types/node`, `eslint`, `typescript`) were intentionally not applied in this cleanup batch.

## Warning Disposition

The demo production build still emits a `Buffer()` deprecation warning from transitive Stellar SDK StrKey validation code. First-party code was not identified as the source. The warning is documented rather than hidden.

Soroban Clippy now runs with `-D warnings`. Remaining contract allowances are narrow and documented around explicit ABI argument shape and deprecated Soroban event APIs that should be changed only during a contract-interface migration.

## Local Quality Gates

Frozen local validation after the final code and documentation edit:

| Gate | Result |
|---|---|
| `cd web && npm ci` | Pass; 431 packages installed, 0 vulnerabilities. |
| `cd web && npm run test` | Pass; 72 files, 773 tests. |
| `cd web && npm run lint` | Pass. |
| `cd web && npm run typecheck` | Pass. |
| `NEXT_PUBLIC_RUNTIME_MODE=demo npm run build` | Pass; 17 app routes generated. Transitive `Buffer()` warnings remain documented. |
| `cd web && npm audit --omit=dev` | Pass; 0 vulnerabilities. |
| `cd web && npm audit --omit=dev --audit-level=high` | Pass; 0 vulnerabilities. |
| `cd contracts/settleway_escrow && cargo fmt --check` | Pass. |
| `cd contracts/settleway_escrow && cargo clippy --all-targets --all-features -- -D warnings` | Pass. |
| `cd contracts/settleway_escrow && cargo test --verbose` | Pass; 15 tests. |
| `cd contracts/settleway_escrow && cargo build --target wasm32v1-none --release --verbose` | Pass. |
| `git diff --check` | Pass; line-ending conversion warnings only. |

Safe secret scan disposition:

- `SECRET_SEED` appears as env-var names and archived Testnet identity documentation, not printed secret values.
- `SERVICE_ROLE` appears in `.env.example` placeholder naming.
- seed-phrase wording appears in no-secret policy text and archived operator docs.
- Stellar-shaped strings appear in tests as synthetic public-key/address fixtures.

## Candidate Remote CI

Pending candidate push and GitHub-hosted verification.

## Main Promotion Evidence

Pending. `main` must not be promoted until candidate Web CI and Soroban Contract CI are green.

## Tag And Branch Cleanup Evidence

Pending final green `main`.

## Remaining Product Work

- Production custody contract is not implemented.
- Real QRIS, bank transfer, fiat anchor payout, KYC/KYB, and production key-management operations are not implemented.
- Testnet demo rails remain proof infrastructure, not production financial custody.

## History Safety

No force-push, public history rewrite, live Testnet mutation, secret exposure, or unsafe audit fix is authorized or required for this batch.
