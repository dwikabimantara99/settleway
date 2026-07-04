import { describe, expect, it } from 'vitest';
import type { DbCustodyDealLink } from '@/lib/db/types';
import type { CustodyV2ChainDeal } from './contract-reader';
import { assertChainDealMatchesLink, terminalOutcomeFromChainDeal } from './projection';

const link: DbCustodyDealLink = {
  application_deal_id: 'deal-1',
  rail_version: 'custody_v2_testnet',
  contract_id: 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4',
  contract_deal_id: 'a'.repeat(64),
  terms_schema_version: 'settleway.terms.v1',
  terms_hash: 'b'.repeat(64),
  canonical_terms_json: '{}',
  canonical_terms_bytes_base64: 'e30=',
  frozen_at: '2026-06-26T00:00:00.000Z',
  buyer_address: 'GBKDCPZYIKBDVJDBXBURZCAV2N3QS6HDSFLAQ6O37P2ONEMEMTBFWDBA',
  seller_address: 'GA4JCPSQOPPKUMKYY2RQK5WFIWTWPBUWCBJ2EHTHNREUEB6ASDX4Q4IU',
  mediator_address: 'GD5DEAIORQAKYJVN6DVQBYR7I2T3HFRV6U3OQEMZ3T4WHL274Y4BVXJ3',
  asset_contract_id: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  settlement_asset_label: 'XLM',
  principal_base_units: '100',
  buyer_bond_base_units: '10',
  seller_bond_base_units: '10',
  funding_deadline_unix: 10,
  delivery_deadline_unix: 20,
  inspection_deadline_unix: 30,
  latest_contract_state: 'AwaitingFunding',
  latest_terminal_outcome: null,
  last_confirmed_ledger: null,
  last_reconciled_at: null,
  created_at: '2026-06-26T00:00:00.000Z',
  updated_at: '2026-06-26T00:00:00.000Z',
};

const chainDeal: CustodyV2ChainDeal = {
  deal_id: link.contract_deal_id,
  buyer: link.buyer_address,
  seller: link.seller_address,
  mediator: link.mediator_address,
  creator: link.buyer_address,
  terms_hash: link.terms_hash,
  accepted_asset: link.asset_contract_id,
  treasury: 'GDSOYRJWEFYJPLTOLOG775LQJI7S66UYNQ3IJSXWYYZON27HT7EOVLO2',
  principal: link.principal_base_units,
  buyer_bond: link.buyer_bond_base_units,
  seller_bond: link.seller_bond_base_units,
  funding_deadline: link.funding_deadline_unix,
  delivery_deadline: link.delivery_deadline_unix,
  inspection_deadline: link.inspection_deadline_unix,
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
  state: 'SettledSuccess',
  terminal_outcome: 'SettledSuccess',
  created_ledger_timestamp: 1,
  last_updated_ledger_timestamp: 2,
};

describe('Custody V2 chain projection guard', () => {
  it('accepts matching chain deal facts and terminal state', () => {
    expect(() => assertChainDealMatchesLink({ link, chainDeal })).not.toThrow();
    expect(terminalOutcomeFromChainDeal(chainDeal)).toBe('SettledSuccess');
  });

  it('rejects projection when chain facts do not match the application link', () => {
    expect(() => assertChainDealMatchesLink({
      link,
      chainDeal: { ...chainDeal, principal: '101' },
    })).toThrow('principal_base_units');
  });
});
