import { describe, it, expect, vi } from "vitest";
import { Networks, Keypair, TransactionBuilder, StrKey } from "@stellar/stellar-sdk";
import { StellarTestnetAdapter } from "./stellar-testnet-adapter";
import type { StellarTestnetAdapterConfig, StellarTestnetRoleMapping } from "./stellar-testnet-adapter";
import type { StellarSignerPort, StellarTimeSource } from "./stellar-signer-port";
import type { StellarAdapterSubmitRequest, StellarPreparedInvocation } from "./adapter-contracts";

// Deterministic fixed test keys — derived from fixed seeds, not Keypair.random()
const ADMIN_KP = Keypair.fromSecret("SDG7MGMBQ3CQS74Q2UNIYLBDYZUBFHKAO25YBBXYGPX6YSRQFZS3DOIY");
const BUYER_KP = Keypair.fromSecret("SAY7SJURIC433KFZAZ4HIJA7UAOHC64IBL7TRZX7V2HLLKZ2NV5RH6YN");
const SELLER_KP = Keypair.fromSecret("SAKDCKWQTBO6E23ZHQD4LBM2WF6IRNGVV3KTGE5CKEORHEH32D6GQDVQ");

const ADMIN_ADDR = ADMIN_KP.publicKey();
const BUYER_ADDR = BUYER_KP.publicKey();
const SELLER_ADDR = SELLER_KP.publicKey();

const TEST_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 1));

function makeConfig(overrides: Partial<StellarTestnetAdapterConfig> = {}): StellarTestnetAdapterConfig {
  return {
    network_passphrase: Networks.TESTNET,
    contract_id: TEST_CONTRACT,
    base_fee_stroops: 100,
    max_fee_stroops: 10000000,
    timeout_seconds: 30,
    ...overrides,
  };
}

function makeRoleMapping(): StellarTestnetRoleMapping {
  return {
    admin_address: ADMIN_ADDR,
    buyer_demo_address: BUYER_ADDR,
    seller_demo_address: SELLER_ADDR,
  };
}

function makeInvocation(overrides: Partial<StellarPreparedInvocation> = {}): StellarPreparedInvocation {
  return {
    action: "buyer_deposit",
    method: "deposit_buyer",
    signer_role: "buyer_demo",
    contract_id: TEST_CONTRACT,
    arguments: [
      { kind: "u64", value: "1" },
      { kind: "address", value: BUYER_ADDR },
    ],
    ...overrides,
  };
}

function makeSubmitRequest(overrides: Partial<StellarAdapterSubmitRequest> = {}): StellarAdapterSubmitRequest {
  return {
    operation_id: "op-1",
    idempotency_key: "key-1",
    invocation: makeInvocation(),
    ...overrides,
  };
}

function makeRpcPort() {
  return {
    verifyNetworkIdentity: vi.fn().mockResolvedValue(true),
    loadSourceAccount: vi.fn().mockResolvedValue({ ok: true, sequence: "100" }),
    simulateAndPrepareTransaction: vi.fn().mockImplementation(async (tx: import("@stellar/stellar-sdk").Transaction) => {
      return { ok: true, prepared_transaction: tx };
    }),
    submitTransaction: vi.fn().mockResolvedValue({
      ok: true,
      transaction_hash: "a".repeat(64),
    }),
    confirmTransaction: vi.fn(),
  };
}

function makeSignerPort(signerKp: Keypair): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: import("./stellar-signer-port").StellarSignRequest) => {
      const tx = TransactionBuilder.fromXDR(
        req.prepared_transaction_xdr,
        req.expected_network_passphrase,
      ) as import("@stellar/stellar-sdk").Transaction;
      tx.sign(signerKp);
      return { ok: true, signed_transaction_xdr: tx.toXDR() };
    }),
  };
}

function makeTimeSource(now: number = 1700000000): StellarTimeSource {
  return { nowUnixSeconds: vi.fn().mockReturnValue(now) };
}

