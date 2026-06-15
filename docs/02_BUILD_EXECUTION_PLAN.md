# 02 - Build Execution Plan

This is the exact build order. Do not skip phases. Do not start broad production features before the phase acceptance criteria are met.

## Phase 0 - Repository setup

Goal: create the technical foundation without product features.

Tasks:

1. Initialize git if needed.
2. Create `web/` Next.js app using TypeScript, App Router, Tailwind, ESLint, and `src/` directory.
3. Add root-level `.gitignore` and `.env.example`.
4. Add `web/.env.example`.
5. Create `contracts/` folder but do not implement Soroban yet.
6. Add initial scripts in README.

Recommended command from repository root:

```bash
pnpm create next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

If `pnpm` is unavailable, ask before switching package manager.

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

## Phase 2 - Marketplace surface

Goal: prove Settleway is a marketplace, not only a Deal Room.

Routes to build:

- `/marketplace`
- `/marketplace/[listingId]`
- `/buyer-requests`
- `/buyer-requests/[requestId]`
- `/profiles/[userId]`

Tasks:

1. Render seller listing grid.
2. Render listing detail page with CTA to create/open deal.
3. Render buyer request list.
4. Render buyer request detail.
5. Render buyer/seller profile with two-sided reputation.
6. Use mock data only.

Acceptance criteria:

- A judge can see listing and buyer request before Deal Room.
- Profile pages show buyer and seller reputation separately.

## Phase 3 - Deal Room frontend

Goal: build the strongest product screen before backend integration.

Routes:

- `/deals/demo-cabai-001`
- `/deals/new`

Deal Room sections:

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

- The Deal Room visually explains the escrow flow.
- Buyer and seller actions are visible and logical.
- No backend needed yet, but states must be modeled in TypeScript.

## Phase 4 - Backend and database foundation

Goal: persist core data and create API boundaries.

Tasks:

1. Add Supabase client/server helpers.
2. Create SQL schema file in `web/supabase/schema.sql`.
3. Create seed data in `web/supabase/seed.sql` or `web/src/lib/demo/seed.ts`.
4. Implement API routes for listings, buyer requests, profiles, deals.
5. Add a mock repository fallback if Supabase env is missing.

Acceptance criteria:

- Frontend can load from API routes.
- App still works without real Supabase by using demo fallback.

## Phase 5 - Off-chain escrow state machine

Goal: make escrow logic deterministic before Stellar integration.

Tasks:

1. Implement `web/src/lib/escrow/state-machine.ts`.
2. Implement transitions and validation.
3. Implement route handlers for buyer deposit, seller deposit, proof submission, delivery acceptance, expiry, and refund.
4. Store escrow events in database/mock store.
5. Update Deal Room from live state.

Acceptance criteria:

- Demo flow works fully off-chain.
- Status never contradicts timeline.
- This phase is the fallback if Stellar is temporarily unavailable.

## Phase 6 - Soroban contract

Goal: deploy a minimal, reliable contract to Stellar Testnet.

Tasks:

1. Create `contracts/settleway_escrow` Rust contract.
2. Implement event-contract mode first.
3. Implement storage for escrow metadata and status.
4. Emit events for create, deposits, lock, proof, release, refund, expire.
5. Add tests for valid and invalid transitions.
6. Add README commands for build/test/deploy.

Acceptance criteria:

- Contract builds.
- Contract tests pass.
- Contract can be deployed to Testnet if environment is configured.

## Phase 7 - Backend Stellar integration

Goal: connect app backend to contract.

Tasks:

1. Create `web/src/lib/stellar/stellar-service.ts`.
2. Add env variables for RPC URL, network passphrase, source secret, contract ID.
3. Implement functions to invoke contract or record fallback Stellar identifiers.
4. Store tx hash/contract ID/proof hash on deal events.
5. Update Deal Room Stellar proof panel.

Acceptance criteria:

- App can show real or configured Testnet transaction identifiers.
- If contract calls fail, fallback is explicit and honest.

## Phase 8 - Proof and reputation

Goal: complete the trust story.

Tasks:

1. Implement evidence upload/simulation.
2. Generate SHA-256 proof hash.
3. Submit hash to contract/event layer.
4. Update reputation when transaction completes/expires/refunds.
5. Implement privacy toggle for transaction proof display.

Acceptance criteria:

- Proof hash is visible.
- Reputation changes after outcome.
- Privacy toggle changes public display.

## Phase 9 - Demo hardening

Goal: make the hackathon demo reliable.

Tasks:

1. Add `/demo` route with guided scenario.
2. Add reset demo data button.
3. Add loading/error states.
4. Add fallback labels and explanatory tooltips.
5. Run lint/build.
6. Confirm demo script works end-to-end.

Acceptance criteria:

- A presenter can run the 3-5 minute demo without improvising.
- Failure modes are visible and not embarrassing.

## Phase 10 - Persistence and Identity Foundation (PROPOSED)

*Status: PROPOSED. NOT YET ACCEPTED. IMPLEMENTATION NOT AUTHORIZED.*

See `docs/36_PHASE_10_SCOPE_PROPOSAL.md` for full proposed scope and founder-level decisions.
