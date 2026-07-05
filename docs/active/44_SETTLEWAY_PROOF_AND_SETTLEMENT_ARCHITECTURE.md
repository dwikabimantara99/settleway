# Settleway Proof and Settlement Architecture

## Seller Proof & Evidence Architecture

Verifiable evidence is central to Settleway's trust model. Storing raw files (images, videos, PDFs) directly on-chain is prohibitively expensive and technically infeasible on Stellar/Soroban. Settleway employs an **Evidence Package** model.

### The Evidence Pipeline

1. **Off-Chain Storage**: When a seller uploads proof of delivery (e.g., product photos, logistics receipts), the raw files are stored off-chain in Settleway's object storage (e.g., Supabase Storage, or future IPFS integrations).
2. **Hash Generation**: The system computes a cryptographic hash (e.g., SHA-256) of each uploaded file.
3. **Metadata Assembly**: A JSON metadata object is created containing:
   - `product_photo_hash`
   - `product_video_hash` (optional)
   - `shipping_receipt_hash`
   - `metadata_hash` (covering descriptions/notes)
   - `timestamp`
   - `uploader_role` (seller)
   - `deal_id`
4. **Evidence Package Hash**: The entire JSON assembly is hashed to create a single `evidence_package_hash`.
5. **On-Chain Anchoring**: The `evidence_package_hash` is submitted to the Soroban Escrow Contract via the `SUBMIT_EVIDENCE` operation.

*Why this matters:* During a dispute, the platform (or an arbiter) can mathematically prove that the evidence presented in the UI exactly matches the evidence submitted at the time of delivery, preventing post-facto tampering.

## Buyer Acceptance as a Settlement Trigger

Buyer acceptance is the most critical state transition in the escrow lifecycle. It is not merely a UI flag—it is the cryptographic trigger for fund release.

### Target Flow

1. **Buyer Reviews Evidence**: Buyer inspects the off-chain files referenced by the on-chain `evidence_package_hash`.
2. **Buyer Clicks 'Accept'**: Buyer clicks "Accept Delivery".
3. **Intent Recorded**: The application records the buyer's acceptance intent (`ACCEPT_DELIVERY`).
4. **On-Chain Settlement**: The backend (via the service-role admin writer) submits the final transaction to the Soroban Escrow Contract.
5. **Funds Distributed**: The smart contract executes the settlement formula, instantly unlocking and transferring the assets.
6. **State Projection**: The local database and reputation systems update to reflect the `COMPLETED` state.

*(Current Implementation Note: The frontend UI exists, and the backend state transitions to `COMPLETED`, but full automated on-chain Soroban distribution logic requires rigorous validation before mainnet deployment.)*

## Successful Settlement Formula

Upon successful buyer acceptance, the escrow contract distributes the locked funds deterministically.

### The Math

- **Settleway Platform Fee**: `0.5%` (Configurable)
- `fee = buyer_principal * 0.005`
- `seller_receives = buyer_principal - fee`
- `buyer_receives = buyer_bond`
- `seller_bond_returned = seller_bond`
- `settleway_receives = fee`

### Execution
The Soroban contract holds the ultimate authority over this distribution. The backend simply requests settlement; the contract enforces the math.

## Breach, Dispute, and Expiration

### 1. Pre-Lock Funding Failure (Expiration)
If the deal is opened but the funding deadline passes before both parties deposit their required bonds and principal:
- The deal transitions to `EXPIRED` (or `REFUNDED`).
- **Compliant Party**: Fully refunded. Receives no bond reward (the contract was never fully initialized).
- **Non-Funding Party**: Receives a reputation penalty on their Settleway Profile for failing to honor an agreed negotiation.

### 2. Post-Lock Breach / Dispute
If the deal is fully funded and locked, but a cancellation or dispute arises (e.g., failure to deliver, rejected quality):
- The `DISPUTED` state must be invoked (Currently marked as `MISSING` in the Flow Gap Matrix).
- Settlement follows explicit, deterministic rules enforced by the contract.
- The breaching party's bond is forfeited and may be split between the harmed party and the Settleway treasury.
- **AI Role**: AI may summarize the hashed chat logs and evidence package for context, but **AI must not be the final arbiter of fund movement**. Human or deterministic oracle resolution is required.
