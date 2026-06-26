# Current Handoff

## Current Candidate

- Current canonical `main`: `2654530d3a5fd2c195d5c68c6e0f324fc9a51f55`
- Accepted checkpoint tag: `v0.3.0-soroban-custody-v2.1`
- Completed custody milestone branch: `work/soroban-custody-v2` was deleted after promotion.
- Active work branch: `work/custody-v2-app-integration`

## Current Task Boundary

Custody V2.1 is accepted as an isolated Testnet contract milestone. The first application integration vertical slice is implemented on the active branch: wallet-signed Custody V2 success and funding-expiry corridors from the Deal Room, backed by direct contract reads and raw RPC event ingestion.

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

Continue review on `work/custody-v2-app-integration`. Current code adds canonical terms, `custody_v2_testnet` rail, repository persistence, Supabase migration, wallet-signed prepare/submit/confirm API routes, Deal Room action wiring, direct contract-state reads, raw RPC event polling/reconciliation, dedicated app Testnet deployment, and real application-layer success/funding-expiry proofs. Remaining acceptance items are full local gates, remote CI, branch push, and manual browser Freighter proof. Stop for architecture, security, and product review before any `main` promotion.
