import type { DealStatus } from "@/lib/escrow/state-machine";
import type {
  StellarAction,
  StellarContractMethod,
  StellarMode,
} from "@/lib/stellar/types";

export type StellarSignerRole =
  | "admin"
  | "buyer_demo"
  | "seller_demo";

export type StellarLocalCommitPolicy =
  | "sync_only"
  | "advance_status";

export interface StellarActionPlan {
  action: StellarAction;
  expected_local_status: DealStatus | null;
  target_local_status: DealStatus;
  stellar_method: StellarContractMethod;
  signer_role: StellarSignerRole;
  expects_transaction_hash: true;
  expects_result_escrow_id: boolean;
  requires_confirmation: true;
  local_commit_policy: StellarLocalCommitPolicy;
}

export type StellarActionPlanResolution =
  | {
      ok: true;
      plan: StellarActionPlan;
    }
  | {
      ok: false;
      error_code: "ERR_INVALID_STATE";
    };

export function shouldSubmitToStellar(mode: StellarMode): boolean {
  if (mode === "mock_only") return false;
  if (mode === "testnet") return true;
  return false;
}

export function resolveStellarActionPlan(
  action: StellarAction,
  expectedLocalStatus: DealStatus | null,
): StellarActionPlanResolution {
  if (action === "create_deal" && expectedLocalStatus === null) {
    return {
      ok: true,
      plan: {
        action: "create_deal",
        expected_local_status: null,
        target_local_status: "WAITING_DEPOSITS",
        stellar_method: "create_escrow",
        signer_role: "admin",
        expects_transaction_hash: true,
        expects_result_escrow_id: true,
        requires_confirmation: true,
        local_commit_policy: "sync_only",
      },
    };
  }

  if (action === "buyer_deposit" && expectedLocalStatus === "WAITING_DEPOSITS") {
    return {
      ok: true,
      plan: {
        action: "buyer_deposit",
        expected_local_status: "WAITING_DEPOSITS",
        target_local_status: "BUYER_FUNDED",
        stellar_method: "deposit_buyer",
        signer_role: "buyer_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "buyer_deposit" && expectedLocalStatus === "SELLER_FUNDED") {
    return {
      ok: true,
      plan: {
        action: "buyer_deposit",
        expected_local_status: "SELLER_FUNDED",
        target_local_status: "LOCKED",
        stellar_method: "deposit_buyer",
        signer_role: "buyer_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "seller_deposit" && expectedLocalStatus === "WAITING_DEPOSITS") {
    return {
      ok: true,
      plan: {
        action: "seller_deposit",
        expected_local_status: "WAITING_DEPOSITS",
        target_local_status: "SELLER_FUNDED",
        stellar_method: "deposit_seller",
        signer_role: "seller_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "seller_deposit" && expectedLocalStatus === "BUYER_FUNDED") {
    return {
      ok: true,
      plan: {
        action: "seller_deposit",
        expected_local_status: "BUYER_FUNDED",
        target_local_status: "LOCKED",
        stellar_method: "deposit_seller",
        signer_role: "seller_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "submit_proof" && expectedLocalStatus === "LOCKED") {
    return {
      ok: true,
      plan: {
        action: "submit_proof",
        expected_local_status: "LOCKED",
        target_local_status: "PROOF_SUBMITTED",
        stellar_method: "submit_proof_hash",
        signer_role: "seller_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "mark_delivered" && expectedLocalStatus === "PROOF_SUBMITTED") {
    return {
      ok: true,
      plan: {
        action: "mark_delivered",
        expected_local_status: "PROOF_SUBMITTED",
        target_local_status: "DELIVERED",
        stellar_method: "mark_delivered",
        signer_role: "seller_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "accept_delivery" && expectedLocalStatus === "DELIVERED") {
    return {
      ok: true,
      plan: {
        action: "accept_delivery",
        expected_local_status: "DELIVERED",
        target_local_status: "COMPLETED",
        stellar_method: "accept_and_complete",
        signer_role: "buyer_demo",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "expire" && expectedLocalStatus === "WAITING_DEPOSITS") {
    return {
      ok: true,
      plan: {
        action: "expire",
        expected_local_status: "WAITING_DEPOSITS",
        target_local_status: "EXPIRED",
        stellar_method: "expire_if_unfunded",
        signer_role: "admin",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "expire" && expectedLocalStatus === "BUYER_FUNDED") {
    return {
      ok: true,
      plan: {
        action: "expire",
        expected_local_status: "BUYER_FUNDED",
        target_local_status: "REFUNDED",
        stellar_method: "expire_if_unfunded",
        signer_role: "admin",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "expire" && expectedLocalStatus === "SELLER_FUNDED") {
    return {
      ok: true,
      plan: {
        action: "expire",
        expected_local_status: "SELLER_FUNDED",
        target_local_status: "REFUNDED",
        stellar_method: "expire_if_unfunded",
        signer_role: "admin",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "refund" && expectedLocalStatus === "BUYER_FUNDED") {
    return {
      ok: true,
      plan: {
        action: "refund",
        expected_local_status: "BUYER_FUNDED",
        target_local_status: "REFUNDED",
        stellar_method: "refund_before_locked",
        signer_role: "admin",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  if (action === "refund" && expectedLocalStatus === "SELLER_FUNDED") {
    return {
      ok: true,
      plan: {
        action: "refund",
        expected_local_status: "SELLER_FUNDED",
        target_local_status: "REFUNDED",
        stellar_method: "refund_before_locked",
        signer_role: "admin",
        expects_transaction_hash: true,
        expects_result_escrow_id: false,
        requires_confirmation: true,
        local_commit_policy: "advance_status",
      },
    };
  }

  return {
    ok: false,
    error_code: "ERR_INVALID_STATE",
  };
}
