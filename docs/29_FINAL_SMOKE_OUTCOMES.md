# 29 - Final Smoke Outcomes

This document records the exact final outcomes of the controlled Testnet smoke.

## Overview
The goal of this smoke execution was to verify the Stellar Testnet Adapter and Execution Service against a live Testnet using synthetic identities and simulated amounts. We ran three comprehensive scenarios covering the canonical deal lifecycle and edge cases.

## Results
All three requested scenarios were successfully executed on Stellar Testnet:

1. **Happy Path (`happy_path`)**: Verified a complete 6-stage lifecycle (`create_escrow`, `deposit_buyer`, `deposit_seller`, `submit_proof_hash`, `mark_delivered`, `accept_and_complete`) resulting in a `COMPLETED` local deal state and verified contract escrow state.
2. **Expiry Path (`expiry`)**: Verified deal expiration (`create_escrow`, `expire_if_unfunded`) when a deal remains unfunded by the deadline, resulting in an `EXPIRED` deal state.
3. **Refund Path (`refund`)**: Verified a one-sided refund (`create_escrow`, `deposit_buyer`, `refund_before_locked`) resulting in a `REFUNDED` deal state.

## Validated Core Behaviors
- **Signer Boundaries**: Safe integration with the `StellarCliSecureStoreSigner`, preserving roles for `admin`, `buyer_demo`, and `seller_demo`.
- **RPC Interactions**: Preparation and fee bounds checking using the Testnet parameters.
- **Polling & Confirmation**: Successfully updated the `stellar-sdk-rpc.ts` to retry/poll the Soroban RPC for `SUCCESS` and `FAILED` states when transactions are temporarily pending (`NOT_FOUND`).
- **Data Persistence**: Correct progression of states in local operations matching confirmed chain outcomes, with safe handling of errors and operation statuses.

## Conclusion
The live smoke sequence proved the validity of the Settleway Tier A event-contract layer and off-chain Deal Room local-commit integration. All tests passed, no secrets leaked, and the current Phase 7N scope is officially complete.
