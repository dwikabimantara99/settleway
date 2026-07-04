import type { DealStatus } from "@/lib/escrow/state-machine";
import type {
  DealStellarSyncStatus,
  StellarMode,
} from "@/lib/stellar/types";

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
  payout_rail_preference: 'wallet' | 'bank';
  payout_wallet_label: string | null;
  payout_wallet_address: string | null;
  connected_wallet_address: string | null;
  connected_wallet_network: 'testnet' | null;
  connected_wallet_provider: string | null;
  connected_wallet_linked_at: string | null;
  payout_bank_name: string | null;
  payout_bank_account_masked: string | null;
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

export type DbOfferStatus =
  | 'negotiating'
  | 'awaiting_counterparty_acceptance'
  | 'terms_accepted'
  | 'awaiting_counterparty_open'
  | 'active_escrow';

export interface DbOffer {
  id: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  buyer_id: string;
  seller_id: string;
  initiated_by_id: string;
  commodity: string;
  volume_kg: number | null;
  price_per_kg_idr: number | null;
  principal_idr: number;
  terms_note: string | null;
  status: DbOfferStatus;
  latest_message_preview: string | null;
  terms_submitted_at: string | null;
  terms_accepted_at: string | null;
  terms_accepted_by_id: string | null;
  buyer_open_room_at: string | null;
  seller_open_room_at: string | null;
  active_deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNegotiationMessage {
  id: string;
  offer_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export type DbNotificationType =
  | 'offer_received'
  | 'offer_accepted'
  | 'message_received'
  | 'counterparty_opened_room'
  | 'deal_room_activated';

export interface DbNotification {
  id: string;
  recipient_id: string;
  offer_id: string;
  type: DbNotificationType;
  message: string;
  read_at: string | null;
  created_at: string;
}

export type DealActivationSource = 'mutual_open_deal_room';
export type DealRailVersion = 'legacy_demo' | 'custody_v2_testnet' | 'managed_custody_testnet';

export interface DbDealTerms {
  activation_source?: DealActivationSource;
  offer_id?: string;
  deposit_window_hours?: number;
  deposit_deadline_at?: string;
  activated_at?: string;
  [key: string]: unknown;
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
  status: DealStatus;
  rail_version?: DealRailVersion;
  stellar_mode: StellarMode;
  stellar_contract_id: string | null;
  stellar_escrow_id: string | null;
  latest_stellar_tx_hash: string | null;
  stellar_sync_status: DealStellarSyncStatus;
  proof_hash: string | null;
  terms: DbDealTerms;
  created_at: string;
  updated_at: string;
}

export type CustodyV2ActionType =
  | 'CREATE_DEAL'
  | 'ACCEPT_TERMS'
  | 'FUND_BUYER'
  | 'FUND_SELLER'
  | 'SUBMIT_EVIDENCE'
  | 'ACCEPT_DELIVERY'
  | 'EXPIRE_FUNDING';

export type CustodyV2OperationStatus =
  | 'prepared'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'expired';

export type CustodyV2ContractState =
  | 'TermsPending'
  | 'AwaitingFunding'
  | 'Active'
  | 'EvidenceSubmitted'
  | 'Disputed'
  | 'SettledSuccess'
  | 'FundingExpired'
  | 'SellerBreach'
  | 'BuyerBreach'
  | 'MutualCancellation';

export interface DbCustodyDealLink {
  application_deal_id: string;
  rail_version: 'custody_v2_testnet' | 'managed_custody_testnet';
  contract_id: string;
  contract_deal_id: string;
  terms_schema_version: 'settleway.terms.v1';
  terms_hash: string;
  canonical_terms_json: string;
  canonical_terms_bytes_base64: string;
  frozen_at: string;
  buyer_address: string;
  seller_address: string;
  mediator_address: string;
  asset_contract_id: string;
  settlement_asset_label: 'XLM';
  principal_base_units: string;
  buyer_bond_base_units: string;
  seller_bond_base_units: string;
  funding_deadline_unix: number;
  delivery_deadline_unix: number;
  inspection_deadline_unix: number;
  buyer_funded_tx?: string | null;
  seller_funded_tx?: string | null;
  settlement_tx?: string | null;
  latest_contract_state: CustodyV2ContractState;
  latest_terminal_outcome: CustodyV2ContractState | null;
  last_confirmed_ledger: number | null;
  last_reconciled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCustodyOperation {
  operation_id: string;
  application_deal_id: string;
  contract_deal_id: string;
  action_type: CustodyV2ActionType;
  actor_address: string;
  idempotency_key: string;
  prepared_transaction_body_fingerprint: string;
  unsigned_transaction_xdr: string;
  prepared_expires_at: string;
  transaction_hash: string | null;
  status: CustodyV2OperationStatus;
  rpc_result_category: string | null;
  confirmed_ledger: number | null;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCustodyEvent {
  event_id: string;
  contract_id: string;
  contract_deal_id: string | null;
  event_type: string;
  ledger: number;
  transaction_hash: string;
  event_index: number;
  decoded_public_facts: Record<string, unknown>;
  ingested_at: string;
}

export interface DbCustodyEventCursor {
  network: 'testnet';
  contract_id: string;
  last_processed_ledger: number | null;
  cursor: string | null;
  last_successful_ingestion_at: string | null;
  detected_gap_status: 'none' | 'gap_detected' | 'stale';
  requested_start_ledger: number | null;
  oldest_available_ledger: number | null;
  latest_available_ledger: number | null;
  first_returned_event_id: string | null;
  gap_detected_at: string | null;
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

export interface DbEvidenceFile {
  id: string;
  deal_id: string;
  submitted_by: string;
  evidence_kind: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256_hash: string;
  display_visibility: 'public' | 'private' | 'deal_only';
  chain_operation_reference: string | null;
  created_at: string;
}

export type ReputationOutcome =
  | "transaction_completed"
  | "buyer_failed_deposit"
  | "seller_failed_deposit"
  | "refunded_before_locked"
  | "verified_harvest_failure";

export interface DbReputationEvent {
  id: string;
  deal_id: string;
  participant_id: string;
  participant_role: 'buyer' | 'seller';
  reputation_outcome: ReputationOutcome;
  reputation_rule_version: string;
  idempotency_key: string;
  score_delta: number;
  volume_delta_idr: number;
  transaction_hash?: string | null;
  proof_hash?: string | null;
  settlement_reference?: string | null;
  settled_at?: string | null;
  created_at: string;
}

/**
 * derived projection
 * This represents the aggregated output from reputation events.
 */
export interface DbReputationAggregate {
  seller_score: number;
  buyer_score: number;
  seller_completed_count: number;
  buyer_completed_count: number;
  refunded_count: number;
  expired_count: number;
  verified_volume_idr: number;
}
