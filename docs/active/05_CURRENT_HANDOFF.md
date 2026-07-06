# Current Handoff

## Current Candidate

- Candidate branch: `feature/evidence-delivery-proof-corridor`
- Focus: Evidence Submission & Delivery Proof Corridor

## What was implemented

- A formal Supabase migration (`20260705_offer_negotiation_schema.sql`) for `offers`, `offer_messages`, and `notifications` including strict Row Level Security (RLS) policies.
- Exported strict TypeScript domain types for the aforementioned entities in `web/src/lib/types.ts`.
- Removed external WalletConnect (`ConnectExternalWalletButton`) dependencies from the Offer page and correctly injected the `ProfileWalletCard`.
- Wired the Deal Room creation logic to map into the `managed_custody_testnet` rail (Profile Wallet funding corridor).

## What is fully functional

- **Submit Offer**: Users can submit an offer from a listing or buyer request.
- **Negotiation Room**: Secure messaging thread between buyer and seller.
- **Terms Agreement**: Counterparty can accept terms to unblock the Deal Room.
- **Open Deal Room**: Both parties clicking "Open Deal Room" creates an idempotent Deal and redirects to the active escrow room.
- **Profile Wallet Corridor**: The Deal Room is instantiated on the Profile Wallet rail, allowing immediate Testnet funding without external Freighter signing.
- **Delivery Proof Submission**: Sellers can upload delivery evidence (or mock metadata) once the escrow is locked.
- **Testnet Proof Anchoring**: Submitted proof hashes are recorded as memos in a Testnet custody wallet reference transaction.
- **Strict Delivery Acceptance Gate**: The API completely prevents buyer acceptance (via `accept-delivery`) until a valid delivery proof has been submitted, enforcing an honest execution corridor.

## What is mock/demo-only

- Although Supabase types and adapters are strictly typed and ready, local development defaults to `MockRepositoryAdapter` per `runtimeMode === 'demo'`.
- Real-time websocket chat subscriptions for negotiation messages are not implemented; it relies on standard fetching/refresh for now.

## What is persistent/Supabase-ready

- The DB schemas (`offers`, `offer_messages`, `notifications`) are formalized in migrations and match the `supabase-adapter.ts` methods perfectly.
- All RLS policies for offers, messages, and notifications are implemented securely.

## What routes/components/models changed

- `web/src/app/offers/[offerId]/page.tsx` (Replaced external wallet binding with internal ProfileWalletCard)
- `web/src/lib/types.ts` (Added `Offer`, `OfferStatus`, `NegotiationMessage`, `Notification` domains)
- `web/supabase/migrations/20260705_offer_negotiation_schema.sql` (Added tables and RLS)
- `web/src/app/api/deals/[dealId]/accept-delivery/route.ts` (Enforced `proof_hash` presence for testnet deal acceptance)
- `web/src/components/deal/EscrowTimeline.tsx` and `DealActions.tsx` (Enhanced buyer UI cues for evidence review)
- `web/src/lib/integration/evidence-corridor.test.ts` (Added integration tests for proof submission and acceptance gating)

## Current Status (Phase 10 — Handoff)

We have successfully completed the implementation of the Constrained Failure / Refund / Expiry Path.
Final failure path classification: LOCAL_FAILURE_CLASSIFICATION_ONLY

1.  **Fixed Idempotency Key in Route Execution:** The `deal-room-route-execution.ts` was generating a new `operation_id` string for every route call (e.g. `route:deal-id:expire:timestamp`), which broke the ability for `planDealLocalCommit` to match the confirmation against the original submitted operation. It has been updated to use the idempotent `operationKey` created by `createStellarIdempotencyKey()`.
2.  **Fixed Execution Reducer Bug:** A bug was identified and fixed in `execution-reducer.ts` where it was unconditionally checking `result.action !== operation.requested_action` even during the `"submit"` phase where `result.action` does not exist (causing it to return `ERR_ACTION_MISMATCH`). We corrected it to only check `result.action` if it exists.
3.  **Mock Store Expansion:** Expanded the `MockStore` to explicitly whitelist `reject_delivery` and `expire_proof` in the `EscrowAction` list so that `replaceDealIfCurrent` permits these local transitions.
4.  **Integration Test Validation:** Updated the `failure-corridor.test.ts` to supply correct mock data matching the new `StellarAdapterSubmitResult` and `StellarAdapterConfirmationResult` signatures. The tests now pass with 100% success for all three paths:
    *   Expiry of one-sided funding to `REFUND_PENDING` (on-chain testnet mock).
    *   Expiry of `LOCKED` status by buyer moving deal to `REVIEW_REQUIRED` (local-only classification).
    *   Rejection of delivery proof by buyer moving deal to `DELIVERY_REJECTED` (local-only classification).

### Remaining Risks
- refund/penalty execution is not yet real confirmed Testnet settlement;
- REFUND_PENDING means pending/projected/manual/future execution, not confirmed refund;
- DELIVERY_REJECTED and REVIEW_REQUIRED pause settlement;
- failure reputation policy is only deterministic where explicitly modeled;
- remote Supabase migration was not applied;
- production custody/mainnet are out of scope.

## Next Steps

1.  Proceed with UI implementation or any remaining frontend tasks for Phase 10.
2.  Begin integration into `main` branch if all criteria for Phase 10 are met.

## How the lifecycle connects to existing Profile Wallet funding flow

- The `performOpenDealRoomCommitment` helper uses `buildDealFromOffer`, which explicitly sets `rail_version: 'managed_custody_testnet'`.
- The `managed_custody_testnet` mode triggers the Profile Wallet components (`ManagedCustodyActionPanel`) when entering the Deal Room, which securely executes transactions via the server-side Stellar service.

## What remains partial

- Dispute & Mediation triggers remain simplified and do not capture granular evidentiary assertions in the Offer phase.

## What next macro-batch should be

- **Automated Dispute Mediation triggers**: The settlement corridor remains strictly verified, but automated dispute resolution limits have not been fully expanded.
- **Payout Integration**: The payout destination mapping exists, but automated release of testnet assets back to external wallets requires further integration.
