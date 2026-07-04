import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';

export function rejectLegacyActionForCustodyV2(
  deal: Pick<DbDeal, 'rail_version'>,
  actionLabel: string,
) {
  if (deal.rail_version !== 'custody_v2_testnet') {
    return null;
  }

  return NextResponse.json(
    createErrorResponse(
      'CUSTODY_V2_ACTION_REQUIRED',
      `${actionLabel} is not available for Custody V2 Testnet deals. Use the Custody V2 action panel instead.`,
    ),
    { status: 409 },
  );
}
