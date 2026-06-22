import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireDealParticipant } from '@/lib/auth/server';
import { repository, runtimeMode } from '@/lib/repositories';
import { completeCustodySweep } from '@/lib/stellar/server/custody-sweep-service';

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  try {
    const auth = await requireDealParticipant(dealId);
    const result = await completeCustodySweep({
      repository,
      deal: auth.deal,
      actorId: auth.user.id,
      allowDemoRecoveryFallback: runtimeMode === 'demo',
    });

    if (!result.ok) {
      return NextResponse.json(
        createErrorResponse('CUSTODY_SWEEP_PENDING', result.message, true),
        { status: result.reason === 'persistence_conflict' ? 409 : 503 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(result.deal, {
        transaction_hash: result.transactionHash,
        reused_existing_proof: result.reusedExistingProof,
        funding_route: 'managed_profile_wallets_to_settleway_custody',
      }),
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('CUSTODY_SWEEP_FAILED', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
