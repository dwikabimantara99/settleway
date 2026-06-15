import { describe, it, expect, beforeEach } from 'vitest';
import { MockStore } from './mock-store';
import { DbReputationEvent } from './types';
import { createIdempotencyKey } from '../reputation/idempotency';

describe('MockStore - Reputation', () => {
  let store: MockStore;

  beforeEach(() => {
    store = new MockStore();
    store.reputationEvents.clear();
    store.reputationIdempotencyKeys.clear();
  });

  const createTestEvent = (
    id: string,
    dealId: string,
    participantId: string,
    terminalOutcome: 'completed' | 'refunded' | 'expired',
    ruleVersion: string
  ): DbReputationEvent => ({
    id,
    deal_id: dealId,
    participant_id: participantId,
    terminal_outcome: terminalOutcome,
    reputation_rule_version: ruleVersion,
    idempotency_key: createIdempotencyKey(dealId, terminalOutcome, participantId, ruleVersion),
    score_delta: 10,
    volume_delta_idr: 1000000,
    created_at: new Date().toISOString()
  });

  it('appends and retrieves a reputation event', () => {
    const event = createTestEvent('rep-1', 'deal-1', 'user-1', 'completed', 'v1');
    store.appendReputationEvent(event);

    const retrieved = store.getReputationEvent('rep-1');
    expect(retrieved).toEqual(event);
  });

  it('lists events for the correct participant', () => {
    store.appendReputationEvent(createTestEvent('rep-1', 'deal-1', 'user-1', 'completed', 'v1'));
    store.appendReputationEvent(createTestEvent('rep-2', 'deal-2', 'user-2', 'completed', 'v1'));
    store.appendReputationEvent(createTestEvent('rep-3', 'deal-3', 'user-1', 'completed', 'v1'));

    const user1Events = store.getParticipantReputationEvents('user-1');
    expect(user1Events.length).toBe(2);
    expect(user1Events.map(e => e.id).sort()).toEqual(['rep-1', 'rep-3']);

    const user2Events = store.getParticipantReputationEvents('user-2');
    expect(user2Events.length).toBe(1);
    expect(user2Events[0].id).toBe('rep-2');
  });

  it('lists events for the correct deal', () => {
    store.appendReputationEvent(createTestEvent('rep-1', 'deal-1', 'user-1', 'completed', 'v1'));
    store.appendReputationEvent(createTestEvent('rep-2', 'deal-1', 'user-2', 'completed', 'v1'));

    const deal1Events = store.getDealReputationEvents('deal-1');
    expect(deal1Events.length).toBe(2);
    expect(deal1Events.map(e => e.participant_id).sort()).toEqual(['user-1', 'user-2']);
  });

  it('generates or accepts a deterministic idempotency identity', () => {
    const key1 = createIdempotencyKey('deal-1', 'completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'completed', 'user-1', 'v1');
    expect(key1).toBe(key2);
  });

  it('different participants receive distinct identities', () => {
    const key1 = createIdempotencyKey('deal-1', 'completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'completed', 'user-2', 'v1');
    expect(key1).not.toBe(key2);
  });

  it('different rule versions receive distinct identities', () => {
    const key1 = createIdempotencyKey('deal-1', 'completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'completed', 'user-1', 'v2');
    expect(key1).not.toBe(key2);
  });

  it('different terminal outcomes receive distinct identities', () => {
    const key1 = createIdempotencyKey('deal-1', 'completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'refunded', 'user-1', 'v1');
    expect(key1).not.toBe(key2);
  });

  it('repeated append with the same identity creates no duplicate business event', () => {
    const event1 = createTestEvent('rep-1', 'deal-1', 'user-1', 'completed', 'v1');
    store.appendReputationEvent(event1);

    // Attempt to append the same business event (different primary ID but same idempotency key)
    const event2 = { ...event1, id: 'rep-2' };
    store.appendReputationEvent(event2);

    const dealEvents = store.getDealReputationEvents('deal-1');
    expect(dealEvents.length).toBe(1);
    expect(dealEvents[0].id).toBe('rep-1'); // The first one was kept
  });
  
  it('prevents direct mutation of retrieved aggregate events', () => {
    const event = createTestEvent('rep-1', 'deal-1', 'user-1', 'completed', 'v1');
    store.appendReputationEvent(event);
    
    const retrieved = store.getReputationEvent('rep-1');
    retrieved!.score_delta = 999;
    
    const retrievedAgain = store.getReputationEvent('rep-1');
    expect(retrievedAgain?.score_delta).toBe(10);
  });
});
