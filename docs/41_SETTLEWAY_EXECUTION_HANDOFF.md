# 41 - Settleway Execution Handoff

This is the live handoff for the founder-authorized Settleway rebuild direction.

## Current Repository State

- Active branch at latest settled implementation freeze: `phase-10-persistence-identity`
- Latest settled implementation freeze commit: `ef79d9f6920bcd68038a5ee7055c3455a1e7dc6c`
- Latest settled implementation freeze subject: `feat: freeze phase y payout destination wiring`
- Working tree immediately after the Phase Y code freeze commit: clean

Future sessions must verify Git state directly rather than trusting this snapshot blindly.

## Current Source Of Truth

Primary execution docs:

1. `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
2. `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
3. `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

Supporting product/domain docs remain useful, especially:

- `docs/00_PRODUCT_BLUEPRINT.md`
- `docs/01_MASTER_PRD.md`
- `docs/05_DATABASE_SCHEMA.md`
- `docs/06_STELLAR_SOROBAN_SPEC.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/09_PROOF_AND_EVIDENCE_SPEC.md`
- `docs/10_REPUTATION_SPEC.md`
- `docs/15_DESIGN_SYSTEM_SPEC.md`

Where those docs conflict with the founder-authorized workflow in `docs/39`, `docs/39` wins.

## Founder-Authorized Direction

The canonical Settleway story is now:

```text
Marketplace or buyer request
-> Submit Offer
-> negotiation chat
-> mutual Open Deal Room
-> deposit window
-> escrow locked on Stellar
-> active Deal Room with chat and evidence
-> success or dispute handling
-> reputation accumulation from verifiable transaction history
```

## Money And Stellar Summary

- Buyer carries principal plus buyer bond and buyer fee.
- Seller carries seller performance bond and seller fee.
- Before lock, failure to fund triggers full refund to the funding side and a reputation penalty to the non-funding side.
- After lock, settlement, refund, slashing, and outcome proof must be supported by Stellar-backed escrow events.
- Both `local bank` and `crypto wallet` rails must converge on the same Stellar trust layer.
- Deal Room must visibly communicate trust through language such as `Secured by Stellar Blockchain` and a verifiable transaction view.
- Reputation must accumulate from verifiable transaction events and hashes, not from arbitrary internal scoring alone.

## Active Phase

Current active phase:

`Phase Y - Controlled Payout Destination Wiring`

Status:

- Phase A constitution and salvage audit: complete
- Phase B pre-deal commitment slice: complete
- Phase C active escrow room and deposit experience alignment: complete
- Phase D locked escrow, proof, and delivery milestone alignment: complete
- Phase E dispute, refund, and reputation outcome alignment: implemented locally and frozen-validated
- Phase F trust profile and demo narrative consolidation: implemented locally and frozen-validated
- Phase G UX and product copy consistency hardening: implemented locally and frozen-validated
- Phase H funding rail and deposit experience consolidation: implemented locally and frozen-validated
- Phase I reputation ledger and trust evidence consolidation: implemented locally and frozen-validated
- Phase J Deal Room communication and evidence UX polish: implemented locally and frozen-validated
- Phase K discovery surface trust alignment: implemented locally and frozen-validated
- Phase L demo corridor and founder pitch refinement: implemented locally and frozen-validated
- Phase M README and external narrative alignment: implemented locally and frozen-validated
- Phase N foundational product document realignment: implemented locally and frozen-validated
- Phase O planning and acceptance document realignment: implemented locally and frozen-validated
- Phase P runtime demo corridor consolidation: implemented locally and targeted-validated
- Phase Q active room domain contract hardening: implemented locally and targeted-validated
- Phase R escrow state semantics consolidation: implemented locally and targeted-validated
- Phase S historical status vocabulary cleanup: implemented locally and targeted-validated
- Phase T boundary technical spec lifecycle alignment: implemented locally and docs-validated
- Phase U contract source cleanup decision: implemented locally and docs-validated
- Phase V demo corridor narrative consistency pass: implemented locally and targeted-validated
- Phase W Testnet-backed wallet and deposit foundation: frozen and pushed at `f4d20b7`
- Phase X Testnet settlement routing and reputation anchoring: frozen at `809e0c2`
- Phase Y controlled payout destination wiring: frozen at `ef79d9f`
- Active phase contract: still points to Phase Y until the founder authorizes the next promotion
- Live handoff: updated for the completed Phase Y freeze
- Salvage audit: complete in `docs/42_SETTLEWAY_SALVAGE_AUDIT.md`

## Phase X Opening Snapshot

Phase X is the next founder-authorized slice.

Why this phase is next:

- Phase W already proved the funding gate through real Next routes and live Testnet-backed lock truth
- the room already narrates proof, delivery, settlement, wallet routing, and reputation closure
- but the current post-lock route path still splits the truth because:
  - `web/src/app/api/deals/[dealId]/submit-proof/route.ts`
  - `web/src/app/api/deals/[dealId]/mark-delivered/route.ts`
  - `web/src/app/api/deals/[dealId]/accept-delivery/route.ts`
  still rely on local `transition(...)` and local event writes instead of the Phase W Testnet-backed execution coordinator

Phase X objective:

- preserve the proven Phase W funding and lock foundation
- upgrade the happy-path post-lock actions to the same Testnet-backed execution boundary
- keep the final room summary and reputation anchoring honest

Delivered outcomes so far:

- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md` is now promoted to `Phase X - Testnet Settlement Routing And Reputation Anchoring`
- `docs/44_PHASE_X_IMPLEMENTATION_PLAN.md` now freezes the narrow implementation order for this phase
- `web/src/lib/stellar/server/deal-room-route-execution.ts` now provides a shared route-level Testnet execution and bounded reconciliation helper for post-lock actions
- `web/src/app/api/deals/[dealId]/submit-proof/route.ts` now routes `testnet` proof submission through the execution coordinator instead of relying only on local `transition(...)`
- `web/src/app/api/deals/[dealId]/mark-delivered/route.ts` now routes `testnet` delivery confirmation through the execution coordinator instead of relying only on local `transition(...)`
- `web/src/app/api/deals/[dealId]/accept-delivery/route.ts` now routes `testnet` buyer acceptance through the execution coordinator instead of relying only on local `transition(...)`
- buyer acceptance on `testnet` rooms now relies on the coordinator-owned completion hook for `transaction_completed` reputation anchoring instead of duplicating a second manual route-level reputation write
- `web/src/app/api/deals/[dealId]/buyer-deposit/route.ts` and `web/src/app/api/deals/[dealId]/seller-deposit/route.ts` now use a wider bounded reconciliation window so normal live Testnet confirmation lag does not falsely fail the room before post-lock actions can begin
- new targeted route tests now exist for:
  - `buyer-deposit`
  - `seller-deposit`
  - `submit-proof`
  - `mark-delivered`
  - `accept-delivery`

Authorized scope for Phase X:

- proof submission route truth
- delivery milestone route truth
- buyer acceptance route truth
- completion-facing room proof and routing summary
- reputation anchoring that depends on successful completion
- tightly related tests and execution-doc synchronization

Not in scope for Phase X:

- bank payout execution
- wallet connect
- dispute automation redesign
- slashing redesign
- production token custody claims
- broad UI redesign outside the post-lock success slice

Phase X targeted validation most recently rerun:

- `npm.cmd test -- src/app/api/deals/[dealId]/buyer-deposit/route.test.ts src/app/api/deals/[dealId]/seller-deposit/route.test.ts src/app/api/deals/[dealId]/submit-proof/route.test.ts src/app/api/deals/[dealId]/mark-delivered/route.test.ts src/app/api/deals/[dealId]/accept-delivery/route.test.ts src/lib/integration/integration.test.ts`
  - passing
  - `6` test files
  - `23` tests
- `npm.cmd test -- src/lib/integration/ui-acceptance.test.ts src/lib/integration/route-evidence.test.ts`
  - passing
  - `2` test files
  - `28` tests
- `git diff --check -- docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md docs/44_PHASE_X_IMPLEMENTATION_PLAN.md web/src/lib/stellar/server/deal-room-route-execution.ts web/src/app/api/deals/[dealId]/submit-proof/route.ts web/src/app/api/deals/[dealId]/mark-delivered/route.ts web/src/app/api/deals/[dealId]/accept-delivery/route.ts web/src/app/api/deals/[dealId]/submit-proof/route.test.ts web/src/app/api/deals/[dealId]/mark-delivered/route.test.ts web/src/app/api/deals/[dealId]/accept-delivery/route.test.ts`
  - no content errors
  - only existing LF/CRLF working-copy warnings were emitted

Current truth boundary:

