# Settleway Submission Evidence Pack

## 1. Executive Summary

Settleway is an agricultural B2B marketplace and Deal Room trust layer that ensures secure and verifiable commodity trade between buyers and sellers. It provides a deterministic mutual state machine wrapped in a rich web platform. By leveraging a persistent Testnet proof corridor, Settleway successfully coordinates Stellar-backed funds, locking both buyer principal and two-sided performance bonds deterministically inside a smart contract without manual intervention.

## 2. Proven Testnet Funding Corridor

- **Commit SHA:** f6c72b0
- **Checkpoint Tag:** checkpoint/remote-funding-smoke-succeeded-2026-07-09
- **Classification:** REMOTE_FUNDING_SMOKE_SUCCEEDED
- **Final Status:** LOCKED
- **Transaction Hashes:**
  - `create_deal`: 15d18a03847cc2e5a9dca27a34b1bd07be21e982b180c81fcf77a14966490e94
  - `buyer_deposit`: 40b0165791700cd74280724e4aa5516ef140d02da039370fb5bae0af38b3b9b4
  - `seller_deposit`: 4e71afa5676bfde5e2df43c600c21a64ebfb149d9ea58a791924ac471c47b06b

## 3. What the Smoke Test Proves

This persistent execution proves:
- End-to-end profile creation for remote testnet actors.
- Managed server-side wallet provisioning.
- Programmatic Friendbot Testnet funding for generated public addresses.
- Persistent Supabase writes bypassing strict Row-Level Security (RLS) via an admin context for the headless smoke runner.
- Successful operation persistence within the `stellar_operations` table mapping to idempotent keys.
- Escrow event persistence accurately tracking the state machine transitions.
- Successful buyer funding locking funds to the escrow.
- Successful seller funding locking funds to the escrow.
- Deterministic final `LOCKED` state achievement.

## 4. What Remains Out of Scope / Unproven

- `submit_proof` (Delivery Evidence Submission)
- `accept_delivery` (Buyer Acceptance)
- Settlement / Payout hooks (Seller Payout + Fee Settlement)
- Reputation logging module
- Production custody orchestration
- Stellar Mainnet interactions
- Real money (Fiat/Stablecoin) integration
- KYC / KYB / Banking / Logistics integrations

## 5. Demo Narrative

**Duration:** ~3–5 Minutes

"Welcome to Settleway. Today, we're going to look at how agricultural B2B trade becomes deterministic and trustless. Let's start the journey with our farmer, the seller, who lists a batch of premium commodities on the Settleway marketplace. Soon after, a verified buyer discovers this supply and submits an offer. After standard negotiations, both parties agree to the terms, and they mutually open a Deal Room.

Here is where the magic happens. The Deal Room requires both the buyer and the seller to put skin in the game. The buyer funds the principal and their performance bond, and the seller funds their respective performance bond. Using Settleway's managed wallets, both parties execute their funding. As you can see by the transaction evidence provided by the Stellar Testnet, these funds are locked trustlessly in a Settleway escrow contract. 

With both deposits verified and mathematically proven on the ledger, the Deal Room status securely updates to `LOCKED`. The funds are safe. While the next steps—submitting proof of delivery, buyer acceptance, and final settlement payout—are slated for our immediate next extension phase, this funding corridor proves Settleway's core architectural thesis: we can successfully bridge marketplace intent with cryptographic ledger settlement."

## 6. Judge-Friendly Technical Notes

- **Next.js App Router:** Built using a modern React framework for the frontend and API layers.
- **Supabase Persistent DB:** Relies on robust Postgres, extensive RLS policies, and server-side service-role admin contexts for headless automation.
- **Stellar Testnet:** Deploys Soroban smart contracts on the Testnet to guarantee isolation and verifiability.
- **Soroban / Testnet Operation Evidence:** Each state transition produces a reproducible transaction hash proving the local relational state matches the on-chain reality.
- **Managed Profile Wallet Model:** Wallets are programmatically provisioned and tied to user profiles for seamless onboarding.
- **Two-Sided Deposit / Bond Intent:** The escrow inherently requires dual participation, enforcing a mathematically balanced performance bond structure.
- **Zero Real-World Exposure:** Absolutely no Mainnet transactions or production funds were used or authorized during this build.

## 7. Operator Reproduction Summary

To reproduce this evidence, an operator must run the headless persistent smoke test.
- **Correct Command:** `npm run smoke:persistent-testnet`
- **Required Mode:** persistent
- **Required Safety Gate:** `ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1`
- **Required Node Option:** `NODE_OPTIONS=--conditions react-server`
- **Security Warning:** The Database password (`SUPABASE_DB_PASSWORD`) must be rotated after any run to preserve environment security.

## 8. Submission Risk Statement

**Honesty Declaration:** The Settleway dual-funding escrow corridor is fully proven and mathematically verified against the Stellar Testnet. However, the complete downstream lifecycle—specifically delivery proof submission, delivery acceptance, and automated payout settlement—is not yet proven and is still pending extension. Demonstrations will strictly claim what has been evidenced by the provided transaction hashes up to the `LOCKED` state.
