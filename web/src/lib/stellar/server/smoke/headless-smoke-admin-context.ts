import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepositoryAdapter } from '@/lib/repositories/supabase-adapter';

export class HeadlessSmokeAdminRepository extends SupabaseRepositoryAdapter {
  private adminClient: SupabaseClient;

  constructor() {
    super();

    if (process.env.RUNTIME_MODE !== 'persistent' || process.env.NEXT_PUBLIC_RUNTIME_MODE !== 'persistent') {
      throw new Error("Admin smoke context requires RUNTIME_MODE=persistent and NEXT_PUBLIC_RUNTIME_MODE=persistent");
    }

    if (process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION !== '1') {
      throw new Error("Admin smoke context requires ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1");
    }

    const passphrase = process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE;
    if (!passphrase || passphrase.includes('Public Global')) {
      throw new Error("Admin smoke context refuses mainnet passphrase");
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error("Admin smoke context requires Supabase URL and Service Role Key");
    }

    this.adminClient = createClient(url, serviceRoleKey);
  }

  protected get client(): SupabaseClient {
    return this.adminClient;
  }
}

let adminContextInstance: HeadlessSmokeAdminRepository | null = null;

export function getAdminSmokeRepository(): HeadlessSmokeAdminRepository {
  if (typeof window !== 'undefined') {
    throw new Error('Admin smoke context cannot be used in the browser.');
  }

  if (!adminContextInstance) {
    adminContextInstance = new HeadlessSmokeAdminRepository();
  }

  return adminContextInstance;
}
