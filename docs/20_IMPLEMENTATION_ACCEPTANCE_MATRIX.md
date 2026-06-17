# 20 - Implementation Acceptance Matrix

Use this matrix to decide whether a product slice is complete under the founder-authorized Settleway corridor.

| Slice | What must be visible | What must work | What must not happen |
|---|---|---|---|
| Foundation | Landing, nav, product framing | app starts and story loads | crypto-first narrative |
| Discovery | Marketplace, buyer requests, profiles | discovery routes render from seeded truth | active escrow implied before offer |
| Offer and negotiation | `Submit Offer`, recorded thread, notifications | both sides can move toward commitment | direct jump from listing into active Deal Room |
| Mutual commitment | `Open Deal Room` status for both parties | room opens only after both commit | one-sided room activation treated as enough |
| Active Deal Room | money, status, evidence, Stellar trust panels | room reflects the active protected state | vague or contradictory escrow UI |
| Protected execution | deposits, lock, refund/expiry behavior | state transitions stay valid | invalid transitions allowed |
| Stellar trust layer | tx/contract/proof references or honest fallback | trust references are stored and surfaced | fake silent on-chain success |
| Evidence and reputation | proof reference and outcome-backed trust signals | hash/proof and reputation update work honestly | five-star review replaces event reputation |
| Guided demo | `/demo` corridor and reset flow | full story can be presented coherently | demo depends on hidden operator improvisation |

## Historical acceptance notes

The repository contains historical acceptance notes for earlier phase-based implementation work. They remain useful as evidence checkpoints, but they are no longer the primary product-flow authority when they conflict with the founder-authorized corridor in `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`.

## Current MVP acceptance

The MVP is ready only if:

1. Marketplace discovery works.
2. Negotiation exists before active escrow.
3. Mutual commitment exists before deposits begin.
4. Deal Room activation and escrow progression are state-accurate.
5. Stellar evidence or honest fallback is visible.
6. Proof and reputation support the trust story.
7. The guided demo can be presented without contradicting the product corridor.
