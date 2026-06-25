# 15 - Soroban Custody V2 Specification

Status: active architecture and implementation specification for `work/soroban-custody-v2`.

Custody V2 is an isolated Soroban contract milestone. It does not replace the current application rail, Aurora frontend, managed Testnet demo services, or legacy `settleway_escrow` contract. Its purpose is to prove the financial core of Settleway: buyer principal, buyer commitment bond, and seller performance bond are actually held by contract custody and released only through the approved state machine.

## Contract Location

- Contract crate: `contracts/trade_assurance_v2`
- Package: `trade-assurance-v2`
- Public contract type: `SettlewayCustodyV2`
- Accepted asset model: one immutable SEP-41/SAC token contract address per deployed contract instance.
- Administration model: initializer authorization is required only for one-time initialization. There is no admin withdrawal, upgrade, pause, or later fund-moving role.

## State Model

```text
TermsPending
  -> AwaitingFunding
  -> Active
  -> EvidenceSubmitted
  -> SettledSuccess
```

Funding failure path:

```text
AwaitingFunding
  -> FundingExpired
```

`SettledSuccess` and `FundingExpired` are terminal. Terminal deals reject all later fund-moving and evidence operations.

## Data Model

Configuration is stored in instance storage:

- `initialized`
- `accepted_asset`
- `policy_version`
- `interface_version`

Deal records are stored in persistent storage and keyed by `BytesN<32>` deal ID:

- `deal_id`
- `buyer`
- `seller`
- `creator`
- `terms_hash`
- `principal`
- `buyer_bond`
- `seller_bond`
- `funding_deadline`
- `delivery_deadline`
- `inspection_deadline`
- `policy_version`
- `buyer_terms_accepted`
- `seller_terms_accepted`
- `buyer_funded`
- `seller_funded`
- `evidence_commitment`
- `state`
- `terminal_outcome`
- `created_ledger_timestamp`
- `last_updated_ledger_timestamp`

The commercial terms document is intentionally not stored or emitted on-chain. The contract stores only a `terms_hash` commitment.

## Public Interface

### `initialize(initializer, accepted_asset, policy_version)`

Initializes the contract once.

Rules:

- requires `initializer` authorization;
- rejects second initialization;
- rejects policy version `0`;
- validates the accepted asset through the token interface;
- stores immutable configuration;
- does not create any later initializer privilege.

### `create_deal(deal_id, creator, buyer, seller, terms_hash, principal, buyer_bond, seller_bond, funding_deadline, delivery_deadline, inspection_deadline)`

Creates a unique deal in `TermsPending`.

Rules:

- `creator` must be buyer or seller;
- `creator` authorization is required;
- buyer and seller must be different;
- all amounts must be strictly positive;
- deadline order must be `now < funding < delivery < inspection`;
- duplicate deal IDs are rejected;
- creator's own terms acceptance is stored immediately;
- counterparty remains unaccepted.

### `accept_terms(deal_id, participant)`

Records buyer or seller agreement to immutable terms.

Rules:

- `participant` must be buyer or seller;
- `participant` authorization is required;
- duplicate acceptance is rejected with `TermsAlreadyAccepted`;
- when both parties have accepted, state moves to `AwaitingFunding`.

### `fund_buyer(deal_id, buyer)`

Transfers buyer obligation into custody.

Rules:

- buyer authorization is required;
- only valid in `AwaitingFunding`;
- both parties must have accepted;
- must be before the funding deadline;
- cannot execute twice;
- transfers exactly `principal + buyer_bond` from buyer to the contract;
- activates the deal if seller funding is already complete.

### `fund_seller(deal_id, seller)`

Transfers seller obligation into custody.

Rules:

- seller authorization is required;
- only valid in `AwaitingFunding`;
- both parties must have accepted;
- must be before the funding deadline;
- cannot execute twice;
- transfers exactly `seller_bond` from seller to the contract;
- activates the deal if buyer funding is already complete.

Funding order is intentionally independent.

### `expire_funding(deal_id)`

Closes an unfunded or partially funded deal after the funding deadline.

Rules:

