# 04 - Backend Specification

## Backend role

The backend coordinates application data, escrow state, proof hashes, reputation updates, and Stellar integration.

Backend is not responsible for real bank transfers, real KYC, real payout, or production custody in MVP.

## Backend architecture

Inside `web/`:

```text
src/lib/
  data/demo-data.ts
  db/types.ts
  db/mock-store.ts
  db/supabase-client.ts
  escrow/state-machine.ts
  escrow/money.ts
  proof/hash.ts
  reputation/reputation-service.ts
  stellar/stellar-service.ts
  api/errors.ts
  api/validation.ts

src/app/api/
  listings/route.ts
  listings/[listingId]/route.ts
  buyer-requests/route.ts
  buyer-requests/[requestId]/route.ts
  profiles/[userId]/route.ts
  deals/route.ts
  deals/[dealId]/route.ts
  deals/[dealId]/buyer-deposit/route.ts
  deals/[dealId]/seller-deposit/route.ts
  deals/[dealId]/submit-proof/route.ts
  deals/[dealId]/mark-delivered/route.ts
  deals/[dealId]/accept-delivery/route.ts
  deals/[dealId]/expire/route.ts
  deals/[dealId]/refund/route.ts
  demo/reset/route.ts
```

## Persistence strategy

Phase 4 must support both:

1. Supabase Postgres when environment variables exist.
2. Mock/demo store fallback when Supabase is not configured.

This prevents Gemini from blocking frontend progress due to database setup.

## Money calculation

Use basis points.

```text
buyer_bond_bps = 500       # 5%
seller_bond_bps = 500      # 5%
buyer_fee_bps = 50         # 0.5%
seller_fee_bps = 50        # 0.5%
```

For IDR 20,000,000:

```text
principal = 20,000,000
buyer_bond = 1,000,000
seller_bond = 1,000,000
buyer_fee = 100,000
seller_fee = 100,000
buyer_total = 21,100,000
seller_total = 1,100,000
```

## Backend responsibilities by phase

### Phase 4

- Read/write listings.
- Read/write buyer requests.
- Read profiles.
- Create/read deals.
- Seed demo data.

### Phase 5

- Run escrow state transitions off-chain.
- Append timeline events.
- Prevent invalid transitions.

### Phase 7

- Call Stellar/Soroban service after each material event.
- Store transaction metadata.

### Phase 8

- Hash evidence.
- Submit proof hash.
- Update reputation.

## Error handling

Every API response must be explicit:

```ts
{
  ok: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}
```

## Non-negotiable backend rule

The backend must never silently fake Stellar success. If Stellar is not configured, return an explicit mode/status such as `stellar_mode: "not_configured"` or `stellar_mode: "mock_fallback"`.
