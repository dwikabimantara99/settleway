import { Networks, StrKey } from '@stellar/stellar-sdk';

export interface ManagedCustodyConfig {
  enabled: boolean;
  networkPassphrase: string;
  custodyWalletPublicKey: string;
  rpcUrl: string;
}

const DEFAULT_TESTNET_CONFIG = {
  networkPassphrase: Networks.TESTNET,
  custodyWalletPublicKey: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG', // Reusing mediator address for mock custody wallet
  rpcUrl: 'https://soroban-testnet.stellar.org',
};

export function loadManagedCustodyConfig(
  env: NodeJS.ProcessEnv = process.env,
): ManagedCustodyConfig {
  const config: ManagedCustodyConfig = {
    enabled: true,
    networkPassphrase: env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || DEFAULT_TESTNET_CONFIG.networkPassphrase,
    custodyWalletPublicKey: env.NEXT_PUBLIC_CUSTODY_WALLET_PUBLIC_KEY || DEFAULT_TESTNET_CONFIG.custodyWalletPublicKey,
    rpcUrl: env.STELLAR_RPC_URL || DEFAULT_TESTNET_CONFIG.rpcUrl,
  };

  if (!StrKey.isValidEd25519PublicKey(config.custodyWalletPublicKey)) {
    throw new Error('NEXT_PUBLIC_CUSTODY_WALLET_PUBLIC_KEY must be a valid Stellar public address.');
  }

  return config;
}
