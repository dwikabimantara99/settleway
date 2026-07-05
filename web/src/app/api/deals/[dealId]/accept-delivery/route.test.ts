/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as nextHeaders from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockExecutionAdapter = {
  submit: vi.fn(),
  confirm: vi.fn(),
};

vi.mock("@/lib/stellar/server/deal-room-testnet-runtime", () => ({
  resolveDealRoomDefaultStellarState: vi.fn(() => ({
    stellar_mode: "testnet",
    stellar_contract_id: "CCONTRACT123",
  })),
  checkTestnetBalance: vi.fn().mockResolvedValue({ status: "ok" }),
  loadDealRoomTestnetRuntime: vi.fn(() => ({
    ok: true,
    runtime: {
      contract_id: "CCONTRACT123",
      metadata: {
        contract_id: "CCONTRACT123",
        admin_address: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
        buyer_demo_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
        seller_demo_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
      },
      execution_adapter: mockExecutionAdapter,
    },
  })),
}));

import { mockStore } from "@/lib/db/mock-store";
import { POST as acceptDeliveryRoute } from "./route";

const globalFetch = global.fetch;

describe("accept-delivery route", () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockImplementation(async ({ invocation }: { invocation: { action: string } }) => ({
      outcome: "submitted",
      action: invocation.action,
      transaction_hash: "c".repeat(64),
    }));
    mockExecutionAdapter.confirm.mockImplementation(async ({ action }: { action: string }) => ({
      outcome: "confirmed",
      action,
      transaction_hash: "c".repeat(64),
      result_escrow_id: null,
    }));
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  function setupDeal(dealId: string, overrides: Record<string, any> = {}) {
    if (!mockStore.getProfileWallet("buyer-1")) {
      mockStore.provisionProfileWallet({
        user_id: "buyer-1",
        public_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
        encrypted_secret_key: "ENC_BUYER",
        created_at: new Date().toISOString(),
      });
    }
    if (!mockStore.getProfileWallet("seller-1")) {
      mockStore.provisionProfileWallet({
        user_id: "seller-1",
        public_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
        encrypted_secret_key: "ENC_SELLER",
        created_at: new Date().toISOString(),
      });
    }
    mockStore.deals.set(dealId, {
      id: dealId,
      buyer_id: "buyer-1",
      seller_id: "seller-1",
      commodity: "Red Chili",
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 110,
      volume_kg: 100,
      status: "DELIVERED",
      stellar_mode: "testnet",
      stellar_sync_status: "ok",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "b".repeat(64),
      proof_hash: "p".repeat(64),
      terms: { deposit_deadline_at: new Date(Date.now() + 86400000).toISOString() },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    });
  }

  function mockAuth(userId: string | null) {
    (nextHeaders.cookies as any).mockReturnValue({
      get: (name: string) => (name === "mock_actor" && userId ? { value: userId } : undefined),
    });
  }

  it("rejects unauthenticated user", async () => {
    mockAuth(null);
    const req = new Request("http://localhost");
    const res = await acceptDeliveryRoute(req, { params: Promise.resolve({ dealId: "deal-1" }) });
    expect(res.status).toBe(401);
  });

  it("rejects seller for buyer acceptance", async () => {
    mockAuth("seller-1");
    setupDeal("deal-1");
    const req = new Request("http://localhost");
    const res = await acceptDeliveryRoute(req, { params: Promise.resolve({ dealId: "deal-1" }) });
    expect(res.status).toBe(403);
  });

  it("fails if deal is not in DELIVERED state", async () => {
    mockAuth("buyer-1");
    setupDeal("deal-1", { status: "WAITING_DEPOSITS" });
    const req = new Request("http://localhost");
    const res = await acceptDeliveryRoute(req, { params: Promise.resolve({ dealId: "deal-1" }) });
    expect(res.status).toBe(400); 
    const data = await res.json();
    expect(data.error.code).toBe("STELLAR_EXECUTION_INVALID");
  });

  it("executes settlement successfully on Testnet", async () => {
    mockAuth("buyer-1");
    setupDeal("deal-1");
    const req = new Request("http://localhost");
    const res = await acceptDeliveryRoute(req, { params: Promise.resolve({ dealId: "deal-1" }) });
    expect(res.status).toBe(200);

    const deal = mockStore.deals.get("deal-1")!;
    expect(deal.status).toBe("COMPLETED");

    const events = mockStore.getDealEvents("deal-1");
    const acceptEvent = events.find((e) => e.event_type === "accept_delivery");
    expect(acceptEvent).toBeDefined();
    expect(acceptEvent?.tx_hash).toBe("c".repeat(64));
    expect(acceptEvent?.metadata.contract_id).toBe("CCONTRACT123");
    
    // Check reputation outcome
    const repEvents = Array.from(mockStore.reputationEvents.values()).filter(e => e.deal_id === "deal-1");
    expect(repEvents.length).toBe(2);
    expect(repEvents.find(e => e.participant_id === "buyer-1")?.reputation_outcome).toBe("transaction_completed");
  });

  it("is idempotent for same user", async () => {
    mockAuth("buyer-1");
    setupDeal("deal-1");
    
    // First run
    const req1 = new Request("http://localhost");
    const res1 = await acceptDeliveryRoute(req1, { params: Promise.resolve({ dealId: "deal-1" }) });
    expect(res1.status).toBe(200);
    
    // Reset mock adapter to ensure it doesn't get called again
    vi.clearAllMocks();

    // Second run
    const req2 = new Request("http://localhost");
    const res2 = await acceptDeliveryRoute(req2, { params: Promise.resolve({ dealId: "deal-1" }) });
    expect(res2.status).toBe(200);
    
    expect(mockExecutionAdapter.submit).not.toHaveBeenCalled();
  });
});
