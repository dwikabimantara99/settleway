/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as nextHeaders from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockServiceClient = {
  from: vi.fn(),
};

vi.mock("@/lib/db/server-service-client", () => ({
  getServiceRoleClient: vi.fn(() => mockServiceClient),
}));

vi.mock("@/lib/stellar/server/anchor-demo-event", () => ({
  anchorDemoEvent: vi.fn(),
}));

const mockExecutionAdapter = {
  submit: vi.fn(),
  confirm: vi.fn(),
};

const mockLoadDealRoomTestnetRuntime = vi.fn();

vi.mock("@/lib/stellar/server/deal-room-testnet-runtime", () => ({
  resolveDealRoomDefaultStellarState: vi.fn(() => ({
    stellar_mode: "mock_only",
    stellar_contract_id: null,
  })),
  loadDealRoomTestnetRuntime: (...args: any[]) => mockLoadDealRoomTestnetRuntime(...args),
}));

vi.mock("@/lib/stellar/server/profile-wallet-signer", () => ({
  ProfileWalletSigner: class ProfileWalletSigner {
    constructor(public encryptedSecret: string, public fallbackAddress?: string) {}
  },
}));

vi.mock("@/lib/stellar/testnet-proof", () => ({
  executeCustodyDeliveryReference: vi.fn(),
}));

vi.mock("@/lib/stellar/server/wallet-repository", () => ({
  getServerWalletRepository: vi.fn(() => ({
    getProfileWallet: vi.fn(async (userId: string) => {
      const { mockStore } = await import("@/lib/db/mock-store");
      return mockStore.userWallets.get(userId) || null;
    })
  }))
}));

import { mockStore } from "@/lib/db/mock-store";
import { executeCustodyDeliveryReference } from "@/lib/stellar/testnet-proof";
import { anchorDemoEvent } from "@/lib/stellar/server/anchor-demo-event";
import { POST as markDeliveredRoute } from "./route";

