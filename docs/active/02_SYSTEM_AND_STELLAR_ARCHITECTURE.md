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

The repository layer is the application source of truth for product state. Stellar references support proof and verification but do not replace app state in the current MVP.

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

The application still uses the existing repository and Testnet helper rail. Custody V2.1 exists as an isolated proof and is not yet wired into backend route handlers, the Aurora UI, event indexing, database records, or reputation projection.

## Soroban Contracts

`contracts/settleway_escrow` is the legacy event/state contract. It validates escrow progression and emits proof events, but it is not full token custody.

`contracts/trade_assurance_v2` is the isolated Custody V2.1 contract. It has real Testnet token custody for native XLM SAC proof scenarios, immutable one-asset configuration, bilateral terms acceptance, buyer principal and buyer bond custody, seller performance bond custody, deterministic success settlement, funding expiry, seller breach, buyer breach, mutual cancellation, dispute freeze, constrained mediator resolution, structured events, and TTL handling.

Custody V2.1 is not externally audited, not mainnet-ready, and not production governance. The proof deployment uses the same Testnet address as treasury and mediator; that is a proof-only limitation and must not be inherited silently by application integration.

## Production Custody Integration Target

Future application integration must connect app state to the accepted V2.1 custody contract without weakening product boundaries. It must support:

- token asset model;
- contract-held funds;
- deterministic success settlement;
- constrained cancellation/refund/slashing;
- destination-aware payout;
- operator and user authorization boundaries;
- auditable event history.

Bank, QRIS, anchor, fiat settlement, KYC/KYB, passkeys, and mainnet custody remain out of scope until explicitly specified.
