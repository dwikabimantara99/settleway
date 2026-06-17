# 00 - Product Blueprint: Settleway

## Product identity

**Settleway** is a marketplace and trust infrastructure for high-value agricultural commodity transactions. It connects farmers, suppliers, stock-holding aggregators, distributors, restaurants, factories, wholesalers, exporters, and food-business buyers in a workflow that is safer, more disciplined, and more verifiable than informal trade.

Tagline: **The Safer Way to Settle Real-World Trade**

## Narrative foundation

Settleway is not only an escrow application and not only a marketplace. It is a product that begins with discovery, then adds negotiation, mutual commitment, protected execution, evidence continuity, and outcome-based reputation.

The difference between Settleway and an ordinary marketplace is the trust layer. Ordinary marketplaces can help buyer and seller discover each other, but the risk remains after discovery. Buyer fears the seller does not really hold the goods, quality is wrong, or delivery never happens. Seller fears the buyer does not pay, cancels unfairly, delays confirmation, or abuses disputes.

Settleway addresses two connected problems.

First, many agricultural actors have real goods, real land, real stock, or real harvest estimates, but weak market access outside closed local networks.

Second, when a new buyer and seller meet, trust is still fragile. High-value commodity transactions cannot rely only on informal chat and promises. They need recorded negotiation, mutual commitment, structured deposits, proof, and reputation.

## Canonical product corridor

The founder-authorized Settleway story is:

```text
Marketplace or buyer request
-> Submit Offer
-> negotiation chat
-> mutual Open Deal Room
-> deposit window
-> escrow locked on Stellar
-> active Deal Room with chat and evidence
-> success or dispute outcome
-> reputation accumulation from verifiable transaction history
```

### Commitment gate

`Open Deal Room` is a mutual commitment gate, not a navigation shortcut.

- one side may signal intent first
- the counterpart receives a notification
- the protected room becomes active only after both sides click `Open Deal Room`
- deposit begins only after that mutual commitment is complete

## Core product formula

Settleway = Marketplace + Buyer Request + Recorded Negotiation + Mutual Open Deal Room + Two-Sided Deposit Escrow + Stellar/Soroban Trust Trail + Proof Hash + Evidence Continuity + Two-sided Reputation

## Core demo story

A chili seller in Probolinggo lists 700 kg of red chili. A restaurant buyer in Surabaya opens the listing and submits an offer. Buyer and seller negotiate in a recorded thread. After they both click `Open Deal Room`, the protected room becomes active. The buyer funds principal, buyer bond, and service fee. The seller funds a performance bond and service fee. The escrow reaches locked state. The seller uploads evidence. Settleway hashes the evidence and records the trust reference on Stellar. The buyer accepts delivery. Settlement closes and both reputations update from the recorded outcome.

## Escrow and money logic

The canonical demo money model is:

- buyer principal: `100%` of deal value
- buyer commitment bond: `5%`
- seller performance bond: `5%`
- buyer service fee: `0.5%`
- seller service fee: `0.5%`

Before lock:

- if only one side funds, that side receives a full refund
- the non-funding side receives a reputation penalty
- no compensatory slashing happens before lock

After lock:

- both bonds remain protected during execution
- success returns both bonds, routes principal to the seller, and routes fees to Settleway
- cancellation or clear fault can lead to refund, compensation, or penalty logic according to active room rules

## Dual-rail user experience

Settleway is designed around two user-facing rails:

- `local bank` rail for a Web2-simple experience
- `crypto wallet` rail for direct on-chain participants

Regardless of which rail the user experiences, the trust layer converges on Stellar-backed escrow and outcome proof.

## Stellar and Soroban role

Stellar/Soroban exists to provide a verifiable trust trail for:

- escrow lock proof
- settlement proof
- refund or cancellation proof
- evidence hash proof
- reputation-supporting transaction history

Blockchain must support the marketplace story, not replace it. The blockchain layer should remain mostly invisible to ordinary users. Users should see clear negotiation, Deal Room status, evidence, and reputation. Judges and operators can inspect transaction hashes, proof hashes, contract references, and sync state when needed.

The MVP is non-custodial. It uses simulated off-chain balances and trust references unless real custody is actually implemented and proven. Do not claim real bank transfer, real QRIS, real payout, real KYC/KYB, production custody, or real token custody unless the implementation truly provides it.

## Reputation principle

Reputation is two-sided and outcome-based.

Buyer behavior matters as much as seller behavior. Reputation should come from transaction outcomes, verified volume, funding discipline, and related trust events, not a generic five-star review layer.

## AI role

AI is a support tool, not a judge.

AI may help summarize:

- negotiation chat
- Deal Room chronology
- evidence context for operator review

AI must not silently decide guilt, fabricate evidence, or replace accountable product rules.

## Principles

- Marketplace discovery comes first; trust work starts after discovery.
- Negotiation should be recorded before money moves.
- Deal Room is the formal transaction center, but not the first state in the corridor.
- Buyer and seller both carry risk, so both must show commitment.
- Blockchain should stay mostly invisible for usability but verifiable when trust is tested.
- Reputation must come from real transaction events, not empty claims.
- The MVP must be honest about what is simulated and what is on-chain.
