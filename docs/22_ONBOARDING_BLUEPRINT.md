# 22 - Onboarding Blueprint

This document is the entry map for future Settleway engineers and coding agents. It does not replace the PRD or domain specs. Use it to understand the product direction, trust boundaries, and where to read next.

## Settleway Mission

Settleway is a trust infrastructure and marketplace for high-value agricultural commodity transactions. It helps real buyers and real sellers move from discovery into recorded negotiation, mutual commitment, a protected Deal Room, evidence-backed execution, and reputation supported by Stellar/Soroban-verifiable events without turning the product into a crypto app.

## Problem And Users

Settleway starts with agricultural commodity trades, especially the chili demo. The core problem is not only marketplace discovery; it is the fragile trust after buyer and seller meet.

Primary users are:

- Sellers: farmers, suppliers, farmer groups, and stock-holding aggregators.
- Buyers: restaurants, distributors, factories, wholesalers, exporters, and food businesses.
- Demo operators: hackathon presenters who need a reliable 3-5 minute story.
- Limited admins/operators: internal users for demo inspection and future dispute context, not a full dispute court.

The product addresses buyer and seller distrust, unclear commitments, unverifiable delivery evidence, weak accountability, fragmented deal communication, poor transaction history, and difficulty proving what occurred during a deal.

## Product Journey

The intended journey is:

```text
Marketplace or buyer request
-> Submit Offer
-> negotiation chat
-> mutual Open Deal Room
-> simulated principal, bond, and fee commitments
-> evidence and delivery milestones
-> completion, expiry, or refund
-> reputation
-> Stellar/Soroban verifiable trust and event layer
```

Marketplace listings prove Settleway is a supply-side discovery surface. Buyer requests prove demand can initiate a trade. Recorded negotiation and mutual Open Deal Room commitment sit between discovery and active escrow. The Deal Room remains the formal transaction center where terms, participants, money commitments, evidence requirements, escrow status, timeline, and Stellar proof metadata converge.

## Money, Evidence, And Outcomes

The principal is the deal value. The buyer bond is the buyer's commitment signal, and the seller bond is the seller's performance commitment. Buyer and seller platform fees represent Settleway service fees. In the MVP, balances, deposits, bonds, and fees are simulated off-chain.

Evidence stays off-chain. The product records evidence metadata and SHA-256 proof hashes so the integrity of submitted files can be checked later. Delivery milestones move the Deal Room from proof to delivery to completion.

Reputation is two-sided and outcome-based. Buyer behavior matters as much as seller behavior. Reputation should come from transaction outcomes and verified volume, not a generic five-star review layer.

Completion means the transaction reached buyer acceptance and final settlement in product logic. Expiry covers deals that do not reach lock in time. Refund covers pre-lock or fallback outcomes where already simulated commitments are returned in product state.

## Stellar And Soroban Role

Stellar/Soroban exists to provide an independently verifiable trust trail for authorization, escrow/deal lifecycle events, proof hashes, delivery milestones, completion, expiry, and refund outcomes. It must support the marketplace story, not replace it.

The blockchain layer should remain mostly invisible to ordinary users. Users should see clear Deal Room status, evidence, and reputation; judges and operators can inspect transaction hashes, contract IDs, proof hashes, and sync state when needed.

The MVP is non-custodial. It uses simulated off-chain balances and event-contract mode unless real token custody is actually implemented and proven. Do not claim real bank transfer, real QRIS, real payout, real KYC/KYB, production custody, or real token custody unless the implementation truly provides it.

Explicit non-goals include cryptocurrency trading, speculative token products, general-purpose wallets, production custody, real fiat settlement, payment gateways, real KYC/KYB, insurance, logistics marketplace, full dispute court, full AI judge, multi-sector expansion, and replacing Stellar.

Permanent engineering philosophy:

```text
Discipline on direction, flexibility on implementation.
```

Product direction and trust boundaries are strict. Implementation details may change when evidence justifies the change.

## Local State, Operation Persistence, And Chain State

Settleway has three related but distinct states:

- Local product state: Deal Room status, timeline, proof metadata, reputation, and sync labels used by the app.
- Persisted Stellar operations: idempotent records of intended Stellar actions, expected local status, target local status, contract method, operation status, transaction hash, result escrow ID, and public error code.
- Confirmed blockchain state: contract execution outcome confirmed through the Stellar adapter and RPC boundary.

In Testnet mode, local deal status must advance only when a confirmed operation produces a valid local commit. Unknown network state must never cause blind resubmission. A submitted transaction may already have consumed sequence or changed contract state; the safe response is reconciliation by transaction hash, not another automatic submit.

## Canonical Actions And Signer Roles

Important interpretation note:

The action table below describes the active escrow execution foundation inherited from the earlier implementation baseline. It does **not** describe the full founder-authorized product corridor by itself. The missing pre-escrow layers now sit before these actions:

```text
Submit Offer -> negotiation chat -> mutual Open Deal Room -> escrow actions below
```

The product execution model has 13 canonical action/status plans. They are the valid combinations of product action and expected local status that may map to a Soroban method:

