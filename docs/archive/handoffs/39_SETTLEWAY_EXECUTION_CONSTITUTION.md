# 39 - Settleway Execution Constitution

This document is the frozen execution constitution for the founder-authorized Settleway rebuild direction. It exists to keep future sessions narrow, auditable, and resistant to product drift.

## Authority And Precedence

Founder discussion on 2026-06-16 established a refined Settleway product direction that supersedes older flow assumptions where they conflict.

For future execution sessions, use this precedence order:

1. `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
2. `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
3. `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`
4. `AGENTS.md`
5. Existing product/domain specs such as `docs/00_PRODUCT_BLUEPRINT.md`, `docs/01_MASTER_PRD.md`, `docs/05_DATABASE_SCHEMA.md`, `docs/06_STELLAR_SOROBAN_SPEC.md`, `docs/08_ESCROW_STATE_MACHINE.md`, `docs/09_PROOF_AND_EVIDENCE_SPEC.md`, and `docs/10_REPUTATION_SPEC.md`

Older docs remain useful unless they conflict with this constitution. When they conflict, this constitution wins.

## Frozen Product Truth

### Product Identity

Settleway is a high-value agricultural commodity marketplace with trust infrastructure. It is not a generic crypto app and not a generic escrow app. It helps real buyers and real sellers move from discovery into commitment, protected execution, verifiable settlement, and reputation.

### Core Demo Story

The canonical demo story is:

```text
Marketplace or buyer request
-> offer and negotiation
-> mutual Open Deal Room commitment
-> deposit window
-> escrow locked on Stellar
-> active Deal Room with chat and evidence
-> success or dispute outcome
-> reputation update from verifiable transaction history
```

### Canonical Workflow

The intended end-to-end user flow is:

1. Marketplace discovery or buyer request discovery.
2. One side clicks `Submit Offer`.
3. The counterpart receives a notification.
4. Buyer and seller negotiate in recorded chat.
5. Either side may click `Open Deal Room`.
6. The Deal Room becomes active only after both sides click `Open Deal Room`.
7. After mutual commitment, the deposit phase begins.
8. Buyer deposits principal, buyer commitment bond, and buyer service fee.
9. Seller deposits seller performance bond and seller service fee.
10. If one side fails to deposit before deadline, the funding side receives a full refund and the non-funding side receives a reputation penalty.
11. If both sides deposit, escrow becomes locked and the lock is recorded through Stellar.
12. The active Deal Room supports transaction chat, evidence uploads, and status tracking.
13. If delivery succeeds, settlement routes funds according to the agreed rules.
14. If dispute or wrongful cancellation occurs, slashing, compensation, and reserve logic apply according to the agreed rules.
15. Reputation accumulates from transaction outcomes backed by verifiable on-chain history.

### Open Deal Room Rule

`Open Deal Room` is a mutual commitment gate, not a simple navigation action.

- One-sided action is insufficient.
- The first click creates a pending commitment state and a notification to the counterpart.
- The second click activates the Deal Room.
- Deposit cannot begin before the mutual activation condition is satisfied.

### Escrow And Money Logic

Settleway uses a dual-rail payment experience:

- `Local bank` rail for a Web2-simple user experience.
- `Crypto wallet` rail for direct on-chain participants.

Regardless of the user-facing rail, the trust layer converges on Stellar-backed escrow.

The canonical transaction money model is:

- Buyer principal: `100%` of deal value.
- Buyer commitment bond: `5%` of deal value.
- Seller performance bond: `5%` of deal value.
- Buyer service fee: `0.5%` of deal value.
- Seller service fee: `0.5%` of deal value.

Before escrow is locked:

- Any already-funded side receives a full refund if the counterpart fails to fund before deadline.
- The non-funding side receives a reputation penalty.
- No compensatory slashing is applied before lock.

After escrow is locked:

- Service fees become non-refundable.
- Success settlement returns both bonds, sends principal to the seller, and routes service fees to Settleway.
- Wrongful cancellation or clear fault can slash the violating side's bond.
- Slashed bond routes must support compensation to the harmed party and reserve/platform allocation according to the active deal rules.

### Blockchain Policy

Settleway uses Stellar because the product must be able to state inside the Deal Room:

`This transaction is secured by the Stellar blockchain.`

Blockchain exists for:

- escrow lock proof
- settlement proof
- refund or cancellation proof
- evidence hash proof
- reputation evidence trail

Blockchain must remain invisible by default but verifiable on demand through UI elements such as:

- `Secured by Stellar Blockchain`
- `View Transaction`
- tx hash
- contract or operation references
- locked status
- settlement event references

### On-Chain Versus Off-Chain

On-chain or chain-linked events must cover:

- deposit and funding milestones
- escrow lock
- evidence hash references
- refund, cancellation, slashing, and settlement outcomes
- reputation-supporting transaction events

Off-chain data includes:

- raw chat content
- raw media files
- sensitive personal or banking details
- dispute narrative payloads before summarization

### AI Role

AI is a support tool, not a judge.

AI may:

- summarize negotiation chat
- summarize Deal Room chronology
- summarize dispute evidence context
- help operators understand likely inconsistencies

AI may not:

- silently decide guilt
- replace accountable human product rules
- fabricate evidence

### Reputation Policy

Reputation is two-sided and outcome-based.

Each profile must reflect verifiable history such as:

- completed transactions
- total protected volume
- failed funding incidents
- cancellations
- dispute outcomes
- other confirmed transaction events

Blockchain transaction hashes and related event history are the evidence foundation for reputation accumulation, even when the public profile chooses a privacy-reduced display mode.

### Frontend Direction

Settleway must look and feel like a serious trade workflow product, not a crypto dashboard and not a generic marketplace checkout flow.

Frontend principles:

- calm, operational, and trust-focused
- CTA labels must match product state exactly
- discovery first, then negotiation, then commitment, then escrow, then settlement
- Deal Room is the strongest screen in the product
- Stellar is visible as a trust signal, not as dominant interface complexity

Required user-facing concepts:

- `Submit Offer`
- negotiation chat
- mutual `Open Deal Room`
- deposit status by party
- countdown to deposit deadline
- `Secured by Stellar Blockchain`
- `View Transaction`
- evidence timeline
- buyer and seller reputation

## Execution Discipline

### Single Source Of Truth

Before any implementation session, the active agent must read:

1. `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
2. `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
3. `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

No new idea may enter implementation unless it is already in the active phase contract or is explicitly re-authorized by the founder. Otherwise it must be parked as backlog.

### Mandatory Session Opening Ritual

Every future execution session must begin by:

1. reading the three execution docs above
2. checking branch, HEAD, and working tree state
3. stating the active phase
4. stating the in-scope task for that session
5. stating the no-touch area for that session

### No Hidden Scope Expansion

The agent must not silently:

- redesign unrelated flows
- rewrite unrelated modules
- slip new product ideas into implementation
- treat "while I am here" cleanup as part of the active phase

### Backlog Parking Rule

Ideas discovered mid-session that may be useful later must be recorded as backlog, not implemented immediately, unless the founder explicitly changes scope.

### Stop Conditions

The agent must stop and report if:

- the repository state contradicts the handoff
- the requested change requires crossing out-of-scope boundaries
- the active phase contract is no longer sufficient
- validation fails in a way that changes product truth or architecture assumptions

## Master Reminder

If the founder says:

`Continue. Follow the source of truth, the active phase contract, and the handoff. Do not leave scope.`

the agent must treat that as a command to continue strictly within this constitution.
