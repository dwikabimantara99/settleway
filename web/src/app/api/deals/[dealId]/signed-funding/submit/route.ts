import { NextResponse } from 'next/server';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository, runtimeMode } from '@/lib/repositories';
import { recordConfirmedFunding } from '@/lib/stellar/server/signed-funding-service';
import {
  assertConnectedWalletForFunding,
  resolveSignedFundingTargetStatus,
  submitSignedFundingTransaction,
  validateSignedFundingXdr,
  type SignedFundingAction,
} from '@/lib/stellar/testnet-funding';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';

function isSignedFundingAction(value: unknown): value is SignedFundingAction {
  return value === 'buyer_deposit' || value === 'seller_deposit';
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  try {
    const auth = await requireDealParticipant(dealId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;
    const signedXdr = typeof body.signed_xdr === 'string' ? body.signed_xdr.trim() : '';
    const sourceAddress = typeof body.source_address === 'string' ? body.source_address.trim() : '';

    if (!isSignedFundingAction(action)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'action must be buyer_deposit or seller_deposit'),
        { status: 400 },
      );
    }

    if (!signedXdr) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'signed_xdr is required'),
        { status: 400 },
      );
    }

    if (
      (action === 'buyer_deposit' && auth.role !== 'buyer') ||
      (action === 'seller_deposit' && auth.role !== 'seller')
    ) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Only the matching deal participant can submit this funding transaction.'),
        { status: 403 },
      );
    }

    const custodyV2Rejection = rejectLegacyActionForCustodyV2(auth.deal, 'Signed funding submission');
    if (custodyV2Rejection) return custodyV2Rejection;

    const profile = await repository.getProfile(auth.user.id);
    assertConnectedWalletForFunding({ profile, sourceAddress });
    validateSignedFundingXdr({
      signedXdr,
      deal: auth.deal,
      action,
      sourceAddress,
    });

    resolveSignedFundingTargetStatus(auth.deal.status, action);
    const submitResult = await submitSignedFundingTransaction(signedXdr);
    const recorded = await recordConfirmedFunding({
      repository,
      dealId,
      action,
      actorId: auth.user.id,
      sourceAddress,
      transactionHash: submitResult.hash,
      allowDemoRecoveryFallback: runtimeMode === 'demo',
    });

    return NextResponse.json(
      createSuccessResponse(recorded.deal, {
        transaction_hash: submitResult.hash,
        custody_transaction_hash: recorded.custodyTransactionHash,
        funding_route: recorded.custodyStatus === 'confirmed'
          ? 'external_wallet_to_managed_profile_wallet_to_settleway_custody'
          : 'external_wallet_to_managed_profile_wallet',
        custody_status: recorded.custodyStatus,
        custody_message: recorded.custodyMessage,
        reused_existing_transaction: submitResult.reused_existing,
        reused_funding_record: recorded.reusedFundingRecord,
      }),
      { status: recorded.custodyStatus === 'pending' ? 202 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('STELLAR_FUNDING_SUBMIT_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