- the post-lock success-path routes are now upgraded for `testnet` rooms and remain backward-compatible with the legacy `mock_only` room path
- targeted route and integration validation passed locally
- a fresh local runtime probe proved the earlier funding regression was confirmation timing, not a broken adapter:
  - the stored `create_deal` operation initially landed in `unknown`
  - a delayed reconciliation then confirmed it safely and persisted a real escrow id
- the bounded reconciliation window was widened for funding and post-lock route confirmation:
  - previous posture: `3` attempts with `1200ms` delay
  - current posture: `5` attempts with `1500ms` delay
- a fresh live local `http://localhost:3020` proof now confirms the full happy path end to end:
  - `POST /api/demo/reset` -> `200`
  - `POST /api/deals/demo-cabai-001/buyer-deposit` -> `200`
    - status `BUYER_FUNDED`
    - escrow id `20`
    - tx hash `cc1dd8ba88208581574a8c7d0bf59996eae3148d8b6da3b72bdc57d59fff7a20`
  - `POST /api/deals/demo-cabai-001/seller-deposit` -> `200`
    - status `LOCKED`
    - tx hash `1d0afbab0ed6ee44d4550a7d79967e2e77b049551e77959f9aa2328c25964fd5`
  - `POST /api/deals/demo-cabai-001/submit-proof` -> `200`
    - status `PROOF_SUBMITTED`
    - proof hash `7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f`
    - tx hash `60bc9416e53a1a946157f5c89c569c33d01f18add86808a161976d29a9b67fad`
  - `POST /api/deals/demo-cabai-001/mark-delivered` -> `200`
    - status `DELIVERED`
    - tx hash `ea4aa32b1111f75e6efadf22aabc5ffcc8d847522d367ccd606774c1d879de72`
  - `POST /api/deals/demo-cabai-001/accept-delivery` -> `200`
    - status `COMPLETED`
    - tx hash `b3aea38333279b81c6c4807391006c7da3d224124d200de8423e2f9054f54c1f`
  - final `GET /api/deals/demo-cabai-001` confirmed:
    - status `COMPLETED`
    - escrow id `20`
    - `stellar_sync_status: "idle"`
    - the persisted proof hash
- the rendered profile pages for both buyer and seller now also consume the result as user-facing reputation truth:
  - `/profiles/buyer-surabaya-restaurant` rendered `Settlement Completed`, `demo-cabai-001`, `Transaction reference:`, and `Proof hash:`
  - `/profiles/seller-probolinggo-cabai` rendered the same completion-backed proof signals
  - both profile pages rendered `1 recent ledger item(s) currently have public transaction or proof references available on this profile.`
- therefore the new Phase X corridor is now locally implemented, route-tested, and live-proved through the real Next route path

Phase X required execution inputs:

- `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`
- `docs/42_SETTLEWAY_SALVAGE_AUDIT.md`
- `docs/43_PHASE_W_IMPLEMENTATION_PLAN.md`
- `docs/44_PHASE_X_IMPLEMENTATION_PLAN.md`
- `docs/06_STELLAR_SOROBAN_SPEC.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/10_REPUTATION_SPEC.md`
- `docs/11_DEMO_SCRIPT.md`
- `docs/12_ACCEPTANCE_CRITERIA.md`
- `docs/24_CONTROLLED_TESTNET_SMOKE_RUNBOOK.md`
- `docs/26_TESTNET_SYNTHETIC_IDENTITIES.md`
- `docs/27_STELLAR_CLI_SECURE_STORE_SIGNER.md`
- `docs/28_TESTNET_ACCOUNT_READINESS.md`

## Phase Y Implementation Snapshot

Phase Y is now locally implemented and frozen at `ef79d9f` after the Phase X Testnet-backed completion corridor.

Why this phase existed:

- Phase X already proved the protected room can move from `LOCKED` to `COMPLETED` through the real Next route path
- the room already had truthful settlement completion and reputation anchoring
- but the product still did not truthfully answer the next user-facing question:
  - where buyer and seller proceeds are intended to land after settlement closes

Important architectural truth preserved during implementation:

- the current Stellar execution assembly and invocation path still only understands:
  - `admin_address`
  - `buyer_demo_address`
  - `seller_demo_address`
- there is still no arbitrary payout-destination argument in the current Testnet execution input shape
- therefore Phase Y remained intentionally narrow as a destination-wiring and payout-intent phase, not a contract-level arbitrary-address settlement phase

Delivered outcomes:

- `DbProfile` now stores:
  - `payout_rail_preference`
  - `payout_wallet_label`
  - `payout_wallet_address`
  - `payout_bank_name`
  - `payout_bank_account_masked`
- seeded demo profiles now include linked wallet destination defaults and honest bank-placeholder defaults
- repository adapters now support `updateProfile(...)` for payout-destination truth
- `web/src/app/api/profiles/[userId]/route.ts` now exposes owner-only payout-destination updates and explicitly rejects local-bank selection as not live in this MVP
- `web/src/components/profile/PayoutDestinationCard.tsx` now provides a narrow profile-adjacent surface for reviewing and editing linked wallet payout destination truth while keeping local bank visible but inactive
- `web/src/app/api/deals/[dealId]/accept-delivery/route.ts` now snapshots buyer, seller, and Settleway payout-destination intent into completion event metadata
- `web/src/app/deals/[dealId]/page.tsx` now renders completed-room payout destinations by party instead of relying only on generic buyer and seller wallet language
- no wallet-connect, signer exposure, live bank payout, or arbitrary-address Soroban method expansion was introduced

Phase Y targeted validation most recently rerun:

- `npm.cmd test -- src/app/api/profiles/[userId]/route.test.ts src/app/api/deals/[dealId]/accept-delivery/route.test.ts src/components/profile/PayoutDestinationCard.test.tsx src/lib/integration/ui-acceptance.test.ts src/lib/repositories/mock-adapter.test.ts src/lib/repositories/shared-contract.test.ts`
  - passing
  - `6` test files
  - `44` tests
- `npx.cmd eslint src/app/api/profiles/[userId]/route.ts src/app/api/profiles/[userId]/route.test.ts src/app/api/deals/[dealId]/accept-delivery/route.ts src/app/api/deals/[dealId]/accept-delivery/route.test.ts src/app/deals/[dealId]/page.tsx src/app/profiles/[userId]/page.tsx src/components/profile/PayoutDestinationCard.tsx src/components/profile/PayoutDestinationCard.test.tsx src/lib/payout-destinations.ts src/lib/integration/ui-acceptance.test.ts src/lib/repositories/mock-adapter.test.ts src/lib/repositories/shared-contract.test.ts`
  - passing
- `git diff --check`
  - passing
  - only existing LF/CRLF working-copy warnings were emitted

Current truth boundary:

- linked wallet destination is the only active payout target rail in Phase Y
- local bank payout remains visible but clearly non-live
- completed rooms now preserve payout-destination intent in completion-facing metadata and surface it in the settlement summary
- settlement execution still closes through managed demo identities, but the UI no longer pretends destination intent is unknowable

## Phase W Implementation Snapshot

Phase W moved the active Deal Room funding gate beyond local-only narration by introducing controlled Stellar Testnet wallet and funding runtime surfaces, while keeping the room honest when the local Testnet runtime is not configured.

Delivered outcomes so far:

- buyer, seller, and platform Testnet role identities now exist as visible wallet cards in the active room
- buyer and seller funding routes now support a Testnet-backed execution path instead of only a local toggle path
- the room surfaces public funding proof, wallet references, and lock-facing trust copy in the active funding slice
- seeded and newly activated rooms now resolve to `testnet` only when the frozen `SETTLEWAY_SMOKE_*` runtime configuration is valid; otherwise they fall back honestly to `mock_only`
- the runtime returns explicit not-ready or invalid-state failures when a room is marked for Testnet execution but the local runtime cannot safely compose that path

Current truth boundary:

- the implementation path for Phase W now exists locally and is covered by targeted tests
- the current local shell still has no `SETTLEWAY_SMOKE_*` runtime variables loaded, so the default room on this machine remains truthfully in `mock_only` unless configuration is supplied
- this means the phase is implemented at the runtime and UI-contract level, but live local Testnet activation has not yet been re-proved in this shell session

Authorized scope for Phase W:

- active-room wallet identity surface
- active-room buyer and seller deposit wiring
- public transaction and lock proof surface
- narrow runtime composition and signer-safe integration needed for those funding actions
- tightly related tests and execution-doc synchronization

Not in scope for Phase W:

- Mainnet support
- bank-local payout or QRIS integration
- external wallet connect
- production custody claims
- final settlement routing after delivery
- dispute automation redesign
- broad UI redesign outside the funding slice

Frozen implementation truth for Phase W:

- use real Stellar Testnet accounts
- use managed demo-role identities, not end-user wallets
- keep commercial value display in product-facing `IDR`
- keep Testnet asset and custody language honest and synthetic where required
- prove the happy path only through `buyer funded -> seller funded -> locked`

