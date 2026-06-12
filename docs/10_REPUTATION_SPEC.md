# 10 - Reputation Specification

## Purpose

Settleway reputation is two-sided. Buyer behavior matters as much as seller behavior.

## Reputation contexts

Each profile has:

- seller reputation;
- buyer reputation;
- verified transaction volume;
- public/private proof preference.

## MVP reputation events

| Event | Seller delta | Buyer delta | Notes |
|---|---:|---:|---|
| transaction_completed | +10 | +10 | both completed fairly |
| buyer_failed_deposit | 0 | -3 | before locked |
| seller_failed_deposit | -3 | 0 | before locked |
| refunded_before_locked | 0 | 0 | neutral if not faulted |
| verified_harvest_failure | -1 | 0 | future pre-harvest nuance |

## Completion update

When a transaction completes:

- increment seller completed count;
- increment buyer completed count;
- increase verified volume for both;
- add reputation event with deal ID and tx hash if public.

## Privacy-controlled proof

If `proof_visibility = public`, show transaction hashes on profile. If private, show aggregate reputation only.

## Anti-pattern

Do not create a fake five-star review system as the primary reputation mechanism. Reputation must come from transaction outcomes.
