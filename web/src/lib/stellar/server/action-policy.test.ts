import { describe, it, expect } from "vitest";
import {
  shouldSubmitToStellar,
  resolveStellarActionPlan,
} from "./action-policy";
import type { StellarActionPlan } from "./action-policy";
import type { DealStatus } from "@/lib/escrow/state-machine";
import type { StellarAction } from "@/lib/stellar/types";

describe("Action Policy", () => {
  it("shouldSubmitToStellar('mock_only') returns false", () => {
    expect(shouldSubmitToStellar("mock_only")).toBe(false);
  });

  it("shouldSubmitToStellar('testnet') returns true", () => {
    expect(shouldSubmitToStellar("testnet")).toBe(true);
  });

  const expectedPlans = [
    {
      action: "create_deal",
      expected_local_status: "WAITING_DEPOSITS",
      target_local_status: "WAITING_DEPOSITS",
      stellar_method: "create_escrow",
      signer_role: "admin",
      expects_transaction_hash: true,
      expects_result_escrow_id: true,
      requires_confirmation: true,
      local_commit_policy: "sync_only",
    },
    {
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

    {
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
    {
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
    {
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
    {
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
    {
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
    {
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
    {
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
    {
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
    {
      action: "expire",
      expected_local_status: "BUYER_FUNDED",
      target_local_status: "REFUND_PENDING",
      stellar_method: "expire_if_unfunded",
      signer_role: "admin",
      expects_transaction_hash: true,
      expects_result_escrow_id: false,
      requires_confirmation: true,
      local_commit_policy: "advance_status",
    },
    {
      action: "expire",
      expected_local_status: "SELLER_FUNDED",
      target_local_status: "REFUND_PENDING",
      stellar_method: "expire_if_unfunded",
      signer_role: "admin",
      expects_transaction_hash: true,
      expects_result_escrow_id: false,
      requires_confirmation: true,
      local_commit_policy: "advance_status",
    },
    {
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
    {
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
  ] satisfies readonly StellarActionPlan[];

  const allActions: StellarAction[] = [
    "create_deal",
    "buyer_deposit",
    "seller_deposit",
    "submit_proof",
    "mark_delivered",
    "accept_delivery",
    "expire",
    "refund",
  ];

  const allStatuses: (DealStatus | null)[] = [
    null,
    "WAITING_DEPOSITS",
    "BUYER_FUNDED",
    "SELLER_FUNDED",
    "LOCKED",
    "PROOF_SUBMITTED",
    "DELIVERED",
    "COMPLETED",
    "EXPIRED",
    "REFUNDED",
    "CANCELLED",
  ];

  it("exhaustively tests all 88 combinations against exact expected objects", () => {
    let validCount = 0;
    let invalidCount = 0;

    for (const action of allActions) {
      for (const status of allStatuses) {
        const expectedPlan = expectedPlans.find(
          (p) => p.action === action && p.expected_local_status === status
        );

        const result = resolveStellarActionPlan(action, status);

        if (expectedPlan) {
          validCount++;
          expect(result).toEqual({
            ok: true,
            plan: { ...expectedPlan, expected_local_status: expectedPlan.action === "create_deal" ? "WAITING_DEPOSITS" : expectedPlan.expected_local_status },
          });
          expect(expectedPlan.stellar_method).not.toBe("lock_if_ready");
        } else {
          invalidCount++;
          expect(result).toEqual({
            ok: false,
            error_code: "ERR_INVALID_STATE",
          });
        }
      }
    }

    expect(expectedPlans.length).toBe(14);

    // Check for unique keys in fixture
    const uniqueKeys = new Set(expectedPlans.map(p => `${p.action}-${p.expected_local_status}`));
    expect(uniqueKeys.size).toBe(14);

    expect(validCount).toBe(14);
    expect(invalidCount).toBe(74);
    expect(validCount + invalidCount).toBe(88);
  });
});
