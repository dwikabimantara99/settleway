import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';


export async function GET(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    const deal = await repository.getDeal(dealId);
    if (!deal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(deal, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
