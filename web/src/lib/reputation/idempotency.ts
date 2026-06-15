import { ReputationOutcome } from '../db/types';

export function createIdempotencyKey(dealId: string, reputationOutcome: ReputationOutcome, participantId: string, reputationRuleVersion: string): string {
  // Use a versioned JSON array to prevent delimiter collision
  return JSON.stringify(['v1', dealId, reputationOutcome, participantId, reputationRuleVersion]);
}
