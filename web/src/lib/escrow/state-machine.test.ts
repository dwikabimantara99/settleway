import { describe, expect, it } from 'vitest';
import {
  lockAfterCustody,
  isClosedDealStatus,
  isFundingWindowDealStatus,
  isPostLockDealStatus,
  isPostProofDealStatus,
  isPreLockDealStatus,
  isTerminalDealStatus,
  transition,
  type DealStatus,
} from './state-machine';
import type { DbDeal } from '../db/types';

function makeDeal(status: DealStatus): DbDeal {
  return {
    id: 'deal-1',
    listing_id: null,
    buyer_request_id: null,
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    commodity: 'Test',
    volume_kg: null,
    principal_idr: 1000,
    buyer_bond_idr: 50,
    seller_bond_idr: 50,
    buyer_fee_idr: 5,
    seller_fee_idr: 5,
    buyer_total_idr: 1055,
    seller_total_idr: 55,
    status,
    stellar_mode: 'mock_only',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {},
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
  };
}

describe('escrow state semantics', () => {
  it('classifies funding-window and pre-lock statuses consistently', () => {
    expect(isFundingWindowDealStatus('WAITING_DEPOSITS')).toBe(true);
    expect(isFundingWindowDealStatus('BUYER_FUNDED')).toBe(true);
    expect(isFundingWindowDealStatus('SELLER_FUNDED')).toBe(true);
    expect(isFundingWindowDealStatus('CUSTODY_PENDING')).toBe(true);
    expect(isFundingWindowDealStatus('LOCKED')).toBe(false);

    expect(isPreLockDealStatus('WAITING_DEPOSITS')).toBe(true);
    expect(isPreLockDealStatus('BUYER_FUNDED')).toBe(true);
    expect(isPreLockDealStatus('SELLER_FUNDED')).toBe(true);
    expect(isPreLockDealStatus('CUSTODY_PENDING')).toBe(true);
    expect(isPreLockDealStatus('LOCKED')).toBe(false);
  });

  it('locks only from custody pending', () => {
    expect(lockAfterCustody(makeDeal('CUSTODY_PENDING')).status).toBe('LOCKED');
    expect(() => lockAfterCustody(makeDeal('BUYER_FUNDED'))).toThrow('custody lock');
  });

  it('classifies post-lock, post-proof, closed, and terminal statuses consistently', () => {
    expect(isPostLockDealStatus('LOCKED')).toBe(true);
    expect(isPostLockDealStatus('PROOF_SUBMITTED')).toBe(true);
    expect(isPostLockDealStatus('DELIVERED')).toBe(true);
    expect(isPostLockDealStatus('COMPLETED')).toBe(true);
    expect(isPostLockDealStatus('REFUNDED')).toBe(false);

    expect(isPostProofDealStatus('PROOF_SUBMITTED')).toBe(true);
    expect(isPostProofDealStatus('DELIVERED')).toBe(true);
    expect(isPostProofDealStatus('COMPLETED')).toBe(true);
    expect(isPostProofDealStatus('LOCKED')).toBe(false);

    expect(isClosedDealStatus('REFUNDED')).toBe(true);
    expect(isClosedDealStatus('EXPIRED')).toBe(true);
    expect(isClosedDealStatus('CANCELLED')).toBe(true);
    expect(isClosedDealStatus('COMPLETED')).toBe(false);

    expect(isTerminalDealStatus('COMPLETED')).toBe(true);
    expect(isTerminalDealStatus('REFUNDED')).toBe(true);
    expect(isTerminalDealStatus('EXPIRED')).toBe(true);
    expect(isTerminalDealStatus('CANCELLED')).toBe(true);
    expect(isTerminalDealStatus('LOCKED')).toBe(false);
  });

  it('keeps transition behavior unchanged while semantics become explicit', () => {
    expect(transition(makeDeal('WAITING_DEPOSITS'), 'buyer_deposit').status).toBe('BUYER_FUNDED');
    expect(transition(makeDeal('BUYER_FUNDED'), 'seller_deposit').status).toBe('LOCKED');
    expect(transition(makeDeal('LOCKED'), 'submit_proof').status).toBe('PROOF_SUBMITTED');
    expect(transition(makeDeal('PROOF_SUBMITTED'), 'mark_delivered').status).toBe('DELIVERED');
    expect(transition(makeDeal('DELIVERED'), 'accept_delivery').status).toBe('COMPLETED');
  });
});
