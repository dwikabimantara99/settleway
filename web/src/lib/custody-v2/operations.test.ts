import { describe, expect, it, beforeEach } from 'vitest';
import { Keypair, Networks, StrKey, Transaction } from '@stellar/stellar-sdk';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { MockCustodyV2AdminWriter } from '@/lib/repositories/admin-writer';
import { mockStore } from '@/lib/db/mock-store';
import type { DbCustodyDealLink } from '@/lib/db/types';
import type { StellarRpcPort } from '@/lib/stellar/server/stellar-rpc-port';
import type { CustodyV2ServerConfig } from './config';
import type { CustodyV2ChainDeal, CustodyV2ContractReadPort } from './contract-reader';
import { prepareCustodyV2Operation, verifySignedCustodyV2Envelope } from './operations';

const buyer = Keypair.random();
const seller = Keypair.random();
const mediator = Keypair.random();
const contractId = StrKey.encodeContract(Buffer.alloc(32, 31));
const assetContractId = StrKey.encodeContract(Buffer.alloc(32, 32));

function config(): CustodyV2ServerConfig {
  return {
    enabled: true,
    network: 'testnet',
    networkPassphrase: Networks.TESTNET,
    contractId,
    assetContractId,
    settlementAssetLabel: 'XLM',
    explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
    interfaceVersion: '2',
    policyVersion: '2',
    rpcUrl: 'https://soroban-testnet.stellar.org',
  };
}

function link(state: DbCustodyDealLink['latest_contract_state'] = 'TermsPending'): DbCustodyDealLink {
  return {
    application_deal_id: 'deal-custody-v2-test',
    rail_version: 'custody_v2_testnet',
    contract_id: contractId,
    contract_deal_id: 'a'.repeat(64),
    terms_schema_version: 'settleway.terms.v1',
    terms_hash: 'b'.repeat(64),
    canonical_terms_json: '{}',
    canonical_terms_bytes_base64: 'e30=',
    frozen_at: '2026-06-26T00:00:00.000Z',
    buyer_address: buyer.publicKey(),
    seller_address: seller.publicKey(),
    mediator_address: mediator.publicKey(),
    asset_contract_id: assetContractId,
    settlement_asset_label: 'XLM',
    principal_base_units: '10000000',
    buyer_bond_base_units: '500000',
    seller_bond_base_units: '500000',
    funding_deadline_unix: 1781816400,
    delivery_deadline_unix: 1782162000,
    inspection_deadline_unix: 1782248400,
    latest_contract_state: state,
    latest_terminal_outcome: null,
    last_confirmed_ledger: null,
    last_reconciled_at: null,
    created_at: '2026-06-26T00:00:00.000Z',
    updated_at: '2026-06-26T00:00:00.000Z',
  };
}

const rpc: StellarRpcPort = {
  verifyNetworkIdentity: async (passphrase) => passphrase === Networks.TESTNET,
  loadSourceAccount: async () => ({ ok: true, sequence: '100' }),
  simulateAndPrepareTransaction: async (transaction) => ({ ok: true, prepared_transaction: transaction }),
  submitTransaction: async () => ({ ok: true, transaction_hash: 'c'.repeat(64) }),
  confirmTransaction: async () => ({
    outcome: 'confirmed',
    transaction_hash: 'c'.repeat(64),
    result_value: null,
  }),
};

function chainDealFromLink(source: DbCustodyDealLink): CustodyV2ChainDeal {
  return {
    deal_id: source.contract_deal_id,
    buyer: source.buyer_address,
    seller: source.seller_address,
    mediator: source.mediator_address,
    creator: source.buyer_address,
    terms_hash: source.terms_hash,
    accepted_asset: source.asset_contract_id,
    treasury: mediator.publicKey(),
    principal: source.principal_base_units,
    buyer_bond: source.buyer_bond_base_units,
    seller_bond: source.seller_bond_base_units,
    funding_deadline: source.funding_deadline_unix,
    delivery_deadline: source.delivery_deadline_unix,
    inspection_deadline: source.inspection_deadline_unix,
    policy_version: 2,
    success_fee_bps: 0,
    seller_breach_treasury_bps: 2000,
    buyer_breach_treasury_bps: 2000,
    buyer_terms_accepted: true,
    seller_terms_accepted: false,
    buyer_funded: false,
    seller_funded: false,
    buyer_cancellation_approved: false,
    seller_cancellation_approved: false,
    evidence_commitment: null,
    disputed: false,
    dispute_opener: null,
    dispute_reason_hash: null,
    state: 'TermsPending',
    terminal_outcome: 'None',
    created_ledger_timestamp: 1781810000,
    last_updated_ledger_timestamp: 1781810000,
  };
}

