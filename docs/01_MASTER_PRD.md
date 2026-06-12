# 01 - Master PRD: Settleway Hackathon MVP

## 1. Purpose

This PRD defines the exact product and engineering scope for building the Settleway hackathon MVP from an empty folder in Antigravity.

The PRD is intentionally execution-oriented. It should guide Gemini to build a real app in phases, not merely understand the product concept.

## 2. MVP thesis

Most commodity marketplaces stop at discovery and chat. Settleway goes further by turning marketplace interest into a formal Deal Room where both parties commit, escrow state is recorded, proof is hashed, settlement is visible, and reputation is updated from real transaction events.

## 3. Primary user roles

### Seller

A farmer, supplier, farmer group, or stock-holding aggregator who can list agricultural commodities and enter a Deal Room as seller.

### Buyer

A restaurant, distributor, factory, wholesaler, exporter, or food-business actor who can browse supply, create buyer requests, and enter a Deal Room as buyer.

### Demo operator

A hackathon presenter who switches between buyer and seller views without complex authentication.

### Admin/operator (limited MVP)

A minimal internal role used only for demo inspection and future dispute context. Do not build a full dispute court.

## 4. MVP features

### 4.1 Landing page

The landing page must explain:

- what Settleway is;
- the problem in high-value agricultural trade;
- why marketplace alone is not enough;
- how Deal Room + escrow + proof + reputation works;
- that the demo uses Stellar Testnet.

### 4.2 Marketplace listing

The app must show seller listings with commodity data, seller reputation, location, status, estimated volume, price, and CTA to create/view a deal.

### 4.3 Buyer request

The app must show buyer demand posts. This proves Settleway is not just a seller listing board.

### 4.4 Profile pages

Profiles must show separate buyer and seller reputation.

### 4.5 Deal Room

The Deal Room is the central MVP screen. It must display:

- deal title and commodity;
- buyer and seller;
- principal value;
- buyer commitment bond;
- seller performance bond;
- buyer/seller service fee;
- deposit status;
- escrow status;
- terms summary;
- evidence/proof section;
- timeline events;
- Stellar transaction/contract/proof identifiers;
- role-based action buttons.

### 4.6 Simulated bank deposit

The user clicks a simulated payment button. The UI must explain that real bank transfer is not implemented in hackathon mode.

### 4.7 Escrow state machine

The app must implement deterministic status transitions. The UI and backend must never show contradictory status.

### 4.8 Stellar/Soroban integration

Minimum mandatory integration is Stellar event-contract mode:

- create escrow event;
- buyer deposited event;
- seller deposited event;
- escrow locked event;
- proof hash event;
- settlement/release/refund/expiry event.

If time allows, upgrade to token custody mode using a token-compatible asset. Do not attempt token custody before the full UI/backend flow works.

### 4.9 Proof hash

Evidence files are stored off-chain. Their SHA-256 hash is submitted to the contract or event layer. UI must show the proof hash.

### 4.10 Reputation

Buyer and seller reputation must update after transaction outcomes.

## 5. Explicit non-goals

Do not build these in MVP:

- real QRIS;
- real bank transfer;
- real virtual account;
- real payout;
- real KYC/KYB;
- real insurance;
- real logistics network;
- real inspector network;
- full dispute court;
- full AI judge;
- multi-sector marketplace;
- real fiat-to-chain anchor;
- production-grade custody.

## 6. Core demo acceptance

A judge must be able to see this flow in 3-5 minutes:

1. Open landing page.
2. Browse chili listing.
3. Create/open Deal Room.
4. Simulate buyer deposit.
5. Simulate seller bond deposit.
6. Escrow becomes locked.
7. Upload or simulate evidence.
8. Record proof hash.
9. Accept delivery.
10. Release/complete transaction.
11. View Stellar proof/transaction identifiers.
12. See buyer and seller reputation update.

## 7. Quality bar

The MVP is successful if the core flow is coherent, visually understandable, technically demonstrable, and honest about what is simulated.

A beautiful UI without a working Deal Room is failure. A smart contract without a clear marketplace story is also failure.
