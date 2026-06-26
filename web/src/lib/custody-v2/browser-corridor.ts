import { randomUUID } from 'node:crypto';
import { Networks, StrKey } from '@stellar/stellar-sdk';
import type { DbCustodyDealLink, DbDeal } from '@/lib/db/types';
import { buildActiveRoomDealTerms } from '@/lib/deals/terms';
import type { RuntimeMode } from '@/lib/repositories';
import { runtimeMode } from '@/lib/repositories';
import type { IRepository } from '@/lib/repositories/interfaces';
import { loadCustodyV2PublicConfig, type CustodyV2PublicConfig } from './config';
import { freezeCustodyV2Deal } from './links';

export const FOUNDER_BROWSER_CONTRACT_ID =
  'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4';
export const NATIVE_XLM_SAC_TESTNET_CONTRACT_ID =
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const FOUNDER_BROWSER_MEDIATOR_ADDRESS =
  'GD5DEAIORQAKYJVN6DVQBYR7I2T3HFRV6U3OQEMZ3T4WHL274Y4BVXJ3';
export const FOUNDER_BROWSER_BUYER_PROFILE_ID = 'buyer-surabaya-restaurant';
export const FOUNDER_BROWSER_SELLER_PROFILE_ID = 'seller-probolinggo-cabai';

export const FOUNDER_BROWSER_PRINCIPAL_BASE_UNITS = '1000000';
export const FOUNDER_BROWSER_BUYER_BOND_BASE_UNITS = '100000';
export const FOUNDER_BROWSER_SELLER_BOND_BASE_UNITS = '100000';

export interface CustodyV2BrowserDiagnostics {
  ok: boolean;
  setupAllowed: boolean;
  errors: string[];
  warnings: string[];
  config: CustodyV2PublicConfig | null;
}

export interface CreateFounderBrowserDealInput {
  repository: IRepository;
  buyerAddress: string;
  sellerAddress: string;
  now?: Date;
  dealId?: string;
  env?: NodeJS.ProcessEnv;
  mode?: RuntimeMode;
  nodeEnv?: string;
}

export interface CreateFounderBrowserDealResult {
  deal: DbDeal;
  link: DbCustodyDealLink;
}

function normalizeAddress(value: string): string {
  return value.trim();
}

function assertPublicAddress(address: string, label: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error(`${label} must be a valid Stellar public address.`);
  }
}

function assertSetupDealId(dealId: string) {
  if (!/^custody-v2-browser-[a-zA-Z0-9-]+$/.test(dealId)) {
    throw new Error('Founder browser deal IDs must use the custody-v2-browser prefix.');
  }
}