describe("StellarTestnetAdapter", () => {
  describe("submit", () => {
    it("rejects wrong network passphrase in config", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig({ network_passphrase: "wrong" }),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("prepare");
        expect(res.error_code).toBe("ERR_INVALID_STATE");
      }
    });

    it("rejects invalid base fee", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig({ base_fee_stroops: 0 }),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
    });

    it("rejects base > max fee", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig({ base_fee_stroops: 200, max_fee_stroops: 100 }),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
    });

    it("rejects when network identity fails", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.verifyNetworkIdentity.mockResolvedValue(false);
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_NETWORK_FAILURE");
        expect(res.retryable).toBe(true);
      }
    });

    it("rejects when source account fails", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.loadSourceAccount.mockResolvedValue({ ok: false });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_NETWORK_FAILURE");
      }
    });

    it("rejects negative time source", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(-1),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_INVALID_STATE");
      }
    });

    it("rejects non-integer time source", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(1.5),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
    });

    it("rejects simulation failure", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.simulateAndPrepareTransaction.mockResolvedValue({
        ok: false,
        error_code: "ERR_CONTRACT_REJECTED",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_CONTRACT_REJECTED");
      }
    });

    it("maps auth failure to ERR_AUTH_FAILED", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.simulateAndPrepareTransaction.mockResolvedValue({
        ok: false,
        error_code: "ERR_AUTH_FAILED",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
        expect(res.stage).toBe("sign");
      }
    });

    it("rejects signer rejection", async () => {
      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockResolvedValue({
          ok: false,
          error_code: "ERR_SIGNER_REJECTED",
        }),
      };
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("sign");
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
      }
    });

    it("rejects malicious signer returning garbage XDR", async () => {
      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockResolvedValue({
          ok: true,
          signed_transaction_xdr: "INVALIDXDR",
        }),
      };
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("sign");
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
      }
    });

    it("rejects signer returning unsigned transaction", async () => {
      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockImplementation(async (req: import("./stellar-signer-port").StellarSignRequest) => {
          return { ok: true, signed_transaction_xdr: req.prepared_transaction_xdr };
        }),
      };
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("sign");
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
      }
    });

    it("rejects signer with wrong key", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(ADMIN_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("sign");
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
      }
    });

    it("succeeds with valid submit flow", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("submitted");
      if (res.outcome === "submitted") {
        expect(res.action).toBe("buyer_deposit");
        expect(res.transaction_hash).toBe("a".repeat(64));
      }
    });

    it("treats duplicate as submitted", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.submitTransaction.mockResolvedValue({
        ok: false,
        status: "duplicate",
        transaction_hash: "b".repeat(64),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("submitted");
    });

    it("maps retry_later to retryable failure", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.submitTransaction.mockResolvedValue({
        ok: false,
        status: "retry_later",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("submit");
        expect(res.retryable).toBe(true);
      }
    });

    it("does not call confirm during submit", async () => {
      const rpcPort = makeRpcPort();
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      await adapter.submit(makeSubmitRequest());
      expect(rpcPort.confirmTransaction).not.toHaveBeenCalled();
    });

    it("calls time source exactly once", async () => {
      const timeSource = makeTimeSource();
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        timeSource,
      );
      await adapter.submit(makeSubmitRequest());
      expect(timeSource.nowUnixSeconds).toHaveBeenCalledTimes(1);
    });

    it("does not mutate input", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const req = makeSubmitRequest();
      const reqCopy = JSON.parse(JSON.stringify(req));
      await adapter.submit(req);
      expect(req).toEqual(reqCopy);
    });
  });

  describe("confirm", () => {
    it("returns confirmed for create_deal with escrow ID", async () => {
      const { nativeToScVal } = await import("@stellar/stellar-sdk");
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: nativeToScVal(BigInt(999), { type: "u64" }),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "create_deal",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("confirmed");
      if (res.outcome === "confirmed") {
        expect(res.result_escrow_id).toBe("999");
      }
    });

    it("returns confirmed for transition with null escrow ID", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("confirmed");
      if (res.outcome === "confirmed") {
        expect(res.result_escrow_id).toBe(null);
      }
    });

    it("returns failed for RPC failure", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "failed",
        transaction_hash: "a".repeat(64),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_CONTRACT_REJECTED");
      }
    });

    it("returns unknown for not_found", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({ outcome: "not_found" });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("unknown");
      if (res.outcome === "unknown") {
        expect(res.reconciliation_required).toBe(true);
        expect(res.resubmission_allowed).toBe(false);
      }
    });

    it("returns unknown for RPC error", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "error",
        error_code: "ERR_NETWORK_FAILURE",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("unknown");
    });

    it("rejects invalid transaction hash", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "invalid",
      });
      expect(res.outcome).toBe("failed");
    });

    it("does not call submit during confirm", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("does not call time source during confirm", async () => {
      const timeSource = makeTimeSource();
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        timeSource,
      );
      await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(timeSource.nowUnixSeconds).not.toHaveBeenCalled();
    });

    it("rejects unexpected escrow ID for transition action", async () => {
      const { nativeToScVal } = await import("@stellar/stellar-sdk");
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: nativeToScVal(BigInt(42), { type: "u64" }),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("failed");
    });
  });
});