describe("mark-delivered route (signer injection)", () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    vi.useRealTimers();
    mockExecutionAdapter.submit.mockResolvedValue({
      outcome: "submitted",
      action: "mark_delivered",
      transaction_hash: "d".repeat(64),
    });
    mockExecutionAdapter.confirm.mockResolvedValue({
      outcome: "confirmed",
      action: "mark_delivered",
      transaction_hash: "d".repeat(64),
      result_escrow_id: null,
    });
    mockLoadDealRoomTestnetRuntime.mockReturnValue({
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
    });
    vi.mocked(executeCustodyDeliveryReference).mockResolvedValue({
      transactionHash: "e".repeat(64),
      custodyAddress: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
      deliveryDataKey: "SWD:delivered-custody",
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
      status: "PROOF_SUBMITTED",
      stellar_mode: "testnet",
      stellar_contract_id: "CCONTRACT123",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: "c".repeat(64),
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

  function setupWallets(opts?: { sellerEncryptedKey?: string }) {
    mockStore.provisionProfileWallet({
      user_id: "buyer-1",
      public_address: "GBUYER111111111111111111111111111111111111111111111111111",
      encrypted_secret_key: "ENC_BUYER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockStore.provisionProfileWallet({
      user_id: "seller-1",
      public_address: "GSELLER11111111111111111111111111111111111111111111111111",
      encrypted_secret_key: opts?.sellerEncryptedKey ?? "ENC_SELLER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  it("records the delivery milestone through the testnet-backed route path", async () => {
    setupDeal("deal-delivered-testnet");
    setupWallets();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-delivered-testnet/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-delivered-testnet" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStore.deals.get("deal-delivered-testnet")?.status).toBe("DELIVERED");
    expect(mockStore.deals.get("deal-delivered-testnet")?.latest_stellar_tx_hash).toBe("d".repeat(64));

    const events = mockStore.getDealEvents("deal-delivered-testnet");
    expect(events.at(-1)?.event_type).toBe("mark_delivered");
    expect(events.at(-1)?.tx_hash).toBe("d".repeat(64));
  });

  it("records the delivery milestone for a custody-locked testnet room without a Soroban escrow id", async () => {
    setupDeal("deal-delivered-custody", {
      stellar_escrow_id: null,
      latest_stellar_tx_hash: "c".repeat(64),
    });
    setupWallets();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-delivered-custody/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-delivered-custody" }) },
    );

    expect(response.status).toBe(200);
    expect(executeCustodyDeliveryReference).toHaveBeenCalledOnce();
    expect(mockStore.deals.get("deal-delivered-custody")?.status).toBe("DELIVERED");
    expect(mockStore.deals.get("deal-delivered-custody")?.latest_stellar_tx_hash).toBe("e".repeat(64));

    const events = mockStore.getDealEvents("deal-delivered-custody");
    expect(events.at(-1)?.event_type).toBe("mark_delivered");
    expect(events.at(-1)?.tx_hash).toBe("e".repeat(64));
    expect(events.at(-1)?.metadata).toMatchObject({
      delivery_recording_route: "settleway_custody_wallet_memo_hash",
      proof_transaction_hash: "c".repeat(64),
    });
  });

  it("passes seller Profile Wallet public address to loadDealRoomTestnetRuntime and uses ProfileWalletSigner with seller encrypted key", async () => {
    setupDeal("deal-delivered-signer");
    setupWallets();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-delivered-signer/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-delivered-signer" }) },
    );

    expect(mockLoadDealRoomTestnetRuntime).toHaveBeenCalled();
    const callArgs = mockLoadDealRoomTestnetRuntime.mock.calls[0];

    // Buyer address passed as second arg, seller as third
    const buyerWallet = mockStore.userWallets.get("buyer-1");
    const sellerWallet = mockStore.userWallets.get("seller-1");
    expect(callArgs[1]).toBe(buyerWallet?.public_address);
    expect(callArgs[2]).toBe(sellerWallet?.public_address);

    // signer_port_factory must produce a ProfileWalletSigner initialized with the seller encrypted key, not admin/default
    const deps = callArgs[0];
    const signerInstance = deps.signer_port_factory();
    expect(signerInstance.encryptedSecret).toBe("ENC_SELLER");
  });

  it("missing seller wallet returns honest STELLAR_EXECUTION_INVALID error without mutating deal", async () => {
    setupDeal("deal-no-seller-wallet");
    // Only provision buyer — seller wallet missing
    mockStore.provisionProfileWallet({
      user_id: "buyer-1",
      public_address: "GBUYER111111111111111111111111111111111111111111111111111",
      encrypted_secret_key: "ENC_BUYER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-no-seller-wallet/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-no-seller-wallet" }) },
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("STELLAR_EXECUTION_INVALID");
    // Deal must NOT have been mutated
    expect(mockStore.deals.get("deal-no-seller-wallet")?.status).toBe("PROOF_SUBMITTED");
    expect(mockStore.deals.get("deal-no-seller-wallet")?.latest_stellar_tx_hash).toBe("c".repeat(64));
  });

  it("missing buyer wallet returns honest STELLAR_EXECUTION_INVALID error without mutating deal", async () => {
    setupDeal("deal-no-buyer-wallet");
    // Only provision seller — buyer wallet missing
    mockStore.provisionProfileWallet({
      user_id: "seller-1",
      public_address: "GSELLER11111111111111111111111111111111111111111111111111",
      encrypted_secret_key: "ENC_SELLER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-no-buyer-wallet/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-no-buyer-wallet" }) },
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("STELLAR_EXECUTION_INVALID");
    // Deal must NOT have been mutated
    expect(mockStore.deals.get("deal-no-buyer-wallet")?.status).toBe("PROOF_SUBMITTED");
  });

  it("DEMO_PUBLIC_ONLY seller wallet: route uses it as encryptedSecret (signer will fail closed at signing time)", async () => {
    setupDeal("deal-demo-only-seller");
    setupWallets({ sellerEncryptedKey: "DEMO_PUBLIC_ONLY" });
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    // The route will call signer_port_factory with DEMO_PUBLIC_ONLY;
    // ProfileWalletSigner receiving DEMO_PUBLIC_ONLY will fail closed (ERR_SIGNER_REJECTED) when signing
    // In the test, the mock runtime's execution_adapter.submit governs the outcome,
    // but we verify that the signer was constructed with DEMO_PUBLIC_ONLY so the signer contract is honored
    await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-demo-only-seller/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-demo-only-seller" }) },
    );

    const callArgs = mockLoadDealRoomTestnetRuntime.mock.calls[0];
    const deps = callArgs[0];
    const signerInstance = deps.signer_port_factory();
    // The signer must be initialized with DEMO_PUBLIC_ONLY — not silently replaced with admin/env signer
    expect(signerInstance.encryptedSecret).toBe("DEMO_PUBLIC_ONLY");
  });

  it("confirmed mark-delivered only persists DELIVERED state after contract confirmation, not before", async () => {
    setupDeal("deal-delivered-confirmed-order");
    setupWallets();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    // Before call: state is PROOF_SUBMITTED
    expect(mockStore.deals.get("deal-delivered-confirmed-order")?.status).toBe("PROOF_SUBMITTED");

    const response = await markDeliveredRoute(
      new Request("http://localhost/api/deals/deal-delivered-confirmed-order/mark-delivered", {
        method: "POST",
      }),
      { params: Promise.resolve({ dealId: "deal-delivered-confirmed-order" }) },
    );

    expect(response.status).toBe(200);
    // After call: state is DELIVERED with the confirmed tx hash
    const deal = mockStore.deals.get("deal-delivered-confirmed-order");
    expect(deal?.status).toBe("DELIVERED");
    expect(deal?.latest_stellar_tx_hash).toBe("d".repeat(64));
    // The response must report the confirmed tx hash
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.data.status).toBe("DELIVERED");
    expect(data.data.latest_stellar_tx_hash).toBe("d".repeat(64));
  });

  describe("demo corridor", () => {
    let mockFrom: any;
    let mockSelect: any;
    let mockEq: any;
    let mockSingle: any;
    let mockUpdate: any;
    let mockInsert: any;

    beforeEach(() => {
      process.env.STELLAR_PLATFORM_SECRET = "test-secret";
      mockSingle = vi.fn();
      mockEq = vi.fn(() => ({ single: mockSingle }));
      mockSelect = vi.fn(() => ({ eq: mockEq }));
      mockUpdate = vi.fn(() => ({ eq: mockEq }));
      mockInsert = vi.fn();
      mockFrom = vi.fn((table) => {
        if (table === 'deals') {
          return { select: mockSelect, update: mockUpdate };
        }
        if (table === 'escrow_events') {
          return { insert: mockInsert };
        }
        return {};
      });
      mockServiceClient.from.mockImplementation(mockFrom);
      vi.mocked(anchorDemoEvent).mockResolvedValue({
        tx_hash: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        proof_hash: "abcd",
        status: "success",
      });
    });

    afterEach(() => {
      delete process.env.STELLAR_PLATFORM_SECRET;
    });

    it("anchors delivery proof for demo-cabai-001 when seller acts", async () => {
      vi.mocked(nextHeaders.cookies).mockReturnValue({
        get: () => ({ value: "seller-probolinggo-cabai" }),
      } as any);

      mockSingle.mockResolvedValue({
        data: {
          id: 'demo-cabai-001',
          buyer_id: 'buyer-surabaya-restaurant',
          seller_id: 'seller-probolinggo-cabai',
          stellar_mode: 'mock_only',
          status: 'LOCKED',
          latest_stellar_tx_hash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          commodity: "Red Chili",
        },
        error: null,
      });
      // No mockEq.mockResolvedValue({ error: null }) here since it would break the chain
      mockInsert.mockResolvedValue({ error: null });

      const response = await markDeliveredRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/mark-delivered", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe("DELIVERED");
      expect(data.data.latest_stellar_tx_hash).toBe("dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");

      expect(anchorDemoEvent).toHaveBeenCalledWith({
        deal_id: "demo-cabai-001",
        event_type: "DELIVERY_PROOF_RECORDED",
        actor_id: "seller-probolinggo-cabai",
        payload: expect.objectContaining({
          buyer_id: "buyer-surabaya-restaurant",
          seller_id: "seller-probolinggo-cabai",
          previous_tx_hash: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        })
      });
    });

    it("is idempotent for demo-cabai-001 if already DELIVERED", async () => {
      vi.mocked(nextHeaders.cookies).mockReturnValue({
        get: () => ({ value: "seller-probolinggo-cabai" }),
      } as any);

      mockSingle.mockResolvedValue({
        data: {
          id: 'demo-cabai-001',
          buyer_id: 'buyer-surabaya-restaurant',
          seller_id: 'seller-probolinggo-cabai',
          stellar_mode: 'mock_only',
          status: 'DELIVERED',
          latest_stellar_tx_hash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
          proof_hash: 'abcd',
        },
        error: null,
      });

      const response = await markDeliveredRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/mark-delivered", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.latest_stellar_tx_hash).toBe("dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");
      expect(anchorDemoEvent).not.toHaveBeenCalled();
    });

    it("rejects non-seller actor for demo-cabai-001", async () => {
      vi.mocked(nextHeaders.cookies).mockReturnValue({
        get: () => ({ value: "buyer-surabaya-restaurant" }),
      } as any);

      const response = await markDeliveredRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/mark-delivered", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );

      expect(response.status).toBe(403);
    });

    it("rejects if status is not LOCKED or PROOF_SUBMITTED", async () => {
      vi.mocked(nextHeaders.cookies).mockReturnValue({
        get: () => ({ value: "seller-probolinggo-cabai" }),
      } as any);

      mockSingle.mockResolvedValue({
        data: {
          id: 'demo-cabai-001',
          buyer_id: 'buyer-surabaya-restaurant',
          seller_id: 'seller-probolinggo-cabai',
          stellar_mode: 'mock_only',
          status: 'SELLER_FUNDED',
        },
        error: null,
      });

      const response = await markDeliveredRoute(
        new Request("http://localhost/api/deals/demo-cabai-001/mark-delivered", { method: "POST" }),
        { params: Promise.resolve({ dealId: "demo-cabai-001" }) }
      );

      expect(response.status).toBe(409);
    });
  });
});
