import { describe, it, expect } from 'vitest';
import {
  AuthoritativeReputationDecision,
  evaluateReputationEligibility,
  buildReputationEvents,
  rebuildReputationAggregate
} from './engine';
import { DbReputationEvent } from '../db/types';
import { createIdempotencyKey } from './idempotency';

describe('Reputation Engine', () => {
  const createDecision = (overrides: Partial<AuthoritativeReputationDecision> = {}): AuthoritativeReputationDecision => ({
    deal_id: 'deal-1',
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    reputation_outcome: 'transaction_completed',
    principal_idr: 1000000,
    local_terminal_outcome_persisted: true,
    operation_status: 'confirmed',
    sync_status: 'idle',
    ...overrides
  });

  const eventIdGenerator = () => `ev-${Math.random()}`;

  describe('Eligibility', () => {
    it('approves eligible decision', () => {
      const decision = createDecision();
      expect(evaluateReputationEligibility(decision)).toBe(true);
    });

    it('rejects if local_terminal_outcome_persisted is false', () => {
      const decision = createDecision({ local_terminal_outcome_persisted: false });
      expect(evaluateReputationEligibility(decision)).toBe(false);
    });

    it('rejects pending, submitted, unknown, failed operations', () => {
      const states = ['pending', 'submitted', 'unknown', 'failed'];
      for (const st of states) {
        const decision = createDecision({ operation_status: st });
        expect(evaluateReputationEligibility(decision)).toBe(false);
      }
    });

    it('rejects out_of_sync', () => {
      const decision = createDecision({ sync_status: 'out_of_sync' });
      expect(evaluateReputationEligibility(decision)).toBe(false);
    });
  });

  describe('Event Generation', () => {
    it('generates no events for ineligible decision', () => {
      const decision = createDecision({ operation_status: 'pending' });
      const events = buildReputationEvents(decision, eventIdGenerator);
      expect(events.length).toBe(0);
    });

    it('generates two events for transaction_completed', () => {
      const decision = createDecision({ reputation_outcome: 'transaction_completed', principal_idr: 500000 });
      const events = buildReputationEvents(decision, eventIdGenerator);
      
      expect(events.length).toBe(2);
      const buyerEv = events.find(e => e.participant_role === 'buyer')!;
      const sellerEv = events.find(e => e.participant_role === 'seller')!;

      expect(buyerEv.score_delta).toBe(10);
      expect(buyerEv.volume_delta_idr).toBe(500000);

      expect(sellerEv.score_delta).toBe(10);
      expect(sellerEv.volume_delta_idr).toBe(500000);
    });

    it('generates correct deltas for buyer_failed_deposit', () => {
      const decision = createDecision({ reputation_outcome: 'buyer_failed_deposit', principal_idr: 500000 });
      const events = buildReputationEvents(decision, eventIdGenerator);
      
      const buyerEv = events.find(e => e.participant_role === 'buyer')!;
      const sellerEv = events.find(e => e.participant_role === 'seller')!;

      expect(buyerEv.score_delta).toBe(-3);
      expect(buyerEv.volume_delta_idr).toBe(0);

      expect(sellerEv.score_delta).toBe(0);
      expect(sellerEv.volume_delta_idr).toBe(0);
    });

    it('generates correct deltas for seller_failed_deposit', () => {
      const decision = createDecision({ reputation_outcome: 'seller_failed_deposit', principal_idr: 500000 });
      const events = buildReputationEvents(decision, eventIdGenerator);
      
      const buyerEv = events.find(e => e.participant_role === 'buyer')!;
      const sellerEv = events.find(e => e.participant_role === 'seller')!;

      expect(buyerEv.score_delta).toBe(0);
      expect(buyerEv.volume_delta_idr).toBe(0);

      expect(sellerEv.score_delta).toBe(-3);
      expect(sellerEv.volume_delta_idr).toBe(0);
    });

    it('generates correct deltas for refunded_before_locked', () => {
      const decision = createDecision({ reputation_outcome: 'refunded_before_locked', principal_idr: 500000 });
      const events = buildReputationEvents(decision, eventIdGenerator);
      
      const buyerEv = events.find(e => e.participant_role === 'buyer')!;
      const sellerEv = events.find(e => e.participant_role === 'seller')!;

      expect(buyerEv.score_delta).toBe(0);
      expect(buyerEv.volume_delta_idr).toBe(0);

      expect(sellerEv.score_delta).toBe(0);
      expect(sellerEv.volume_delta_idr).toBe(0);
    });

    it('generates correct deltas for verified_harvest_failure', () => {
      const decision = createDecision({ reputation_outcome: 'verified_harvest_failure', principal_idr: 500000 });
      const events = buildReputationEvents(decision, eventIdGenerator);
      
      const buyerEv = events.find(e => e.participant_role === 'buyer')!;
      const sellerEv = events.find(e => e.participant_role === 'seller')!;

      expect(buyerEv.score_delta).toBe(0);
      expect(buyerEv.volume_delta_idr).toBe(0);

      expect(sellerEv.score_delta).toBe(-1);
      expect(sellerEv.volume_delta_idr).toBe(0);
    });
  });

  describe('Aggregate Rebuild', () => {
    it('produces zeroes for empty events', () => {
      const agg = rebuildReputationAggregate([]);
      expect(agg).toEqual({
        seller_score: 0,
        buyer_score: 0,
        seller_completed_count: 0,
        buyer_completed_count: 0,
        refunded_count: 0,
        expired_count: 0,
        verified_volume_idr: 0
      });
    });

    it('accumulates properly for a mixed participant', () => {
      const idenKey = createIdempotencyKey('1', 'transaction_completed', 'p1', 'v1');
      const ev1: DbReputationEvent = {
        id: '1', deal_id: 'd1', participant_id: 'p1', participant_role: 'buyer',
        reputation_outcome: 'transaction_completed', reputation_rule_version: 'v1',
        idempotency_key: idenKey, score_delta: 10, volume_delta_idr: 1000, created_at: 'now'
      };
      const ev2: DbReputationEvent = {
        id: '2', deal_id: 'd2', participant_id: 'p1', participant_role: 'seller',
        reputation_outcome: 'seller_failed_deposit', reputation_rule_version: 'v1',
        idempotency_key: idenKey, score_delta: -3, volume_delta_idr: 0, created_at: 'now'
      };

      const agg = rebuildReputationAggregate([ev1, ev2]);
      
      expect(agg.buyer_score).toBe(10);
      expect(agg.seller_score).toBe(-3);
      expect(agg.buyer_completed_count).toBe(1);
      expect(agg.seller_completed_count).toBe(0);
      expect(agg.verified_volume_idr).toBe(1000);
    });

    it('ordering independence', () => {
      const idenKey = createIdempotencyKey('1', 'transaction_completed', 'p1', 'v1');
      const ev1: DbReputationEvent = {
        id: '1', deal_id: 'd1', participant_id: 'p1', participant_role: 'buyer',
        reputation_outcome: 'transaction_completed', reputation_rule_version: 'v1',
        idempotency_key: idenKey, score_delta: 10, volume_delta_idr: 1000, created_at: 'now'
      };
      const ev2: DbReputationEvent = {
        id: '2', deal_id: 'd2', participant_id: 'p1', participant_role: 'seller',
        reputation_outcome: 'seller_failed_deposit', reputation_rule_version: 'v1',
        idempotency_key: idenKey, score_delta: -3, volume_delta_idr: 0, created_at: 'now'
      };

      const agg1 = rebuildReputationAggregate([ev1, ev2]);
      const agg2 = rebuildReputationAggregate([ev2, ev1]);
      expect(agg1).toEqual(agg2);
    });
  });
});
