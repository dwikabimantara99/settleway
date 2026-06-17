# 43 - Phase W Implementation Plan

This document freezes the phase-specific implementation plan for `Phase W - Testnet-Backed Wallet And Deposit Foundation`.

It exists so runtime work can proceed in narrow, auditable steps without drifting into full Testnet execution or settlement redesign.

## Phase Goal

Make the active Deal Room funding gate use real Stellar Testnet role identities and real Testnet-backed funding evidence while preserving the current Settleway product corridor.

## Frozen Architecture Choice

Phase W uses the following architecture and does not broaden beyond it:

1. real Stellar Testnet accounts for:
   - buyer
   - seller
   - platform or admin
2. controlled app-managed role identities, not external wallet connect
3. existing secure-store signer path as the signing boundary
4. current Tier A event-contract posture as the trust baseline
5. active-room funding truth only through:
   - buyer deposit
   - seller deposit
   - lock readiness after both deposits

Phase W does not implement final settlement routing, bank rails, Mainnet identity, or user wallet onboarding.

## Required Behavioral Outcome

At the end of Phase W, the active Deal Room should behave like this:

```text
room already activated by mutual Open Deal Room
-> buyer sees buyer wallet and can fund
-> seller sees seller wallet and can fund
-> each successful funding action returns real Testnet-backed proof
-> second successful funding action causes lock truth to appear
-> room shows the funding and lock evidence clearly
```

## Work Sequence

### Step 1 - Wallet Domain Freeze

Introduce the minimum wallet-facing runtime contract needed for the room:

- role wallet identity
- public address
- display balance
- available balance
- pending escrow commitment
- last funding reference

Constraints:

- no profile redesign
- no marketplace wallet UI
- no generic wallet center

### Step 2 - Runtime Composition Boundary

Define the narrow composition root for active-room Testnet funding:

- role-to-address mapping
- signer-safe role mapping
- room-to-funding intent mapping
- adapter invocation boundary
- public proof payload returned to the room

Constraints:

- no contract source edits
- no broad repository abstraction rewrite
- no env-secret exposure in UI or logs

### Step 3 - Buyer Deposit Path

Replace the buyer demo deposit toggle with controlled Testnet-backed execution.

Required outcome:

- buyer funding action uses the buyer demo identity
- room stores a public funding result
- room shows buyer funded status honestly

### Step 4 - Seller Deposit Path

Replace the seller demo deposit toggle with controlled Testnet-backed execution.

Required outcome:

- seller funding action uses the seller demo identity
- room stores a public funding result
- room shows seller funded status honestly

### Step 5 - Lock Truth Surface

After both deposits succeed:

- room shows lock truth
- room shows the linked Stellar proof reference
- room keeps the calm product framing instead of turning into a raw blockchain console

### Step 6 - Wallet-Aware Room UX Hardening

Narrow UX polish only for the active room funding slice:

- wallet cards for buyer, seller, and platform
- simple balance movement cues
- funding status per party
- proof link or reference placement
- clean empty, pending, success, and failure states

Constraints:

- no broad redesign of non-funding room sections
- no unrelated typography or layout churn

### Step 7 - Validation And Evidence Freeze

Run only the validation needed for this phase:

- targeted tests for wallet and funding logic
- targeted integration tests for buyer deposit, seller deposit, and lock transition
- targeted room-surface validation
- `git diff --check`
- truthful live verification if the environment and authorization permit it

## Explicit No-Go Areas

The following remain forbidden in Phase W:

- final success settlement routing
- platform fee transfer routing after completion
- refund or slashing redesign
- dispute automation
- bank-local payout integration
- issued synthetic IDR asset unless explicitly authorized later
- Mainnet support
- external end-user wallet connect

## Acceptance Checklist

Phase W is acceptable only if all of the following are true:

1. The room shows buyer, seller, and platform wallet identities.
2. Buyer deposit no longer behaves like a purely local fake action.
3. Seller deposit no longer behaves like a purely local fake action.
4. Each funding action returns a public proof artifact suitable for UI display.
5. The second successful deposit results in a visible lock truth.
6. The room still reads as a commodity transaction product, not a blockchain demo.
7. No forbidden scope area was implemented implicitly.

## First Coding Target

When runtime work begins under this plan, the first coding target should be:

`wallet identity and funding-proof surface inside the active Deal Room, without yet broadening into settlement routing`