Phase W targeted validation most recently rerun:

- `npm.cmd test -- src/lib/stellar/demo-wallets.test.ts src/lib/stellar/server/deal-room-funding-runtime.test.ts src/lib/stellar/server/deal-room-testnet-runtime.test.ts src/lib/integration/offer-routes.test.ts src/app/api/deals/[dealId]/buyer-deposit/route.test.ts src/app/api/deals/[dealId]/seller-deposit/route.test.ts src/lib/integration/route-evidence.test.ts src/lib/integration/ui-acceptance.test.ts`
  - passing
  - `8` test files
  - `53` tests
- `git diff --check`
  - no content errors
  - only existing LF/CRLF working-copy warnings were emitted

Phase W local runtime verification most recently observed:

- `web/.env.local` now contains the public `SETTLEWAY_SMOKE_*` runtime keys required by the active room loader
- the local public Soroban fee ceiling in `web/.env.local` was raised from `1000` to `100000` stroops after direct live inspection proved:
  - `create_deal` prepared fee: `92612`
  - `buyer_deposit` prepared fee: `18562`
  - `seller_deposit` prepared fee: `18562`
- a direct unsandboxed confirmation lookup proved that the previously submitted `create_deal` transaction hash `c76b5e35354b8a86a6a8d65e974d0bb6fcb5cb46c6968311dbf096ee6809dbe4` was confirmed and produced escrow id `6`
- a direct repository-backed reconciliation probe then proved that an `unknown` stored `create_deal` operation can be reconciled safely into:
  - `stellar_escrow_id: "6"`
  - `stellar_sync_status: "idle"`
  - confirmed stored operation state
- a fresh live local `next dev` session on `http://localhost:3020` served `GET /deals/demo-cabai-001` with:
  - `Testnet-backed room`
  - `Protected by escrow logic and recorded on Stellar`
  - `Buyer Testnet wallet`
  - `Seller Testnet wallet`
  - `Settleway fee wallet`
- live local route validation originally proved the full Phase W funding corridor through lock on this machine, but still required repeated requests when live Soroban confirmation returned `unknown` inside the request window
- route-level bounded reconciliation has now been added inside both funding routes, and a fresh reset-to-lock verification on `http://localhost:3020` proved the smoother path:
  - `POST /api/demo/reset` returned `200`
  - a single `POST /api/deals/demo-cabai-001/buyer-deposit` returned `200` with:
    - status `BUYER_FUNDED`
    - escrow id `8`
    - buyer funding tx hash `bf3618d789ffe1e91dcb1d2e57a9990a885e99bad2b92670bb33554439f73b5d`
  - a single `POST /api/deals/demo-cabai-001/seller-deposit` returned `200`
  - `GET /api/deals/demo-cabai-001` then returned:
    - status `LOCKED`
    - escrow id `8`
    - lock tx hash `947989883c04d7400a1d12b7dff722f2964b122b8eef568368a03a526ef5019a`
- a live follow-up `GET /deals/demo-cabai-001` then rendered the locked room state with:
  - `Locked (Protected)`
  - `2 of 2 funded`
  - escrow reference `8`
  - `View Lock Proof`
  - both buyer and seller wallet cards marked `Locked in escrow`
- therefore Phase W room activation, buyer funding, seller funding, and lock proof are now locally proved through the real Next route path
- the remaining runtime truth is narrower: confirmation still depends on bounded in-request reconciliation timing, but the validated default room no longer requires manual repeat clicks in the happy path

Phase W implementation details that matter for the next session:

- `web/src/lib/stellar/demo-wallets.ts` builds the active-room wallet cards and public proof references
- `web/src/lib/stellar/server/deal-room-funding-runtime.ts` composes the role-wallet, actor, and proof payload for buyer and seller funding actions
- `web/src/lib/stellar/server/deal-room-testnet-runtime.ts` validates the frozen public runtime config and resolves whether a room should default to `testnet` or `mock_only`
- `web/src/lib/offers/helpers.ts` and `web/src/lib/db/mock-store.ts` now use that runtime-resolution helper so new and seeded rooms can auto-select the honest Stellar mode
- `web/src/lib/stellar/server/smoke/stellar-cli-secure-store-signer.ts` now passes `--network-passphrase` to `stellar tx sign`, which was required for RPC-prepared Soroban signing to work locally
- `web/.env.local` now carries the public runtime values required for local Phase W room activation, without adding any secret seed material to the repository working slice
- the current local fee ceiling required for the live Phase W corridor is at least above `92612` stroops; the latest local value used successfully was `100000`
- the local route behavior is now known precisely:
  - funding routes now perform bounded repository-backed reconciliation inside the request before surfacing `STELLAR_EXECUTION_UNCONFIRMED`
  - the validated default happy path from reset completed with one buyer request and one seller request
  - if live confirmation remains unresolved after the bounded reconciliation window, the route still fails honestly instead of fabricating success

Phase W required execution inputs:

- `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`
- `docs/42_SETTLEWAY_SALVAGE_AUDIT.md`
- `docs/43_PHASE_W_IMPLEMENTATION_PLAN.md`
- `docs/06_STELLAR_SOROBAN_SPEC.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/24_CONTROLLED_TESTNET_SMOKE_RUNBOOK.md`
- `docs/26_TESTNET_SYNTHETIC_IDENTITIES.md`
- `docs/27_STELLAR_CLI_SECURE_STORE_SIGNER.md`
- `docs/28_TESTNET_ACCOUNT_READINESS.md`

Phase W first coding target:

- wallet identity and funding-proof surface inside the active Deal Room, without broadening into settlement routing

## Phase P Opening Snapshot

Phase P exists to fix the narrowest but most visible runtime contradiction left in the MVP:

- the docs and routes now describe `Submit Offer -> negotiation -> mutual Open Deal Room -> active escrow room`
- but the primary seeded demo deal still originates like a legacy direct-deal object

Phase P objective:

- preserve the current offer architecture
- preserve the current active Deal Room architecture
- make the seeded demo runtime actually connect those two layers

Authorized scope for Phase P:

- seeded mock runtime continuity only
- offer thread linkage into the primary demo deal
- recorded negotiation seed continuity
- mutual open-room activation metadata continuity
- targeted validation for reset and continuity restoration

Not in scope for Phase P:

- new product features
- broad UI redesign
- deeper state-machine redesign
- production persistence redesign
- Stellar contract or execution architecture changes

Delivered outcomes for Phase P:

- the primary seeded demo deal now points to a real offer thread instead of acting like an orphaned legacy deal
- the seeded offer now carries mutual `Open Deal Room` timestamps and an attached active deal id
- the seeded negotiation thread now restores recorded pre-deal continuity inside the active Deal Room by default
- the seeded deal terms now preserve `offer_id`, `activation_source`, and deposit-window metadata after mock reset
- reset validation now proves that the continuity seed is restored rather than requiring ad hoc per-session patching

Phase P targeted validation:

- `npm test -- src/app/api/demo/reset/route.test.ts src/lib/integration/ui-acceptance.test.ts`: passing
- `git diff --check -- docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md web/src/lib/db/mock-store.ts web/src/app/api/demo/reset/route.test.ts web/src/lib/integration/ui-acceptance.test.ts`: passing aside from expected LF/CRLF warnings in the working copy

## Phase Q Opening Snapshot

Phase Q exists to formalize the contract between an activated offer thread and the active escrow room.

Why this phase is next:

- the seeded corridor now proves the right story
- but runtime code still reads activation metadata through loose `terms` indexing
- that makes later state-model work riskier than it needs to be

Phase Q objective:

- introduce explicit typing for active-room activation metadata
- provide shared readers/builders for that metadata
- update only the narrow runtime slice that currently depends on raw `terms`

Authorized scope for Phase Q:

- `DbDeal` active-room contract hardening
- shared helpers for activation metadata
- offer builder alignment with that shared contract
- active Deal Room reader alignment with that shared contract
- targeted tests around that contract

Not in scope for Phase Q:

- broad escrow status renaming
- Stellar execution stack redesign
- product-surface redesign
- production persistence redesign
- broader state-machine expansion

Delivered outcomes for Phase Q:

- `DbDeal` now carries an explicit `DbDealTerms` contract instead of relying on an untyped activation blob alone
- shared active-room term helpers now define the canonical way to build and read:
  - `activation_source`
  - `offer_id`
  - `deposit_window_hours`
  - `deposit_deadline_at`
  - `activated_at`
- offer-to-deal creation now uses the shared active-room contract builder
- seeded mock runtime now uses the same builder for the primary demo corridor
- the active Deal Room now reads originating offer and deposit-window metadata through shared helpers instead of raw indexing
- targeted tests now validate both the helper contract and the offer/deal integration that depends on it

