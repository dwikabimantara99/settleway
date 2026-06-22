# Settleway Product Constitution

## Product Identity

Settleway is a B2B agricultural trade-assurance platform for high-value commodity transactions. It combines marketplace discovery, recorded negotiation, bilateral commitment, escrow-style execution, Stellar-backed proof, delivery evidence, and outcome-based reputation.

Settleway is not a generic crypto wallet, generic marketplace checkout, or speculative escrow prototype.

## Canonical Workflow

```text
Marketplace or Buyer Request
-> Submit Offer
-> Recorded Negotiation
-> Both parties agree immutable commercial terms
-> Open Deal Room
-> Buyer principal + buyer commitment bond
-> Seller performance bond
-> Stellar-backed funding and settlement
-> Delivery evidence
-> Acceptance or constrained dispute resolution
-> Deterministic terminal outcome
-> Verifiable reputation
```

## Money Model

- Buyer principal: 100% of protected deal value.
- Buyer commitment bond: 5%.
- Seller performance bond: 5%.
- Buyer platform fee: 0.5%.
- Seller platform fee: 0.5%.

Before lock, any already-funded side receives a full refund when the counterparty misses the funding deadline. The non-funding side receives a reputation penalty. Bond slashing begins only after lock.

On successful completion, buyer bond returns to the buyer, seller principal and seller bond route to the seller, and platform fees route to Settleway.

## Blockchain Role

Stellar exists to create verifiable proof for funding, lock, evidence hash, settlement, refund, cancellation, and reputation-supporting transaction history. The blockchain layer should remain mostly invisible to ordinary users while remaining inspectable by judges, operators, and counterparties.

## Honesty Rules

Do not claim:

- real bank transfer;
- QRIS;
- real fiat custody;
- production custody;
- trustless token escrow;
- live KYC/KYB;
- automatic AI dispute judgment;
- production-grade settlement finality.

Claim only what the code, tests, and live evidence prove.

## AI Role

AI may summarize negotiation, chronology, and evidence context. AI must not decide guilt, fabricate evidence, or replace deterministic product rules.
