import type {
  DealStatus,
  EscrowAction,
} from "@/lib/escrow/state-machine";

export type StellarMode = "mock_only" | "testnet";

export type DealStellarSyncStatus =
  | "idle"
  | "pending"
  | "unknown"
  | "out_of_sync";

export type StellarOperationStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "failed"
  | "unknown";

export type StellarAction = "create_deal" | "create_deal_custody" | EscrowAction;

export type StellarContractMethod =
  | "create_escrow"
  | "create_escrow_v2"
  | "deposit_buyer"
  | "deposit_buyer_v2"
  | "deposit_seller"
  | "deposit_seller_v2"
  | "submit_proof_hash"
  | "submit_proof_hash_v2"
  | "mark_delivered"
  | "mark_delivered_v2"
  | "accept_and_complete"
  | "settle_and_complete"
  | "expire_if_unfunded"
  | "refund_before_locked";

export type StellarPublicErrorCode =
  | "ERR_AUTH_FAILED"
  | "ERR_INVALID_STATE"
  | "ERR_NOT_EXPIRED"
  | "ERR_NO_FUNDS_TO_REFUND"
  | "ERR_CONTRACT_REJECTED"
  | "ERR_NETWORK_FAILURE"
  | "ERR_TIMEOUT"
  | "ERR_UNKNOWN";

export interface StellarOperation {
  idempotency_key: string;
  deal_id: string;
  requested_action: StellarAction;
  expected_local_status: DealStatus | null;
  target_local_status: DealStatus;
  stellar_method: StellarContractMethod;
  operation_status: StellarOperationStatus;
  transaction_hash: string | null;
  result_escrow_id: string | null;
  public_error_code: StellarPublicErrorCode | null;
  created_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
  updated_at: string;
}

export interface CanonicalDealHashInput {
  version: "1";
  deal_id: string;
  buyer_id: string;
  seller_id: string;
  commodity: string;
  volume_kg: string;
  principal_idr: string;
}
