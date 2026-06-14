import { describe, it, expect, vi } from "vitest";
import { Networks, Keypair, TransactionBuilder, nativeToScVal, xdr, StrKey } from "@stellar/stellar-sdk";
import { StellarTestnetAdapter } from "./stellar-testnet-adapter";
import type { StellarTestnetAdapterConfig, StellarTestnetRoleMapping } from "./stellar-testnet-adapter";
import type { StellarRpcPort } from "./stellar-rpc-port";
import type { StellarSignerPort, StellarTimeSource, StellarSignRequest } from "./stellar-signer-port";
import { buildStellarInvocation } from "./invocation-builder";
import { assembleStellarExecutionInput } from "./execution-input-assembler";
import type { StellarExecutionAssemblyInput, StellarExecutionPublicMetadata } from "./execution-input-assembler";
import type { DbDeal } from "@/lib/db/types";
import type { StellarAction } from "@/lib/stellar/types";

// Fixed test keys
const ADMIN_KP = Keypair.fromSecret("SDG7MGMBQ3CQS74Q2UNIYLBDYZUBFHKAO25YBBXYGPX6YSRQFZS3DOIY");
const BUYER_KP = Keypair.fromSecret("SAY7SJURIC433KFZAZ4HIJA7UAOHC64IBL7TRZX7V2HLLKZ2NV5RH6YN");
const SELLER_KP = Keypair.fromSecret("SAKDCKWQTBO6E23ZHQD4LBM2WF6IRNGVV3KTGE5CKEORHEH32D6GQDVQ");
const KP_MAP: Record<string, Keypair> = { admin: ADMIN_KP, buyer_demo: BUYER_KP, seller_demo: SELLER_KP };

const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 1));

const config: StellarTestnetAdapterConfig = {
  network_passphrase: Networks.TESTNET,
  contract_id: CONTRACT_ID,
  base_fee_stroops: 100,
  max_fee_stroops: 10000000,
  timeout_seconds: 30,
};

const roleMapping: StellarTestnetRoleMapping = {
  admin_address: ADMIN_KP.publicKey(),
  buyer_demo_address: BUYER_KP.publicKey(),
  seller_demo_address: SELLER_KP.publicKey(),
};

