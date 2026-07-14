# Current Implementation Status

## Implemented

- Landing page and Get Started modal.
- Buy and Sell marketplace surfaces.
- Listing detail and buyer request flow.
- Offer creation.
- Recorded negotiation UI and messages.
- Agreed terms surface.
- Notifications.
- Mutual Open Deal Room gate.
- Active Deal Room states.
- Funding, lock, proof, delivery, completion, expiry, and refund flows.
- Profile, wallet-address display, reputation, and reputation detail page.
- Demo/operator role switcher.
- MockStore and Supabase repository boundary.
- Evidence hash and metadata handling.
- Outcome-backed reputation engine.
- Stellar Testnet proof modules and secure-store smoke tooling.
- Soroban event-contract baseline.
- Soroban Custody V2.1 contract integrated into the Testnet proof corridor.
- Cross-platform CI fixtures for Testnet configuration validation.
- Strict Soroban Clippy validation with narrow documented ABI/event exceptions.
- End-to-end Testnet transaction lifecycle (deposit, proof, delivery, settlement) proven over API and UI.
- Reputation updates seamlessly triggered by Testnet settlement events.

## Demo/Testnet Bridges Retained

- Managed demo-role identities.
- Demo custody sweep and settlement helpers.
- External payout helper.
- Testnet proof modules.
- Event-contract Soroban baseline.
- Custody V2.1 Testnet proof contract integrated as the main product corridor.

These remain because they prove the product story without pretending that the application has completed production custody integration.

## Known Limitations

- Default production build without explicit runtime mode fails closed if Supabase is not configured.
- Production dependency audit currently has no high or critical blocker after the Macro Batch 2 dependency remediation.
- Next.js demo production build still emits a transitive `Buffer()` deprecation warning through Stellar SDK validation code; no first-party `Buffer()` constructor use is known.
- Bank rail is visual/product intent only.
- Legacy `settleway_escrow` is not final token custody escrow.
- Custody V2.1 is integrated into the Settleway Deal Room frontend, application backend, database records, and event projection, providing an end-to-end Testnet product corridor.
- Active Testnet contract `CDMPVTVTZV5VTV275QPOKTKYWBTGJO7K4HLK5BFX27UBIIWYBDJ2FP3D` is deployed and successfully handles the end-to-end Testnet transaction lifecycle. This replaces the previous undocumented contract.
- Custody V2.1 is not externally audited or mainnet-ready.
- The V2.1 Testnet proof uses native XLM SAC and proof-only treasury/mediator governance.
- Arbitrary user wallet payout is not final production architecture.
