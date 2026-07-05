import { createStellarIdempotencyKey } from "@/lib/stellar/helpers";
import { describe, it, expect } from "vitest";
import { planStellarExecution, type StellarExecutionPlanningInput, type StellarExecutionPlan } from "./execution-planner";
import type { StellarOperation } from "@/lib/stellar/types";
import type { DealStatus } from "@/lib/escrow/state-machine";

const TS1 = "2023-01-01T00:00:00Z";
const TS2 = "2023-01-01T00:00:01Z";

const BASE_BUILD_INPUT = {
  action: "create_deal" as const,
  expected_local_status: null as DealStatus | null,
  contract_id: "C123",
  deal_hash: "0000000000000000000000000000000000000000000000000000000000000000",
  buyer_address: "G123",
  seller_address: "G456",
  principal: "1000",
  buyer_bond: "100",
  seller_bond: "100",
  buyer_fee: "10",
  seller_fee: "10",
  expires_at: "1700000000",
};

const BASE_INPUT: StellarExecutionPlanningInput = {
  operation_id: "op-1",
  deal_id: "deal-1",
  build_input: { ...BASE_BUILD_INPUT },
  existing_operation: null,
  created_at: TS1,
};

describe("Stellar Execution Planner - New operation flows", () => {
  it("1. new create-deal returns persist_pending_before_submit", () => {
    const res = planStellarExecution(BASE_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("persist_pending_before_submit");
      if (res.kind === "persist_pending_before_submit") {
        expect(res.operation_id).toBe("op-1");
      }
    }
  });

  it("2. new transition returns persist_pending_before_submit", () => {
    const input: StellarExecutionPlanningInput = {
      ...BASE_INPUT,
      build_input: {
        action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
        contract_id: "C123",
        escrow_id: "1",
        actor_address: "G123",
      },
    };
    const res = planStellarExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("persist_pending_before_submit");
    }
  });

  it("3. exact pending operation fields", () => {
    const res = planStellarExecution(BASE_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok && res.kind === "persist_pending_before_submit") {
      const op = res.operation;
      expect(op.deal_id).toBe("deal-1");
      expect(op.requested_action).toBe("create_deal");
      expect(op.expected_local_status).toBe(null);
      expect(op.operation_status).toBe("pending");
      expect(op.transaction_hash).toBe(null);
      expect(op.result_escrow_id).toBe(null);
      expect(op.public_error_code).toBe(null);
      expect(op.created_at).toBe(TS1);
      expect(op.submitted_at).toBe(null);
      expect(op.confirmed_at).toBe(null);
      expect(op.updated_at).toBe(TS1);
    }
  });

  it("4. exact canonical idempotency key", () => {
    const res = planStellarExecution(BASE_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok && res.kind === "persist_pending_before_submit") {
      expect(res.operation.idempotency_key).toBe("v1:deal-1:CREATE:create_deal");
    }
  });

  it("5. exact canonical target status and method", () => {
    const res = planStellarExecution(BASE_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok && res.kind === "persist_pending_before_submit") {
      expect(res.operation.target_local_status).toBe("WAITING_DEPOSITS");
      expect(res.operation.stellar_method).toBe("create_escrow");
    }
  });

  it("6. exact prepared invocation", () => {
    const res = planStellarExecution(BASE_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok && res.kind === "persist_pending_before_submit") {
      expect(res.invocation.action).toBe("create_deal");
      expect(res.invocation.method).toBe("create_escrow");
      expect(res.invocation.contract_id).toBe("C123");
    }
  });

  it("7. build failure returns builder failure", () => {
    const input: StellarExecutionPlanningInput = {
      ...BASE_INPUT,
      build_input: { ...BASE_BUILD_INPUT, buyer_address: " " }, // invalid
    };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "build", error_code: "ERR_MISSING_REQUIRED_VALUE", field: "buyer_address" });
  });

  it("8. invalid operation ID", () => {
    const input = { ...BASE_INPUT, operation_id: " " };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "input", error_code: "ERR_INVALID_IDENTIFIER", field: "operation_id" });
  });

  it("9. invalid deal ID", () => {
    const input = { ...BASE_INPUT, deal_id: "" };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "input", error_code: "ERR_INVALID_IDENTIFIER", field: "deal_id" });
  });

  it("10. invalid created timestamp", () => {
    const input = { ...BASE_INPUT, created_at: "  " };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "input", error_code: "ERR_INVALID_IDENTIFIER", field: "created_at" });
  });
});

