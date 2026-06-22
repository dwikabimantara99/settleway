import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireAuth } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    await requireAuth();
    const { notificationId } = await params;
    if (!notificationId) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'notificationId is required'),
        { status: 400 },
      );
    }
    await repository.markNotificationRead(notificationId);
    return NextResponse.json(createSuccessResponse({ id: notificationId }));
  } catch (error: unknown) {
    return NextResponse.json(
      createErrorResponse('UNAUTHORIZED', error instanceof Error ? error.message : String(error)),
      { status: 401 },
    );
  }
}
