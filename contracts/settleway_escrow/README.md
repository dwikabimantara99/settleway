# Settleway Escrow (Soroban Smart Contract)

This is the Tier A Event-Contract for Settleway.

It enforces the Settleway Deal Room state machine on-chain without taking token custody. This is an MVP approach to proving the deal milestones immutable on the Stellar Testnet.

## Prerequisites

- Rust (stable)
- `wasm32-unknown-unknown` target
- `soroban-cli`

## Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

## Test

```bash
cargo test
```
