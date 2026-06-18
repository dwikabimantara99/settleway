# 40 - Settleway Active Phase Contract

This document defines the currently authorized active phase for the founder-approved Settleway rebuild direction.

## Active Phase

`Phase X - Testnet Settlement Routing And Reputation Anchoring`

## Objective

Replace the remaining local-only post-lock success path inside the active Deal Room with a controlled Stellar Testnet-backed settlement corridor that remains anchored to verifiable completion proof and reputation outcomes for the three demo roles:

- buyer
- seller
- platform

This phase exists to prove that Settleway's protected room does not stop at lock. The room must now carry the happy-path corridor from:

- proof submission
- delivery confirmation
- buyer acceptance
- final settlement narration
- reputation anchoring

through the same Testnet-backed trust layer already established for funding and lock in Phase W.

## Product Truth This Phase Must Prove

```text
offer accepted
-> mutual Open Deal Room
-> buyer deposit
-> seller deposit
-> lock becomes verifiable
-> seller proof action becomes Testnet-backed
-> seller delivery milestone becomes Testnet-backed
-> buyer acceptance becomes Testnet-backed
-> room shows settlement references and final wallet-routing truth honestly
-> buyer and seller reputation updates remain anchored to the completion evidence
```

This is a success-path settlement and reputation phase. It is not yet a production custody or bank-rail phase.

## In Scope

The active phase may do only the following:

1. Reuse the existing controlled Stellar Testnet role identities for:
   - buyer
   - seller
   - platform
2. Replace the remaining local-only post-lock success actions in the active Deal Room with controlled Testnet-backed execution for:
   - `submit_proof`
   - `mark_delivered`
   - `accept_delivery`
3. Keep the user-facing experience simple by presenting:
   - commercial deal value in `IDR`
   - calm room-facing settlement language
   - Stellar-backed proof and completion references underneath
4. Record real completion-facing references in the room UI when those actions succeed, such as:
   - proof transaction hash
   - delivery transaction hash or room event truth
   - completion transaction hash
   - escrow or contract reference
   - final success routing summary by party
5. Preserve the existing mutual `Open Deal Room` gate and the now-proven Testnet funding corridor from Phase W.
6. Keep the implementation compatible with the existing secure-store signer path and synthetic Testnet-only identities already documented in:
   - `docs/26_TESTNET_SYNTHETIC_IDENTITIES.md`
   - `docs/27_STELLAR_CLI_SECURE_STORE_SIGNER.md`
   - `docs/28_TESTNET_ACCOUNT_READINESS.md`
7. Anchor `transaction_completed` reputation updates to the completion evidence path that closes the room.
8. Add only the minimum tests, validation, and docs required to prove this slice truthfully.

## Out Of Scope

The active phase must not:

- implement Mainnet behavior
- implement real bank transfer, QRIS, anchor payout, or fiat custody
- introduce real user-owned wallet onboarding or wallet-connect flows
- issue a production-grade IDR stable asset
- redesign the marketplace, offer thread, or negotiation architecture
- redesign the reputation model
- implement full live dispute automation
- rewrite the Soroban contract into a production token-custody system unless that becomes explicitly re-authorized
- broaden into dispute slashing, reserve allocation, or bank payout orchestration
- replace the current product with a crypto wallet app

## Current Product Rules That Must Be Preserved

The active phase must preserve the following truths exactly:

- Settleway is a high-value agricultural commodity marketplace with trust infrastructure.
- Marketplace discovery is only the start of the story.
- `Submit Offer` precedes formal transaction activation.
- Negotiation must exist before the active Deal Room.
- `Open Deal Room` requires both parties.
- Deposit starts only after mutual Open Deal Room completion.
- Buyer carries principal plus buyer bond and buyer fee.
- Seller carries seller bond and seller fee.
- Before lock, failure to fund still triggers full refund to the funding side and a reputation penalty to the non-funding side.
- After lock, the happy path still ends with buyer acceptance, seller payout, bond return, and platform fee retention.
- Stellar must remain a trust layer, not the product headline.
- The MVP must remain honest about synthetic rails, controlled Testnet infrastructure, and non-production custody.

## Execution Model Frozen For This Phase

This phase freezes the following implementation choices:

1. Runtime model:
   - use real Stellar Testnet accounts
   - use managed demo-role identities, not end-user wallet connect
   - reuse the already prepared synthetic buyer, seller, and platform identities
2. Asset honesty:
   - commercial terms remain displayed in `IDR`
   - the UI must not imply a real issued IDR stable asset
   - settlement language must stay honest about controlled Testnet infrastructure
