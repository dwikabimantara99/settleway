import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DbUserWallet } from '@/lib/db/types';
import { mockStore } from '@/lib/db/mock-store';

function resolveRuntimeMode(): 'test' | 'demo' | 'persistent' {
  const explicitMode = process.env.NEXT_PUBLIC_RUNTIME_MODE || process.env.RUNTIME_MODE;
  if (explicitMode) {
    if (['test', 'demo', 'persistent'].includes(explicitMode)) {
      return explicitMode as 'test' | 'demo' | 'persistent';
    }
    throw new Error(`Invalid explicit runtime mode: ${explicitMode}`);
  }
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'development') return 'demo';
  if (nodeEnv === 'production') return 'persistent';
  return 'test';
}

export interface IServerWalletRepository {
  getProfileWallet(userId: string): Promise<DbUserWallet | null>;
  provisionProfileWallet(wallet: DbUserWallet): Promise<void>;
}

export class MockServerWalletRepository implements IServerWalletRepository {
  async getProfileWallet(userId: string) { return mockStore.getProfileWallet(userId); }
  async provisionProfileWallet(wallet: DbUserWallet) { mockStore.provisionProfileWallet(wallet); }
}

let adminClientInstance: SupabaseClient | null = null;

export class SupabaseServerWalletRepository implements IServerWalletRepository {
  private get client() {
    if (adminClientInstance) return adminClientInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL. Refusing to interact with protected wallet tables.");
    }

    adminClientInstance = createClient(supabaseUrl, serviceRoleKey);
    return adminClientInstance;
  }

  async getProfileWallet(userId: string): Promise<DbUserWallet | null> {
    const { data, error } = await this.client.from('user_wallets').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async provisionProfileWallet(wallet: DbUserWallet): Promise<void> {
    const { error } = await this.client.from('user_wallets').insert(wallet);
    if (error) throw error;
  }
}

let walletRepoInstance: IServerWalletRepository | null = null;

export function getServerWalletRepository(): IServerWalletRepository {
  if (typeof window !== 'undefined') {
    throw new Error('getServerWalletRepository cannot be used in the browser.');
  }
  if (walletRepoInstance) return walletRepoInstance;

  if (resolveRuntimeMode() === 'persistent') {
    walletRepoInstance = new SupabaseServerWalletRepository();
  } else {
    walletRepoInstance = new MockServerWalletRepository();
  }
  return walletRepoInstance;
}
