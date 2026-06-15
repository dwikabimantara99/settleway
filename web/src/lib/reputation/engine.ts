import { DbReputationEvent, DbReputationAggregate, ReputationOutcome } from '../db/types';
import { createIdempotencyKey } from './idempotency';

export interface AuthoritativeReputationDecision {
  deal_id: string;
  buyer_id: string;
  seller_id: string;
  reputation_outcome: ReputationOutcome;
  principal_idr: number;
  local_terminal_outcome_persisted: boolean;
  operation_status: string;
  sync_status: string;
}

export function evaluateReputationEligibility(decision: AuthoritativeReputationDecision): boolean {
  if (!decision.local_terminal_outcome_persisted) return false;
  if (['pending', 'submitted', 'unknown', 'failed'].includes(decision.operation_status)) return false;
  if (decision.sync_status === 'out_of_sync') return false;
  
  return true;
}

export function buildReputationEvents(decision: AuthoritativeReputationDecision, eventIdGenerator: () => string, ruleVersion: string = 'v1'): DbReputationEvent[] {
  if (!evaluateReputationEligibility(decision)) {
    return [];
  }

  let buyerScoreDelta = 0;
  let sellerScoreDelta = 0;
  let buyerVolumeDelta = 0;
  let sellerVolumeDelta = 0;

  switch (decision.reputation_outcome) {
    case 'transaction_completed':
      buyerScoreDelta = 10;
      sellerScoreDelta = 10;
      buyerVolumeDelta = decision.principal_idr;
      sellerVolumeDelta = decision.principal_idr;
      break;
    case 'buyer_failed_deposit':
      buyerScoreDelta = -3;
      sellerScoreDelta = 0;
      break;
    case 'seller_failed_deposit':
      buyerScoreDelta = 0;
      sellerScoreDelta = -3;
      break;
    case 'refunded_before_locked':
      buyerScoreDelta = 0;
      sellerScoreDelta = 0;
      break;
    case 'verified_harvest_failure':
      buyerScoreDelta = 0;
      sellerScoreDelta = -1;
      break;
  }

  const now = new Date().toISOString();

  const buyerEvent: DbReputationEvent = {
    id: eventIdGenerator(),
    deal_id: decision.deal_id,
    participant_id: decision.buyer_id,
    participant_role: 'buyer',
    reputation_outcome: decision.reputation_outcome,
    reputation_rule_version: ruleVersion,
    idempotency_key: createIdempotencyKey(decision.deal_id, decision.reputation_outcome, decision.buyer_id, ruleVersion),
    score_delta: buyerScoreDelta,
    volume_delta_idr: buyerVolumeDelta,
    created_at: now
  };

  const sellerEvent: DbReputationEvent = {
    id: eventIdGenerator(),
    deal_id: decision.deal_id,
    participant_id: decision.seller_id,
    participant_role: 'seller',
    reputation_outcome: decision.reputation_outcome,
    reputation_rule_version: ruleVersion,
    idempotency_key: createIdempotencyKey(decision.deal_id, decision.reputation_outcome, decision.seller_id, ruleVersion),
    score_delta: sellerScoreDelta,
    volume_delta_idr: sellerVolumeDelta,
    created_at: now
  };

  return [buyerEvent, sellerEvent];
}

export function rebuildReputationAggregate(events: DbReputationEvent[]): DbReputationAggregate {
  const agg: DbReputationAggregate = {
    seller_score: 0,
    buyer_score: 0,
    seller_completed_count: 0,
    buyer_completed_count: 0,
    verified_volume_idr: 0
  };

  for (const ev of events) {
    if (ev.participant_role === 'buyer') {
      agg.buyer_score += ev.score_delta;
      if (ev.reputation_outcome === 'transaction_completed') {
        agg.buyer_completed_count += 1;
      }
    } else if (ev.participant_role === 'seller') {
      agg.seller_score += ev.score_delta;
      if (ev.reputation_outcome === 'transaction_completed') {
        agg.seller_completed_count += 1;
      }
    }
    
    agg.verified_volume_idr += ev.volume_delta_idr;
  }

  return agg;
}

export interface ReputationStore {
  appendReputationEvent(event: DbReputationEvent): { appended: boolean; event: DbReputationEvent };
}

export function processReputationOutcome(store: ReputationStore, decision: AuthoritativeReputationDecision, eventIdGenerator: () => string) {
  const events = buildReputationEvents(decision, eventIdGenerator);
  const results = [];
  for (const ev of events) {
    const res = store.appendReputationEvent(ev);
    results.push(res);
  }
  return results;
}