Phase Q targeted validation:

- `npm test -- src/lib/deals/terms.test.ts src/lib/integration/offer-routes.test.ts src/app/api/demo/reset/route.test.ts src/lib/integration/ui-acceptance.test.ts`: passing
- `git diff --check -- docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md web/src/lib/db/types.ts web/src/lib/deals/terms.ts web/src/lib/deals/terms.test.ts web/src/lib/offers/helpers.ts web/src/lib/db/mock-store.ts web/src/app/deals/[dealId]/page.tsx web/src/lib/integration/offer-routes.test.ts web/src/lib/integration/ui-acceptance.test.ts`: passing aside from expected LF/CRLF warnings in the working copy

## Phase R Opening Snapshot

Phase R exists to consolidate the semantic meaning of the existing escrow statuses without renaming the status system or reopening broad lifecycle design.

Why this phase is next:

- the offer-to-room contract is now explicit
- but runtime code still duplicates status meaning with scattered arrays and repeated comparisons
- that creates unnecessary risk before any deeper lifecycle rename or expansion

Phase R objective:

- define shared semantic helpers for the current escrow statuses
- apply those helpers to the narrowest high-value runtime consumers
- align the escrow state-machine doc so it clearly starts after mutual room activation

Authorized scope for Phase R:

- status semantics helpers for the existing `DealStatus` values
- active Deal Room semantic cleanup
- one or two narrow backend consumers that currently duplicate pre-lock logic
- targeted tests around the consolidated semantics
- narrow doc alignment in `docs/08_ESCROW_STATE_MACHINE.md`

Not in scope for Phase R:

- renaming the escrow status vocabulary across the repo
- adding new states or new business branches
- Stellar execution redesign
- broad frontend redesign
- production persistence redesign

Delivered outcomes for Phase R:

- the existing `DealStatus` lifecycle now has shared semantic helpers for:
  - funding window
  - pre-lock
  - post-lock
  - post-proof
  - closed
  - terminal
- the active Deal Room now consumes shared lifecycle semantics instead of repeating several raw status arrays
- the refund route now uses the shared pre-lock semantic instead of a local hand-maintained array
- the execution coordinator now uses the same shared pre-lock semantic when deriving refund-related reputation outcomes
- `docs/08_ESCROW_STATE_MACHINE.md` now states explicitly that offer, negotiation, and mutual `Open Deal Room` happen before the escrow machine begins
- a dedicated escrow semantics test now protects the shared classification layer without changing the underlying transition behavior

Phase R targeted validation:

- `npm test -- src/lib/escrow/state-machine.test.ts src/lib/integration/integration.test.ts src/lib/integration/ui-acceptance.test.ts src/lib/stellar/server/deal-execution-coordinator.test.ts`: passing
- `git diff --check -- docs/08_ESCROW_STATE_MACHINE.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md web/src/lib/escrow/state-machine.ts web/src/lib/escrow/state-machine.test.ts web/src/app/deals/[dealId]/page.tsx web/src/components/deal/DealActions.tsx web/src/app/api/deals/[dealId]/refund/route.ts web/src/lib/stellar/server/deal-execution-coordinator.ts`: passing aside from expected LF/CRLF warnings in the working copy

## Phase S Opening Snapshot

Phase S exists to remove one narrow historical status contradiction that still survives outside the canonical escrow machine: the orphaned `ACCEPTED` success state.

Why this phase is next:

- the runtime and state machine already treat successful completion as `COMPLETED`
- but a small legacy/frontend-facing slice still exposes `ACCEPTED`
- that makes the status vocabulary look larger and less disciplined than the actual product behavior

Phase S objective:

- remove the stale `ACCEPTED` success state from the narrow surfaces still carrying it
- keep terminal success vocabulary consistently `COMPLETED`
- avoid any broad lifecycle rename while doing so

Authorized scope for Phase S:

- narrow doc cleanup in `docs/08_ESCROW_STATE_MACHINE.md`
- narrow legacy/frontend type cleanup
- `StatusPill` cleanup
- one tiny targeted validation slice if needed

Not in scope for Phase S:

- broad escrow status renaming
- adding or redesigning lifecycle states
- Deal Room redesign
- Stellar execution redesign
- broader domain-spec cleanup

Delivered outcomes for Phase S:

- the orphaned `ACCEPTED` success state has been removed from the narrow legacy/frontend-facing surfaces touched in this phase
- `web/src/lib/types.ts` now aligns its escrow status vocabulary with canonical `DealStatus` instead of carrying an extra historical success term
- `StatusPill` now treats `COMPLETED` as the canonical terminal success label without exposing `ACCEPTED`
- `docs/08_ESCROW_STATE_MACHINE.md` no longer lists `ACCEPTED` as part of the active escrow machine
- a tiny focused `StatusPill` test now protects the cleaned success vocabulary on the UI surface

Phase S targeted validation:

- `npm test -- src/components/ui/StatusPill.test.tsx src/lib/escrow/state-machine.test.ts src/lib/integration/ui-acceptance.test.ts`: passing
- `rg -n "ACCEPTED" docs/08_ESCROW_STATE_MACHINE.md web/src/lib/types.ts web/src/components/ui/StatusPill.tsx web/src/components/ui/StatusPill.test.tsx`: no matches
- `git diff --check -- docs/08_ESCROW_STATE_MACHINE.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md web/src/lib/types.ts web/src/components/ui/StatusPill.tsx web/src/components/ui/StatusPill.test.tsx`: passing aside from expected LF/CRLF warnings in the working copy

## Phase T Opening Snapshot

Phase T exists to align the boundary Stellar/Soroban technical spec with the actual current contract source and the canonical runtime lifecycle vocabulary.

Why this phase is next:

- narrow frontend-facing status vocabulary is already cleaner
- but `docs/06_STELLAR_SOROBAN_SPEC.md` is still a source-of-truth technical doc
- that doc must be honest about what the current contract really contains and emits

Phase T objective:

- align `docs/06_STELLAR_SOROBAN_SPEC.md` with the current contract source
- distinguish historical placeholder enum entries from active lifecycle truth if needed
- keep runtime completion vocabulary clearly centered on `COMPLETED`

Authorized scope for Phase T:

- `docs/06_STELLAR_SOROBAN_SPEC.md`
- execution-doc synchronization only
- docs-only validation

Not in scope for Phase T:

- contract source edits
- runtime edits
- broader domain doc rewrites
- lifecycle redesign

Delivered outcomes for Phase T:

- `docs/06_STELLAR_SOROBAN_SPEC.md` now distinguishes current contract truth from active runtime lifecycle truth more honestly
- the spec now keeps the current contract enum visible as-is, while explicitly labeling `Created` and `Accepted` as historical placeholders in the current implementation path
- the spec now lists the events the current contract actually emits, such as `EscrowCompleted` and `EscrowRefunded`
- the spec now explicitly states that the current Tier A success path transitions directly from `Delivered` to `Completed`
- the spec now explicitly states that there is no separate active `Accepted` runtime state in the current Tier A path

Phase T docs-only validation:

- `git diff --check -- docs/06_STELLAR_SOROBAN_SPEC.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`: passing aside from expected LF/CRLF warnings in the working copy
- `rg -n "Accepted|EscrowCompleted|DeliveryAccepted|PaymentReleased|RefundIssued|TransactionCompleted|Created" docs/06_STELLAR_SOROBAN_SPEC.md contracts/settleway_escrow/src/lib.rs`: reviewed and aligned intentionally
- no runtime, build, or contract execution claims were rerun in this phase

## Phase U Opening Snapshot

Phase U exists to decide whether the historical placeholder entries still present in contract source should be removed now, or preserved for artifact and provenance stability.

Why this phase is next:

- the runtime and docs are now honest about current lifecycle truth
- the contract source still contains historical placeholder enum entries
- changing contract source may invalidate existing artifact and deployed-hash evidence already recorded in the repository

Phase U objective:

- make an explicit yes/no decision on contract-source cleanup now
- ground that decision in existing repository evidence
- prevent future sessions from guessing whether source cleanup is safe

Authorized scope for Phase U:

- execution-doc decision recording only
- evidence review against current contract source, artifact freeze, and historical deployment evidence

Not in scope for Phase U:

- contract source edits
- runtime edits
- rebuilds
- fresh deployment or smoke work

Delivered outcomes for Phase U:

- the current decision is **no contract-source cleanup now**
- the decision is grounded in repository evidence that already treats the current contract source as an artifact-bearing baseline:
  - `docs/25_TESTNET_CONTRACT_ARTIFACT.md` records a canonical Wasm SHA-256 for the current contract source lineage
  - `docs/23_CURRENT_HANDOFF.md` records a historical deployed contract id and states the deployed code matched the canonical local Wasm hash
  - `docs/32_PHASE_7_ACCEPTANCE_DECISION.md` records deployed Wasm identity as accepted evidence
