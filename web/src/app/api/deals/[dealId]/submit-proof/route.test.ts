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
import { POST as submitProofRoute } from "./route";

describe("submit-proof route", () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockResolvedValue({
      outcome: "submitted",
      action: "submit_proof",
      transaction_hash: "c".repeat(64),
    });
    mockExecutionAdapter.confirm.mockResolvedValue({
      outcome: "confirmed",
      action: "submit_proof",
      transaction_hash: "c".repeat(64),
      result_escrow_id: null,
    });
  });

  function setupDeal(dealId: string, overrides: Record<string, unknown> = {}) {
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
      status: "LOCKED",
      stellar_mode: "testnet",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "b".repeat(64),
      stellar_sync_status: "idle",
      proof_hash: null,
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      listing_id: null,
      buyer_request_id: null,
      volume_kg: 700,
      ...overrides,
    } as any);
  }

  it("records proof through the testnet-backed route path", async () => {
    const proofHash = "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f";
    setupDeal("deal-proof-testnet");
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await submitProofRoute(
      new Request("http://localhost/api/deals/deal-proof-testnet/submit-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proof_hash: proofHash,
        }),
      }),
      { params: Promise.resolve({ dealId: "deal-proof-testnet" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStore.deals.get("deal-proof-testnet")?.status).toBe("PROOF_SUBMITTED");
    expect(mockStore.deals.get("deal-proof-testnet")?.proof_hash).toBe(proofHash);
    expect(mockStore.deals.get("deal-proof-testnet")?.latest_stellar_tx_hash).toBe("c".repeat(64));

    const events = mockStore.getDealEvents("deal-proof-testnet");
    expect(events.at(-1)?.event_type).toBe("submit_proof");
    expect(events.at(-1)?.tx_hash).toBe("c".repeat(64));
    expect(events.at(-1)?.proof_hash).toBe(proofHash);
  });
});
