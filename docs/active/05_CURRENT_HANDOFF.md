# Current Handoff

## Current Branch / Baseline

- **Branch:** `feature/demo-hardening-operator-walkthrough`
- **Baseline commit (main):** `54864f1fcc5beae034b4d9858470920439905149`
- **Checkpoint:** `checkpoint/constrained-failure-refund-expiry-2026-07-06`

---

## Accepted Milestone Classifications (cumulative)

| Milestone | Classification |
|---|---|
| Profile Wallet Deposit | `REAL_TESTNET_CONFIRMED_DEPOSIT` |
| Settlement Execution | `REAL_TESTNET_CONFIRMED_SETTLEMENT` |
| Offer Negotiation & Deal Room Lifecycle | `OFFER_NEGOTIATION_DEAL_ROOM_LIFECYCLE_ACCEPTED` |
| Testnet Proof Anchoring | `TESTNET_PROOF_HASH_ANCHORED` |
| Constrained Failure / Refund / Expiry | `LOCAL_FAILURE_CLASSIFICATION_ONLY` |
| Demo Hardening & Operator Walkthrough | `DEMO_WALKTHROUGH_READY` |

---

## What Demo Hardening Changed

1. **Operator Walkthrough Doc created:** `docs/active/DEMO_OPERATOR_WALKTHROUGH.md`
   Full step-by-step instructions for happy path and failure path, environment checklist, route reachability map, troubleshooting, and explicit stop points before deploy/mainnet.

2. **Demo Hardening Tests added:** `web/src/lib/integration/demo-hardening.test.tsx`
   12 deterministic tests asserting:
   - All `DealStatus` values have correct, honest `StatusPill` labels
   - `REFUND_PENDING` is never shown as "Refunded" or any confirmed-refund language
   - No status renders forbidden labels (Mainnet, Production custody, AI decision, AgriTrust)
   - Demo data brand and role consistency (buyer/seller correctly assigned)
   - Demo quick-jump IDs are consistent with seeded MockStore data

3. **Route reachability documented:** Full table in operator walkthrough covering all 19 major flow steps, which routes are nav-accessible vs. API-only vs. dev-only.

4. **No new product scope added.** No new routes, no new architecture. Existing corridors unchanged.

---

## Operator Walkthrough Doc Path

```text
docs/active/DEMO_OPERATOR_WALKTHROUGH.md
```

---

## Happy Path Summary

```text
Marketplace → Listing → Submit Offer → Negotiation Thread → Terms Accepted →
Open Deal Room (mutual) → Buyer Profile Wallet Deposit → Seller Profile Wallet Deposit →
Escrow LOCKED → Seller Submits Delivery Proof → Proof Anchored on Testnet →
Buyer Accepts → Settlement → Reputation Update
```

## Failure Path Summary

```text
Failure A: Funding expiry (one-sided) → REFUND_PENDING (LOCAL_FAILURE_CLASSIFICATION_ONLY)
Failure B: Proof expiry (seller missed deadline) → REVIEW_REQUIRED (LOCAL_FAILURE_CLASSIFICATION_ONLY)
Failure C: Buyer rejection (after proof) → DELIVERY_REJECTED (LOCAL_FAILURE_CLASSIFICATION_ONLY)
```

---

## What Is Stellar Testnet Confirmed

- Buyer deposit transaction (`REAL_TESTNET_CONFIRMED_DEPOSIT`)
- Seller deposit transaction → escrow LOCKED on-chain
- Proof hash anchoring as Stellar Testnet memo (`TESTNET_PROOF_HASH_ANCHORED`)
- Settlement transaction upon buyer acceptance (`REAL_TESTNET_CONFIRMED_SETTLEMENT`)

## What Is Local Classification Only

- `REFUND_PENDING`: local state transition. No refund sweep has been executed. Not confirmed on-chain.
- `REVIEW_REQUIRED`: local state transition. Settlement paused. No automated arbitration.
- `DELIVERY_REJECTED`: local state transition. Settlement paused. No automatic seller penalization.
- Failure reputation policy (except unilateral missed deposit): not yet deterministically modeled.

---

## Remote Migration Status

**Not applied.** Migration files are present under `web/supabase/migrations/` but no `supabase db push` has been run. The product runs in `demo` mode using `MockRepositoryAdapter` (in-memory).

## Deployment Status

**Not deployed.** No Vercel commands. No production hosting. `http://localhost:3000` only.

---

## What Is Fully Functional (Demo Mode)

- Marketplace discovery (listings + buyer requests)
- Submit Offer from listing or buyer request
- Negotiation thread with timestamped messages
- Terms acceptance (mutual)
- Open Deal Room (mutual — both sides must confirm)
- Profile Wallet deposit (buyer and seller, Testnet XLM)
- Escrow lock after both parties fund
- Seller delivery proof submission + Testnet anchor
- Buyer review + acceptance + settlement execution
- Reputation score update on settlement
- Deterministic failure state classification (funding expiry, proof expiry, buyer rejection)
- Deal Room UI with honest state labels for all 14 `DealStatus` values

## What Is Mock / Demo Only

- In-memory store (`MockRepositoryAdapter`): data resets on server restart
- Bank/fiat payment rail: UI presents it but it is not live
- Role switching: `mock_actor` cookie (no real auth in demo mode)
- Failure sweep execution: `REFUND_PENDING` is a projected state, not a confirmed on-chain refund

## What Remains Partial

- Refund sweep execution step (future milestone: convert REFUND_PENDING → REFUNDED with real tx)
- Dispute arbitration / admin review panel for REVIEW_REQUIRED / DELIVERY_REJECTED
- Failure reputation policy for rejection and proof-expiry paths
- Remote Supabase schema application (requires explicit human-approved step)
- Real-time negotiation message subscriptions (currently polling/refresh)

---

## Next Recommended Milestone

**Refund Sweep Execution Corridor** — implement the actual withdrawal step that:
1. Takes a deal in `REFUND_PENDING` state
2. Executes a real Testnet transfer back to the depositing party
3. Records the tx hash as confirmed evidence
4. Transitions to `REFUNDED` with a verified on-chain reference

This would upgrade the failure classification from `LOCAL_FAILURE_CLASSIFICATION_ONLY` to `REAL_TESTNET_CONFIRMED_REFUND`.

## Explicit Non-Goals

- No mainnet
- No production custody
- No AI arbitration
- No real fiat payout
- No remote Supabase migration (requires separate explicit authorization)
- No Vercel deployment (requires separate explicit authorization)
