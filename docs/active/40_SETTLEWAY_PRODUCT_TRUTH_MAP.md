# Settleway Product Truth Map

## Vision

Settleway is a **marketplace, negotiation, account-first managed wallet, and escrow trust workflow** for agricultural and B2B transactions. 

It is **not** merely a technical escrow prototype or a scattered wallet-connect demo. It is a cohesive trust platform.

## Core Product Workflow

1. **Marketplace Discovery**: Users browse and discover agricultural supply/demand listings.
2. **Submit Offer**: A buyer or seller signals purchasing/selling intent.
3. **Negotiation Room**: A recorded, isolated chat space opens.
4. **Agree on Terms**: Both parties discuss and lock in price, quantity, quality, delivery, deadlines, buyer bond, seller performance bond, and evidence expectations.
5. **Open Deal Room**: Escrow initialization begins.
6. **Wallet Funding**: Deposits occur from the user's *Settleway Profile Wallet*.
7. **Escrow Lock**: Funds shift into the *Soroban Escrow Contract*. Once both sides fund, the escrow is formally locked.
8. **Delivery & Proof**: Seller submits evidence (uploaded off-chain, hashed on-chain).
9. **Buyer Acceptance**: Buyer accepts delivery, triggering settlement.
10. **Settlement**: Escrow contract pays seller, returns bonds, and routes the Settleway fee to the platform.
11. **Reputation Update**: Positive (or negative) outcomes affect the user's public trust score.

## Intended Fee & Settlement Formula

The target settlement logic ensures fair risk distribution and platform monetization.

**Happy Path Settlement:**
- Settleway Fee = `Buyer Principal * 0.5%`
- Seller Receives = `Buyer Principal - Settleway Fee`
- Buyer Bond = Returned to Buyer
- Seller Bond = Returned to Seller
- Settleway Receives = `Settleway Fee`

## Failure & Dispute Boundaries

**Funding Failure (Before Lock):**
If one party funds and the other fails before the deadline:
- The compliant party gets fully refunded.
- The non-funding party receives a reputation penalty.
- The compliant party receives no bond reward (the deal never truly locked).

**Post-Lock Breach (Dispute):**
If a breach/cancellation occurs after both parties have funded:
- Settlement follows strict, deterministic rules.
- The breaching party's bond may be split between the harmed party and the Settleway treasury.
- Uploaded chat history and hashed evidence inform the dispute context.
- AI may summarize the evidence but **must not** act as the final judge.

## Demo / Testnet Exclusions

The following elements exist for prototyping and **do not** represent the target production flow:
- Role switcher and "Reset Demo" tooling.
- Legacy `legacy_demo` and `managed_custody` rail routes.
- Manual testnet token faucets.
- Unverified external wallet-connect as the primary authentication/session mechanism.
- Debug/dev routes (`/dev/*`).
