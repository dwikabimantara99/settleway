# Settleway Demo Operator Walkthrough

**Version:** Demo Hardening milestone — 2026-07-06
**Baseline commit:** `54864f1fcc5beae034b4d9858470920439905149`
**Checkpoint:** `checkpoint/constrained-failure-refund-expiry-2026-07-06`

---

## 1. Demo Purpose

This walkthrough is for an operator (founder, engineer, or investor-audience presenter) running the Settleway Testnet demo end-to-end.

Settleway is a B2B agricultural trade-assurance platform. The demo proves that the trust problem in commodity trade — payment risk, delivery risk, reputational opacity — can be addressed through:

- Recorded negotiation before money moves
- Mutual Deal Room commitment (both sides must agree)
- Profile Wallet deposits anchored on Stellar Testnet
- Delivery proof with a real Testnet transaction memo hash
- Deterministic settlement or honest failure classification

---

## 2. What This Demo Proves

| Claim | Evidence |
|---|---|
| Discovery is real | Marketplace listing + buyer request pages are fully functional |
| Negotiation is recorded before deposits | Offer negotiation thread with timestamped messages |
| Commitment is mutual | Both buyer AND seller must click "Open Deal Room" |
| Deposits are Testnet-confirmed | Profile Wallet signing → Stellar Testnet transaction → tx hash stored |
| Delivery proof is Testnet-anchored | Proof hash submitted as memo in a Stellar Testnet tx |
| Settlement is Testnet-confirmed | Accept-delivery triggers settlement corridor with on-chain tx |
| Failure states are deterministic | Funding expiry / proof expiry / rejection → local classification with honest labels |
| Reputation is outcome-derived | Scores update from verified events, not manual reviews |

---

## 3. What This Demo Does NOT Prove

| Claim | Reason |
|---|---|
| Real fiat/bank payment | Bank rails are not live. Profile Wallet uses Testnet XLM only. |
| Production custody | No mainnet assets, no production Supabase, no live custody. |
| Confirmed on-chain refund | `REFUND_PENDING` is a local classification. No refund sweep has been executed. |
| Automated dispute arbitration | `REVIEW_REQUIRED` and `DELIVERY_REJECTED` pause settlement. No AI judge exists. |
| Automatic seller penalization | Bond penalties are not confirmed unless a deterministic rule is explicitly modeled. |
| Remote database persistence | Demo uses `MockRepositoryAdapter` (in-memory). Data resets on server restart. |
| Applied remote Supabase migrations | Migration files exist but were not applied to a remote Supabase instance. |
| Mainnet Stellar | All Stellar activity is on the Testnet (`Test SDF Network ; September 2015`). |

---

## 4. Environment Assumptions

- Node.js ≥ 20
- `pnpm` or `npm` (project uses `npm`)
- Access to Stellar Testnet (public endpoint: `https://soroban-testnet.stellar.org`)
- Local-only: `NEXT_PUBLIC_RUNTIME_MODE=demo` (in-memory store, no external database required for basic demo)
- For Testnet deposit/settlement proof: Profile Wallet env variables must be configured (see §5)

---

## 5. Required Environment Variables Checklist

Copy `web/.env.example` → `web/.env.local`. Do NOT commit `.env.local`.

### Always required for demo mode:

```text
NEXT_PUBLIC_RUNTIME_MODE=demo
ENABLE_DEMO_RESET=true          # Only for local presenter use
```

### Required for Stellar Testnet corridors (Profile Wallet deposits, proof anchoring, settlement):

```text
NEXT_PUBLIC_CUSTODY_V2_ENABLED=true
NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID=<testnet contract address>
NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID=<testnet asset contract address>
NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS=<admin/platform address>
NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE=https://stellar.expert/explorer/testnet
CUSTODY_V2_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

### Required for server-side Profile Wallet signing:

```text
WALLET_ENCRYPTION_KEY=<32-byte hex key — never commit>
```

### Required for smoke/operator test scripts (optional for standard demo):

```text
SETTLEWAY_SMOKE_CONTRACT_ID=<same contract id as above>
SETTLEWAY_SMOKE_ADMIN_ADDRESS=<platform admin address>
SETTLEWAY_SMOKE_BUYER_DEMO_ADDRESS=<demo buyer wallet address>
SETTLEWAY_SMOKE_SELLER_DEMO_ADDRESS=<demo seller wallet address>
SETTLEWAY_SMOKE_ADMIN_KEY_ALIAS=<stellar-cli alias>
SETTLEWAY_SMOKE_BUYER_DEMO_KEY_ALIAS=<stellar-cli alias>
SETTLEWAY_SMOKE_SELLER_DEMO_KEY_ALIAS=<stellar-cli alias>
```

### Required ONLY for persistent (Supabase) mode — NOT needed for demo:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-only, never expose to client
```

