import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import {
  decodeCustodyV2Config,
  decodeCustodyV2ContractInfo,
  decodeCustodyV2Deal,
} from './contract-reader';

const buyer = Keypair.random().publicKey();
const seller = Keypair.random().publicKey();
const mediator = Keypair.random().publicKey();
const treasury = Keypair.random().publicKey();
const contractAsset = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const bytes32 = Buffer.from('a'.repeat(64), 'hex');

describe('Custody V2 contract reader decoders', () => {
  it('decodes config and contract info public facts', () => {
    expect(decodeCustodyV2Config({
      initialized: true,
      accepted_asset: contractAsset,
      treasury,
      policy_version: 2,
      interface_version: 2,
      success_fee_bps: 0,
      seller_breach_treasury_bps: 2000,
      buyer_breach_treasury_bps: 2000,
    })).toMatchObject({
      accepted_asset: contractAsset,
      treasury,
      policy_version: 2,
    });

    expect(decodeCustodyV2ContractInfo({
      name: 'settleway_trade_assurance_v2_1',
      interface_version: 2,
      policy_version: 2,
    })).toMatchObject({ interface_version: 2, policy_version: 2 });
  });

  it('decodes a deal for chain-driven projection', () => {
    expect(decodeCustodyV2Deal({
      deal_id: bytes32,
      buyer,
      seller,
      mediator,
      creator: buyer,
      terms_hash: bytes32,
      accepted_asset: contractAsset,
      treasury,
      principal: 100n,
      buyer_bond: 10n,
      seller_bond: 10n,
      funding_deadline: 10,
      delivery_deadline: 20,
      inspection_deadline: 30,
      policy_version: 2,
      success_fee_bps: 0,
      seller_breach_treasury_bps: 2000,
      buyer_breach_treasury_bps: 2000,
      buyer_terms_accepted: true,
      seller_terms_accepted: true,
      buyer_funded: true,
      seller_funded: true,
      buyer_cancellation_approved: false,
      seller_cancellation_approved: false,
      evidence_commitment: null,
      disputed: false,
      dispute_opener: null,
      dispute_reason_hash: null,
      state: 'Active',
      terminal_outcome: 'None',
      created_ledger_timestamp: 1,
      last_updated_ledger_timestamp: 2,
    })).toMatchObject({
      deal_id: 'a'.repeat(64),
      principal: '100',
      state: 'Active',
      terminal_outcome: 'None',
    });
  });

  it('rejects unknown states and malformed participant addresses', () => {
    expect(() => decodeCustodyV2Deal({
      deal_id: bytes32,
      buyer: 'not-a-key',
      seller,
      mediator,
      creator: buyer,
      terms_hash: bytes32,
      accepted_asset: contractAsset,
      treasury,
      principal: 100n,
      buyer_bond: 10n,
      seller_bond: 10n,
      funding_deadline: 10,
      delivery_deadline: 20,
      inspection_deadline: 30,
      policy_version: 2,
      success_fee_bps: 0,
      seller_breach_treasury_bps: 2000,
      buyer_breach_treasury_bps: 2000,
      buyer_terms_accepted: true,
      seller_terms_accepted: true,
      buyer_funded: true,
      seller_funded: true,
      buyer_cancellation_approved: false,
      seller_cancellation_approved: false,
      evidence_commitment: null,
      disputed: false,
      dispute_opener: null,
      dispute_reason_hash: null,
      state: 'MadeUp',
      terminal_outcome: 'None',
      created_ledger_timestamp: 1,
      last_updated_ledger_timestamp: 2,
    })).toThrow('Invalid address field: buyer');
  });
});
