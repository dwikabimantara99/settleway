# Current Handoff

## Current Candidate

- Candidate branch: `codex/single-corridor-hardening`
- Focus: Single Corridor Hardening & Custody V2 App Integration

## Current Task Boundary

The application is integrating Custody V2.1 as the underlying rail for the Testnet Deal Room, ensuring the product flow remains simple and focused on the core Settleway business logic (Marketplace -> Offer -> Deal Room -> Funding -> Lock -> Evidence -> Settle) without exposing technical smart contract details to the user interface.

## No-Touch Areas

- No frontend redesign for surfaces outside of the core deal room.
- No bank/QRIS/anchor/KYC/KYB implementation.
- No live secret exposure.
- No force-push or history rewrite.
- No `main` promotion until the single corridor is hardened and end-to-end browser validated.

## Current Operator Focus

Clean up the working tree, hide technical terminology in the Deal Room UI, and ensure the state projection from Stellar to the application accurately reflects the product journey. Verify the flow end-to-end from the browser.

Note: Active Testnet contract `CAFNVE...` exists and read-only ABI/event compatibility was verified. A verification manifest was added. The original deployment receipt and Wasm hash remain unavailable, which is acceptable for testnet demo readiness but remains a provenance limitation.

## Post-Cleanup Product Realignment

Following the single-corridor hardening and main branch consolidation, the project is entering a product architecture realignment phase. Future work will focus on:
1. Shifting from a wallet-connect-first model to an **Account-First** Settleway Profile Wallet model.
2. Unifying the Deal Room UI to hide technical rails (e.g., Custody V2 vs Managed) behind a single, clean B2B Escrow Timeline.
3. Establishing the robust Evidence Package pipeline and strict on-chain settlement triggers.
