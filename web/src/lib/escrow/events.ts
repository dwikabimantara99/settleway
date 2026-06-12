import { DbEscrowEvent } from '../db/types';

export function createEvent(
  dealId: string,
  eventType: string,
  actorId: string | null = null,
  message: string | null = null,
  metadata: Record<string, unknown> = {}
): DbEscrowEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    deal_id: dealId,
    event_type: eventType,
    actor_id: actorId,
    message,
    tx_hash: null,
    proof_hash: null,
    metadata,
    created_at: new Date().toISOString(),
  };
}
