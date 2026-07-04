import { describe, expect, it } from 'vitest';
import {
  TERMS_DOCUMENT_V1_SCHEMA,
  canonicalizeTermsDocumentV1,
  decodeCanonicalTermsBytes,
} from './terms';

const baseTerms = {
  schema_version: TERMS_DOCUMENT_V1_SCHEMA,
  application_deal_id: 'deal-custody-v2-demo-001',
  buyer_application_id: 'buyer-surabaya-restaurant',
  seller_application_id: 'seller-probolinggo-cabai',
  buyer_stellar_address: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
  seller_stellar_address: 'GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU',
  mediator_stellar_address: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
  asset_contract_id: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  settlement_asset_label: 'XLM',
  principal_base_units: '10000000',
  buyer_bond_base_units: '500000',
  seller_bond_base_units: '500000',
  product: "Red Chili (Bird's Eye Chili)",
  quantity: '700',
  unit: 'kg',
  price_reference: 'Rp 28.500/kg display reference; settlement asset is Testnet XLM',
  quality_specification: 'Grade A, minimum size 3 cm',
  delivery_destination: 'Surabaya',
  delivery_deadline_unix: 1782162000,
  inspection_deadline_unix: 1782248400,
  funding_deadline_unix: 1781816400,
  required_evidence: ['signed receipt', 'delivery proof', 'recent product photos'],
  agreement_reference: 'offer-demo-cabai-001',
  policy_version: '2',
} as const;

describe('Custody V2 canonical terms', () => {
  it('generates a deterministic canonical JSON, terms hash, and contract deal ID', () => {
    const first = canonicalizeTermsDocumentV1(baseTerms);
    const reordered = canonicalizeTermsDocumentV1({
      required_evidence: ['recent product photos', 'signed receipt', 'delivery proof'],
      policy_version: '2',
      agreement_reference: baseTerms.agreement_reference,
      funding_deadline_unix: baseTerms.funding_deadline_unix,
      inspection_deadline_unix: baseTerms.inspection_deadline_unix,
      delivery_deadline_unix: baseTerms.delivery_deadline_unix,
      delivery_destination: baseTerms.delivery_destination,
      quality_specification: baseTerms.quality_specification,
      price_reference: baseTerms.price_reference,
      unit: baseTerms.unit,
      quantity: baseTerms.quantity,
      product: baseTerms.product,
      seller_bond_base_units: baseTerms.seller_bond_base_units,
      buyer_bond_base_units: baseTerms.buyer_bond_base_units,
      principal_base_units: baseTerms.principal_base_units,
      settlement_asset_label: baseTerms.settlement_asset_label,
      asset_contract_id: baseTerms.asset_contract_id,
      mediator_stellar_address: baseTerms.mediator_stellar_address,
      seller_stellar_address: baseTerms.seller_stellar_address,
      buyer_stellar_address: baseTerms.buyer_stellar_address,
      seller_application_id: baseTerms.seller_application_id,
      buyer_application_id: baseTerms.buyer_application_id,
      application_deal_id: baseTerms.application_deal_id,
      schema_version: baseTerms.schema_version,
    });

    expect(first.termsHash).toBe(reordered.termsHash);
    expect(first.contractDealId).toBe(reordered.contractDealId);
    expect(decodeCanonicalTermsBytes(first.canonicalBytesBase64)).toBe(first.canonicalJson);
    expect(first.termsHash).toBe('8e11e965a49e13ed746cec9eedd0ab945aa710fd87d790b11e4224fb126ba162');
    expect(first.contractDealId).toBe('37536c377bcbedeb83aa629c12872e93869e3e4f7eaed942bd6c2cbb9c126e56');
  });

  it('rejects unknown fields and floats', () => {
    expect(() => canonicalizeTermsDocumentV1({ ...baseTerms, display_price: 'Rp 28.500/kg' }))
      .toThrow('Unknown canonical terms field');
    expect(() => canonicalizeTermsDocumentV1({ ...baseTerms, principal_base_units: '1000.5' }))
      .toThrow('principal_base_units must be an integer base-unit string');
    expect(() => canonicalizeTermsDocumentV1({ ...baseTerms, delivery_deadline_unix: 1782162000.5 }))
      .toThrow('delivery_deadline_unix must be a safe positive Unix-second integer');
  });

  it('changes the hash when a material term changes', () => {
    const first = canonicalizeTermsDocumentV1(baseTerms);
    const changed = canonicalizeTermsDocumentV1({
      ...baseTerms,
      quantity: '701',
    });
    expect(changed.termsHash).not.toBe(first.termsHash);
    expect(changed.contractDealId).toBe(first.contractDealId);
  });
});
