'use client';

import {
  getAddress,
  getNetwork,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

export type FreighterResult = string | Record<string, unknown> | null | undefined;

export interface FreighterApi {
  isConnected?: () => Promise<FreighterResult> | FreighterResult;
  requestAccess?: () => Promise<FreighterResult> | FreighterResult;
  getAddress?: () => Promise<FreighterResult> | FreighterResult;
  getPublicKey?: () => Promise<FreighterResult> | FreighterResult;
  getNetwork?: () => Promise<FreighterResult> | FreighterResult;
  getNetworkDetails?: () => Promise<FreighterResult> | FreighterResult;
  signTransaction?: (
    xdr: string,
    options?: {
      networkPassphrase?: string;
      accountToSign?: string;
      address?: string;
    },
  ) => Promise<FreighterResult> | FreighterResult;
}

export function readStringResult(result: FreighterResult, keys: string[]): string | null {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return null;

  for (const key of keys) {
    const value = result[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return null;
}

export function isTestnetNetwork(result: FreighterResult): boolean {
  if (typeof result === 'string') {
    return result.toLowerCase().includes('test');
  }

  if (!result || typeof result !== 'object') return false;

  const network = readStringResult(result, ['network', 'networkName', 'name']);
  const passphrase = readStringResult(result, ['networkPassphrase', 'passphrase']);
  return (
    network?.toLowerCase().includes('test') === true ||
    passphrase === 'Test SDF Network ; September 2015'
  );
}

export function shortenStellarAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export async function getFreighterApi(): Promise<FreighterApi | null> {
  if (typeof window === 'undefined') return null;

  const connection = await isConnected();
  if (connection.error || !connection.isConnected) return null;

  return {
    isConnected,
    requestAccess,
    getAddress,
    getNetwork,
    getNetworkDetails,
    signTransaction,
  };
}
