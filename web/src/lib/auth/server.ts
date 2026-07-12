import { cookies } from 'next/headers';
import { supabase } from '../db/supabase-client';
import { repository } from '../repositories';
import type { DbDeal, DbOffer } from '../db/types';

import { runtimeMode } from '../repositories';

export interface UserSession {
  id: string;
  email?: string;
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const mockActor = cookieStore.get('mock_actor')?.value;

  // Always allow hardcoded demo profiles to bypass real auth (demo escape hatch)
  if (mockActor === 'buyer-surabaya-restaurant' || mockActor === 'seller-probolinggo-cabai') {
    return { id: mockActor };
  }

  if (runtimeMode !== 'persistent') {
    // Mock / Demo mode: trust the client cookie 'mock_actor' for any other actor
    if (mockActor) {
      return { id: mockActor };
    }
    return null;
  }

  // Persistent mode
  if (!supabase) return null;
  
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

export async function requireDealParticipant(dealId: string): Promise<{ deal: DbDeal; role: 'buyer' | 'seller'; user: UserSession }> {
  const user = await requireAuth();

  const deal = await repository.getDeal(dealId);
  if (!deal) throw new Error("Deal not found");

  if (deal.buyer_id === user.id) return { deal, role: 'buyer', user };
  if (deal.seller_id === user.id) return { deal, role: 'seller', user };

  throw new Error("Forbidden: Not a participant in this deal");
}

export async function requireOfferParticipant(offerId: string): Promise<{ offer: DbOffer; role: 'buyer' | 'seller'; user: UserSession }> {
  const user = await requireAuth();

  const offer = await repository.getOffer(offerId);
  if (!offer) throw new Error("Offer not found");

  if (offer.buyer_id === user.id) return { offer, role: 'buyer', user };
  if (offer.seller_id === user.id) return { offer, role: 'seller', user };

  throw new Error("Forbidden: Not a participant in this offer");
}
