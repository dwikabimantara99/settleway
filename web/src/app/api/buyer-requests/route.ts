import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { hasSupabaseConfig, supabase } from '@/lib/db/supabase-client';

export async function GET() {
  try {
    if (hasSupabaseConfig && supabase) {
      const { data, error } = await supabase.from('buyer_requests').select('*');
      if (error) throw error;
      return NextResponse.json(createSuccessResponse(data));
    }
    const requests = await repository.getBuyerRequests();
    return NextResponse.json(createSuccessResponse(requests, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
