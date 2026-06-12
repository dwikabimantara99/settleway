# 06 - Stellar/Soroban Specification

## Goal

Use Stellar Testnet to make Settleway escrow events, proof hashes, and settlement outcomes verifiable.

## Honest implementation tiers

### Tier A - Mandatory: Stellar event-contract mode

This mode is mandatory because it is realistic for hackathon delivery.

The Soroban contract stores escrow records, validates status transitions, and emits events. The app simulates money balances off-chain but records key escrow events on Stellar.

Allowed language in UI:

- "Escrow events recorded on Stellar Testnet"
- "Proof hash recorded on Stellar"
- "Transaction state verifiable on Stellar"

Do not say:

- "Real funds are locked on-chain"
- "Bank deposit is real"
- "Production custody is complete"

### Tier B - Optional: token-custody mode

Only attempt after Tier A and full app demo are stable.

In this mode, contract uses a token-compatible asset and transfers principal/bonds/fees through the contract. This is stronger but riskier.

## Contract folder

```text
contracts/settleway_escrow/
  Cargo.toml
  src/lib.rs
  README.md
  tests/
```

## Contract status enum

```rust
Created
WaitingDeposits
BuyerFunded
SellerFunded
Locked
ProofSubmitted
Delivered
Accepted
Completed
Expired
Refunded
Cancelled
```

## Mandatory contract functions - Tier A

```rust
initialize(admin: Address)
create_escrow(deal_hash: BytesN<32>, buyer: Address, seller: Address, principal: i128, buyer_bond: i128, seller_bond: i128, buyer_fee: i128, seller_fee: i128, expires_at: u64) -> u64
deposit_buyer(escrow_id: u64, actor: Address)
deposit_seller(escrow_id: u64, actor: Address)
lock_if_ready(escrow_id: u64)
submit_proof_hash(escrow_id: u64, actor: Address, proof_hash: BytesN<32>)
mark_delivered(escrow_id: u64, actor: Address)
accept_and_complete(escrow_id: u64, actor: Address)
expire_if_unfunded(escrow_id: u64, now: u64)
refund_before_locked(escrow_id: u64, actor: Address)
get_escrow(escrow_id: u64) -> Escrow
```

## Mandatory events

```text
EscrowCreated(escrow_id, deal_hash, buyer, seller, principal)
BuyerDeposited(escrow_id, buyer)
SellerDeposited(escrow_id, seller)
EscrowLocked(escrow_id)
ProofSubmitted(escrow_id, proof_hash)
DeliveryMarked(escrow_id)
DeliveryAccepted(escrow_id)
PaymentReleased(escrow_id)
RefundIssued(escrow_id)
EscrowExpired(escrow_id)
TransactionCompleted(escrow_id)
```

## Transition rules

- `create_escrow` creates `WaitingDeposits`.
- Buyer deposit from `WaitingDeposits` creates `BuyerFunded` unless seller already funded.
- Seller deposit from `WaitingDeposits` creates `SellerFunded` unless buyer already funded.
- When both deposits exist, `lock_if_ready` creates `Locked`.
- Proof hash only allowed from `Locked` or later before completion.
- Delivery can be marked after proof.
- Acceptance completes the transaction.
- Expiry before locked is allowed.
- Refund before locked is allowed.
- Invalid transitions must fail.

## Backend integration behavior

The backend calls the contract after local validation. If the contract call succeeds, store tx hash and contract ID. If it fails, store explicit error metadata and show fallback status in UI.

## Environment variables

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_SOURCE_SECRET=...
STELLAR_ESCROW_CONTRACT_ID=...
STELLAR_MODE=event_contract
```

## Deployment checklist

1. Install Rust and Stellar CLI.
2. Build contract.
3. Run contract tests.
4. Create/fund testnet identity.
5. Deploy contract.
6. Save contract ID in `.env.local`.
7. Invoke one smoke-test function.
8. Only then connect backend.
