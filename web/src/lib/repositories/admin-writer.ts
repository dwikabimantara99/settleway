import "server-only";
import { SupabaseClient } from '@supabase/supabase-js';
import type { DbCustodyDealLink, DbCustodyOperation, DbCustodyEvent, DbCustodyEventCursor } from '../db/types';

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
import { mockStore } from '../db/mock-store';

export interface ICustodyV2AdminWriter {
  createCustodyDealLink(link: DbCustodyDealLink): Promise<{ created: boolean; link: DbCustodyDealLink }>;
  updateCustodyDealLink(applicationDealId: string, patch: Partial<DbCustodyDealLink>): Promise<DbCustodyDealLink | null>;
  createCustodyOperation(operation: DbCustodyOperation): Promise<{ created: boolean; operation: DbCustodyOperation }>;
  updateCustodyOperation(idempotencyKey: string, patch: Partial<DbCustodyOperation>): Promise<DbCustodyOperation | null>;
  appendCustodyEvent(event: DbCustodyEvent): Promise<{ appended: boolean; event: DbCustodyEvent }>;
  getCustodyEventCursor(network: 'testnet', contractId: string): Promise<DbCustodyEventCursor | null>;
  upsertCustodyEventCursor(cursor: DbCustodyEventCursor): Promise<DbCustodyEventCursor>;
}

export class MockCustodyV2AdminWriter implements ICustodyV2AdminWriter {
  async createCustodyDealLink(link: DbCustodyDealLink) { return mockStore.createCustodyDealLink(link); }
  async updateCustodyDealLink(applicationDealId: string, patch: Partial<DbCustodyDealLink>) { return mockStore.updateCustodyDealLink(applicationDealId, patch); }
  async createCustodyOperation(operation: DbCustodyOperation) { return mockStore.createCustodyOperation(operation); }
  async updateCustodyOperation(idempotencyKey: string, patch: Partial<DbCustodyOperation>) { return mockStore.updateCustodyOperation(idempotencyKey, patch); }
  async appendCustodyEvent(event: DbCustodyEvent) { return mockStore.appendCustodyEvent(event); }
  async getCustodyEventCursor(network: 'testnet', contractId: string) { return mockStore.getCustodyEventCursor(network, contractId); }
  async upsertCustodyEventCursor(cursor: DbCustodyEventCursor) { return mockStore.upsertCustodyEventCursor(cursor); }
}

let adminClientInstance: SupabaseClient | null = null;

import { getServiceRoleClient } from '../db/server-service-client';

export class SupabaseCustodyV2AdminWriter implements ICustodyV2AdminWriter {
  private get client() {
    if (adminClientInstance) return adminClientInstance;
    adminClientInstance = getServiceRoleClient();
    return adminClientInstance;
  }

  async createCustodyDealLink(link: DbCustodyDealLink): Promise<{ created: boolean; link: DbCustodyDealLink }> {
    const { data, error } = await this.client.from('custody_v2_deal_links').insert(link).select().single();
    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: selectError } = await this.client.from('custody_v2_deal_links').select('*').eq('application_deal_id', link.application_deal_id).single();
        if (selectError) throw selectError;
        return { created: false, link: existing };
      }
      throw error;
    }
    return { created: true, link: data };
  }

  async updateCustodyDealLink(applicationDealId: string, patch: Partial<DbCustodyDealLink>): Promise<DbCustodyDealLink | null> {
    const { data, error } = await this.client
      .from('custody_v2_deal_links')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('application_deal_id', applicationDealId)
      .select()
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async createCustodyOperation(operation: DbCustodyOperation): Promise<{ created: boolean; operation: DbCustodyOperation }> {
    const { data, error } = await this.client.from('custody_v2_operations').insert(operation).select().single();
    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: selectError } = await this.client.from('custody_v2_operations').select('*').eq('idempotency_key', operation.idempotency_key).single();
        if (selectError) throw selectError;
        return { created: false, operation: existing };
      }
      throw error;
    }
    return { created: true, operation: data };
  }

  async updateCustodyOperation(idempotencyKey: string, patch: Partial<DbCustodyOperation>): Promise<DbCustodyOperation | null> {
    const { data, error } = await this.client
      .from('custody_v2_operations')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('idempotency_key', idempotencyKey)
      .select()
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async appendCustodyEvent(event: DbCustodyEvent): Promise<{ appended: boolean; event: DbCustodyEvent }> {
    const { data, error } = await this.client.from('custody_v2_events').insert(event).select().single();
    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: selectError } = await this.client
          .from('custody_v2_events')
          .select('*')
          .eq('event_id', event.event_id)
          .single();
        if (selectError) throw selectError;
        return { appended: false, event: existing };
      }
      throw error;
    }
    return { appended: true, event: data };
  }

  async getCustodyEventCursor(network: 'testnet', contractId: string): Promise<DbCustodyEventCursor | null> {
    const { data, error } = await this.client
      .from('custody_v2_event_cursors')
      .select('*')
      .eq('network', network)
      .eq('contract_id', contractId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async upsertCustodyEventCursor(cursor: DbCustodyEventCursor): Promise<DbCustodyEventCursor> {
    const { data, error } = await this.client
      .from('custody_v2_event_cursors')
      .upsert(cursor, { onConflict: 'network,contract_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

let writerInstance: ICustodyV2AdminWriter | null = null;

export function getServerAdminWriter(): ICustodyV2AdminWriter {
  if (typeof window !== 'undefined') {
    throw new Error('getServerAdminWriter cannot be used in the browser.');
  }
  if (writerInstance) return writerInstance;
  
  if (resolveRuntimeMode() === 'persistent') {
    writerInstance = new SupabaseCustodyV2AdminWriter();
  } else {
    writerInstance = new MockCustodyV2AdminWriter();
  }
  return writerInstance;
}
