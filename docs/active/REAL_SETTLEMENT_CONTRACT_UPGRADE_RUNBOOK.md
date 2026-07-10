# Real Settlement Contract Upgrade Runbook

This document describes the upgraded custody-capable Testnet/local token settlement path implemented in `feature/real-settlement-contract-upgrade`.

## Implemented locally in this branch:
- versioned custody-capable contract path (`CustodyEscrow` struct and `_v2` methods);
- token transfer funding logic (`deposit_buyer_v2`, `deposit_seller_v2`);
- token transfer settlement logic (`settle_and_complete`);
- Rust/Soroban local tests (`test_v2.rs`);
- TypeScript invocation alignment (updated execution assembler and adapter contracts to route custody variants correctly).

## Still not remotely proven:
- upgraded contract deployment;
- real Testnet custody funding with upgraded contract;
- real Testnet settlement payout;
- reputation from confirmed remote settlement;
- crowdfunding eligibility from remote reputation.
