# Settleway Next Implementation Plan

This roadmap organizes the upcoming work to transition Settleway from a technical prototype into a coherent, account-first agricultural B2B trust product.

Deployment to Vercel is intentionally deferred until stability is achieved.

## 1. Product Truth / Account-First Wallet Documentation
* **Goal**: Baseline the intended product architecture and eliminate legacy prototype confusion.
* **Files involved**: `docs/active/*`
* **Acceptance Criteria**: Documentation clearly defines profile wallets, deposit paths, and settlement formulas.
* **Must not touch**: Source code.
* **Exit condition**: Team alignment on architecture docs. *(Currently in progress)*

## 2. Auth + Profile Wallet Model
* **Goal**: Replace unverified wallet-connect with an account-first model. Every user automatically gets a Settleway Profile Wallet upon email login.
* **Likely Files**: `src/app/(auth)/*`, `src/lib/auth/*`, Profile schemas.
* **Acceptance Criteria**: Users sign up and possess a unique Stellar keypair mapped to their account.
* **Risks**: **Managed Custody Liability**. If Settleway provisions the wallet, it holds the keys. Key management security (e.g., via KMS or secure enclaves) must be definitively solved before production, and private keys must never be exposed to the frontend.
* **Must not touch**: Existing active Escrow state machine.
* **Exit condition**: Profile dashboard displays the user's Settleway Wallet address and balance.

## 3. Wallet Funding UI
* **Goal**: Allow users to fund their Profile Wallet via external wallet transfer (and mock future fiat paths).
* **Likely Files**: `src/components/profile/*`, Profile pages.
* **Acceptance Criteria**: UI provides a copyable deposit address and a "waiting for deposit" listener.
* **Risks**: Synchronization of on-chain balance with UI.
* **Must not touch**: Deal Room logic.
* **Exit condition**: Users can fund their Settleway Profile Wallet from a testnet faucet/external wallet.

## 4. Marketplace / Navigation Coherence
* **Goal**: Unify the UI navigation across the buyer/seller dichotomy.
* **Likely Files**: `src/app/page.tsx`, `src/components/layout/*`, `src/app/marketplace/*`.
* **Acceptance Criteria**: Seamless visual transition from browsing supply/demand to initiating an offer.
* **Must not touch**: Escrow logic.
* **Exit condition**: No visual disconnects when starting a deal.

## 5. Negotiation Flow Polish
* **Goal**: Ensure the chat interface accurately communicates bond expectations and evidence requirements before Deal Room opens.
* **Likely Files**: `src/app/offers/*`, `src/components/offers/*`.
* **Acceptance Criteria**: Clear summary of locked-in terms (price, volume, bonds, deadline) is presented before agreement.
* **Exit condition**: "Open Deal Room" transition feels like a serious, mutually-agreed contract signing.

## 6. Deal Room Escrow Timeline (Highest Risk)
* **Goal**: Consolidate `CustodyV2`, `ManagedCustody`, and `Aurora` action panels into a single, product-focused `EscrowTimeline`.
* **Likely Files**: `src/app/deals/[dealId]/*`, `src/components/deal/*`.
* **Acceptance Criteria**: Users see a simple timeline (Funding -> Locked -> Evidence -> Settle) without "Custody V2" terminology.
* **Risks**: Breaking the underlying state machine mapping.
* **Must not touch**: `state-machine.ts`, `custody-v2/*` domain logic.
* **Exit condition**: A clean, unified Deal Room UI.

## 7. Proof Upload + Evidence Package Hash
* **Goal**: Implement the robust off-chain-store to on-chain-hash pipeline.
* **Likely Files**: `src/components/deal/EvidenceSubmitter.tsx`, `src/lib/evidence/*`.
* **Acceptance Criteria**: Photos/documents upload to storage, generate an `evidence_package_hash`, and attach to the Deal Room state.
* **Risks**: Storage configuration; large payload handling.
* **Exit condition**: Sellers can build verifiable evidence packages.

## 8. Buyer Acceptance + Settlement Trigger
* **Goal**: Wire the UI acceptance click to actual contract settlement.
* **Likely Files**: `src/lib/deals/rail-guards.ts`, `src/app/api/deals/*`.
* **Acceptance Criteria**: "Accept Delivery" signs a transaction that distributes the 0.5% fee and returns bonds/principal according to the formula.
* **Risks**: Settlement formula must be perfect to prevent fund stranding.
* **Must not touch**: Negotiation logic.
* **Exit condition**: End-to-end happy path settlement executes on the Testnet.

## 9. Rail Isolation / Legacy Demo Removal
* **Goal**: Purge `legacy_demo` and isolate any remaining mock implementations behind strict feature flags.
* **Likely Files**: `supabase/migrations/*`, `src/lib/repositories/*`.
* **Acceptance Criteria**: `rail_version` defaults to the secure production-candidate path.
* **Risks**: Breaking backwards compatibility for in-flight demo deals.
* **Exit condition**: Codebase is clean of `ManagedCustody` competing rails in the primary flow.

## 10. Reputation + Evidence Integration
* **Goal**: Link successful or failed settlements directly to public reputation updates.
* **Likely Files**: `src/lib/reputation/*`, `src/app/profiles/[userId]/reputation/*`.
* **Acceptance Criteria**: Penalties apply automatically for funding failure; positive points accrue for completion.
* **Exit condition**: Profile trust scores accurately reflect on-chain deal history.

## 11. Demo Story Hardening
* **Goal**: Move required dev/demo tools to an isolated, non-intrusive debug layer.
* **Likely Files**: `src/components/demo/*`.
* **Acceptance Criteria**: Demo tools don't clutter the actual product interface but remain accessible for pitch scenarios.
* **Exit condition**: The product looks 100% real to a standard user.

## 12. Deployment Readiness Later
* **Goal**: Final audit of env vars, security policies, and DB migrations for Vercel deployment.
* **Likely Files**: `.env.example`, `vercel.json`.
* **Exit condition**: Successful zero-downtime deployment to staging.
