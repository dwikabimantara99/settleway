import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { hasSupabaseConfig, supabase } from '@/lib/db/supabase-client';

export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  try {
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.from('buyer_requests').select('*').eq('id', requestId).single();
      if (error) throw error;
      return NextResponse.json(createSuccessResponse(data));
    }
    const req = mockStore.buyerRequests.get(requestId);
    if (!req) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Buyer request not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(req, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