export function diagnoseCustodyV2BrowserRuntime(
  env: NodeJS.ProcessEnv = process.env,
  mode: RuntimeMode = runtimeMode,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): CustodyV2BrowserDiagnostics {
  const errors: string[] = [];
  const warnings: string[] = [];
  let config: CustodyV2PublicConfig | null = null;

  if (nodeEnv === 'production') {
    errors.push('Founder browser setup is disabled in production.');
  }
  if (mode === 'persistent') {
    errors.push('Founder browser setup is disabled in persistent runtime mode.');
  }

  if (env.NEXT_PUBLIC_CUSTODY_V2_ENABLED !== 'true') {
    errors.push('NEXT_PUBLIC_CUSTODY_V2_ENABLED must be true.');
  }

  try {
    config = loadCustodyV2PublicConfig(env, mode);
    if (!config.enabled) {
      errors.push('Custody V2 public configuration is disabled.');
    }
    if (config.networkPassphrase !== Networks.TESTNET) {
      errors.push('Custody V2 must use the Stellar Testnet network passphrase.');
    }
    if (config.contractId !== FOUNDER_BROWSER_CONTRACT_ID) {
      errors.push(`NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID must be ${FOUNDER_BROWSER_CONTRACT_ID}.`);
    }
    if (config.assetContractId !== NATIVE_XLM_SAC_TESTNET_CONTRACT_ID) {
      errors.push(
        `NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID must be native XLM SAC ${NATIVE_XLM_SAC_TESTNET_CONTRACT_ID}.`,
      );
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const rpcUrl = env.CUSTODY_V2_STELLAR_RPC_URL?.trim();
  if (!rpcUrl) {
    errors.push('CUSTODY_V2_STELLAR_RPC_URL is required for browser transaction preparation.');
  } else if (!rpcUrl.startsWith('https://')) {
    errors.push('CUSTODY_V2_STELLAR_RPC_URL must use https.');
  }

  if (!env.NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE) {
    warnings.push('NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE is not set; the default Testnet explorer will be used.');
  }

  const setupAllowed = nodeEnv !== 'production' && mode !== 'persistent';
  return {
    ok: errors.length === 0,
    setupAllowed,
    errors,
    warnings,
    config,
  };
}

export function resolveCustodyV2BrowserRole(
  link: Pick<DbCustodyDealLink, 'buyer_address' | 'seller_address'>,
  walletAddress: string | null | undefined,
): 'buyer' | 'seller' | null {
  if (!walletAddress) return null;
  if (walletAddress === link.buyer_address) return 'buyer';
  if (walletAddress === link.seller_address) return 'seller';
  return null;
}

export async function createFounderBrowserCustodyDeal(
  input: CreateFounderBrowserDealInput,
): Promise<CreateFounderBrowserDealResult> {
  const mode = input.mode ?? runtimeMode;
  const diagnostics = diagnoseCustodyV2BrowserRuntime(input.env, mode, input.nodeEnv);
  if (!diagnostics.setupAllowed) {
    throw new Error(diagnostics.errors.join(' ') || 'Founder browser setup is not allowed here.');
  }
  if (!diagnostics.ok || !diagnostics.config) {
    throw new Error(`Custody V2 runtime is not ready: ${diagnostics.errors.join(' ')}`);
  }

  const buyerAddress = normalizeAddress(input.buyerAddress);
  const sellerAddress = normalizeAddress(input.sellerAddress);
  assertPublicAddress(buyerAddress, 'buyerAddress');
  assertPublicAddress(sellerAddress, 'sellerAddress');
  if (buyerAddress === sellerAddress) {
    throw new Error('Buyer and seller wallet addresses must be distinct.');
  }

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const dealId = input.dealId ?? `custody-v2-browser-${now.getTime()}-${randomUUID().slice(0, 8)}`;
  assertSetupDealId(dealId);

  const buyerProfile = await input.repository.getProfile(FOUNDER_BROWSER_BUYER_PROFILE_ID);
  const sellerProfile = await input.repository.getProfile(FOUNDER_BROWSER_SELLER_PROFILE_ID);
  if (!buyerProfile || !sellerProfile) {
    throw new Error('Founder browser setup requires the seeded buyer and seller profiles.');
  }

  const deal: DbDeal = {
    id: dealId,
    listing_id: 'listing-cabai-001',
    buyer_request_id: null,
    buyer_id: FOUNDER_BROWSER_BUYER_PROFILE_ID,
    seller_id: FOUNDER_BROWSER_SELLER_PROFILE_ID,
    commodity: "Red Chili (Bird's Eye Chili)",
    volume_kg: 700,
    principal_idr: 19950000,
    buyer_bond_idr: 997500,
    seller_bond_idr: 997500,
    buyer_fee_idr: 0,
    seller_fee_idr: 0,
    buyer_total_idr: 20947500,
    seller_total_idr: 997500,
    status: 'WAITING_DEPOSITS',
    rail_version: 'custody_v2_testnet',
    stellar_mode: 'testnet',
    stellar_contract_id: diagnostics.config.contractId,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {
      ...buildActiveRoomDealTerms({
        offerId: `founder-browser-${dealId}`,
        activatedAt: nowIso,
        depositWindowHours: 24,
      }),
      founder_browser_corridor: true,
      settlement_asset: 'XLM native SAC on Stellar Testnet',
    },
    created_at: nowIso,
    updated_at: nowIso,
  };

  await input.repository.createDeal(deal);
  await input.repository.updateProfile(FOUNDER_BROWSER_BUYER_PROFILE_ID, {
    connected_wallet_address: buyerAddress,
    connected_wallet_network: 'testnet',
    connected_wallet_provider: 'Freighter',
    connected_wallet_linked_at: nowIso,
  });
  await input.repository.updateProfile(FOUNDER_BROWSER_SELLER_PROFILE_ID, {
    connected_wallet_address: sellerAddress,
    connected_wallet_network: 'testnet',
    connected_wallet_provider: 'Freighter',
    connected_wallet_linked_at: nowIso,
  });

  await input.repository.addEvent({
    id: `${dealId}-browser-setup`,
    deal_id: dealId,
    event_type: 'custody_v2_browser_setup',
    actor_id: null,
    message: 'Founder browser corridor created for Custody V2 Testnet acceptance.',
    tx_hash: null,
    proof_hash: null,
    metadata: {
      rail_version: 'custody_v2_testnet',
      contract_id: diagnostics.config.contractId,
      settlement_asset: 'XLM native SAC on Stellar Testnet',
    },
    created_at: nowIso,
  });

  const fundingDeadlineUnix = Math.floor((now.getTime() + 24 * 60 * 60 * 1000) / 1000);
  const deliveryDeadlineUnix = Math.floor((now.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000);
  const inspectionDeadlineUnix = deliveryDeadlineUnix + 24 * 60 * 60;
  const link = await freezeCustodyV2Deal({
    repository: input.repository,
    config: diagnostics.config,
    deal,
    buyerAddress,
    sellerAddress,
    mediatorAddress: FOUNDER_BROWSER_MEDIATOR_ADDRESS,
    principalBaseUnits: FOUNDER_BROWSER_PRINCIPAL_BASE_UNITS,
    buyerBondBaseUnits: FOUNDER_BROWSER_BUYER_BOND_BASE_UNITS,
    sellerBondBaseUnits: FOUNDER_BROWSER_SELLER_BOND_BASE_UNITS,
    fundingDeadlineUnix,
    deliveryDeadlineUnix,
    inspectionDeadlineUnix,
    qualitySpecification: 'Grade A red chili, minimum size 3 cm, fresh harvest lot for browser acceptance.',
    deliveryDestination: 'Surabaya Spice Co. receiving point, Surabaya, East Java.',
    requiredEvidence: ['recent_product_photos', 'delivery_proof', 'signed_receipt'],
    now,
  });

  const persistedDeal = await input.repository.getDeal(deal.id);
  return {
    deal: persistedDeal ?? { ...deal, stellar_escrow_id: link.contract_deal_id },
    link,
  };
}
