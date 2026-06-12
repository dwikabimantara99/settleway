import { mockStore } from './mock-store';
import { hasSupabaseConfig, supabase } from './supabase-client';
import { DbDeal } from './types';

export async function getDeal(id: string): Promise<DbDeal | null> {
  if (hasSupabaseConfig && supabase) {
    const { data } = await supabase.from('deals').select('*').eq('id', id).single();
    return data || null;
  }
  return mockStore.deals.get(id) || null;
}
