# Forensic Product Recovery Audit

Date: 2026-06-26
Branch audited for integration: `work/custody-v2-app-integration`
Audit type: read-only product/runtime/source audit. No application code was repaired, redesigned, merged, or refactored.

## Audited baselines

| Target | SHA | Worktree | Startup mode |
| --- | --- | --- | --- |
| Canonical main | `2654530d3a5fd2c195d5c68c6e0f324fc9a51f55` | `D:\Settleway-audit-main` | `NEXT_PUBLIC_RUNTIME_MODE=demo`, Next dev server on `http://127.0.0.1:3100` |
| Integration branch | `078a4578979b2bf8d4c0d91425c030275fcbe5ca` | `D:\Settleway-audit-integration` | `NEXT_PUBLIC_RUNTIME_MODE=demo`, `NEXT_PUBLIC_CUSTODY_V2_ENABLED=true`, dedicated app-integration contract `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`, native XLM SAC, Next dev server on `http://127.0.0.1:3101` |

Both audit worktrees ran `npm ci` successfully with 0 reported npm vulnerabilities. The in-app browser MCP timed out repeatedly while selecting/listing tabs, so runtime evidence was collected with isolated Microsoft Edge profiles through Chrome DevTools Protocol. Screenshots, console logs, network summaries, route inventories, and source traces are under `docs/active/product-recovery-audit/`.

## Scope actually exercised

- 15 browser-accessible routes were loaded on `main`.
- 15 browser-accessible routes were loaded on `work/custody-v2-app-integration`.
- 305 visible controls were inventoried on `main`.
- 308 visible controls were inventoried on the integration branch.
- 12 high-value corridor controls were click-tested across the two branches.
- A development-only Custody V2 browser-test deal was created through the integration branch API and opened as both buyer and seller.

Raw evidence:

- `docs/active/product-recovery-audit/runtime/main-route-control-inventory.json`
- `docs/active/product-recovery-audit/runtime/integration-route-control-inventory.json`
- `docs/active/product-recovery-audit/runtime/main-core-clicks.json`
- `docs/active/product-recovery-audit/runtime/integration-core-clicks.json`
- `docs/active/product-recovery-audit/runtime/integration-custody-v2-setup-api.json`
- `docs/active/product-recovery-audit/runtime/integration-custody-v2-deal-cdp.json`

## Primary finding

The integration branch does not yet provide a coherent normal marketplace-to-Custody-V2 user journey. It contains useful Custody V2 primitives and a development-only setup corridor, but the ordinary authenticated path still routes users into the legacy demo deal rail.

The browser-visible normal journey currently stops at a legacy room:

```text
landing -> marketplace -> listing detail -> submit offer / accepted offer -> open deal room -> /deals/demo-cabai-001 or deal-${offer.id} -> legacy_demo behavior
```

The Custody V2 browser UX exists only when a fresh `custody_v2_testnet` deal is created explicitly through `/dev/custody-v2-browser-setup` or its API. It is not wired into the normal offer-to-deal flow.

## Why buyer/seller controls fail or appear to fail

There is no single root cause. Three role systems are visible at the same time:

1. The Aurora navbar has product navigation roles: `Buy`, `Sell`, `Deals`.
2. Demo identity switching uses the `mock_actor` cookie.
3. Custody V2 wallet actions require the connected wallet address to match the immutable deal participant address.

This makes controls look available before the runtime has the correct deal rail, participant identity, and wallet state. Evidence:

- `AuthenticatedHeader.tsx` hard-codes `Deals` and account-menu `Deals` to `/deals/demo-cabai-001`.
- `RoleSwitcher.tsx` changes the `mock_actor` cookie only; it does not change the Custody V2 deal participant addresses or connected wallet.
- `DealActions.tsx` only enables `Create on Stellar` / `Accept terms on Stellar` when `railVersion === 'custody_v2_testnet'` and the confirmed Custody V2 state allows the next action.
- The seller view of a newly created V2 deal does not show `Accept terms on Stellar` before buyer `CREATE_DEAL` is confirmed. That is correct state gating, but it reads as a missing seller control if the page does not explain the sequence clearly.

