import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nativeToScVal } from '@stellar/stellar-sdk';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { MockCustodyV2AdminWriter } from '@/lib/repositories/admin-writer';
import { mockStore } from '@/lib/db/mock-store';

import {
  decodeRawCustodyV2Event,
  ingestCustodyV2Events,
  normalizeCustodyV2Event,
  pollAndIngestCustodyV2Events,
  type CustodyV2EventSource,
  type RawCustodyV2RpcEvent,
} from './events';

const contractId = 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4';
const dealId = 'a'.repeat(64);
const txHash = 'b'.repeat(64);

const baseEvent = {
  rpc_event_id: '0014123931233439744-0000000000',
  contract_id: contractId,
  contract_deal_id: dealId,
  event_type: 'bfund' as const,
  ledger: 123,
  transaction_hash: txHash,
  event_index: 0,
  decoded_public_facts: {
    amount: '10500000',
    buyer_funded: true,
    seller_funded: false,
  },
};

function rawEvent(input: {
  id: string;
  ledger: number;
  eventType: string;
  deal?: string;
  extraTopics?: unknown[];
  value?: Record<string, unknown>;
}): RawCustodyV2RpcEvent {
  return {
    id: input.id,
    contractId,
    ledger: input.ledger,
    txHash,
    topic: [
      nativeToScVal(input.eventType, { type: 'symbol' }),
      ...(input.deal ? [nativeToScVal(Buffer.from(input.deal, 'hex'))] : []),
      ...(input.extraTopics ?? []).map((topic) => nativeToScVal(topic)),
    ],
    value: nativeToScVal(input.value ?? {}),
  };
}

