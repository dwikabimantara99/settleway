import { createHash } from 'node:crypto';

export const TERMS_DOCUMENT_V1_SCHEMA = 'settleway.terms.v1' as const;
const CONTRACT_DEAL_ID_PREFIX = 'settleway:custody-v2.1:deal:';

const REQUIRED_KEYS = [
  'schema_version',
  'application_deal_id',
  'buyer_application_id',
  'seller_application_id',
  'buyer_stellar_address',
  'seller_stellar_address',
  'mediator_stellar_address',
  'asset_contract_id',
  'settlement_asset_label',
  'principal_base_units',
  'buyer_bond_base_units',
  'seller_bond_base_units',
  'product',
  'quantity',
  'unit',
  'price_reference',
  'quality_specification',
  'delivery_destination',
  'delivery_deadline_unix',
  'inspection_deadline_unix',
  'funding_deadline_unix',
  'required_evidence',
  'agreement_reference',
  'policy_version',
] as const;

export interface TermsDocumentV1 {
  schema_version: typeof TERMS_DOCUMENT_V1_SCHEMA;
  application_deal_id: string;
  buyer_application_id: string;
  seller_application_id: string;
  buyer_stellar_address: string;
  seller_stellar_address: string;
  mediator_stellar_address: string;
  asset_contract_id: string;
  settlement_asset_label: 'XLM';
  principal_base_units: string;
  buyer_bond_base_units: string;
  seller_bond_base_units: string;
  product: string;
  quantity: string;
  unit: string;
  price_reference: string;
  quality_specification: string;
  delivery_destination: string;
  delivery_deadline_unix: number;
  inspection_deadline_unix: number;
  funding_deadline_unix: number;
  required_evidence: readonly string[];
  agreement_reference: string;
  policy_version: string;
}

export interface CanonicalTermsResult {
  document: TermsDocumentV1;
  canonicalJson: string;
  canonicalBytesBase64: string;
  termsHash: string;
  contractDealId: string;
}

function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertNoUnknownFields(input: Record<string, unknown>) {
  const allowed = new Set<string>(REQUIRED_KEYS);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown canonical terms field: ${unknown.sort().join(', ')}`);
  }
}

function assertString(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} must be a non-empty string`);
  }
  return value;
}

function assertIntegerString(value: unknown, key: string): string {
  const text = assertString(value, key);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    throw new Error(`${key} must be an integer base-unit string`);
  }
  return text;
}

function assertUnixSeconds(value: unknown, key: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0 ||
    !Number.isSafeInteger(value)
  ) {
    throw new Error(`${key} must be a safe positive Unix-second integer`);
  }
  return value;
}

function assertEvidence(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('required_evidence must be a non-empty string array');
  }
  const normalized = value.map((item, index) => assertString(item, `required_evidence[${index}]`));
  return [...normalized].sort();
}

export function normalizeTermsDocumentV1(input: Record<string, unknown>): TermsDocumentV1 {
  assertNoUnknownFields(input);

  for (const key of REQUIRED_KEYS) {
    if (!(key in input)) {
      throw new Error(`Missing canonical terms field: ${key}`);
    }
  }

  if (input.schema_version !== TERMS_DOCUMENT_V1_SCHEMA) {
    throw new Error(`schema_version must be ${TERMS_DOCUMENT_V1_SCHEMA}`);
  }

  return {
    schema_version: TERMS_DOCUMENT_V1_SCHEMA,
    application_deal_id: assertString(input.application_deal_id, 'application_deal_id'),
    buyer_application_id: assertString(input.buyer_application_id, 'buyer_application_id'),
    seller_application_id: assertString(input.seller_application_id, 'seller_application_id'),
    buyer_stellar_address: assertString(input.buyer_stellar_address, 'buyer_stellar_address'),
    seller_stellar_address: assertString(input.seller_stellar_address, 'seller_stellar_address'),
    mediator_stellar_address: assertString(input.mediator_stellar_address, 'mediator_stellar_address'),
    asset_contract_id: assertString(input.asset_contract_id, 'asset_contract_id'),
    settlement_asset_label: input.settlement_asset_label === 'XLM'
      ? 'XLM'
      : (() => { throw new Error('settlement_asset_label must be XLM'); })(),
    principal_base_units: assertIntegerString(input.principal_base_units, 'principal_base_units'),
    buyer_bond_base_units: assertIntegerString(input.buyer_bond_base_units, 'buyer_bond_base_units'),
    seller_bond_base_units: assertIntegerString(input.seller_bond_base_units, 'seller_bond_base_units'),
    product: assertString(input.product, 'product'),
    quantity: assertIntegerString(input.quantity, 'quantity'),
    unit: assertString(input.unit, 'unit'),
    price_reference: assertString(input.price_reference, 'price_reference'),
    quality_specification: assertString(input.quality_specification, 'quality_specification'),
    delivery_destination: assertString(input.delivery_destination, 'delivery_destination'),
    delivery_deadline_unix: assertUnixSeconds(input.delivery_deadline_unix, 'delivery_deadline_unix'),
    inspection_deadline_unix: assertUnixSeconds(input.inspection_deadline_unix, 'inspection_deadline_unix'),
    funding_deadline_unix: assertUnixSeconds(input.funding_deadline_unix, 'funding_deadline_unix'),
    required_evidence: assertEvidence(input.required_evidence),
    agreement_reference: assertString(input.agreement_reference, 'agreement_reference'),
    policy_version: assertString(input.policy_version, 'policy_version'),
  };
}

export function canonicalizeTermsDocumentV1(input: Record<string, unknown>): CanonicalTermsResult {
  const document = normalizeTermsDocumentV1(input);
  const ordered: Record<string, unknown> = {};
  for (const key of REQUIRED_KEYS) {
    ordered[key] = document[key];
  }
  const canonicalJson = JSON.stringify(ordered);
  return {
    document,
    canonicalJson,
    canonicalBytesBase64: Buffer.from(canonicalJson, 'utf8').toString('base64'),
    termsHash: sha256Hex(canonicalJson),
    contractDealId: sha256Hex(`${CONTRACT_DEAL_ID_PREFIX}${document.application_deal_id}`),
  };
}

export function decodeCanonicalTermsBytes(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf8');
}
