# 44 - Phase X Implementation Plan

This document freezes the phase-specific implementation plan for `Phase X - Testnet Settlement Routing And Reputation Anchoring`.

It exists so post-lock work can proceed in narrow, auditable steps without drifting into dispute redesign, bank payout infrastructure, or a risky custody rewrite.

## Phase Goal

Make the active Deal Room success path use the same controlled Stellar Testnet-backed execution boundary already proven for funding, then close the room with truthful completion references and reputation anchoring.

## Frozen Architecture Choice

Phase X uses the following architecture and does not broaden beyond it:

1. reuse the existing controlled Testnet role identities for buyer, seller, and platform
2. reuse the existing secure-store signer path as the signing boundary
3. reuse the existing execution coordinator and operation persistence flow instead of introducing a second settlement stack
4. keep the room-facing commercial story in `IDR`
5. keep reputation anchoring tied to the completion event trail

Phase X does not introduce wallet connect, bank payout execution, or production token custody.

## Required Behavioral Outcome

At the end of Phase X, the active Deal Room should behave like this:

```text
room already locked through Phase W
-> seller submits proof through the Testnet-backed route path
-> seller marks delivery through the Testnet-backed route path
-> buyer accepts delivery through the Testnet-backed route path
-> room shows completion proof and final routing summary
-> completion also anchors the buyer and seller reputation trail
```

## Current Verified Gap

The current post-lock routes still split the truth:

- funding and lock already use the Testnet-backed coordinator
- `submit-proof`, `mark-delivered`, and `accept-delivery` still rely on local `transition(...)` plus local event writes
- room narration already talks about settlement, wallet routing, and reputation closure
- therefore the UI story after lock is ahead of the execution truth

Phase X exists to close that gap without broadening beyond the happy path.

## Work Sequence

### Step 1 - Post-Lock Route Audit

Inspect and freeze the exact routes and helpers that currently remain local-only:

- `submit-proof`
- `mark-delivered`
- `accept-delivery`

Required outcome:

- one agreed map of what is already truthful
- one agreed list of what must be upgraded

### Step 2 - Runtime Composition Reuse

Extend the proven Phase W runtime boundary so the post-lock routes can use it safely.

Required outcome:

- proof, delivery, and acceptance can resolve runtime mode honestly
- repository-backed execution persistence remains consistent with funding behavior
- no duplicate settlement-only execution architecture appears

### Step 3 - Proof Submission Upgrade

Replace the local-only proof route path with controlled Testnet-backed execution while preserving evidence verification.

Required outcome:

- seller proof route still verifies evidence locally
- proof milestone also gains a Testnet-backed execution result or explicit honest failure
- room stores the public proof reference cleanly

### Step 4 - Delivery Milestone Upgrade

Replace the local-only delivery route path with controlled Testnet-backed execution.

Required outcome:

- seller delivery route follows the same coordinator path
- room stores delivery-facing proof and status honestly

### Step 5 - Buyer Acceptance And Completion Upgrade

Replace the local-only buyer acceptance route path with controlled Testnet-backed execution.

Required outcome:

- buyer acceptance closes the room through the same runtime boundary
- final completion reference is persisted honestly
- reputation anchoring still happens exactly once

### Step 6 - Room Truth Hardening

Narrow UX polish only for the active room completion slice:

- completion-facing proof placement
- final routing summary
- honest fallback or pending language when live confirmation is not yet final
- no broad redesign outside the post-lock success surface

### Step 7 - Validation And Evidence Freeze

Run only the validation needed for this phase:

- targeted tests for upgraded post-lock routes
- targeted integration tests for proof, delivery, completion, and reputation anchoring
- `git diff --check`
- truthful live verification if the environment and runtime still permit it

## Explicit No-Go Areas

The following remain forbidden in Phase X:

- bank transfer or QRIS payout execution
- wallet connect
- dispute automation redesign
- slashing or reserve allocation redesign
- Mainnet support
- full token-custody contract rewrite unless separately re-authorized
- unrelated UI churn outside the active room success path

## Acceptance Checklist

Phase X is acceptable only if all of the following are true:

1. `submit-proof` no longer behaves like a purely local toggle.
2. `mark-delivered` no longer behaves like a purely local toggle.
3. `accept-delivery` no longer behaves like a purely local toggle.
4. The room shows a truthful completion-facing Stellar reference or explicit fallback.
5. The final room summary still reads like Settleway, not a blockchain console.
6. Reputation anchoring remains tied to the completion evidence path.
7. No forbidden scope area was implemented implicitly.

## First Coding Target

When runtime work begins under this plan, the first coding target should be:

`upgrade the post-lock route path from local-only transitions to the existing Testnet-backed execution coordinator, starting with the proof submission corridor`
