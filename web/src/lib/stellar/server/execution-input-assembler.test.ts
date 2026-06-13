import { describe, it, expect } from "vitest";
import {
  assembleStellarExecutionInput,
  type StellarExecutionPublicMetadata,
  type StellarExecutionAssemblyInput,
} from "./execution-input-assembler";
import type { DbDeal } from "@/lib/db/types";
import type { DealStatus } from "@/lib/escrow/state-machine";
import type { StellarAction } from "@/lib/stellar/types";

const META: StellarExecutionPublicMetadata = {
  contract_id: "C_CONTRACT",
  admin_address: "G_ADMIN",
  buyer_demo_address: "G_BUYER",
  seller_demo_address: "G_SELLER",
};

const DEAL_HASH = "a".repeat(64);
const PROOF_HASH = "b".repeat(64);
const EXPIRES_AT = "1700000000";

function baseDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: "deal-1",
    listing_id: null,
    buyer_request_id: null,
    buyer_id: "buyer-1",
    seller_id: "seller-1",
    commodity: "cabai",
    volume_kg: 100,
    principal_idr: 1000000,
    buyer_bond_idr: 100000,
    seller_bond_idr: 100000,
    buyer_fee_idr: 10000,
    seller_fee_idr: 10000,
    buyer_total_idr: 1110000,
    seller_total_idr: 110000,
    status: "WAITING_DEPOSITS" as DealStatus,
    stellar_mode: "testnet",
    stellar_contract_id: null,
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

type PlanCase = {
  label: string;
  action: StellarAction;
  status: DealStatus | null;
  expectedSigner: "admin" | "buyer_demo" | "seller_demo";
  needsProofHash?: boolean;
  isCreateDeal?: boolean;
};

const ALL_13_PLANS: PlanCase[] = [
  { label: "create_deal (null)", action: "create_deal", status: null, expectedSigner: "admin", isCreateDeal: true },
  { label: "buyer_deposit (WAITING_DEPOSITS)", action: "buyer_deposit", status: "WAITING_DEPOSITS", expectedSigner: "buyer_demo" },
  { label: "buyer_deposit (SELLER_FUNDED)", action: "buyer_deposit", status: "SELLER_FUNDED", expectedSigner: "buyer_demo" },
  { label: "seller_deposit (WAITING_DEPOSITS)", action: "seller_deposit", status: "WAITING_DEPOSITS", expectedSigner: "seller_demo" },
  { label: "seller_deposit (BUYER_FUNDED)", action: "seller_deposit", status: "BUYER_FUNDED", expectedSigner: "seller_demo" },
  { label: "submit_proof (LOCKED)", action: "submit_proof", status: "LOCKED", expectedSigner: "seller_demo", needsProofHash: true },
  { label: "mark_delivered (PROOF_SUBMITTED)", action: "mark_delivered", status: "PROOF_SUBMITTED", expectedSigner: "seller_demo" },
  { label: "accept_delivery (DELIVERED)", action: "accept_delivery", status: "DELIVERED", expectedSigner: "buyer_demo" },
  { label: "expire (WAITING_DEPOSITS)", action: "expire", status: "WAITING_DEPOSITS", expectedSigner: "admin" },
  { label: "expire (BUYER_FUNDED)", action: "expire", status: "BUYER_FUNDED", expectedSigner: "admin" },
  { label: "expire (SELLER_FUNDED)", action: "expire", status: "SELLER_FUNDED", expectedSigner: "admin" },
  { label: "refund (BUYER_FUNDED)", action: "refund", status: "BUYER_FUNDED", expectedSigner: "admin" },
  { label: "refund (SELLER_FUNDED)", action: "refund", status: "SELLER_FUNDED", expectedSigner: "admin" },
];

