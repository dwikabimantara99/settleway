import { describe, it, expect, beforeEach } from "vitest";
import { MockStore } from "@/lib/db/mock-store";
import { MockStoreStellarOperationPersistence } from "./mock-store-execution-persistence";
import {
  assembleStellarExecutionInput,
  type StellarExecutionPublicMetadata,
} from "./execution-input-assembler";
import { executeStellarOperation } from "./execution-service";
import type { StellarExecutionAdapter } from "./adapter-contracts";
import type {
  StellarAdapterSubmitRequest,
  StellarAdapterSubmitResult,
  StellarAdapterConfirmRequest,
  StellarAdapterConfirmationResult,
} from "./adapter-contracts";
import type { DbDeal } from "@/lib/db/types";
import type { DealStatus } from "@/lib/escrow/state-machine";

const META: StellarExecutionPublicMetadata = {
  contract_id: "C_CONTRACT",
  admin_address: "G_ADMIN",
  buyer_demo_address: "G_BUYER",
  seller_demo_address: "G_SELLER",
};

const DEAL_HASH = "a".repeat(64);
const EXPIRES_AT = "1700000000";
const T0 = "2024-01-01T00:00:00Z";
const T1 = "2024-01-01T01:00:00Z";
const T2 = "2024-01-01T02:00:00Z";

function baseDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: "deal-1",
    listing_id: null,
    buyer_request_id: null,
    buyer_id: "buyer-1",
    seller_id: "seller-1",
    commodity: "chili",
    volume_kg: 100,
    principal_idr: 1000000,
    buyer_bond_idr: 100000,
    seller_bond_idr: 100000,
    buyer_fee_idr: 10000,
    seller_fee_idr: 10000,
    buyer_total_idr: 1110000,
    seller_total_idr: 110000,
    status: "WAITING_DEPOSITS" as DealStatus,
    stellar_mode: "testnet",
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: "idle",
    proof_hash: null,
    terms: {},
    created_at: T0,
    updated_at: T0,
    ...overrides,
  };
}

/**
 * Deterministic fake adapter:
 * - submit always succeeds with a predictable tx hash
 * - confirm always returns confirmed with a result_escrow_id for create_deal
 */
class DeterministicFakeAdapter implements StellarExecutionAdapter {
  submitCalls: StellarAdapterSubmitRequest[] = [];
  confirmCalls: StellarAdapterConfirmRequest[] = [];
  submitBehavior: "success" | "pre_submit_failure" | "retryable_failure" = "success";
  confirmBehavior: "confirmed" | "failed" | "unknown" = "confirmed";

  async submit(request: StellarAdapterSubmitRequest): Promise<StellarAdapterSubmitResult> {
    this.submitCalls.push(request);
    if (this.submitBehavior === "pre_submit_failure") {
      return {
        outcome: "failed",
        action: request.invocation.action,
        stage: "simulate",
        transaction_hash: null,
        error_code: "ERR_CONTRACT_REJECTED",
        retryable: false,
      };
    }
    if (this.submitBehavior === "retryable_failure") {
      return {
        outcome: "failed",
        action: request.invocation.action,
        stage: "submit",
        transaction_hash: null,
        error_code: "ERR_NETWORK_FAILURE",
        retryable: true,
      };
    }
    return {
      outcome: "submitted",
      action: request.invocation.action,
      transaction_hash: `tx_${request.idempotency_key}`,
    };
  }

  async confirm(request: StellarAdapterConfirmRequest): Promise<StellarAdapterConfirmationResult> {
    this.confirmCalls.push(request);
    if (this.confirmBehavior === "failed") {
      return {
        outcome: "failed",
        action: request.action,
        transaction_hash: request.transaction_hash,
        error_code: "ERR_CONTRACT_REJECTED",
        retryable: false,
      };
    }
    if (this.confirmBehavior === "unknown") {
      return {
        outcome: "unknown",
        action: request.action,
        transaction_hash: request.transaction_hash,
        error_code: "ERR_TIMEOUT",
        reconciliation_required: true,
        resubmission_allowed: false,
      };
    }
    if (request.action === "create_deal") {
      return {
        outcome: "confirmed",
        action: "create_deal",
        transaction_hash: request.transaction_hash,
        result_escrow_id: "esc-42",
      };
    }
    return {
      outcome: "confirmed",
      action: request.action as Exclude<typeof request.action, "create_deal">,
      transaction_hash: request.transaction_hash,
      result_escrow_id: null,
    };
  }
}