describe('Custody V2 event ingestion', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('normalizes documented public V2.1 events and deduplicates persistence without advancing cursors', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();

    const first = await ingestCustodyV2Events({ repository, adminWriter,
      contractId,
      events: [baseEvent],
      now: new Date('2026-06-26T00:00:00.000Z'),
    });
    const second = await ingestCustodyV2Events({ repository, adminWriter,
      contractId,
      events: [baseEvent],
      now: new Date('2026-06-26T00:01:00.000Z'),
    });

    expect(first).toEqual({ appended: 1, seen: 1 });
    expect(second).toEqual({ appended: 0, seen: 1 });
    expect(await repository.listCustodyEvents(baseEvent.contract_deal_id)).toHaveLength(1);
    expect(await adminWriter.getCustodyEventCursor('testnet', contractId)).toBeNull();
  });

  it('keeps init contract-scoped instead of fabricating an all-zero deal id', () => {
    const decoded = decodeRawCustodyV2Event(rawEvent({
      id: '0014123931233439744-0000000001',
      ledger: 123,
      eventType: 'init',
      extraTopics: ['asset'],
      value: {
        interface_version: 2,
        policy_version: 2,
        success_fee_bps: 0,
        seller_breach_treasury_bps: 2000,
        buyer_breach_treasury_bps: 2000,
      },
    }), contractId);

    expect(decoded.contract_deal_id).toBeNull();
    expect(normalizeCustodyV2Event(decoded, contractId)).toMatchObject({
      event_id: '0014123931233439744-0000000001',
      contract_deal_id: null,
      event_type: 'init',
    });
  });

  it('rejects malformed, cross-contract, unsupported, and negative amount events', () => {
    expect(() => normalizeCustodyV2Event({ ...baseEvent, event_type: 'unknown' }, contractId))
      .toThrow('Unsupported Custody V2 event type');
    expect(() => normalizeCustodyV2Event({ ...baseEvent, contract_id: 'C'.repeat(55) }, contractId))
      .toThrow('contract ID mismatch');
    expect(() => normalizeCustodyV2Event({ ...baseEvent, transaction_hash: 'not-a-hash' }, contractId))
      .toThrow('transaction hash');
    expect(() => decodeRawCustodyV2Event(rawEvent({
      id: '0014123931233439744-0000000002',
      ledger: 123,
      eventType: 'bfund',
      deal: dealId,
      value: { amount: -1n },
    }), contractId)).toThrow('invalid non-negative field');
  });

  it('decodes raw Stellar RPC event topics and values into normalized public facts', () => {
    const decoded = decodeRawCustodyV2Event(rawEvent({
      id: '0014123931233439744-0000000002',
      ledger: 123,
      eventType: 'bfund',
      deal: dealId,
      value: {
        amount: 10500000n,
        buyer_funded: true,
        seller_funded: false,
      },
    }), contractId);

    expect(decoded).toMatchObject({
      rpc_event_id: '0014123931233439744-0000000002',
      contract_deal_id: dealId,
      event_type: 'bfund',
      event_index: 2,
    });
    expect(decoded.decoded_public_facts.value).toMatchObject({
      amount: '10500000',
      buyer_funded: true,
      seller_funded: false,
    });
  });

  it('paginates with exact opaque cursors and remains safe for multiple events in one ledger', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    const getEvents = vi.fn<CustodyV2EventSource['getEvents']>()
      .mockResolvedValueOnce({
        events: [
          rawEvent({ id: '0014123931233439744-0000000000', ledger: 123, eventType: 'deal', deal: dealId, value: { principal: 10n } }),
          rawEvent({ id: '0014123931233439744-0000000001', ledger: 123, eventType: 'accept', deal: dealId, extraTopics: ['participant'] }),
        ],
        cursor: 'opaque-page-1',
        latestLedger: 130,
        oldestLedger: 100,
      })
      .mockResolvedValueOnce({
        events: [
          rawEvent({ id: '0014123931233439744-0000000002', ledger: 123, eventType: 'bfund', deal: dealId, value: { amount: 10n } }),
        ],
        cursor: 'opaque-page-2',
        latestLedger: 130,
        oldestLedger: 100,
      });
    const eventSource: CustodyV2EventSource = {
      getLatestLedger: async () => ({ sequence: 130 }),
      getEvents,
    };

    const result = await pollAndIngestCustodyV2Events({ repository, adminWriter,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      contractId,
      startLedger: 120,
      limit: 2,
      maxPages: 5,
      eventSource,
      now: new Date('2026-06-26T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      appended: 3,
      seen: 3,
      pages: 2,
      cursor: 'opaque-page-2',
      status: 'caught_up',
    });
    expect(getEvents.mock.calls[0][0]).toMatchObject({ startLedger: 120 });
    expect(getEvents.mock.calls[1][0]).toMatchObject({ cursor: 'opaque-page-1' });
    expect(await repository.listCustodyEvents(dealId)).toHaveLength(3);
    expect(await adminWriter.getCustodyEventCursor('testnet', contractId)).toMatchObject({
      cursor: 'opaque-page-2',
      last_processed_ledger: 123,
      detected_gap_status: 'none',
    });
  });

  it('persists retention gaps and never clears them merely because later events arrive', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    const eventSource: CustodyV2EventSource = {
      getLatestLedger: async () => ({ sequence: 130 }),
      getEvents: vi.fn()
        .mockResolvedValueOnce({
          events: [rawEvent({ id: '0014123931233439744-0000000000', ledger: 123, eventType: 'deal', deal: dealId })],
          cursor: 'opaque-gap',
          latestLedger: 130,
          oldestLedger: 120,
        })
        .mockResolvedValueOnce({
          events: [],
          cursor: 'opaque-empty',
          latestLedger: 131,
          oldestLedger: 120,
        }),
    };

    await pollAndIngestCustodyV2Events({ repository, adminWriter,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      contractId,
      startLedger: 100,
      limit: 10,
      eventSource,
      now: new Date('2026-06-26T00:00:00.000Z'),
    });
    await pollAndIngestCustodyV2Events({ repository, adminWriter,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      contractId,
      limit: 10,
      eventSource,
      now: new Date('2026-06-26T00:01:00.000Z'),
    });

    expect(await adminWriter.getCustodyEventCursor('testnet', contractId)).toMatchObject({
      detected_gap_status: 'gap_detected',
      requested_start_ledger: 100,
      oldest_available_ledger: 120,
      first_returned_event_id: '0014123931233439744-0000000000',
    });
  });

  it('does not advance the cursor when event append fails', async () => {
    const repository = new MockRepositoryAdapter();
    class FailingAdminWriter extends MockCustodyV2AdminWriter {
      async appendCustodyEvent() { throw new Error('append failed'); }
    }
    const adminWriter = new FailingAdminWriter();
    const eventSource: CustodyV2EventSource = {
      getLatestLedger: async () => ({ sequence: 130 }),
      getEvents: async () => ({
        events: [rawEvent({ id: '0014123931233439744-0000000000', ledger: 123, eventType: 'deal', deal: dealId })],
        cursor: 'must-not-persist',
        latestLedger: 130,
        oldestLedger: 100,
      }),
    };

    await expect(pollAndIngestCustodyV2Events({ repository, adminWriter,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      contractId,
      startLedger: 120,
      limit: 10,
      eventSource,
    })).rejects.toThrow('append failed');

    expect(await adminWriter.getCustodyEventCursor('testnet', contractId)).toBeNull();
  });
});



