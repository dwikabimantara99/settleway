import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  operation: {
    application_deal_id: 'deal-test',
    contract_deal_id: 'a'.repeat(64),
    action_type: 'CREATE_DEAL',
    actor_address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    idempotency_key: 'idem-1',
    transaction_hash: 'b'.repeat(64),
    status: 'submitted',
  },
  getCustodyOperation: vi.fn(),
  updateCustodyOperation: vi.fn(),
  getCustodyDealLink: vi.fn(),
  confirmTransaction: vi.fn(),
  getDeal: vi.fn(),
  applyChainCustodyProjection: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  requireDealParticipant: vi.fn(async () => ({ id: 'buyer-1' })),
}));

vi.mock('@/lib/repositories', () => ({
  repository: {
    getCustodyOperation: mocks.getCustodyOperation,
    getCustodyDealLink: mocks.getCustodyDealLink,
  },
}));

vi.mock('@/lib/repositories/admin-writer', () => ({
  getServerAdminWriter: vi.fn(() => ({
    updateCustodyOperation: mocks.updateCustodyOperation,
  })),
}));

vi.mock('@/lib/custody-v2/config', () => ({
  loadCustodyV2ServerConfig: vi.fn(() => ({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4',
    assetContractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    interfaceVersion: '2',
    policyVersion: '2',
  })),
}));

vi.mock('@/lib/stellar/server/stellar-sdk-rpc', () => ({
  StellarSdkRpc: vi.fn(function StellarSdkRpc() {
    return {
      confirmTransaction: mocks.confirmTransaction,
    };
  }),
}));

vi.mock('@/lib/custody-v2/contract-reader', () => ({
  StellarCustodyV2ContractReader: vi.fn(function StellarCustodyV2ContractReader() {
    return {
      getDeal: mocks.getDeal,
    };
  }),
}));

vi.mock('@/lib/custody-v2/projection', () => ({
  applyChainCustodyProjection: mocks.applyChainCustodyProjection,
}));

import { POST } from './route';

describe('custody-v2 confirm route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      result: { events: [] },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
    mocks.getCustodyOperation.mockResolvedValue({ ...mocks.operation });
    mocks.getCustodyDealLink.mockResolvedValue(null);
    mocks.confirmTransaction.mockResolvedValue({
      outcome: 'confirmed',
      transaction_hash: 'b'.repeat(64),
      ledger: 123,
      result_value: null,
    });
    mocks.updateCustodyOperation.mockImplementation(async (_key: string, patch: Record<string, unknown>) => ({
      ...mocks.operation,
      ...patch,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a confirmed transaction pending when the contract deal is not readable yet', async () => {
    mocks.getDeal.mockResolvedValue({
      ok: false,
      error_code: 'not_found',
      message: 'HostError: Error(Contract, #11)',
    });

    const response = await POST(
      new Request('http://localhost/api/deals/deal-test/custody-v2/confirm', {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: 'idem-1' }),
      }),
      { params: Promise.resolve({ dealId: 'deal-test' }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.ok).toBe(true);
    expect(payload.meta.confirmation_status).toBe('confirmed_waiting_for_contract_state');
    expect(mocks.updateCustodyOperation).not.toHaveBeenCalled();
  });

  it('confirms a successful transaction when a matching contract deal event exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      result: {
        events: [{
          id: '0014123931233439744-0000000000',
          type: 'contract',
          ledger: 123,
          contractId: 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4',
          topic: ['AAAABQAAAARkZWFs', 'AAAADQAAACCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg=='],
          value: 'AAAADQAAACCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg==',
          inSuccessfulContractCall: true,
          txHash: 'b'.repeat(64),
        }],
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
    mocks.getCustodyDealLink.mockResolvedValue({ application_deal_id: 'deal-test' });
    mocks.getDeal.mockResolvedValue({
      ok: false,
      error_code: 'not_found',
      message: 'HostError: Error(Contract, #11)',
    });

    const response = await POST(
      new Request('http://localhost/api/deals/deal-test/custody-v2/confirm', {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: 'idem-1' }),
      }),
      { params: Promise.resolve({ dealId: 'deal-test' }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.meta.confirmation_status).toBe('confirmed');
    expect(payload.meta.projection_source).toBe('contract_event_fallback');
    expect(mocks.updateCustodyOperation).toHaveBeenCalledWith('idem-1', {
      status: 'confirmed',
      rpc_result_category: 'confirmed',
      confirmed_ledger: 123,
    });
  });
});





