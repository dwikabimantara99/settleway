import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { hasSupabaseConfig, supabase } from '@/lib/db/supabase-client';

export async function GET(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  try {
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.from('listings').select('*').eq('id', listingId).single();
      if (error) throw error;
      return NextResponse.json(createSuccessResponse(data));
    }
    const listing = await repository.getListing(listingId);
    if (!listing) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Listing not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(listing, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
