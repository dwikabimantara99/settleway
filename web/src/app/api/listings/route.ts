import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';


export async function GET() {
  try {
    const listings = await repository.getListings();
    return NextResponse.json(createSuccessResponse(listings, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
