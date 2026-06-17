# 12 - Acceptance Criteria

This file defines the high-level acceptance gates for the founder-authorized Settleway MVP corridor.

## Foundation

- `web/` app exists.
- App starts locally.
- Root docs remain intact.
- The landing page explains Settleway as a serious agricultural trade trust product.

## Discovery

- Marketplace route works.
- Listing detail route works.
- Buyer request route works.
- Profile route works.
- Discovery surfaces show trust before money.
- Discovery does not imply direct active escrow creation.

## Offer And Negotiation

- `Submit Offer` flow exists.
- Offer thread or negotiation route works.
- Recorded negotiation is visible before deposits begin.
- Notification or waiting state exists for counterpart response.
- `Open Deal Room` is clearly mutual.

## Active Deal Room

- Deal Room route works.
- Money breakdown is correct.
- Status stepper is visible.
- Role-based actions are visible.
- The room clearly reads as the active escrow stage after mutual commitment.

## Persistence And APIs

- API routes exist for the active product corridor.
- Demo data is served from API or fallback store.
- Database schema file exists.
- Mock fallback keeps the MVP operable without full hosted persistence.

## Protected Execution Logic

- Buyer deposit changes active-room state.
- Seller deposit changes active-room state.
- Both deposits lock escrow.
- Invalid transitions are rejected.
- Pre-lock failure can produce refund-plus-penalty behavior honestly.

## Stellar And Proof

- Soroban contract builds or the documented fallback is explicit.
- Events or trust references for lock/outcome are represented honestly.
- Deal Room shows contract, transaction, or proof references when available.
- Fallback mode is explicit.

## Evidence And Reputation

- Evidence can be uploaded or simulated honestly.
- Hash or proof reference is generated.
- Reputation updates after meaningful outcomes.
- Public/private proof visibility remains honest.

## Guided Demo

- `/demo` guided flow works.
- Reset demo state works.
- The canonical corridor can be narrated in 3-5 minutes.
- Documented blockers are surfaced honestly when full build/typecheck/runtime hardening is incomplete.

## Acceptance principle

The MVP is acceptable only if:

1. Marketplace discovery works.
2. Negotiation exists before active escrow.
3. Mutual commitment exists before deposits begin.
4. The Deal Room is clear, central, and state-accurate once active.
5. Stellar evidence or honest fallback is visible.
6. Proof and reputation support the trust story.
7. The demo script can be followed without contradicting the product story.
