import { describe, expect, it } from 'vitest';
import { Networks, StrKey } from '@stellar/stellar-sdk';
import { loadCustodyV2PublicConfig, loadCustodyV2ServerConfig } from './config';

const contractId = StrKey.encodeContract(Buffer.alloc(32, 21));
const assetContractId = StrKey.encodeContract(Buffer.alloc(32, 22));

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_CUSTODY_V2_ENABLED: 'true',
    NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE: Networks.TESTNET,
    NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID: contractId,
    NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID: assetContractId,
    NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION: '2',
    NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION: '2',
    NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE: 'https://stellar.expert/explorer/testnet',
    CUSTODY_V2_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe('Custody V2 config', () => {
  it('returns disabled safe defaults when the rail is not enabled', () => {
    expect(loadCustodyV2PublicConfig({}, 'demo')).toMatchObject({
      enabled: false,
      network: 'testnet',
      settlementAssetLabel: 'XLM',
      interfaceVersion: '2',
      policyVersion: '2',
    });
  });

  it('loads explicit public and server Testnet configuration', () => {
    expect(loadCustodyV2PublicConfig(env(), 'demo')).toMatchObject({
      enabled: true,
      networkPassphrase: Networks.TESTNET,
      contractId,
      assetContractId,
      settlementAssetLabel: 'XLM',
    });
    expect(loadCustodyV2ServerConfig(env(), 'demo').rpcUrl).toBe('https://soroban-testnet.stellar.org');
  });

  it('fails closed on missing, wrong-network, or wrong-version config', () => {
    expect(() => loadCustodyV2PublicConfig(env({ NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID: undefined }), 'demo'))
      .toThrow('NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID is required');
    expect(() => loadCustodyV2PublicConfig(env({ NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015' }), 'demo'))
      .toThrow('Stellar Testnet passphrase');
    expect(() => loadCustodyV2PublicConfig(env({ NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION: '1' }), 'demo'))
      .toThrow('expected policy version is 2');
    expect(() => loadCustodyV2ServerConfig(env({ CUSTODY_V2_STELLAR_RPC_URL: 'http://localhost:8000' }), 'demo'))
      .toThrow('must use https');
  });
});
