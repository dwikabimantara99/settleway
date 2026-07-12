import { anchorDemoEvent } from './anchor-demo-event';
import { Horizon } from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';

jest.mock('@stellar/stellar-sdk', () => {
  const original = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...original,
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn().mockResolvedValue({
          sequenceNumber: () => '100',
        }),
        submitTransaction: jest.fn().mockResolvedValue({
          successful: true,
          hash: 'mock-tx-hash-12345',
          ledger: 1000,
        }),
      })),
    },
  };
});

describe('anchorDemoEvent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds deterministic proof hash from payload', async () => {
    process.env.STELLAR_PLATFORM_SECRET = 'SAUDIJQW3YDFG23ZTRUXYL5I45RQVUKL62BDBA72D6DMRN3T2Y3RFR6P'; // valid length dummy

    const payload = { b: 2, a: 1 };
    const result = await anchorDemoEvent({
      deal_id: 'test-deal-123',
      event_type: 'TEST_EVENT',
      actor_id: 'actor-1',
      payload,
    });

    const expectedCanonical = JSON.stringify(payload, Object.keys(payload).sort());
    const expectedHash = createHash('sha256')
      .update('test-deal-123')
      .update('TEST_EVENT')
      .update('actor-1')
      .update(expectedCanonical)
      .digest('hex');

    expect(result.proof_hash).toBe(expectedHash);
    expect(result.tx_hash).toBe('mock-tx-hash-12345');
    expect(result.ledger).toBe(1000);
    expect(result.stellar_network).toBe('testnet');
  });

  it('throws error if secret is missing', async () => {
    delete process.env.STELLAR_PLATFORM_SECRET;
    
    await expect(anchorDemoEvent({
      deal_id: 'test-deal',
      event_type: 'TEST',
      actor_id: 'actor',
      payload: {},
    })).rejects.toThrow('STELLAR_PLATFORM_SECRET is not configured for demo anchoring.');
  });
});
