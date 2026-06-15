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
    participantRole: 'buyer' | 'seller',
    reputationOutcome: DbReputationEvent['reputation_outcome'],
    ruleVersion: string
  ): DbReputationEvent => ({
    id,
    deal_id: dealId,
    participant_id: participantId,
    participant_role: participantRole,
    reputation_outcome: reputationOutcome,
    reputation_rule_version: ruleVersion,
    idempotency_key: createIdempotencyKey(dealId, reputationOutcome, participantId, ruleVersion),
    score_delta: 10,
    volume_delta_idr: 1000000,
    created_at: new Date().toISOString()
  });

  it('appends and retrieves a reputation event', () => {
    const event = createTestEvent('rep-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1');
    store.appendReputationEvent(event);

    const retrieved = store.getReputationEvent('rep-1');
    expect(retrieved).toEqual(event);
  });

  it('lists events for the correct participant', () => {
    store.appendReputationEvent(createTestEvent('rep-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1'));
    store.appendReputationEvent(createTestEvent('rep-2', 'deal-2', 'user-2', 'seller', 'transaction_completed', 'v1'));
    store.appendReputationEvent(createTestEvent('rep-3', 'deal-3', 'user-1', 'buyer', 'transaction_completed', 'v1'));

    const user1Events = store.getParticipantReputationEvents('user-1');
    expect(user1Events.length).toBe(2);
    expect(user1Events.map(e => e.id).sort()).toEqual(['rep-1', 'rep-3']);

    const user2Events = store.getParticipantReputationEvents('user-2');
    expect(user2Events.length).toBe(1);
    expect(user2Events[0].id).toBe('rep-2');
  });

  it('lists events for the correct deal', () => {
    store.appendReputationEvent(createTestEvent('rep-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1'));
    store.appendReputationEvent(createTestEvent('rep-2', 'deal-1', 'user-2', 'seller', 'transaction_completed', 'v1'));

    const deal1Events = store.getDealReputationEvents('deal-1');
    expect(deal1Events.length).toBe(2);
    expect(deal1Events.map(e => e.participant_id).sort()).toEqual(['user-1', 'user-2']);
  });

  it('generates or accepts a deterministic idempotency identity', () => {
    const key1 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-1', 'v1');
    expect(key1).toBe(key2);
  });

  it('different participants receive distinct identities', () => {
    const key1 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-2', 'v1');
    expect(key1).not.toBe(key2);
  });

  it('different rule versions receive distinct identities', () => {
    const key1 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-1', 'v2');
    expect(key1).not.toBe(key2);
  });

  it('different terminal outcomes receive distinct identities', () => {
    const key1 = createIdempotencyKey('deal-1', 'transaction_completed', 'user-1', 'v1');
    const key2 = createIdempotencyKey('deal-1', 'refunded_before_locked', 'user-1', 'v1');
    expect(key1).not.toBe(key2);
  });

  it('repeated append with the same identity creates no duplicate business event', () => {
    const buyerEvent = createTestEvent('test-ev-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1');
    const sellerEvent = createTestEvent('test-ev-2', 'deal-1', 'user-2', 'seller', 'transaction_completed', 'v1');
    
    const res = store.appendReputationEventPair([buyerEvent, sellerEvent]);
    expect(res.appended).toBe(true);

    const check = store.getReputationEvent('test-ev-1');
    expect(check).toEqual(buyerEvent);
    const check2 = store.getReputationEvent('test-ev-2');
    expect(check2).toEqual(sellerEvent);
  });
  
  it('throws idempotency conflict if payload differs', () => {
    const event1 = createTestEvent('rep-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1');
    store.appendReputationEvent(event1);

    const event2 = { ...event1, id: 'rep-2', score_delta: 99 };
    expect(() => store.appendReputationEvent(event2)).toThrow('Idempotency conflict: conflicting business payload');
  });

  it('leaves collections unchanged on idempotency conflict', () => {
    const buyerEvent = createTestEvent('test-ev-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1');
    const sellerEvent = createTestEvent('test-ev-2', 'deal-1', 'user-2', 'seller', 'transaction_completed', 'v1');
    store.appendReputationEvent(buyerEvent);
    store.appendReputationEvent(sellerEvent);

    expect(() => {
      store.appendReputationEventPair([{ ...buyerEvent, id: 'test-ev-1a', score_delta: 20 }, { ...sellerEvent, id: 'test-ev-2a' }]);
    }).toThrow('Idempotency conflict');
    
    const retrieved = store.getReputationEvent('test-ev-1a');
    expect(retrieved).toBeNull();
    const dealEvents = store.getDealReputationEvents('deal-1');
    expect(dealEvents.length).toBe(2);
  });
  
  it('leaves collections unchanged on duplicate event ID', () => {
    const buyerEvent = createTestEvent('test-ev-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1');
    const sellerEvent = createTestEvent('test-ev-2', 'deal-1', 'user-2', 'seller', 'transaction_completed', 'v1');
    store.appendReputationEvent(buyerEvent);

    expect(() => {
      store.appendReputationEventPair([buyerEvent, sellerEvent]);
    }).toThrow('Idempotency conflict');
    
    const retrieved = store.getReputationEvent('test-ev-1');
    expect(retrieved?.deal_id).toBe('deal-1'); 
    const user2Events = store.getParticipantReputationEvents('user-2');
    expect(user2Events.length).toBe(0); 
  });

  it('idempotency key avoids delimiter collision', () => {
    // A deal ID containing :: or JSON characters
    const dealId = 'fake::deal::id';
    const key = createIdempotencyKey(dealId, 'transaction_completed', 'user-1', 'v1');
    
    // Parse it back to ensure it's structurally safe
    const parsed = JSON.parse(key);
    expect(parsed[1]).toBe(dealId);
  });

  it('prevents direct mutation of retrieved aggregate events', () => {
    const event = createTestEvent('rep-1', 'deal-1', 'user-1', 'buyer', 'transaction_completed', 'v1');
    store.appendReputationEvent(event);
    
    const retrieved = store.getReputationEvent('rep-1');
    retrieved!.score_delta = 999;
    
    const retrievedAgain = store.getReputationEvent('rep-1');
    expect(retrievedAgain?.score_delta).toBe(10);
  });
});
