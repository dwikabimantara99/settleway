import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireAuth } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';

export async function GET() {
  try {
    const user = await requireAuth();
    let notifications = await repository.getNotifications(user.id);
    
    if (notifications.length === 0) {
      const { getDemoNotifications } = await import('@/lib/offers/demo-service');
      const demoNotifs = await getDemoNotifications(user.id);
      if (demoNotifs.length > 0) {
        notifications = demoNotifs;
      }
    }
    
    return NextResponse.json(createSuccessResponse(notifications, { source: 'repository' }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('UNAUTHORIZED', error instanceof Error ? error.message : String(error)),
      { status: 401 },
    );
  }
}
