import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireAuth } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';

export async function GET() {
  try {
    const user = await requireAuth();
    const notifications = await repository.getNotifications(user.id);
    return NextResponse.json(createSuccessResponse(notifications, { source: 'repository' }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('UNAUTHORIZED', error instanceof Error ? error.message : String(error)),
      { status: 401 },
    );
  }
}