- permissionless;
- only valid in `AwaitingFunding`;
- only valid after the funding deadline;
- refunds buyer funding exactly if buyer funded;
- refunds seller funding exactly if seller funded;
- closes without token transfer if neither party funded;
- moves once to `FundingExpired`.

### `submit_evidence(deal_id, seller, evidence_hash)`

Records one delivery evidence commitment.

Rules:

- seller authorization is required;
- only valid in `Active`;
- only the deal seller can submit;
- stores one immutable `BytesN<32>` evidence commitment;
- moves to `EvidenceSubmitted`;
- does not store files on-chain.

### `accept_delivery(deal_id, buyer)`

Completes the successful settlement path.

Rules:

- buyer authorization is required;
- only valid in `EvidenceSubmitted`;
- transfers `principal` to seller;
- returns `buyer_bond` to buyer;
- returns `seller_bond` to seller;
- moves once to `SettledSuccess`.

### Read Functions

- `get_config()`
- `get_deal(deal_id)`
- `deal_exists(deal_id)`
- `get_state(deal_id)`
- `contract_info()`

Read functions return only contract facts.

## Error Codes

| Code | Error |
|---:|---|
| 1 | `AlreadyInitialized` |
| 2 | `NotInitialized` |
| 3 | `InvalidAsset` |
| 4 | `InvalidPolicyVersion` |
| 10 | `DuplicateDeal` |
| 11 | `DealNotFound` |
| 12 | `UnauthorizedParticipant` |
| 13 | `BuyerSellerSame` |
| 14 | `InvalidAmount` |
| 15 | `AmountOverflow` |
| 16 | `InvalidDeadline` |
| 20 | `InvalidState` |
| 21 | `TermsAlreadyAccepted` |
| 22 | `TermsNotAccepted` |
| 23 | `AlreadyFunded` |
| 24 | `FundingDeadlinePassed` |
| 25 | `FundingDeadlineOpen` |
| 26 | `EvidenceAlreadySubmitted` |
| 27 | `TerminalState` |

## Events

All events use stable topic labels and avoid emitting private terms documents.

| Event | Topics | Data |
|---|---|---|
| `InitializedEvent` | `init`, `asset` | initializer, policy version, interface version |
| `DealCreatedEvent` | `deal`, `deal_id` | buyer, seller, principal, buyer bond, seller bond |
| `TermsAcceptedEvent` | `accept`, `deal_id`, `participant` | no private terms |
| `StateChangedEvent` | `state`, `deal_id` | from state, to state, timestamp |
| `BuyerFundedEvent` | `bfund`, `deal_id` | participant, amount, buyer funded, seller funded |
| `SellerFundedEvent` | `sfund`, `deal_id` | participant, amount, buyer funded, seller funded |
| `DealActivatedEvent` | `active`, `deal_id` | activation marker |
| `EvidenceSubmittedEvent` | `evidence`, `deal_id` | evidence hash |
| `FundingExpiredEvent` | `expired`, `deal_id` | buyer funded, seller funded, buyer refund, seller refund |
| `SettlementCompletedEvent` | `settled`, `deal_id` | seller principal, buyer bond refund, seller bond refund |

## Security Invariants

The contract and test suite cover these core invariants:

- exact token accounting for open and terminal deals;
- no double funding;
- no caller-selected partial funding;
- no double refund;
- no double settlement;
- no state regression;
- immutable terms hash and amounts;
- no participant substitution;
- immutable accepted asset after initialization;
- no arbitrary payout recipient;
- no admin withdrawal path;
- no backend-only settlement path;
- buyer-first and seller-first funding both work;
- unauthorized calls fail;
- token-transfer failures leave contract state unchanged;
- terminal states reject later fund-moving operations;
- aggregate contract balance equals expected deposits from still-open deals;
- checked arithmetic prevents buyer obligation overflow;
- deadlines are validated against ledger time;
- instance and persistent storage TTL are extended and tested.

## Explicit Non-Goals

Custody V2.0 does not include dispute adjudication, buyer-breach settlement, seller-breach settlement, mediator powers, platform fees, treasury transfers, contract upgrades, emergency withdrawals, production custody claims, fiat ramps, passkeys, or frontend integration.
