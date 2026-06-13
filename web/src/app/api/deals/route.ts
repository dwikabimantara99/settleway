import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { DbDeal } from '@/lib/db/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId, buyerRequestId, buyerId, sellerId, commodity, volumeKg, principalIdr } = body;
    
    // In Phase 4, we only use mockStore for initialization to respect MVP boundaries.
    
    const dealId = `deal-${Date.now()}`;
    const buyerBondIdr = principalIdr * 0.05;
    const sellerBondIdr = principalIdr * 0.05;
    const buyerFeeIdr = principalIdr * 0.005;
    const sellerFeeIdr = principalIdr * 0.005;

    const newDeal: DbDeal = {
      id: dealId,
      listing_id: listingId || null,
      buyer_request_id: buyerRequestId || null,
      buyer_id: buyerId,
      seller_id: sellerId,
      commodity,
      volume_kg: volumeKg || null,
      principal_idr: principalIdr,
      buyer_bond_idr: buyerBondIdr,
      seller_bond_idr: sellerBondIdr,
      buyer_fee_idr: buyerFeeIdr,
      seller_fee_idr: sellerFeeIdr,
      buyer_total_idr: principalIdr + buyerBondIdr + buyerFeeIdr,
      seller_total_idr: sellerBondIdr + sellerFeeIdr,
      status: 'WAITING_DEPOSITS',
      stellar_mode: 'mock_only',
      stellar_contract_id: null,
      stellar_escrow_id: null,
      latest_stellar_tx_hash: null,
      stellar_sync_status: 'idle',
      proof_hash: null,
      terms: body.terms || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStore.deals.set(dealId, newDeal);

    return NextResponse.json(createSuccessResponse(newDeal, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
