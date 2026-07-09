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
