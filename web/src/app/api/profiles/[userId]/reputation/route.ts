import { NextResponse } from 'next/server';
import { createPrivilegedServerRepository } from '@/lib/repositories/server-repository';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const repository = createPrivilegedServerRepository();
    
    const events = await repository.client
      .from('reputation_events')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });
      
    if (events.error) {
      console.error('Error fetching reputation events:', events.error);
      return NextResponse.json(createErrorResponse('DB_ERROR', events.error.message), { status: 500 });
    }
    
    let totalScore = 0;
    let totalVolume = 0;
    
    for (const event of events.data) {
      totalScore += Number(event.score_delta || 0);
      totalVolume += Number(event.volume_delta_idr || 0);
    }
    
    return NextResponse.json(createSuccessResponse({
      profile_id: userId,
      total_score: totalScore,
      total_volume_idr: totalVolume,
      events: events.data
    }));
  } catch (error) {
    console.error(`GET /api/profiles/[userId]/reputation Error:`, error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : String(error)),
      { status: 500 }
    );
  }
}
