# 08 - Escrow State Machine

## Status list

```text
WAITING_DEPOSITS
BUYER_FUNDED
SELLER_FUNDED
LOCKED
PROOF_SUBMITTED
DELIVERED
ACCEPTED
COMPLETED
EXPIRED
REFUNDED
CANCELLED
```

## State transition table

| Current | Action | Actor | Next | Notes |
|---|---|---|---|---|
| WAITING_DEPOSITS | buyer_deposit | buyer | BUYER_FUNDED | buyer principal + bond + fee simulated |
| WAITING_DEPOSITS | seller_deposit | seller | SELLER_FUNDED | seller bond + fee simulated |
| BUYER_FUNDED | seller_deposit | seller | LOCKED | both deposits complete |
| SELLER_FUNDED | buyer_deposit | buyer | LOCKED | both deposits complete |
| WAITING_DEPOSITS | expire | system/operator | EXPIRED | before deposits |
| BUYER_FUNDED | expire | system/operator | REFUNDED | buyer refunded before locked |
| SELLER_FUNDED | expire | system/operator | REFUNDED | seller refunded before locked |
| LOCKED | submit_proof | seller | PROOF_SUBMITTED | proof hash created |
| PROOF_SUBMITTED | mark_delivered | seller | DELIVERED | delivery marked |
| DELIVERED | accept_delivery | buyer | COMPLETED | release success |
| LOCKED | cancel/refund | operator | REFUNDED | only basic demo flow |

## Completion money flow

On success:

- principal released to seller;
- buyer bond returned to buyer;
- seller bond returned to seller;
- service fees retained by platform;
- buyer and seller reputation updated.

## Before locked

Before locked, the transaction is not officially active. If a party fails to deposit, money already deposited is refunded and the failed party may receive a reputation event.

## After locked

After locked, service fees become non-refundable in product logic. Complex disputes are future scope.

## Invariants

- A completed deal cannot be mutated.
- A refunded deal cannot be completed.
- Proof cannot be submitted before locked.
- Delivery cannot be accepted before proof/delivery.
- Reputation update must happen once per final outcome.
