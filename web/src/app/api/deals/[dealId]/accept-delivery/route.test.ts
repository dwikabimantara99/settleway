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

vi.mock("@/lib/stellar/testnet-settlement", () => ({
  executeSuccessSettlement: vi.fn(),
}));

vi.mock("@/lib/stellar/testnet-external-payout", () => ({
  executeExternalWalletPayouts: vi.fn(),
}));

import { mockStore } from "@/lib/db/mock-store";
import { executeExternalWalletPayouts } from "@/lib/stellar/testnet-external-payout";
import { executeSuccessSettlement } from "@/lib/stellar/testnet-settlement";
import { POST as acceptDeliveryRoute } from "./route";

describe("accept-delivery route", () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockImplementation(async ({ invocation }: { invocation: { action: string } }) => ({
      outcome: "submitted",
      action: invocation.action,
      transaction_hash: "e".repeat(64),
    }));
    mockExecutionAdapter.confirm.mockImplementation(async ({ action }: { action: string }) => ({
      outcome: "confirmed",
      action,
      transaction_hash: "e".repeat(64),
      result_escrow_id: null,
    }));
    vi.mocked(executeSuccessSettlement).mockResolvedValue({
      transactionHash: "a".repeat(64),
      custodyAddress: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
      buyerManagedAddress: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
      sellerManagedAddress: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
      assetCode: "XLM",
      buyerBondReturnXlm: "0.0000010",
      sellerPayoutXlm: "0.0000110",
      platformFeeRetainedXlm: "0.0000002",
    });
    vi.mocked(executeExternalWalletPayouts).mockResolvedValue({
      transactionHash: "b".repeat(64),
      custodyAddress: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
      buyerManagedAddress: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
      sellerManagedAddress: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
      buyerConnectedAddress: "GBUYERCONNECTED0000000000000000000000000000000000000000000000",
      sellerConnectedAddress: "GSELLERCONNECTED000000000000000000000000000000000000000000000",
      buyerBondReturnXlm: "0.0000010",
      sellerPayoutXlm: "0.0000110",
      assetCode: "XLM",
    });
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
      connected_wallet_address: "GBUYERCONNECTED0000000000000000000000000000000000000000000000",
      connected_wallet_network: "testnet",
      connected_wallet_provider: "Freighter",
      connected_wallet_linked_at: new Date().toISOString(),
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
      connected_wallet_address: "GSELLERCONNECTED000000000000000000000000000000000000000000000",
      connected_wallet_network: "testnet",
      connected_wallet_provider: "Freighter",
      connected_wallet_linked_at: new Date().toISOString(),
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
      status: "DELIVERED",
      stellar_mode: "testnet",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "d".repeat(64),
      stellar_sync_status: "idle",
      proof_hash: "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f",
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      listing_id: null,
      buyer_request_id: null,
      volume_kg: 700,
      ...overrides,
    } as any);
  }

  it("records buyer acceptance through the testnet-backed route path and anchors reputation", async () => {
    setupDeal("deal-accept-testnet");
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    const response = await acceptDeliveryRoute(
      new Request("http://localhost/api/deals/deal-accept-testnet/accept-delivery", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-accept-testnet" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStore.deals.get("deal-accept-testnet")?.status).toBe("COMPLETED");
    expect(mockStore.deals.get("deal-accept-testnet")?.latest_stellar_tx_hash).toBe("e".repeat(64));

    const roomEvents = mockStore.getDealEvents("deal-accept-testnet");
    expect(roomEvents.at(-1)?.event_type).toBe("accept_delivery");
    expect(roomEvents.at(-1)?.tx_hash).toBe("e".repeat(64));
    expect(roomEvents.at(-1)?.metadata.settlement_reference).toBe("e".repeat(64));
    expect(roomEvents.at(-1)?.metadata.buyer_payout_destination).toMatchObject({
      rail_preference: "wallet",
      wallet_label: "Buyer treasury wallet",
      wallet_address: "GBUYERPAYOUT1234567890",
    });
    expect(roomEvents.at(-1)?.metadata.seller_payout_destination).toMatchObject({
      rail_preference: "wallet",
      wallet_label: "Seller treasury wallet",
      wallet_address: "GSELLERPAYOUT1234567890",
    });
    expect(roomEvents.at(-1)?.metadata.platform_payout_destination).toMatchObject({
      rail_preference: "wallet",
      wallet_label: "Settleway fee wallet",
    });

    const reputationEvents = mockStore.getDealReputationEvents("deal-accept-testnet");
    expect(reputationEvents.length).toBe(2);
    expect(reputationEvents[0]?.reputation_outcome).toBe("transaction_completed");
    expect(reputationEvents[1]?.reputation_outcome).toBe("transaction_completed");
    expect(reputationEvents[0]?.transaction_hash).toBe("e".repeat(64));
  });

  it("reconciles delayed buyer acceptance confirmation within the same request", async () => {
    vi.useFakeTimers();
    setupDeal("deal-accept-reconcile");
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    mockExecutionAdapter.confirm
      .mockResolvedValueOnce({
        outcome: "unknown",
        action: "accept_delivery",
        transaction_hash: "f".repeat(64),
        error_code: "ERR_UNKNOWN",
        reconciliation_required: true,
        resubmission_allowed: false,
      })
      .mockResolvedValueOnce({
        outcome: "confirmed",
        action: "accept_delivery",
        transaction_hash: "f".repeat(64),
        result_escrow_id: null,
      });
    mockExecutionAdapter.submit.mockResolvedValueOnce({
      outcome: "submitted",
      action: "accept_delivery",
      transaction_hash: "f".repeat(64),
    });

    const responsePromise = acceptDeliveryRoute(
      new Request("http://localhost/api/deals/deal-accept-reconcile/accept-delivery", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-accept-reconcile" }) },
    );

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(mockExecutionAdapter.submit).toHaveBeenCalledTimes(1);
    expect(mockExecutionAdapter.confirm).toHaveBeenCalledTimes(2);
    expect(mockStore.deals.get("deal-accept-reconcile")?.status).toBe("COMPLETED");
    expect(mockStore.deals.get("deal-accept-reconcile")?.latest_stellar_tx_hash).toBe("f".repeat(64));
  });

  it("executes success settlement for a custody-delivered testnet room without a Soroban escrow id", async () => {
    setupDeal("deal-accept-custody", {
      stellar_escrow_id: null,
      latest_stellar_tx_hash: "d".repeat(64),
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "buyer-1" }),
    } as any);

    const response = await acceptDeliveryRoute(
      new Request("http://localhost/api/deals/deal-accept-custody/accept-delivery", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-accept-custody" }) },
    );

    expect(response.status).toBe(200);
    expect(executeSuccessSettlement).toHaveBeenCalledOnce();
    expect(executeExternalWalletPayouts).toHaveBeenCalledOnce();
    expect(mockStore.deals.get("deal-accept-custody")?.status).toBe("COMPLETED");
    expect(mockStore.deals.get("deal-accept-custody")?.latest_stellar_tx_hash).toBe("a".repeat(64));

    const roomEvents = mockStore.getDealEvents("deal-accept-custody");
    expect(roomEvents.at(-1)?.event_type).toBe("accept_delivery");
    expect(roomEvents.at(-1)?.tx_hash).toBe("a".repeat(64));
    expect(roomEvents.at(-1)?.metadata).toMatchObject({
      settlement_route: "settleway_custody_to_managed_profile_wallets",
      buyer_managed_wallet_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
      seller_managed_wallet_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
      external_payout_transaction_hash: "b".repeat(64),
      buyer_connected_wallet_address: "GBUYERCONNECTED0000000000000000000000000000000000000000000000",
      seller_connected_wallet_address: "GSELLERCONNECTED000000000000000000000000000000000000000000000",
      delivery_transaction_hash: "d".repeat(64),
    });

    const reputationEvents = mockStore.getDealReputationEvents("deal-accept-custody");
    expect(reputationEvents).toHaveLength(2);
    expect(reputationEvents[0]?.transaction_hash).toBe("a".repeat(64));
    expect(reputationEvents[1]?.transaction_hash).toBe("a".repeat(64));
  });
});
