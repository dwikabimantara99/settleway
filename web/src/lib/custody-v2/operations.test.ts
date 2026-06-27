import { describe, expect, it, beforeEach } from 'vitest';
import { Keypair, Networks, StrKey, Transaction } from '@stellar/stellar-sdk';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { mockStore } from '@/lib/db/mock-store';
import type { DbCustodyDealLink } from '@/lib/db/types';
import type { StellarRpcPort } from '@/lib/stellar/server/stellar-rpc-port';
import type { CustodyV2ServerConfig } from './config';
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

describe('Custody V2 operation pipeline', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('prepares an allowlisted buyer create_deal transaction and stores idempotently', async () => {
    const repository = new MockRepositoryAdapter();
    await repository.createCustodyDealLink(link());

    const prepared = await prepareCustodyV2Operation({
      repository,
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

    const repeated = await prepareCustodyV2Operation({
      repository,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: buyer.publicKey(),
      now: new Date('2026-06-26T01:00:00.000Z'),
    });
    expect(repeated.operation.idempotency_key).toBe(prepared.operation.idempotency_key);
  });

  it('rejects role and state mismatches before constructing XDR', async () => {
    const repository = new MockRepositoryAdapter();
    await repository.createCustodyDealLink(link('Active'));

    await expect(prepareCustodyV2Operation({
      repository,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'CREATE_DEAL',
      actorAddress: seller.publicKey(),
    })).rejects.toThrow('Only the buyer');

    await expect(prepareCustodyV2Operation({
      repository,
      rpcPort: rpc,
      config: config(),
      applicationDealId: 'deal-custody-v2-test',
      actionType: 'FUND_BUYER',
      actorAddress: buyer.publicKey(),
    })).rejects.toThrow('not allowed from Active');
  });

  it('verifies the signed transaction body and expected signer', async () => {
    const repository = new MockRepositoryAdapter();
    await repository.createCustodyDealLink(link());
    const prepared = await prepareCustodyV2Operation({
      repository,
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
