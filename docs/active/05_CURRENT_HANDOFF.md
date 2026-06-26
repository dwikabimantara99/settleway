# Current Handoff

## Current Candidate

- Current canonical `main`: `2654530d3a5fd2c195d5c68c6e0f324fc9a51f55`
- Accepted checkpoint tag: `v0.3.0-soroban-custody-v2.1`
- Completed custody milestone branch: `work/soroban-custody-v2` was deleted after promotion.
- Active work branch: `work/custody-v2-app-integration`

## Current Task Boundary

Custody V2.1 is accepted as an isolated Testnet contract milestone. The active task is now the first application integration vertical slice: wallet-signed Custody V2 success and funding-expiry corridors from the Deal Room.

## No-Touch Areas

- No frontend redesign.
- No contract redesign.
- No seller-breach, buyer-breach, mutual-cancellation, dispute, mediator-console, or reputation-projection UI.
- No production custody claims.
- No bank/QRIS/anchor/KYC/KYB implementation.
- No live secret exposure.
- No force-push or history rewrite.
- No merge into `main` during this integration batch.

## Current Operator Focus

Continue the application vertical slice on `work/custody-v2-app-integration`. Current code adds the canonical terms, `custody_v2_testnet` rail, repository persistence, Supabase migration, wallet-signed prepare/submit/confirm API routes, Deal Room action wiring, and normalized event ingestion. Remaining acceptance blockers are dedicated app Testnet deployment, direct contract-state reads, full RPC event polling/reconciliation, real success proof, real funding-expiry proof, browser Freighter proof, full local gates, remote CI, and branch push. Stop for architecture, security, and product review before any `main` promotion.
