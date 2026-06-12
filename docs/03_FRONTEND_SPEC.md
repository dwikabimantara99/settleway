# 03 - Frontend Specification

## Frontend goal

The frontend must make Settleway understandable before the user sees blockchain details. It should feel like a serious B2B/agriculture marketplace with a strong transaction-protection layer.

## Route map

```text
/                         Landing page
/marketplace              Seller listing grid
/marketplace/[listingId]  Listing detail
/buyer-requests           Buyer demand board
/buyer-requests/[id]      Buyer request detail
/profiles/[userId]        Buyer/seller profile and reputation
/deals/new                Create Deal Room form
/deals/[dealId]           Deal Room
/demo                     Guided demo scenario
```

## Layout shell

Every page should use:

- top navigation;
- Settleway logo text;
- primary CTAs;
- demo role switch;
- footer with hackathon honesty notes.

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
4. How it works: 5-step flow.
5. Demo scenario: chili trade.
6. Stellar trust layer: invisible but verifiable.
7. CTA: view marketplace / open demo.

## Marketplace page

Must include:

- search/filter mock UI;
- listing cards;
- status badges: Ready Stock, Pre-Harvest;
- seller reputation summary;
- value estimate;
- CTA to listing detail.

## Listing detail page

Must include:

- commodity image placeholder;
- commodity details;
- seller card;
- proof requirements preview;
- minimum deal value note;
- CTA to create Deal Room.

## Buyer request page

Must include:

- buyer demand cards;
- volume and delivery location;
- target price;
- urgency/status;
- buyer reputation summary.

## Profile page

Must show:

- identity summary;
- seller reputation;
- buyer reputation;
- verified transaction volume;
- privacy-controlled proof list.

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

- Buyer: simulate buyer bank deposit.
- Seller: simulate seller bond deposit.
- Operator: expire/refund/reset demo when allowed.

### EvidencePanel

Shows proof requirements and submit proof action.

### StellarProofPanel

Shows:

- mode: event-contract or token-custody;
- contract ID;
- tx hash;
- proof hash;
- explorer link placeholder.

### DealTimeline

Shows all material events in order.

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
