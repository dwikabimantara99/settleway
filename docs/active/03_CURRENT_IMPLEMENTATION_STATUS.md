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
- Isolated Soroban Custody V2.1 contract and Testnet proof.
- Custody V2 application-integration vertical slice on `work/custody-v2-app-integration`: canonical terms, rail flag, persistence records, prepare/submit/confirm routes, wallet-signed action wiring, direct contract reads, raw RPC event ingestion, chain-driven projection, and real Testnet success/funding-expiry proofs.
- Custody V2 event-ingestion hardening on `work/custody-v2-app-integration`: exact opaque RPC cursor persistence, bounded pagination, same-ledger page safety, persistent retention-gap metadata, contract-scoped init events, strict event decoding, and forced-pagination Testnet proof.
- Cross-platform CI fixtures for Testnet configuration validation.
- Strict Soroban Clippy validation with narrow documented ABI/event exceptions.

## Demo/Testnet Bridges Retained

- Managed demo-role identities.
- Demo custody sweep and settlement helpers.
- External payout helper.
- Testnet proof modules.
- Event-contract Soroban baseline.
- Isolated Custody V2.1 Testnet proof contract.

These remain because they prove the product story without pretending that the application has completed production custody integration.

## Known Limitations

- Default production build without explicit runtime mode fails closed if Supabase is not configured.
- Production dependency audit currently has no high or critical blocker after the Macro Batch 2 dependency remediation.
- Next.js demo production build still emits a transitive `Buffer()` deprecation warning through Stellar SDK validation code; no first-party `Buffer()` constructor use is known.
- Bank rail is visual/product intent only.
- Legacy `settleway_escrow` is not final token custody escrow.
- Custody V2.1 is integrated on the dedicated application branch for the first success and funding-expiry vertical slice. The branch has not been promoted to `main`, and browser Freighter proof remains a manual founder acceptance gate.
- Local Docker and Supabase CLI are unavailable in the current execution environment, so migration validation is static plus repository tests rather than a live local Supabase reset/apply.
- Custody V2.1 is not externally audited or mainnet-ready.
- The V2.1 Testnet proof uses native XLM SAC and proof-only treasury/mediator governance.
- The app-integration Testnet deployment manifest contains verified public deployment and proof data. No secret material is stored in the repository.
- Arbitrary user wallet payout is not final production architecture.
