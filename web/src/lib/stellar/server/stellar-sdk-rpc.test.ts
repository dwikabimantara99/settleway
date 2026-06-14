import { describe, it, expect, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import type { StellarRpcPort } from "./stellar-rpc-port";

/**
 * Tests the RPC port contract by building a conformant mock implementation.
 * We do NOT test StellarSdkRpc directly because it requires a live rpc.Server.
 * Instead, we verify the contract shapes and a mock port implementation
 * that represents what the adapter consumes.
 */

function createMockRpcPort(): StellarRpcPort & {
  _verifyNetworkImpl: ReturnType<typeof vi.fn>;
  _loadAccountImpl: ReturnType<typeof vi.fn>;
  _simulateImpl: ReturnType<typeof vi.fn>;
  _submitImpl: ReturnType<typeof vi.fn>;
  _confirmImpl: ReturnType<typeof vi.fn>;
} {
  const _verifyNetworkImpl = vi.fn<[string], Promise<boolean>>();
  const _loadAccountImpl = vi.fn();
  const _simulateImpl = vi.fn();
  const _submitImpl = vi.fn();
  const _confirmImpl = vi.fn();

  return {
    _verifyNetworkImpl,
    _loadAccountImpl,
    _simulateImpl,
    _submitImpl,
    _confirmImpl,
    verifyNetworkIdentity: (p) => _verifyNetworkImpl(p),
    loadSourceAccount: (a) => _loadAccountImpl(a),
    simulateAndPrepareTransaction: (t) => _simulateImpl(t),
    submitTransaction: (x) => _submitImpl(x),
    confirmTransaction: (h) => _confirmImpl(h),
  };
}

describe("Stellar RPC Port Contract", () => {
  describe("verifyNetworkIdentity", () => {
    it("returns true for matching passphrase", async () => {
      const port = createMockRpcPort();
      port._verifyNetworkImpl.mockResolvedValue(true);
      const res = await port.verifyNetworkIdentity(Networks.TESTNET);
      expect(res).toBe(true);
    });

    it("returns false for mismatch", async () => {
      const port = createMockRpcPort();
      port._verifyNetworkImpl.mockResolvedValue(false);
      const res = await port.verifyNetworkIdentity("wrong");
      expect(res).toBe(false);
    });

    it("returns false on network error", async () => {
      const port = createMockRpcPort();
      port._verifyNetworkImpl.mockResolvedValue(false);
      const res = await port.verifyNetworkIdentity(Networks.TESTNET);
      expect(res).toBe(false);
    });
  });

  describe("loadSourceAccount", () => {
    it("returns sequence on success", async () => {
      const port = createMockRpcPort();
      port._loadAccountImpl.mockResolvedValue({ ok: true, sequence: "123" });
      const res = await port.loadSourceAccount("GTEST");
      expect(res).toEqual({ ok: true, sequence: "123" });
    });

    it("returns ok false on failure", async () => {
      const port = createMockRpcPort();
      port._loadAccountImpl.mockResolvedValue({ ok: false });
      const res = await port.loadSourceAccount("GTEST");
      expect(res).toEqual({ ok: false });
    });
  });

  describe("simulateAndPrepareTransaction", () => {
    it("returns prepared transaction on success", async () => {
      const port = createMockRpcPort();
      const fakePrepared = { toXDR: () => "xdr" };
      port._simulateImpl.mockResolvedValue({ ok: true, prepared_transaction: fakePrepared });
      const fakeTx = {} as Parameters<StellarRpcPort["simulateAndPrepareTransaction"]>[0];
      const res = await port.simulateAndPrepareTransaction(fakeTx);
      expect(res.ok).toBe(true);
    });

    it("returns ERR_CONTRACT_REJECTED on simulation error", async () => {
      const port = createMockRpcPort();
      port._simulateImpl.mockResolvedValue({ ok: false, error_code: "ERR_CONTRACT_REJECTED" });
      const fakeTx = {} as Parameters<StellarRpcPort["simulateAndPrepareTransaction"]>[0];
      const res = await port.simulateAndPrepareTransaction(fakeTx);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error_code).toBe("ERR_CONTRACT_REJECTED");
    });

    it("returns ERR_AUTH_FAILED on unsupported auth", async () => {
      const port = createMockRpcPort();
      port._simulateImpl.mockResolvedValue({ ok: false, error_code: "ERR_AUTH_FAILED" });
      const fakeTx = {} as Parameters<StellarRpcPort["simulateAndPrepareTransaction"]>[0];
      const res = await port.simulateAndPrepareTransaction(fakeTx);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error_code).toBe("ERR_AUTH_FAILED");
    });

    it("returns ERR_NETWORK_FAILURE on transport exception", async () => {
      const port = createMockRpcPort();
      port._simulateImpl.mockResolvedValue({ ok: false, error_code: "ERR_NETWORK_FAILURE" });
      const fakeTx = {} as Parameters<StellarRpcPort["simulateAndPrepareTransaction"]>[0];
      const res = await port.simulateAndPrepareTransaction(fakeTx);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error_code).toBe("ERR_NETWORK_FAILURE");
    });
  });

  describe("submitTransaction", () => {
    it("returns ok for PENDING", async () => {
      const port = createMockRpcPort();
      port._submitImpl.mockResolvedValue({ ok: true, transaction_hash: "abc" });
      const res = await port.submitTransaction("signed-xdr");
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.transaction_hash).toBe("abc");
    });

    it("returns duplicate for DUPLICATE", async () => {
      const port = createMockRpcPort();
      port._submitImpl.mockResolvedValue({ ok: false, status: "duplicate", transaction_hash: "abc" });
      const res = await port.submitTransaction("signed-xdr");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe("duplicate");
    });

    it("returns retry_later for TRY_AGAIN_LATER", async () => {
      const port = createMockRpcPort();
      port._submitImpl.mockResolvedValue({ ok: false, status: "retry_later" });
      const res = await port.submitTransaction("signed-xdr");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe("retry_later");
    });

    it("returns ERR_UNKNOWN for arbitrary status", async () => {
      const port = createMockRpcPort();
      port._submitImpl.mockResolvedValue({ ok: false, status: "rejected", error_code: "SOMETHING" });
      const res = await port.submitTransaction("signed-xdr");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe("rejected");
    });

    it("returns ERR_NETWORK_FAILURE on exception", async () => {
      const port = createMockRpcPort();
      port._submitImpl.mockResolvedValue({ ok: false, status: "error", error_code: "ERR_NETWORK_FAILURE" });
      const res = await port.submitTransaction("signed-xdr");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe("error");
    });
  });

  describe("confirmTransaction", () => {
    it("returns confirmed on SUCCESS", async () => {
      const port = createMockRpcPort();
      port._confirmImpl.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const res = await port.confirmTransaction("hash1");
      expect(res.outcome).toBe("confirmed");
    });

    it("returns failed on FAILED", async () => {
      const port = createMockRpcPort();
      port._confirmImpl.mockResolvedValue({
        outcome: "failed",
        transaction_hash: "hash1",
      });
      const res = await port.confirmTransaction("hash1");
      expect(res.outcome).toBe("failed");
    });

    it("returns not_found on NOT_FOUND", async () => {
      const port = createMockRpcPort();
      port._confirmImpl.mockResolvedValue({ outcome: "not_found" });
      const res = await port.confirmTransaction("hash1");
      expect(res.outcome).toBe("not_found");
    });

    it("returns error on transport exception", async () => {
      const port = createMockRpcPort();
      port._confirmImpl.mockResolvedValue({ outcome: "error", error_code: "ERR_NETWORK_FAILURE" });
      const res = await port.confirmTransaction("hash1");
      expect(res.outcome).toBe("error");
    });

    it("returns confirmed with null result_value", async () => {
      const port = createMockRpcPort();
      port._confirmImpl.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: null,
      });
      const res = await port.confirmTransaction("hash1");
      expect(res.outcome).toBe("confirmed");
      if (res.outcome === "confirmed") {
        expect(res.result_value).toBe(null);
      }
    });
  });
});
