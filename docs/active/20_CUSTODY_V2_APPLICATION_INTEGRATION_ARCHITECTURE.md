# 20 - Custody V2 Application Integration Architecture

Status: implemented for the first success and funding-expiry vertical slice on `work/custody-v2-app-integration`; not merged to `main`.

## Boundary

This milestone connects the first application vertical slice to the accepted `contracts/trade_assurance_v2` Custody V2.1 contract without replacing the legacy demo rail. It is Testnet-only and does not claim production custody, bank settlement, QRIS, anchors, stablecoins, KYC/KYB, passkeys, mainnet, or external audit readiness.

Deferred V2.1 outcomes remain out of scope for application UI in this batch: seller breach, buyer breach, mutual cancellation, dispute opening, mediator console, and reputation projection from breach events.

## Rail Selection

Deals support an immutable rail label:

- `legacy_demo`
- `custody_v2_testnet`

The legacy rail remains available for existing demo behavior. A Custody V2 deal stores a dedicated link record with contract ID, contract deal ID, terms hash, participant addresses, XLM base-unit obligations, latest contract projection, and operation/event history. Once a V2 link exists, the application must not silently fall back to legacy behavior.

## Canonical Terms

`TermsDocumentV1` freezes the commercial agreement into deterministic JSON:

- deterministic key order;
- UTF-8 JSON bytes;
- no floats;
- token amounts as integer base-unit strings;
- deadlines normalized to Unix seconds;
- unknown hashed fields rejected;
- display-only metadata excluded.

The application calculates:

- `terms_hash = SHA-256(canonical_terms_bytes)`;
- `contract_deal_id = SHA-256("settleway:custody-v2.1:deal:" + application_deal_id)`.

## Wallet-Signed Operation Pipeline

The supported operation list for this batch is:

- `CREATE_DEAL`
- `ACCEPT_TERMS`
- `FUND_BUYER`
- `FUND_SELLER`
- `SUBMIT_EVIDENCE`
- `ACCEPT_DELIVERY`
- `EXPIRE_FUNDING`

The server prepares only allowlisted contract calls, simulates the transaction with Stellar RPC, stores the prepared transaction body fingerprint, and returns unsigned XDR plus a human-readable summary. The browser asks Freighter to sign the exact prepared XDR. The submit endpoint verifies that the signed transaction body matches the prepared fingerprint and includes the expected participant signature before submitting to RPC.

Submitted does not mean confirmed. The confirm endpoint waits for `getTransaction` success, then performs a direct `get_deal` read before updating financial projection.

## Direct Contract Reads

The application includes a dedicated Custody V2 reader using the Stellar JavaScript SDK. It supports:

- `get_config`;
- `get_deal`;
- `deal_exists`;
- `get_state`;
- `contract_info`.

The reader queries the configured Testnet contract only, decodes V2.1 state and outcome discriminants, decodes participant addresses, base-unit amounts, funding flags, evidence commitment, dispute fields, and deadlines, and maps not-found separately from RPC/decode failures.

Financial projection is chain-driven. Operation records may describe local prepared/submitted/pending metadata, but confirmed financial states come from decoded contract state.

## Projection Rules

- Confirmed transaction plus matching direct `get_deal` updates the local link state.
- Confirmed transaction plus unreadable or mismatched contract state returns an out-of-sync error and does not advance projection.
- Chain deal participant, terms, asset, amount, and deadline facts must match the application link.
- Terminal outcomes are derived from the decoded contract state.
- No V2 projection advances from operation type alone.

## Event Ingestion Boundary

The event ingester supports raw Stellar RPC `getEvents` polling filtered by configured contract ID. It decodes event topics and values through the Stellar SDK/XDR types, normalizes public facts, deduplicates by the opaque RPC event ID, stores ledger/transaction/event-index data, and persists the exact opaque RPC cursor returned by Stellar RPC.

Cursor resume is cursor-first. Once a cursor exists, follow-up polling uses the cursor and omits `startLedger`. Pagination continues across same-ledger pages through the opaque cursor, not through synthetic ledger/event-index cursors.

Contract-scoped `init` events are stored with a null `contract_deal_id`. Deal-scoped events must carry a valid bytes32 deal ID. Cursor gaps are explicit and persistent. When event history is unavailable, the application records requested start ledger, oldest/latest available ledger, first returned event ID, and gap detection time, then reconciles active deals through direct `get_deal` reads rather than inventing historical events.

Cursor advancement happens only after decoded events are appended. If persistence fails, replay is allowed through idempotent event IDs, but the cursor is not advanced past unpersisted events.

## Persistence

The repository boundary includes:

- Custody deal links;
- Custody operations;
- Custody events;
- Custody event cursors.

MockStore and Supabase adapters expose equivalent methods. The Supabase migration adds unique constraints for deal links, operation idempotency keys, event IDs, and event cursors.

## Testnet Deployment

Application integration uses a dedicated Testnet deployment of the accepted V2.1 Wasm:

- Contract ID: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- Native XLM SAC contract ID: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

The manifest lives at:

`contracts/trade_assurance_v2/testnet/manifest.app-integration-v1.json`

Detailed proof is recorded in:

`docs/active/23_CUSTODY_V2_APP_INTEGRATION_TESTNET_PROOF.md`
