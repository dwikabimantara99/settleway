# 03 - Frontend Specification

## Frontend goal

The frontend must make Settleway understandable before the user sees blockchain details. It should feel like a serious B2B/agriculture marketplace with a strong transaction-protection layer.

## Route map

```text
/                         Landing page
/marketplace              Seller listing grid
/marketplace/[listingId]  Listing detail
/buyer-requests           Buyer demand board
/profiles/[userId]        Buyer/seller profile and reputation
/notifications            Role-specific notifications
/offers/new               Offer creation and negotiation entry
/offers/[offerId]         Negotiation thread and commitment gate
/deals/new                Legacy redirect to offers/new
/deals/[dealId]           Deal Room
/demo                     Guided demo scenario
```

## Layout shell

Every page should use:

- top navigation;
- Settleway logo text;
- primary CTAs;
- demo role switch;
- clean footer branding without hackathon-style honesty copy on the public surface.

## Core components

Create reusable components before hardcoding pages.

```text
components/
  layout/AppShell.tsx
  layout/Header.tsx
  layout/Footer.tsx
  demo/RoleSwitcher.tsx
  ui/Button.tsx
  ui/Card.tsx
  ui/Badge.tsx
  ui/StatusPill.tsx
  ui/StatCard.tsx
  marketplace/ListingCard.tsx
  marketplace/BuyerRequestCard.tsx
  profile/ReputationPanel.tsx
  deal/DealHeader.tsx
  deal/MoneyBreakdown.tsx
  deal/EscrowStepper.tsx
  deal/DepositPanel.tsx
  deal/EvidencePanel.tsx
  deal/StellarProofPanel.tsx
  deal/DealTimeline.tsx
  deal/RoleActionPanel.tsx
```

## Landing page sections

1. Hero: Settleway and tagline.
2. Problem: market access and transaction risk.
3. Solution: marketplace + Deal Room + escrow + proof + reputation.
4. Protected trade flow summary: recorded negotiation and mutual Open Deal Room before deposits.
5. How it works: founder-authorized commitment flow.
6. Demo scenario: chili trade.
7. Stellar trust layer: invisible but verifiable.
8. CTA: view marketplace / explore guided flow.

## Marketplace page

Must include:

- search/filter mock UI;
- listing cards;
- status badges: Ready Stock, Pre-Harvest;
- seller reputation summary;
- protected-volume or trust signal summary;
- value estimate;
- continuity into recorded negotiation;
- CTA to listing detail.

## Listing detail page

Must include:

- commodity image placeholder;
- commodity details;
- seller card;
- seller credibility or trust explanation;
- proof requirements preview;
- minimum deal value note;
- CTA to `Submit Offer`.

## Buyer request page

Must include:

- buyer demand cards;
- volume and delivery location;
- target price;
- urgency/status;
- buyer reputation summary.
- buyer trust or protected-volume summary;
- continuity into recorded negotiation.
- CTA to `Submit Offer`.

## Notifications page

Must include:

- role-specific notifications;
- offer and commitment updates;
- clear navigation into the negotiation thread.

## Offer thread page

Must include:

- deal terms summary with accepted/pending state;
- `Submit Offer` and `Accept Offer` actions inside the deal-terms area, not in a detached page-level action bar;
- counterparty `Accept Offer` step before mutual room activation;
- navigation back to notifications and the source listing or request when available;
- negotiation thread that reads like a shared conversation panel;
- participant context;
- commitment status for both parties;
- explicit explanation that the second confirmed `Open Deal Room` click activates the room and starts the deposit window;
- `Open Deal Room` action;
- link into the active escrow room after activation.

## Profile page

Must show:

- identity summary;
- seller reputation;
- buyer reputation;
- verified transaction volume;
- privacy-controlled proof list;
- recent reputation ledger or outcome list;
- clear explanation of public versus private proof visibility;
- verification context for transaction/proof references when available.

## Deal Room page

This is the most important frontend route.

Required sections:

### DealHeader

Shows deal title, commodity, buyer, seller, status, and high-value protection label.

### MoneyBreakdown

Shows:

- principal;
- buyer commitment bond;
- seller performance bond;
- buyer service fee;
- seller service fee;
- total buyer deposit;
- total seller deposit.

### EscrowStepper

Shows status progression.

### DepositPanel

Role-based actions:

- Buyer: simulate buyer funding through the active room gate.
- Seller: simulate seller funding through the active room gate.
- Operator: expire/refund/reset demo when allowed.

Must also explain:

- buyer vs seller funding obligations;
- local bank rail versus crypto wallet rail;
- deadline meaning;
- pre-lock refund and penalty rules.

### EvidencePanel

Shows proof requirements and submit proof action.

Must also make clear:

- whether evidence is still awaited, recorded, or partially anchored;
- how the proof hash relates to uploaded evidence;
- the MVP honesty boundary for simulated or uploaded evidence.

### StellarProofPanel

Shows:

- mode: event-contract or token-custody;
- contract ID;
- tx hash;
- proof hash;
- explorer link placeholder.

Must also make clear:

- what the MVP keeps simulated/off-chain;
- what Stellar verifies in the room;
- that funding milestones, lock, proof, and terminal outcomes belong to one trust trail.

### DealTimeline

Shows all material events in order.

It should remain easy for a judge or operator to narrate without reading internal IDs or implementation jargon.

## Demo page

Must include:

- canonical corridor wording that matches the landing page and active room;
- quick jumps for landing page, marketplace, listing, notifications, negotiation thread, and active Deal Room;
- founder-facing guidance that preserves the offer-thread-first story;
- no jump labels that obscure where the operator will actually land.

## Visual tone

Professional, clean, B2B, agricultural but not rustic. Avoid overly playful crypto styling.

Suggested visual keywords:

- white/neutral background;
- green accents;
- amber warning/status accents;
- dark text;
- card-based layouts;
- clear financial breakdown.

## Frontend anti-patterns

Do not build:

- fake full chat system;
- complex dashboard before Deal Room;
- multi-sector browsing;
- crypto wallet-heavy UI;
- vague buttons with no visible state change.
- founder/demo narration that overclaims real banking, custody, or automated dispute judgment.

For the current founder-authorized corridor, `/offers/new` must feel like the same negotiation
workspace the user will continue using, not like a separate staging form. It should let the
initiating side draft deal terms such as volume, price, and special notes while also starting the
recorded conversation. Chat alone must not unlock `Open Deal Room`.
