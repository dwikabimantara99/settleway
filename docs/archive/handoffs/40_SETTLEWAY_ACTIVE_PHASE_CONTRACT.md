# 40 - Settleway Active Phase Contract

This document defines the currently authorized active phase for the founder-approved Settleway rebuild direction.

## Active Phase

`Phase Y - Controlled Payout Destination Wiring`

## Objective

Introduce a truthful payout-destination layer for completed Settleway rooms without pretending that live bank rails, QRIS, wallet-connect, or production custody already exist.

This phase exists because Phase X already proved the protected room can reach `COMPLETED` through the real Testnet-backed happy path. The next missing truth is:

- where buyer bond returns are meant to go
- where seller proceeds are meant to go
- where seller bond returns are meant to go
- how those destination choices are shown and stored

Phase Y is a destination-wiring and payout-intent phase. It is not yet a bank-exit or arbitrary-address contract-routing phase.

## Product Truth This Phase Must Prove

```text
user has a payout destination preference
-> destination is visible in a narrow settings or profile-adjacent surface
-> active Deal Room can show the intended payout route honestly
-> buyer acceptance still closes the room
-> completed room shows where buyer and seller proceeds are intended to land
-> platform fees remain routed to Settleway
-> bank rail remains visible but clearly not live in the MVP
```

## In Scope

The active phase may do only the following:

1. Add a narrow payout-destination truth model for buyer and seller profiles, including:
   - active payout rail mode
   - linked wallet destination details
   - visible but non-live local-bank placeholder details
2. Persist and retrieve payout-destination data through the current repository layer and demo seed layer.
3. Expose a narrow user-facing place to review or edit payout destination preferences.
4. Surface payout destination truth in the Deal Room and completion-facing settlement summary.
5. Snapshot destination intent into room or completion metadata where needed so the final state remains auditable.
6. Keep platform fee routing and gas sponsorship language honest:
   - user does not manage XLM gas directly
   - Settleway remains the sponsoring operator boundary
7. Add only the minimum tests, validation, and docs required to prove this slice truthfully.

## Out Of Scope

The active phase must not:

- implement live bank transfer, QRIS, anchor payout, or fiat custody
- introduce wallet-connect or end-user signing flows
- expose private keys, secret seeds, or signer management to the user
- rewrite the current Soroban method signatures to support arbitrary external destination routing unless that becomes explicitly re-authorized
- replace the managed demo-role settlement identities as the current Testnet signer boundary
- redesign discovery, negotiation, dispute, or reputation architecture
- turn Settleway into a wallet dashboard
- claim that linked bank payout is executable in this MVP

## Current Product Rules That Must Be Preserved

The active phase must preserve the following truths exactly:

- Settleway is a high-value agricultural commodity marketplace with trust infrastructure.
- Marketplace discovery is only the start of the story.
- `Submit Offer` still precedes formal transaction activation.
- Negotiation still exists before the active Deal Room.
- `Open Deal Room` still requires both parties.
- Deposit still starts only after mutual Open Deal Room completion.
- Buyer still carries principal plus buyer bond and buyer fee.
- Seller still carries seller bond and seller fee.
- Before lock, failure to fund still triggers full refund to the funding side and a reputation penalty to the non-funding side.
- After lock, the happy path still ends with buyer acceptance, seller payout, bond return, and platform fee retention.
- Stellar remains a trust layer, not the product headline.
- Users still do not need to understand or manage XLM gas.
- The MVP remains honest about controlled Testnet infrastructure and non-production custody.
- The local-bank option may be shown, but it must remain clearly non-live in this phase.

## Execution Model Frozen For This Phase

This phase freezes the following implementation choices:

1. Destination truth model:
   - wallet destination is the only active payout target rail in Phase Y
   - local-bank destination is visible as a future rail or placeholder only
   - destination address is a stored payout target, not a signer identity
2. Runtime model:
   - managed buyer, seller, and platform demo identities remain the signer boundary
   - no end-user signing or wallet-connect appears in this phase
3. Gas model:
   - Settleway remains the gas sponsor
   - UI must not suggest that users need to hold XLM for settlement actions
4. Safety boundary:
   - if external destination execution would require unsafe contract or custody broadening, Phase Y must stop at the truthful routing-intent and completion-summary boundary

## Implementation Strategy

This phase must follow this product-safe implementation strategy:

