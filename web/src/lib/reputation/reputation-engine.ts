import { getServiceRoleClient } from '@/lib/db/server-service-client';

export interface ReputationEventInput {
  participant_id: string;
  deal_id: string;
  participant_role: 'buyer' | 'seller';
  score_delta: number;
  volume_delta_idr: number;
  transaction_hash?: string;
}

export async function awardDealCompletionReputation(
  dealId: string,
  buyerId: string,
  sellerId: string,
  volumeKg: number,
  pricePerKgIdr: number,
  settlementTxHash: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceRoleClient();
  const volumeIdr = volumeKg * pricePerKgIdr;

  try {
    // Check for existing completion events for this deal to ensure idempotency
    const { data: existingEvents, error: checkError } = await supabase
      .from('reputation_events')
      .select('id, participant_id')
      .eq('deal_id', dealId);

    if (checkError) {
      console.error('Error checking reputation events:', checkError);
      return { ok: false, error: checkError.message };
    }

    const hasBuyerEvent = existingEvents?.some((e) => e.participant_id === buyerId);
    const hasSellerEvent = existingEvents?.some((e) => e.participant_id === sellerId);

    const newEvents: ReputationEventInput[] = [];

    if (!hasBuyerEvent) {
      newEvents.push({
        participant_id: buyerId,
        deal_id: dealId,
        participant_role: 'buyer',
        score_delta: 10,
        volume_delta_idr: volumeIdr,
        transaction_hash: settlementTxHash,
      });
    }

    if (!hasSellerEvent) {
      newEvents.push({
        participant_id: sellerId,
        deal_id: dealId,
        participant_role: 'seller',
        score_delta: 10,
        volume_delta_idr: volumeIdr,
        transaction_hash: settlementTxHash,
      });
    }

    if (newEvents.length > 0) {
      const { error: insertError } = await supabase
        .from('reputation_events')
        .insert(newEvents);

      if (insertError) {
        console.error('Error inserting reputation events:', insertError);
        return { ok: false, error: insertError.message };
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('Unexpected error in awardDealCompletionReputation:', err);
    return { ok: false, error: String(err) };
  }
}
