# Settleway

**The Safer Way to Settle Real-World Trade**

Settleway is a hackathon MVP for high-value agricultural commodity trade. It turns marketplace discovery into a more disciplined trust workflow: counterparties discover each other, negotiate in a recorded thread, commit together, fund escrow, prove delivery, and build reputation from verifiable transaction outcomes.

This repository is not a generic crypto demo and not just a listing board. It is a product story about how real buyers and real sellers can move from first contact to protected settlement without forcing blockchain complexity into the center of the user experience.

## Why Settleway Exists

Agricultural commodity trade often becomes fragile after buyer and seller first meet.

Common failure points:

- buyers do not know whether stock, quality, or delivery claims are credible
- sellers do not know whether the buyer is serious or will cancel unfairly
- negotiation often disappears into fragmented chat with weak evidence continuity
- there is no structured commitment gate before payment, delivery, and dispute risk begin
- reputation is usually shallow, manual, or easy to manipulate

Settleway is designed to make these transactions feel less like informal promises and more like protected execution.

## What This MVP Proves

The current MVP direction focuses on four connected ideas:

1. **Discovery is only the start.** Marketplace listings and buyer requests help supply and demand meet, but trust work begins after discovery.
2. **Negotiation should be recorded before money moves.** `Submit Offer` opens a recorded negotiation path before the protected room becomes active.
3. **Commitment should be mutual.** `Open Deal Room` is a two-sided gate, not a one-click shortcut into escrow.
4. **Outcomes should become reputation.** Proof, lock, refund, settlement, and dispute-related outcomes should support a durable trust history.

## Canonical Product Corridor

The founder-authorized Settleway story is:

```text
Marketplace or buyer request
-> Submit Offer
-> negotiation chat
-> mutual Open Deal Room
-> deposit window
-> escrow locked on Stellar
-> active Deal Room with chat and evidence
-> success or dispute outcome
-> reputation accumulation from verifiable transaction history
```

### Mutual Commitment Gate

`Open Deal Room` is not a navigation shortcut.

- one side can signal intent first
- the counterpart receives a notification
- the room becomes active only after both sides click `Open Deal Room`
- deposit starts only after that mutual commitment is complete

## Trust And Money Model

For the demo money model:

- buyer principal: `100%`
- buyer commitment bond: `5%`
- seller performance bond: `5%`
- buyer service fee: `0.5%`
- seller service fee: `0.5%`

Before lock:

- if only one side funds, that side receives a full refund
- the non-funding side receives a reputation penalty
- no compensatory slashing happens before lock

After lock:

- both bonds remain protected during execution
- success returns both bonds, routes principal to the seller, and routes fees to Settleway
- cancellation or dispute can lead to refund, compensation, or penalty logic
- settlement and outcome framing are tied back to Stellar-backed trust records

Settleway is also designed around a dual-rail experience:

- `local bank` rail for a Web2-simple user experience
- `crypto wallet` rail for direct on-chain participants

Both rails converge on the same trust layer and protected product logic.

## Why Stellar Stays Behind The Scenes

Blockchain is not the headline. Trust is.

Settleway uses Stellar so the product can honestly say:

`This transaction is secured by the Stellar blockchain.`

Stellar exists in the product to support:

- escrow lock proof
- refund or cancellation proof
- settlement proof
- evidence hash references
- reputation-supporting transaction history

The intended user experience stays operational and simple. Blockchain should remain mostly invisible until a buyer, seller, judge, or operator needs to inspect proof.

## AI Role

AI is a support layer, not an automated judge.

In the Settleway concept, AI may help summarize:

- negotiation chat
- Deal Room chronology
- evidence context for operator review

It does not silently determine guilt, invent facts, or replace accountable product rules.

## Honest MVP Boundaries

Settleway is a demo-stage product. This repository should stay explicit about what is modeled versus what is already production-ready.

Not claimed as fully implemented production infrastructure:

- real bank transfer rails
- real QRIS
- real payout orchestration
- real KYC or KYB
- full dispute court
- autonomous AI judgment
- production-grade custody
- completed production persistence rollout

The product vision includes both `local bank` and `crypto wallet` rails converging on the same Stellar-backed trust layer, but the MVP must remain honest about what is simulated, what is represented, and what is already operational.

## Current MVP Surface

The current product direction includes:

- marketplace listings
- buyer request discovery
- offer and negotiation flow
- mutual `Open Deal Room` activation
- deal funding and escrow-state progression
- post-lock evidence and delivery milestones
- refund and expiry outcome narration
- profile-level reputation visibility
- Stellar trust framing inside the Deal Room

The strongest screen in the product is the Deal Room, because that is where commitment, funding, evidence, settlement, and reputation become legible to the user and to the demo audience.

## Repository Guide

```text
settleway/
  README.md
  AGENTS.md
  GEMINI.md
  docs/
  diagrams/
  prompts/
  contracts/
  web/
```

Main directories:

- `web/` - Next.js application, routes, UI, and repository layer
- `contracts/` - Soroban contract work and related blockchain artifacts
- `docs/` - product, execution, engineering, and acceptance source of truth
- `diagrams/` - supporting visual references
- `prompts/` - historical phase prompts and operator instructions

## Local Development

Run the web app locally:

```bash
cd web
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm test
npx eslint .
npx tsc --noEmit
npm run build
```

Notes:

- local demo development is the primary supported mode for the current MVP
- repository-wide TypeScript and production-build hardening are still being resolved outside the active product slice

## Source Of Truth

If you are working on this repository, start with:

1. `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
2. `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
3. `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`

Useful supporting product context:

- `docs/22_ONBOARDING_BLUEPRINT.md`
- `docs/00_PRODUCT_BLUEPRINT.md`
- `docs/01_MASTER_PRD.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/09_PROOF_AND_EVIDENCE_SPEC.md`
- `docs/10_REPUTATION_SPEC.md`

## Positioning

Settleway is not trying to be a marketplace that stops at discovery, and not trying to be a blockchain interface that forgets the user.

It is trying to prove something more useful:

that agricultural buyers and sellers can move from first contact to protected settlement in a workflow that feels operationally serious, visibly fair, and verifiable when trust is tested.
