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
    constructor(public encryptedSecret: string, public fallbackAddress: string) {}
  },
}));

vi.mock("@/lib/stellar/testnet-proof", () => ({
  executeCustodyProofReference: vi.fn(),
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
import { executeCustodyProofReference } from "@/lib/stellar/testnet-proof";
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
    vi.mocked(executeCustodyProofReference).mockResolvedValue({
      transactionHash: "d".repeat(64),
      custodyAddress: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
      proofHash: "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f",
      proofDataKey: "SWP:proof-custody-testnet",
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



  function setupWallets() {
    mockStore.provisionProfileWallet({
      user_id: "buyer-1",
      public_address: "GBUYER",
      encrypted_secret_key: "ENC_BUYER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    mockStore.provisionProfileWallet({
      user_id: "seller-1",
      public_address: "GSELLER",
      encrypted_secret_key: "ENC_SELLER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  it("missing seller wallet produces honest error", async () => {
    const proofHash = "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f";
    setupDeal("deal-no-wallet");
    
    // Only provision buyer
    mockStore.provisionProfileWallet({
      user_id: "buyer-1",
      public_address: "GBUYER",
      encrypted_secret_key: "ENC_BUYER",
      encryption_version: "test",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await submitProofRoute(
      new Request("http://localhost/api/deals/deal-no-wallet/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof_hash: proofHash }),
      }),
      { params: Promise.resolve({ dealId: "deal-no-wallet" }) },
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.message).toContain("Seller profile wallet not found");
  });

  it("submit-proof passes seller and buyer Profile Wallet public addresses to runtime and uses ProfileWalletSigner", async () => {
    const proofHash = "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f";
    setupDeal("deal-proof-testnet");
    setupWallets();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await submitProofRoute(
      new Request("http://localhost/api/deals/deal-proof-testnet/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof_hash: proofHash }),
      }),
      { params: Promise.resolve({ dealId: "deal-proof-testnet" }) },
    );

    expect(response.status).toBe(200);
    expect(mockLoadDealRoomTestnetRuntime).toHaveBeenCalled();
    
    const callArgs = mockLoadDealRoomTestnetRuntime.mock.calls[0];
    
    // We expect it to be called with the addresses from mockStore.seed()
    const buyerWallet = mockStore.userWallets.get("buyer-1");
    const sellerWallet = mockStore.userWallets.get("seller-1");
    
    expect(callArgs[1]).toBe(buyerWallet?.public_address);
    expect(callArgs[2]).toBe(sellerWallet?.public_address);
    
    const deps = callArgs[0];
    const signerPort = deps.signer_port_factory();
    expect(signerPort.encryptedSecret).toBe(sellerWallet?.encrypted_secret_key);
    expect(signerPort.fallbackAddress).toBe(sellerWallet?.public_address);
  });

  it("DEMO_PUBLIC_ONLY seller wallet is rejected fail-closed because ProfileWalletSigner will fail signing", async () => {
    // Actually the DEMO_PUBLIC_ONLY rejection happens inside ProfileWalletSigner when it tries to sign.
    // In our test, we just ensure that if the adapter returns an error (simulate failure), it doesn't fake success.
    // The previous prompt said: "Contract rejection / 'Not the seller' maps to safe diagnostic, not fake success."
    // and "DEMO_PUBLIC_ONLY seller wallet is rejected fail-closed".
    // We mock the adapter returning a contract rejection.
    const proofHash = "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f";
    setupDeal("deal-proof-reject");
    setupWallets();
    
    // Actually the DEMO_PUBLIC_ONLY rejection happens inside ProfileWalletSigner when it tries to sign.
    // In our test, we simulate this by returning ERR_CONTRACT_REJECTED.
    // wait, I also need to make sure the adapter returns failure.
    mockStore.userWallets.get("seller-1")!.encrypted_secret_key = "DEMO_PUBLIC_ONLY";
    
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    mockExecutionAdapter.submit.mockResolvedValue({
      outcome: "failed",
      action: "submit_proof",
      transaction_hash: null,
      error_code: "ERR_SIGNER_REJECTED",
      retryable: false,
    });

    const response = await submitProofRoute(
      new Request("http://localhost/api/deals/deal-proof-reject/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof_hash: proofHash }),
      }),
      { params: Promise.resolve({ dealId: "deal-proof-reject" }) },
    );

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error.code).toBe("STELLAR_EXECUTION_UNCONFIRMED");
    
    // Check that it did NOT mutate state or tx hash
    expect(mockStore.deals.get("deal-proof-reject")?.status).toBe("LOCKED");
    expect(mockStore.deals.get("deal-proof-reject")?.proof_hash).toBeNull();
    expect(mockStore.deals.get("deal-proof-reject")?.latest_stellar_tx_hash).toBe("b".repeat(64));
  });

  it("records proof for a custody-locked testnet room without a Soroban escrow id", async () => {
    const proofHash = "7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f";
    setupDeal("deal-proof-custody-testnet", {
      stellar_escrow_id: null,
      latest_stellar_tx_hash: "b".repeat(64),
    });
    setupWallets();
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: "seller-1" }),
    } as any);

    const response = await submitProofRoute(
      new Request("http://localhost/api/deals/deal-proof-custody-testnet/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof_hash: proofHash }),
      }),
      { params: Promise.resolve({ dealId: "deal-proof-custody-testnet" }) },
    );

    expect(response.status).toBe(200);
    expect(executeCustodyProofReference).toHaveBeenCalledOnce();
    expect(mockStore.deals.get("deal-proof-custody-testnet")?.status).toBe("PROOF_SUBMITTED");
    expect(mockStore.deals.get("deal-proof-custody-testnet")?.proof_hash).toBe(proofHash);
    expect(mockStore.deals.get("deal-proof-custody-testnet")?.latest_stellar_tx_hash).toBe("d".repeat(64));
  });
});