- the placeholder entries still present in `contracts/settleway_escrow/src/lib.rs` are therefore treated as **stale but frozen** rather than **safe to remove immediately**
- future contract-source cleanup is explicitly deferred until a separately authorized phase that is willing to:
  - change contract source
  - invalidate the current canonical artifact identity
  - rebuild and retest the contract
  - freeze a new artifact hash
  - capture fresh deployment and initialization evidence if a new deployment becomes relevant

Phase U docs-only validation:

- `git diff --check -- docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`: passing aside from expected LF/CRLF warnings in the working copy
- evidence review used:
  - `contracts/settleway_escrow/src/lib.rs`
  - `docs/23_CURRENT_HANDOFF.md`
  - `docs/25_TESTNET_CONTRACT_ARTIFACT.md`
  - `docs/32_PHASE_7_ACCEPTANCE_DECISION.md`
- no runtime, build, contract test, or deployment command was rerun in this phase

## Phase V Opening Snapshot

Phase V exists to remove the remaining visible corridor mismatches across the exact surfaces a founder, judge, or early user is most likely to read in sequence.

Why this phase is next:

- the core corridor is already present in the product and docs
- the seeded offer-to-room path already exists
- a few founder-facing navigation and continuity cues still make the flow feel less deliberate than it should

Phase V objective:

- align landing-page framing, demo-dashboard navigation, offer-thread commitment cues, active-room continuity, and the demo script
- keep the work narrow, presentation-facing, and truthfully MVP-scoped

Latest in-progress local refinement inside Phase V:

- `/offers/new` now separates recorded chat from structured deal terms instead of treating the first message as the only visible pre-room action
- draft terms now include editable volume, price, and special notes
- the offer thread now requires counterparty `Accept Offer` before either side can begin the mutual `Open Deal Room` gate
- `Open Deal Room` remains the final two-sided activation step and still starts the deposit window only after both participants click it
- latest local refinement removes the detached-looking submit page behavior so `/offers/new` now reads more like the same negotiation workspace that continues at `/offers/[offerId]`
- latest local refinement also moves `Submit Offer` and `Accept Offer` into the `Deal Terms` panel, leaving chat as communication only

Authorized scope for Phase V:

- `web/src/app/page.tsx`
- `web/src/app/demo/page.tsx`
- `web/src/app/offers/[offerId]/page.tsx`
- `web/src/app/deals/[dealId]/page.tsx`
- `docs/11_DEMO_SCRIPT.md`
- `docs/03_FRONTEND_SPEC.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`
- closely related narrow tests

Not in scope for Phase V:

- new business logic
- new transaction states
- repository or Stellar architecture changes
- broad copy sweeps outside the named corridor surfaces

Opening audit findings for Phase V:

- the demo dashboard still lacks the strongest quick jumps for the new corridor, especially the seeded negotiation thread and the seeded active room
- the offer thread is directionally correct, but its navigation and activation framing can still guide the operator more explicitly
- the active Deal Room already preserves negotiation continuity, but some route cues still feel disconnected from the offer-thread-first story
- the demo script should stay synchronized with any founder-facing runtime wording tightened in this slice

## Phase V Completion Snapshot

Phase V tightened the visible demo corridor so the operator can move through the founder-authorized story with fewer narrative jumps and less route confusion.

Delivered outcomes:

- the demo dashboard quick jumps now include the seeded notifications inbox, negotiation thread, and active Deal Room in corridor order
- the dashboard start CTA now states clearly that it begins from the landing page
- the landing page public surface now removes hackathon/demo-facing labels in favor of more product-grade trust language
- the landing page now uses the approved trust statement `Settleway transactions are protected by escrow logic and recorded on Stellar.`
- the landing page lower CTA section now presents Settleway as one transaction workspace instead of an internal demo entry point
- the shared footer no longer exposes hackathon-style honesty copy on the public surface
- the offer thread now provides stronger navigation back to the source listing and clearer wording that the second confirmed `Open Deal Room` click activates the room and starts the funding window
- the `/offers/new` page now frames `Submit Offer` as the start of a shared negotiation conversation rather than a one-shot proposal form
- the negotiation starter now previews the first message inside a conversation-style panel before the thread is created
- the `/offers/new` composer has since been tightened further so the chat area now feels more like a natural direct-message surface, with `Send` as the primary action and less system-style framing inside the conversation panel
- the `/offers/[offerId]` thread now reads more like a buyer-seller chat panel, with clearer shared-conversation framing and more DM-like message bubbles
- the active Deal Room now links back to the recorded negotiation thread and visibly states that it was activated from recorded negotiation
- the user-facing `Submit Offer` CTA inside the offer composer is now consistently in English
- the demo script and frontend-facing docs now describe those same visible corridor cues more explicitly

Phase V targeted validation:

- `npm test -- src/app/demo/page.test.tsx src/app/offers/[offerId]/page.test.tsx src/components/offers/CreateOfferComposer.test.tsx src/lib/integration/ui-acceptance.test.ts`: passing
- `npm.cmd test -- src/app/page.test.tsx src/lib/integration/ui-acceptance.test.ts`: passing
- `npm.cmd test -- src/components/offers/CreateOfferComposer.test.tsx src/app/offers/new/page.test.tsx src/app/offers/[offerId]/page.test.tsx src/lib/integration/ui-acceptance.test.ts`: passing
- `git diff --check -- docs/03_FRONTEND_SPEC.md docs/11_DEMO_SCRIPT.md docs/19_SCREEN_LEVEL_FRONTEND_PRD.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md web/src/app/demo/page.tsx web/src/app/demo/page.test.tsx web/src/app/offers/[offerId]/page.tsx web/src/app/offers/[offerId]/page.test.tsx web/src/app/deals/[dealId]/page.tsx web/src/components/offers/CreateOfferComposer.tsx web/src/components/offers/CreateOfferComposer.test.tsx web/src/lib/integration/ui-acceptance.test.ts`: passing aside from expected LF/CRLF warnings in the working copy
- `git diff --check -- docs/03_FRONTEND_SPEC.md docs/19_SCREEN_LEVEL_FRONTEND_PRD.md web/src/app/offers/new/page.tsx web/src/app/offers/new/page.test.tsx web/src/app/offers/[offerId]/page.tsx web/src/app/offers/[offerId]/page.test.tsx web/src/components/offers/CreateOfferComposer.tsx web/src/components/offers/CreateOfferComposer.test.tsx web/src/components/offers/NegotiationComposer.tsx web/src/lib/integration/ui-acceptance.test.ts`: passing aside from expected LF/CRLF warnings in the working copy

## Phase D Completion Snapshot

Phase D changed the post-lock corridor so the room now communicates the happy path from lock through settlement more clearly.

Delivered outcomes:

- the room now shows a protected execution timeline for `LOCKED -> PROOF_SUBMITTED -> DELIVERED -> COMPLETED`
- room events now carry human-readable messages and useful metadata for lock, proof, delivery, and completion
- proof submission now records proof-hash context into the room event trail
- delivery marking is now seller-only at the route layer
- post-lock actions now show role-aware waiting guidance instead of generic action availability
- the proof area now surfaces recorded proof hash context more clearly
- the room now shows a success settlement summary aligned with the founder-authorized money model
- second-deposit lock now records an explicit `escrow_locked` event for downstream trust narration

Main code areas touched for Phase D:

- `web/src/app/deals/[dealId]/page.tsx`
- `web/src/components/deal/DealActions.tsx`
- `web/src/components/deal/EvidenceSubmitter.tsx`
- `web/src/app/api/deals/[dealId]/buyer-deposit/route.ts`
- `web/src/app/api/deals/[dealId]/seller-deposit/route.ts`
- `web/src/app/api/deals/[dealId]/submit-proof/route.ts`
- `web/src/app/api/deals/[dealId]/mark-delivered/route.ts`
- `web/src/app/api/deals/[dealId]/accept-delivery/route.ts`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `web/src/lib/integration/integration.test.ts`
- `web/src/lib/integration/route-evidence.test.ts`

## Phase E Completion Snapshot

Phase E tightened the non-happy-path corridor so refund, expiry, and reputation outcomes are legible inside the room and on profile surfaces without overclaiming dispute automation.

Delivered outcomes:

