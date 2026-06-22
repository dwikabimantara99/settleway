import { NextResponse } from 'next/server';
import { performOpenDealRoomCommitment } from '@/lib/offers/open-deal-room';

export async function POST(_request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const result = await performOpenDealRoomCommitment(offerId);
  return NextResponse.json(result.payload, { status: result.status });
}