## Whether a coherent Custody V2 Deal Room UX exists

Partially, but not as a complete product corridor.

A dev-created Custody V2 deal visibly shows the required product and chain identifiers in the Deal Room:

- `Custody V2 · Stellar Testnet`
- contract ID `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- XLM settlement asset / native XLM SAC
- buyer and seller wallet addresses
- principal, buyer commitment bond, seller performance bond
- canonical terms hash
- contract deal ID
- connected wallet role
- buyer `Create on Stellar` action

However, that UX is not reachable from the normal marketplace and offer flow. It is reachable only through a development-only setup API and generated URL. After the dev deal is created, the global `Deals` nav still points back to the legacy deal, so the branch contains two parallel Deal Room concepts instead of one coherent product route.

## Where the normal journey stops

The normal marketplace-to-settlement journey stops at legacy deal creation and legacy room navigation. Source trace:

- `web/src/lib/offers/open-deal-room.ts` creates `deal-${offer.id}` after both parties open the room.
- `web/src/lib/offers/helpers.ts` builds that deal with default Stellar state but no explicit `rail_version: 'custody_v2_testnet'`.
- `web/src/app/deals/[dealId]/page.tsx` only loads a Custody V2 link when `deal.rail_version === 'custody_v2_testnet'`.
- `web/src/components/layout/AuthenticatedHeader.tsx` still routes `Deals` to `/deals/demo-cabai-001`.

Therefore the normal user path does not naturally arrive at the accepted Custody V2 contract UX.

## Why existing tests did not expose the runtime problems

The tests mainly verify isolated helpers, deterministic fixtures, API state transitions, and rendered labels. They do not exercise the full browser product corridor with two browser profiles, role switching, wallet/provider availability, and normal offer-to-deal creation.

Specific gaps:

- Unit tests assert that the founder setup can create a `custody_v2_testnet` deal, but they do not prove the normal offer flow creates one.
- Deal Room page tests render deterministic fixtures; they do not click from marketplace through offer acceptance into a V2 room.
- Auth tests validate `mock_actor` behavior, but do not catch the product confusion between demo actor, connected wallet, and contract participant address.
- Header tests did not flag hard-coded `/deals/demo-cabai-001` as a regression against a V2 product corridor.
- No Freighter-backed two-profile browser E2E gate was executed by the existing local test suite.

## Severity summary

| Severity | Count | Issues |
| --- | ---: | --- |
| Critical | 2 | Normal journey cannot reach Custody V2; global Deals navigation still targets legacy demo room. |
| High | 3 | Buyer/seller/wallet role model is ambiguous; tests miss real corridor; V2 seller action is invisible until buyer state is confirmed without enough UX clarity. |
| Medium | 3 | Main contains dev route shell without V2 config; route inventory has many duplicate controls from shared layout; CDP audit found selected CTA text changed enough that one scripted `View Details` matcher missed current Sell/Buy CTA copy. |
| Low | 2 | In-app browser MCP timeout limited tool path; dev server/runtime logs are audit artifacts only and should not be treated as product evidence. |

## Main vs integration health

`main` is more coherent as an Aurora/legacy demo product baseline. It does not claim to provide a browser-ready Custody V2 user corridor.

`work/custody-v2-app-integration` contains valuable V2 contract/application modules and the dev-only browser setup corridor, but it is product-incoherent because normal navigation and offer flow still land in legacy behavior.

## Audit conclusion

The integration branch should not be promoted as-is. It should be selectively salvaged: keep the proven Custody V2 service, config, repository, decoder, and browser setup primitives; rebuild the user-facing integration from clean `main` around one explicit product corridor that chooses `custody_v2_testnet` at deal creation and keeps navigation, roles, connected wallets, and action sequencing aligned.
