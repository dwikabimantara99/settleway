# 02 - Build Execution Plan

This is the product-safe build order for the founder-authorized Settleway MVP direction. Do not skip phases. Do not push deeper execution logic before the earlier trust corridor is legible.

## Phase 0 - Repository setup

Goal: create the technical foundation without product features.

Tasks:

1. Initialize git if needed.
2. Create `web/` Next.js app using TypeScript, App Router, Tailwind, ESLint, and `src/` directory.
3. Add root-level `.gitignore` and `.env.example`.
4. Add `web/.env.example`.
5. Create `contracts/` folder but do not implement Soroban yet.
6. Add initial scripts in README.

Acceptance criteria:

- `web/` app runs locally.
- `web/src/app/page.tsx` renders without errors.
- No product logic yet.

## Phase 1 - Frontend foundation

Goal: create Settleway visual shell and reusable UI components.

Tasks:

1. Configure app metadata.
2. Create layout shell: header, nav, footer.
3. Create design tokens/components: Button, Card, Badge, StatCard, Stepper, Timeline, MoneyBreakdown, StatusPill.
4. Create landing page sections.
5. Add demo role switch component: Buyer / Seller / Operator.
6. Add static mock data file.

Acceptance criteria:

- Landing page clearly explains Settleway.
- Role switch UI exists.
- No backend required.

## Phase 2 - Discovery surface

Goal: prove Settleway is a marketplace and trust product, not only an escrow room.

Routes to build:

- `/marketplace`
- `/marketplace/[listingId]`
- `/buyer-requests`
- `/buyer-requests/[requestId]`
- `/profiles/[userId]`

Tasks:

1. Render seller listing grid.
2. Render listing detail page with CTA to continue into the offer path.
3. Render buyer request list.
4. Render buyer request detail.
5. Render buyer/seller profile with two-sided reputation.
6. Use mock data only.

Acceptance criteria:

- A judge can see listing and buyer request before any protected room.
- Profile pages show buyer and seller reputation separately.
- Discovery surfaces do not force a direct jump into active escrow.

## Phase 3 - Offer, negotiation, and mutual commitment

Goal: create the missing pre-escrow trust corridor before the active Deal Room exists.

Routes:

- `/offers/new`
- `/offers/[offerId]`
- `/notifications`

Tasks:

1. Implement `Submit Offer` entry from listings and buyer requests.
2. Render a recorded negotiation thread.
3. Show buyer/seller context and offer terms.
4. Implement mutual `Open Deal Room` commitment state.
5. Show counterpart notifications and waiting states.
6. Allow the active Deal Room to open only after both sides commit.

Acceptance criteria:

- Users can see recorded negotiation before deposits begin.
- `Open Deal Room` is visibly mutual, not one-sided.
- The corridor from discovery into active escrow is legible and state-accurate.

## Phase 4 - Active Deal Room frontend

Goal: build the strongest product screen after mutual commitment activates it.

Routes:

- `/deals/[dealId]`
- `/deals/new` as legacy redirect only

Active Deal Room sections:

1. Deal overview.
2. Buyer/seller cards.
3. Money breakdown.
4. Escrow status stepper.
5. Deposit action panel.
6. Terms and proof requirements.
7. Evidence/proof section.
8. Stellar proof panel.
9. Timeline event panel.
10. Role-based CTA panel.

Acceptance criteria:

- The Deal Room visually explains the protected execution flow.
- Buyer and seller actions are visible and logical.
- The room is clearly positioned as the active escrow stage, not the first state in the story.

## Phase 5 - Backend and database foundation

Goal: persist core data and create API boundaries for discovery, negotiation, and active deals.

Tasks:

1. Add Supabase client/server helpers.
2. Create SQL schema file in `web/supabase/schema.sql`.
3. Create seed data in `web/supabase/seed.sql` or `web/src/lib/demo/seed.ts`.
4. Implement API routes for listings, buyer requests, profiles, offers, notifications, and deals.
5. Add a mock repository fallback if Supabase env is missing.

Acceptance criteria:

- Frontend can load from API routes.
- App still works without real Supabase by using demo fallback.
- Pre-deal and active-room flows use the same persistence truth.

## Phase 6 - Off-chain escrow state machine

Goal: make protected-room logic deterministic before deeper Stellar integration.

Tasks:

1. Implement the active-room state machine.
2. Implement transitions and validation.
3. Implement route handlers for buyer deposit, seller deposit, proof submission, delivery acceptance, expiry, and refund.
4. Store escrow events in database/mock store.
5. Update the Deal Room from live state.

Acceptance criteria:

- Demo flow works fully off-chain once the active Deal Room has opened.
- Status never contradicts timeline.
- This phase is the fallback if Stellar is temporarily unavailable.

## Phase 7 - Soroban contract

Goal: deploy a minimal, reliable contract or event-contract layer to Stellar Testnet.

Tasks:

1. Create `contracts/settleway_escrow` Rust contract.
2. Implement event-contract mode first.
3. Implement storage for escrow metadata and status.
4. Emit events for funding milestones, lock, proof, release, refund, and expiry.
5. Add tests for valid and invalid transitions.
6. Add README commands for build/test/deploy.

Acceptance criteria:

- Contract builds.
- Contract tests pass.
- Contract can be deployed to Testnet if environment is configured.

## Phase 8 - Backend Stellar integration

Goal: connect the app backend to the contract or event layer.

Tasks:

1. Create the Stellar service layer.
2. Add env variables for RPC URL, network passphrase, source secret, and contract ID.
3. Implement functions to invoke contract methods or record fallback Stellar identifiers.
4. Store tx hash, contract ID, and proof references on deal events.
5. Update the Deal Room Stellar proof panel.

Acceptance criteria:

- App can show real or configured Testnet transaction identifiers.
- If contract calls fail, fallback is explicit and honest.

## Phase 9 - Proof and reputation

Goal: complete the trust story after the active room flow works.

Tasks:

1. Implement evidence upload/simulation.
2. Generate SHA-256 proof hash.
3. Submit hash to the contract or event layer.
4. Update reputation when transaction completes, expires, refunds, or otherwise closes.
5. Implement privacy-aware proof display.

Acceptance criteria:

- Proof hash is visible.
- Reputation changes after outcome.
- Public/private trust signals stay honest.

## Phase 10 - Demo hardening

Goal: make the hackathon demo reliable from landing page to reputation update.

Tasks:

1. Add `/demo` route with guided scenario.
2. Add reset demo data button.
3. Add loading and error states.
4. Add fallback labels and explanatory cues.
5. Run lint/build or document truthful blockers.
6. Confirm the guided demo script works end-to-end.

Acceptance criteria:

- A presenter can run the 3-5 minute demo without improvising around broken state transitions.
- Failure modes are visible and not embarrassing.
- The corridor from discovery to verified settlement can be narrated clearly.

## Historical note

The older direct-to-Deal-Room phase order is superseded by the founder-authorized rebuild direction. If any older planning artifact conflicts with the sequence above, this plan yields to `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`.
