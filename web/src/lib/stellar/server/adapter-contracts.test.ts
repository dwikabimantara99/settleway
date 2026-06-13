import { describe, it, expect } from "vitest";
import {
  isConfirmedStellarResult,
  isUnknownStellarResult,
  requiresStellarReconciliation,
} from "./adapter-contracts";
import type {
  StellarPreparedInvocation,
  StellarSubmittedResult,
  StellarPreSubmitFailure,
  StellarConfirmedCreateDealResult,
  StellarConfirmedEscrowActionResult,
  StellarConfirmedFailure,
  StellarUnknownResult,
  StellarExecutionAdapter,
  StellarAdapterSubmitRequest,
  StellarAdapterSubmitResult,
  StellarAdapterConfirmRequest,
  StellarAdapterConfirmationResult,
} from "./adapter-contracts";

describe("Adapter Contracts", () => {
  const preparedInvocation = {
    action: "create_deal",
    method: "create_escrow",
    signer_role: "admin",
    contract_id: "CABC123",
    arguments: [
      { kind: "u64", value: "100" },
    ],
  } satisfies StellarPreparedInvocation;

  const submittedResult = {
    outcome: "submitted",
    action: "create_deal",
    transaction_hash: "hash123",
  } satisfies StellarSubmittedResult;

  const preSubmitFailure = {
    outcome: "failed",
    action: "create_deal",
    stage: "simulate",
    transaction_hash: null,
    error_code: "ERR_CONTRACT_REJECTED",
    retryable: false,
  } satisfies StellarPreSubmitFailure;

  const confirmedCreateResult = {
    outcome: "confirmed",
    action: "create_deal",
    transaction_hash: "hash123",
    result_escrow_id: "999",
  } satisfies StellarConfirmedCreateDealResult;

  const confirmedEscrowResult = {
    outcome: "confirmed",
    action: "buyer_deposit",
    transaction_hash: "hash123",
    result_escrow_id: null,
  } satisfies StellarConfirmedEscrowActionResult;

  const confirmedFailure = {
    outcome: "failed",
    action: "create_deal",
    transaction_hash: "hash123",
    error_code: "ERR_CONTRACT_REJECTED",
    retryable: false,
  } satisfies StellarConfirmedFailure;

  const unknownResult = {
    outcome: "unknown",
    action: "create_deal",
    transaction_hash: "hash123",
    error_code: "ERR_TIMEOUT",
    reconciliation_required: true,
    resubmission_allowed: false,
  } satisfies StellarUnknownResult;

  const stubAdapter = {
    async submit(req: StellarAdapterSubmitRequest): Promise<StellarAdapterSubmitResult> {
      expect(req.operation_id).toBe("op1");
      return submittedResult;
    },
    async confirm(req: StellarAdapterConfirmRequest): Promise<StellarAdapterConfirmationResult> {
      expect(req.transaction_hash).toBe("hash123");
      return confirmedCreateResult;
    },
  } satisfies StellarExecutionAdapter;

  it("isConfirmedStellarResult correctly identifies confirmed success", () => {
    expect(isConfirmedStellarResult(confirmedCreateResult)).toBe(true);
    expect(isConfirmedStellarResult(confirmedEscrowResult)).toBe(true);

    expect(isConfirmedStellarResult(confirmedFailure)).toBe(false);
    expect(isConfirmedStellarResult(unknownResult)).toBe(false);
  });

  it("isUnknownStellarResult correctly identifies unknown results", () => {
    expect(isUnknownStellarResult(unknownResult)).toBe(true);

    expect(isUnknownStellarResult(confirmedCreateResult)).toBe(false);
    expect(isUnknownStellarResult(confirmedEscrowResult)).toBe(false);
    expect(isUnknownStellarResult(confirmedFailure)).toBe(false);
  });

  it("requiresStellarReconciliation correctly identifies unknown results", () => {
    expect(requiresStellarReconciliation(unknownResult)).toBe(true);

    expect(requiresStellarReconciliation(confirmedCreateResult)).toBe(false);
    expect(requiresStellarReconciliation(confirmedEscrowResult)).toBe(false);
    expect(requiresStellarReconciliation(confirmedFailure)).toBe(false);
  });

  it("asserts fixture invariants with deep-equal", () => {
    expect(preparedInvocation).toEqual({
      action: "create_deal",
      method: "create_escrow",
      signer_role: "admin",
      contract_id: "CABC123",
      arguments: [{ kind: "u64", value: "100" }],
    });

    expect(submittedResult).toEqual({
      outcome: "submitted",
      action: "create_deal",
      transaction_hash: "hash123",
    });

    expect(preSubmitFailure).toEqual({
      outcome: "failed",
      action: "create_deal",
      stage: "simulate",
      transaction_hash: null,
      error_code: "ERR_CONTRACT_REJECTED",
      retryable: false,
    });

    expect(confirmedCreateResult).toEqual({
      outcome: "confirmed",
      action: "create_deal",
      transaction_hash: "hash123",
      result_escrow_id: "999",
    });

    expect(confirmedEscrowResult).toEqual({
      outcome: "confirmed",
      action: "buyer_deposit",
      transaction_hash: "hash123",
      result_escrow_id: null,
    });

    expect(confirmedFailure).toEqual({
      outcome: "failed",
      action: "create_deal",
      transaction_hash: "hash123",
      error_code: "ERR_CONTRACT_REJECTED",
      retryable: false,
    });

    expect(unknownResult).toEqual({
      outcome: "unknown",
      action: "create_deal",
      transaction_hash: "hash123",
      error_code: "ERR_TIMEOUT",
      reconciliation_required: true,
      resubmission_allowed: false,
    });

    expect(unknownResult.reconciliation_required).toBe(true);
    expect(unknownResult.resubmission_allowed).toBe(false);

    expect(preSubmitFailure.transaction_hash).toBeNull();

    expect(typeof submittedResult.transaction_hash).toBe("string");
    expect(typeof confirmedCreateResult.transaction_hash).toBe("string");
    expect(typeof confirmedEscrowResult.transaction_hash).toBe("string");
    expect(typeof confirmedFailure.transaction_hash).toBe("string");
    expect(typeof unknownResult.transaction_hash).toBe("string");

    expect(typeof confirmedCreateResult.result_escrow_id).toBe("string");
    expect(confirmedEscrowResult.result_escrow_id).toBeNull();

    expect(preparedInvocation.arguments[0].kind).toBe("u64");
    expect(typeof preparedInvocation.arguments[0].value).toBe("string");

    expect("secret_seed" in preparedInvocation).toBe(false);
    expect("private_key" in preparedInvocation).toBe(false);
    expect("keypair" in preparedInvocation).toBe(false);
    expect("environment" in preparedInvocation).toBe(false);
    expect("rpc_client" in preparedInvocation).toBe(false);
    expect("sdk_transaction" in preparedInvocation).toBe(false);
  });

  it("stubAdapter works and returns exact deep-equal fixed results", async () => {
    const submitReq: StellarAdapterSubmitRequest = {
      operation_id: "op1",
      idempotency_key: "idem1",
      invocation: preparedInvocation,
    };
    const confirmReq: StellarAdapterConfirmRequest = {
      action: "create_deal",
      transaction_hash: "hash123",
    };

    const submitRes = await stubAdapter.submit(submitReq);
    expect(submitRes).toEqual(submittedResult);

    const confirmRes = await stubAdapter.confirm(confirmReq);
    expect(confirmRes).toEqual(confirmedCreateResult);
  });
});