> **Note:** Remote Supabase migrations have NOT been applied. If you switch to `persistent` mode, you must apply all migration files under `web/supabase/migrations/` to your Supabase project first (requires explicit human-approved step).

---

## 6. Local Startup Commands

```bash
# From the repo root:
cd web
npm ci
npm run dev
# App runs at http://localhost:3000
```

To reset demo state at any time:
```bash
# Visit /demo and click "Reset Demo State"
# OR call: POST http://localhost:3000/api/demo/reset
# Only works when ENABLE_DEMO_RESET=true
```

---

## 7. Testnet Readiness Checklist

Before attempting a live Stellar Testnet corridor:

- [ ] `WALLET_ENCRYPTION_KEY` is set in `.env.local`
- [ ] `NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID` is set to a deployed Testnet Soroban contract
- [ ] Demo buyer and seller wallets have Testnet XLM (use Stellar Friendbot if needed)
- [ ] Stellar Testnet RPC endpoint is reachable (`curl https://soroban-testnet.stellar.org`)
- [ ] Profile wallets are provisioned in the app (sign in as buyer, fund via `/profiles/<id>/wallet`)
- [ ] Testnet is not frozen or degraded (check `https://status.stellar.org`)

For a demo-mode-only run (no live Stellar transactions), the above is not required. The Profile Wallet UI will simulate Testnet responses in `mock_only` mode if the contract is not configured.

---

## 8. Demo Scenario Overview

**Story:** Surabaya Spice Co. (buyer) needs 700 kg of Red Chili from Probolinggo Farmer Group (seller).

