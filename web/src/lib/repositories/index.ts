import { IRepository } from './interfaces';
import { MockRepositoryAdapter } from './mock-adapter';
import { SupabaseRepositoryAdapter } from './supabase-adapter';

// Select adapter based on environment variable
const useSupabase = process.env.DATA_STORE === 'supabase';

// Export singleton instance
export const repository: IRepository = useSupabase 
  ? new SupabaseRepositoryAdapter() 
  : new MockRepositoryAdapter();

// Re-export interface for types
export type { IRepository };