describe("Stellar Execution Planner - Existing operation flows", () => {
  const BASE_EXISTING: StellarOperation = {
    idempotency_key: "v1:deal-1:CREATE:create_deal",
    deal_id: "deal-1",
    requested_action: "create_deal",
    expected_local_status: null,
    target_local_status: "WAITING_DEPOSITS",
    stellar_method: "create_escrow",
    operation_status: "submitted",
    transaction_hash: "hash1",
    result_escrow_id: null,
    public_error_code: null,
    created_at: TS1,
    submitted_at: TS2,
    confirmed_at: null,
    updated_at: TS2,
  };

  it("11. submitted returns confirm_existing", () => {
    const input = { ...BASE_INPUT, existing_operation: BASE_EXISTING };
    const res = planStellarExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("confirm_existing");
      if (res.kind === "confirm_existing") {
        expect(res.confirm_request).toStrictEqual({ action: "create_deal", transaction_hash: "hash1" });
      }
    }
  });

  it("12. unknown returns confirm_existing", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "unknown" as const } };
    const res = planStellarExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("confirm_existing");
      if (res.kind === "confirm_existing") {
        expect(res.confirm_request).toStrictEqual({ action: "create_deal", transaction_hash: "hash1" });
      }
    }
  });

  it("13. confirmed create returns apply_existing_confirmed", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "confirmed" as const, confirmed_at: TS2, result_escrow_id: "esc1" } };
    const res = planStellarExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("apply_existing_confirmed");
      if (res.kind === "apply_existing_confirmed") {
        expect(res.local_commit).toStrictEqual({ kind: "sync_create_deal", transaction_hash: "hash1", result_escrow_id: "esc1" });
      }
    }
  });

  it("14. confirmed transition returns apply_existing_confirmed", () => {
    const existing: StellarOperation = {
      ...BASE_EXISTING,
      idempotency_key: createStellarIdempotencyKey("deal-1", "b1", "buyer_deposit"),
      requested_action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
      target_local_status: "BUYER_FUNDED",
      stellar_method: "deposit_buyer",
      operation_status: "confirmed",
      confirmed_at: TS2,
      result_escrow_id: null,
    };
    const input: StellarExecutionPlanningInput = {
      ...BASE_INPUT,
      build_input: {
        action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
        contract_id: "C123",
        escrow_id: "1",
        actor_address: "G123",
      },
      existing_operation: existing,
    };
    const res = planStellarExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.kind).toBe("apply_existing_confirmed");
      if (res.kind === "apply_existing_confirmed") {
        expect(res.local_commit).toStrictEqual({ kind: "advance_status", target_status: "BUYER_FUNDED", transaction_hash: "hash1" });
      }
    }
  });

  it("15. pending is rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "pending" as const, transaction_hash: null } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_PENDING" });
  });

  it("16. failed is rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "failed" as const } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_FAILED" });
  });

  it("17. mismatched idempotency key rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, idempotency_key: "wrong" } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("18. mismatched deal ID rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, deal_id: "wrong" } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("19. mismatched action rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, requested_action: "buyer_deposit" as const } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("20. mismatched expected status rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, expected_local_status: "WAITING_DEPOSITS" as const } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("21. mismatched target status rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, target_local_status: "BUYER_FUNDED" as const } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("22. mismatched method rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, stellar_method: "deposit_buyer" as const } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("23. corrupt submitted rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, transaction_hash: null } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_CORRUPT" });
  });

  it("24. corrupt unknown rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "unknown" as const, confirmed_at: TS2 } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_CORRUPT" });
  });

  it("25. corrupt confirmed create rejected", () => {
    const input = { ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "confirmed" as const, confirmed_at: TS2, result_escrow_id: null } };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_CORRUPT" });
  });

  it("26. corrupt confirmed transition rejected", () => {
    const existing: StellarOperation = {
      ...BASE_EXISTING,
      idempotency_key: createStellarIdempotencyKey("deal-1", "b1", "buyer_deposit"),
      requested_action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
      target_local_status: "BUYER_FUNDED",
      stellar_method: "deposit_buyer",
      operation_status: "confirmed",
      confirmed_at: TS2,
      result_escrow_id: "esc1", // Error: transition should not have escrow id
    };
    const input: StellarExecutionPlanningInput = {
      ...BASE_INPUT,
      build_input: {
        action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
        contract_id: "C123",
        escrow_id: "1",
        actor_address: "G123",
      },
      existing_operation: existing,
    };
    const res = planStellarExecution(input);
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_CORRUPT" });
  });
});

