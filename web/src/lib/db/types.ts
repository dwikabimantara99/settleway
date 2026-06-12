export type ApiResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; recoverable: boolean } };

export interface DbProfile {
  id: string;
  display_name: string;
  role_label: string;
  location: string | null;
  user_type: 'seller' | 'buyer' | 'both' | 'operator';
  seller_score: number;
  buyer_score: number;
  seller_completed_count: number;
  buyer_completed_count: number;
  verified_volume_idr: number;
  proof_visibility: 'public' | 'private';
  created_at: string;
}

export interface DbListing {
  id: string;
  seller_id: string;
  commodity: string;
  variety: string | null;
  status: 'ready_stock' | 'pre_harvest';
  location: string | null;
  estimated_volume_kg: number | null;
  price_per_kg_idr: number | null;
  estimated_value_idr: number | null;
  harvest_date: string | null;
  description: string | null;
  created_at: string;
}

export interface DbBuyerRequest {
  id: string;
  buyer_id: string;
  commodity: string;
  required_volume_kg: number | null;
  target_price_per_kg_idr: number | null;
  delivery_location: string | null;
  required_by: string | null;
  description: string | null;
  status: 'open' | 'matched' | 'closed';
  created_at: string;
}

export interface DbDeal {
  id: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  buyer_id: string;
  seller_id: string;
  commodity: string;
  volume_kg: number | null;
  principal_idr: number;
  buyer_bond_idr: number;
  seller_bond_idr: number;
  buyer_fee_idr: number;
  seller_fee_idr: number;
  buyer_total_idr: number;
  seller_total_idr: number;
  status: string;
  stellar_mode: string;
  contract_id: string | null;
  latest_tx_hash: string | null;
  proof_hash: string | null;
  terms: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbEscrowEvent {
  id: string;
  deal_id: string;
  event_type: string;
  actor_id: string | null;
  message: string | null;
  tx_hash: string | null;
  proof_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
