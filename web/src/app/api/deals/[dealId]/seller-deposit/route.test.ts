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

vi.mock("@/lib/stellar/server/anchor-demo-event", () => ({
  anchorDemoEvent: vi.fn().mockResolvedValue({
    proof_hash: 'mocked-proof-hash',
    tx_hash: 'mocked-tx-hash',
    stellar_network: 'testnet',
  }),
}));

const mockServiceClient = {
  from: vi.fn(),
};

vi.mock("@/lib/db/server-service-client", () => ({
  getServiceRoleClient: vi.fn(() => mockServiceClient),
}));

vi.mock("@/lib/stellar/server/deal-room-testnet-runtime", () => ({
  resolveDealRoomDefaultStellarState: vi.fn(() => ({
    stellar_mode: "mock_only",
    stellar_contract_id: null,
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
import { checkTestnetBalance } from "@/lib/stellar/server/deal-room-testnet-runtime";
import { anchorDemoEvent } from "@/lib/stellar/server/anchor-demo-event";
import { POST as sellerDepositRoute } from "./route";

const globalFetch = global.fetch;

describe("seller-deposit route", () => {

  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockImplementation(async ({ invocation }: { invocation: { action: string } }) => ({
      outcome: "submitted",
      action: invocation.action,
      transaction_hash:
        invocation.action === "create_deal"
          ? "c".repeat(64)
          : "d".repeat(64),
    }));
    mockExecutionAdapter.confirm.mockImplementation(async ({ action }: { action: string }) => ({
      outcome: "confirmed",
      action,
      transaction_hash: action === "create_deal" ? "c".repeat(64) : "d".repeat(64),
      result_escrow_id: action === "create_deal" ? "123" : null,
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        balances: [{ asset_type: 'native', balance: '10000.0000000' }]
      })
    }) as any;
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  function setupDeal(dealId: string, overrides: Record<string, unknown> = {}) {
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
      status: "WAITING_DEPOSITS",
      stellar_mode: "testnet",
      stellar_contract_id: null,
      stellar_escrow_id: null,
      latest_stellar_tx_hash: null,
      stellar_sync_status: "idle",
      proof_hash: null,
      terms: {
        deposit_deadline_at: "2026-06-18T09:18:00.000Z",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      listing_id: null,
      buyer_request_id: null,
      volume_kg: 700,
      ...overrides,
    } as any);
  }

  it("bootstraps the escrow and confirms seller funding on testnet-backed rooms", async () => {
    setupDeal("deal-seller-testnet");
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-testnet/seller-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-seller-testnet" }) },
    );

    expect(response.status).toBe(200);

    const updatedDeal = mockStore.deals.get("deal-seller-testnet");
    expect(updatedDeal?.status).toBe("SELLER_FUNDED");
    expect(updatedDeal?.stellar_contract_id).toBe("CCONTRACT123");
    expect(updatedDeal?.stellar_escrow_id).toBe("123");
    expect(updatedDeal?.latest_stellar_tx_hash).toBe("d".repeat(64));

    const events = mockStore.getDealEvents("deal-seller-testnet");
    expect(events.at(-1)?.event_type).toBe("seller_deposit");
    expect(events.at(-1)?.tx_hash).toBe("d".repeat(64));
  });

  it("records the lock event when seller funding is the second confirmed deposit", async () => {
    setupDeal("deal-seller-lock", {
      status: "BUYER_FUNDED",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "a".repeat(64),
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-lock/seller-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-seller-lock" }) },
    );

    expect(response.status).toBe(200);

    const updatedDeal = mockStore.deals.get("deal-seller-lock");
    expect(updatedDeal?.status).toBe("LOCKED");
    expect(updatedDeal?.latest_stellar_tx_hash).toBe("d".repeat(64));

    const events = mockStore.getDealEvents("deal-seller-lock");
    expect(events.map((event) => event.event_type)).toContain("escrow_locked");
    expect(events.at(-1)?.tx_hash).toBe("d".repeat(64));
  });

  it("reconciles delayed seller confirmation within the same request", async () => {
    vi.useFakeTimers();
    setupDeal("deal-seller-reconcile", {
      status: "BUYER_FUNDED",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "a".repeat(64),
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    mockExecutionAdapter.confirm
      .mockResolvedValueOnce({
        outcome: "unknown",
        action: "seller_deposit",
        transaction_hash: "f".repeat(64),
        error_code: "ERR_UNKNOWN",
        reconciliation_required: true,
        resubmission_allowed: false,
      })
      .mockResolvedValueOnce({
        outcome: "confirmed",
        action: "seller_deposit",
        transaction_hash: "f".repeat(64),
        result_escrow_id: null,
      });
    mockExecutionAdapter.submit.mockResolvedValueOnce({
      outcome: "submitted",
      action: "seller_deposit",
      transaction_hash: "f".repeat(64),
    });

    const responsePromise = sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-reconcile/seller-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-seller-reconcile" }) },
    );

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(mockExecutionAdapter.submit).toHaveBeenCalledTimes(1);
    expect(mockExecutionAdapter.confirm).toHaveBeenCalledTimes(2);
    expect(mockStore.deals.get("deal-seller-reconcile")?.status).toBe("LOCKED");
    expect(mockStore.deals.get("deal-seller-reconcile")?.latest_stellar_tx_hash).toBe("f".repeat(64));
  });

  it("falls back to the legacy local path for mock-only rooms", async () => {
    setupDeal("deal-seller-mock", { stellar_mode: "mock_only" });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-mock/seller-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-seller-mock" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStore.deals.get("deal-seller-mock")?.status).toBe("SELLER_FUNDED");
    expect(mockStore.deals.get("deal-seller-mock")?.stellar_escrow_id).toBeNull();
  });

  it("blocks submission if testnet balance is insufficient", async () => {
        
        vi.mocked(checkTestnetBalance).mockResolvedValueOnce({ status: 'insufficient' });
    setupDeal("deal-seller-low-balance");
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-1" }) } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ balances: [{ asset_type: 'native', balance: '10.0000000' }] })
    }) as any;

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-low-balance/seller-deposit", { method: "POST" }),
      { params: Promise.resolve({ dealId: "deal-seller-low-balance" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INSUFFICIENT_PROFILE_WALLET_BALANCE");
    expect(mockExecutionAdapter.submit).not.toHaveBeenCalled();
  });

  it("blocks submission if testnet balance is unavailable (500)", async () => {
        
        vi.mocked(checkTestnetBalance).mockResolvedValueOnce({ status: 'unavailable' });
    setupDeal("deal-seller-no-balance");
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-1" }) } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    }) as any;

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-no-balance/seller-deposit", { method: "POST" }),
      { params: Promise.resolve({ dealId: "deal-seller-no-balance" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("PROFILE_WALLET_BALANCE_UNAVAILABLE");
    expect(mockExecutionAdapter.submit).not.toHaveBeenCalled();
  });

  it("does not duplicate submission when idempotency scope is identical", async () => {
    setupDeal("deal-seller-idem", { stellar_contract_id: "CCONTRACT123", stellar_escrow_id: "123" });
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-1" }) } as any);

    // Run first time
    await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-idem/seller-deposit", { method: "POST" }),
      { params: Promise.resolve({ dealId: "deal-seller-idem" }) }
    );
    expect(mockExecutionAdapter.submit).toHaveBeenCalledTimes(1);

    // Simulate clicking deposit again while it's SELLER_FUNDED
    const response2 = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-idem/seller-deposit", { method: "POST" }),
      { params: Promise.resolve({ dealId: "deal-seller-idem" }) }
    );
    expect(response2.status).toBe(200);
    expect(mockExecutionAdapter.submit).toHaveBeenCalledTimes(1); // STILL 1
  });

  it("does not update deal status to funded if transaction remains submitted but unconfirmed", { timeout: 10000 }, async () => {
    setupDeal("deal-seller-unconfirmed", { stellar_contract_id: "CCONTRACT123", stellar_escrow_id: "123" });
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-1" }) } as any);

    mockExecutionAdapter.confirm.mockResolvedValue({
      outcome: "unknown",
      action: "seller_deposit",
      transaction_hash: "e".repeat(64),
      error_code: "ERR_UNKNOWN",
      reconciliation_required: true,
      resubmission_allowed: false,
    });
    mockExecutionAdapter.submit.mockResolvedValue({
      outcome: "submitted",
      action: "seller_deposit",
      transaction_hash: "e".repeat(64),
    });

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/deal-seller-unconfirmed/seller-deposit", { method: "POST" }),
      { params: Promise.resolve({ dealId: "deal-seller-unconfirmed" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe("STELLAR_EXECUTION_UNCONFIRMED");
    expect(mockStore.deals.get("deal-seller-unconfirmed")?.status).toBe("WAITING_DEPOSITS"); // Not funded
  });

  describe("Demo Service Client Branch", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let mockSupabaseBuilder: any;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = { ...originalEnv, NEXT_PUBLIC_RUNTIME_MODE: 'persistent', STELLAR_PLATFORM_SECRET: 'secret' };
      
      mockSupabaseBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'demo-cabai-001',
            buyer_id: 'buyer-surabaya-restaurant',
            seller_id: 'seller-probolinggo-cabai',
            stellar_mode: 'mock_only',
            status: 'BUYER_FUNDED',
            seller_total_idr: 1000,
          },
          error: null
        }),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockServiceClient.from.mockReturnValue(mockSupabaseBuilder);
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("calls Stellar anchor wrapper for demo deal via service client", async () => {
      vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-probolinggo-cabai" }) } as any);
      const response = await sellerDepositRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/seller-deposit", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(anchorDemoEvent).toHaveBeenCalledWith(expect.objectContaining({
        deal_id: "demo-cabai-001",
        event_type: "SELLER_DEPOSIT_INTENT_RECORDED",
        actor_id: "seller-probolinggo-cabai",
      }));
      expect(mockServiceClient.from).toHaveBeenCalledWith('deals');
      expect(payload.data.latest_stellar_tx_hash).toBe("mocked-tx-hash");
    });

    it("returns idempotent success if already SELLER_FUNDED", async () => {
      mockSupabaseBuilder.single.mockResolvedValueOnce({
        data: {
          id: 'demo-cabai-001',
          buyer_id: 'buyer-surabaya-restaurant',
          seller_id: 'seller-probolinggo-cabai',
          stellar_mode: 'mock_only',
          status: 'SELLER_FUNDED',
          latest_stellar_tx_hash: 'existing-tx-hash',
          proof_hash: 'existing-proof-hash',
        },
        error: null
      });

      vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-probolinggo-cabai" }) } as any);

      const response = await sellerDepositRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/seller-deposit", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(anchorDemoEvent).not.toHaveBeenCalled();
      expect(payload.data.latest_stellar_tx_hash).toBe("existing-tx-hash");
      expect(mockSupabaseBuilder.update).not.toHaveBeenCalled();
    });

    it("rejects if wrong actor tries to trigger demo branch", async () => {
      vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "wrong-actor" }) } as any);

      const response = await sellerDepositRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/seller-deposit", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(mockServiceClient.from).not.toHaveBeenCalled();
    });

    it("fails clearly if STELLAR_PLATFORM_SECRET is missing", async () => {
      delete process.env.STELLAR_PLATFORM_SECRET;
      vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-probolinggo-cabai" }) } as any);

      const response = await sellerDepositRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/seller-deposit", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.error.code).toBe("SERVER_CONFIG_ERROR");
    });
  });

  it("does not call Stellar anchor wrapper for normal mock_only deal", async () => {
    setupDeal("normal-mock-deal", {
      stellar_mode: "mock_only",
      status: "BUYER_FUNDED",
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: "seller-1" }) } as any);

    const response = await sellerDepositRoute(
      new Request("http://localhost/api/deals/normal-mock-deal/seller-deposit", { method: "POST" }),
      { params: Promise.resolve({ dealId: "normal-mock-deal" }) }
    );

    expect(response.status).toBe(200);
    expect(anchorDemoEvent).not.toHaveBeenCalled();
  });

});
