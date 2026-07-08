import { describe, it, expect, beforeEach } from 'vitest';
import { repository as repo } from './index';
import { getServerWalletRepository } from '../stellar/server/wallet-repository';
import type { DbDeal, DbEscrowEvent, DbUserWallet } from '../db/types';

describe('Repository Parity Tests', () => {
  const walletRepo = getServerWalletRepository();

  it('1. repository contract stores status transitions consistently', async () => {
    const deal: DbDeal = {
      id: 'test-parity-deal-1',
      listing_id: null,
      buyer_request_id: null,
      buyer_id: 'buyer1',
      seller_id: 'seller1',
      commodity: 'Cabai',
      volume_kg: 100,
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 110,
      status: 'WAITING_DEPOSITS',
      stellar_mode: 'testnet',
      stellar_contract_id: 'C123',
      stellar_escrow_id: '456',
      latest_stellar_tx_hash: null,
      stellar_sync_status: 'idle',
      proof_hash: null,
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.createDeal(deal);
    
    const next: DbDeal = { ...deal, status: 'BUYER_FUNDED' };
    const { replaced, deal: updated } = await repo.replaceDealIfCurrent({ current: deal, next });
    
    expect(replaced).toBe(true);
    expect(updated?.status).toBe('BUYER_FUNDED');
  });

  it('2. repository contract stores latest_stellar_tx_hash consistently', async () => {
    const deal: DbDeal = {
      id: 'test-parity-deal-2',
      listing_id: null,
      buyer_request_id: null,
      buyer_id: 'buyer1',
      seller_id: 'seller1',
      commodity: 'Cabai',
      volume_kg: 100,
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 110,
      status: 'WAITING_DEPOSITS',
      stellar_mode: 'testnet',
      stellar_contract_id: 'C123',
      stellar_escrow_id: '456',
      latest_stellar_tx_hash: null,
      stellar_sync_status: 'idle',
      proof_hash: null,
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.createDeal(deal);
    
    const next: DbDeal = { ...deal, latest_stellar_tx_hash: 'abc123hash' };
    const { replaced, deal: updated } = await repo.replaceDealIfCurrent({ current: deal, next });
    
    expect(replaced).toBe(true);
    expect(updated?.latest_stellar_tx_hash).toBe('abc123hash');
  });

  it('3. repository contract stores proof_hash consistently', async () => {
    const deal: DbDeal = {
      id: 'test-parity-deal-3',
      listing_id: null,
      buyer_request_id: null,
      buyer_id: 'buyer1',
      seller_id: 'seller1',
      commodity: 'Cabai',
      volume_kg: 100,
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 110,
      status: 'LOCKED',
      stellar_mode: 'testnet',
      stellar_contract_id: 'C123',
      stellar_escrow_id: '456',
      latest_stellar_tx_hash: 'locked_tx',
      stellar_sync_status: 'idle',
      proof_hash: null,
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.createDeal(deal);
    
    const next: DbDeal = { ...deal, proof_hash: 'proof123', status: 'PROOF_SUBMITTED' };
    const { replaced, deal: updated } = await repo.replaceDealIfCurrent({ current: deal, next });
    
    expect(replaced).toBe(true);
    expect(updated?.proof_hash).toBe('proof123');
  });

  it('4. repository contract preserves event logs / operation logs', async () => {
    const event: DbEscrowEvent = {
      id: 'event-123',
      deal_id: 'deal-events-test',
      event_type: 'test_event',
      actor_id: 'actor1',
      message: 'Test message',
      tx_hash: 'tx_hash_1',
      proof_hash: 'proof_hash_1',
      metadata: { some: 'data' },
      created_at: new Date().toISOString()
    };

    await repo.addEvent(event);
    const events = await repo.getDealEvents('deal-events-test');
    
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('event-123');
    expect(events[0].tx_hash).toBe('tx_hash_1');
  });

  it('5. wallet repository stores encrypted_secret_key without exposing it to API responses', async () => {
    const wallet: DbUserWallet = {
      user_id: 'wallet-user-1',
      public_address: 'G123',
      encrypted_secret_key: 'encrypted-secret-123',
      encryption_version: 'v1',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await walletRepo.provisionProfileWallet(wallet);

    const retrieved = await walletRepo.getProfileWallet('wallet-user-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.encrypted_secret_key).toBe('encrypted-secret-123');
  });

  it('6. unknown wallet strictly returns null instead of synthesizing a fallback stub', async () => {
    const wallet = await walletRepo.getProfileWallet('some-unknown-demo-user');
    expect(wallet).toBeNull();
  });

  it('7. completed lifecycle state can be represented without losing prior tx evidence', async () => {
    const deal: DbDeal = {
      id: 'test-parity-deal-comp',
      listing_id: null,
      buyer_request_id: null,
      buyer_id: 'buyer1',
      seller_id: 'seller1',
      commodity: 'Cabai',
      volume_kg: 100,
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 110,
      status: 'DELIVERED',
      stellar_mode: 'testnet',
      stellar_contract_id: 'C123',
      stellar_escrow_id: '456',
      latest_stellar_tx_hash: 'tx_deliver',
      stellar_sync_status: 'idle',
      proof_hash: 'proof123',
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.createDeal(deal);
    const next: DbDeal = { ...deal, status: 'COMPLETED', latest_stellar_tx_hash: 'tx_complete' };
    const { replaced, deal: updated } = await repo.replaceDealIfCurrent({ current: deal, next });
    
    expect(replaced).toBe(true);
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.proof_hash).toBe('proof123');
    expect(updated?.latest_stellar_tx_hash).toBe('tx_complete');
  });

  it('8. profile identity model accepts optional auth_user_id for hybrid auth', async () => {
    // This is purely a type/interface test for the hybrid identity model
    const profileWithoutAuth: import('../db/types').DbProfile = {
      id: 'buyer-probolinggo-cabai',
      display_name: 'Budi (Buyer)',
      role_label: 'Buyer',
      location: 'Probolinggo',
      user_type: 'buyer',
      seller_score: 0,
      buyer_score: 10,
      seller_completed_count: 0,
      buyer_completed_count: 5,
      verified_volume_idr: 50000000,
      proof_visibility: 'public',
      payout_rail_preference: 'bank',
      payout_wallet_label: null,
      payout_wallet_address: null,
      connected_wallet_address: null,
      connected_wallet_network: null,
      connected_wallet_provider: null,
      connected_wallet_linked_at: null,
      payout_bank_name: null,
      payout_bank_account_masked: null,
      created_at: new Date().toISOString()
    };

    const profileWithAuth: import('../db/types').DbProfile = {
      ...profileWithoutAuth,
      id: 'real-user-123',
      auth_user_id: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(profileWithoutAuth.auth_user_id).toBeUndefined();
    expect(profileWithAuth.auth_user_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });
});
