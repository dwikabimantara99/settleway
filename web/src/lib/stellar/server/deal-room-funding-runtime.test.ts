import { describe, expect, it } from "vitest";
import type { DbDeal } from "@/lib/db/types";
import type { DealStatus } from "@/lib/escrow/state-machine";
import {
  buildDealRoomExecutionMetadata,
  composeDealRoomFundingRuntime,
} from "./deal-room-funding-runtime";

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: "deal-1",
    listing_id: null,
    buyer_request_id: null,
    buyer_id: "buyer-1",
    seller_id: "seller-1",
    commodity: "Red Chili",
    volume_kg: 700,
    principal_idr: 19950000,
    buyer_bond_idr: 747500,
    seller_bond_idr: 747500,
    buyer_fee_idr: 99750,
    seller_fee_idr: 99750,
    buyer_total_idr: 20547250,
    seller_total_idr: 847250,
    status: "WAITING_DEPOSITS" as DealStatus,
    stellar_mode: "testnet",
    stellar_contract_id: null,
    stellar_escrow_id: "escrow-1",
    latest_stellar_tx_hash: null,
    stellar_sync_status: "idle",
    proof_hash: null,
    terms: {},
    created_at: "2026-06-17T10:00:00.000Z",
    updated_at: "2026-06-17T10:00:00.000Z",
    ...overrides,
  };
}

describe("deal room funding runtime", () => {
  it("composes a signer-safe buyer funding intent from waiting deposits", () => {
    const result = composeDealRoomFundingRuntime({
      deal: makeDeal({ status: "WAITING_DEPOSITS" }),
      action: "buyer_deposit",
      contract_id: "C_CONTRACT_123",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.funding_intent).toMatchObject({
        participant_role: "buyer",
        counterparty_role: "seller",
        signer_role: "buyer_demo",
        actor_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
        commitment_idr: 20547250,
        expected_local_status: "WAITING_DEPOSITS",
        target_local_status: "BUYER_FUNDED",
        commercial_value_idr: 19950000,
      });
      expect(result.context.public_proof).toMatchObject({
        contract_id: "C_CONTRACT_123",
        funding_action: "buyer_deposit",
        target_local_status: "BUYER_FUNDED",
      });
      expect(result.context.role_wallets.platform.signer_role).toBe("admin");
    }
  });

  it("marks seller funding as lock-producing when buyer already funded", () => {
    const result = composeDealRoomFundingRuntime({
      deal: makeDeal({ status: "BUYER_FUNDED" }),
      action: "seller_deposit",
      contract_id: "C_CONTRACT_123",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.funding_intent).toMatchObject({
        participant_role: "seller",
        counterparty_role: "buyer",
        signer_role: "seller_demo",
        actor_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
        commitment_idr: 847250,
        expected_local_status: "BUYER_FUNDED",
        target_local_status: "LOCKED",
      });
      expect(result.context.public_proof.status_note).toContain(
        "protected lock",
      );
    }
  });

  it("rejects a blank contract id", () => {
    const result = composeDealRoomFundingRuntime({
      deal: makeDeal(),
      action: "buyer_deposit",
      contract_id: "  ",
    });

    expect(result).toEqual({
      ok: false,
      error_code: "ERR_INVALID_CONTRACT_ID",
      field: "contract_id",
    });
  });

  it("rejects a configured contract that conflicts with the deal contract", () => {
    const result = composeDealRoomFundingRuntime({
      deal: makeDeal({ stellar_contract_id: "C_EXISTING_1" }),
      action: "buyer_deposit",
      contract_id: "C_EXISTING_2",
    });

    expect(result).toEqual({
      ok: false,
      error_code: "ERR_CONTRACT_ID_CONFLICT",
    });
  });

  it("rejects deposit actions that are invalid for the deal state", () => {
    const result = composeDealRoomFundingRuntime({
      deal: makeDeal({ status: "LOCKED" }),
      action: "buyer_deposit",
      contract_id: "C_CONTRACT_123",
    });

    expect(result).toEqual({
      ok: false,
      error_code: "ERR_ACTION_POLICY_MISMATCH",
    });
  });

  it("builds public execution metadata from the frozen Testnet identities", () => {
    expect(buildDealRoomExecutionMetadata("C_CONTRACT_123")).toEqual({
      contract_id: "C_CONTRACT_123",
      admin_address: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
      buyer_demo_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
      seller_demo_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
    });
  });
});
