# System And Stellar Architecture

## Application Stack

- Next.js App Router, TypeScript, and Tailwind CSS in `web/`.
- Next.js route handlers for API behavior.
- Mock/demo repository adapter for deterministic local and CI execution.
- Supabase repository adapter for persistent mode.
- Soroban Rust contract in `contracts/settleway_escrow`.
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

These rails are not final production custody. They are Testnet proof and demo-managed infrastructure until Soroban custody V2 exists.

## Soroban Contract

The current contract is event/state oriented. It validates escrow progression and emits proof events. It is not yet a full token custody contract that can independently enforce all payout paths.

## Production Custody V2 Target

Future custody work must support:

- token asset model;
- contract-held funds;
- deterministic success settlement;
- constrained cancellation/refund/slashing;
- destination-aware payout;
- operator and user authorization boundaries;
- auditable event history.
