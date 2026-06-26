import { beforeEach, describe, expect, it } from 'vitest';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import { mockStore } from '@/lib/db/mock-store';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import {
  createFounderBrowserCustodyDeal,
  diagnoseCustodyV2BrowserRuntime,
  FOUNDER_BROWSER_BUYER_PROFILE_ID,
  FOUNDER_BROWSER_CONTRACT_ID,
  FOUNDER_BROWSER_PRINCIPAL_BASE_UNITS,
  FOUNDER_BROWSER_SELLER_PROFILE_ID,
  NATIVE_XLM_SAC_TESTNET_CONTRACT_ID,
  resolveCustodyV2BrowserRole,
} from './browser-corridor';

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_CUSTODY_V2_ENABLED: 'true',
    NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE: Networks.TESTNET,
    NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID: FOUNDER_BROWSER_CONTRACT_ID,
    NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID: NATIVE_XLM_SAC_TESTNET_CONTRACT_ID,
    NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION: '2',
    NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION: '2',
    NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE: 'https://stellar.expert/explorer/testnet',
    CUSTODY_V2_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe('Custody V2 founder browser corridor', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('blocks production and persistent runtime setup', () => {
    expect(diagnoseCustodyV2BrowserRuntime(env(), 'demo', 'production')).toMatchObject({
      ok: false,
      setupAllowed: false,
    });
    expect(diagnoseCustodyV2BrowserRuntime(env(), 'persistent', 'development')).toMatchObject({
      ok: false,
      setupAllowed: false,
    });
  });

  it('reports explicit missing runtime configuration', () => {
    const diagnostics = diagnoseCustodyV2BrowserRuntime(
      env({
        NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID: undefined,
        CUSTODY_V2_STELLAR_RPC_URL: undefined,
      }),
      'demo',
      'development',
    );

    expect(diagnostics.ok).toBe(false);
    expect(diagnostics.errors.join('\n')).toContain('NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID is required');
    expect(diagnostics.errors.join('\n')).toContain('CUSTODY_V2_STELLAR_RPC_URL is required');
  });

  it('creates a fresh shared Custody V2 Testnet deal and freezes canonical terms', async () => {
    const repository = new MockRepositoryAdapter();
    const buyer = Keypair.random().publicKey();
    const seller = Keypair.random().publicKey();

    const result = await createFounderBrowserCustodyDeal({
      repository,
      buyerAddress: buyer,
      sellerAddress: seller,
      dealId: 'custody-v2-browser-test-001',
      now: new Date('2026-06-26T02:00:00.000Z'),
      env: env(),
      mode: 'demo',
      nodeEnv: 'development',
    });

    expect(result.deal.id).toBe('custody-v2-browser-test-001');
    expect(result.deal.rail_version).toBe('custody_v2_testnet');
    expect(result.deal.stellar_mode).toBe('testnet');
    expect(result.deal.stellar_contract_id).toBe(FOUNDER_BROWSER_CONTRACT_ID);
    expect(result.deal.stellar_escrow_id).toBe(result.link.contract_deal_id);
    expect(result.link.contract_id).toBe(FOUNDER_BROWSER_CONTRACT_ID);
    expect(result.link.asset_contract_id).toBe(NATIVE_XLM_SAC_TESTNET_CONTRACT_ID);
    expect(result.link.settlement_asset_label).toBe('XLM');
    expect(result.link.principal_base_units).toBe(FOUNDER_BROWSER_PRINCIPAL_BASE_UNITS);
    expect(result.link.terms_hash).toMatch(/^[a-f0-9]{64}$/);

    await expect(repository.getDeal('custody-v2-browser-test-001')).resolves.toMatchObject({
      rail_version: 'custody_v2_testnet',
      stellar_escrow_id: result.link.contract_deal_id,
    });
    await expect(repository.getCustodyDealLink('custody-v2-browser-test-001')).resolves.toMatchObject({
      contract_deal_id: result.link.contract_deal_id,
    });
  });

  it('persists distinct buyer and seller wallet role matching', async () => {
    const repository = new MockRepositoryAdapter();
    const buyer = Keypair.random().publicKey();
    const seller = Keypair.random().publicKey();

    const { link } = await createFounderBrowserCustodyDeal({
      repository,
      buyerAddress: buyer,
      sellerAddress: seller,
      dealId: 'custody-v2-browser-role-match',
      env: env(),
      mode: 'demo',
      nodeEnv: 'development',
    });

    expect(resolveCustodyV2BrowserRole(link, buyer)).toBe('buyer');
    expect(resolveCustodyV2BrowserRole(link, seller)).toBe('seller');
    expect(resolveCustodyV2BrowserRole(link, Keypair.random().publicKey())).toBeNull();
    await expect(repository.getProfile(FOUNDER_BROWSER_BUYER_PROFILE_ID)).resolves.toMatchObject({
      connected_wallet_address: buyer,
      connected_wallet_network: 'testnet',
      connected_wallet_provider: 'Freighter',
    });
    await expect(repository.getProfile(FOUNDER_BROWSER_SELLER_PROFILE_ID)).resolves.toMatchObject({
      connected_wallet_address: seller,
      connected_wallet_network: 'testnet',
      connected_wallet_provider: 'Freighter',
    });
  });

  it('does not mutate or fallback from the existing legacy demo deal', async () => {
    const repository = new MockRepositoryAdapter();
    const legacyBefore = await repository.getDeal('demo-cabai-001');
    const buyer = Keypair.random().publicKey();
    const seller = Keypair.random().publicKey();

    await createFounderBrowserCustodyDeal({
      repository,
      buyerAddress: buyer,
      sellerAddress: seller,
      dealId: 'custody-v2-browser-no-legacy-fallback',
      env: env(),
      mode: 'demo',
      nodeEnv: 'development',
    });

    const legacyAfter = await repository.getDeal('demo-cabai-001');
    expect(legacyAfter?.rail_version).toBe(legacyBefore?.rail_version);
    expect(legacyAfter?.stellar_mode).toBe(legacyBefore?.stellar_mode);
    expect(await repository.getCustodyDealLink('demo-cabai-001')).toBeNull();
    expect(await repository.getCustodyDealLink('custody-v2-browser-no-legacy-fallback')).not.toBeNull();
  });
});
