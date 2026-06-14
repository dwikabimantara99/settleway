import { describe, it, expect, beforeEach } from "vitest";
import { MockStore } from "../../db/mock-store";
import { MockStoreDealPersistence } from "./mock-store-deal-persistence";
import type { DbDeal } from "../../db/types";

describe("MockStoreDealPersistence", () => {
  let store: MockStore;
  let persistence: MockStoreDealPersistence;

  beforeEach(() => {
    store = new MockStore();
    persistence = new MockStoreDealPersistence(store);
  });

  function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
    return {
      id: "deal-1",
      listing_id: "listing-1",
      buyer_request_id: null,
      buyer_id: "b1",
      seller_id: "s1",
      commodity: "Coffee",
      volume_kg: 100,
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 890,
      status: "WAITING_DEPOSITS",
      stellar_mode: "mock_only",
      stellar_contract_id: null,
      stellar_escrow_id: null,
      latest_stellar_tx_hash: null,
      stellar_sync_status: "idle",
      proof_hash: null,
      terms: {},
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      ...overrides,
    };
  }

  it("successful synchronization update", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", current);
    const next = JSON.parse(JSON.stringify(current));
    next.stellar_sync_status = "pending";
    next.updated_at = "2023-01-01T01:00:00Z";

    const res = await persistence.replaceIfCurrent({ current, next });
    expect(res).toStrictEqual({ ok: true });
    expect(store.deals.get("deal-1")?.stellar_sync_status).toBe("pending");
  });

  it("successful lifecycle update", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", current);
    const next = JSON.parse(JSON.stringify(current));
    next.status = "BUYER_FUNDED";
    next.updated_at = "2023-01-01T01:00:00Z";

    const res = await persistence.replaceIfCurrent({ current, next });
    expect(res).toStrictEqual({ ok: true });
    expect(store.deals.get("deal-1")?.status).toBe("BUYER_FUNDED");
  });

  it("stale conflict", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" }));
    const next = makeDeal({ status: "SELLER_FUNDED", updated_at: "2023-01-01T02:00:00Z" });
    const res = await persistence.replaceIfCurrent({ current, next });
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("immutable-field conflict", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", current);
    const next = makeDeal({ principal_idr: 9999, updated_at: "2023-01-01T01:00:00Z" });
    const res = await persistence.replaceIfCurrent({ current, next });
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("missing deal", async () => {
    const current = makeDeal();
    const next = makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" });
    const res = await persistence.replaceIfCurrent({ current, next });
    expect(res).toStrictEqual({ ok: false, reason: "conflict" });
  });

  it("failed storage unchanged", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", current);
    const next = makeDeal({ status: "DELIVERED", updated_at: "2023-01-01T01:00:00Z" });
    await persistence.replaceIfCurrent({ current, next });
    expect(store.deals.get("deal-1")?.status).toBe("WAITING_DEPOSITS");
  });

  it("input immutability", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", current);
    const next = makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" });
    const copy1 = JSON.parse(JSON.stringify(current));
    const copy2 = JSON.parse(JSON.stringify(next));
    await persistence.replaceIfCurrent({ current, next });
    expect(current).toEqual(copy1);
    expect(next).toEqual(copy2);
  });

  it("defensive copies", async () => {
    const current = makeDeal();
    store.deals.set("deal-1", current);
    const next = JSON.parse(JSON.stringify(current));
    next.status = "BUYER_FUNDED";
    next.updated_at = "2023-01-01T01:00:00Z";

    await persistence.replaceIfCurrent({ current, next });
    next.status = "COMPLETED";
    expect(store.deals.get("deal-1")?.status).toBe("BUYER_FUNDED");
  });
});
