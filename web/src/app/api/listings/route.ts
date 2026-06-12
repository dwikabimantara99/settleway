import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { hasSupabaseConfig, supabase } from '@/lib/db/supabase-client';

export async function GET() {
  try {
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.from('listings').select('*');
      if (error) throw error;
      return NextResponse.json(createSuccessResponse(data));
    }
    const listings = Array.from(mockStore.listings.values());
    return NextResponse.json(createSuccessResponse(listings, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