- pre-lock `expire` and `refund` room events now carry outcome-specific messages and metadata for refund target, penalty target, and no-slashing-before-lock framing
- the Deal Room now explains refunded and expired outcomes with direct buyer/seller consequence summaries
- the room now distinguishes true no-funding expiry from refunded-before-lock outcomes so the operator can narrate `EXPIRED` versus `REFUNDED` honestly in demo mode
- the room now shows a dedicated outcome/dispute card so post-lock dispute handling is framed honestly as operator-reviewed evidence continuity rather than automated judgment
- action controls in the room now respect viewer role more strictly while preserving the founder-authorized refund and expiry demo paths
- participant reputation shown inside the room now reflects recorded outcome events instead of only static demo seed values
- profile pages now show recent verified reputation outcomes and explicit dispute honesty language
- Phase E UI acceptance tests now cover refund outcome narration and profile-level outcome visibility
- Phase E integration tests now verify refund/expiry event metadata alongside the existing reputation hooks

Main code areas touched for Phase E:

- `web/src/components/deal/DealActions.tsx`
- `web/src/app/api/deals/[dealId]/expire/route.ts`
- `web/src/app/api/deals/[dealId]/refund/route.ts`
- `web/src/app/deals/[dealId]/page.tsx`
- `web/src/app/profiles/[userId]/page.tsx`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `web/src/lib/integration/integration.test.ts`

## Validation Snapshot

Phase E targeted validation:

- `npm test -- src/lib/integration/ui-acceptance.test.ts src/lib/integration/integration.test.ts src/lib/integration/route-evidence.test.ts`: passing
- targeted ESLint on Phase E files: passing
- rerun against the current working tree on 2026-06-16: still passing

Latest frozen validation:

- full Vitest suite: passing
  - `39` test files
  - `663` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: blocked by pre-existing repo-wide historical type errors and typed-test debt outside the active runtime slice
  - the active Phase E integration files were cleaned so they no longer contribute new TypeScript failures
- Next.js production build: still blocked during production data collection because persistent runtime mode refuses MockStore fallback when Supabase config is absent
  - latest observed failure path: `/api/deals/[dealId]`
  - treat this as a repo-wide runtime/build blocker until the production-mode repository contract is resolved honestly

## Phase F Completion Snapshot

Phase F consolidated the trust story across profile and demo-facing surfaces so the MVP presents itself more clearly as one product.

Delivered outcomes:

- profile pages now read as trust passports rather than thin score panels
- proof visibility and outcome-backed reputation rules are more explicit on profile surfaces
- recent verified outcomes now reinforce role context and trust framing more directly
- the landing page now ties discovery, trust review, commitment, lock, and reputation into one clearer narrative
- the guided demo dashboard now follows the founder-authorized corridor more closely and calls out trust checkpoints explicitly
- the written demo script now matches the post-Phase-B product story instead of implying a direct jump into Deal Room activation

Main code and doc areas touched for Phase F:

- `web/src/app/profiles/[userId]/page.tsx`
- `web/src/app/page.tsx`
- `web/src/app/demo/page.tsx`
- `web/src/app/demo/page.test.tsx`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `docs/11_DEMO_SCRIPT.md`

Phase F targeted validation:

- `npm test -- src/app/demo/page.test.tsx src/lib/integration/ui-acceptance.test.ts`: passing
- targeted ESLint on Phase F files: passing

Phase F frozen validation:

- full Vitest suite: passing
  - `39` test files
  - `664` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
- Next.js production build: still blocked by the same persistent-mode Supabase failsafe
  - latest observed failure path after Phase F: `/api/deals/[dealId]/buyer-deposit`

## Phase G Completion Snapshot

Phase G removed several remaining naming and UX copy contradictions so the visible product vocabulary is more consistent across the main user path.

Delivered outcomes:

- the most important CTA family is now more consistent across marketplace, offer, notification, and active-room-adjacent surfaces
- offer-thread and active-room naming is more consistent in user-facing labels
- notification surfaces now point users into the `negotiation thread` explicitly rather than using vaguer wording
- active-room commitment controls now use clearer copy for the waiting state
- stale frontend-facing docs now describe `Submit Offer`, offer-thread negotiation, and the legacy `/deals/new` redirect more honestly
- app metadata now reflects the post-Phase-B product story more accurately

Main code and doc areas touched for Phase G:

- `web/src/app/layout.tsx`
- `web/src/app/notifications/page.tsx`
- `web/src/app/offers/[offerId]/page.tsx`
- `web/src/components/offers/OpenDealRoomButton.tsx`
- `web/src/app/marketplace/[listingId]/page.tsx`
- `web/src/app/notifications/page.test.tsx`
- `web/src/components/offers/OpenDealRoomButton.test.tsx`
- `docs/03_FRONTEND_SPEC.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`

Phase G targeted validation:

- `npm test -- src/app/notifications/page.test.tsx src/components/offers/OpenDealRoomButton.test.tsx src/app/demo/page.test.tsx src/lib/integration/ui-acceptance.test.ts`: passing
- targeted ESLint on Phase G files: passing

Phase G frozen validation:

- full Vitest suite: passing
  - `41` test files
  - `668` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
- Next.js production build: still blocked by the same persistent-mode Supabase failsafe
  - latest observed failure path after Phase G: `/api/buyer-requests`

## Phase H Opening Snapshot

Phase H is the next founder-authorized slice. It is intended to consolidate the funding gate experience so the active escrow room explains the dual-rail model, the buyer and seller obligations, and the Stellar trust boundary more clearly.

Planned targets:

- active-room funding rail explanation
- per-party deposit obligation clarity
- deadline and pre-lock consequence visibility
- honest wording for what Stellar verifies versus what remains simulated
- closely related docs and tests only

## Phase H Completion Snapshot

Phase H consolidated the funding gate so the active escrow room now communicates the dual-rail model, per-party obligations, and the Stellar trust boundary more clearly without changing the underlying transaction logic.

Delivered outcomes:

- the active Deal Room now explains `local bank rail` and `crypto wallet rail` as two user-facing paths into the same escrow gate
- buyer and seller funding obligations now make the seriousness and asymmetry of each commitment more explicit
- funding progress, deadline meaning, and pre-lock penalty/refund framing now read more like one coherent workflow
- the room now explains more clearly what remains simulated off-chain versus what the Stellar-backed trust layer verifies
- funding-related action copy now matches the same consolidated room story
- the demo script and frontend-facing specs now reflect the stronger funding/deposit explanation
- targeted acceptance coverage now checks for the dual-rail and funding-verification narrative directly

Main code and doc areas touched for Phase H:

- `web/src/app/deals/[dealId]/page.tsx`
- `web/src/components/deal/DealActions.tsx`
- `web/src/app/demo/page.tsx`
- `web/src/app/demo/page.test.tsx`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `docs/03_FRONTEND_SPEC.md`
- `docs/11_DEMO_SCRIPT.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`

Phase H targeted validation:

- `npm test -- src/lib/integration/ui-acceptance.test.ts src/app/demo/page.test.tsx`: passing
- targeted ESLint on Phase H files: passing

Phase H frozen validation:

- full Vitest suite: passing
  - `41` test files
  - `668` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
  - examples remain in `src/lib/evidence/verification.test.ts`, `src/lib/repositories/index.test.ts`, and several `src/lib/stellar/**` historical test files
- Next.js production build: still blocked by the same persistent-mode Supabase failsafe
  - latest observed failure path after Phase H: `/api/buyer-requests`

## Phase I Opening Snapshot

Phase I is the next founder-authorized slice. It is intended to make Settleway trust feel more cumulative and legible by strengthening the profile-level reputation ledger, proof visibility framing, and blockchain-backed verification story.

Planned targets:

- profile-level reputation ledger clarity
- stronger explanation of verified outcomes and protected volume
- clearer public-versus-private proof visibility framing
- honest blockchain-backed verification narrative for reputation
- closely related docs and tests only

## Phase I Completion Snapshot

Phase I strengthened the trust layer so profile surfaces now read more like a real reputation ledger backed by protected transaction history rather than a thin score summary.

Delivered outcomes:

- profile surfaces now explain reputation as a ledger of verified outcomes rather than generic profile polish
- completed outcomes, neutral refunds, and failed funding incidents are easier to scan at a glance
- public versus private proof visibility now feels more concrete and operational
- recent ledger entries now explain whether transaction/proof references are publicly visible, withheld, or simply not yet exposed
- public profiles can surface linked transaction and proof references more directly when the protected room has them available
- trust-facing docs and acceptance coverage now reflect the stronger reputation and verification narrative

Main code and doc areas touched for Phase I:

- `web/src/app/profiles/[userId]/page.tsx`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `docs/03_FRONTEND_SPEC.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`

Phase I targeted validation:

- `npm test -- src/lib/integration/ui-acceptance.test.ts`: passing
- targeted ESLint on Phase I files: passing

Phase I frozen validation:

- full Vitest suite: passing
  - `41` test files
  - `669` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
  - examples remain in `src/lib/evidence/verification.test.ts`, `src/lib/repositories/index.test.ts`, and several `src/lib/stellar/**` historical test files
