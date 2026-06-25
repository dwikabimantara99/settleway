# Settleway Soroban Custody V2.1 Policy and Liveness Spec

Status: active implementation specification  
Branch: `work/soroban-custody-v2`  
Scope: isolated `contracts/trade_assurance_v2` contract only

## Purpose

Custody V2.1 hardens the isolated Soroban custody proof before application integration. V2.0 proved bilateral funding, success settlement, and funding-expiry refund. V2.1 adds post-funding liveness, deterministic breach settlement, mutual cancellation, and constrained mediated dispute resolution.

This contract is still not wired into the Settleway application. The current production/demo app behavior remains unchanged until a later integration phase.

## Immutable Testnet Policy

- Accepted asset: configured once at initialization.
- Treasury: configured once at initialization.
- Policy version: `2`.
- Interface version: `2`.
- Success fee: `0` basis points for the Testnet proof.
- Seller breach treasury share: `2000` basis points.
- Buyer breach treasury share: `2000` basis points.

Basis point shares use integer floor division:

```text
treasury_share = floor(bond * bps / 10000)
harmed_counterparty_share = bond - treasury_share
```

This preserves exact token conservation even when division has a remainder.

## State Machine

```text
TermsPending
  -> AwaitingFunding
  -> Active
  -> EvidenceSubmitted
  -> SettledSuccess
```

Timeout and resolution paths:

```text
AwaitingFunding -> FundingExpired
Active -> SellerBreach
EvidenceSubmitted -> BuyerBreach
Active -> MutualCancellation
Active | EvidenceSubmitted -> Disputed
Disputed -> SettledSuccess | SellerBreach | BuyerBreach | MutualCancellation
```

Terminal states are irreversible:

- `SettledSuccess`
- `FundingExpired`
- `SellerBreach`
- `BuyerBreach`
- `MutualCancellation`

## Exact Deadline Semantics

Actions required before a deadline are valid only while:

```text
now < deadline
```

Timeouts become executable when:

```text
now >= deadline
```

This rule applies to funding, evidence submission, delivery expiry, acceptance, inspection expiry, and dispute opening.

## Settlement Outcomes

### Successful Settlement

- Principal: seller.
- Buyer bond: buyer.
- Seller bond: seller.
- Treasury: success fee only; `0` bps in the Testnet policy.

### Funding Expired

- Refund only amounts actually deposited.
- No reward goes to the compliant funder.
- Terminal outcome: `FundingExpired`.

### Seller Breach

Trigger:

- Seller does not submit evidence before delivery deadline; or
- mediator resolves against seller.

Distribution:

- Principal: buyer.
- Buyer bond: buyer.
- Seller bond: 80% buyer, 20% treasury.

### Buyer Breach

Trigger:

- Seller submitted evidence and buyer does not accept or dispute before inspection deadline; or
- mediator resolves against buyer.

Distribution:

- Principal: seller.
- Seller bond: seller.
- Buyer bond: 80% seller, 20% treasury.

### Mutual Cancellation

Rules:

- Only available in `Active`.
- Requires both buyer and seller approvals.
- No evidence may have been submitted.
- No active dispute.

Distribution:

- Principal: buyer.
- Buyer bond: buyer.
- Seller bond: seller.
- Treasury: zero.

### Dispute

Buyer or seller may raise a dispute from:

- `Active` before delivery deadline; or
- `EvidenceSubmitted` before inspection deadline.

The dispute freezes normal settlement, cancellation, and timeout paths. Only the immutable deal mediator can resolve it. Mediator outcomes are limited to:

- `SettledSuccess`
- `SellerBreach`
- `BuyerBreach`
- `MutualCancellation`

No arbitrary amount split and no arbitrary recipient exists in V2.1.

## Security Invariants

- No continuing admin role remains after initialization.
- Treasury cannot withdraw.
- Contract has no arbitrary recipient transfer function.
- Buyer, seller, mediator, treasury, asset, amounts, terms hash, and deadlines are immutable after deal creation.
- All fund-moving terminal paths use centralized checked-arithmetic distribution helpers.
- Every terminal distribution must conserve `principal + buyer_bond + seller_bond`.
- One terminal deal must not spend custody attributable to another still-open deal.
- Token transfer failure reverts the invocation.
- TTL extension remains active for config and deal records.

## Deferred Work

- Application/backend integration.
- Indexer and reputation projection from V2.1 events.
- Production fiat/anchor/QRIS rails.
- Production custody security review.
- Mediated partial split policy.
