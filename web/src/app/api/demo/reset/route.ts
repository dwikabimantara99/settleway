import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse } from '@/lib/api/validation';

export async function POST() {
  // Phase 4: Only reset the in-memory mock store
  mockStore.seed();
  return NextResponse.json(createSuccessResponse({ success: true, message: 'Mock store reset to initial seed data' }));
}
