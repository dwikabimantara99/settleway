import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import {
  assertConnectedWalletForFunding,
  buildFundingPaymentXdr,
  type SignedFundingAction,
} from '@/lib/stellar/testnet-funding';

function isSignedFundingAction(value: unknown): value is SignedFundingAction {
  return value === 'buyer_deposit' || value === 'seller_deposit';
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  try {
    const auth = await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;
    const sourceAddress = typeof body.source_address === 'string' ? body.source_address.trim() : '';

    if (!isSignedFundingAction(action)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'action must be buyer_deposit or seller_deposit'),
        { status: 400 },
      );
    }

    if (
      (action === 'buyer_deposit' && auth.role !== 'buyer') ||
      (action === 'seller_deposit' && auth.role !== 'seller')
    ) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Only the matching deal participant can prepare this funding transaction.'),
        { status: 403 },
      );
    }

    const profile = await repository.getProfile(auth.user.id);
    assertConnectedWalletForFunding({ profile, sourceAddress });

    const prepared = await buildFundingPaymentXdr({
      deal: auth.deal,
      action,
      sourceAddress,
    });

    return NextResponse.json(createSuccessResponse(prepared, { source: 'stellar-testnet' }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('STELLAR_FUNDING_PREPARE_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
