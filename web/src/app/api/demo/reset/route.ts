import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store'; // Keeping for demo reset
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';

export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_RESET !== 'true') {
    return NextResponse.json(createErrorResponse('ERR_UNSUPPORTED_MODE', 'Demo reset is not supported in this environment'), { status: 403 });
  }

  // Phase 4/9: Only reset the in-memory mock store
  mockStore.seed();
  return NextResponse.json(createSuccessResponse({ success: true, message: 'Mock store reset to initial seed data' }));
}
