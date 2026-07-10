# Full Lifecycle, Settlement, and Reputation Runbook (Local Scaffold)

## Overview
This runbook describes the lifecycle of a Deal inside Settleway from creation to escrow locking, downstream execution (proof & delivery), automated settlement payouts, and reputation updates. 
**Note:** The proof, delivery, settlement, and reputation portions are currently implemented as a local scaffold/mock. True remote settlement payout is blocked by the contract interface, which does not yet support real on-chain token payouts.

## Lifecycle Phases

### 1. Creation and Escrow Locking (`CREATE_DEAL` -> `LOCKED`)
- **Deal Creation**: The buyer or seller creates a deal room with defined commodity terms, volume, and IDR principal.
- **Deposit Stage**: Both parties must deposit their performance bonds. The buyer deposits the full IDR principal (via a bridge like USDC) along with their required margin. The seller deposits their margin.
- **Verification**: The system uses `coordinateDealExecution` via Stellar hooks to verify `create_deal`, `buyer_deposit`, and `seller_deposit` operations.
- **LOCKED State**: When both deposits clear the contract limits, the escrow hits the `LOCKED` status. The seller is now authorized to physically transport the goods.

### 2. Delivery Proof (`LOCKED` -> `DELIVERED`)
- **Submit Proof**: The seller uploads a public proof of dispatch/delivery (e.g., manifest hash) to the deal room via `submit_proof`.
- **Mark Delivered**: The seller officially flags the escrow status to indicate arrival using `mark_delivered`.
- **On-Chain Reflection**: The Stellar escrow stores the proof hash but does not move funds yet.

### 3. Acceptance, Settlement & Completion (`DELIVERED` -> `COMPLETED`)
- **Accept Delivery**: The buyer inspects the goods. Upon satisfaction, they call `accept_delivery`.
- **Settlement Execution**: The escrow contract calls `accept_and_complete`, transitioning the state. **Blocked:** Real on-chain token payout transfers are not currently supported by the smart contract. Our headless hook currently mocks this behavior.
- **Deal Completion**: The local database state transitions to `COMPLETED`.

### 4. Reputation Engine & Crowdfunding Primitive
- **Reputation Aggregate Updates**: Once `COMPLETED`, the system triggers `processReputationOutcome`. Both parties receive incremented `completed_count` and reputation scores.
- **Verified Volume**: The seller's `verified_volume_idr` increments by the deal's principal.
- **Crowdfunding primitive (`isEligibleForCrowdfunding`)**:
  - Requires `seller_completed_count >= 10`.
  - Requires `verified_volume_idr >= 20,000 USD` (at 15,000 IDR/USD).
  - This mathematically proves the seller's capacity to execute at scale, gating access to crowdfunding liquidity.

## Executing the Flow in Headless Mode (Local Mock)
To run this sequence locally using the mocked headless hook (which bypasses real Testnet execution for post-LOCKED phases):

```bash
npm run smoke:persistent-testnet-full-lifecycle
```

*Note: You must have a configured `SUPABASE_SERVICE_ROLE_KEY`, DB URL, and valid `WALLET_ENCRYPTION_KEY` in your environment.*
