# Main vs Integration Regression Matrix

Date: 2026-06-26

## Summary

`main` is a coherent Aurora legacy demo baseline. `work/custody-v2-app-integration` adds valuable Custody V2 application primitives and a browser setup gate, but does not integrate that rail into the normal product corridor. The integration branch therefore regresses product coherence even though several V2 technical modules are useful.

## Capability matrix

| Capability | Main `2654530d...` | Integration `078a457...` | Regression / delta |
| --- | --- | --- | --- |
| Aurora landing | Present | Present | No material regression found in this audit. |
| Buy marketplace | Loads | Loads | No material regression found. |
| Sell marketplace / buyer requests | Loads | Loads | No material regression found. |
| Listing detail | Loads | Loads | No material regression found. |
| Submit Offer path | Present | Present | Needs browser wait retest; source still routes normal deal creation through legacy/default rail. |
| Accepted offer route | Loads demo accepted offer | Loads demo accepted offer | No V2 improvement on normal route. |
| Open Deal Room | Legacy demo room | Legacy demo room | Integration branch still defaults normal users to legacy room. |
| Global Deals nav | `/deals/demo-cabai-001` | `/deals/demo-cabai-001` | Critical V2 continuity regression: V2 deal URL is not remembered or surfaced. |
| Role switching | `mock_actor` cookie | `mock_actor` cookie | Existing demo role model remains; does not solve wallet/contract role matching. |
| Custody V2 config diagnostics | Not configured / dev setup route fails | Configured setup route loads | Integration adds useful diagnostic capability. |
| Custody V2 deal creation | Not available | Dev-only API creates `custody_v2_testnet` deal | Useful but not product-integrated. |
| Custody V2 Deal Room labels | Not available | Visible on dev-created deal | Useful but reachable only by generated URL. |
| Buyer `Create on Stellar` | Not available | Visible/enabled on dev-created V2 deal | Useful state-gated action. |
| Seller `Accept terms on Stellar` | Not available | Hidden until buyer create is confirmed | Correct state sequence, but UX needs clearer waiting state. |
| Normal marketplace-to-Custody-V2 path | Not present | Not present | Main and integration both fail the intended final corridor. |
| Existing tests | Pass isolated assumptions | Pass isolated assumptions | Tests do not prove runtime corridor. |

## Regressions introduced or left unresolved on integration branch

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| REG-001 | Critical | Integration does not change normal offer-to-deal creation to `custody_v2_testnet`. | `open-deal-room.ts` creates `deal-${offer.id}`; `helpers.ts` returns no `rail_version`; deal page falls back to `legacy_demo`. |
| REG-002 | Critical | Authenticated `Deals` nav still hard-codes `/deals/demo-cabai-001`. | `AuthenticatedHeader.tsx` lines 55 and 134. |
| REG-003 | High | V2 setup deal is process-local/demo-repository dependent in audit mode, so generated browser URLs are not a durable product entry point. | setup API evidence and repository mock-store source. |
| REG-004 | High | Role semantics are ambiguous between Buy/Sell nav, `mock_actor`, profile wallet, connected Freighter address, and deal participant address. | `RoleSwitcher.tsx`, `auth/server.ts`, `DealActions.tsx`. |
| REG-005 | High | Existing tests cover V2 primitives but not the full two-profile browser corridor. | Source trace of tests and absence of browser E2E proof. |
| REG-006 | Medium | Main also exposes `/dev/custody-v2-browser-setup` route shell but returns 404/network failure without config. | `main-network-summary.json`. |

## What should be salvaged from integration

- Custody V2 public configuration validation and explicit runtime diagnostics.
- Dedicated founder/browser setup concept, but only as a test harness, not product navigation.
- Custody V2 deal link persistence model and canonical terms hash/deal ID freezing.
- DealActions V2 action sequencing: `CREATE_DEAL`, `ACCEPT_TERMS`, funding, evidence, settlement after confirmed states.
- Stellar RPC/event ingestion and direct reconciliation code from the already accepted backend proof work.
- Tests that prove low-level V2 invariants, after expanding them with real product-route browser coverage.

## What should be rebuilt from clean main

- Normal offer-to-deal creation so the selected rail is explicit and correct before the room opens.
- A single Deal Room entry model: no hard-coded legacy room in authenticated navigation.
- Buyer/seller/wallet role copy and state presentation.
- Two-browser-profile acceptance flow with Freighter as an explicit gate.
- Product-level V2 state UI that explains why a seller cannot act before buyer `CREATE_DEAL` is confirmed.

## Bottom line

Do not merge the current integration branch into `main`. Rebase or rebuild the product-facing integration from clean `main`, selectively porting the proven V2 service/repository/contracts/event modules. The branch is technically salvageable, but not safe as a whole product integration.
