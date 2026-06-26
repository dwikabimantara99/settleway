import type { DbCustodyEvent, DbCustodyEventCursor } from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';
import { rpc, scValToNative, StrKey, xdr } from '@stellar/stellar-sdk';

const HEX_64 = /^[0-9a-f]{64}$/;

const EVENT_SCHEMA = {
  init: { topicCount: 2, dealScoped: false, nonNegativeFields: ['success_fee_bps', 'seller_breach_treasury_bps', 'buyer_breach_treasury_bps'] },
  deal: { topicCount: 2, dealScoped: true, nonNegativeFields: ['principal', 'buyer_bond', 'seller_bond'] },
  accept: { topicCount: 3, dealScoped: true, nonNegativeFields: [] },
  state: { topicCount: 2, dealScoped: true, nonNegativeFields: ['timestamp'] },
  bfund: { topicCount: 2, dealScoped: true, nonNegativeFields: ['amount'] },
  sfund: { topicCount: 2, dealScoped: true, nonNegativeFields: ['amount'] },
  active: { topicCount: 2, dealScoped: true, nonNegativeFields: [] },
  evidence: { topicCount: 2, dealScoped: true, nonNegativeFields: [] },
  expired: { topicCount: 2, dealScoped: true, nonNegativeFields: ['buyer_refund', 'seller_refund'] },
  cancel: { topicCount: 3, dealScoped: true, nonNegativeFields: [] },
  dispute: { topicCount: 3, dealScoped: true, nonNegativeFields: [] },
  resolve: { topicCount: 3, dealScoped: true, nonNegativeFields: [] },
  settlement: {
    topicCount: 2,
    dealScoped: true,
    nonNegativeFields: [
      'buyer_principal_refund',
      'seller_principal',
      'buyer_bond_refund',
      'seller_bond_refund',
      'buyer_bond_to_seller',
      'buyer_bond_to_treasury',
      'seller_bond_to_buyer',
      'seller_bond_to_treasury',
      'success_fee_to_treasury',
    ],
  },
} as const;

export type CustodyV2EventType = keyof typeof EVENT_SCHEMA;

export interface NormalizedCustodyV2EventInput {
  rpc_event_id: string;
  contract_id: string;
  contract_deal_id: string | null;
  event_type: CustodyV2EventType;
  ledger: number;
  transaction_hash: string;
  event_index: number;
  decoded_public_facts: Record<string, unknown>;
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

export interface CustodyV2EventSource {
  getLatestLedger(): Promise<{ sequence: number; closeTime?: string | number }>;
  getEvents(input: {
    startLedger?: number;
    cursor?: string;
    filters: { type: 'contract'; contractIds: string[] }[];
    limit: number;
  }): Promise<{
    events: readonly RawCustodyV2RpcEvent[];
    cursor?: string | null;
    latestLedger: number;
    oldestLedger: number;
  }>;
}

export interface CustodyV2EventPollResult {
  appended: number;
  seen: number;
  pages: number;
  status: 'caught_up' | 'page_limit_reached';
  cursor: string | null;
  latestLedger: number | null;
  oldestLedger: number | null;
  gapDetected: boolean;
  firstReturnedEventId: string | null;
}

function isCustodyV2EventType(value: unknown): value is CustodyV2EventType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EVENT_SCHEMA, value);
}

