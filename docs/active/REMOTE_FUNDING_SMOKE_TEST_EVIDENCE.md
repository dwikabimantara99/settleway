# Remote Funding Smoke Test Evidence

## Context
- **Git SHA**: 96c0d170960c0697059bf0266ef194767ed572a7
- **Runtime Mode**: persistent
- **Target**: TESTNET_PERSISTENT_DB + Stellar Testnet
- **Command Used**: `npm run smoke:persistent-testnet` (via `tsx scripts/testnet-persistent-smoke.ts` with `--conditions react-server` and strict anon key override)

## Execution Scope
- **Smoke Buyer ID**: `smoke_buyer_1783574830826`
- **Smoke Seller ID**: `smoke_seller_1783574830826`
- **Smoke Deal ID**: `smoke_deal_1783574830826`
- **Buyer Public Wallet**: `GDW7TF4E7VD43DNURUXIGV7S62N5CB2LWQNCBYRZVZXULWRVKRS4MOSB` (Redacted: GDW7...MOSB)
- **Seller Public Wallet**: `GACK2H7BEH4WJYSBTYIKPHPHLFLOEDNEK5CPF6R5IB4A7Y6O56IJWDQH` (Redacted: GACK...WDQH)

## Test Results
- **Buyer Deposit Result**: FAILED - Insufficient balance or network unavailable for buyer
- **Seller Deposit Result**: PENDING - Did not attempt due to buyer deposit failure
- **Transaction Hashes**: None produced
- **Deal Final Status**: `WAITING_DEPOSITS`

## Supabase Verification Summary
1. **Profiles**: 2 created successfully
2. **User Wallets**: 2 provisioned successfully, linked to user IDs
3. **Deals**: 1 created successfully, status `WAITING_DEPOSITS`
4. **Stellar Operations**: 0 found
5. **Escrow Events**: 0 found
6. **Integrity**: No orphan rows found. Buyer and seller mapped correctly.

## Blocker
`[ERROR] Runner failed: Headless buyer deposit failed: Insufficient balance or network unavailable for buyer`
The newly provisioned smoke wallets on the Stellar Testnet require manual funding (via Friendbot or a testnet faucet) before they can execute operations, as the repository currently lacks an automated Friendbot integration in the smoke runner.

## Final Classification
**REMOTE_FUNDING_SMOKE_BLOCKED_BALANCE**

## Explicit Statements
- No deployment ran.
- No mainnet touched.
- No production funds involved.
- No reputation work started.
- Proof/delivery/settlement remain unproven as they did not execute.
- Database password must be rotated after execution.

## Next Fix
- Balance blocker found (REMOTE_FUNDING_SMOKE_BLOCKED_BALANCE).
- Friendbot patch planned to resolve insufficient balance issue.
- No success tag was created.

## Rerun After Friendbot Patch — 2026-07-09

- **Commit SHA**: ae250838b5bd008ce9f653619a139bcdbef11dde
- **Runtime Mode**: persistent
- **Target**: TESTNET_PERSISTENT_DB + Stellar Testnet
- **Smoke Buyer ID**: smoke_buyer_1783577327553
- **Smoke Seller ID**: smoke_seller_1783577327553
- **Smoke Deal ID**: smoke_deal_1783577327553
- **Buyer Wallet**: GAESH...THH6 (Friendbot OK)
- **Seller Wallet**: GDAWM...FF4I (Friendbot OK)
- **Buyer Deposit**: Failed (Headless hook returned "Deal not found" due to missing RLS context)
- **Seller Deposit**: Did not execute
- **Tx Hashes**: None
- **Final Deal Status**: WAITING_DEPOSITS
- **Supabase Verification**:
  - Profiles: 2 verified
  - Wallets: 2 verified
  - Deal: 1 verified (WAITING_DEPOSITS)
  - Operations: 0
  - Escrow Events: 0
- **Final Classification**: REMOTE_FUNDING_SMOKE_BLOCKED_RUNTIME

*Disclaimer: No deploy was executed. No mainnet was touched. No production funds were used. Proof, delivery, and settlement remain unproven unless actually executed. The database password must be rotated after execution.*

## Runtime RLS Blocker Follow-up

- **Classification**: REMOTE_FUNDING_SMOKE_BLOCKED_RUNTIME
- **Finding**: Deal exists by admin verification but hook could not see it via RLS-bound context.
- **Action**: Admin-context patch planned.
- **Tag**: No success tag created.

## Rerun After Admin Context Patch — 2026-07-09

- **Git SHA**: e743be7
- **Runtime Mode**: persistent
- **Target**: TESTNET_PERSISTENT_DB + Stellar Testnet
- **Friendbot Result**: Buyer and seller public wallets funded successfully.
- **Admin Context Result**: Deal visibility was confirmed (hook bypassed RLS successfully).
- **Smoke Buyer ID**: smoke_buyer_1783582100265
- **Smoke Seller ID**: smoke_seller_1783582100265
- **Smoke Deal ID**: smoke_deal_1783582100265
- **Redacted Addresses**: GAKN...XXG7 (Buyer), GABE...LEV4 (Seller)
- **Buyer Deposit Status**: Blocked during execution hook (stellar_operations schema constraint on expected_local_status).
- **Seller Deposit Status**: Not reached.
- **Tx Hashes**: None produced.
- **Final Deal Status**: WAITING_DEPOSITS
- **Supabase Verification Summary**: Profiles (2), user_wallets (2), deal (1), stellar_operations (0), escrow_events (0). No null critical IDs.
- **Final Classification**: REMOTE_FUNDING_SMOKE_BLOCKED_RUNTIME

**Explicit statements**:
- No deploy.
- No mainnet.
- No production funds.
- Proof/delivery/settlement remain unproven unless actually executed.
- Database password must be rotated after execution.
