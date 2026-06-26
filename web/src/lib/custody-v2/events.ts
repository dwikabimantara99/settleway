import type { DbCustodyEvent } from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';

const SUPPORTED_EVENT_TYPES = new Set([
  'init',
  'deal',
  'accept',
  'state',
  'bfund',
  'sfund',
  'active',
  'evidence',
  'expired',
  'cancel',
  'dispute',
  'resolve',
  'settlement',
]);

const HEX_64 = /^[0-9a-f]{64}$/;

export interface NormalizedCustodyV2EventInput {
  contract_id: string;
  contract_deal_id: string;
  event_type: string;
  ledger: number;
  transaction_hash: string;
  event_index: number;
  decoded_public_facts: Record<string, unknown>;
}

function assertNormalizedEvent(input: NormalizedCustodyV2EventInput, expectedContractId: string) {
  if (input.contract_id !== expectedContractId) {
    throw new Error('Custody V2 event contract ID mismatch.');
  }
  if (!HEX_64.test(input.contract_deal_id)) {
    throw new Error('Custody V2 event deal ID must be a lowercase bytes32 hex string.');
  }
  if (!SUPPORTED_EVENT_TYPES.has(input.event_type)) {
    throw new Error(`Unsupported Custody V2 event type: ${input.event_type}`);
  }
  if (!Number.isSafeInteger(input.ledger) || input.ledger <= 0) {
    throw new Error('Custody V2 event ledger must be a positive integer.');
  }
  if (!HEX_64.test(input.transaction_hash)) {
    throw new Error('Custody V2 event transaction hash must be a lowercase SHA-256 hex string.');
  }
  if (!Number.isSafeInteger(input.event_index) || input.event_index < 0) {
    throw new Error('Custody V2 event index must be a non-negative integer.');
  }
}

export function normalizeCustodyV2Event(
  input: NormalizedCustodyV2EventInput,
  expectedContractId: string,
  now = new Date(),
): DbCustodyEvent {
  assertNormalizedEvent(input, expectedContractId);
  return {
    event_id: [
      input.contract_id,
      input.ledger,
      input.transaction_hash,
      input.event_index,
    ].join(':'),
    contract_id: input.contract_id,
    contract_deal_id: input.contract_deal_id,
    event_type: input.event_type,
    ledger: input.ledger,
    transaction_hash: input.transaction_hash,
    event_index: input.event_index,
    decoded_public_facts: input.decoded_public_facts,
    ingested_at: now.toISOString(),
  };
}

export async function ingestCustodyV2Events(input: {
  repository: IRepository;
  contractId: string;
  events: readonly NormalizedCustodyV2EventInput[];
  now?: Date;
}) {
  let appended = 0;
  for (const eventInput of input.events) {
    const event = normalizeCustodyV2Event(eventInput, input.contractId, input.now);
    const result = await input.repository.appendCustodyEvent(event);
    if (result.appended) appended += 1;
  }
  const lastEvent = input.events.at(-1);
  if (lastEvent) {
    await input.repository.upsertCustodyEventCursor({
      network: 'testnet',
      contract_id: input.contractId,
      last_processed_ledger: lastEvent.ledger,
      cursor: `${lastEvent.ledger}-${lastEvent.event_index}`,
      last_successful_ingestion_at: (input.now ?? new Date()).toISOString(),
      detected_gap_status: 'none',
    });
  }
  return { appended, seen: input.events.length };
}