describe("Execution Integration (offline end-to-end)", () => {
  let store: MockStore;
  let persistence: MockStoreStellarOperationPersistence;
  let adapter: DeterministicFakeAdapter;

  beforeEach(() => {
    store = new MockStore();
    persistence = new MockStoreStellarOperationPersistence(store);
    adapter = new DeterministicFakeAdapter();
  });

  it("create_deal: full happy path assembler → service → confirmed", async () => {
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-1",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const result = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Terminal confirmed state
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.operation.transaction_hash).toBeTruthy();
    expect(result.operation.result_escrow_id).toBe("esc-42");
    expect(result.operation.confirmed_at).toBe(T2);

    // Local commit decision
    expect(result.local_commit.kind).toBe("sync_create_deal");
    if (result.local_commit.kind === "sync_create_deal") {
      expect(result.local_commit.result_escrow_id).toBe("esc-42");
    }

    // Continuation
    expect(result.continuation.kind).toBe("none");

    // MockStore durably persisted
    const stored = store.getStellarOperation(result.operation.idempotency_key);
    expect(stored).not.toBeNull();
    expect(stored?.operation_status).toBe("confirmed");
    expect(stored?.result_escrow_id).toBe("esc-42");

    // Adapter was called
    expect(adapter.submitCalls.length).toBe(1);
    expect(adapter.confirmCalls.length).toBe(1);
  });

  it("buyer_deposit: full happy path", async () => {
    const deal = baseDeal({ stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({
      action: "buyer_deposit",
      operation_id: "op-2",
      deal,
      metadata: META,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const result = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") {
      expect(result.local_commit.target_status).toBe("BUYER_FUNDED");
    }
    expect(result.continuation.kind).toBe("none");
  });

  it("buyer_deposit (SELLER_FUNDED): full happy path", async () => {
    const deal = baseDeal({ status: "SELLER_FUNDED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "buyer_deposit", operation_id: "op-bd-sf", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("LOCKED"); }
  });

  it("seller_deposit (WAITING_DEPOSITS): full happy path", async () => {
    const deal = baseDeal({ status: "WAITING_DEPOSITS", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "seller_deposit", operation_id: "op-sd-wd", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("SELLER_FUNDED"); }
  });

  it("seller_deposit (BUYER_FUNDED): full happy path", async () => {
    const deal = baseDeal({ status: "BUYER_FUNDED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "seller_deposit", operation_id: "op-sd-bf", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("LOCKED"); }
  });

  it("submit_proof (LOCKED): full happy path", async () => {
    const deal = baseDeal({ status: "LOCKED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "submit_proof", operation_id: "op-sp", deal, metadata: META, proof_hash: "b".repeat(64) });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("PROOF_SUBMITTED"); }
  });

  it("mark_delivered (PROOF_SUBMITTED): full happy path", async () => {
    const deal = baseDeal({ status: "PROOF_SUBMITTED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "mark_delivered", operation_id: "op-md", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("DELIVERED"); }
  });

  it("accept_delivery (DELIVERED): full happy path", async () => {
    const deal = baseDeal({ status: "DELIVERED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "accept_delivery", operation_id: "op-ad", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("COMPLETED"); }
  });

  it("expire (WAITING_DEPOSITS): full happy path", async () => {
    const deal = baseDeal({ status: "WAITING_DEPOSITS", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "expire", operation_id: "op-ex-wd", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("EXPIRED"); }
  });

  it("expire (BUYER_FUNDED): full happy path", async () => {
    const deal = baseDeal({ status: "BUYER_FUNDED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "expire", operation_id: "op-ex-bf", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("REFUND_PENDING"); }
  });

  it("expire (SELLER_FUNDED): full happy path", async () => {
    const deal = baseDeal({ status: "SELLER_FUNDED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "expire", operation_id: "op-ex-sf", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("REFUND_PENDING"); }
  });

  it("refund (BUYER_FUNDED): full happy path", async () => {
    const deal = baseDeal({ status: "BUYER_FUNDED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "refund", operation_id: "op-rf-bf", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("REFUNDED"); }
  });

  it("refund (SELLER_FUNDED): full happy path", async () => {
    const deal = baseDeal({ status: "SELLER_FUNDED", stellar_escrow_id: "1" });
    const assemblyResult = assembleStellarExecutionInput({ action: "refund", operation_id: "op-rf-sf", deal, metadata: META });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;
    const result = await executeStellarOperation({ operation_id: assemblyResult.operation_id, deal_id: assemblyResult.deal_id, build_input: assemblyResult.build_input, existing_operation: null, timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 }, persistence, adapter });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation.operation_status).toBe("confirmed");
    expect(result.local_commit.kind).toBe("advance_status");
    if (result.local_commit.kind === "advance_status") { expect(result.local_commit.target_status).toBe("REFUNDED"); }
  });

  it("pre-submit failure: operation persisted as failed with no tx hash", async () => {
    adapter.submitBehavior = "pre_submit_failure";
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-3",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const result = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.operation.operation_status).toBe("failed");
    expect(result.operation.transaction_hash).toBeNull();
    expect(result.operation.public_error_code).toBe("ERR_CONTRACT_REJECTED");
    expect(result.local_commit.kind).toBe("none");
    expect(result.continuation.kind).toBe("none");

    // Adapter did submit but not confirm
    expect(adapter.submitCalls.length).toBe(1);
    expect(adapter.confirmCalls.length).toBe(0);
  });

  it("retryable pre-submit failure returns manual_retry_review continuation", async () => {
    adapter.submitBehavior = "retryable_failure";
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-4",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const result = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.operation.operation_status).toBe("failed");
    expect(result.continuation.kind).toBe("manual_retry_review");
  });

  it("confirmation unknown: operation persisted as unknown with reconcile continuation", async () => {
    adapter.confirmBehavior = "unknown";
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-5",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const result = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.operation.operation_status).toBe("unknown");
    expect(result.operation.transaction_hash).toBeTruthy();
    expect(result.continuation.kind).toBe("reconcile_no_resubmit");

    // MockStore has the unknown state
    const stored = store.getStellarOperation(result.operation.idempotency_key);
    expect(stored?.operation_status).toBe("unknown");
  });

  it("confirmation failed: operation persisted as failed with tx hash", async () => {
    adapter.confirmBehavior = "failed";
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-6",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const result = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.operation.operation_status).toBe("failed");
    expect(result.operation.transaction_hash).toBeTruthy();
    expect(result.operation.public_error_code).toBe("ERR_CONTRACT_REJECTED");
    expect(result.local_commit.kind).toBe("none");
    expect(result.continuation.kind).toBe("none");
  });

  it("idempotent re-execution of confirmed operation", async () => {
    // First execution: confirmed
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-7",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const firstResult = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });
    expect(firstResult.ok).toBe(true);
    if (!firstResult.ok) return;

    // Second execution: pass existing_operation
    const secondResult = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: firstResult.operation,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    expect(secondResult.ok).toBe(true);
    if (!secondResult.ok) return;

    // Should return same confirmed result without re-submitting
    expect(secondResult.operation.operation_status).toBe("confirmed");
    expect(secondResult.local_commit.kind).toBe("sync_create_deal");
    expect(secondResult.continuation.kind).toBe("none");

    // Adapter should NOT have been called again
    expect(adapter.submitCalls.length).toBe(1);
    expect(adapter.confirmCalls.length).toBe(1);
  });

  it("re-confirmation of unknown operation", async () => {
    // First execution: ends up unknown
    adapter.confirmBehavior = "unknown";
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-8",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    const firstResult = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });
    expect(firstResult.ok).toBe(true);
    if (!firstResult.ok) return;
    expect(firstResult.operation.operation_status).toBe("unknown");

    // Second execution: now confirmation succeeds
    adapter.confirmBehavior = "confirmed";
    const secondResult = await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: firstResult.operation,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: "2024-01-01T03:00:00Z" },
      persistence,
      adapter,
    });

    expect(secondResult.ok).toBe(true);
    if (!secondResult.ok) return;
    expect(secondResult.operation.operation_status).toBe("confirmed");
    expect(secondResult.operation.result_escrow_id).toBe("esc-42");
    expect(secondResult.local_commit.kind).toBe("sync_create_deal");

    // Submit was called once, confirm twice
    expect(adapter.submitCalls.length).toBe(1);
    expect(adapter.confirmCalls.length).toBe(2);
  });

  it("assembler rejects mock_only mode before service is invoked", () => {
    const deal = baseDeal({ stellar_mode: "mock_only" });
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-9",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(false);
    if (!assemblyResult.ok) {
      expect(assemblyResult.error_code).toBe("ERR_INVALID_STELLAR_MODE");
    }
  });

  it("every persisted operation is observable in MockStore", async () => {
    const deal = baseDeal();
    const assemblyResult = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-10",
      deal,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(assemblyResult.ok).toBe(true);
    if (!assemblyResult.ok) return;

    await executeStellarOperation({
      operation_id: assemblyResult.operation_id,
      deal_id: assemblyResult.deal_id,
      build_input: assemblyResult.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    const ops = store.findStellarOperationsByDeal("deal-1");
    expect(ops.length).toBe(1);
    expect(ops[0].operation_status).toBe("confirmed");
    expect(ops[0].deal_id).toBe("deal-1");
    expect(ops[0].requested_action).toBe("create_deal");
  });

  it("multiple different operations on same deal are tracked independently", async () => {
    // First: create_deal
    const deal1 = baseDeal();
    const asm1 = assembleStellarExecutionInput({
      action: "create_deal",
      operation_id: "op-11a",
      deal: deal1,
      metadata: META,
      deal_hash: DEAL_HASH,
      expires_at: EXPIRES_AT,
    });
    expect(asm1.ok).toBe(true);
    if (!asm1.ok) return;

    await executeStellarOperation({
      operation_id: asm1.operation_id,
      deal_id: asm1.deal_id,
      build_input: asm1.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    // Second: buyer_deposit (simulated after create)
    const deal2 = baseDeal({ stellar_escrow_id: "1" });
    const asm2 = assembleStellarExecutionInput({
      action: "buyer_deposit",
      operation_id: "op-11b",
      deal: deal2,
      metadata: META,
    });
    expect(asm2.ok).toBe(true);
    if (!asm2.ok) return;

    await executeStellarOperation({
      operation_id: asm2.operation_id,
      deal_id: asm2.deal_id,
      build_input: asm2.build_input,
      existing_operation: null,
      timestamps: { created_at: T0, submit_result_at: T1, confirmation_result_at: T2 },
      persistence,
      adapter,
    });

    const ops = store.findStellarOperationsByDeal("deal-1");
    expect(ops.length).toBe(2);
    expect(ops[0].requested_action).toBe("create_deal");
    expect(ops[1].requested_action).toBe("buyer_deposit");
  });
});
