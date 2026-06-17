# 19 - Screen-level Frontend PRD

This file defines exactly what each screen must contain.

## `/` Landing page

Purpose: explain the product story and route judges to the demo.

Must include:

1. Hero with Settleway name and tagline.
2. One-sentence explanation.
3. Problem block: market access and transaction trust.
4. Solution block: marketplace, Deal Room, escrow, proof, reputation.
5. Protected-trade-flow summary that explains recorded negotiation and mutual Open Deal Room.
6. How it works step cards.
7. Stellar trust layer explanation.
8. CTA buttons: `View Marketplace`, `Explore Guided Flow`.

## `/marketplace`

Purpose: prove Settleway is a real marketplace surface.

Must include:

- page title;
- search/filter mock controls;
- listing cards;
- at least 3 demo listings;
- one chili listing used for demo;
- pre-harvest badge on at least one listing;
- CTA to listing detail.

## `/marketplace/[listingId]`

Purpose: show commodity details, counterparty credibility, and lead into offer submission.

Must include:

- commodity title;
- seller card;
- reputation summary;
- counterparty trust summary;
- volume;
- estimated value;
- location;
- ready/pre-harvest status;
- proof requirements preview;
- CTA: `Submit Offer`.

## `/buyer-requests`

Purpose: show demand-side marketplace.

Must include:

- buyer request cards;
- buyer identity;
- desired commodity;
- volume;
- delivery location;
- target price;
- buyer trust summary;
- CTA: `Submit Offer`.

## `/profiles/[userId]`

Purpose: show two-sided reputation.

Must include:

- profile heading;
- user type;
- location;
- seller reputation panel;
- buyer reputation panel;
- verified volume;
- proof visibility label;
- public/private proof display behavior.
- recent reputation ledger or verified outcomes list;
- verification context for Stellar-backed references when available.

## `/offers/new`

Purpose: create a recorded offer and open the negotiation thread from a listing or request.

Must include:

- direct arrival into a negotiation-thread-style page rather than a detached intermediary form screen;
- selected listing/request context;
- indicative volume/value context;
- chat-first starter panel for the first recorded message;
- editable deal terms form for volume, price, and special notes;
- clear statement that submitting the offer does not open the protected room;
- explanation that the counterparty must accept the terms before `Open Deal Room` becomes available;
- `Submit Offer` CTA inside the deal-terms panel.

## `/offers/[offerId]`

Purpose: capture negotiation and mutual commitment before active escrow begins.

Must include:

- navigation back to notifications and the source listing or request when available;
- negotiation thread styled as a shared conversation panel;
- deal terms summary;
- accepted/pending commercial-terms state;
- counterparty `Accept Offer` control inside the deal-terms panel before any mutual room activation;
- buyer and seller context;
- commitment status for both parties;
- clear explanation that the second confirmed `Open Deal Room` click activates the room and starts the deposit window;
- `Open Deal Room` activation control;
- active escrow room link after both parties commit.

## `/deals/new`

Purpose: legacy redirect only.

Must include:

- redirect behavior into `/offers/new` when a listing or buyer request is selected;
- no direct active-deal creation form.

## `/deals/[dealId]`

Purpose: central transaction screen.

Must include above-the-fold:

- deal title;
- status pill;
- buyer/seller cards;
- money breakdown;
- primary role action.

Must include below:

- escrow stepper;
- funding rail explanation for `local bank` and `crypto wallet`;
- per-party funding status and deadline meaning;
- timeline;
- evidence/proof panel;
- evidence anchoring or verification readability;
- operator/demo cue for narrating room milestones honestly;
- Stellar proof panel;
- terms summary;
- demo role switch.

## `/demo`

Purpose: guided hackathon presentation mode.

Must include:

- demo scenario summary;
- canonical product corridor;
- quick presentation-route or jump guidance;
- quick jumps for landing page, marketplace, listing, notifications, negotiation thread, and active Deal Room;
- step-by-step checklist;
- talk-track anchors or trust narration cues;
- trust checkpoints;
- reset demo button;
- explanation of simulated vs on-chain elements.
