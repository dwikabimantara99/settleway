import { describe, it, expect, beforeEach } from "vitest";
import { MockStore } from "@/lib/db/mock-store";
import { MockStoreStellarOperationPersistence } from "./mock-store-execution-persistence";
import type { StellarOperation } from "@/lib/stellar/types";

function makeOp(overrides: Partial<StellarOperation> = {}): StellarOperation {
  return {
    idempotency_key: "persist-key",
    deal_id: "persist-deal",
    requested_action: "create_deal",
    expected_local_status: null,
    target_local_status: "WAITING_DEPOSITS",
    stellar_method: "create_escrow",
    operation_status: "pending",
    transaction_hash: null,
    result_escrow_id: null,
    public_error_code: null,
    submitted_at: null,
    confirmed_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("MockStoreStellarOperationPersistence", () => {
  let store: MockStore;
  let persistence: MockStoreStellarOperationPersistence;

  beforeEach(() => {
    store = new MockStore();
    persistence = new MockStoreStellarOperationPersistence(store);
  });

  it("pending creation succeeds", async () => {
    const op = makeOp();
    const res = await persistence.createPending(op);
    expect(res).toStrictEqual({ ok: true });
    expect(store.getStellarOperation("persist-key")?.operation_status).toBe("pending");
  });

  it("duplicate pending creation conflicts", async () => {
    const op = makeOp();
    await persistence.createPending(op);
    const res = await persistence.createPending(op);
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("non-pending creation is rejected", async () => {
    const op = makeOp({ operation_status: "submitted" });
    const res = await persistence.createPending(op);
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("pending → submitted replacement succeeds", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    const submitted = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      updated_at: "2024-01-01T01:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: pending, next: submitted });
    expect(res).toStrictEqual({ ok: true });
    expect(store.getStellarOperation("persist-key")?.operation_status).toBe("submitted");
  });

  it("pending → failed replacement succeeds", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    const failed = makeOp({
      operation_status: "failed",
      transaction_hash: null,
      public_error_code: "ERR_VALIDATION",
      updated_at: "2024-01-01T01:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: pending, next: failed });
    expect(res).toStrictEqual({ ok: true });
  });

  it("submitted → confirmed replacement succeeds", async () => {
    const submitted = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      updated_at: "2024-01-01T01:00:00Z",
    });
    store.createStellarOperation(submitted);
    const confirmed = makeOp({
      operation_status: "confirmed",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      confirmed_at: "2024-01-01T02:00:00Z",
      result_escrow_id: "esc1",
      updated_at: "2024-01-01T02:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: submitted, next: confirmed });
    expect(res).toStrictEqual({ ok: true });
  });

  it("submitted → failed replacement succeeds", async () => {
    const submitted = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      updated_at: "2024-01-01T01:00:00Z",
    });
    store.createStellarOperation(submitted);
    const failed = makeOp({
      operation_status: "failed",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_CONTRACT_REJECTED",
      updated_at: "2024-01-01T02:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: submitted, next: failed });
    expect(res).toStrictEqual({ ok: true });
  });

  it("submitted → unknown replacement succeeds", async () => {
    const submitted = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      updated_at: "2024-01-01T01:00:00Z",
    });
    store.createStellarOperation(submitted);
    const unknown = makeOp({
      operation_status: "unknown",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_UNKNOWN",
      updated_at: "2024-01-01T02:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: submitted, next: unknown });
    expect(res).toStrictEqual({ ok: true });
  });

  it("unknown → confirmed replacement succeeds", async () => {
    const unknown = makeOp({
      operation_status: "unknown",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_UNKNOWN",
      updated_at: "2024-01-01T02:00:00Z",
    });
    store.createStellarOperation(unknown);
    const confirmed = makeOp({
      operation_status: "confirmed",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      confirmed_at: "2024-01-01T03:00:00Z",
      result_escrow_id: "esc1",
      updated_at: "2024-01-01T03:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: unknown, next: confirmed });
    expect(res).toStrictEqual({ ok: true });
  });

  it("unknown → failed replacement succeeds", async () => {
    const unknown = makeOp({
      operation_status: "unknown",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_UNKNOWN",
      updated_at: "2024-01-01T02:00:00Z",
    });
    store.createStellarOperation(unknown);
    const failed = makeOp({
      operation_status: "failed",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_CONTRACT_REJECTED",
      updated_at: "2024-01-01T03:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: unknown, next: failed });
    expect(res).toStrictEqual({ ok: true });
  });

  it("unknown → unknown replacement succeeds", async () => {
    const unknown = makeOp({
      operation_status: "unknown",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_UNKNOWN",
      updated_at: "2024-01-01T02:00:00Z",
    });
    store.createStellarOperation(unknown);
    const next = makeOp({
      operation_status: "unknown",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      public_error_code: "ERR_TIMEOUT",
      updated_at: "2024-01-01T03:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: unknown, next });
    expect(res).toStrictEqual({ ok: true });
  });

  it("stale current conflicts", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    const submitted = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      submitted_at: "2024-01-01T01:00:00Z",
      updated_at: "2024-01-01T01:00:00Z",
    });
    await persistence.replaceIfCurrent({ current: pending, next: submitted });
    const next2 = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx2",
      updated_at: "2024-01-01T02:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: pending, next: next2 });
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("immutable intent mismatch conflicts", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    const next = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      deal_id: "other-deal",
      updated_at: "2024-01-01T01:00:00Z",
    });
    const res = await persistence.replaceIfCurrent({ current: pending, next });
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("failed replacement leaves stored value unchanged", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    const next = makeOp({
      operation_status: "confirmed",
      transaction_hash: "tx1",
      updated_at: "2024-01-01T01:00:00Z",
    });
    await persistence.replaceIfCurrent({ current: pending, next });
    expect(store.getStellarOperation("persist-key")?.operation_status).toBe("pending");
  });

  it("supplied objects remain unchanged", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    const current = makeOp();
    const next = makeOp({
      operation_status: "submitted",
      transaction_hash: "tx1",
      updated_at: "2024-01-01T01:00:00Z",
    });
    const currentOriginal = JSON.parse(JSON.stringify(current));
    const nextOriginal = JSON.parse(JSON.stringify(next));
    await persistence.replaceIfCurrent({ current, next });
    expect(current).toStrictEqual(currentOriginal);
    expect(next).toStrictEqual(nextOriginal);
  });

  it("stored and returned values are defensive copies", async () => {
    const pending = makeOp();
    await persistence.createPending(pending);
    pending.operation_status = "submitted" as StellarOperation["operation_status"];
    expect(store.getStellarOperation("persist-key")?.operation_status).toBe("pending");
  });
});
