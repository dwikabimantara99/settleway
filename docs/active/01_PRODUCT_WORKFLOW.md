# Settleway Product Workflow

## 1. Discovery

Users enter through either:

- Buy: agricultural products listed by sellers.
- Sell: buyer requests posted by buyers.

Discovery pages show commodity, location, volume, price, counterparty reputation, and a path into offer submission.

## 2. Submit Offer

`Submit Offer` starts a recorded negotiation and commercial terms draft. It must not open the active Deal Room directly.

The offer contains:

- commodity;
- volume;
- price per kg;
- delivery deadline;
- terms note;
- counterparty context.

## 3. Recorded Negotiation

Buyer and seller exchange messages before funds move. This conversation is retained as dispute context and evidence support.

## 4. Agreed Terms

Both parties must accept the commercial baseline before the room can advance. After terms are agreed, the conversation becomes reviewable history rather than a mutable contract surface.

## 5. Mutual Open Deal Room

The Deal Room opens only after both parties confirm commitment. One click is a signal. The second confirmation activates the protected room and starts the funding window.

## 6. Funding Gate

Buyer funds principal, buyer bond, and buyer fee. Seller funds seller bond and seller fee.

If only one side funds before expiry, the funded side is refunded in full and the missing side receives a reputation penalty.

## 7. Escrow Lock

When both sides fund, the room locks and the lock is recorded through the Stellar trust layer.

## 8. Delivery And Proof

The seller submits delivery evidence. The MVP records hashes and metadata; raw files remain off-chain.

## 9. Completion Or Failure

The happy path ends when the buyer accepts delivery. Failure paths remain constrained to expiry, refund, cancellation, or future operator-reviewed dispute logic.

## 10. Reputation

Reputation updates from verified outcomes, funding discipline, completed volume, refund/expiry behavior, and proof-backed transaction history.
