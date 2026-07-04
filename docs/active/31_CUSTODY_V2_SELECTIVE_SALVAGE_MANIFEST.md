# Custody V2 Selective Salvage Manifest

Date: 2026-06-27
Recovery branch: `recovery/custody-v2-product-corridor-1`
Quarantined source branch: `origin/work/custody-v2-app-integration`
Rule: no branch merge, no wholesale cherry-pick, no development setup route as a product dependency.

## Salvage Policy

Only proven technical modules may be ported. Product-facing code must be rebuilt around the normal Marketplace -> Offer -> Negotiation -> Open Deal Room corridor. Anything that hard-codes `/deals/demo-cabai-001`, depends on `/dev/custody-v2-browser-setup`, mixes `mock_actor` with wallet financial authority, or silently falls back to `legacy_demo` is not eligible for direct port.

## File-Level Manifest

| Source path at `origin/work/custody-v2-app-integration` | Destination | Classification | Reason | Tests | Limitations / corrections |
| --- | --- | --- | --- | --- | --- |
| `web/src/lib/custody-v2/config.ts` | same path | `PORT_WITH_CORRECTION` | Validates Testnet contract, SAC, policy/interface versions, and fails closed when enabled. | `config.test.ts`, route/config tests | Keep Testnet-only guard; product corridor must show diagnostics without dev setup route dependency. |
| `web/src/lib/custody-v2/config.test.ts` | same path | `PORT_WITH_CORRECTION` | Useful config coverage. | existing + recovery config tests | Add test for recovery env constants and disabled state UX. |
| `web/src/lib/custody-v2/terms.ts` | same path | `COPY_AS_IS` | Canonical `TermsDocumentV1`, deterministic terms hash, and deterministic contract deal ID are core accepted primitives. | `terms.test.ts`, offer-to-deal tests | Inputs must be supplied by normal negotiated terms, not founder setup fixture. |
| `web/src/lib/custody-v2/terms.test.ts` | same path | `PORT_WITH_CORRECTION` | Verifies canonical ordering and validation. | existing + negotiated terms hash test | Extend to cover commercial IDR context separated from XLM obligations. |
| `web/src/lib/custody-v2/links.ts` | same path | `PORT_WITH_CORRECTION` | Freezes app deal to one V2 contract deal link. | repository/link tests | Must reject legacy rail and reject mutation after freeze. |
| `web/src/lib/custody-v2/operations.ts` | same path | `PORT_WITH_CORRECTION` | Implements prepare/submit/confirm boundary and action eligibility. | operation tests, route tests | Restrict Milestone 1 UI/API to `CREATE_DEAL` and `ACCEPT_TERMS`; funding/evidence actions remain deferred. |
| `web/src/lib/custody-v2/operations.test.ts` | same path | `PORT_WITH_CORRECTION` | Existing action eligibility coverage. | updated operation tests | Add buyer/seller role derivation tests and no `mock_actor` authority. |
| `web/src/lib/custody-v2/contract-reader.ts` | same path | `COPY_AS_IS` | Direct contract read is required for confirmation and mismatch detection. | `contract-reader.test.ts` | Use only read methods needed by Milestone 1; no funding UI. |
| `web/src/lib/custody-v2/contract-reader.test.ts` | same path | `COPY_AS_IS` | Protects decoder/read boundary. | existing | None known. |
| `web/src/lib/custody-v2/projection.ts` | same path | `PORT_WITH_CORRECTION` | Applies confirmed chain state to app link. | `projection.test.ts` | Milestone 1 projection ends at `AwaitingFunding`; terminal states documented only. |
| `web/src/lib/custody-v2/projection.test.ts` | same path | `PORT_WITH_CORRECTION` | Existing mismatch tests are useful. | updated projection tests | Add state-to-screen mapping coverage. |
| `web/src/lib/custody-v2/events.ts` | same path | `PORT_WITH_CORRECTION` | Event decoder can support post-submit confirmation evidence. | `events.test.ts` | Use only if needed for confirmation; do not build full indexer UI in this milestone. |
| `web/src/lib/custody-v2/events.test.ts` | same path | `PORT_WITH_CORRECTION` | Protects strict event decoder. | existing | Keep strict; no silent broad decoding. |
| `web/src/lib/db/types.ts` V2 additions | same path | `PORT_WITH_CORRECTION` | Repository must persist rail, immutable participant wallets, terms hash, operations, and contract state. | repository/shared contract tests | Add only fields needed for Milestone 1; avoid unrelated breach/dispute/reputation scope. |
| `web/src/lib/db/mock-store.ts` V2 additions | same path | `PORT_WITH_CORRECTION` | Demo/test repository must persist V2 deal links and operations. | mock adapter tests | Must not default normal V2 deals to legacy; process-local only in demo/test. |
| `web/src/lib/repositories/interfaces.ts` V2 additions | same path | `PORT_WITH_CORRECTION` | Shared repository contract for V2 deal discovery and operations. | shared-contract tests | Keep minimal; no future funding/reputation methods unless already required by ported service. |
| `web/src/lib/repositories/mock-adapter.ts` V2 additions | same path | `PORT_WITH_CORRECTION` | Adapter pass-through for local tests. | mock adapter tests | Same as repository boundary. |
| `web/src/lib/repositories/supabase-adapter.ts` V2 additions | same path | `PORT_WITH_CORRECTION` | Persistent boundary must compile and fail explicitly if schema missing. | typecheck, focused tests where feasible | Do not assume production deployment; migration may be deferred if not part of Milestone 1 acceptance. |
| `web/src/app/api/deals/[dealId]/custody-v2/prepare/route.ts` | same path | `PORT_WITH_CORRECTION` | Required for buyer create and seller accept transaction preparation. | route tests and browser flow | Restrict allowed actions to Milestone 1. |
| `web/src/app/api/deals/[dealId]/custody-v2/submit/route.ts` | same path | `PORT_WITH_CORRECTION` | Required after Freighter signing. | route tests and browser flow | Must not expose signed/unsigned XDR in UI/evidence. |
| `web/src/app/api/deals/[dealId]/custody-v2/confirm/route.ts` | same path | `PORT_WITH_CORRECTION` | Required to confirm chain state and update screen. | route tests and browser flow | Must distinguish pending from confirmed. |
| `web/src/app/api/deals/[dealId]/custody-v2/freeze-terms/route.ts` | none or redesigned route | `REIMPLEMENT` | Freezing must happen in normal offer-to-deal transition, not as an ad hoc API. | offer-to-deal tests | Do not expose as product dependency unless needed behind normal transition. |
| `web/src/lib/custody-v2/browser-corridor.ts` | none | `DO_NOT_PORT` | It creates dev-only deals outside normal product flow. | N/A | Can be read as reference only; prohibited as product dependency. |
| `web/src/app/dev/custody-v2-browser-setup/*` | none | `DO_NOT_PORT` | Hidden/dev setup route caused incoherent product corridor. | N/A | Not allowed in Milestone 1 normal flow. |
| `web/src/components/deal/DealActions.tsx` V2 additions | reimplemented product-specific components | `REIMPLEMENT` | Existing logic is useful conceptually but mixed with legacy presentation and future actions. | state-to-screen tests and browser screenshots | Build Milestone 1 action workspace with only create/accept and deliberate deferred funding copy. |
| `web/src/app/deals/[dealId]/page.tsx` V2 additions | reimplemented in route/page components | `REIMPLEMENT` | Current page is legacy-heavy and has fallback behavior. | state-to-screen and browser tests | V2 page must never silently fallback to legacy once rail is V2. |
| `web/src/components/deal/AuroraFundingDealRoom.tsx` modifications | not direct | `REIMPLEMENT` | Funding UI is out of scope; reuse only visual ideas if needed. | visual/browser tests | Do not show funding buttons in Milestone 1. |
| `web/src/components/layout/AuthenticatedHeader.tsx` from quarantined branch | none | `DO_NOT_PORT` | Contains hard-coded `/deals/demo-cabai-001`. | Deals nav tests | Replace with real `/deals` route from clean main. |
| `docs/active/20-25_*` from quarantined branch | docs references only | `PORT_WITH_CORRECTION` | Useful technical record, but some claims are branch-specific. | doc review | Do not let historical app-integration report override recovery source of truth. |
| `contracts/trade_assurance_v2/testnet/manifest.app-integration-v1.json` | same path if needed | `COPY_AS_IS` | Records accepted application-integration Testnet contract and asset. | doc/config tests | No secrets; manifest only. |
| Audit-only commit `d88c5e1` | already cherry-picked | `COPY_AS_IS` | Required forensic evidence; docs/evidence only. | N/A | Does not affect application source. |

## Reimplemented Modules Required By Recovery

- Wallet participant role resolver: new small reusable module with tests.
- Normal offer-to-V2 deal creation: rework `performOpenDealRoomCommitment` / helpers so both-party open creates explicit `custody_v2_testnet` deal only after wallet binding.
- Deals index route `/deals`: replace hard-coded demo Deal navigation.
- Custody V2 Deal Room state-to-screen renderer for Milestone 1 states.
- Playwright/browser corridor coverage from marketplace, not fixture deal URL.

## No-Port Confirmation

The following are explicitly excluded from production/product dependency in this milestone:

- `/dev/custody-v2-browser-setup` page and API;
- any manually injected repository state flow;
- any route or header link hard-coded to `/deals/demo-cabai-001`;
- any UI where `mock_actor` unlocks Custody V2 financial actions;
- funding, evidence, settlement, breach, dispute, cancellation, and reputation V2 actions.
