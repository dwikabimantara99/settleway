import { Networks, StrKey } from '@stellar/stellar-sdk';
import { runtimeMode, type RuntimeMode } from '@/lib/repositories';

export interface CustodyV2PublicConfig {
  enabled: boolean;
  network: 'testnet';
  networkPassphrase: string;
  contractId: string;
  assetContractId: string;
  mediatorAddress: string;
  settlementAssetLabel: 'XLM';
  explorerBaseUrl: string;
  interfaceVersion: '2';
  policyVersion: '2';
}

export interface CustodyV2ServerConfig extends CustodyV2PublicConfig {
  rpcUrl: string;
}

const DEFAULT_TESTNET_CONFIG = {
  networkPassphrase: Networks.TESTNET,
  contractId: 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4',
  assetContractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  mediatorAddress: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
  explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
  interfaceVersion: '2' as const,
  policyVersion: '2' as const,
  rpcUrl: 'https://soroban-testnet.stellar.org',
};

function canUseDevelopmentDefaults(mode: RuntimeMode): boolean {
  return mode !== 'persistent' && process.env.NODE_ENV !== 'production';
}

export function loadCustodyV2PublicConfig(
  env: NodeJS.ProcessEnv = process.env,
  mode: RuntimeMode = runtimeMode,
): CustodyV2PublicConfig {
  const enabled = env.NEXT_PUBLIC_CUSTODY_V2_ENABLED === 'true' ||
    (env.NEXT_PUBLIC_CUSTODY_V2_ENABLED !== 'false' && canUseDevelopmentDefaults(mode));
  const useDefaults = canUseDevelopmentDefaults(mode);

  if (!enabled) {
    return {
      enabled: false,
      network: 'testnet',
      networkPassphrase: Networks.TESTNET,
      contractId: '',
      assetContractId: '',
      mediatorAddress: '',
      settlementAssetLabel: 'XLM',
      explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
      interfaceVersion: '2',
      policyVersion: '2',
    };
  }

  const config: CustodyV2PublicConfig = {
    enabled: true,
    network: 'testnet',
    networkPassphrase: env.NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE || defaultOrRequired(useDefaults, DEFAULT_TESTNET_CONFIG.networkPassphrase, 'NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE'),
    contractId: env.NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID || defaultOrRequired(useDefaults, DEFAULT_TESTNET_CONFIG.contractId, 'NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID'),
    assetContractId: env.NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID || defaultOrRequired(useDefaults, DEFAULT_TESTNET_CONFIG.assetContractId, 'NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID'),
    mediatorAddress: env.NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS || defaultOrRequired(useDefaults, DEFAULT_TESTNET_CONFIG.mediatorAddress, 'NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS'),
    settlementAssetLabel: 'XLM',
    explorerBaseUrl: env.NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE || DEFAULT_TESTNET_CONFIG.explorerBaseUrl,
    interfaceVersion: (env.NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION || defaultOrRequired(useDefaults, DEFAULT_TESTNET_CONFIG.interfaceVersion, 'NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION')) as '2',
    policyVersion: (env.NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION || defaultOrRequired(useDefaults, DEFAULT_TESTNET_CONFIG.policyVersion, 'NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION')) as '2',
  };

  validatePublicConfig(config, mode);
  return config;
}

export function loadCustodyV2ServerConfig(
  env: NodeJS.ProcessEnv = process.env,
  mode: RuntimeMode = runtimeMode,
): CustodyV2ServerConfig {
  const publicConfig = loadCustodyV2PublicConfig(env, mode);
  if (!publicConfig.enabled) {
    throw new Error('Custody V2 integration is disabled.');
  }

  const config = {
    ...publicConfig,
    rpcUrl: env.CUSTODY_V2_STELLAR_RPC_URL || defaultOrRequired(canUseDevelopmentDefaults(mode), DEFAULT_TESTNET_CONFIG.rpcUrl, 'CUSTODY_V2_STELLAR_RPC_URL'),
  };

  if (config.rpcUrl.startsWith('http://')) {
    throw new Error('CUSTODY_V2_STELLAR_RPC_URL must use https.');
  }
  return config;
}

function required(value: string | undefined, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required when Custody V2 is enabled.`);
  }
  return value.trim();
}

function defaultOrRequired(useDefault: boolean, defaultValue: string, name: string): string {
  return useDefault ? defaultValue : required(undefined, name);
}

function validatePublicConfig(config: CustodyV2PublicConfig, mode: RuntimeMode) {
  if (mode === 'persistent' && process.env.NODE_ENV === 'production') {
    throw new Error('Custody V2 Testnet integration cannot be silently enabled in production.');
  }
  if (config.networkPassphrase !== Networks.TESTNET) {
    throw new Error('Custody V2 integration must use Stellar Testnet passphrase.');
  }
  if (!StrKey.isValidContract(config.contractId)) {
    throw new Error('NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID must be a valid Stellar contract ID.');
  }
  if (!StrKey.isValidContract(config.assetContractId)) {
    throw new Error('NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID must be a valid Stellar asset contract ID.');
  }
  if (!StrKey.isValidEd25519PublicKey(config.mediatorAddress)) {
    throw new Error('NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS must be a valid Stellar public address.');
  }
  if (config.interfaceVersion !== '2') {
    throw new Error('Custody V2 expected interface version is 2.');
  }
  if (config.policyVersion !== '2') {
    throw new Error('Custody V2 expected policy version is 2.');
  }
}
