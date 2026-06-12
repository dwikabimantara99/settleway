# 18 - File Creation Map

This file tells Gemini what to build, in what order, and where each file should live. It is intentionally concrete.

## Phase 0 - Repo setup

Expected files/folders after Phase 0:

```text
web/
  package.json
  next.config.*
  tsconfig.json
  src/app/layout.tsx
  src/app/page.tsx
  src/app/globals.css
contracts/
  README.md
.env.example
web/.env.example
```

Do not create marketplace routes yet.

## Phase 1 - Frontend foundation

Expected files:

```text
web/src/components/layout/AppShell.tsx
web/src/components/layout/Header.tsx
web/src/components/layout/Footer.tsx
web/src/components/demo/RoleSwitcher.tsx
web/src/components/ui/Button.tsx
web/src/components/ui/Card.tsx
web/src/components/ui/Badge.tsx
web/src/components/ui/StatusPill.tsx
web/src/components/ui/StatCard.tsx
web/src/components/ui/Stepper.tsx
web/src/components/ui/Timeline.tsx
web/src/lib/demo/demo-data.ts
web/src/lib/types.ts
web/src/app/page.tsx
```

Page goal:

- Landing page must already explain the Settleway story.
- Header must link to Marketplace, Buyer Requests, Demo.
- Role switch must be visible but can be local state.

## Phase 2 - Marketplace UI

Expected files:

```text
web/src/app/marketplace/page.tsx
web/src/app/marketplace/[listingId]/page.tsx
web/src/app/buyer-requests/page.tsx
web/src/app/buyer-requests/[requestId]/page.tsx
web/src/app/profiles/[userId]/page.tsx
web/src/components/marketplace/ListingCard.tsx
web/src/components/marketplace/BuyerRequestCard.tsx
web/src/components/profile/ReputationPanel.tsx
web/src/components/profile/ProofVisibilityPanel.tsx
```

Page goal:

- Marketplace surface must be complete enough that Settleway feels like a marketplace.
- Do not build backend yet.

## Phase 3 - Deal Room UI

Expected files:

```text
web/src/app/deals/new/page.tsx
web/src/app/deals/[dealId]/page.tsx
web/src/components/deal/DealHeader.tsx
web/src/components/deal/MoneyBreakdown.tsx
web/src/components/deal/EscrowStepper.tsx
web/src/components/deal/DepositPanel.tsx
web/src/components/deal/EvidencePanel.tsx
web/src/components/deal/StellarProofPanel.tsx
web/src/components/deal/DealTimeline.tsx
web/src/components/deal/RoleActionPanel.tsx
web/src/lib/escrow/status.ts
web/src/lib/escrow/money.ts
```

Page goal:

- Deal Room must be the strongest screen in the app.
- Money breakdown must match the 100% + 5% + 0.5% model.
- It can use static data at this phase.

## Phase 4 - Backend and database

Expected files:

```text
web/src/lib/db/types.ts
web/src/lib/db/mock-store.ts
web/src/lib/db/supabase-client.ts
web/src/lib/api/response.ts
web/src/lib/api/validation.ts
web/src/app/api/listings/route.ts
web/src/app/api/listings/[listingId]/route.ts
web/src/app/api/buyer-requests/route.ts
web/src/app/api/buyer-requests/[requestId]/route.ts
web/src/app/api/profiles/[userId]/route.ts
web/src/app/api/deals/route.ts
web/src/app/api/deals/[dealId]/route.ts
web/supabase/schema.sql
web/supabase/seed.sql
```

Backend goal:

- The app must load data through API routes.
- If Supabase env is missing, mock-store must keep the app usable.

## Phase 5 - Off-chain escrow state machine

Expected files:

```text
web/src/lib/escrow/state-machine.ts
web/src/lib/escrow/events.ts
web/src/app/api/deals/[dealId]/buyer-deposit/route.ts
web/src/app/api/deals/[dealId]/seller-deposit/route.ts
web/src/app/api/deals/[dealId]/submit-proof/route.ts
web/src/app/api/deals/[dealId]/mark-delivered/route.ts
web/src/app/api/deals/[dealId]/accept-delivery/route.ts
web/src/app/api/deals/[dealId]/expire/route.ts
web/src/app/api/deals/[dealId]/refund/route.ts
```

Logic goal:

- App can complete full demo off-chain.
- This becomes the safety fallback for the live demo.

## Phase 6 - Soroban contract

Expected files:

```text
contracts/settleway_escrow/Cargo.toml
contracts/settleway_escrow/src/lib.rs
contracts/settleway_escrow/tests/escrow_flow.rs
contracts/settleway_escrow/README.md
```

Contract goal:

- Implement Tier A event-contract mode first.
- Build and test before backend integration.

## Phase 7 - Stellar integration

Expected files:

```text
web/src/lib/stellar/config.ts
web/src/lib/stellar/stellar-service.ts
web/src/lib/stellar/types.ts
web/src/app/api/stellar/health/route.ts
```

Integration goal:

- Backend records contract ID, tx hash, and proof hash metadata.
- UI must explicitly show mode: not_configured, mock_fallback, event_contract, or token_custody.

## Phase 8 - Proof and reputation

Expected files:

```text
web/src/lib/proof/hash.ts
web/src/lib/proof/evidence-service.ts
web/src/lib/reputation/reputation-service.ts
web/src/app/api/deals/[dealId]/evidence/route.ts
web/src/app/api/profiles/[userId]/proof-visibility/route.ts
```

Trust goal:

- Evidence hash and reputation update must work and be visible.

## Phase 9 - Demo hardening

Expected files:

```text
web/src/app/demo/page.tsx
web/src/app/api/demo/reset/route.ts
web/src/components/demo/DemoGuide.tsx
web/src/components/demo/DemoResetButton.tsx
```

Demo goal:

- Presenter can follow one guided flow without improvisation.
