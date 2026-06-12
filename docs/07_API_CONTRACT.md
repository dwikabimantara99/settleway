# 07 - API Contract

All APIs return:

```ts
type ApiResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; recoverable: boolean } };
```

## Listings

### GET /api/listings

Returns listing summaries.

### GET /api/listings/[listingId]

Returns listing detail.

## Buyer requests

### GET /api/buyer-requests

Returns buyer request summaries.

### GET /api/buyer-requests/[requestId]

Returns buyer request detail.

## Profiles

### GET /api/profiles/[userId]

Returns profile and reputation summary.

## Deals

### POST /api/deals

Creates a Deal Room from a listing or buyer request.

Request:

```json
{
  "listingId": "listing-cabai-001",
  "buyerId": "buyer-surabaya-restaurant",
  "sellerId": "seller-probolinggo-cabai",
  "principalIdr": 20000000,
  "volumeKg": 700,
  "terms": {}
}
```

### GET /api/deals/[dealId]

Returns full Deal Room data.

### POST /api/deals/[dealId]/buyer-deposit

Simulates buyer deposit and optionally records Stellar event.

### POST /api/deals/[dealId]/seller-deposit

Simulates seller bond deposit and optionally records Stellar event.

### POST /api/deals/[dealId]/submit-proof

Submits evidence metadata and proof hash.

Request:

```json
{
  "actorId": "seller-probolinggo-cabai",
  "proofHash": "sha256:...",
  "fileName": "packing-proof.jpg"
}
```

### POST /api/deals/[dealId]/mark-delivered

Marks delivery by seller/operator.

### POST /api/deals/[dealId]/accept-delivery

Buyer accepts delivery and completes/release flow.

### POST /api/deals/[dealId]/expire

Expires deal before locked.

### POST /api/deals/[dealId]/refund

Refunds before locked or in fallback flow.

## Demo

### POST /api/demo/reset

Resets seeded demo state.

## API implementation rule

Every mutating API must:

1. Validate actor and current state.
2. Apply state-machine transition.
3. Append escrow event.
4. Attempt Stellar event if configured.
5. Return updated Deal Room object.
