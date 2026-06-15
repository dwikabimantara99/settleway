export function createIdempotencyKey(dealId: string, terminalOutcome: string, participantId: string, reputationRuleVersion: string): string {
  // Use a versioned JSON array to prevent delimiter collision
  return JSON.stringify(['v1', dealId, terminalOutcome, participantId, reputationRuleVersion]);
}