describe("Stellar Execution Planner - Safety and purity", () => {
  const BASE_EXISTING: StellarOperation = {
    idempotency_key: "v1:deal-1:CREATE:create_deal",
    deal_id: "deal-1",
    requested_action: "create_deal",
    expected_local_status: null,
    target_local_status: "WAITING_DEPOSITS",
    stellar_method: "create_escrow",
    operation_status: "submitted",
    transaction_hash: "hash1",
    result_escrow_id: null,
    public_error_code: null,
    created_at: TS1,
    submitted_at: TS2,
    confirmed_at: null,
    updated_at: TS2,
  };

  it("27. builder is not called for an existing operation that fails intent validation", () => {
    const input: StellarExecutionPlanningInput = {
      ...BASE_INPUT,
      // invalid build_input that would fail in builder
      build_input: { ...BASE_BUILD_INPUT, buyer_address: " " },
      // but mismatched existing operation prevents builder call
      existing_operation: { ...BASE_EXISTING, deal_id: "wrong" },
    };
    const res = planStellarExecution(input);
    // Returns intent mismatch, not build error
    expect(res).toStrictEqual({ ok: false, stage: "operation", error_code: "ERR_EXISTING_OPERATION_MISMATCH" });
  });

  it("28. input build object remains unchanged", () => {
    const input = { ...BASE_INPUT };
    const originalBuildInput = JSON.parse(JSON.stringify(input.build_input));
    planStellarExecution(input);
    expect(input.build_input).toStrictEqual(originalBuildInput);
  });

  it("29. existing operation remains unchanged", () => {
    const existing = { ...BASE_EXISTING };
    const existingCopy = JSON.parse(JSON.stringify(existing));
    const input = { ...BASE_INPUT, existing_operation: existing };
    planStellarExecution(input);
    expect(existing).toStrictEqual(existingCopy);
  });

  it("30. returned existing operation is a cloned object", () => {
    const existing = { ...BASE_EXISTING };
    const input = { ...BASE_INPUT, existing_operation: existing };
    const res = planStellarExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok && res.kind === "confirm_existing") {
      expect(res.operation).not.toBe(existing);
      expect(res.operation).toStrictEqual(existing);
    }
  });

  it("31. recursive forbidden-key scan across every successful plan", () => {
    const plans: StellarExecutionPlan[] = [];

    // new operation
    const r1 = planStellarExecution(BASE_INPUT);
    if (r1.ok) plans.push(r1);

    // existing submitted
    const r2 = planStellarExecution({ ...BASE_INPUT, existing_operation: BASE_EXISTING });
    if (r2.ok) plans.push(r2);

    // existing confirmed create
    const r3 = planStellarExecution({ ...BASE_INPUT, existing_operation: { ...BASE_EXISTING, operation_status: "confirmed", confirmed_at: TS2, result_escrow_id: "esc1" } });
    if (r3.ok) plans.push(r3);

    // existing confirmed transition
    const existingTransition: StellarOperation = {
      ...BASE_EXISTING,
      idempotency_key: createStellarIdempotencyKey("deal-1", "b1", "buyer_deposit"),
      requested_action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
      target_local_status: "BUYER_FUNDED",
      stellar_method: "deposit_buyer",
      operation_status: "confirmed",
      confirmed_at: TS2,
      result_escrow_id: null,
    };
    const inputTransition: StellarExecutionPlanningInput = {
      ...BASE_INPUT,
      build_input: {
        action: "buyer_deposit",
        idempotency_scope: "b1",
        expected_local_status: "WAITING_DEPOSITS",
        contract_id: "C123",
        escrow_id: "1",
        actor_address: "G123",
      },
      existing_operation: existingTransition,
    };
    const r4 = planStellarExecution(inputTransition);
    if (r4.ok) plans.push(r4);

    expect(plans.length).toBe(4);

    const serialized = JSON.stringify(plans);
    // Disallowed keys
    const prohibited = /"(secret|secret_seed|private_key|keypair|rpc|rpc_client|environment|sdk_transaction|database|repository|callback|adapter)":/;
    expect(prohibited.test(serialized)).toBe(false);
  });
});
