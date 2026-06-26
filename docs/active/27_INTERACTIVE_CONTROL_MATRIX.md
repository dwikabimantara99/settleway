# Interactive Control Matrix

Date: 2026-06-26
Audit mode: read-only runtime inventory plus targeted real-browser clicks.

## Raw control inventory

| Branch | Routes loaded | Visible controls inventoried | Inventory file |
| --- | ---: | ---: | --- |
| `main` at `2654530d3a5fd2c195d5c68c6e0f324fc9a51f55` | 15 | 305 | `docs/active/product-recovery-audit/runtime/main-route-control-inventory.json` |
| `work/custody-v2-app-integration` at `078a4578979b2bf8d4c0d91425c030275fcbe5ca` | 15 | 308 | `docs/active/product-recovery-audit/runtime/integration-route-control-inventory.json` |
| Combined | 30 | 613 | route inventory JSON files |

The raw count includes repeated shared-layout links, footer links, profile buttons, role switcher controls, form controls, and page-specific CTAs. The JSON files are the complete machine inventory. The table below classifies the product-control groups that were inspected or clicked.

## Product-control group classification

| Area | Control group | Main | Integration | Classification | Evidence |
| --- | --- | --- | --- | --- | --- |
| Public landing | Marketplace dropdown | Click opens dropdown in place | Click opens dropdown in place | Working | `main-click-landing-marketplace-dropdown.png`, `integration-click-landing-marketplace-dropdown.png` |
| Public landing | Explore Marketplace | Navigates to `/marketplace` | Navigates to `/marketplace` | Working | `main-core-clicks.json`, `integration-core-clicks.json` |
| Marketplace | Listing cards / opportunity cards | Route loads; CTA text did not match old audit selector `View Details` | Route loads; CTA text did not match old audit selector `View Details` | Working UI, stale audit selector | `main-_marketplace.png`, `integration-_marketplace.png`, core click target-not-found entry |
| Listing detail | Submit Offer | Link found; CDP clicked but URL sample stayed on source route because the audit did not wait for SPA navigation completion | Same | Needs retest with route-aware wait | `main-core-clicks.json`, `integration-core-clicks.json` |
| Offer thread | Chat and terms controls | Route loads accepted demo offer | Route loads accepted demo offer | Working legacy route | `main-_offers_offer-demo-cabai-001.png`, `integration-_offers_offer-demo-cabai-001.png` |
| Offer thread | Open Deal Room | Leads to active legacy room when offer is already linked | Same | Working legacy route, not Custody V2 | `offer-to-deal-source-trace.txt` |
| Authenticated navbar | Buy | Points to `/marketplace` | Points to `/marketplace` | Working | route inventory JSON |
| Authenticated navbar | Sell | Points to `/buyer-requests` | Points to `/buyer-requests` | Working | route inventory JSON |
| Authenticated navbar | Deals | Points to `/deals/demo-cabai-001` | Points to `/deals/demo-cabai-001` | Broken for V2 product corridor | `source-trace-refs.txt`, `AuthenticatedHeader.tsx` lines 55 and 134 |
| Authenticated navbar | Notification bell | Points to `/notifications` | Points to `/notifications` | Working legacy notifications | route inventory JSON |
| Demo role switcher | Open role switcher | Opens floating role switcher | Opens floating role switcher | Working demo identity control | role switcher screenshots and `RoleSwitcher.tsx` source trace |
| Demo role switcher | Buyer/Seller/Operator actor change | Changes `mock_actor` cookie | Changes `mock_actor` cookie | Working for demo actor only; not a wallet/contract role switch | `RoleSwitcher.tsx` source trace |
| Legacy Deal Room | Fund Buyer Commitment | Button clickable on legacy deal | Button clickable on legacy deal | Working legacy/demo action, not V2 | core click files |
| Legacy Deal Room | Funding/proof/settlement controls | Render legacy room state | Render legacy room state | Working legacy route | deal screenshots |
| Dev Custody V2 setup | Setup page route | 404/no config on main | Loads configured setup on integration | Integration-only, dev-guarded | network summary, setup screenshots |
| Dev Custody V2 setup | Create Custody V2 Deal | Not available on main | API creates fresh V2 deal | Working dev-only setup | `integration-custody-v2-setup-api.json` |
| V2 Deal Room buyer | Create on Stellar | Not applicable | Visible and enabled for buyer before `CREATE_DEAL` | Working state-gated V2 action | `integration-custody-v2-deal-cdp.json` |
| V2 Deal Room seller | Accept terms on Stellar | Not applicable | Not visible before buyer `CREATE_DEAL` confirmation | Correct state gating, poor discoverability | `integration-custody-v2-deal-cdp.json` |
| V2 Deal Room global navigation | Return to V2 deal through Deals nav | Not available | Deals nav exits to legacy `/deals/demo-cabai-001` | Broken product continuity | source trace and V2 deal CDP controls |

## Product-control group counts

These counts classify audited control groups, not every duplicated DOM instance:

| Classification | Count | Notes |
| --- | ---: | --- |
| Working | 11 | Controls/routes that performed their intended current behavior. Several are legacy-current behavior, not V2 behavior. |
| Broken for intended V2 product corridor | 3 | Deals nav to legacy, normal offer-to-deal creation does not assign V2 rail, V2 continuity not reachable from normal nav. |
| State-gated / visually present but intentionally unavailable | 2 | Seller `Accept terms on Stellar` before buyer create confirmation; V2 next actions after no confirmed state. |
| Needs route-aware retest | 1 | Submit Offer CDP click found the link but did not capture client route transition. |
| Stale audit selector, not product failure | 1 | Marketplace `View Details` matcher no longer matched current CTA copy. |

## Route load matrix

| Route | Main | Integration | Notes |
| --- | --- | --- | --- |
| `/` | Loaded | Loaded | Public Aurora landing. |
| `/marketplace` | Loaded | Loaded | Normal marketplace has no visible V2 rail assignment. |
| `/marketplace/listing-cabai-001` | Loaded | Loaded | Submit Offer present. |
| `/buyer-requests` | Loaded | Loaded | Sell-side opportunity flow. |
| `/buyer-requests/req-spice-001` | Loaded | Loaded | Buyer request detail. |
| `/offers/offer-demo-cabai-001` | Loaded | Loaded | Accepted demo offer linked to legacy active deal. |
| `/deals/demo-cabai-001` | Loaded | Loaded | Legacy demo Deal Room on both branches. |
| `/notifications` | Loaded | Loaded | Legacy notification route. |
| `/profiles/buyer-surabaya-restaurant` | Loaded | Loaded | Profile route. |
| `/profiles/buyer-surabaya-restaurant/reputation` | Loaded | Loaded | Reputation route. |
| `/profiles/seller-probolinggo-cabai` | Loaded | Loaded | Profile route. |
| `/demo` | Loaded | Loaded | Demo corridor page. |
| `/dev/deal-state-gallery` | Loaded | Loaded | Development fixture route. |
| `/dev/design-lab` | Loaded | Loaded | Development design route. |
| `/dev/custody-v2-browser-setup` | 404/network failure | Loaded with V2 diagnostics | Main lacks configured V2 setup; integration exposes development-only V2 setup. |
