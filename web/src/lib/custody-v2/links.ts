import { StrKey } from '@stellar/stellar-sdk';
import type { DbCustodyDealLink, DbDeal } from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';
import type { CustodyV2PublicConfig } from './config';
import {
  TERMS_DOCUMENT_V1_SCHEMA,
  canonicalizeTermsDocumentV1,
} from './terms';

export interface FreezeCustodyV2DealInput {
  repository: IRepository;
  config: CustodyV2PublicConfig;
  deal: DbDeal;
  buyerAddress: string;
  sellerAddress: string;
  mediatorAddress: string;
  principalBaseUnits: string;
  buyerBondBaseUnits: string;
  sellerBondBaseUnits: string;
  fundingDeadlineUnix: number;
  deliveryDeadlineUnix: number;
  inspectionDeadlineUnix: number;
  qualitySpecification: string;
  deliveryDestination: string;
  requiredEvidence: readonly string[];
  now?: Date;
}

function assertPublicAddress(address: string, label: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error(`${label} must be a valid Stellar public address.`);
  }
}

function assertBaseUnits(value: string, label: string) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${label} must be a positive integer base-unit string.`);
  }
}

export async function freezeCustodyV2Deal(input: FreezeCustodyV2DealInput): Promise<DbCustodyDealLink> {
  if (!input.config.enabled) throw new Error('Custody V2 integration is not enabled.');
  const existing = await input.repository.getCustodyDealLink(input.deal.id);
  if (existing) return existing;
  if (input.deal.rail_version && input.deal.rail_version !== 'custody_v2_testnet') {
    throw new Error('This deal is already assigned to another rail.');
  }
  assertPublicAddress(input.buyerAddress, 'buyerAddress');
  assertPublicAddress(input.sellerAddress, 'sellerAddress');
  assertPublicAddress(input.mediatorAddress, 'mediatorAddress');
  if (input.buyerAddress === input.sellerAddress) throw new Error('Buyer and seller wallet addresses must be distinct.');
  if (input.mediatorAddress === input.buyerAddress || input.mediatorAddress === input.sellerAddress) {
    throw new Error('Mediator address must be distinct from buyer and seller.');
  }
  assertBaseUnits(input.principalBaseUnits, 'principalBaseUnits');
  assertBaseUnits(input.buyerBondBaseUnits, 'buyerBondBaseUnits');
  assertBaseUnits(input.sellerBondBaseUnits, 'sellerBondBaseUnits');

  const terms = canonicalizeTermsDocumentV1({
    schema_version: TERMS_DOCUMENT_V1_SCHEMA,
    application_deal_id: input.deal.id,
    buyer_application_id: input.deal.buyer_id,
    seller_application_id: input.deal.seller_id,
    buyer_stellar_address: input.buyerAddress,
    seller_stellar_address: input.sellerAddress,
    mediator_stellar_address: input.mediatorAddress,
    asset_contract_id: input.config.assetContractId,
    settlement_asset_label: input.config.settlementAssetLabel,
    principal_base_units: input.principalBaseUnits,
    buyer_bond_base_units: input.buyerBondBaseUnits,
    seller_bond_base_units: input.sellerBondBaseUnits,
    product: input.deal.commodity,
    quantity: String(input.deal.volume_kg ?? 0),
    unit: 'kg',
    price_reference: `${input.deal.principal_idr} IDR display reference only; settlement asset is Stellar Testnet XLM`,
    quality_specification: input.qualitySpecification,
    delivery_destination: input.deliveryDestination,
    delivery_deadline_unix: input.deliveryDeadlineUnix,
    inspection_deadline_unix: input.inspectionDeadlineUnix,
    funding_deadline_unix: input.fundingDeadlineUnix,
    required_evidence: input.requiredEvidence,
    agreement_reference: String(input.deal.terms.offer_id ?? input.deal.id),
    policy_version: input.config.policyVersion,
  });

  const now = (input.now ?? new Date()).toISOString();
  const link: DbCustodyDealLink = {
    application_deal_id: input.deal.id,
    rail_version: 'custody_v2_testnet',
    contract_id: input.config.contractId,
    contract_deal_id: terms.contractDealId,
    terms_schema_version: terms.document.schema_version,
    terms_hash: terms.termsHash,
    canonical_terms_json: terms.canonicalJson,
    canonical_terms_bytes_base64: terms.canonicalBytesBase64,
    frozen_at: now,
    buyer_address: input.buyerAddress,
    seller_address: input.sellerAddress,
    mediator_address: input.mediatorAddress,
    asset_contract_id: input.config.assetContractId,
    settlement_asset_label: input.config.settlementAssetLabel,
    principal_base_units: input.principalBaseUnits,
    buyer_bond_base_units: input.buyerBondBaseUnits,
    seller_bond_base_units: input.sellerBondBaseUnits,
    funding_deadline_unix: input.fundingDeadlineUnix,
    delivery_deadline_unix: input.deliveryDeadlineUnix,
    inspection_deadline_unix: input.inspectionDeadlineUnix,
    latest_contract_state: 'TermsPending',
    latest_terminal_outcome: null,
    last_confirmed_ledger: null,
    last_reconciled_at: null,
    created_at: now,
    updated_at: now,
  };
  const created = await input.repository.createCustodyDealLink(link);
  await input.repository.updateDeal(input.deal.id, {
    rail_version: 'custody_v2_testnet',
    stellar_mode: 'testnet',
    stellar_contract_id: input.config.contractId,
    stellar_escrow_id: terms.contractDealId,
    stellar_sync_status: 'idle',
  });
  return created.link;
}
