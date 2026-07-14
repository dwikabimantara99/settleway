import 'server-only';
import { IRepository } from './interfaces';
import { MockRepositoryAdapter } from './mock-adapter';
import { SupabaseRepositoryAdapter } from './supabase-adapter';
import { getServiceRoleClient } from '../db/server-service-client';
import { runtimeMode } from './index';

export function createPrivilegedServerRepository(): IRepository {
  if (runtimeMode === 'persistent') {
    const serviceClient = getServiceRoleClient();
    return new SupabaseRepositoryAdapter(serviceClient);
  }
  return new MockRepositoryAdapter();
}