describe('Custody V2 operation pipeline', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('prepares an allowlisted buyer create_deal transaction and stores idempotently', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    await adminWriter.createCustodyDealLink(link());

    const prepared = await prepareCustodyV2Operation({ repository, adminWriter,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
      now: new Date('2026-06-26T01:00:00.000Z'),
    });

    const tx = new Transaction(prepared.unsigned_xdr, Networks.TESTNET);
    expect(tx.operations).toHaveLength(1);
    expect(prepared.summary).toMatchObject({
      network: 'Stellar Testnet',
      function_name: 'create_deal',
      participant: buyer.publicKey(),
      settlement_asset: 'XLM',
      amount_base_units: null,
    });

    const repeated = await prepareCustodyV2Operation({ repository, adminWriter,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
      now: new Date('2026-06-26T01:00:00.000Z'),
    });
    expect(repeated.operation.idempotency_key).toBe(prepared.operation.idempotency_key);
  });

  it('re-prepares a failed operation instead of reusing the failed record', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    await adminWriter.createCustodyDealLink(link());

    const prepared = await prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
      now: new Date('2026-06-26T01:00:00.000Z'),
    });
    await adminWriter.updateCustodyOperation(prepared.operation.idempotency_key, {
      status: 'failed',
      transaction_hash: 'd'.repeat(64),
      failure_code: 'CHAIN_RECONCILIATION_NOT_FOUND',
      rpc_result_category: 'out_of_sync',
    });

    const retried = await prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
      now: new Date('2026-06-26T01:00:00.000Z'),
    });

    expect(retried.operation.idempotency_key).toBe(prepared.operation.idempotency_key);
    expect(retried.operation.status).toBe('prepared');
    expect(retried.operation.transaction_hash).toBeNull();
    expect(retried.operation.failure_code).toBeNull();
  });

  it('rejects role and state mismatches before constructing XDR', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    await adminWriter.createCustodyDealLink(link('Active'));

    await expect(prepareCustodyV2Operation({ repository, adminWriter,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: seller.publicKey(),
    })).rejects.toThrow('Only the buyer');

    await expect(prepareCustodyV2Operation({ repository, adminWriter,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'FUND_BUYER',
      actorAddress: buyer.publicKey(),
    })).rejects.toThrow('not allowed from Active');
  });

  it('prepares role-bound buyer and seller funding transactions from AwaitingFunding', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    await adminWriter.createCustodyDealLink(link('AwaitingFunding'));

    const buyerFunding = await prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'FUND_BUYER',
      actorAddress: buyer.publicKey(),
    });
    expect(buyerFunding.summary).toMatchObject({
      function_name: 'fund_buyer',
      amount_base_units: '10500000',
      expected_next_state: 'AwaitingFunding or Active',
    });

    const sellerFunding = await prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'FUND_SELLER',
      actorAddress: seller.publicKey(),
    });
    expect(sellerFunding.summary).toMatchObject({
      function_name: 'fund_seller',
      amount_base_units: '500000',
      expected_next_state: 'AwaitingFunding or Active',
    });

    await expect(prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'FUND_BUYER',
      actorAddress: seller.publicKey(),
    })).rejects.toThrow('Only the buyer may fund buyer commitment.');
  });

  it('prepares seller delivery proof and buyer settlement actions in the original Deal Room flow', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    await adminWriter.createCustodyDealLink(link('Active'));

    const evidence = await prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'SUBMIT_EVIDENCE',
      actorAddress: seller.publicKey(),
      evidenceHash: 'e'.repeat(64),
    });
    expect(evidence.summary).toMatchObject({
      function_name: 'submit_evidence',
      amount_base_units: null,
      expected_next_state: 'EvidenceSubmitted',
    });

    await expect(prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'SUBMIT_EVIDENCE',
      actorAddress: buyer.publicKey(),
      evidenceHash: 'e'.repeat(64),
    })).rejects.toThrow('Only the seller may submit evidence.');

    await adminWriter.updateCustodyDealLink('deal-custody-v2-test', {
      latest_contract_state: 'EvidenceSubmitted',
    });
    const settlement = await prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'ACCEPT_DELIVERY',
      actorAddress: buyer.publicKey(),
    });
    expect(settlement.summary).toMatchObject({
      function_name: 'accept_delivery',
      amount_base_units: null,
      expected_next_state: 'SettledSuccess',
    });

    await expect(prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'ACCEPT_DELIVERY',
      actorAddress: seller.publicKey(),
    })).rejects.toThrow('Only the buyer may accept delivery.');
  });

  it('reconciles local state when create_deal already exists on chain', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    const sourceLink = link();
    await adminWriter.createCustodyDealLink(sourceLink);
    const reader: CustodyV2ContractReadPort = {
      getConfig: async () => ({ ok: false, error_code: 'rpc_error', message: 'unused' }),
      getDeal: async () => ({ ok: true, value: chainDealFromLink(sourceLink), latestLedger: 54321 }),
      getState: async () => ({ ok: true, value: 'TermsPending', latestLedger: 54321 }),
      dealExists: async () => ({ ok: true, value: true, latestLedger: 54321 }),
      contractInfo: async () => ({ ok: false, error_code: 'rpc_error', message: 'unused' }),
    };

    await expect(prepareCustodyV2Operation({ repository, adminWriter,
      adminWriter,

      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
      contractReader: reader,
    })).rejects.toThrow('Local Deal Room state has been reconciled');

    const reconciled = await repository.getCustodyDealLink('deal-custody-v2-test');
    expect(reconciled).toMatchObject({
      latest_contract_state: 'TermsPending',
      last_confirmed_ledger: 54321,
    });
    expect(reconciled?.last_reconciled_at).toEqual(expect.any(String));
  });

  it('verifies the signed transaction body and expected signer', async () => {
    const repository = new MockRepositoryAdapter();
    const adminWriter = new MockCustodyV2AdminWriter();
    await adminWriter.createCustodyDealLink(link());
    const prepared = await prepareCustodyV2Operation({ repository, adminWriter,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
    });

    const tx = new Transaction(prepared.unsigned_xdr, Networks.TESTNET);
    tx.sign(buyer);
    expect(() => verifySignedCustodyV2Envelope({
      signedXdr: tx.toXDR(),
      preparedOperation: prepared.operation,
      networkPassphrase: Networks.TESTNET,
      expectedSigner: buyer.publicKey(),
    })).not.toThrow();

    expect(() => verifySignedCustodyV2Envelope({
      signedXdr: tx.toXDR(),
      preparedOperation: prepared.operation,
      networkPassphrase: Networks.TESTNET,
      expectedSigner: seller.publicKey(),
    })).toThrow('missing the expected wallet signature');
  });
});


