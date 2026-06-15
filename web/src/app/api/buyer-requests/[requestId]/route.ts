import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';


export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  try {
    const req = await repository.getBuyerRequest(requestId);
    if (!req) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Buyer request not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(req, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
