import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type {
  DbCustodyDealLink,
  DbCustodyOperation,
} from '@/lib/db/types';
import {
  custodyV2StateFacts,
  custodyV2StatusCopy,
  resolveCustodyV2ScreenState,
} from './custody-v2-state-screen';

const now = '2026-06-27T00:00:00.000Z';

function link(overrides: Partial<DbCustodyDealLink> = {}): DbCustodyDealLink {
  return {
    application_deal_id: 'deal-offer-test',
    rail_version: 'custody_v2_testnet',
    contract_id: 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4',
    contract_deal_id: 'f5bd4ab0b7a2d7a47f0503dc8635b5411e82b9dd03e14c9f9619e7723fc41b8f',
    terms_schema_version: 'settleway.terms.v1',
    terms_hash: '3e78bd7a35606d99983be01c9010aa271661cef917135b766087541639112022',
    canonical_terms_json: '{}',
    canonical_terms_bytes_base64: 'e30=',
    frozen_at: now,
    buyer_address: 'GDHCMRYMNO3UADV6KQUIUXZTPNXZ5ARYFIYIIOA3A5NBVEKTFWPO4BJJ',
    seller_address: 'GCKJ7LOQPPPJPDS2SU6VBVYBL4CFO6TD6WPH65OV2DJ64Y6EHT27I3VP',
    mediator_address: 'GARSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSG6NV',
    asset_contract_id: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    settlement_asset_label: 'XLM',
    principal_base_units: '1000000',
    buyer_bond_base_units: '100000',
    seller_bond_base_units: '100000',
    funding_deadline_unix: 1782620000,
    delivery_deadline_unix: 1783200000,
    inspection_deadline_unix: 1783370000,
    latest_contract_state: 'TermsPending',
    latest_terminal_outcome: null,
    last_confirmed_ledger: null,
    last_reconciled_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function operation(
  actionType: DbCustodyOperation['action_type'],
  status: DbCustodyOperation['status'],
  updatedAt = now,
): DbCustodyOperation {
  return {
    operation_id: `custody-v2:${actionType}:${status}`,
    application_deal_id: 'deal-offer-test',
    contract_deal_id: 'f5bd4ab0b7a2d7a47f0503dc8635b5411e82b9dd03e14c9f9619e7723fc41b8f',
    action_type: actionType,
    actor_address: actionType === 'CREATE_DEAL'
      ? 'GDHCMRYMNO3UADV6KQUIUXZTPNXZ5ARYFIYIIOA3A5NBVEKTFWPO4BJJ'
      : 'GCKJ7LOQPPPJPDS2SU6VBVYBL4CFO6TD6WPH65OV2DJ64Y6EHT27I3VP',
    idempotency_key: `${actionType}:${status}`,
    prepared_transaction_body_fingerprint: 'fingerprint',
    unsigned_transaction_xdr: 'xdr',
    prepared_expires_at: '2026-06-27T00:03:00.000Z',
    transaction_hash: status === 'confirmed' ? 'tx-hash' : null,
    status,
    rpc_result_category: status === 'confirmed' ? 'success' : null,
    confirmed_ledger: status === 'confirmed' ? 12345 : null,
    failure_code: null,
    created_at: now,
    updated_at: updatedAt,
  };
}

describe('Custody V2 state-to-screen mapping', () => {
  it('shows pre-create confirmed contract state as Not created, not TermsPending', () => {
    const state = resolveCustodyV2ScreenState(link({ latest_contract_state: 'TermsPending' }), []);
    const facts = custodyV2StateFacts(state.key);

    expect(state.key).toBe('not_created');
    expect(facts.applicationState).toBe('On-chain deal not created');
    expect(facts.confirmedContractState).toBe('Not created');
    expect(facts.nextSuccessfulContractState).toBe('TermsPending');
    expect(facts.nextResponsibleActor).toBe('Buyer');
  });

  it('uses role-specific pre-creation copy for buyer and seller views', () => {
    expect(custodyV2StatusCopy('not_created', 'buyer')).toMatchObject({
      title: 'Ready for buyer creation',
      body: 'Create the Custody V2 deal on Stellar so the seller can review and accept the frozen terms.',
    });
    expect(custodyV2StatusCopy('not_created', 'seller')).toMatchObject({
      title: 'Waiting for buyer creation',
      body: 'The buyer must create this deal on Stellar before you can review and accept the frozen terms.',
    });
  });

  it('shows TermsPending only after buyer creation is confirmed', () => {
    const state = resolveCustodyV2ScreenState(link(), [
      operation('CREATE_DEAL', 'confirmed'),
    ]);
    const facts = custodyV2StateFacts(state.key);

    expect(state.key).toBe('awaiting_acceptance');
    expect(facts.applicationState).toBe('Waiting for seller acceptance');
    expect(facts.confirmedContractState).toBe('TermsPending');
    expect(facts.nextResponsibleActor).toBe('Seller');
  });

  it('keeps confirmed state at TermsPending while seller acceptance is submitted but unconfirmed', () => {
    const state = resolveCustodyV2ScreenState(link(), [
      operation('CREATE_DEAL', 'confirmed'),
      operation('ACCEPT_TERMS', 'submitted', '2026-06-27T00:01:00.000Z'),
    ]);
    const facts = custodyV2StateFacts(state.key);

    expect(state.key).toBe('accept_pending');
    expect(facts.confirmedContractState).toBe('TermsPending');
    expect(facts.nextSuccessfulContractState).toBe('AwaitingFunding');
  });

  it('shows AwaitingFunding after seller acceptance is confirmed', () => {
    const state = resolveCustodyV2ScreenState(link({ latest_contract_state: 'AwaitingFunding' }), [
      operation('CREATE_DEAL', 'confirmed'),
      operation('ACCEPT_TERMS', 'confirmed', '2026-06-27T00:02:00.000Z'),
    ]);
    const facts = custodyV2StateFacts(state.key);

    expect(state.key).toBe('awaiting_funding');
    expect(facts.applicationState).toBe('Awaiting funding');
    expect(facts.confirmedContractState).toBe('AwaitingFunding');
    expect(facts.nextResponsibleActor).toBe('Buyer and Seller');
  });
});

describe('Custody V2 Deal Room state-integrity labels', () => {
  const source = readFileSync(new URL('./CustodyV2DealRoom.tsx', import.meta.url), 'utf8');

  it('keeps the explicit Testnet rail badge and network status visible', () => {
    expect(source).toContain('Custody V2');
    expect(source).toContain('Stellar Testnet');
    expect(source).toContain('Network');
  });

  it('separates commercial IDR reference from Testnet XLM obligations', () => {
    expect(source).toContain('Commercial IDR reference only');
    expect(source).toContain('Testnet XLM Obligations');
    expect(source).toContain('not an automatic conversion');
  });

  it('keeps buyer-only create and seller-only accept CTA eligibility', () => {
    expect(source).toContain("state.key === 'not_created' && roleResolution.role === 'buyer'");
    expect(source).toContain("state.key === 'awaiting_acceptance' && roleResolution.role === 'seller'");
    expect(source).toContain('Waiting for the buyer to create this deal on Stellar.');
  });
});
