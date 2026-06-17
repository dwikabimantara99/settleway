# 01 - Master PRD: Settleway Hackathon MVP

## 1. Purpose

This PRD defines the current product truth for the Settleway hackathon MVP after the founder-authorized rebuild direction.

The PRD is intentionally execution-oriented. It should guide future implementation toward a real, coherent MVP instead of preserving the older direct-to-Deal-Room flow.

## 2. MVP thesis

Most commodity marketplaces stop at discovery and informal chat. Settleway goes further by turning marketplace interest into a recorded negotiation, a mutual commitment gate, a protected Deal Room, evidence-backed execution, and reputation that updates from real transaction outcomes.

## 3. Primary user roles

### Seller

A farmer, supplier, farmer group, or stock-holding aggregator who can list agricultural commodities, negotiate offers, commit to opening the protected room, and complete a trade as seller.

### Buyer

A restaurant, distributor, factory, wholesaler, exporter, or food-business actor who can browse supply, create buyer requests, negotiate offers, commit to opening the protected room, and complete a trade as buyer.

### Demo operator

A hackathon presenter who switches between buyer and seller views without complex authentication.

### Admin/operator (limited MVP)

A minimal internal role used only for demo inspection, reset flows, and future dispute context. Do not build a full dispute court.

## 4. MVP features

### 4.1 Landing page

The landing page must explain:

- what Settleway is
- the problem in high-value agricultural trade
- why discovery alone is not enough
- how negotiation, commitment, escrow, proof, and reputation work together
- that the demo uses Stellar-backed trust references and simulated local-bank behavior where applicable

### 4.2 Marketplace listing

The app must show seller listings with commodity data, seller reputation, location, status, estimated volume, price, and CTA to continue into the offer path.

### 4.3 Buyer request

The app must show buyer demand posts. This proves Settleway is not just a seller listing board.

### 4.4 Profile pages

Profiles must show separate buyer and seller reputation plus outcome-backed trust signals.

### 4.5 Offer and negotiation layer

Before active escrow begins, the product must support:

- `Submit Offer`
- recorded negotiation chat
- counterpart notification
- mutual `Open Deal Room` commitment state

### 4.6 Deal Room

The Deal Room is the central MVP screen after mutual commitment activates it. It must display:

- deal title and commodity
- buyer and seller
- principal value
- buyer commitment bond
- seller performance bond
- buyer/seller service fee
- deposit status
- escrow status
- terms summary
- evidence/proof section
- timeline events
- Stellar transaction/contract/proof identifiers
- role-based action buttons

### 4.7 Simulated bank deposit

The user clicks a simulated payment path. The UI must explain that real bank transfer is not implemented in hackathon mode.

### 4.8 Escrow state machine

The app must implement deterministic status transitions once the protected room is active. The UI and backend must never show contradictory state.

### 4.9 Stellar/Soroban integration

Minimum mandatory integration is Stellar event-contract mode:

- funding milestone references
- escrow lock event
- proof hash event
- settlement, refund, cancellation, or expiry event

If time allows, deeper custody-like execution may be explored. Do not overclaim token custody before the full product flow works honestly.

### 4.10 Proof hash

Evidence files are stored off-chain. Their SHA-256 hash is submitted to the contract or event layer. The UI must show the proof hash or related trust reference.

### 4.11 Reputation

Buyer and seller reputation must update after transaction outcomes. Reputation must remain outcome-based rather than generic review text.

## 5. Explicit non-goals

Do not build these in MVP:

- real QRIS
- real bank transfer
- real virtual account
- real payout
- real KYC/KYB
- real insurance
- real logistics network
- real inspector network
- full dispute court
- full AI judge
- multi-sector marketplace
- real fiat-to-chain anchor
- production-grade custody

## 6. Core demo acceptance

A judge must be able to see this flow in 3-5 minutes:

1. Open landing page.
2. Browse the chili listing or relevant buyer request.
3. Review counterparty trust cues.
4. Click `Submit Offer`.
5. Explain or show recorded negotiation.
6. Show that both sides must click `Open Deal Room`.
7. Enter the active Deal Room after mutual commitment.
8. Simulate buyer deposit.
9. Simulate seller bond deposit.
10. Escrow becomes locked.
11. Upload or simulate evidence.
12. Record proof hash or trust reference.
13. Accept delivery.
14. Release/complete transaction.
15. View Stellar proof or transaction identifiers.
16. See buyer and seller reputation update.

## 7. Quality bar

The MVP is successful if the core flow is coherent, visually understandable, technically demonstrable, and honest about what is simulated.

A beautiful UI without a convincing commitment-to-settlement corridor is failure. A smart contract without a clear marketplace story is also failure.
