# 45 - Phase Y Implementation Plan

This document freezes the phase-specific implementation plan for `Phase Y - Controlled Payout Destination Wiring`.

It exists so payout-destination work can proceed in narrow, auditable steps without drifting into wallet-connect, bank-rail claims, or unsafe contract broadening.

## Phase Goal

Make Settleway truthful about where completed funds are intended to land by introducing payout-destination preferences for buyer and seller, then surfacing those preferences in a calm profile-adjacent experience and the completed Deal Room.

## Frozen Architecture Choice

Phase Y uses the following architecture and does not broaden beyond it:

1. keep the current Phase X Testnet-backed completion corridor intact
2. keep managed buyer, seller, and platform demo identities as the signer boundary
3. add payout destination truth at the application data layer first
4. keep wallet destination as the only active payout target rail in this phase
5. show local-bank payout as visible but non-live

Phase Y does not introduce live bank payout, wallet-connect, or arbitrary-address Soroban settlement execution.

## Required Behavioral Outcome

At the end of Phase Y, the product should behave like this:

```text
buyer or seller reviews payout destination preference
-> linked wallet destination can be stored and shown
-> bank rail remains visible but unavailable
-> completed Deal Room shows intended buyer, seller, and platform payout routes
-> reputation and settlement truth remain anchored to the same room
```

## Current Verified Gap

The current product still has a payout-destination truth gap:

- `DbProfile` has no payout-destination fields yet
- demo profile seed data has no wallet destination or bank placeholder state
- there is no narrow settings or profile-adjacent surface for payout preference
- the Deal Room completion summary still speaks generically about buyer and seller wallets
- the current Stellar execution input shape only knows:
  - `buyer_demo_address`
  - `seller_demo_address`
  - `admin_address`
- therefore the product can truthfully complete settlement, but it cannot yet truthfully say where each party intends to receive the result beyond the managed demo-role identities

Phase Y exists to close that gap without pretending the app already has live bank payout or arbitrary external-address settlement execution.

## Work Sequence

### Step 1 - Profile And Repository Audit

Inspect the current profile data model, repository contract, demo seed layer, and profile UI to freeze the minimum destination-truth surface needed for this phase.

Required outcome:

- one agreed payout-destination field set
- one agreed persistence path
- one agreed user-facing surface for editing or reviewing it

### Step 2 - Destination Data Contract

Add the narrowest data model needed to represent:

- active payout rail
- linked wallet destination
- visible local-bank placeholder

Required outcome:

- repository and mock data can store the destination preference honestly
- no wallet-connect or key-management semantics leak into the data model

### Step 3 - Seeded Demo Defaults

Add realistic seeded payout-destination defaults for the main buyer and seller demo identities.

Required outcome:

- the demo can show a believable default payout story
- the room and profile do not render empty payout state for the main corridor

### Step 4 - Narrow Destination Surface

Expose a narrow settings or profile-adjacent surface where payout destination truth can be reviewed and, if appropriate, edited in demo mode.

Required outcome:

- linked wallet destination is visible and actionable
- local-bank option is visible but clearly unavailable
- the product still feels like a trade workflow, not a wallet app

### Step 5 - Completed Room Routing Summary

Use the stored destination truth inside the completed Deal Room so the final room state shows where each route is intended to land.

Required outcome:

- buyer bond return route is visible
- seller principal route is visible
- seller bond return route is visible
- platform fee route remains visible
- room language stays honest if the underlying settlement execution still closes through managed demo identities

### Step 6 - Completion Metadata Hardening

Where needed, snapshot payout-destination truth into completion-facing room metadata so the result stays auditable even if profile preferences change later.

Required outcome:

- a completed room still has stable destination context
- reputation history and settlement context remain aligned

### Step 7 - Validation And Evidence Freeze

Run only the validation needed for this phase:

- targeted tests for destination model and persistence
- targeted tests for profile or settings destination surface
- targeted tests for completed-room payout summary
- `git diff --check`
- truthful local manual verification after the last edit

## Explicit No-Go Areas

The following remain forbidden in Phase Y:

- live bank transfer or QRIS payout execution
- wallet-connect
- signer or seed exposure
- broad contract-method expansion for arbitrary payout destinations
- profile redesign unrelated to payout truth
- discovery, negotiation, or dispute redesign

## Acceptance Checklist

Phase Y is acceptable only if all of the following are true:

1. Buyer and seller payout destination truth is stored somewhere real in the current app model.
2. There is a narrow user-facing place to review or edit that truth.
3. The completed Deal Room shows intended destination routes by party.
4. The local-bank rail is still honest and visibly non-live.
5. The implementation did not turn Settleway into a wallet dashboard.
6. No wallet-connect or live bank-rail claims were introduced implicitly.

## First Coding Target

When implementation begins under this plan, the first coding target should be:

`extend the profile and repository data contract so buyer and seller payout destination truth can exist before the UI tries to display it`