const metadata: StellarExecutionPublicMetadata = {
  contract_id: CONTRACT_ID,
  admin_address: ADMIN_KP.publicKey(),
  buyer_demo_address: BUYER_KP.publicKey(),
  seller_demo_address: SELLER_KP.publicKey(),
};

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: "deal-1",
    listing_id: "listing-1",
    buyer_request_id: null,
    buyer_id: "b1",
    seller_id: "s1",
    commodity: "Coffee",
    volume_kg: 100,
    principal_idr: 1000,
    buyer_bond_idr: 100,
    seller_bond_idr: 100,
    buyer_fee_idr: 10,
    seller_fee_idr: 10,
    buyer_total_idr: 1110,
    seller_total_idr: 890,
    status: "WAITING_DEPOSITS",
    stellar_mode: "testnet",
    stellar_contract_id: CONTRACT_ID,
    stellar_escrow_id: "1",
    latest_stellar_tx_hash: null,
    stellar_sync_status: "idle",
    proof_hash: null,
    terms: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Stellar Testnet Adapter Integration", () => {
  const plans: Array<{
    action: string;
    status: string | null;
    deal_overrides: Partial<DbDeal>;
    extra: Record<string, string>;
    expect_escrow_id: boolean;
  }> = [
    { action: "create_deal", status: null, deal_overrides: { status: "WAITING_DEPOSITS", stellar_contract_id: null, stellar_escrow_id: null }, extra: {}, expect_escrow_id: true },
    { action: "buyer_deposit", status: "WAITING_DEPOSITS", deal_overrides: { status: "WAITING_DEPOSITS" }, extra: {}, expect_escrow_id: false },
    { action: "buyer_deposit", status: "SELLER_FUNDED", deal_overrides: { status: "SELLER_FUNDED" }, extra: {}, expect_escrow_id: false },
    { action: "seller_deposit", status: "WAITING_DEPOSITS", deal_overrides: { status: "WAITING_DEPOSITS" }, extra: {}, expect_escrow_id: false },
    { action: "seller_deposit", status: "BUYER_FUNDED", deal_overrides: { status: "BUYER_FUNDED" }, extra: {}, expect_escrow_id: false },
    { action: "submit_proof", status: "LOCKED", deal_overrides: { status: "LOCKED" }, extra: { proof_hash: "e".repeat(64) }, expect_escrow_id: false },
    { action: "mark_delivered", status: "PROOF_SUBMITTED", deal_overrides: { status: "PROOF_SUBMITTED" }, extra: {}, expect_escrow_id: false },
    { action: "accept_delivery", status: "DELIVERED", deal_overrides: { status: "DELIVERED" }, extra: {}, expect_escrow_id: false },
    { action: "expire", status: "WAITING_DEPOSITS", deal_overrides: { status: "WAITING_DEPOSITS" }, extra: {}, expect_escrow_id: false },
    { action: "expire", status: "BUYER_FUNDED", deal_overrides: { status: "BUYER_FUNDED" }, extra: {}, expect_escrow_id: false },
    { action: "expire", status: "SELLER_FUNDED", deal_overrides: { status: "SELLER_FUNDED" }, extra: {}, expect_escrow_id: false },
    { action: "refund", status: "BUYER_FUNDED", deal_overrides: { status: "BUYER_FUNDED" }, extra: {}, expect_escrow_id: false },
    { action: "refund", status: "SELLER_FUNDED", deal_overrides: { status: "SELLER_FUNDED" }, extra: {}, expect_escrow_id: false },
  ];

  for (const plan of plans) {
    it(`integrates ${plan.action} from ${plan.status ?? "null"}`, async () => {
      const deal = makeDeal(plan.deal_overrides);
      let asmInput: StellarExecutionAssemblyInput;
      if (plan.action === "create_deal") {
        asmInput = {
          action: "create_deal",
          operation_id: "op-1",
          deal,
          metadata,
          deal_hash: "f".repeat(64),
          expires_at: "1700000000",
        };
      } else if (plan.action === "submit_proof") {
        asmInput = {
          action: "submit_proof",
          operation_id: "op-1",
          deal,
          metadata,
          proof_hash: plan.extra.proof_hash,
        };
      } else {
        asmInput = {
          action: plan.action as Exclude<StellarAction, "create_deal" | "submit_proof">,
          operation_id: "op-1",
          deal,
          metadata,
        };
      }

      const asmResult = assembleStellarExecutionInput(asmInput);
      if (!asmResult.ok) throw new Error("Assembly failed: " + JSON.stringify(asmResult));
      expect(asmResult.ok).toBe(true);

      const invResult = buildStellarInvocation(asmResult.build_input);
      if (!invResult.ok) throw new Error("Build failed: " + JSON.stringify(invResult));
      expect(invResult.ok).toBe(true);

      const rpcPort: StellarRpcPort = {
        verifyNetworkIdentity: vi.fn().mockResolvedValue(true),
        loadSourceAccount: vi.fn().mockResolvedValue({ ok: true, sequence: "100" }),
        simulateAndPrepareTransaction: vi.fn().mockImplementation(async (tx: import("@stellar/stellar-sdk").Transaction) => {
          return { ok: true, prepared_transaction: tx };
        }),
        submitTransaction: vi.fn().mockResolvedValue({
          ok: true,
          transaction_hash: "a".repeat(64),
        }),
        confirmTransaction: vi.fn().mockResolvedValue(
          plan.expect_escrow_id
            ? {
                outcome: "confirmed" as const,
                transaction_hash: "a".repeat(64),
                result_value: nativeToScVal(BigInt(42), { type: "u64" }),
              }
            : {
                outcome: "confirmed" as const,
                transaction_hash: "a".repeat(64),
                result_value: xdr.ScVal.scvVoid(),
              },
        ),
      };

      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
          const kp = KP_MAP[req.signer_role];
          const tx = TransactionBuilder.fromXDR(
            req.prepared_transaction_xdr,
            req.expected_network_passphrase,
          ) as import("@stellar/stellar-sdk").Transaction;
          tx.sign(kp);
          return { ok: true, signed_transaction_xdr: tx.toXDR() };
        }),
      };

      const timeSource: StellarTimeSource = {
        nowUnixSeconds: vi.fn().mockReturnValue(1700000000),
      };

      const adapter = new StellarTestnetAdapter(
        config,
        roleMapping,
        rpcPort,
        signerPort,
        timeSource,
      );

      const submitResult = await adapter.submit({
        operation_id: "op-1",
        idempotency_key: `v1:deal-1:${plan.status ?? "CREATE"}:${plan.action}`,
        invocation: invResult.invocation,
      });
      expect(submitResult.outcome).toBe("submitted");
      if (submitResult.outcome !== "submitted") return;

      const confirmResult = await adapter.confirm({
        action: invResult.invocation.action,
        transaction_hash: submitResult.transaction_hash,
      });
      expect(confirmResult.outcome).toBe("confirmed");
      if (confirmResult.outcome === "confirmed") {
        if (plan.expect_escrow_id) {
          expect(confirmResult.result_escrow_id).toBe("42");
        } else {
          expect(confirmResult.result_escrow_id).toBe(null);
        }
      }
    });
  }
});
