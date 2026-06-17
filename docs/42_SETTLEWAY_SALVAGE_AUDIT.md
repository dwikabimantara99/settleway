# 42 - Settleway Salvage Audit

This document records the founder-authorized salvage audit of the current Settleway repository baseline after the Phase 1-10 implementation history.

## Audit Date

2026-06-16

## Repository State At Audit

- Branch: `phase-10-persistence-identity`
- HEAD: `1f4dcc9ed60e0ebb5d0f47f3119691de1947254a`
- Working tree before this audit write-up:
  - `M docs/23_CURRENT_HANDOFF.md`
  - `?? docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
  - `?? docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
  - `?? docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

## Audit Objective

Classify the existing codebase and active product docs into:

- `keep`
- `adapt`
- `rewrite`
- `ignore`

The classification is measured against the frozen product truth in `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`.

## High-Level Verdict

The current repository is not disposable. It already contains meaningful foundations in UI primitives, data persistence patterns, escrow modeling, evidence verification, reputation accumulation, and Stellar execution discipline.

However, the current product flow is not aligned with the founder-authorized Settleway story. The strongest conflict is that the current app moves users too early into direct deal creation and deposit flow, while the new source of truth requires:

```text
Marketplace
-> Submit Offer
-> negotiation
-> mutual Open Deal Room
-> deposit
-> locked on Stellar
-> active Deal Room
-> settlement or dispute
-> reputation proof
```

## Key Conflict Summary

### Conflict 1 - Product Journey Still Jumps Directly Into Deal Room

Historical docs still describe:

- `docs/22_ONBOARDING_BLUEPRINT.md:27-28` -> `Marketplace or buyer request -> Deal Room`
- `docs/18_FILE_CREATION_MAP.md:73` -> `Phase 3 - Deal Room UI`

This is now outdated. The founder-authorized flow requires offer and negotiation before active Deal Room.

### Conflict 2 - Current Marketplace CTAs Skip Offer And Negotiation

The current product surface still pushes direct deal creation:

- `web/src/app/marketplace/[listingId]/page.tsx:78-80` -> `Create Protected Deal`
- `web/src/app/buyer-requests/page.tsx:78-80` -> `Propose Supply` leading to direct deal creation
- `web/src/app/deals/new/page.tsx:59-60` -> `Create Protected Deal`
- `web/src/app/deals/new/page.tsx:152-157` -> direct link to a hardcoded demo Deal Room

This conflicts with the new required sequence: `Submit Offer -> negotiation -> mutual Open Deal Room`.

### Conflict 3 - Current Deal Creation Starts Too Late In The Story

The current API creates a full deal record directly in `WAITING_DEPOSITS`:

- `web/src/app/api/deals/route.ts:24-59`

This bypasses the missing product layers:

- offer
- negotiation
- open-room intent
- counterpart notification
- mutual activation

### Conflict 4 - Current Deal Room Is Built For Active Escrow, Not Pre-Commitment Negotiation

The current Deal Room screen assumes the transaction already exists as a deposit-stage object:

- `web/src/app/deals/[dealId]/page.tsx:26-33`
- `web/src/app/deals/[dealId]/page.tsx:36-46`
- `web/src/app/deals/[dealId]/page.tsx:87-127`

It does not model:

- pending mutual `Open Deal Room`
- pre-deal negotiation state
- counterpart commitment notification
- countdown before deposit as a post-activation gate

### Conflict 5 - Current State Model Starts At Deposit State, Not At Commitment State

Current local statuses begin at `WAITING_DEPOSITS`:

- `web/src/lib/types.ts:50-61`
- `web/src/lib/escrow/state-machine.ts:3-13`

This leaves no native place for:

- offer sent
- negotiation
- open-room pending counterpart
- active room before funding
- dispute-resolved richer states

### Conflict 6 - Current Domain Model Has No First-Class Offer / Negotiation / Notification Layer

Current database and type models include listings, buyer requests, deals, evidence, and reputation:

- `web/src/lib/db/types.ts:11-139`

The source inventory found no dedicated modules for offer, notification, or negotiation state. This is a structural gap, not just a missing screen.

## Classification Matrix

### Keep

These areas are strong enough to preserve as foundations with minimal conceptual change.

| Area | Representative paths | Why it stays |
|---|---|---|
| UI primitives | `web/src/components/ui/*` | Reusable presentational layer with no deep commitment to the old product flow. |
| Evidence verification core | `web/src/lib/evidence/verification.ts:20-75` | Strong server-authoritative hash verification, input validation, and metadata allowlisting already match the new trust story. |
| CAS and operation persistence discipline in mock persistence | `web/src/lib/db/mock-store.ts:118-194`, `web/src/lib/db/mock-store.ts:280-342` | Good concurrency and idempotency discipline that remains valuable under the new flow. |
| Stellar execution orchestration foundation | `web/src/lib/stellar/server/execution-planner.ts:92-270`, `web/src/lib/stellar/server/stellar-testnet-adapter.ts:327-757` | The adapter/orchestration stack is a strong technical foundation even though product actions will evolve. |

### Adapt

These areas have good bones but must be reworked to fit the new Settleway workflow.

| Area | Representative paths | Why it must be adapted |
|---|---|---|
| Layout shell | `web/src/components/layout/AppShell.tsx`, `web/src/components/layout/Header.tsx:18-31`, `web/src/components/layout/Footer.tsx` | The shell is reusable, but navigation must reflect offers, notifications, and the new Deal Room story. |
| Landing page | `web/src/app/page.tsx:25-29`, `web/src/app/page.tsx:104-119` | The trust narrative is useful, but the workflow copy is obsolete and too deposit-first. |
| Marketplace listing and buyer request surfaces | `web/src/app/marketplace/page.tsx:30-74`, `web/src/app/marketplace/[listingId]/page.tsx:60-82`, `web/src/app/buyer-requests/page.tsx:66-80` | Discovery surfaces matter, but CTA and data flow must change from direct deal creation to `Submit Offer`. |
| Data model baseline | `web/src/lib/db/types.ts:11-139` | Listings, requests, deals, evidence, and reputation stay valuable, but the model must grow to include offer, negotiation, notification, and mutual-open states. |
| Mock and seeded demo data | `web/src/lib/demo/demo-data.ts:3-133`, `web/src/lib/db/mock-store.ts:93-111` | Good as seeded story material, but must become fixtures for the new flow rather than direct truth. |
| Repository and auth abstraction | `web/src/lib/repositories/index.ts:25-39`, `web/src/lib/auth/server.ts:13-59` | Persistence abstraction remains useful, but access rules and runtime assumptions must fit negotiation and Deal Room activation. |
| Reputation engine | `web/src/lib/reputation/engine.ts:15-140`, `web/src/app/profiles/[userId]/page.tsx:15-23` | Event-based reputation is the right direction, but outcomes and profile proof surfaces must grow to match the new reputation story. |
| Soroban contract baseline | `contracts/settleway_escrow/src/lib.rs:60-279` | The contract already models deposits, lock, proof, delivery, completion, expiry, and refund, but must evolve for richer dispute and slashing logic. |
| Demo tooling | `web/src/app/demo/page.tsx:21-107`, `web/src/app/api/demo/reset/route.ts:5-12` | Demo support remains useful, but the script and reset story must follow the new founder-authorized flow. |

### Rewrite

These areas conflict too directly with the new product truth to be merely adjusted in place.

| Area | Representative paths | Why rewrite is required |
|---|---|---|
| Direct deal creation flow | `web/src/app/deals/new/page.tsx:20-39`, `web/src/app/deals/new/page.tsx:152-157`, `web/src/app/api/deals/route.ts:24-59` | The current create-deal flow jumps past offer, negotiation, and mutual Open Deal Room. |
| Deal Room activation model | `web/src/app/deals/[dealId]/page.tsx:15-25`, `web/src/app/deals/[dealId]/page.tsx:50-76` | The current screen assumes an already-created funded deal object. It must be rebuilt around commitment-gated activation. |
| Deal action panel | `web/src/components/deal/DealActions.tsx:49-108` | Current buttons simulate old phase actions and do not model mutual open, dual rail funding, or richer dispute states. |
| Role-switch demo interaction model | `web/src/components/demo/RoleSwitcher.tsx:24-35` | Useful for testing, but the current cookie-driven role switch is tied to the old linear demo and should not define the new product flow. |
| Demo script content | `web/src/app/demo/page.tsx:89-99`, `web/src/app/demo/page.test.tsx:38-47` | The guided script still tells the old story: open direct Deal Room, then deposit. |

### Ignore

These areas are historical or too tied to the old product story to guide new implementation directly.

| Area | Representative paths | Why ignore |
|---|---|---|
| Historical direct-to-Deal-Room doc flow | `docs/22_ONBOARDING_BLUEPRINT.md:22-28`, `docs/18_FILE_CREATION_MAP.md:73` | Valuable as history only; they no longer define the founder-authorized product. |
| Old demo assertions that encode the obsolete flow | `web/src/app/demo/page.test.tsx:38-47` | They verify a historical sequence that the rebuild is explicitly replacing. |

## Detailed Area Findings

### 1. Discovery Surfaces

Discovery itself is worth preserving. The marketplace and buyer-request concept still maps directly to the new Settleway.

What is good:

- marketplace exists
- buyer requests exist
- seller profiles exist
- reputation is visible in discovery

What is wrong:

- direct CTA progression still points to deal creation instead of offer submission
- current pages depend on demo data directly

Classification:

- concept: `keep`
- implementation: `adapt`

### 2. Offer, Notification, And Negotiation Layer

This layer is the largest missing piece.

Current inventory shows no first-class implementation for:

- offer submission
- counterpart notification
- negotiation thread
- pre-commitment chat
- mutual Open Deal Room state

Classification:

- concept: `new required layer`
- current implementation: `rewrite`

### 3. Deal Room

The current Deal Room is strong as a proof-of-concept for escrow status, evidence, and Stellar proof display.

What is good:

- strong transaction-centric screen ambition
- evidence block exists
- Stellar trust panel exists
- participant summary exists

What is wrong:

- the room assumes the escrow phase already exists
- there is no pre-activation half-state
- language and actions are still old-flow and simulation-heavy
- mixed data sources undermine trust

Classification:

- screen ambition: `keep`
- implementation: `rewrite`

### 4. Escrow Logic

The existing escrow logic is useful, but it is too narrow for the new product.

Current logic covers:

- funding
- locking
- proof
- delivery
- completion
- expiry
- refund

Current logic does not cover:

- pre-deal commitment states
- richer active-room states
- dispute opened/resolved lifecycle
- explicit bond slashing and compensation routes
- dual-rail payment representation

Classification:

- foundation: `adapt`
- old local state flow shape: `rewrite`

### 5. Reputation

The repository already treats reputation as event-driven rather than star-rating-driven. That is a strong match with the new Settleway direction.

What is good:

- outcome-based events exist
- failed deposit penalties exist
- verified volume accumulation exists

What is missing:

- richer outcome taxonomy for cancellation, dispute win/loss, and slashing
- transaction proof visibility linked to real tx history
- profile surface that feels like a trust passport

Classification:

- foundation: `adapt`

### 6. Stellar Layer

The repository contains serious Stellar groundwork and should not be discarded.

What is good:

- canonical action policy exists
- execution planning and idempotency discipline exist
- adapter validates network, signer, and transaction shape carefully
- contract and offline harness coverage are meaningful assets

What must change:

- action plans currently mirror the old escrow state machine only
- the product story now requires eventual support for richer settlement and dispute outcomes
- the UI trust signal must move from historical future-tense messaging to the new direct product story

Classification:

- technical foundation: `keep`
- action mapping and product coupling: `adapt`

## Salvage Ratio Estimate

Approximate salvage view:

- `keep`: 25-35%
- `adapt`: 35-45%
- `rewrite`: 20-30%
- `ignore`: 5-10%

This is a strategic estimate, not a line-count measure.

## Recommended Next Phase

The first implementation-ready phase should not yet touch the full stack broadly. It should define and then implement the missing pre-transaction domain slice:

```text
Submit Offer
-> notification
-> negotiation thread
-> mutual Open Deal Room
```

That is the correct first rebuild slice because it resolves the single largest product gap without forcing premature settlement rewrites.

## Final Audit Conclusion

The current repository is a usable technical base for Settleway, but not a faithful product expression of the founder-authorized workflow. The rebuild should preserve proven technical foundations while replacing the old direct-to-deposit user journey with a commitment-gated marketplace flow.