- Next.js production build: still blocked by the same persistent-mode Supabase failsafe
  - latest observed failure path after Phase I: `/api/deals/[dealId]/expire`

## Phase J Opening Snapshot

Phase J is the next founder-authorized slice. It is intended to make the active Deal Room feel more polished and easier to narrate by strengthening room communication, evidence readability, and operator/demo clarity.

Planned targets:

- clearer room-state communication
- stronger evidence and proof readability
- more legible room chronology and trust continuity
- better operator/judge narration cues inside the room
- closely related docs and tests only

## Phase J Completion Snapshot

Phase J polished the active Deal Room so room chronology, evidence readability, and operator-facing narration cues now feel more deliberate without changing the underlying transaction behavior.

Delivered outcomes:

- the room chronology now explains itself more clearly with stronger room-event guidance
- the delivery and proof area now communicates evidence state, anchoring state, and operator demo cues more directly
- evidence records now expose visibility, submitter identity, and anchoring status in a more readable form
- proof-hash framing now ties the evidence record back to the protected room chronology more clearly
- evidence-related honesty language is stronger and easier to narrate during demo mode
- trust-facing docs and acceptance coverage now reflect the more polished Deal Room communication/evidence experience

Main code and doc areas touched for Phase J:

- `web/src/app/deals/[dealId]/page.tsx`
- `web/src/components/deal/EvidenceSubmitter.tsx`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `docs/03_FRONTEND_SPEC.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`

Phase J targeted validation:

- `npm test -- src/lib/integration/ui-acceptance.test.ts`: passing
- targeted ESLint on Phase J files: passing

Phase J frozen validation:

- full Vitest suite: passing
  - `41` test files
  - `670` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
  - examples remain in `src/lib/evidence/verification.test.ts`, `src/lib/repositories/index.test.ts`, and several `src/lib/stellar/**` historical test files
- Next.js production build: still blocked by the same persistent-mode Supabase failsafe
  - latest observed failure path after Phase J: `/api/deals`

## Phase K Opening Snapshot

Phase K is the next founder-authorized slice. It is intended to make marketplace and buyer-request discovery surfaces feel more serious and trust-aware by strengthening counterparty credibility cues, proof expectations, and continuity into `Submit Offer`.

Planned targets:

- marketplace trust communication
- listing-detail seriousness and proof expectation clarity
- buyer-request trust framing
- stronger discovery-to-offer continuity
- closely related docs and tests only

## Phase K Completion Snapshot

Phase K aligned the discovery layer more closely with the founder-authorized trust story so marketplace and buyer-request entry points now feel more serious, trust-aware, and connected to recorded negotiation.

Delivered outcomes:

- marketplace cards now surface stronger seller trust signals before detail-page navigation
- discovery now includes a third demo listing so the marketplace reads more like a real board than a stub
- listing detail pages now explain why a counterparty looks credible before `Submit Offer`
- proof expectations and offer-flow continuity are clearer on listing detail
- buyer-request cards now surface stronger procurement trust signals and clearer continuity into recorded negotiation
- discovery-facing docs and acceptance coverage now reflect the stronger trust and seriousness framing

Main code and doc areas touched for Phase K:

- `web/src/app/marketplace/page.tsx`
- `web/src/app/marketplace/[listingId]/page.tsx`
- `web/src/app/buyer-requests/page.tsx`
- `web/src/lib/demo/demo-data.ts`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `docs/03_FRONTEND_SPEC.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`

Phase K targeted validation:

- `npm test -- src/lib/integration/ui-acceptance.test.ts`: passing
- targeted ESLint on Phase K files: passing

Phase K frozen validation:

- full Vitest suite: passing
  - `41` test files
  - `673` tests