function assertNormalizedEvent(input: NormalizedCustodyV2EventInput, expectedContractId: string) {
  if (input.contract_id !== expectedContractId || !StrKey.isValidContract(input.contract_id)) {
    throw new Error('Custody V2 event contract ID mismatch.');
  }

  const schema = EVENT_SCHEMA[input.event_type];
  if (!schema) {
    throw new Error(`Unsupported Custody V2 event type: ${input.event_type}`);
  }
  if (schema.dealScoped) {
    if (!input.contract_deal_id || !HEX_64.test(input.contract_deal_id)) {
      throw new Error('Custody V2 event deal ID must be a lowercase bytes32 hex string.');
    }
  } else if (input.contract_deal_id !== null) {
    throw new Error('Custody V2 init event must not fabricate a contract deal ID.');
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
  if (typeof input.rpc_event_id !== 'string' || input.rpc_event_id.trim() === '') {
    throw new Error('Custody V2 event must preserve the opaque Stellar RPC event ID.');
  }
}

export function normalizeCustodyV2Event(
  input: NormalizedCustodyV2EventInput,
  expectedContractId: string,
  now = new Date(),
): DbCustodyEvent {
  assertNormalizedEvent(input, expectedContractId);
  return {
    event_id: input.rpc_event_id,
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

function assertNonNegativeEventAmounts(eventType: CustodyV2EventType, value: Record<string, unknown>) {
  for (const field of EVENT_SCHEMA[eventType].nonNegativeFields) {
    const raw = value[field];
    if (raw === undefined) continue;
    const parsed = typeof raw === 'bigint'
      ? raw
      : typeof raw === 'number'
        ? BigInt(raw)
        : typeof raw === 'string' && /^-?\d+$/.test(raw)
          ? BigInt(raw)
          : null;
    if (parsed === null || parsed < BigInt(0)) {
      throw new Error(`Custody V2 event ${eventType} has invalid non-negative field: ${field}`);
    }
  }
}

function eventIndexFromRpcId(rpcEventId: string): number {
  const index = Number(rpcEventId.split('-').at(-1));
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error('Custody V2 raw event has an invalid opaque event ID index.');
  }
  return index;
}

export function decodeRawCustodyV2Event(
  raw: RawCustodyV2RpcEvent,
  expectedContractId: string,
): NormalizedCustodyV2EventInput {
  assertRawEventContract(raw, expectedContractId);
  if (!Array.isArray(raw.topic) || raw.topic.length < 1) {
    throw new Error('Custody V2 raw event has no topics.');
  }
  if (!raw.id) {
    throw new Error('Custody V2 raw event has no opaque Stellar RPC event ID.');
  }

  const decodedTopics = raw.topic.map((topic) => scValToNative(topic));
  const eventType = decodedTopics[0];
  if (!isCustodyV2EventType(eventType)) {
    throw new Error(`Unsupported Custody V2 event type: ${String(eventType)}`);
  }
  const schema = EVENT_SCHEMA[eventType];
  if (decodedTopics.length !== schema.topicCount) {
    throw new Error(`Custody V2 ${eventType} event has invalid topic count.`);
  }

  const decodedValue = scValToNative(raw.value);
  const decodedRecord = decodedValue && typeof decodedValue === 'object' && !Array.isArray(decodedValue)
    ? decodedValue as Record<string, unknown>
    : {};
  const topicDealId = decodedTopics.slice(1).map(decodedToBytes32).find(Boolean) ?? null;
  const valueDealId = decodedToBytes32(decodedRecord.deal_id);
  const contractDealId = schema.dealScoped ? topicDealId ?? valueDealId : null;

  if (schema.dealScoped && !contractDealId) {
    throw new Error(`Custody V2 ${eventType} event is missing a deal ID.`);
  }
  if (!schema.dealScoped && (topicDealId || valueDealId)) {
    throw new Error(`Custody V2 ${eventType} event must be contract-scoped.`);
  }
  assertNonNegativeEventAmounts(eventType, decodedRecord);

  const txHash = (raw.txHash ?? raw.transaction_hash)?.toLowerCase();
  if (!txHash) throw new Error('Custody V2 raw event has no transaction hash.');

  return {
    rpc_event_id: raw.id,
    contract_id: expectedContractId,
    contract_deal_id: contractDealId,
    event_type: eventType,
    ledger: raw.ledger,
    transaction_hash: txHash,
    event_index: eventIndexFromRpcId(raw.id),
    decoded_public_facts: {
      topics: toJsonSafePublicFact(decodedTopics),
      value: toJsonSafePublicFact(decodedRecord),
    },
  };
}

function buildEventSource(rpcUrl: string): CustodyV2EventSource {
  const server = new rpc.Server(rpcUrl, { allowHttp: false });
  return {
    getLatestLedger: () => server.getLatestLedger(),
    getEvents: async (input) => {
      const response = input.cursor
        ? await server.getEvents({
          cursor: input.cursor,
          filters: input.filters,
          limit: input.limit,
        })
        : await server.getEvents({
          startLedger: input.startLedger ?? 1,
          filters: input.filters,
          limit: input.limit,
        });
      return {
        events: response.events.map((event) => ({
          id: event.id,
          contractId: typeof event.contractId === 'string' ? event.contractId : undefined,
          ledger: event.ledger,
          txHash: event.txHash,
          topic: event.topic,
          value: event.value,
        })),
        cursor: response.cursor,
        latestLedger: response.latestLedger,
        oldestLedger: response.oldestLedger,
      };
    },
  };
}

function mergeCursor(input: {
  existing: DbCustodyEventCursor | null;
  contractId: string;
  cursor: string | null;
  lastProcessedLedger: number | null;
  detectedGap: boolean;
  requestedStartLedger: number | null;
  oldestAvailableLedger: number | null;
  latestAvailableLedger: number | null;
  firstReturnedEventId: string | null;
  now: Date;
}): DbCustodyEventCursor {
  const previousGap = input.existing?.detected_gap_status === 'gap_detected';
  return {
    network: 'testnet',
    contract_id: input.contractId,
    last_processed_ledger: input.lastProcessedLedger ?? input.existing?.last_processed_ledger ?? null,
    cursor: input.cursor ?? input.existing?.cursor ?? null,
    last_successful_ingestion_at: input.now.toISOString(),
    detected_gap_status: previousGap || input.detectedGap ? 'gap_detected' : (input.existing?.detected_gap_status ?? 'none'),
    requested_start_ledger: input.detectedGap
      ? input.requestedStartLedger
      : input.existing?.requested_start_ledger ?? null,
    oldest_available_ledger: input.detectedGap
      ? input.oldestAvailableLedger
      : input.existing?.oldest_available_ledger ?? input.oldestAvailableLedger,
    latest_available_ledger: input.latestAvailableLedger ?? input.existing?.latest_available_ledger ?? null,
    first_returned_event_id: input.detectedGap
      ? input.firstReturnedEventId
      : input.existing?.first_returned_event_id ?? input.firstReturnedEventId,
    gap_detected_at: input.detectedGap
      ? (input.existing?.gap_detected_at ?? input.now.toISOString())
      : input.existing?.gap_detected_at ?? null,
  };
}

async function appendPage(input: {
  repository: IRepository;
  contractId: string;
  events: readonly NormalizedCustodyV2EventInput[];
  now: Date;
}) {
  let appended = 0;
  for (const eventInput of input.events) {
    const event = normalizeCustodyV2Event(eventInput, input.contractId, input.now);
    const result = await input.repository.appendCustodyEvent(event);
    if (result.appended) appended += 1;
  }
  return appended;
}

export async function ingestCustodyV2Events(input: {
  repository: IRepository;
  contractId: string;
  events: readonly NormalizedCustodyV2EventInput[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const appended = await appendPage({
    repository: input.repository,
    contractId: input.contractId,
    events: input.events,
    now,
  });
  return { appended, seen: input.events.length };
}

export async function pollAndIngestCustodyV2Events(input: {
  repository: IRepository;
  rpcUrl: string;
  contractId: string;
  startLedger?: number;
  limit?: number;
  maxPages?: number;
  now?: Date;
  eventSource?: CustodyV2EventSource;
}): Promise<CustodyV2EventPollResult> {
  const eventSource = input.eventSource ?? buildEventSource(input.rpcUrl);
  const now = input.now ?? new Date();
  const limit = input.limit ?? 200;
  const maxPages = input.maxPages ?? 10;
  const existingCursor = await input.repository.getCustodyEventCursor('testnet', input.contractId);
  const latest = await eventSource.getLatestLedger();
  let requestedStartLedger = input.startLedger
    ?? (existingCursor?.cursor ? undefined : existingCursor?.last_processed_ledger ? existingCursor.last_processed_ledger + 1 : Math.max(1, latest.sequence - 1000));
  let cursor = existingCursor?.cursor ?? null;
  let appended = 0;
  let seen = 0;
  let pages = 0;
  let lastProcessedLedger: number | null = existingCursor?.last_processed_ledger ?? null;
  let latestLedger: number | null = null;
  let oldestLedger: number | null = null;
  let gapDetected = false;
  let firstReturnedEventId: string | null = null;

  while (pages < maxPages) {
    const request = cursor
      ? {
        cursor,
        filters: [{ type: 'contract' as const, contractIds: [input.contractId] }],
        limit,
      }
      : {
        startLedger: requestedStartLedger,
        filters: [{ type: 'contract' as const, contractIds: [input.contractId] }],
        limit,
      };

    const response = await eventSource.getEvents(request);
    pages += 1;
    latestLedger = response.latestLedger;
    oldestLedger = response.oldestLedger;

    const pageFirstEventId = response.events[0]?.id ?? null;
    if (!firstReturnedEventId) firstReturnedEventId = pageFirstEventId;
    if (!cursor && requestedStartLedger !== undefined && response.oldestLedger > requestedStartLedger) {
      gapDetected = true;
    }

    const normalized = response.events.map((event) => decodeRawCustodyV2Event({
      id: event.id,
      contractId: event.contractId ?? event.contract_id ?? input.contractId,
      ledger: event.ledger,
      txHash: event.txHash ?? event.transaction_hash,
      topic: event.topic,
      value: event.value,
    }, input.contractId));
    const pageAppended = await appendPage({
      repository: input.repository,
      contractId: input.contractId,
      events: normalized,
      now,
    });

    appended += pageAppended;
    seen += normalized.length;
    if (normalized.length > 0) {
      lastProcessedLedger = Math.max(...normalized.map((event) => event.ledger), lastProcessedLedger ?? 0);
    } else if (requestedStartLedger !== undefined) {
      lastProcessedLedger = Math.max(requestedStartLedger, lastProcessedLedger ?? 0);
    }

    cursor = response.cursor ?? cursor;
    await input.repository.upsertCustodyEventCursor(mergeCursor({
      existing: existingCursor,
      contractId: input.contractId,
      cursor,
      lastProcessedLedger,
      detectedGap: gapDetected,
      requestedStartLedger: requestedStartLedger ?? null,
      oldestAvailableLedger: response.oldestLedger,
      latestAvailableLedger: response.latestLedger,
      firstReturnedEventId,
      now,
    }));

    if (normalized.length < limit || !response.cursor) {
      return {
        appended,
        seen,
        pages,
        status: 'caught_up',
        cursor,
        latestLedger,
        oldestLedger,
        gapDetected,
        firstReturnedEventId,
      };
    }

    requestedStartLedger = undefined;
  }

  return {
    appended,
    seen,
    pages,
    status: 'page_limit_reached',
    cursor,
    latestLedger,
    oldestLedger,
    gapDetected,
    firstReturnedEventId,
  };
}
