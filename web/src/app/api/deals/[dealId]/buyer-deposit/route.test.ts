/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    stellar_mode: "mock_only",
    stellar_contract_id: null,
  })),
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
import { POST as buyerDepositRoute } from "./route";

describe("buyer-deposit route", () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockImplementation(async ({ invocation }: { invocation: { action: string } }) => ({
      outcome: "submitted",
      action: invocation.action,
      transaction_hash:
        invocation.action === "create_deal"
          ? "a".repeat(64)
          : "b".repeat(64),
    }));
    mockExecutionAdapter.confirm.mockImplementation(async ({ action }: { action: string }) => ({
      outcome: "confirmed",
      action,
      transaction_hash: action === "create_deal" ? "a".repeat(64) : "b".repeat(64),
      result_escrow_id: action === "create_deal" ? "123" : null,
    }));
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

  it("bootstraps the escrow and confirms buyer funding on testnet-backed rooms", async () => {
    setupDeal("deal-buyer-testnet");
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    const response = await buyerDepositRoute(
      new Request("http://localhost/api/deals/deal-buyer-testnet/buyer-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-buyer-testnet" }) },
    );
    const afterRouteDeal = mockStore.deals.get("deal-buyer-testnet");

    expect(response.status).toBe(200);

    const updatedDeal = afterRouteDeal;
    expect(updatedDeal?.status).toBe("BUYER_FUNDED");
    expect(updatedDeal?.stellar_contract_id).toBe("CCONTRACT123");
    expect(updatedDeal?.stellar_escrow_id).toBe("123");
    expect(updatedDeal?.latest_stellar_tx_hash).toBe("b".repeat(64));

    const events = mockStore.getDealEvents("deal-buyer-testnet");
    expect(events.at(-1)?.event_type).toBe("buyer_deposit");
    expect(events.at(-1)?.tx_hash).toBe("b".repeat(64));
  });

  it("reconciles delayed buyer confirmation within the same request", async () => {
    vi.useFakeTimers();
    setupDeal("deal-buyer-reconcile", {
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    mockExecutionAdapter.confirm
      .mockResolvedValueOnce({
        outcome: "unknown",
        action: "buyer_deposit",
        transaction_hash: "e".repeat(64),
        error_code: "ERR_UNKNOWN",
        reconciliation_required: true,
        resubmission_allowed: false,
      })
      .mockResolvedValueOnce({
        outcome: "confirmed",
        action: "buyer_deposit",
        transaction_hash: "e".repeat(64),
        result_escrow_id: null,
      });
    mockExecutionAdapter.submit.mockResolvedValueOnce({
      outcome: "submitted",
      action: "buyer_deposit",
      transaction_hash: "e".repeat(64),
    });

    const responsePromise = buyerDepositRoute(
      new Request("http://localhost/api/deals/deal-buyer-reconcile/buyer-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-buyer-reconcile" }) },
    );

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(mockExecutionAdapter.submit).toHaveBeenCalledTimes(1);
    expect(mockExecutionAdapter.confirm).toHaveBeenCalledTimes(2);
    expect(mockStore.deals.get("deal-buyer-reconcile")?.status).toBe("BUYER_FUNDED");
    expect(mockStore.deals.get("deal-buyer-reconcile")?.latest_stellar_tx_hash).toBe("e".repeat(64));
  });

  it("falls back to the legacy local path for mock-only rooms", async () => {
    setupDeal("deal-buyer-mock", { stellar_mode: "mock_only" });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    const response = await buyerDepositRoute(
      new Request("http://localhost/api/deals/deal-buyer-mock/buyer-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-buyer-mock" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStore.deals.get("deal-buyer-mock")?.status).toBe("BUYER_FUNDED");
    expect(mockStore.deals.get("deal-buyer-mock")?.stellar_escrow_id).toBeNull();
  });

  it("rejects Custody V2 deals from the legacy buyer-deposit route", async () => {
    setupDeal("deal-buyer-v2", { rail_version: "custody_v2_testnet" });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    const response = await buyerDepositRoute(
      new Request("http://localhost/api/deals/deal-buyer-v2/buyer-deposit", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-buyer-v2" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("CUSTODY_V2_ACTION_REQUIRED");
    expect(mockStore.deals.get("deal-buyer-v2")?.status).toBe("WAITING_DEPOSITS");
    expect(mockExecutionAdapter.submit).not.toHaveBeenCalled();
  });
});