**Commodity:** Red Chili (Bird's Eye Chili), 700 kg
**Deal value:** IDR 19,950,000
**Buyer total obligation:** IDR 21,047,250 (principal + bond + fee)
**Seller total obligation:** IDR 1,097,250 (bond + fee)

---

## 9. Happy Path — Step by Step

### Step 1 — Reset demo state
- Navigate to `/demo` (or type it directly — no nav link by design; this is operator-only)
- Click **Reset Demo State**
- Confirm: "Demo state reset successfully" appears
- This reseeds all profiles, listings, buyer requests, the demo offer, and demo deal

### Step 2 — Switch to buyer role
- The header shows the current mock actor
- By default: `buyer-surabaya-restaurant` (Surabaya Spice Co.)
- To switch roles: use the account menu → the `mock_actor` cookie controls identity

### Step 3 — Marketplace discovery
- Navigate to `/marketplace`
- Show the **Red Chili (Bird's Eye Chili)** listing from Probolinggo Farmer Group
- Click the listing to view `/marketplace/listing-cabai-001`
- **Expected UI:** Listing details, price, volume, seller profile link
- **Operator note:** "This is where a buyer finds supply. They can check the seller's reputation score before committing."

### Step 4 — Submit Offer
- On the listing detail page, click **Submit Offer**
- This creates an offer linked to the listing
- **Expected UI:** Offer form with commodity, volume, price pre-filled
- **API:** `POST /api/offers`

### Step 5 — Negotiation room
- Navigate to `/offers/offer-demo-cabai-001` (pre-seeded negotiation thread)
- Show the 3-message negotiation thread between buyer and seller
- **Expected UI:** Timestamped messages, agreed terms section, "Accept Terms" button for seller
- **Operator note:** "The negotiation is on record before either party is asked to deposit anything."

### Step 6 — Terms accepted
- Switch to seller role (change `mock_actor` cookie to `seller-probolinggo-cabai`)
- On the offer page, click **Accept Terms**
- Both sides then click **Open Deal Room**
- **Expected UI:** "Terms accepted" status, "Open Deal Room" CTA shown to both parties
- **API:** `POST /api/offers/{offerId}/open-deal-room`

### Step 7 — Deal Room opens
- Both parties must confirm Open Deal Room (mutual commitment)
- Redirects to `/deals/demo-cabai-001`
- **Expected UI:** Status = "Awaiting deposits" (StatusPill: orange)
- **Operator note:** "The protected room is now open. Neither party can unilaterally close it."

### Step 8 — Buyer deposit
- As buyer (`buyer-surabaya-restaurant`), in the Deal Room:
- The **Profile Wallet Funding Panel** shows the buyer's required amount
- Click **Fund from Profile Wallet**
- **Expected UI:** Status transitions to "Buyer funded" (StatusPill: blue)
- **API:** `POST /api/deals/{dealId}/buyer-deposit`
- **Testnet evidence:** Transaction hash stored in `latest_stellar_tx_hash`

### Step 9 — Seller deposit
- Switch to seller role
- In the Deal Room, the **Profile Wallet Funding Panel** shows the seller's bond + fee
- Click **Fund from Profile Wallet**
- **Expected UI:** Status transitions to "Escrow protected" (LOCKED, StatusPill: green)
- **API:** `POST /api/deals/{dealId}/seller-deposit`
- **Testnet evidence:** Second transaction hash; escrow is now locked on-chain

### Step 10 — Seller submits delivery proof
- As seller, in the Deal Room under "Escrow Actions":
- Upload or enter proof hash (mock metadata or real document hash)
- Click **Submit Delivery Proof**
- **Expected UI:** Status = "Evidence submitted" (StatusPill: stellar-blue)
- **API:** `POST /api/deals/{dealId}/submit-proof`
- **Testnet evidence:** Proof hash anchored as memo in Stellar Testnet transaction

### Step 11 — Verify proof on Testnet
- The Deal Room shows the `proof_hash` and the Testnet tx reference
- **Operator note:** Click the Stellar Explorer link to show the real Testnet transaction with the proof memo embedded.
- This is the `TESTNET_PROOF_HASH_ANCHORED` corridor.

### Step 12 — Buyer reviews and accepts
- Switch to buyer role
- In the Deal Room: "Evidence submitted — review proof and settle"
- Click **Review Proof & Settle** (accept-delivery button)
- **Expected UI:** Status = "Settled" (COMPLETED, StatusPill: green)
- **API:** `POST /api/deals/{dealId}/accept-delivery`
- **Testnet evidence:** Settlement transaction hash on Stellar Testnet

### Step 13 — Reputation updates
- Navigate to `/profiles/seller-probolinggo-cabai`
- Show that `seller_score` increased and `seller_completed_count` incremented
- Navigate to `/profiles/buyer-surabaya-restaurant` — `buyer_score` updated
- **Operator note:** "Reputation grows from verified outcomes. The counterparty didn't type a review — the system recorded the outcome."

---

## 10. Failure Path — Step by Step

The failure path demonstrates `LOCAL_FAILURE_CLASSIFICATION_ONLY`.

### Failure Scenario A — Funding expiry (one-sided)

1. Reset demo state (`/demo`)
2. As buyer, fund the deal (`POST /api/deals/{dealId}/buyer-deposit`) → status: `BUYER_FUNDED`
3. Do not fund as seller
4. Trigger funding expiry: `POST /api/deals/{dealId}/expire` (operator-triggered, API-only)
5. **Expected UI:** Status = "Refund Pending" (StatusPill: grey)
6. **Expected timeline copy:** "Funding window closed before full lock. A local refund classification has been recorded, pending future withdrawal execution."
7. **Classification:** `LOCAL_FAILURE_CLASSIFICATION_ONLY` — no confirmed on-chain refund transfer

### Failure Scenario B — Proof expiry (seller missed deadline)

1. Reset demo state, complete both deposits (status: `LOCKED`)
2. Trigger proof expiry: `POST /api/deals/{dealId}/expire-proof` (operator-triggered, API-only)
3. **Expected UI:** Status = "Manual Review" (REVIEW_REQUIRED, StatusPill: amber)
4. **Expected timeline copy:** "An anomaly occurred or a deadline was missed. Settlement is paused for review."
5. **Classification:** `LOCAL_FAILURE_CLASSIFICATION_ONLY` — settlement paused, no automatic arbitration

### Failure Scenario C — Buyer rejects delivery

1. Reset, complete deposits, seller submits proof (status: `PROOF_SUBMITTED`)
2. As buyer, click **Reject Delivery** in the Deal Room
3. Enter a rejection reason ("Quality does not match agreed terms")
4. Click **Confirm Rejection**
5. **Expected UI:** Status = "Delivery Rejected" (StatusPill: red)
6. **Expected timeline copy:** "The buyer rejected the delivery proof. Settlement is paused pending manual review or deterministic arbitration."
7. **Classification:** `LOCAL_FAILURE_CLASSIFICATION_ONLY` — no automatic seller penalization

---

## 11. Expected UI States at Each Step

| Step | DealStatus | StatusPill Label | Timeline Copy |
|---|---|---|---|
| Deal Room opened | WAITING_DEPOSITS | Awaiting deposits | Shows deposit panel for both parties |
| Buyer funded | BUYER_FUNDED | Buyer funded | Shows seller deposit panel |
| Seller funded | SELLER_FUNDED | Seller funded | Shows buyer deposit panel |
| Both funded | LOCKED | Escrow protected | "Escrow is locked. Submit your delivery proof." |
| Proof submitted | PROOF_SUBMITTED | Evidence submitted | "Proof submitted. Wait for seller to mark delivery milestone." |
| Delivery marked | DELIVERED | Buyer review | "Wait for the buyer to confirm receipt." |
| Accepted | COMPLETED | Settled | "Settlement completed. Reputation updated." |
| Funding expiry | REFUND_PENDING | Refund Pending | "Funding window closed. Local refund classification recorded." |
| Proof expiry | REVIEW_REQUIRED | Manual Review | "Deadline missed. Settlement paused for review." |
| Buyer rejection | DELIVERY_REJECTED | Delivery Rejected | "Buyer rejected delivery. Settlement paused." |

---

## 12. Expected API / Testnet Evidence

| Action | API Endpoint | Testnet Evidence |
|---|---|---|
| Buyer deposit | POST /api/deals/{dealId}/buyer-deposit | `latest_stellar_tx_hash` in deal record |
| Seller deposit | POST /api/deals/{dealId}/seller-deposit | Second tx hash; escrow locked |
| Submit proof | POST /api/deals/{dealId}/submit-proof | `proof_hash` in deal; Testnet tx memo |
| Accept delivery | POST /api/deals/{dealId}/accept-delivery | Settlement tx hash on Testnet |
| Expire funding | POST /api/deals/{dealId}/expire | Local state transition only (no confirmed Testnet refund) |
| Expire proof | POST /api/deals/{dealId}/expire-proof | Local state transition only |
| Reject delivery | POST /api/deals/{dealId}/reject-delivery | Local state transition only |

---

## 13. Expected Reputation Outcome

| Event | Effect |
|---|---|
| Both parties complete settlement | Buyer and seller scores increase; completed counts increment |
| One party fails to fund unilaterally | Non-depositing party receives a missed-deposit penalty |
| `DELIVERY_REJECTED` or `REVIEW_REQUIRED` | Reputation NOT automatically updated (deterministic policy not yet modeled for these paths) |

---

## 14. Known Demo Limitations

1. **In-memory persistence only.** Demo data resets on server restart. Supabase migration files exist but remote schema has NOT been applied.
2. **`REFUND_PENDING` is not `REFUNDED`.** The refund sweep execution step does not yet exist. The classification is local and projected.
3. **No automated dispute arbitration.** `REVIEW_REQUIRED` and `DELIVERY_REJECTED` require human or future rule-based resolution.
4. **Failure reputation policy is partial.** Only unilateral missed-deposit is deterministically penalized. Proof-expiry and rejection penalties are not yet modeled.
5. **Role switching is cookie-based.** The `mock_actor` cookie controls the simulated identity. In production, real auth replaces this.
6. **No bank/fiat rail.** The demo UI supports a "bank" rail concept but it is simulated. Only Profile Wallet (Stellar Testnet) is live.
7. **Profile Wallet requires funded Testnet addresses.** If Testnet XLM is depleted, use Stellar Friendbot: `curl https://friendbot.stellar.org?addr=<address>`
8. **`/demo` is not in the main nav.** This is by design (operator-only). Navigate directly to `/demo`.
9. **Offer and deal state gallery routes** (`/dev/deal-state-gallery`) are development-only. They are hidden from the main nav.

---

## 15. Troubleshooting Guide

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Deal stuck in WAITING_DEPOSITS | Profile Wallet not provisioned | Check `/profiles/<id>/wallet`; provision wallet first |
| Deposit returns 400 | Wallet has insufficient Testnet XLM | Friendbot the address |
| Submit proof fails | Deal not in LOCKED status | Ensure both deposits completed |
| Accept delivery fails | No `proof_hash` recorded | Ensure proof submission completed first |
| Demo state seems wrong | Old state from previous run | Click "Reset Demo State" on `/demo` |
| Testnet RPC timeout | Testnet endpoint slow or degraded | Check `https://status.stellar.org`; retry |
| `WALLET_ENCRYPTION_KEY` error | Env variable missing | Add to `.env.local` and restart dev server |
| Route returns 404 | Wrong demo IDs | Use IDs from §9: `offer-demo-cabai-001`, `demo-cabai-001` |

---

## 16. Reset / Retry Guidance

- **Full demo reset:** Navigate to `/demo` → click **Reset Demo State** → all store data reseeded
- **Individual deal state:** Cannot be partially reset without a full store reset in demo mode
- **Retry a corridor from mid-flow:** Reset first, then re-run from the relevant step
- **Testnet wallet state:** Testnet wallet balances are persistent on the Testnet blockchain — demo reset does NOT refund Testnet XLM

---

## 17. Exact Stop Point Before Deploy / Mainnet

**This demo stops at:**

- Stellar Testnet (not mainnet)
- Local in-memory storage (not remote Supabase)
- `http://localhost:3000` (not deployed to Vercel or any production host)

**Do not:**
- Run `vercel deploy` or any Vercel command
- Run `supabase db push`
- Change `NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE` to mainnet value
- Use real user funds or real contracts without explicit founder approval

**To promote to a real environment,** apply the Supabase migrations, provision production wallets, and update the network passphrase to mainnet — all requiring explicit human-approved steps not covered here.

---

## 18. Route Reachability Map

| Step | UI Entry Point | API Route | Accessible From Nav? |
|---|---|---|---|
| Marketplace | `/marketplace` | GET /api/listings | Yes (Buy) |
| Listing detail | `/marketplace/{listingId}` | GET /api/listings/{id} | Yes (from marketplace) |
| Buyer requests | `/buyer-requests` | GET /api/buyer-requests | Yes (Sell) |
| Buyer request detail | `/buyer-requests/{id}` | GET /api/buyer-requests/{id} | Yes (from buyer requests) |
| Submit offer | `/offers/new` | POST /api/offers | Yes (from listing/request detail) |
| Offer / negotiation | `/offers/{offerId}` | GET /api/offers/{id} | Via notifications or direct link |
| Deals list | `/deals` | GET /api/deals | Yes (Deals) |
| Deal Room | `/deals/{dealId}` | GET /api/deals/{id} | Yes (from deals list) |
| Profile | `/profiles/{userId}` | GET /api/profiles/{userId} | Yes (account menu) |
| Reputation | `/profiles/{userId}/reputation` | GET /api/profiles/{userId} | Yes (from profile) |
| Notifications | `/notifications` | GET /api/notifications | Yes (bell icon) |
| Demo cockpit | `/demo` | POST /api/demo/reset | **No nav link — type directly** |
| State gallery | `/dev/deal-state-gallery` | N/A (dev-only) | **No nav link — dev-only** |
| Design lab | `/dev/design-lab` | N/A (dev-only) | **No nav link — dev-only** |
| Failure: expire | — | POST /api/deals/{id}/expire | **API-only (operator-triggered)** |
| Failure: expire-proof | — | POST /api/deals/{id}/expire-proof | **API-only (operator-triggered)** |
| Failure: reject-delivery | `/deals/{dealId}` | POST /api/deals/{id}/reject-delivery | Yes (Reject Delivery button when PROOF_SUBMITTED/DELIVERED as buyer) |

---

_Last updated: 2026-07-06_
_Branch: feature/demo-hardening-operator-walkthrough_
_Classification: DEMO_WALKTHROUGH_READY_
