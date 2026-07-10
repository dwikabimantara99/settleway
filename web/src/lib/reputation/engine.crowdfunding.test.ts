import { describe, it, expect } from 'vitest';
import { isEligibleForCrowdfunding, IDR_TO_USD_RATE, CROWDFUNDING_MIN_VOLUME_USD, CROWDFUNDING_MIN_COMPLETED_TX } from './engine';
import type { DbProfile } from '../db/types';

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

  it('rejects profiles that are strictly buyers', () => {
    const profile = {
      ...baseProfile,
      user_type: 'buyer' as const,
      seller_completed_count: 100,
      verified_volume_idr: 1000000000
    };
    expect(isEligibleForCrowdfunding(profile)).toBe(false);
  });

  it('rejects sellers with fewer than the minimum completed transactions', () => {
    const profile = {
      ...baseProfile,
      seller_completed_count: CROWDFUNDING_MIN_COMPLETED_TX - 1,
      verified_volume_idr: CROWDFUNDING_MIN_VOLUME_USD * IDR_TO_USD_RATE + 1000000
    };
    expect(isEligibleForCrowdfunding(profile)).toBe(false);
  });

  it('rejects sellers with fewer than the minimum USD volume', () => {
    const profile = {
      ...baseProfile,
      seller_completed_count: CROWDFUNDING_MIN_COMPLETED_TX + 5,
      verified_volume_idr: (CROWDFUNDING_MIN_VOLUME_USD - 1) * IDR_TO_USD_RATE
    };
    expect(isEligibleForCrowdfunding(profile)).toBe(false);
  });

  it('accepts sellers meeting both the transaction count and volume thresholds', () => {
    const profile = {
      ...baseProfile,
      seller_completed_count: CROWDFUNDING_MIN_COMPLETED_TX,
      verified_volume_idr: CROWDFUNDING_MIN_VOLUME_USD * IDR_TO_USD_RATE
    };
    expect(isEligibleForCrowdfunding(profile)).toBe(true);
  });

  it('accepts "both" user types meeting thresholds', () => {
    const profile = {
      ...baseProfile,
      user_type: 'both' as const,
      seller_completed_count: CROWDFUNDING_MIN_COMPLETED_TX + 1,
      verified_volume_idr: (CROWDFUNDING_MIN_VOLUME_USD + 1) * IDR_TO_USD_RATE
    };
    expect(isEligibleForCrowdfunding(profile)).toBe(true);
  });
});
