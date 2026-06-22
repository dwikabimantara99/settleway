/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/stellar/server/deal-room-testnet-runtime', () => ({
  resolveDealRoomDefaultStellarState: vi.fn(() => ({
    stellar_mode: 'mock_only',
    stellar_contract_id: null,
  })),
  loadDealRoomTestnetRuntime: vi.fn(() => ({
    ok: true,
    runtime: {
      contract_id: 'CCONTRACT123',
      metadata: {
        contract_id: 'CCONTRACT123',
        admin_address: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
        buyer_demo_address: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
        seller_demo_address: 'GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU',
      },
      signer_port: {},
      execution_adapter: {},
    },
  })),
}));

vi.mock('@/lib/stellar/testnet-external-payout', () => ({
  executeExternalWalletPayouts: vi.fn(),
}));

import { mockStore } from '@/lib/db/mock-store';
import { executeExternalWalletPayouts } from '@/lib/stellar/testnet-external-payout';
import { POST as externalPayoutRoute } from './route';

describe('external-payout route', () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.mocked(executeExternalWalletPayouts).mockResolvedValue({
      transactionHash: 'f'.repeat(64),
      custodyAddress: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
      buyerManagedAddress: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
      sellerManagedAddress: 'GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU',
      buyerConnectedAddress: 'GDHCMRYMNO3UADV6KQUIUXZTPNXZ5ARYFIYIIOA3A5NBVEKTFWPO4BJJ',
      sellerConnectedAddress: 'GCKJ7LOQPPPJPDS2SU6VBVYBL4CFO6TD6WPH65OV2DJ64Y6EHT27I3VP',
      buyerBondReturnXlm: '0.0099750',
      sellerPayoutXlm: '0.2094750',
      assetCode: 'XLM',
    });
  });

  function setupCompletedDeal() {
    mockStore.updateProfile('buyer-surabaya-restaurant', {
      connected_wallet_address: 'GDHCMRYMNO3UADV6KQUIUXZTPNXZ5ARYFIYIIOA3A5NBVEKTFWPO4BJJ',
      connected_wallet_network: 'testnet',
      connected_wallet_provider: 'Freighter',
      connected_wallet_linked_at: new Date().toISOString(),
    });
    mockStore.updateProfile('seller-probolinggo-cabai', {
      connected_wallet_address: 'GCKJ7LOQPPPJPDS2SU6VBVYBL4CFO6TD6WPH65OV2DJ64Y6EHT27I3VP',
      connected_wallet_network: 'testnet',
      connected_wallet_provider: 'Freighter',
      connected_wallet_linked_at: new Date().toISOString(),
    });
    mockStore.updateDeal('demo-cabai-001', {
      status: 'COMPLETED',
      stellar_mode: 'testnet',
      latest_stellar_tx_hash: 'e'.repeat(64),
      proof_hash: 'b'.repeat(64),
    });
  }

  it('forwards completed settlement funds to connected wallets', async () => {
    setupCompletedDeal();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const response = await externalPayoutRoute(
      new Request('http://localhost/api/deals/demo-cabai-001/external-payout', {
        method: 'POST',
      }),
      { params: Promise.resolve({ dealId: 'demo-cabai-001' }) },
    );

    expect(response.status).toBe(200);
    expect(executeExternalWalletPayouts).toHaveBeenCalledOnce();

    const events = mockStore.getDealEvents('demo-cabai-001');
    expect(events.at(-1)?.event_type).toBe('external_payout_confirmed');
    expect(events.at(-1)?.tx_hash).toBe('f'.repeat(64));
    expect(events.at(-1)?.metadata).toMatchObject({
      payout_route: 'managed_profile_wallets_to_connected_wallets',
      buyer_connected_wallet_address: 'GDHCMRYMNO3UADV6KQUIUXZTPNXZ5ARYFIYIIOA3A5NBVEKTFWPO4BJJ',
      seller_connected_wallet_address: 'GCKJ7LOQPPPJPDS2SU6VBVYBL4CFO6TD6WPH65OV2DJ64Y6EHT27I3VP',
    });
  });
});
