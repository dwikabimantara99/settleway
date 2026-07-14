import 'server-only';
import { IRepository } from './interfaces';
import { MockRepositoryAdapter } from './mock-adapter';
import { SupabaseRepositoryAdapter } from './supabase-adapter';
import { getServiceRoleClient } from '../db/server-service-client';

export function createPrivilegedServerRepository(): IRepository {
  const mode = process.env.NEXT_PUBLIC_RUNTIME_MODE || process.env.RUNTIME_MODE || process.env.NODE_ENV;
  if (mode === 'persistent' || mode === 'production') {
    const serviceClient = getServiceRoleClient();
    return new SupabaseRepositoryAdapter(serviceClient);
  }
  return new MockRepositoryAdapter();
}
