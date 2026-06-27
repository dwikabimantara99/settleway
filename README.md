# Settleway

[![Web CI](https://github.com/dwikabimantara99/settleway/actions/workflows/web-ci.yml/badge.svg?branch=main)](https://github.com/dwikabimantara99/settleway/actions/workflows/web-ci.yml)
[![Soroban Contract CI](https://github.com/dwikabimantara99/settleway/actions/workflows/soroban-contract-ci.yml/badge.svg?branch=main)](https://github.com/dwikabimantara99/settleway/actions/workflows/soroban-contract-ci.yml)

Settleway is a B2B agricultural trade-assurance platform that turns commodity discovery into recorded negotiation, bilateral commitment, escrow-style execution, Stellar-backed proof, and outcome-based reputation.

## Product Thesis

Agricultural commodity trades often start in informal channels, but the trust problem begins after discovery. Buyers need confidence that goods, quality, delivery, and evidence are real. Sellers need confidence that buyers are serious, funded, and accountable. Settleway makes that corridor explicit.

The validated workflow is:

```text
Marketplace or Buyer Request
-> Submit Offer
-> Recorded Negotiation
-> Both parties agree commercial terms
-> Open Deal Room
-> Buyer principal + buyer commitment bond
-> Seller performance bond
-> Stellar-backed funding and settlement proof
-> Delivery evidence
-> Acceptance or constrained dispute path
-> Deterministic terminal outcome
-> Verifiable reputation
```

## What Exists Now

- Public landing page and Get Started modal.
- Buy and Sell marketplace discovery surfaces.
- Listing and buyer-request detail flows.
- Offer submission, recorded negotiation, agreed terms, notifications, and mutual Deal Room activation.
- Active Deal Room with funding, lock, evidence, delivery, settlement, refund, expiry, and reputation states.
- Aurora frontend direction with deterministic development-only Deal Room state coverage for final visual acceptance.
- Outcome-backed profile and reputation surfaces.
- Demo/operator role switching kept out of the primary public UI.
- Repository abstraction for demo/mock mode and persistent Supabase mode.
- Stellar Testnet-oriented proof infrastructure for funding, custody sweep, proof, settlement, and external payout experiments.
- Soroban event-contract baseline for escrow state and proof events.
- Isolated Soroban Custody V2.1 contract proof for real Testnet token custody, deterministic success settlement, funding expiry, seller breach, buyer breach, mutual cancellation, and constrained mediated resolution.
- Recovery-branch Custody V2 application corridor that creates a `custody_v2_testnet` Deal Room from the normal accepted-offer and mutual Open Deal Room flow, then exposes buyer `Create on Stellar` and seller acceptance readiness.

## Honest Implementation Boundary

The current repository is hackathon/demo-ready infrastructure with an isolated Testnet custody proof. It is not production financial custody.

Implemented or demonstrable:

- deterministic app state transitions;
- local/demo repository mode;
- persistent-mode boundary that fails closed without Supabase config;
- Stellar Testnet proof and transaction-reference modules;
- managed demo-role Testnet rails;
- event-contract Soroban baseline;
- isolated Soroban Custody V2.1 token custody contract on Stellar Testnet;
- V2.1 success, expiry, breach, cancellation, and mediated-resolution proof scenarios using native XLM SAC;
- simulated local-bank UX copy where applicable.

Not production-ready yet:

- real QRIS;
- real bank transfer;
- real fiat anchor payout;
- real KYC/KYB;
- production custody;
- complete app-integrated production custody;
- Custody V2 funding/evidence/settlement/reputation projection in the normal application corridor;
- externally audited or mainnet-ready token escrow;
- automated dispute adjudication;
- production key-management operations.

## Why Stellar Matters

Stellar is used as a verifiable trust layer, not as a user-facing crypto dashboard. The product needs inspection points for funding, lock, proof, refund, settlement, and reputation-supporting transaction history while keeping ordinary user flows simple.

Current Stellar-related modules are intentionally labeled as Testnet proof, demo-managed, or legacy bridge where they do not yet represent final custody architecture.

## Architecture Overview

- `web/` - Next.js App Router application, route handlers, UI, repository adapters, state machine, evidence, reputation, Stellar/Testnet integration helpers.
- `contracts/settleway_escrow/` - legacy Soroban Rust contract baseline for escrow state and event/proof recording.
- `contracts/trade_assurance_v2/` - isolated Soroban Custody V2.1 contract proof; not yet integrated into the application.
- `docs/active/` - current authoritative product, workflow, architecture, status, roadmap, handoff, and consolidation report.
- `docs/archive/` - historical phase plans, handoffs, acceptance reports, Testnet runbooks, and old prompts.
- `.github/workflows/` - CI gates for web and Soroban contract validation.

## Local Setup

Requirements:

- Node.js `24.15.0` or compatible current Node 24 runtime.
- npm `11.x`.
- Rust stable toolchain.
- `wasm32v1-none` Rust target for Soroban Wasm builds.
- Optional Stellar CLI `26.1.0` for local Testnet operator work.

Install web dependencies:

```powershell
cd web
npm ci
```

Use demo mode for local development and CI-like builds:

```powershell
$env:NEXT_PUBLIC_RUNTIME_MODE="demo"
npm run dev
```

Persistent mode requires Supabase configuration and intentionally fails closed if required values are absent.

## Environment Files

Use placeholders only in committed examples:

- `.env.example`
- `web/.env.example`

Never commit `.env`, `.env.local`, private keys, seed phrases, service-role keys, or managed-account secrets.

## Quality Gates

Web:

```powershell
cd web
npm ci
npm run test
npm run lint
npm run typecheck
$env:NEXT_PUBLIC_RUNTIME_MODE="demo"; npm run build
```

Contract:

```powershell
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --verbose
cargo build --workspace --target wasm32v1-none --release --locked --verbose
```

Security:

```powershell
cd web
npm audit --omit=dev --audit-level=high
```

## Demo Corridor

The hackathon demo should show:

1. Landing page.
2. Buy or Sell marketplace discovery.
3. Listing or buyer request detail.
4. Submit Offer.
5. Recorded negotiation and terms.
6. Counterparty acceptance.
7. Mutual Open Deal Room.
8. Buyer and seller funding.
9. Escrow lock and Stellar trust reference.
10. Delivery evidence and proof hash.
11. Buyer acceptance or constrained failure path.
12. Settlement/refund outcome and reputation update.

## Documentation

Start here:

- `docs/active/00_PRODUCT_CONSTITUTION.md`
- `docs/active/01_PRODUCT_WORKFLOW.md`
- `docs/active/02_SYSTEM_AND_STELLAR_ARCHITECTURE.md`
- `docs/active/03_CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/active/04_PRODUCTIZATION_ROADMAP.md`
- `docs/active/05_CURRENT_HANDOFF.md`
- `docs/active/06_MAIN_CONSOLIDATION_REPORT.md`
- `docs/active/07_MAIN_PROMOTION_REPORT.md`
- `docs/active/13_AURORA_FRONTEND_COMPLETION_REPORT.md`
- `docs/active/14_AURORA_FRONTEND_FINAL_ACCEPTANCE_REPORT.md`
- `docs/active/15_SOROBAN_CUSTODY_V2_SPEC.md`
- `docs/active/17_SOROBAN_CUSTODY_V2_1_POLICY_AND_LIVENESS_SPEC.md`
- `docs/active/18_SOROBAN_CUSTODY_V2_1_IMPLEMENTATION_REPORT.md`
- `docs/active/19_SOROBAN_CUSTODY_V2_1_FINAL_ACCEPTANCE_REPORT.md`
- `docs/active/30_CUSTODY_V2_STATE_TO_SCREEN_CONTRACT.md`
- `docs/active/31_CUSTODY_V2_SELECTIVE_SALVAGE_MANIFEST.md`
- `docs/active/32_RECOVERY_MILESTONE_1_IMPLEMENTATION_REPORT.md`
- `docs/active/33_RECOVERY_MILESTONE_1_BROWSER_ACCEPTANCE.md`

Historical documents remain available in `docs/archive/` but are not active source of truth when they conflict with `docs/active/`.

## Branch Policy

The intended branch policy is:

```text
main = protected canonical product branch
work/<milestone> = short-lived implementation branch
cleanup/<milestone> = bounded repository maintenance branch
one coherent milestone per branch
merge only after gates pass
no force-push to main
delete obsolete branches only after tags and green main verification
```
