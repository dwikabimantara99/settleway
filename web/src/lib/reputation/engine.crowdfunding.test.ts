import { describe, it, expect } from 'vitest';
import { isEligibleForCrowdfunding, IDR_TO_USD_RATE, CROWDFUNDING_MIN_VOLUME_USD, CROWDFUNDING_MIN_COMPLETED_TX } from './engine';
import type { DbProfile, DbReputationEvent } from '../db/types';

describe('Crowdfunding Eligibility Primitive', () => {
  const baseProfile: DbProfile = {
    id: 'test-profile',
    display_name: 'Test Seller',
    role_label: 'Seller',
    location: null,
    user_type: 'seller',
    seller_score: 100,
    buyer_score: 0,
    seller_completed_count: 0,
    buyer_completed_count: 0,
    verified_volume_idr: 0,
    proof_visibility: 'private',
    payout_rail_preference: 'wallet',
    payout_wallet_label: null,
    payout_wallet_address: null,
    connected_wallet_address: null,
    connected_wallet_network: null,
    connected_wallet_provider: null,
    connected_wallet_linked_at: null,
    payout_bank_name: null,
    payout_bank_account: null,
    created_at: new Date().toISOString()
  };

  const createEvents = (count: number, volumePerEvent: number): DbReputationEvent[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `ev-${i}`,
      profile_id: 'test-profile',
      deal_id: `deal-${i}`,
      participant_id: 'test-profile',
      participant_role: 'seller',
      reputation_outcome: 'transaction_completed',
      reputation_rule_version: 'v1',
      idempotency_key: `ik-${i}`,
      score_delta: 10,
      volume_delta_idr: volumePerEvent,
      public_tx_hash: null,
      created_at: new Date().toISOString()
    })) as DbReputationEvent[];
  };

  it('rejects profiles that are strictly buyers', () => {
    const profile = {
      ...baseProfile,
      user_type: 'buyer' as const,
    };
    const events = createEvents(100, 1000000000);
    expect(isEligibleForCrowdfunding(profile, events)).toBe(false);
  });

  it('rejects sellers with fewer than the minimum completed transactions', () => {
    const events = createEvents(CROWDFUNDING_MIN_COMPLETED_TX - 1, (CROWDFUNDING_MIN_VOLUME_USD * IDR_TO_USD_RATE + 1000000) / (CROWDFUNDING_MIN_COMPLETED_TX - 1));
    expect(isEligibleForCrowdfunding(baseProfile, events)).toBe(false);
  });

  it('rejects sellers with fewer than the minimum USD volume', () => {
    const events = createEvents(CROWDFUNDING_MIN_COMPLETED_TX + 5, ((CROWDFUNDING_MIN_VOLUME_USD - 1) * IDR_TO_USD_RATE) / (CROWDFUNDING_MIN_COMPLETED_TX + 5));
    expect(isEligibleForCrowdfunding(baseProfile, events)).toBe(false);
  });

  it('accepts sellers meeting both the transaction count and volume thresholds', () => {
    const events = createEvents(CROWDFUNDING_MIN_COMPLETED_TX, (CROWDFUNDING_MIN_VOLUME_USD * IDR_TO_USD_RATE) / CROWDFUNDING_MIN_COMPLETED_TX);
    expect(isEligibleForCrowdfunding(baseProfile, events)).toBe(true);
  });

  it('accepts "both" user types meeting thresholds', () => {
    const profile = {
      ...baseProfile,
      user_type: 'both' as const,
    };
    const events = createEvents(CROWDFUNDING_MIN_COMPLETED_TX + 1, ((CROWDFUNDING_MIN_VOLUME_USD + 1) * IDR_TO_USD_RATE) / (CROWDFUNDING_MIN_COMPLETED_TX + 1));
    expect(isEligibleForCrowdfunding(profile, events)).toBe(true);
  });
});
