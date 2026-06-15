# 29 - Testnet Contract Deployment

This document records the exact public evidence of Testnet contract deployment and initialization, verified read-only.

## Deployment State
- **Contract ID**: `CAGCSRJYCNYKC5BT2C7ZNHXHVMEHNJSJQPWZRFMFFRYCDSKHD6SREJKX`
- **Deployment Transaction Hash**: Absent (not recorded in evidence).
- **Deployment Ledger**: Absent.
- **Deployer**: Claimed to be `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG` (Admin), but missing transaction hash to verify definitively.
- **Trusted Local Wasm Hash**: `A73F99E3E1521E581B38488FF8F26F746843F2214282C3286D5334B7BCE04703`
- **Deployed Wasm Equivalence**: Directly proven. A successful read-only fetch of the contract's Wasm from Testnet matched the trusted SHA-256 hash perfectly.

## Initialization State
- **Initialization Transaction Hash**: Absent (not recorded in evidence).
- **Initialization State**: Partially proven. The precise initialization transaction is missing from the record. However, subsequent state-mutating operations like `create_deal` successfully executed against the contract, which proves the contract must have been successfully initialized at some point.