1. Preserve the execution constitution as the source of runtime truth.
2. Preserve the now-frozen Phase X happy-path settlement corridor.
3. Start with data truth and user-facing clarity before touching any deeper settlement runtime.
4. Keep the payout preference surface narrow and profile-adjacent, not as a new product branch.
5. Keep the local-bank rail honest and visibly inactive.
6. Leave arbitrary external-address execution, anchor payout, and production bank exit for later phases unless explicitly re-authorized.

## Planned Working Model

The intended Phase Y working model is:

```text
freeze the payout destination contract
-> add destination profile data for buyer and seller
-> expose a narrow settings or profile-adjacent destination surface
-> show linked wallet destination as active payout target
-> show local-bank rail as visible but unavailable
-> carry destination truth into the Deal Room completion summary
-> validate that the room still reads like Settleway, not a wallet app
```

Important boundary:

- this phase is a payout-intent and destination-profile phase
- this phase is not yet a real bank payout phase
- this phase is not yet a contract-level arbitrary-address settlement phase

## Mandatory Deliverables For This Phase

This phase is complete only when all of the following are true:

1. Buyer and seller profiles can store a payout destination preference.
2. There is a narrow user-facing place to review or edit that preference.
3. The completed Deal Room shows the intended payout destinations for:
   - buyer bond return
   - seller principal receipt
   - seller bond return
   - Settleway fee retention
4. The local-bank rail is visible but clearly unavailable or non-live.
5. No wallet-connect or signer-seed exposure was introduced.
6. The room language remains honest if settlement still closes through controlled demo identities rather than arbitrary external addresses.
7. Targeted validation proves the slice coheres without drifting into unrelated product scope.

## Required Inputs On Every Session

Before doing any work under this phase, the agent must read:

- `docs/39_SETTLEWAY_EXECUTION_CONSTITUTION.md`
- `docs/40_SETTLEWAY_ACTIVE_PHASE_CONTRACT.md`
- `docs/41_SETTLEWAY_EXECUTION_HANDOFF.md`
- `docs/42_SETTLEWAY_SALVAGE_AUDIT.md`
- `docs/06_STELLAR_SOROBAN_SPEC.md`
- `docs/08_ESCROW_STATE_MACHINE.md`
- `docs/10_REPUTATION_SPEC.md`
- `docs/11_DEMO_SCRIPT.md`
- `docs/12_ACCEPTANCE_CRITERIA.md`
- `docs/24_CONTROLLED_TESTNET_SMOKE_RUNBOOK.md`
- `docs/26_TESTNET_SYNTHETIC_IDENTITIES.md`
- `docs/27_STELLAR_CLI_SECURE_STORE_SIGNER.md`
- `docs/28_TESTNET_ACCOUNT_READINESS.md`
- `docs/44_PHASE_X_IMPLEMENTATION_PLAN.md`
- `docs/45_PHASE_Y_IMPLEMENTATION_PLAN.md`

## File-Touch Policy

During this active phase, the agent may edit only:

- execution docs and handoff docs that must stay synchronized with the active phase
- profile or settings surfaces needed for payout-destination truth
- repository and demo-data modules needed to persist that truth
- Deal Room completion and settlement-summary surfaces that must display the destination route honestly
- closely related tests and supporting runtime helpers

The agent must not edit unrelated marketplace, negotiation, dispute, or broad contract modules.

## Validation Policy

Validation for this phase must focus on payout-destination truth. Run only what is necessary to prove the slice coheres, such as:

- targeted tests for repository, profile, and completion-surface destination behavior
- targeted integration tests for destination preference display and completed-room payout summary
- `git diff --check` or equivalent whitespace and sanity validation on touched files
- truthful manual verification only after the last edit
- no live bank payout or wallet-connect claims unless they were actually implemented and proven

## Exit Criteria

The phase ends only when:

- a reviewer can see or change a payout destination preference in a narrow, credible surface
- a completed Deal Room shows the intended destination route for buyer, seller, and platform funds
- the bank option is still honest and visibly non-live
- the product still feels like Settleway, not a generic wallet tool

## Implementation Order Inside This Phase

1. Freeze this contract, handoff, and implementation plan.
2. Audit current profile, repo, and completion-summary surfaces for payout-destination gaps.
3. Add the minimal destination profile data contract.
4. Expose the narrow payout-preference UI surface.
5. Consume the destination truth in the Deal Room completion summary.
6. Sync the execution handoff with actual results of the phase.
7. Run targeted validation after the last edit.

## Next Intended Phase

`Phase Z - Destination-Aware Settlement Exit Execution`

That later phase should cover whether and how the controlled Testnet settlement corridor can truthfully route beyond the managed demo-role identities into external wallet destinations without unsafe custody or contract drift.
