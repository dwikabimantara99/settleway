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
import { POST as expireRoute } from "./route";

describe("expire route", () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockImplementation(async ({ invocation }: { invocation: { action: string } }) => ({
      outcome: "submitted",
      action: invocation.action,
      transaction_hash: "f".repeat(64),
    }));
    mockExecutionAdapter.confirm.mockImplementation(async ({ action }: { action: string }) => ({
      outcome: "confirmed",
      action,
      transaction_hash: "f".repeat(64),
      result_escrow_id: null,
    }));
  });

  function setupDeal(dealId: string, overrides: Record<string, unknown> = {}) {
    mockStore.profiles.set("buyer-1", {
      id: "buyer-1",
      display_name: "Buyer One",
      role_label: "Buyer",
      location: "Surabaya",
      user_type: "buyer",
      seller_score: 0,
      buyer_score: 75,
      seller_completed_count: 0,
      buyer_completed_count: 4,
      verified_volume_idr: 5000000,
      proof_visibility: "public",
      payout_rail_preference: "wallet",
      payout_wallet_label: "Buyer treasury wallet",
      payout_wallet_address: "GBUYERPAYOUT1234567890",
      connected_wallet_address: null,
      connected_wallet_network: null,
      connected_wallet_provider: null,
      connected_wallet_linked_at: null,
      payout_bank_name: "Bank settlement rail",
      payout_bank_account_masked: "Not live in MVP",
      created_at: new Date().toISOString(),
    });
    mockStore.profiles.set("seller-1", {
      id: "seller-1",
      display_name: "Seller One",
      role_label: "Seller",
      location: "Probolinggo",
      user_type: "seller",
      seller_score: 81,
      buyer_score: 0,
      seller_completed_count: 3,
      buyer_completed_count: 0,
      verified_volume_idr: 8000000,
      proof_visibility: "public",
      payout_rail_preference: "wallet",
      payout_wallet_label: "Seller treasury wallet",
      payout_wallet_address: "GSELLERPAYOUT1234567890",
      connected_wallet_address: null,
      connected_wallet_network: null,
      connected_wallet_provider: null,
      connected_wallet_linked_at: null,
      payout_bank_name: "Bank settlement rail",
      payout_bank_account_masked: "Not live in MVP",
      created_at: new Date().toISOString(),
    });

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
      status: "BUYER_FUNDED",
      stellar_mode: "testnet",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "d".repeat(64),
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

  it("records testnet-backed expiry with refund truth and seller penalty anchoring", async () => {
    setupDeal("deal-expire-testnet");
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    const response = await expireRoute(
      new Request("http://localhost/api/deals/deal-expire-testnet/expire", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-expire-testnet" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStore.deals.get("deal-expire-testnet")?.status).toBe("REFUNDED");
    expect(mockStore.deals.get("deal-expire-testnet")?.latest_stellar_tx_hash).toBe("f".repeat(64));

    const roomEvents = mockStore.getDealEvents("deal-expire-testnet");
    expect(roomEvents.at(-1)?.event_type).toBe("expire");
    expect(roomEvents.at(-1)?.tx_hash).toBe("f".repeat(64));
    expect(roomEvents.at(-1)?.metadata.refund_to_party).toBe("buyer");
    expect(roomEvents.at(-1)?.metadata.penalized_party).toBe("seller");
    expect(roomEvents.at(-1)?.metadata.actor_address).toBe(
      "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
    );

    const reputationEvents = mockStore.getDealReputationEvents("deal-expire-testnet");
    expect(reputationEvents).toHaveLength(2);
    expect(reputationEvents.some((event) => event.reputation_outcome === "seller_failed_deposit")).toBe(true);
    expect(
      reputationEvents.find((event) => event.reputation_outcome === "seller_failed_deposit")?.transaction_hash,
    ).toBe("f".repeat(64));
  });
});
