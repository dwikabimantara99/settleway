# 40 - Settleway Active Phase Contract

This document defines the currently authorized active phase for the founder-approved Settleway rebuild direction.

## Active Phase

`Phase W - Testnet-Backed Wallet And Deposit Foundation`

## Objective

Replace the current local-only deposit simulation inside the active Deal Room with a controlled Stellar Testnet-backed wallet and funding foundation for the three demo roles:

- buyer
- seller
- platform

This phase exists to prove that Settleway's funding gate is not only narrated in UI, but already connected to real Stellar Testnet identities and real Testnet transaction evidence, while still remaining honest that this is a synthetic MVP environment.

## Product Truth This Phase Must Prove

```text
offer accepted
-> mutual Open Deal Room
-> buyer and seller see real demo wallets
-> buyer deposit creates a real Testnet-backed funding action
-> seller deposit creates a real Testnet-backed funding action
-> second successful deposit causes lock truth to become verifiable
-> active room shows wallet movement and Stellar proof references honestly
```

This is a wallet identity, funding truth, and lock-readiness phase. It is not a full production custody phase.

## In Scope

The active phase may do only the following:

1. Wire the existing synthetic Testnet role identities into the product runtime as the controlled demo wallets for:
   - buyer
   - seller
   - platform
2. Add a wallet domain layer for the active room that can show:
   - public wallet address
   - role identity
   - current displayed balance
   - pending escrow commitment
   - post-deposit balance delta
3. Replace the current deposit demo actions in the active Deal Room with controlled Testnet-backed funding actions for:
   - buyer deposit
   - seller deposit
4. Keep the user-facing experience simple by presenting:
   - mock IDR commercial value
   - Stellar-backed Testnet funding underneath
   - calm trust copy such as `Protected by escrow logic and recorded on Stellar`
5. Record real funding and lock references in the room UI when those actions succeed, such as:
   - transaction hash
   - operation or contract reference when available
   - funding status by party
   - locked status after both deposits
6. Preserve the existing mutual `Open Deal Room` gate and only begin Testnet funding after that gate is complete.
7. Keep the implementation compatible with the existing secure-store signer path and synthetic Testnet-only identities already documented in:
   - `docs/26_TESTNET_SYNTHETIC_IDENTITIES.md`
   - `docs/27_STELLAR_CLI_SECURE_STORE_SIGNER.md`
   - `docs/28_TESTNET_ACCOUNT_READINESS.md`
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
- implement full live settlement routing to all parties after completion
- broaden into full Testnet end-to-end execution from create to settle
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
- Stellar must remain a trust layer, not the product headline.
- The MVP must remain honest about synthetic rails, controlled Testnet infrastructure, and non-production custody.

## Execution Model Frozen For This Phase

This phase freezes the following implementation choices:

1. Wallet model:
   - use real Stellar Testnet accounts
   - use managed demo-role identities, not end-user wallet connect
   - use the already prepared synthetic accounts for buyer, seller, and admin/platform roles
2. Asset honesty:
   - commercial terms may remain displayed in `IDR`
   - actual Testnet funding in this phase may use `XLM` or a clearly synthetic demo balance rail mapped to the room
   - the UI must not imply a real issued IDR stable asset unless that is actually implemented later
3. Custody honesty:
   - this is controlled hackathon-demo infrastructure
   - it is not production custody
   - it is not real fiat settlement
4. Lock truth:
   - the second successful deposit must produce verifiable lock-related truth in the room
   - the room must show which side funded and whether lock is now active

## Implementation Strategy

This phase must follow this product-safe implementation strategy:

1. Preserve the execution constitution as the source of runtime truth.
2. Keep the work narrowly centered on the active Deal Room funding gate.
3. Introduce wallet state before replacing deposit actions.
4. Prove buyer and seller funding separately before claiming lock readiness.
5. Reach a verifiable locked state before considering any settlement routing work.
6. Leave dispute automation, post-completion payout routing, and broader bank-rail integration for later phases.

## Planned Working Model

The intended Phase W working model is:

```text
freeze wallet architecture
-> expose buyer, seller, and platform Testnet identities in the room
-> wire buyer deposit to Testnet-backed execution
-> wire seller deposit to Testnet-backed execution
-> surface transaction proof and lock truth
-> validate the happy path only through locked state
```

Important boundary:

- this phase is a foundation phase, not a full Testnet settlement phase
- this phase may touch only the narrow runtime and docs surfaces needed for wallet-backed funding truth
- this phase must not reopen discovery architecture, negotiation architecture, or profile redesign

## Mandatory Deliverables For This Phase

This phase is complete only when all of the following are true:

1. Buyer, seller, and platform identities exist as visible controlled demo wallets in the product.
2. The active Deal Room no longer depends only on fake local deposit toggles for the two funding actions.
3. Buyer deposit produces a real Testnet-backed transaction result or an explicit failure state.
4. Seller deposit produces a real Testnet-backed transaction result or an explicit failure state.
5. After both deposits succeed, the room shows a verifiable locked state with Stellar-linked evidence.
6. The UI clearly distinguishes:
   - commercial deal value
   - role wallet balances
   - protected funding status
7. The implementation remains honest about synthetic or demo financial rails.
8. Targeted validation proves the funding corridor works end-to-end for this phase.

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

## File-Touch Policy

During this active phase, the agent may edit only:

- execution docs and handoff docs that must stay synchronized with the active phase
- active Deal Room runtime surfaces that expose funding state and wallet proof
- narrow wallet and funding runtime modules
- narrow Stellar Testnet runtime composition and signer-safe integration modules
- closely related tests and demo docs that protect those surfaces

The agent must not edit unrelated runtime modules, contracts, broader docs, or unrelated tests.

## Validation Policy

Validation for this phase must focus on funding truth. Run only what is necessary to prove the slice coheres, such as:

- targeted tests for wallet or funding domain logic
- targeted integration tests for buyer deposit, seller deposit, and lock transition
- `git diff --check` or equivalent whitespace and sanity validation on touched files
- truthful manual or live verification only after the last edit
- no Mainnet, bank-rail, or full settlement claims unless commands and proof were actually produced

## Exit Criteria

The phase ends only when:

- a reviewer can open the active Deal Room and see real demo-role wallets
- buyer deposit is no longer only a fake local toggle
- seller deposit is no longer only a fake local toggle
- both deposits can lead to a verifiable locked state
- the room shows enough Stellar-linked proof that the trust layer is clearly real
- the product still feels like Settleway, not a wallet demo

## Implementation Order Inside This Phase

1. Freeze this contract, handoff, and implementation plan.
2. Introduce the wallet identity and balance surface for the active room.
3. Wire buyer deposit to controlled Testnet-backed execution.
4. Wire seller deposit to controlled Testnet-backed execution.
5. Surface transaction proof and lock truth in the room.
6. Sync the execution handoff with the actual results of the phase.
7. Run targeted validation after the last edit.

## Next Intended Phase

`Phase X - Testnet Settlement Routing And Reputation Anchoring`

That later phase should cover successful settlement routing, post-completion wallet movements, platform fee routing, and transaction-history anchoring into profile reputation.