- full ESLint: passing
- TypeScript `npx tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
  - examples remain in `src/lib/evidence/verification.test.ts`, `src/lib/repositories/index.test.ts`, and several `src/lib/stellar/**` historical test files
- Next.js production build: still blocked by the same persistent-mode Supabase failsafe
  - latest observed failure path after Phase K: `/api/deals/[dealId]/buyer-deposit`

## Phase L Opening Snapshot

Phase L is the next founder-authorized slice. It is intended to make the founder-facing entry corridor feel more convincing during presentation by refining the landing page, the demo dashboard, and the supporting demo script without changing the implemented transaction logic.

Planned targets:

- landing-page pitch clarity
- demo dashboard presentation flow
- stronger continuity from trade problem to trust corridor
- concise founder/judge narration that matches the live product
- closely related docs and tests only

## Phase L Completion Snapshot

Phase L refined the founder-facing entry corridor so the landing page and guided demo dashboard now present Settleway as a more coherent product story without changing transaction logic.

Delivered outcomes:

- the landing page now frames Settleway more clearly as disciplined agricultural trade infrastructure rather than a generic crypto or marketplace pitch
- the landing page now explains the trust problem, the six-step corridor, and the Stellar trust layer in a more presentation-ready sequence
- the guided demo dashboard now behaves more like an operator cockpit with quick route jumps, a clearer presentation route, and stronger talk-track anchors
- the demo dashboard now carries sharper honesty boundaries for simulated bank rails, Stellar visibility, and non-automated dispute review
- the written demo script and frontend-facing specs now match the refined founder pitch language more closely
- landing/demo-focused test coverage now verifies the tighter corridor narrative directly

Main code and doc areas touched for Phase L:

- `web/src/app/page.tsx`
- `web/src/app/page.test.tsx`
- `web/src/app/demo/page.tsx`
- `web/src/app/demo/page.test.tsx`
- `web/src/lib/integration/ui-acceptance.test.ts`
- `docs/03_FRONTEND_SPEC.md`
- `docs/11_DEMO_SCRIPT.md`
- `docs/19_SCREEN_LEVEL_FRONTEND_PRD.md`

Phase L targeted validation:

- `npm.cmd test -- src/app/page.test.tsx src/app/demo/page.test.tsx src/lib/integration/ui-acceptance.test.ts`: passing
- targeted ESLint on Phase L files: passing

Phase L frozen validation:

- full Vitest suite: passing
  - `42` test files
  - `676` tests
- full ESLint: passing
- TypeScript `npx.cmd tsc --noEmit`: still blocked by the same pre-existing repo-wide historical type errors outside the active runtime slice
  - examples remain in `src/lib/evidence/verification.test.ts`, `src/lib/repositories/index.test.ts`, and several `src/lib/stellar/**` historical test files
- Next.js production build: blocked in the current restricted environment because Next.js attempted to fetch Google Font `Inter`
  - latest observed failure path after Phase L: `src/app/layout.tsx`
  - latest observed build-time error: `Failed to fetch Inter from Google Fonts`

## Phase M Opening Snapshot

Phase M is the next founder-authorized slice. It is intended to align the repository-facing narrative with the now-implemented founder-authorized Settleway story by refining the README and the minimum onboarding entry docs that a new reader is likely to trust first.

Planned targets:

- README positioning clarity
- canonical corridor alignment in public repo narrative
- clearer MVP honesty boundaries for new readers
- removal of obsolete direct-to-Deal-Room cues from onboarding entry docs
- execution-doc synchronization only

## Phase M Completion Snapshot

Phase M aligned the repository-facing narrative so a new reader now sees a more current and disciplined Settleway story from the README and onboarding entry docs without touching runtime implementation.

Delivered outcomes:

- `README.md` now positions Settleway more clearly as a high-value agricultural trade trust product rather than a generic crypto or marketplace demo
- the README now foregrounds the canonical corridor, mutual commitment gate, dual-rail trust model, Stellar role, and MVP honesty boundaries in a more professional order
- the onboarding blueprint no longer jumps directly from discovery into Deal Room activation and now reflects the recorded-negotiation and mutual-commitment steps
- the onboarding blueprint now clarifies that the historical escrow action table describes the active-room execution layer, not the entire founder-authorized product corridor
- the historical handoff now more clearly identifies itself as non-authoritative for the live mission

Main doc areas touched for Phase M:

- `README.md`
- `docs/22_ONBOARDING_BLUEPRINT.md`
- `docs/23_CURRENT_HANDOFF.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

Phase M validation:

- `git diff --check -- README.md docs/22_ONBOARDING_BLUEPRINT.md docs/23_CURRENT_HANDOFF.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`: passing
  - Git emitted non-blocking CRLF normalization warnings in the working copy
- content sanity review against `docs/39`, `docs/40`, and `docs/41`: passing
- no runtime source files were changed for this phase
- no frontend/backend tests, lint, typecheck, or build were rerun for this docs-only phase

## Phase N Opening Snapshot

Phase N is the next founder-authorized slice. It is intended to realign the deeper foundational product docs so the blueprint and master PRD no longer preserve the obsolete direct-to-Deal-Room story.

Planned targets:

- `docs/00_PRODUCT_BLUEPRINT.md`
- `docs/01_MASTER_PRD.md`
- correct canonical corridor ordering inside foundational product docs
- stronger consistency around Stellar trust framing and MVP honesty boundaries
- execution-doc synchronization only

## Phase N Completion Snapshot

Phase N realigned the foundational product docs so the blueprint and master PRD now describe the founder-authorized Settleway corridor more faithfully without touching runtime implementation.

Delivered outcomes:

- `docs/00_PRODUCT_BLUEPRINT.md` now positions Settleway as discovery plus negotiation, mutual commitment, protected execution, and outcome-based reputation instead of implying immediate Deal Room activation
- the product blueprint now includes the canonical corridor, mutual commitment gate, dual-rail model, Stellar trust role, and clearer MVP honesty boundaries
- `docs/01_MASTER_PRD.md` now describes the offer and negotiation layer explicitly before the active Deal Room
- the master PRD demo acceptance flow no longer encodes the obsolete `Create/open Deal Room` shortcut and now matches the founder-authorized corridor
- both foundational docs now describe Stellar as trust infrastructure rather than the product headline

Main doc areas touched for Phase N:

- `docs/00_PRODUCT_BLUEPRINT.md`
- `docs/01_MASTER_PRD.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

Phase N validation:

- `git diff --check -- docs/00_PRODUCT_BLUEPRINT.md docs/01_MASTER_PRD.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`: passing
  - Git emitted non-blocking CRLF normalization warnings in the working copy
- content sanity review against `docs/39`: passing
- no runtime source files were changed for this phase
- no frontend/backend tests, lint, typecheck, or build were rerun for this docs-only phase

Phase N intentionally left these contradictions for later phases:

- `docs/02_BUILD_EXECUTION_PLAN.md` still reflects the older direct-to-Deal-Room build progression
- `docs/08_ESCROW_STATE_MACHINE.md` still begins at active escrow and does not yet model the pre-deal negotiation/commitment corridor
- `docs/12_ACCEPTANCE_CRITERIA.md` still reflects the older phase structure and direct Deal Room entry assumptions

## Phase O Opening Snapshot

Phase O is the next founder-authorized slice. It is intended to realign the build-plan and acceptance docs so they no longer teach or measure the obsolete direct-to-Deal-Room corridor.

Planned targets:

- `docs/02_BUILD_EXECUTION_PLAN.md`
- `docs/12_ACCEPTANCE_CRITERIA.md`
- `docs/20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md`
- planning and acceptance language for discovery, negotiation, commitment, deposit, and active room order
- execution-doc synchronization only

## Phase O Completion Snapshot

Phase O realigned the build-plan and acceptance docs so they now measure and sequence the founder-authorized Settleway corridor more faithfully without touching runtime implementation.

Delivered outcomes:

- `docs/02_BUILD_EXECUTION_PLAN.md` now places discovery before offer and negotiation, negotiation before mutual commitment, and mutual commitment before the active Deal Room
- the build execution plan now treats `/deals/new` as a legacy redirect only and positions the Deal Room as the active protected room rather than the first product state
- `docs/12_ACCEPTANCE_CRITERIA.md` now measures the canonical corridor directly instead of only the older phase ladder
- `docs/20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md` now evaluates slices such as discovery, offer/negotiation, mutual commitment, and active Deal Room in the correct order
- the planning/acceptance layer now uses more honest MVP language around fallback, proof, reputation, and guided demo coherence

Main doc areas touched for Phase O:

- `docs/02_BUILD_EXECUTION_PLAN.md`
- `docs/12_ACCEPTANCE_CRITERIA.md`
- `docs/20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

Phase O validation:

- `git diff --check -- docs/02_BUILD_EXECUTION_PLAN.md docs/12_ACCEPTANCE_CRITERIA.md docs/20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`: passing
  - Git emitted non-blocking CRLF normalization warnings in the working copy
- content sanity review against `docs/39`, `docs/00`, and `docs/01`: passing
- no runtime source files were changed for this phase
- no frontend/backend tests, lint, typecheck, or build were rerun for this docs-only phase

Phase O intentionally left these contradictions for later phases:

- `docs/08_ESCROW_STATE_MACHINE.md` still begins at active escrow and does not yet model the pre-deal negotiation/commitment corridor
- `docs/18_FILE_CREATION_MAP.md` remains historical and may still encode the older direct-to-Deal-Room progression

## Manual Browser Validation

Phase D manual browser validation: passing

Verified local active room route:

- `http://localhost:3000/deals/demo-cabai-001`

Verified visible post-lock signals:

- `Protected Execution Timeline`
- `Room Events`
- explicit `Escrow Locked` milestone
- proof submission CTA and recorded proof-hash context
- `Success Settlement Summary`
- completion event text after buyer acceptance

Manual happy-path progression verified locally through authenticated demo-mode actions:

- buyer deposit
- seller deposit
- proof submission
- seller delivery mark
- buyer acceptance

## Phase E Local Runtime Verification

Phase E local runtime verification: passing

Verified against a live local Next dev server in demo mode:

- reset demo state through `/api/demo/reset`
- `buyer_deposit -> expire` on `demo-cabai-001`
  - room shows `Refund outcome recorded`
  - room explains buyer full refund and seller reputation penalty
  - seller profile shows `Recent Verified Outcomes` with `Seller Failed Deposit` and score `-3`
- `buyer_deposit -> seller_deposit` on `demo-cabai-001`
  - room shows `Escrow locked`
  - room shows `Dispute Handling Placeholder`
  - room explicitly says the MVP does not auto-decide fault

## Next Required Action

The next session should:

1. read `docs/39`, `docs/40`, and `docs/41`
2. audit actual repo state from Git
3. read `docs/42_SETTLEWAY_SALVAGE_AUDIT.md`
4. read `docs/44_PHASE_X_IMPLEMENTATION_PLAN.md`
5. read `docs/45_PHASE_Y_IMPLEMENTATION_PLAN.md`
6. preserve the completed pre-deal architecture from Phase B, the funding-room clarity from Phase C, the post-lock settlement corridor from Phase X, the failure/outcome slice from Phase E, the trust/demo consolidation work from Phases F through V, and the source-of-truth doc realignment already completed
7. preserve the implemented Phase W and Phase X runtime path without rewriting it opportunistically
8. preserve the now-wired public runtime config and do not remove it unless a safer local operator path replaces it
9. preserve the frozen Phase Y payout-destination slice exactly as implemented unless the founder explicitly reopens it
10. do not promote a new active phase until the founder authorizes the next contract freeze
11. stop if the work tries to spill into wallet-connect, bank payout claims, or arbitrary-address settlement redesign beyond the approved active phase

## No-Touch Boundary For Next Session

Until the founder promotes the next phase, do not:

- redesign the completed pre-deal offer and notification layer
- reopen the completed happy-path or failure-path room flow beyond what is required for payout-destination truth
- rewrite settlement and dispute logic broadly
- rewrite Soroban contract behavior for arbitrary payout destinations
- expand into bank-local payout implementation, QRIS, or anchor integration
- add end-user wallet connect
- turn the product into a generic wallet dashboard
- rewrite domain specs opportunistically outside the new phase boundary

## Short Command For Future Sessions

If the founder says:

`continue under the active phase contract`

the agent must:

1. read `docs/39`, `docs/40`, and `docs/41`
2. check branch, HEAD, and working tree
3. state the active phase, scope, and no-touch area
4. continue only within that scope

## Phase Y Working Focus

Phase Y now makes the completed Deal Room tell a more truthful payout story by proving that buyer and seller have controlled payout-destination preferences that the room can display and preserve without pretending bank payout or wallet-connect already exists.

Primary targets:

- payout-destination data contract
- seeded buyer and seller destination defaults
- narrow profile or settings destination surface
- completed-room payout route summary
- honest bank-placeholder language

This frozen result strengthens payout-destination truth inside the product without broadening the rest of the product.

## Blockers

There is no blocker for continuing local demo-mode corridor use as-is.

There is no blocker for using the existing synthetic Testnet identities and secure-store signer path as the basis for the next phase.

The next meaningful blockers are:

- any contradiction between the frozen product vocabulary and a wallet-first implementation that starts to feel like a generic crypto app
- any attempt to broaden Phase Y into live bank payout, wallet-connect, or arbitrary-address contract redesign before destination truth is stable
- the current Stellar execution shape still lacks arbitrary external-destination arguments, so deeper payout execution beyond managed demo identities would require explicit re-authorization
- the repo-wide TypeScript debt outside the active runtime slice
- the repo-wide production build/runtime blocker caused by persistent-mode repository failsafe without Supabase configuration
