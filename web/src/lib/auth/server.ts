import { cookies } from 'next/headers';
import { supabase } from '../db/supabase-client';
import { repository } from '../repositories';
import type { DbDeal } from '../db/types';

export interface UserSession {
  id: string;
  email?: string;
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const store = process.env.DATA_STORE;
  
  if (store !== 'supabase') {
    // Mock / Demo mode: trust the client cookie 'mock_actor'
    const cookieStore = cookies();
    const mockActor = cookieStore.get('mock_actor')?.value;
    if (mockActor) {
      return { id: mockActor };
    }
    return null;
  }

  // Persistent mode
  if (!supabase) return null;
  
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email
  };
}

export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireDealParticipant(dealId: string): Promise<{ deal: DbDeal; role: 'buyer' | 'seller' }> {
  const user = await requireAuth();

  const deal = await repository.getDeal(dealId);
  if (!deal) throw new Error("Deal not found");

  if (deal.buyer_id === user.id) return { deal, role: 'buyer' };
  if (deal.seller_id === user.id) return { deal, role: 'seller' };

  throw new Error("Forbidden: Not a participant in this deal");
}
