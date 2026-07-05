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

## How the lifecycle connects to existing Profile Wallet funding flow

- The `performOpenDealRoomCommitment` helper uses `buildDealFromOffer`, which explicitly sets `rail_version: 'managed_custody_testnet'`.
- The `managed_custody_testnet` mode triggers the Profile Wallet components (`ManagedCustodyActionPanel`) when entering the Deal Room, which securely executes transactions via the server-side Stellar service.

## What remains partial

- Dispute & Mediation triggers remain simplified and do not capture granular evidentiary assertions in the Offer phase.

## What next macro-batch should be

- **Automated Dispute Mediation triggers**: The settlement corridor remains strictly verified, but automated dispute resolution limits have not been fully expanded.
- **Payout Integration**: The payout destination mapping exists, but automated release of testnet assets back to external wallets requires further integration.
