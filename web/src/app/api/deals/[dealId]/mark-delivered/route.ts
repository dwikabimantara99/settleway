import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';

async function runLegacyLocalDeliveryMilestone(
  dealId: string,
  existingDeal: DbDeal,
  actorId: string,
) {
  const updatedDeal = transition(existingDeal, 'mark_delivered');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });

  const event = createEvent(
    dealId,
    'mark_delivered',
    actorId,
    'Seller marked the shipment milestone as delivered.',
    {
      next_status: updatedDeal.status,
      proof_hash: updatedDeal.proof_hash,
    },
  );
  await repository.addEvent(event);

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'mark_delivered' as EscrowAction;

  try {
    let existingDeal;
    let userRole;
    let authUser;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
      userRole = auth.role;
      authUser = auth.user;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }
    if (userRole !== 'seller') {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only seller can perform this action'), { status: 403 });
    }

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalDeliveryMilestone(dealId, existingDeal, authUser.id);
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Delivery confirmation is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'mark_delivered',
      action_label: 'delivery confirmation',
      deal: existingDeal,
      runtime: runtimeLoaded.runtime,
    });
    if (!executionResult.ok) {
      return NextResponse.json(
        createErrorResponse(executionResult.failure.code, executionResult.failure.message),
        { status: executionResult.failure.status },
      );
    }

    const updatedDeal = executionResult.deal;
    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Seller marked delivery through the protected Testnet-backed room path.',
      {
        next_status: updatedDeal.status,
        proof_hash: updatedDeal.proof_hash,
        contract_id: runtimeLoaded.runtime.contract_id,
        actor_address: runtimeLoaded.runtime.metadata.seller_demo_address,
      },
    );
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
