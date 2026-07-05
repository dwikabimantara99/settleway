# Settleway Flow Gap Matrix

| Area | Intended Product Truth | Current Status | Evidence In Code/Docs | Risk | Next Action |
|---|---|---|---|---|---|
| **Marketplace Discovery** | Unified browsing of verified buyers/sellers | PRESENT | `/marketplace`, `/buyer-requests` | Low | UI polish and navigation integration |
| **Auth & Identity** | Email login -> auto-provisioned Stellar Profile Wallet | PARTIAL | `/login` exists, but wallet auto-creation is mocked | Medium | Implement real account-first wallet generation |
| **Listing / Request Separation** | Clear distinction between demand and supply | PRESENT | Separated schemas and routes | Low | None |
| **Listing Detail & Submit Offer** | View details -> click to begin negotiation | PRESENT | `/offers/new` flow | Low | None |
| **Negotiation Chat** | Recorded chat to lock price, bonds, delivery, evidence | PRESENT | `NegotiationComposer`, `offers` table | Low | Ensure attachment evidence hashing intent is visible |
| **Offer Agreed State** | Both parties lock terms before Deal Room opens | PRESENT | `DealTermsActionButton` | Low | Smooth transition UI to Deal Room |
| **Deal Room Deposit UI** | Deposit via Profile Wallet, no crypto jargon | CONFUSING | Competing `CustodyV2ActionPanel`, `ManagedCustodyActionPanel`, `AuroraFundingDealRoom` | **BLOCKER** | Unify into a single `EscrowTimeline` component; strip technical terms |
| **Bond / Principal Models** | Buyer principal, buyer bond, seller bond tracked | PRESENT | `custody_v2_deal_links` schema enforcing bonds | Low | Keep enforcing in UI |
| **Funding Deadline** | Expiration triggers refund and rep penalty | PARTIAL | `EXPIRED` state exists; reputation impact lacks visibility | Medium | Surface reputation penalties clearly in UI |
| **Escrow Lock** | State becomes irreversible after both sides fund | PRESENT | `LOCKED` state in `state-machine.ts` | Low | Visual feedback reinforcement |
| **Delivery / Evidence Flow** | Upload raw file -> hash on-chain | TECHNICALLY_PRESENT_PRODUCT_UNCLEAR | `EvidenceSubmitter` uploads hash | Medium | Implement proper Evidence Package architecture |
| **Buyer Acceptance** | Acceptance triggers on-chain settlement | DEMO_ONLY | `COMPLETED` state is reached, but automated Soroban settlement trigger is stubbed | High | Wire acceptance to actual settlement operation |
| **Settlement Formula** | Seller gets principal - 0.5% fee; bonds return | NEEDS_DECISION | Not rigidly encoded in testnet contract yet | High | Define and deploy correct fee distribution logic |
| **Breach / Dispute Flow** | Deterministic bond splitting based on evidence | MISSING | `CANCELLED` exists, but no `DISPUTED` flow or splitting logic | High | Design dispute outcome state machine |
| **Reputation Integration** | Trust score updates based on exact deal outcomes | PARTIAL | Profile displays score; needs automated linkage to deal resolution | Medium | Wire settlement events to reputation schema |
| **Stellar / Soroban Traceability** | Transparent but non-intrusive trust layer | PRESENT | `custody_v2_events` projection | Low | Expose receipt explorer safely |
| **Demo vs Production Boundary** | Strict isolation of demo tools | CONFUSING | Role switchers and debug tools mixed in product | Medium | Move to isolated debug overlay |
