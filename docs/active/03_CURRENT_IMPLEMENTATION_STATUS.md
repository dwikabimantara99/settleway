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
- Cross-platform CI fixtures for Testnet configuration validation.
- Strict Soroban Clippy validation with narrow documented ABI/event exceptions.

## Demo/Testnet Bridges Retained

- Managed demo-role identities.
- Demo custody sweep and settlement helpers.
- External payout helper.
- Testnet proof modules.
- Event-contract Soroban baseline.

These remain because they prove the product story without pretending to be final production custody.

## Known Limitations

- Default production build without explicit runtime mode fails closed if Supabase is not configured.
- Production dependency audit currently has no high or critical blocker after the Macro Batch 2 dependency remediation.
- Next.js demo production build still emits a transitive `Buffer()` deprecation warning through Stellar SDK validation code; no first-party `Buffer()` constructor use is known.
- Bank rail is visual/product intent only.
- Current Soroban contract is not final token custody escrow.
- Arbitrary user wallet payout is not final production architecture.
