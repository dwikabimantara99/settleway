export function createIdempotencyKey(dealId: string, terminalOutcome: string, participantId: string, reputationRuleVersion: string): string {
  return `${dealId}::${terminalOutcome}::${participantId}::${reputationRuleVersion}`;
}
