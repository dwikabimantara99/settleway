import { createClient } from '@supabase/supabase-js';
import type { DbOffer, DbNotification, DbDeal } from '../db/types';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export async function insertDemoOffer(offer: DbOffer): Promise<void> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { error } = await supabaseAdmin.from('offers').insert(offer);
  if (error) {
    if (error.code === '23505') return; // Idempotency
    throw error;
  }
}

export async function updateDemoOffer(id: string, partial: Partial<DbOffer>): Promise<void> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { error } = await supabaseAdmin.from('offers').update(partial).eq('id', id);
  if (error) throw error;
}

export async function insertDemoNotification(notification: DbNotification): Promise<void> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { error } = await supabaseAdmin.from('notifications').insert(notification);
  if (error) {
    if (error.code === '23505') return;
    throw error;
  }
}

export async function insertDemoDeal(deal: DbDeal): Promise<void> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { error } = await supabaseAdmin.from('deals').insert(deal);
  if (error) {
    if (error.code === '23505') return;
    throw error;
  }
}
export async function getDemoOffer(id: string): Promise<DbOffer | null> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { data, error } = await supabaseAdmin.from('offers').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function getDemoDeal(id: string): Promise<DbDeal | null> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { data, error } = await supabaseAdmin.from('deals').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function getDemoNotifications(recipientId: string): Promise<DbNotification[]> {
  if (!supabaseAdmin) throw new Error("Service role key not configured for demo.");
  const { data, error } = await supabaseAdmin.from('notifications').select('*').eq('recipient_id', recipientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
