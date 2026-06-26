# System And Stellar Architecture

## Application Stack

- Next.js App Router, TypeScript, and Tailwind CSS in `web/`.
- Next.js route handlers for API behavior.
- Mock/demo repository adapter for deterministic local and CI execution.
- Supabase repository adapter for persistent mode.
- Soroban Rust contract baseline in `contracts/settleway_escrow`.
- Isolated Soroban Custody V2.1 contract in `contracts/trade_assurance_v2`.
- Stellar Testnet helper modules for proof, funding, custody sweep, settlement, and payout experiments.

## Runtime Modes

- `test`: deterministic tests with mock repository behavior.
- `demo`: local and CI demo mode using mock/demo infrastructure.
- `persistent`: Supabase-backed mode. This mode fails closed when Supabase config is absent.

## Repository Boundary

The repository layer remains the application source of truth for product context. For deals assigned to the new `custody_v2_testnet` rail, the Custody V2.1 contract must become the financial source of truth after confirmed Testnet transactions and contract/event reconciliation. The current integration branch contains the first prepare/sign/submit/confirm foundation, but final direct contract reads and full RPC event polling are still not complete.

## Current Stellar Boundary

Current Stellar modules support:

- signed funding preparation/submission/reconciliation;
- Testnet custody sweep helper;
- Testnet proof transaction helper;
- Testnet settlement helper;
- Testnet external payout helper;
- secure-store/operator smoke tooling;
- Soroban event-contract interaction.
- isolated Custody V2.1 Testnet proof contract.
- Custody V2 application-integration foundation on `work/custody-v2-app-integration`.

The default application still preserves the existing repository and legacy Testnet helper rail. The active integration branch adds a separate `custody_v2_testnet` rail, canonical terms hashing, operation persistence, wallet-signed V2 API routes, and normalized event ingestion. This does not remove the legacy rail and does not yet complete full contract-state reconciliation or reputation projection.

## Soroban Contracts

`contracts/settleway_escrow` is the legacy event/state contract. It validates escrow progression and emits proof events, but it is not full token custody.

`contracts/trade_assurance_v2` is the isolated Custody V2.1 contract. It has real Testnet token custody for native XLM SAC proof scenarios, immutable one-asset configuration, bilateral terms acceptance, buyer principal and buyer bond custody, seller performance bond custody, deterministic success settlement, funding expiry, seller breach, buyer breach, mutual cancellation, dispute freeze, constrained mediator resolution, structured events, and TTL handling.

Custody V2.1 is not externally audited, not mainnet-ready, and not production governance. The proof deployment uses the same Testnet address as treasury and mediator; that is a proof-only limitation and must not be inherited silently by application integration.

## Production Custody Integration Target

Application integration must connect app state to the accepted V2.1 custody contract without weakening product boundaries. It must support:

- token asset model;
- contract-held funds;
- deterministic success settlement;
- constrained cancellation/refund/slashing;
- destination-aware payout;
- operator and user authorization boundaries;
- auditable event history.

Bank, QRIS, anchor, fiat settlement, KYC/KYB, passkeys, and mainnet custody remain out of scope until explicitly specified.
