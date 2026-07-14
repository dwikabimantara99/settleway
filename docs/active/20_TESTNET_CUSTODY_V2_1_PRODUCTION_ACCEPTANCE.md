# 20 - Testnet Custody V2.1 Production Acceptance

## Execution Context

- **Commit SHA**: 33e792d7068bd95f06f4efa37f630ec68cf54462
- **Branch**: main

## Executive Summary

The Vercel persistent environment was verified and configured to support the full Testnet Custody V2.1 lifecycle. The backend runtime (`deal-room-testnet-runtime.ts`) was updated to bridge legacy configuration gaps with V2 configurations without relying on `stellar_cli_path` when operating in persistent mode. Missing secrets were safely pushed to Vercel, and a read-only operator preflight script (`testnet-preflight.ts`) was established and executed successfully.

## Preflight State

The newly added preflight CLI script successfully initialized and verified the remote configuration:

```json
{
  "status": "READY",
  "contract_id": "CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4",
  "custody_contract_id": "CB2OCALATBG5V2XLWHHCVAJNWUSLEUZYJJUVQSLV3O3H72MNADAQCHMN",
  "testnet_token_contract_id": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
}
```

## Production Vercel Keys Configured

The following Testnet runtime secrets were configured in Vercel Production to resolve dependency gaps:

| Variable | Scope | Action | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_LEGACY_CONTRACT_ID` | Production | ADDED | Legacy escrow events parsing |
| `NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID` | Production | ADDED | The Custody V2 isolated runtime contract |
| `NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID` | Production | ADDED | Stellar Testnet Native XLM SAC |
| `SETTLEWAY_SMOKE_BASE_FEE_STROOPS` | Production | ADDED | Runtime fee estimation bounds |
| `SETTLEWAY_SMOKE_MAX_FEE_STROOPS` | Production | ADDED | Runtime fee estimation bounds |
| `SETTLEWAY_SMOKE_TIMEOUT_SECONDS` | Production | ADDED | Transaction timeout limit |

*Note: Environment variables are verified read-only and no secrets or private keys were exposed.*

## Build Verifications

- **Web CI** (`npm ci`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`): PASS
- **Soroban CI** (`cargo fmt`, `cargo clippy`, `cargo test`, `cargo build --target wasm32v1-none --release`): PASS

## Remaining Post-Acceptance Tasks

- Proceed to **Phase 18 (Evidence Audit Reconciliation)**: execute a fresh manual funding run on production to demonstrate restored Testnet custody in a verified, non-diagnostic Deal Room.
