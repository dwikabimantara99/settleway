# 19 - Screen-level Frontend PRD

This file defines exactly what each screen must contain.

## `/` Landing page

Purpose: explain the product story and route judges to the demo.

Must include:

1. Hero with Settleway name and tagline.
2. One-sentence explanation.
3. Problem block: market access and transaction trust.
4. Solution block: marketplace, Deal Room, escrow, proof, reputation.
5. How it works step cards.
6. Stellar trust layer explanation.
7. CTA buttons: `View Marketplace`, `Open Demo Deal Room`.
8. Honesty note: demo uses simulated bank deposit and Stellar Testnet.

## `/marketplace`

Purpose: prove Settleway is a real marketplace surface.

Must include:

- page title;
- search/filter mock controls;
- listing cards;
- at least 3 demo listings;
- one cabai listing used for demo;
- pre-harvest badge on at least one listing;
- CTA to listing detail.

## `/marketplace/[listingId]`

Purpose: show commodity details and lead into deal creation.

Must include:

- commodity title;
- seller card;
- reputation summary;
- volume;
- estimated value;
- location;
- ready/pre-harvest status;
- proof requirements preview;
- CTA: `Create Protected Deal`.

## `/buyer-requests`

Purpose: show demand-side marketplace.

Must include:

- buyer request cards;
- buyer identity;
- desired commodity;
- volume;
- delivery location;
- target price;
- CTA to detail.

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

## `/deals/new`

Purpose: create formal Deal Room from a listing or request.

Must include:

- selected listing/request summary;
- buyer and seller;
- editable volume/value mock fields;
- money breakdown preview;
- proof requirement checklist;
- create deal CTA.

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
- timeline;
- evidence/proof panel;
- Stellar proof panel;
- terms summary;
- demo role switch.

## `/demo`

Purpose: guided hackathon presentation mode.

Must include:

- demo scenario summary;
- step-by-step checklist;
- current deal link;
- reset demo button;
- explanation of simulated vs on-chain elements.
