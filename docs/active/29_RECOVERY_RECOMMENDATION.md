# Recovery Recommendation

Date: 2026-06-26
Recommendation: selective rebuild from clean `main`, not full branch promotion.

## Decision

Use `main` as the product/UI baseline and selectively salvage Custody V2 technical modules from `work/custody-v2-app-integration`.

Do not promote `work/custody-v2-app-integration` as-is. It contains a useful Custody V2 implementation layer, but the user-facing product corridor is split between legacy demo and V2 dev harnesses.

## Why not salvage the whole integration branch

The branch does not fail because of one small UI bug. It fails because the normal product journey and the V2 rail are not the same journey:

```text
Normal user journey -> legacy/default deal room
Dev setup URL -> custody_v2_testnet deal room
Authenticated Deals nav -> legacy demo room
```

That split is the source of user confusion and broken controls. Fixing it by patching individual buttons would add more conditional logic around an already ambiguous flow.

## Recommended recovery plan

1. Freeze `main` as the clean Aurora/product baseline.
2. Create a new recovery branch from `main`.
3. Port only proven V2 technical modules:
   - config validation;
   - canonical terms/deal ID helpers;
   - repository tables and migrations for V2 links/operations/events;
   - transaction prepare/submit/confirm APIs;
   - event polling/decoder/reconciliation;
   - focused unit tests for contract/action invariants.
4. Rebuild the product route vertically:
   - marketplace/listing/request;
   - submit offer;
   - agreed terms;
   - mutual Open Deal Room;
   - create `custody_v2_testnet` deal at the exact point the product commits to V2;
   - Deal Room reads one rail only and never silently falls back to legacy after V2 assignment.
5. Replace hard-coded `/deals/demo-cabai-001` authenticated navigation with a real current-deal resolver or remove the nav item until a current deal exists.
6. Add a browser E2E gate before any future promotion:
   - buyer Edge profile with buyer Freighter wallet;
   - seller Edge profile with seller Freighter wallet;
   - create terms;
   - buyer `Create on Stellar`;
   - seller `Accept terms on Stellar`;
   - funding state visibility;
   - no legacy fallback.
7. Keep the development setup page as a test harness only. It must not become the product entry point.

## Acceptance criteria for the next recovery branch

- A normal founder demo can start from `/marketplace` and arrive at a `custody_v2_testnet` Deal Room without using `/dev/custody-v2-browser-setup`.
- The Deal Room visibly explains the connected wallet role and the next valid Stellar action.
- `Deals` navigation does not point to `demo-cabai-001` when a V2 deal exists.
- No V2 deal silently falls back to `legacy_demo`.
- Two browser profiles can open the same deal URL and see role-appropriate actions.
- Tests prove the product route, not only helper functions.

## Immediate no-touch boundaries

Do not rewrite the accepted Custody V2 contract. Do not change the Aurora visual direction. Do not begin breach/dispute/reputation expansion until the success and funding-expiry V2 product corridor is coherent.

## Final recommendation

Proceed with selective rebuild. Treat the integration branch as a parts branch, not a release branch.