| # | Action | Expected local status | Target local status | Soroban method | Signer role |
|---:|---|---|---|---|---|
| 1 | `create_deal` | `null` | `WAITING_DEPOSITS` | `create_escrow` | `admin` |
| 2 | `buyer_deposit` | `WAITING_DEPOSITS` | `BUYER_FUNDED` | `deposit_buyer` | `buyer_demo` |
| 3 | `buyer_deposit` | `SELLER_FUNDED` | `LOCKED` | `deposit_buyer` | `buyer_demo` |
| 4 | `seller_deposit` | `WAITING_DEPOSITS` | `SELLER_FUNDED` | `deposit_seller` | `seller_demo` |
| 5 | `seller_deposit` | `BUYER_FUNDED` | `LOCKED` | `deposit_seller` | `seller_demo` |
| 6 | `submit_proof` | `LOCKED` | `PROOF_SUBMITTED` | `submit_proof_hash` | `seller_demo` |
| 7 | `mark_delivered` | `PROOF_SUBMITTED` | `DELIVERED` | `mark_delivered` | `seller_demo` |
| 8 | `accept_delivery` | `DELIVERED` | `COMPLETED` | `accept_and_complete` | `buyer_demo` |
| 9 | `expire` | `WAITING_DEPOSITS` | `EXPIRED` | `expire_if_unfunded` | `admin` |
| 10 | `expire` | `BUYER_FUNDED` | `REFUNDED` | `expire_if_unfunded` | `admin` |
| 11 | `expire` | `SELLER_FUNDED` | `REFUNDED` | `expire_if_unfunded` | `admin` |
| 12 | `refund` | `BUYER_FUNDED` | `REFUNDED` | `refund_before_locked` | `admin` |
| 13 | `refund` | `SELLER_FUNDED` | `REFUNDED` | `refund_before_locked` | `admin` |

The signer roles are `admin`, `buyer_demo`, and `seller_demo`. Actual public addresses are configuration or execution metadata, not timeless product constants.

The Soroban contract may also expose utility/read methods such as `initialize(admin)` and `get_escrow(escrow_id)`. Those are not user-facing Stellar actions and are not among the 13 canonical product execution plans.

## Completed Journey At A High Level

Repository evidence shows the project has moved through marketplace and Deal Room foundations, backend/mock data foundation, the off-chain escrow state machine, Soroban event-contract foundation, offline Stellar action policy, invocation builder, execution reducer, persistence-safe planner, operation persistence, execution service, execution-input assembler, atomic local deal compare-and-swap, deal synchronization policy, local-commit planner, restart-safe execution coordinator, complete 13-plan offline execution coverage, and the initial isolated Stellar SDK/RPC Testnet adapter foundation.

Current implementation truth must be checked against committed source, registered tests, Git history, and CI evidence. Documentation may describe intended behavior or an older checkpoint.

## Document Precedence Map

### Product vision

- [docs/00_PRODUCT_BLUEPRINT.md](./00_PRODUCT_BLUEPRINT.md)
- [docs/01_MASTER_PRD.md](./01_MASTER_PRD.md)
- [docs/22_ONBOARDING_BLUEPRINT.md](./22_ONBOARDING_BLUEPRINT.md) as the entry map

### Domain authority

- [docs/05_DATABASE_SCHEMA.md](./05_DATABASE_SCHEMA.md)
- [docs/06_STELLAR_SOROBAN_SPEC.md](./06_STELLAR_SOROBAN_SPEC.md)
- [docs/07_API_CONTRACT.md](./07_API_CONTRACT.md)
- [docs/08_ESCROW_STATE_MACHINE.md](./08_ESCROW_STATE_MACHINE.md)
- [docs/09_PROOF_AND_EVIDENCE_SPEC.md](./09_PROOF_AND_EVIDENCE_SPEC.md)
- [docs/10_REPUTATION_SPEC.md](./10_REPUTATION_SPEC.md)

### Implementation truth

- Committed source
- Registered tests
- Git history
- CI configuration and observed CI results

### Planning and acceptance

- [docs/02_BUILD_EXECUTION_PLAN.md](./02_BUILD_EXECUTION_PLAN.md)
- [docs/12_ACCEPTANCE_CRITERIA.md](./12_ACCEPTANCE_CRITERIA.md)
- [docs/16_TESTING_AND_QA_PLAN.md](./16_TESTING_AND_QA_PLAN.md)
- [docs/20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md](./20_IMPLEMENTATION_ACCEPTANCE_MATRIX.md)

### Agent operating rules

- [AGENTS.md](../AGENTS.md)
- [docs/13_AI_CODING_GUARDRAILS.md](./13_AI_CODING_GUARDRAILS.md)

### Executor-specific guidance

- [GEMINI.md](../GEMINI.md)
- [web/CLAUDE.md](../web/CLAUDE.md)
- [docs/21_GEMINI_HANDOFF_JSON_CONTRACT.md](./21_GEMINI_HANDOFF_JSON_CONTRACT.md)

### Historical material

- [prompts/](../prompts/)
- Stale status statements in README files
