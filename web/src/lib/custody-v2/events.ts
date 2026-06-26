import type { DbCustodyEvent } from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';
import { rpc, scValToNative, StrKey, xdr } from '@stellar/stellar-sdk';

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
  'settled',
]);

const HEX_64 = /^[0-9a-f]{64}$/;

export interface NormalizedCustodyV2EventInput {
  rpc_event_id?: string;
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
    event_id: input.rpc_event_id ?? [
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

export interface RawCustodyV2RpcEvent {
  id?: string;
  contractId?: string;
  contract_id?: string;
  ledger: number;
  txHash?: string;
  transaction_hash?: string;
  topic: readonly xdr.ScVal[];
  value: xdr.ScVal;
}

function decodedToBytes32(value: unknown): string | null {
  if (Buffer.isBuffer(value)) return value.toString('hex');
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (typeof value === 'string' && /^[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase();
  return null;
}

function assertRawEventContract(raw: RawCustodyV2RpcEvent, expectedContractId: string) {
  const contractId = raw.contractId ?? raw.contract_id ?? expectedContractId;
  if (contractId !== expectedContractId || !StrKey.isValidContract(contractId)) {
    throw new Error('Custody V2 raw event contract ID mismatch.');
  }
}

function toJsonSafePublicFact(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (Array.isArray(value)) return value.map(toJsonSafePublicFact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => [key, toJsonSafePublicFact(nested)]),
    );
  }
  return value;
}

export function decodeRawCustodyV2Event(
  raw: RawCustodyV2RpcEvent,
  expectedContractId: string,
): NormalizedCustodyV2EventInput {
  assertRawEventContract(raw, expectedContractId);
  if (!Array.isArray(raw.topic) || raw.topic.length < 1) {
    throw new Error('Custody V2 raw event has no topics.');
  }
  const decodedTopics = raw.topic.map((topic) => scValToNative(topic));
  const eventType = decodedTopics[0];
  if (typeof eventType !== 'string') {
    throw new Error('Custody V2 raw event type topic is not a symbol.');
  }
  if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
    throw new Error(`Unsupported Custody V2 event type: ${eventType}`);
  }
  const decodedValue = scValToNative(raw.value) as Record<string, unknown>;
  const topicDealId = decodedTopics.slice(1).map(decodedToBytes32).find(Boolean);
  const valueDealId = decodedValue && typeof decodedValue === 'object'
    ? decodedToBytes32(decodedValue.deal_id)
    : null;
  const contractDealId = topicDealId ?? valueDealId ?? '0'.repeat(64);
  const txHash = raw.txHash ?? raw.transaction_hash;
  if (!txHash) throw new Error('Custody V2 raw event has no transaction hash.');
  return {
    rpc_event_id: raw.id,
    contract_id: expectedContractId,
    contract_deal_id: contractDealId,
    event_type: eventType,
    ledger: raw.ledger,
    transaction_hash: txHash,
    event_index: raw.id ? Number(raw.id.split('-').at(-1) ?? 0) : 0,
    decoded_public_facts: {
      topics: toJsonSafePublicFact(decodedTopics),
      value: toJsonSafePublicFact(decodedValue),
    },
  };
}

export async function pollAndIngestCustodyV2Events(input: {
  repository: IRepository;
  rpcUrl: string;
  contractId: string;
  startLedger?: number;
  limit?: number;
  now?: Date;
}) {
  const server = new rpc.Server(input.rpcUrl, { allowHttp: false });
  const existingCursor = await input.repository.getCustodyEventCursor('testnet', input.contractId);
  const latest = await server.getLatestLedger();
  const startLedger = input.startLedger
    ?? (existingCursor?.last_processed_ledger ? existingCursor.last_processed_ledger + 1 : Math.max(1, latest.sequence - 1000));
  const response = await server.getEvents({
    startLedger,
    filters: [{ type: 'contract', contractIds: [input.contractId] }],
    limit: input.limit ?? 200,
  });
  const normalized = response.events.map((event) => decodeRawCustodyV2Event({
    id: event.id,
    contractId: input.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    topic: event.topic,
    value: event.value,
  }, input.contractId));
  const result = await ingestCustodyV2Events({
    repository: input.repository,
    contractId: input.contractId,
    events: normalized,
    now: input.now,
  });
  if (normalized.length === 0) {
    await input.repository.upsertCustodyEventCursor({
      network: 'testnet',
      contract_id: input.contractId,
      last_processed_ledger: startLedger,
      cursor: response.cursor ?? existingCursor?.cursor ?? null,
      last_successful_ingestion_at: (input.now ?? new Date()).toISOString(),
      detected_gap_status: response.oldestLedger > startLedger ? 'gap_detected' : 'none',
    });
  }
  return {
    ...result,
    latestLedger: response.latestLedger,
    oldestLedger: response.oldestLedger,
    cursor: response.cursor,
    gapDetected: response.oldestLedger > startLedger,
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
