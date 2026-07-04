import { beforeEach, describe, expect, it } from 'vitest';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { MockCustodyV2AdminWriter } from '@/lib/repositories/admin-writer';
import { mockStore } from '@/lib/db/mock-store';
import type {
  DbCustodyDealLink,
  DbCustodyEvent,
  DbCustodyEventCursor,
  DbCustodyOperation,
} from '@/lib/db/types';

const link: DbCustodyDealLink = {
  application_deal_id: 'deal-repository-v2',
  rail_version: 'custody_v2_testnet',
  contract_id: 'C'.repeat(56),
  contract_deal_id: '1'.repeat(64),
  terms_schema_version: 'settleway.terms.v1',
  terms_hash: '2'.repeat(64),
  canonical_terms_json: '{}',
  canonical_terms_bytes_base64: 'e30=',
  frozen_at: '2026-06-26T00:00:00.000Z',
  buyer_address: 'GBUYER',
  seller_address: 'GSELLER',
  mediator_address: 'GMEDIATOR',
  asset_contract_id: 'C'.repeat(56),
  settlement_asset_label: 'XLM',
  principal_base_units: '100',
  buyer_bond_base_units: '5',
  seller_bond_base_units: '5',
  funding_deadline_unix: 1781816400,
  delivery_deadline_unix: 1782162000,
  inspection_deadline_unix: 1782248400,
  latest_contract_state: 'TermsPending',
  latest_terminal_outcome: null,
  last_confirmed_ledger: null,
  last_reconciled_at: null,
  created_at: '2026-06-26T00:00:00.000Z',
  updated_at: '2026-06-26T00:00:00.000Z',
};

const operation: DbCustodyOperation = {
  operation_id: 'op-1',
  application_deal_id: link.application_deal_id,
  contract_deal_id: link.contract_deal_id,
  action_type: 'CREATE_DEAL',
  actor_address: link.buyer_address,
  idempotency_key: 'idem-1',
  prepared_transaction_body_fingerprint: 'abc',
  unsigned_transaction_xdr: 'xdr',
  prepared_expires_at: '2026-06-26T00:03:00.000Z',
  transaction_hash: null,
  status: 'prepared',
  rpc_result_category: null,
  confirmed_ledger: null,
  failure_code: null,
  created_at: '2026-06-26T00:00:00.000Z',
  updated_at: '2026-06-26T00:00:00.000Z',
};

const event: DbCustodyEvent = {
  event_id: 'event-1',
  contract_id: link.contract_id,
  contract_deal_id: link.contract_deal_id,
  event_type: 'deal',
  ledger: 123,
  transaction_hash: 'a'.repeat(64),
  event_index: 0,
  decoded_public_facts: { state: 'TermsPending' },
  ingested_at: '2026-06-26T00:01:00.000Z',
};

const cursor: DbCustodyEventCursor = {
  network: 'testnet',
  contract_id: link.contract_id,
  last_processed_ledger: 123,
  cursor: '123-0',
  last_successful_ingestion_at: '2026-06-26T00:01:00.000Z',
  detected_gap_status: 'none',
  requested_start_ledger: null,
  oldest_available_ledger: null,
  latest_available_ledger: null,
  first_returned_event_id: null,
  gap_detected_at: null,
};

describe('Custody V2 repository boundary', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('stores idempotent links, operations, events, and cursor state', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();

    expect(await adminWriter.createCustodyDealLink(link)).toMatchObject({ created: true });
    expect(await adminWriter.createCustodyDealLink(link)).toMatchObject({ created: false });
    expect(await adminWriter.updateCustodyDealLink(link.application_deal_id, {
      latest_contract_state: 'AwaitingFunding',
    })).toMatchObject({ latest_contract_state: 'AwaitingFunding' });

    expect(await adminWriter.createCustodyOperation(operation)).toMatchObject({ created: true });
    expect(await adminWriter.createCustodyOperation(operation)).toMatchObject({ created: false });
    expect(await adminWriter.updateCustodyOperation(operation.idempotency_key, {
      status: 'submitted',
      transaction_hash: 'b'.repeat(64),
    })).toMatchObject({ status: 'submitted', transaction_hash: 'b'.repeat(64) });
    expect(await repository.listCustodyOperations(link.application_deal_id)).toHaveLength(1);

    expect(await adminWriter.appendCustodyEvent(event)).toMatchObject({ appended: true });
    expect(await adminWriter.appendCustodyEvent(event)).toMatchObject({ appended: false });
    expect(await repository.listCustodyEvents(link.contract_deal_id)).toHaveLength(1);

    expect(await adminWriter.upsertCustodyEventCursor(cursor)).toMatchObject(cursor);
    expect(await adminWriter.getCustodyEventCursor('testnet', link.contract_id)).toMatchObject(cursor);
  });
});

