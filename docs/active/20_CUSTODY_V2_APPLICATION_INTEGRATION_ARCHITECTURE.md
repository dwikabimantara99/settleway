# 20 - Custody V2 Application Integration Architecture

Status: in progress on `work/custody-v2-app-integration`.

## Boundary

This milestone connects the first application vertical slice to the accepted
`contracts/trade_assurance_v2` Custody V2.1 contract without replacing the
legacy demo rail. It is Testnet-only and does not claim production custody,
bank settlement, QRIS, anchors, stablecoins, KYC/KYB, passkeys, mainnet, or
external audit readiness.

Deferred V2.1 outcomes remain out of scope for application UI in this batch:
seller breach, buyer breach, mutual cancellation, dispute opening, mediator
console, and reputation projection from breach events.

## Rail Selection

Deals now support an immutable rail label:

- `legacy_demo`
- `custody_v2_testnet`

The legacy rail remains the default for existing demo behavior. A Custody V2
deal stores a dedicated link record with contract ID, contract deal ID, terms
hash, participant addresses, XLM base-unit obligations, latest contract
projection, and operation/event history. Once a V2 link exists, the application
must not silently fall back to legacy behavior.

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

The first supported operation list is:

- `CREATE_DEAL`
- `ACCEPT_TERMS`
- `FUND_BUYER`
- `FUND_SELLER`
- `SUBMIT_EVIDENCE`
- `ACCEPT_DELIVERY`
- `EXPIRE_FUNDING`

The server prepares only allowlisted contract calls, simulates the transaction
with Stellar RPC, stores the prepared transaction body fingerprint, and returns
unsigned XDR plus a human-readable summary. The browser asks Freighter to sign
the exact prepared XDR. The submit endpoint verifies that the signed transaction
body matches the prepared fingerprint and includes the expected participant
signature before submitting to RPC.

Submitted does not mean confirmed. Projection advances only after confirmation.
The current foundation updates projection from confirmed operation type plus the
stored V2 link. Direct contract-state reads and full RPC event polling remain
required before this can be accepted as complete financial source-of-truth
integration.

## Persistence

The repository boundary now includes:

- Custody deal links;
- Custody operations;
- Custody events;
- Custody event cursors.

MockStore and Supabase adapters expose equivalent methods. The Supabase
migration adds unique constraints for deal links, operation idempotency keys,
event IDs, and event cursors.

## Event Ingestion Boundary

The current ingester accepts normalized public V2.1 events, filters by contract
ID, rejects unsupported event names and malformed hashes, persists events
idempotently, and advances a durable cursor. It does not yet perform full raw
Soroban event XDR decoding or automatic on-demand RPC polling.

## Testnet Deployment Boundary

Application integration must use a dedicated Testnet deployment of the accepted
V2.1 Wasm with distinct treasury and mediator addresses. The manifest lives at:

`contracts/trade_assurance_v2/testnet/manifest.app-integration-v1.json`

In this run the manifest is intentionally marked blocked because no local
Stellar CLI secure-store aliases were available for deployment.
