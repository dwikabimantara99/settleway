import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { requireAuth } from '@/lib/auth/server';


export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {

    const profile = await repository.getProfile(userId);
    if (!profile) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Profile not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(profile, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  try {
    const authUser = await requireAuth();
    if (authUser.id !== userId) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'You can only update your own payout destination.'), { status: 403 });
    }

    const existingProfile = await repository.getProfile(userId);
    if (!existingProfile) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Profile not found'), { status: 404 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const payoutRailPreference = body.payout_rail_preference;
    const payoutWalletLabel = body.payout_wallet_label;
    const payoutWalletAddress = body.payout_wallet_address;

    if (payoutRailPreference !== 'wallet' && payoutRailPreference !== 'bank') {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'payout_rail_preference must be wallet or bank'), { status: 400 });
    }

    if (payoutRailPreference === 'bank') {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'Local bank payout is visible but not live in this MVP yet.'),
        { status: 400 },
      );
    }

    if (payoutRailPreference === 'wallet') {
      if (typeof payoutWalletLabel !== 'string' || payoutWalletLabel.trim() === '') {
        return NextResponse.json(createErrorResponse('BAD_REQUEST', 'payout_wallet_label is required for wallet payout'), { status: 400 });
      }
      if (typeof payoutWalletAddress !== 'string' || payoutWalletAddress.trim() === '') {
        return NextResponse.json(createErrorResponse('BAD_REQUEST', 'payout_wallet_address is required for wallet payout'), { status: 400 });
      }
    }

    await repository.updateProfile(userId, {
      payout_rail_preference: payoutRailPreference,
      payout_wallet_label:
        payoutRailPreference === 'wallet' && typeof payoutWalletLabel === 'string'
          ? payoutWalletLabel.trim()
          : existingProfile.payout_wallet_label,
      payout_wallet_address:
        payoutRailPreference === 'wallet' && typeof payoutWalletAddress === 'string'
          ? payoutWalletAddress.trim()
          : existingProfile.payout_wallet_address,
    });

    const updatedProfile = await repository.getProfile(userId);
    return NextResponse.json(createSuccessResponse(updatedProfile, { source: 'mock' }));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', err.message), { status: 401 });
    }

    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
