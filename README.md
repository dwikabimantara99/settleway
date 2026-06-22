# Settleway

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
- Outcome-backed profile and reputation surfaces.
- Demo/operator role switching kept out of the primary public UI.
- Repository abstraction for demo/mock mode and persistent Supabase mode.
- Stellar Testnet-oriented proof infrastructure for funding, custody sweep, proof, settlement, and external payout experiments.
- Soroban event-contract baseline for escrow state and proof events.

## Honest Implementation Boundary

The current repository is hackathon/demo-ready infrastructure, not production financial custody.

Implemented or demonstrable:

- deterministic app state transitions;
- local/demo repository mode;
- persistent-mode boundary that fails closed without Supabase config;
- Stellar Testnet proof and transaction-reference modules;
- managed demo-role Testnet rails;
- event-contract Soroban baseline;
- simulated local-bank UX copy where applicable.

Not production-ready yet:

- real QRIS;
- real bank transfer;
- real fiat anchor payout;
- real KYC/KYB;
- production custody;
- full trustless token escrow contract;
- automated dispute adjudication;
- production key-management operations.

## Why Stellar Matters

Stellar is used as a verifiable trust layer, not as a user-facing crypto dashboard. The product needs inspection points for funding, lock, proof, refund, settlement, and reputation-supporting transaction history while keeping ordinary user flows simple.

Current Stellar-related modules are intentionally labeled as Testnet proof, demo-managed, or legacy bridge where they do not yet represent final custody architecture.

## Architecture Overview

- `web/` - Next.js App Router application, route handlers, UI, repository adapters, state machine, evidence, reputation, Stellar/Testnet integration helpers.
- `contracts/settleway_escrow/` - Soroban Rust contract baseline for escrow state and event/proof recording.
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
cd contracts/settleway_escrow
cargo fmt --check
cargo test --verbose
cargo build --target wasm32v1-none --release --verbose
```

`cargo clippy` is recommended when the local toolchain has the component installed.

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

Historical documents remain available in `docs/archive/` but are not active source of truth when they conflict with `docs/active/`.

## Branch Policy

After Macro Batch 2 review, the intended policy is:

```text
main = protected canonical product branch
work/<milestone> = short-lived implementation branch
cleanup/<milestone> = bounded repository maintenance branch
one coherent milestone per branch
merge only after gates pass
no force-push to main
delete phase branches only after tags and review
```

Macro Batch 1 creates and pushes a candidate branch only. It does not modify `main`.
