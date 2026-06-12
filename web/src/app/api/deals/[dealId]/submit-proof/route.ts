import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api/validation';

export async function POST() {
  return NextResponse.json(
    createErrorResponse('NOT_IMPLEMENTED', 'This action belongs to Phase 5 or later.', false),
    { status: 501 }
  );
}