3. Completion truth:
   - the room must treat `submit_proof`, `mark_delivered`, and `accept_delivery` as part of the same verifiable Stellar-backed corridor as funding
   - buyer acceptance is the action that closes the happy path and triggers the final reputation anchor
4. Safety boundary:
   - if full token-custody transfer logic would require unsafe contract broadening, Phase X must stop at the truthful event-contract boundary and label that boundary clearly

## Implementation Strategy

This phase must follow this product-safe implementation strategy:

1. Preserve the execution constitution as the source of runtime truth.
2. Keep the work narrowly centered on the active Deal Room success path after `LOCKED`.
3. Reuse the proven Phase W runtime composition instead of introducing a second settlement architecture.
4. Prove proof submission, delivery, and buyer acceptance separately before claiming final settlement truth.
5. Keep reputation anchoring tied to the completion evidence path.
6. Leave dispute automation, slashing refinement, bank payout integration, and wallet-connect for later phases.

## Planned Working Model

The intended Phase X working model is:

```text
freeze the new settlement contract
-> reuse the existing Testnet-backed room and role wallets
-> wire seller proof submission to Testnet-backed execution
-> wire seller delivery confirmation to Testnet-backed execution
-> wire buyer acceptance to Testnet-backed execution
-> surface completion proof and final routing summary
-> confirm reputation anchoring on successful completion
```

Important boundary:

- this phase is a narrow success-path settlement phase, not a full custody or dispute phase
- this phase may touch only the runtime and docs surfaces needed for proof, delivery, completion, and reputation anchoring
- this phase must not reopen discovery architecture, negotiation architecture, or profile redesign

## Mandatory Deliverables For This Phase

This phase is complete only when all of the following are true:

1. The active Deal Room no longer depends only on local transition toggles for:
   - proof submission
   - delivery confirmation
   - buyer acceptance
2. The post-lock success path uses the same controlled Testnet-backed execution boundary already proven for funding.
3. The room shows a completion-facing Stellar reference or an explicit honest fallback when one is unavailable.
4. The final success summary shows:
   - principal to seller
   - buyer bond return
   - seller bond return
   - platform fee retention
5. `transaction_completed` reputation anchoring remains tied to the completion evidence path.
6. The implementation remains honest about synthetic or demo financial rails.
7. Targeted validation proves the success path coheres end-to-end for this phase.

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
- `docs/43_PHASE_W_IMPLEMENTATION_PLAN.md`
- `docs/44_PHASE_X_IMPLEMENTATION_PLAN.md`

## File-Touch Policy

During this active phase, the agent may edit only:

- execution docs and handoff docs that must stay synchronized with the active phase
- active Deal Room runtime surfaces that expose post-lock proof, delivery, completion, and settlement state
- narrow settlement and reputation runtime modules
- narrow Stellar Testnet runtime composition and signer-safe integration modules
- closely related tests and demo docs that protect those surfaces

The agent must not edit unrelated runtime modules, contracts, broader docs, or unrelated tests.

## Validation Policy

Validation for this phase must focus on success-path settlement truth. Run only what is necessary to prove the slice coheres, such as:

- targeted tests for post-lock execution, room state, and reputation anchoring
- targeted integration tests for `submit_proof`, `mark_delivered`, `accept_delivery`, and completion state
- `git diff --check` or equivalent whitespace and sanity validation on touched files
- truthful manual or live verification only after the last edit
- no Mainnet, bank-rail, or custody claims unless commands and proof were actually produced

## Exit Criteria

The phase ends only when:

- a reviewer can open the active Deal Room and move from `LOCKED` to `COMPLETED` through the real route path
- proof, delivery, and acceptance are no longer only local toggles
- the room shows enough completion-facing Stellar-linked proof that the trust layer remains clearly real after lock
- completion visibly anchors reputation truth
- the product still feels like Settleway, not a wallet demo

## Implementation Order Inside This Phase

1. Freeze this contract, handoff, and implementation plan.
2. Inspect the current local-only success-path routes and align them to the proven Testnet execution boundary.
3. Wire proof submission to controlled Testnet-backed execution.
4. Wire delivery confirmation to controlled Testnet-backed execution.
5. Wire buyer acceptance to controlled Testnet-backed execution and keep reputation anchoring honest.
6. Surface completion proof and final routing truth in the room.
7. Sync the execution handoff with the actual results of the phase.
8. Run targeted validation after the last edit.

## Next Intended Phase

`Phase Y - Controlled Payout Destination Wiring`

That later phase should cover user-selected payout destination wiring, destination-profile persistence, and the founder-approved wallet-versus-bank exit experience after the protected room closes.
