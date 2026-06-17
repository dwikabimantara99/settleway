import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'buyer_deposit' as EscrowAction;

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
    if (userRole !== 'buyer') return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only buyer can perform this action'), { status: 403 });

    const updatedDeal = transition(existingDeal, actionName);
    const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
    if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    
    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Buyer deposit recorded for escrow preparation.',
      {
        participant_role: 'buyer',
        deposit_total_idr: updatedDeal.buyer_total_idr,
        next_status: updatedDeal.status,
      },
    );
    await repository.addEvent(event);

    if (updatedDeal.status === 'LOCKED') {
      const protectedValueIdr =
        updatedDeal.principal_idr + updatedDeal.buyer_bond_idr + updatedDeal.seller_bond_idr;
      const lockEvent = createEvent(
        dealId,
        'escrow_locked',
        authUser.id,
        'Escrow locked after both required deposits were confirmed.',
        {
          protected_value_idr: protectedValueIdr,
          buyer_total_idr: updatedDeal.buyer_total_idr,
          seller_total_idr: updatedDeal.seller_total_idr,
          platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
          next_status: updatedDeal.status,
        },
      );
      await repository.addEvent(lockEvent);
    }

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
