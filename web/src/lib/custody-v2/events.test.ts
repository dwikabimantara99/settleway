import { beforeEach, describe, expect, it } from 'vitest';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { mockStore } from '@/lib/db/mock-store';
import { ingestCustodyV2Events, normalizeCustodyV2Event } from './events';

const contractId = 'C'.repeat(56);
const baseEvent = {
  contract_id: contractId,
  contract_deal_id: 'a'.repeat(64),
  event_type: 'bfund',
  ledger: 123,
  transaction_hash: 'b'.repeat(64),
  event_index: 0,
  decoded_public_facts: {
    amount: '10500000',
    buyer_funded: true,
    seller_funded: false,
  },
};

describe('Custody V2 event ingestion', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('normalizes documented public V2.1 events and deduplicates persistence', async () => {
    const repository = new MockRepositoryAdapter();

    const first = await ingestCustodyV2Events({
      repository,
      contractId,
      events: [baseEvent],
      now: new Date('2026-06-26T00:00:00.000Z'),
    });
    const second = await ingestCustodyV2Events({
      repository,
      contractId,
      events: [baseEvent],
      now: new Date('2026-06-26T00:01:00.000Z'),
    });

    expect(first).toEqual({ appended: 1, seen: 1 });
    expect(second).toEqual({ appended: 0, seen: 1 });
    expect(await repository.listCustodyEvents(baseEvent.contract_deal_id)).toHaveLength(1);
    expect(await repository.getCustodyEventCursor('testnet', contractId)).toMatchObject({
      last_processed_ledger: 123,
      cursor: '123-0',
    });
  });

  it('rejects malformed, cross-contract, and unsupported events', () => {
    expect(() => normalizeCustodyV2Event({ ...baseEvent, event_type: 'unknown' }, contractId))
      .toThrow('Unsupported Custody V2 event type');
    expect(() => normalizeCustodyV2Event({ ...baseEvent, contract_id: 'C'.repeat(55) }, contractId))
      .toThrow('contract ID mismatch');
    expect(() => normalizeCustodyV2Event({ ...baseEvent, transaction_hash: 'not-a-hash' }, contractId))
      .toThrow('transaction hash');
  });
});
