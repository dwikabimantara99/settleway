import { IRepository } from './interfaces';
import { MockRepositoryAdapter } from './mock-adapter';
import { SupabaseRepositoryAdapter } from './supabase-adapter';

export type RuntimeMode = 'test' | 'demo' | 'persistent';

function resolveMode(): RuntimeMode {
  const explicitMode = process.env.NEXT_PUBLIC_RUNTIME_MODE || process.env.RUNTIME_MODE;
  
  if (explicitMode) {
    if (['test', 'demo', 'persistent'].includes(explicitMode)) {
      return explicitMode as RuntimeMode;
    }
    throw new Error(`Invalid explicit runtime mode: ${explicitMode}. Must be test, demo, or persistent.`);
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'development') return 'demo';
  if (nodeEnv === 'production') return 'persistent';
  
  return 'test';
}

export const runtimeMode: RuntimeMode = resolveMode();

function createRepository(): IRepository {
  if (runtimeMode === 'persistent') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration in persistent mode. Failsafe activated: refusing silent fallback to MockStore.");
    }
    return new SupabaseRepositoryAdapter();
  }
  return new MockRepositoryAdapter();
}

import { createPrivilegedServerRepository } from './server-repository';

export const repository: IRepository = createPrivilegedServerRepository();

export type { IRepository };
