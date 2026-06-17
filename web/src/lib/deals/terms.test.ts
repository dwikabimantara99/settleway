import { describe, expect, it } from 'vitest';
import {
  buildActiveRoomDealTerms,
  getDealActivatedAt,
  getDealActivationSource,
  getDealDepositDeadlineAt,
  getDealDepositWindowHours,
  getDealOfferId,
} from './terms';

describe('active room deal terms contract', () => {
  it('builds the mutual-open activation contract with explicit metadata', () => {
    const activatedAt = '2026-06-17T09:18:00.000Z';
    const terms = buildActiveRoomDealTerms({
      offerId: 'offer-123',
      activatedAt,
      depositWindowHours: 24,
    });

    expect(terms.activation_source).toBe('mutual_open_deal_room');
    expect(terms.offer_id).toBe('offer-123');
    expect(terms.deposit_window_hours).toBe(24);
    expect(terms.deposit_deadline_at).toBe('2026-06-18T09:18:00.000Z');
    expect(terms.activated_at).toBe(activatedAt);
  });

  it('resolves defaults and helper accessors safely for partial terms', () => {
    const createdAt = '2026-06-17T00:00:00.000Z';

    expect(getDealActivationSource({})).toBeNull();
    expect(getDealOfferId({})).toBeNull();
    expect(getDealDepositWindowHours({})).toBe(24);
    expect(getDealActivatedAt({})).toBeNull();
    expect(getDealDepositDeadlineAt({ terms: {}, createdAt })).toBe('2026-06-18T00:00:00.000Z');
  });
});
