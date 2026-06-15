import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';


export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {

    const profile = await repository.getProfile(userId);
    if (!profile) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Profile not found'), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(profile, { source: 'mock' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('DB_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