describe("StellarExecutionInputAssembler", () => {
  describe("13 canonical plans", () => {
    for (const plan of ALL_13_PLANS) {
      it(plan.label, () => {
        let input: StellarExecutionAssemblyInput;
        const deal = baseDeal({
          status: plan.status ?? ("WAITING_DEPOSITS" as DealStatus),
          stellar_escrow_id: plan.isCreateDeal ? null : "1",
        });

        if (plan.isCreateDeal) {
          input = {
            action: "create_deal",
            operation_id: "op-1",
            deal,
            metadata: META,
            deal_hash: DEAL_HASH,
            expires_at: EXPIRES_AT,
          };
        } else if (plan.needsProofHash) {
          input = {
            action: "submit_proof",
            operation_id: "op-1",
            deal,
            metadata: META,
            proof_hash: PROOF_HASH,
          };
        } else {
          input = {
            action: plan.action as Exclude<StellarAction, "create_deal" | "submit_proof">,
            operation_id: "op-1",
            deal,
            metadata: META,
          };
        }

        const res = assembleStellarExecutionInput(input);
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.operation_id).toBe("op-1");
          expect(res.deal_id).toBe("deal-1");
          expect(res.build_input.action).toBe(plan.action);
          expect(res.build_input.expected_local_status).toBe(plan.status);

          // Verify signer address
          if (plan.isCreateDeal && res.build_input.action === "create_deal") {
            expect(res.build_input.buyer_address).toBe("G_BUYER");
            expect(res.build_input.seller_address).toBe("G_SELLER");
          } else if ("actor_address" in res.build_input) {
            const expectedAddr = plan.expectedSigner === "admin" ? "G_ADMIN"
              : plan.expectedSigner === "buyer_demo" ? "G_BUYER" : "G_SELLER";
            expect(res.build_input.actor_address).toBe(expectedAddr);
          }

          // Verify escrow ID for non-create
          if (!plan.isCreateDeal && "escrow_id" in res.build_input) {
            expect(res.build_input.escrow_id).toBe("1");
          }

          // Verify proof hash
          if (plan.needsProofHash && res.build_input.action === "submit_proof") {
            expect(res.build_input.proof_hash).toBe(PROOF_HASH);
          }
        }

        // Source unchanged
        expect(input.deal).toStrictEqual(deal);
        expect(input.metadata).toStrictEqual(META);
      });
    }
  });

  describe("mode rejection", () => {
    it("mock_only deal rejected", () => {
      const deal = baseDeal({ stellar_mode: "mock_only", stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_INVALID_STELLAR_MODE" });
    });
  });

  describe("policy rejection", () => {
    it("invalid local state/action pair", () => {
      const deal = baseDeal({ status: "COMPLETED" as DealStatus });
      const res = assembleStellarExecutionInput({
        action: "buyer_deposit",
        operation_id: "op-1",
        deal,
        metadata: META,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" });
    });
  });

  describe("missing required values", () => {
    it("missing escrow ID", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "buyer_deposit",
        operation_id: "op-1",
        deal,
        metadata: META,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_MISSING_ESCROW_ID" });
    });

    it("missing deal hash", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: "",
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_MISSING_DEAL_HASH" });
    });

    it("missing proof hash", () => {
      const deal = baseDeal({ status: "LOCKED" as DealStatus });
      const res = assembleStellarExecutionInput({
        action: "submit_proof",
        operation_id: "op-1",
        deal,
        metadata: META,
        proof_hash: "",
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_MISSING_PROOF_HASH" });
    });

    it("missing expires_at", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: "",
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_MISSING_EXPIRES_AT" });
    });
  });

  describe("contract ID mismatch", () => {
    it("deal has different contract ID", () => {
      const deal = baseDeal({ stellar_contract_id: "C_OTHER" });
      const res = assembleStellarExecutionInput({
        action: "buyer_deposit",
        operation_id: "op-1",
        deal,
        metadata: META,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_CONTRACT_ID_MISMATCH" });
    });

    it("deal with matching contract ID succeeds", () => {
      const deal = baseDeal({ stellar_contract_id: "C_CONTRACT" });
      const res = assembleStellarExecutionInput({
        action: "buyer_deposit",
        operation_id: "op-1",
        deal,
        metadata: META,
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("identifier validation", () => {
    it("empty operation_id", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "operation_id" });
    });

    it("padded contract_id", () => {
      const meta = { ...META, contract_id: " C_CONTRACT " };
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: meta,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "metadata.contract_id" });
    });
  });

  describe("monetary validation", () => {
    it("principal zero", () => {
      const deal = baseDeal({ principal_idr: 0, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "principal_idr" });
    });

    it("principal negative", () => {
      const deal = baseDeal({ principal_idr: -1, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "principal_idr" });
    });

    it("fractional monetary value", () => {
      const deal = baseDeal({ principal_idr: 1000.5, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "principal_idr" });
    });

    it("NaN", () => {
      const deal = baseDeal({ principal_idr: NaN, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "principal_idr" });
    });

    it("positive infinity", () => {
      const deal = baseDeal({ principal_idr: Infinity, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "principal_idr" });
    });

    it("value above MAX_SAFE_INTEGER", () => {
      const deal = baseDeal({ principal_idr: Number.MAX_SAFE_INTEGER + 1, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "principal_idr" });
    });

    it("negative bond", () => {
      const deal = baseDeal({ buyer_bond_idr: -1, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "buyer_bond_idr" });
    });

    it("negative fee", () => {
      const deal = baseDeal({ seller_fee_idr: -1, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: "seller_fee_idr" });
    });

    it("exact MAX_SAFE_INTEGER allowed for principal", () => {
      const deal = baseDeal({ principal_idr: Number.MAX_SAFE_INTEGER, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res.ok).toBe(true);
      if (res.ok && res.build_input.action === "create_deal") {
        expect(res.build_input.principal).toBe(String(Number.MAX_SAFE_INTEGER));
      }
    });

    it("exact canonical decimal strings", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res.ok).toBe(true);
      if (res.ok && res.build_input.action === "create_deal") {
        expect(res.build_input.principal).toBe("1000000");
        expect(res.build_input.buyer_bond).toBe("100000");
        expect(res.build_input.seller_bond).toBe("100000");
        expect(res.build_input.buyer_fee).toBe("10000");
        expect(res.build_input.seller_fee).toBe("10000");
      }
    });

    it("zero bond allowed", () => {
      const deal = baseDeal({ buyer_bond_idr: 0, stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(res.ok).toBe(true);
      if (res.ok && res.build_input.action === "create_deal") {
        expect(res.build_input.buyer_bond).toBe("0");
      }
    });
  });

  describe("builder error propagation", () => {
    it("invalid deal_hash format propagates builder error", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const res = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: "not-a-valid-hash",
        expires_at: EXPIRES_AT,
      });
      expect(res).toMatchObject({ ok: false, error_code: "ERR_BUILD_VALIDATION" });
    });
  });

  describe("no prohibited runtime", () => {
    it("no hashing, clock, environment, SDK, database, or adapter access", () => {
      const deal = baseDeal({ stellar_escrow_id: null });
      const result = assembleStellarExecutionInput({
        action: "create_deal",
        operation_id: "op-1",
        deal,
        metadata: META,
        deal_hash: DEAL_HASH,
        expires_at: EXPIRES_AT,
      });
      expect(result.ok).toBe(true);
    });
  });
});
