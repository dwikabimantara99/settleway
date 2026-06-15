import { IRepository } from './interfaces';
import { MockRepositoryAdapter } from './mock-adapter';
import { SupabaseRepositoryAdapter } from './supabase-adapter';

export type RuntimeMode = 'test' | 'demo' | 'persistent';

const modeString = process.env.NEXT_PUBLIC_RUNTIME_MODE || process.env.RUNTIME_MODE || 'test';
export const runtimeMode: RuntimeMode = ['test', 'demo', 'persistent'].includes(modeString) 
  ? (modeString as RuntimeMode) 
  : 'test';

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

export const repository: IRepository = createRepository();

export type { IRepository };
