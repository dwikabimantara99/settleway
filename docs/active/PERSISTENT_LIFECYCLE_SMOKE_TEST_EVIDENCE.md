# PERSISTENT_LIFECYCLE_SMOKE_TEST_EVIDENCE

## Context
- Target: TESTNET_PERSISTENT_DB
- Git SHA: 9050440f04d136491bfaeff2d67e08d8af71b1fb
- Runtime mode: persistent

## Scripts/Routes Used
No end-to-end headless script exists for persistent mode. The existing `npm run smoke:testnet` relies strictly on `SmokeDealPersistence` (in-memory MockStore replacement), and does not touch Supabase. The production Next.js API routes require `sb-access-token` JWTs which necessitate a browser-based signup/login flow or RLS bypass.

## Test Executed
A custom headless node script using `vite ssrLoadModule` was constructed to bypass API authentication and call `repository` and `supabaseAdmin` directly.

- **Profile Creation**: Success. Inserted `test_buyer_*` and `test_seller_*` into `profiles` and verified via `repository.getProfile()`.
- **Wallet Provisioning**: Blocked. `getServerWalletRepository().getProfileWallet()` returned `null`. Automated programmatic secure generation of profile wallets without real auth flows is currently unsupported by the standalone runtime harness.

## Buyer/Seller Test Profiles
- test_buyer_1783569086907
- test_seller_1783569086907

## States Reached
- Database connectivity confirmed in persistent mode.
- Profile persistence verified.
- Wallet provisioning blocked.
- Deal creation/Stellar execution aborted due to missing wallet signers.

## Supabase Verification Summary
- Profiles verified (6 test rows found).
- User Wallets: 0 created during test.
- Deals: 0 created during test.
- Escrow Events: 0 created during test.
- Stellar Transactions: None.

## Exact Blocker
The persistent lifecycle scripts currently lack a programmatic/API hook to automatically provision secure wallets outside of actual user signup or UI mock fallback, meaning the backend execution coordinator has no keys to sign transactions.

## Explicit Statement
- no deployment
- no mainnet
- no production funds
- no reputation implementation started
- no secrets committed
- **database password should be rotated after agent execution**

## Final Classification
`PERSISTENT_LIFECYCLE_SMOKE_TEST_PARTIAL`
