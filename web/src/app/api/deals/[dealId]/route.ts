import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { hasSupabaseConfig, supabase } from '@/lib/db/supabase-client';

export async function GET(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  try {
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();
      if (error) throw error;
      const events = await repository.getDealEvents(dealId);
      const stellarOps = await repository.findStellarOperationsByDeal(dealId);
      const evidence = await repository.getDealEvidence(dealId);
      return NextResponse.json(createSuccessResponse({ ...data, events, stellarOps, evidence }));
    }
    const deal = await repository.getDeal(dealId);
    if (!deal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(deal, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
