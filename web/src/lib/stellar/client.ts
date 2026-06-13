import * as StellarSdk from '@stellar/stellar-sdk';

export const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
export const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
export const CONTRACT_ID = process.env.NEXT_PUBLIC_SETTLEWAY_CONTRACT_ID || '';
const SECRET_KEY = process.env.SETTLEWAY_PLATFORM_SECRET_KEY || '';

export const rpcServer = new StellarSdk.rpc.Server(RPC_URL);
export const platformKeypair = SECRET_KEY ? StellarSdk.Keypair.fromSecret(SECRET_KEY) : null;
export const networkPassphrase = NETWORK === 'testnet' 
  ? StellarSdk.Networks.TESTNET 
  : StellarSdk.Networks.PUBLIC;
