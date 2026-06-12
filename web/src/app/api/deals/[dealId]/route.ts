import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { hasSupabaseConfig, supabase } from '@/lib/db/supabase-client';

export async function GET(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();
      if (error) throw error;
      return NextResponse.json(createSuccessResponse(data));
    }
    const deal = mockStore.deals.get(dealId);
    if (!deal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(deal, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
