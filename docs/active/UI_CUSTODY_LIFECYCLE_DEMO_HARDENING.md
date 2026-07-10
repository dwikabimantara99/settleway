# UI Custody Lifecycle Demo Hardening

## Overview
This phase hardened the UI layers to explicitly visualize the persistent custody execution that was proven in previous phases. The interface upgrades provide a clean, demo-ready presentation layer that surfaces verified backend reality without compromising product boundaries.

## Routes & Components Modified
- `web/src/app/deals/[dealId]/page.tsx`: Extended to fetch Stellar operations and pass verifiable evidence to UI components.
- `web/src/app/profiles/[userId]/page.tsx`: Integrated profile evaluation metrics to demonstrate the corridor from custody to reputation.
- `web/src/components/ui/Stepper.tsx`: Upgraded to optionally accept hashes and timestamps.
- `web/src/components/demo/RoleSwitcher.tsx`: Re-styled and strictly gated behind demo mode logic.
- `web/src/components/deal/StellarEvidencePanel.tsx` (New)
- `web/src/components/deal/SettlementCompletedCard.tsx` (New)
- `web/src/components/profile/CrowdfundingEligibilityCard.tsx` (New)
- `web/src/components/ui/CopyButton.tsx` (New)

## Deal Room Proof Visualization
The `EscrowTimeline` stepper now extracts testnet execution data via the underlying `stellar_operations` and `escrow_events`. It natively anchors `timestamp`, `txHash`, and `proofHash` beneath their corresponding nodes (Deposits, Delivery, Settled) to ground the visual workflow in cryptographic evidence.

## Stellar Evidence Panel
A new side-panel within the Deal Room distinctly broadcasts the `stellar_contract_id` and `stellar_escrow_id`. It traces all major state transition hashes in real-time. Hashes are securely truncated for UI display while retaining direct, explicit links to the Stellar Expert Testnet explorer.

## Delivery Proof UI
The file evidence submission interface is strictly cordoned. It only renders for the `seller` role during the `LOCKED` phase. The `buyer` role concurrently views an "Awaiting Delivery Proof" placeholder. This asserts strict role segregation without resorting to faked AI-judge concepts.

## Settlement Completed UI
Upon a deal reaching the `COMPLETED` final state, the main column loads a prominent success feedback panel. It avoids inventing phantom exact monetary amounts if they are not definitively returned by the route payload, instead declaring "Transferred to seller" and "Returned in full". It surfaces the final settlement hash to cap off the workflow cleanly.

## Reputation UI
The public profile incorporates `verifiedVolume` and `completedDeals`. If the metrics are missing or the profile type does not support reputation, it falls back safely. The interface does not inject inflated, unsupported scores, relying strictly on the mock or database seed values it reads.

## Crowdfunding Eligibility Preview
Based directly on the `reputation_events` generated from the persistent custody proof, the `CrowdfundingEligibilityCard` assesses whether the user meets the foundational bounds for future tokenization/RWA models.
- Required volume: USD 20,000 equivalent (derived via `IDR_TO_USD_RATE`)
- Required volume IDR: Rp 300,000,000
- Required completed settlements: 10
If thresholds are not met, it shows a clear "Not eligible yet" pill, remaining truthful to the demo constraints.

## Demo Mode
The `RoleSwitcher` multi-actor navigation tool has been secured. It will render `null` on production/standard paths unless the environment explicitly contains a `?demo=1` parameter or an pre-existing `demo_mode=1` cookie.

## What Remains Partial/Unproven
- KYC/KYB is entirely excluded.
- Live Bank Rails/QRIS is not implemented.
- Unbounded dispute resolution and arbitrary claims court UI is excluded.
- The UI surfaces evidence of Testnet custody, and makes zero claims about live Stellar Mainnet funds or production grade custody handling.
