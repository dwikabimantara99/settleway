import { IRepository } from './interfaces';
import { supabase } from '../db/supabase-client';
import type { DbProfile, DbListing, DbBuyerRequest, DbOffer, DbNegotiationMessage, DbNotification, DbDeal, DbEscrowEvent, DbEvidenceFile, DbReputationEvent } from '../db/types';
import type { StellarOperation } from '../stellar/types';

export class SupabaseRepositoryAdapter implements IRepository {
  private get client() {
    if (!supabase) throw new Error("Supabase client is not configured");
    return supabase;
  }

  async getProfile(id: string): Promise<DbProfile | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getListings(): Promise<DbListing[]> {
    const { data, error } = await this.client.from('listings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getListing(id: string): Promise<DbListing | null> {
    const { data, error } = await this.client.from('listings').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getBuyerRequests(): Promise<DbBuyerRequest[]> {
    const { data, error } = await this.client.from('buyer_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getBuyerRequest(id: string): Promise<DbBuyerRequest | null> {
    const { data, error } = await this.client.from('buyer_requests').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getOffer(id: string): Promise<DbOffer | null> {
    const { data, error } = await this.client.from('offers').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async listOffersForParticipant(participantId: string): Promise<DbOffer[]> {
    const { data, error } = await this.client
      .from('offers')
      .select('*')
      .or(`buyer_id.eq.${participantId},seller_id.eq.${participantId}`)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createOffer(offer: DbOffer): Promise<void> {
    const { error } = await this.client.from('offers').insert(offer);
    if (error) throw error;
  }

  async updateOffer(id: string, partial: Partial<DbOffer>): Promise<void> {
    const { error } = await this.client.from('offers').update({ ...partial, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  async getOfferMessages(offerId: string): Promise<DbNegotiationMessage[]> {
    const { data, error } = await this.client
      .from('offer_messages')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addOfferMessage(message: DbNegotiationMessage): Promise<void> {
    const { error } = await this.client.from('offer_messages').insert(message);
    if (error) throw error;
  }

  async getNotifications(recipientId: string): Promise<DbNotification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async addNotification(notification: DbNotification): Promise<void> {
    const { error } = await this.client.from('notifications').insert(notification);
    if (error) throw error;
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async getDeal(id: string): Promise<DbDeal | null> {
    const { data, error } = await this.client.from('deals').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async createDeal(deal: DbDeal): Promise<void> {
    const { error } = await this.client.from('deals').insert(deal);
    if (error) throw error;
  }

  async updateDeal(id: string, partial: Partial<DbDeal>): Promise<void> {
    const { error } = await this.client.from('deals').update({ ...partial, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  // A simplified optimistic concurrency check via Supabase RPC or direct update with condition
  // For the hackathon MVP, we emulate CAS using an update with where conditions on the current state.
  async replaceDealIfCurrent(input: { current: DbDeal; next: DbDeal }): Promise<{ replaced: boolean; deal: DbDeal | null }> {
    const { data, error } = await this.client
      .from('deals')
      .update({ ...input.next, updated_at: new Date().toISOString() })
      .eq('id', input.current.id)
      .eq('status', input.current.status)
      .eq('updated_at', input.current.updated_at)
      .select()
      .single();

    if (error) return { replaced: false, deal: null };
    return { replaced: !!data, deal: data || null };
  }

  async getDealEvents(dealId: string): Promise<DbEscrowEvent[]> {
    const { data, error } = await this.client.from('escrow_events').select('*').eq('deal_id', dealId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addEvent(event: DbEscrowEvent): Promise<void> {
    const { error } = await this.client.from('escrow_events').insert(event);
    if (error) throw error;
  }

  // --- Stellar Operations ---
  // Note: Depending on schema, we might need a stellar_operations table.
  async getStellarOperation(key: string): Promise<StellarOperation | null> {
    const { data, error } = await this.client.from('stellar_operations').select('*').eq('idempotency_key', key).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async createStellarOperation(operation: StellarOperation): Promise<{ created: boolean; operation: StellarOperation }> {
    const { data, error } = await this.client.from('stellar_operations').insert(operation).select().single();
    if (error) {
      if (error.code === '23505') { // Unique violation
        const existing = await this.getStellarOperation(operation.idempotency_key);
        return { created: false, operation: existing! };
      }
      throw error;
    }
    return { created: true, operation: data };
  }

  async updateStellarOperation(key: string, patch: Partial<Pick<StellarOperation, "operation_status" | "transaction_hash" | "result_escrow_id" | "public_error_code" | "submitted_at" | "confirmed_at" | "updated_at">>): Promise<StellarOperation | null> {
    const { data, error } = await this.client.from('stellar_operations').update(patch).eq('idempotency_key', key).select().single();
    if (error) throw error;
    return data || null;
  }

  async findStellarOperationsByDeal(dealId: string): Promise<StellarOperation[]> {
    const { data, error } = await this.client.from('stellar_operations').select('*').eq('deal_id', dealId);
    if (error) throw error;
    return data || [];
  }

  async replaceStellarOperationIfCurrent(input: { current: StellarOperation; next: StellarOperation }): Promise<{ replaced: boolean; operation: StellarOperation | null }> {
    const { data, error } = await this.client
      .from('stellar_operations')
      .update(input.next)
      .eq('idempotency_key', input.current.idempotency_key)
      .eq('operation_status', input.current.operation_status)
      .select()
      .single();
      
    if (error) return { replaced: false, operation: null };
    return { replaced: !!data, operation: data || null };
  }

  async addEvidence(evidence: DbEvidenceFile): Promise<void> {
    const { error } = await this.client.from('evidence_files').insert(evidence);
    if (error) throw error;
  }

  async getEvidence(id: string): Promise<DbEvidenceFile | null> {
    const { data, error } = await this.client.from('evidence_files').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getDealEvidence(dealId: string): Promise<DbEvidenceFile[]> {
    const { data, error } = await this.client.from('evidence_files').select('*').eq('deal_id', dealId);
    if (error) throw error;
    return data || [];
  }

  async appendReputationEvent(event: DbReputationEvent): Promise<{ appended: boolean; event: DbReputationEvent }> {
    const { data, error } = await this.client.from('reputation_events').insert(event).select().single();
    if (error) {
      if (error.code === '23505') {
        const existing = await this.getReputationEvent(event.id);
        return { appended: false, event: existing! };
      }
      throw error;
    }
    return { appended: true, event: data };
  }

  async appendReputationEventPair(events: DbReputationEvent[]): Promise<{ appended: boolean; events: DbReputationEvent[] }> {
    // Supabase JS allows array inserts. We don't have transaction wrappers natively in the client, but inserting an array is atomic enough.
    const { data, error } = await this.client.from('reputation_events').insert(events).select();
    if (error) {
      if (error.code === '23505') {
        return { appended: false, events: [] }; // Simplified error handling
      }
      throw error;
    }
    return { appended: true, events: data as DbReputationEvent[] };
  }

  async getReputationEvent(id: string): Promise<DbReputationEvent | null> {
    const { data, error } = await this.client.from('reputation_events').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async getParticipantReputationEvents(participantId: string): Promise<DbReputationEvent[]> {
    const { data, error } = await this.client.from('reputation_events').select('*').eq('participant_id', participantId);
    if (error) throw error;
    return data || [];
  }

  async getDealReputationEvents(dealId: string): Promise<DbReputationEvent[]> {
    const { data, error } = await this.client.from('reputation_events').select('*').eq('deal_id', dealId);
    if (error) throw error;
    return data || [];
  }
}
