import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository, runtimeMode } from '@/lib/repositories';
import { recordConfirmedFunding } from '@/lib/stellar/server/signed-funding-service';
import {
  assertConnectedWalletForFunding,
  findConfirmedFundingTransaction,
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
        createErrorResponse('UNAUTHORIZED', 'Only the matching deal participant can reconcile this funding transaction.'),
        { status: 403 },
      );
    }

    const profile = await repository.getProfile(auth.user.id);
    assertConnectedWalletForFunding({ profile, sourceAddress });

    const confirmed = await findConfirmedFundingTransaction({
      deal: auth.deal,
      action,
      sourceAddress,
    });

    if (!confirmed) {
      return NextResponse.json(
        createSuccessResponse(null, {
          reconciled: false,
          funding_route: 'external_wallet_to_managed_profile_wallet',
        }),
      );
    }

    const recorded = await recordConfirmedFunding({
      repository,
      dealId,
      action,
      actorId: auth.user.id,
      sourceAddress,
      transactionHash: confirmed.hash,
      allowDemoRecoveryFallback: runtimeMode === 'demo',
    });

    return NextResponse.json(
      createSuccessResponse(recorded.deal, {
        reconciled: true,
        transaction_hash: confirmed.hash,
        custody_transaction_hash: recorded.custodyTransactionHash,
        custody_status: recorded.custodyStatus,
        custody_message: recorded.custodyMessage,
        funding_route: recorded.custodyStatus === 'confirmed'
          ? 'external_wallet_to_managed_profile_wallet_to_settleway_custody'
          : 'external_wallet_to_managed_profile_wallet',
      }),
      { status: recorded.custodyStatus === 'pending' ? 202 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('STELLAR_FUNDING_RECONCILE_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
