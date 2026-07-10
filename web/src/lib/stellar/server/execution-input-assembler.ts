import type { DbDeal } from "@/lib/db/types";
import type { StellarAction } from "@/lib/stellar/types";
import type { DealStatus } from "@/lib/escrow/state-machine";
import type { StellarInvocationBuildInput } from "./invocation-builder";
import { resolveStellarActionPlan } from "./action-policy";
import type { StellarSignerRole } from "./action-policy";
import {
  buildStellarInvocation,
  type StellarInvocationErrorCode,
  type StellarInvocationErrorField,
} from "./invocation-builder";

export interface StellarExecutionPublicMetadata {
  contract_id: string;
  admin_address: string;
  buyer_demo_address: string;
  seller_demo_address: string;
  token_address?: string;
  fee_recipient?: string;
}

export type StellarExecutionAssemblyInput =
  | {
      action: "create_deal" | "create_deal_custody";
      operation_id: string;
      deal: DbDeal;
      metadata: StellarExecutionPublicMetadata;
      deal_hash: string;
      expires_at: string;
    }
  | {
      action: "submit_proof" | "submit_proof_custody";
      operation_id: string;
      deal: DbDeal;
      metadata: StellarExecutionPublicMetadata;
      proof_hash: string;
    }
  | {
      action: Exclude<StellarAction, "create_deal" | "create_deal_custody" | "submit_proof" | "submit_proof_custody" | "expire_proof" | "reject_delivery">;
      operation_id: string;
      deal: DbDeal;
      metadata: StellarExecutionPublicMetadata;
    };

export interface StellarExecutionAssemblySuccess {
  ok: true;
  operation_id: string;
  deal_id: string;
  build_input: StellarInvocationBuildInput;
}

export type StellarExecutionAssemblyErrorCode =
  | "ERR_INVALID_IDENTIFIER"
  | "ERR_INVALID_STELLAR_MODE"
  | "ERR_OPERATION_POLICY_MISMATCH"
  | "ERR_CONTRACT_ID_MISMATCH"
  | "ERR_MISSING_ESCROW_ID"
  | "ERR_MISSING_DEAL_HASH"
  | "ERR_MISSING_PROOF_HASH"
  | "ERR_MISSING_EXPIRES_AT"
  | "ERR_UNSAFE_MONETARY_VALUE"
  | "ERR_BUILD_VALIDATION";

export type StellarExecutionAssemblyMonetaryField =
  | "principal_idr"
  | "buyer_bond_idr"
  | "seller_bond_idr"
  | "buyer_fee_idr"
  | "seller_fee_idr";

export type StellarExecutionAssemblyFailure =
  | {
      ok: false;
      error_code: "ERR_INVALID_IDENTIFIER";
      field: string;
    }
  | {
      ok: false;
      error_code: "ERR_INVALID_STELLAR_MODE";
    }
  | {
      ok: false;
      error_code: "ERR_OPERATION_POLICY_MISMATCH";
    }
  | {
      ok: false;
      error_code: "ERR_CONTRACT_ID_MISMATCH";
    }
  | {
      ok: false;
      error_code: "ERR_MISSING_ESCROW_ID";
    }
  | {
      ok: false;
      error_code: "ERR_MISSING_DEAL_HASH";
    }
  | {
      ok: false;
      error_code: "ERR_MISSING_PROOF_HASH";
    }
  | {
      ok: false;
      error_code: "ERR_MISSING_EXPIRES_AT";
    }
  | {
      ok: false;
      error_code: "ERR_UNSAFE_MONETARY_VALUE";
      field: StellarExecutionAssemblyMonetaryField;
    }
  | {
      ok: false;
      error_code: "ERR_BUILD_VALIDATION";
      builder_error_code: StellarInvocationErrorCode;
      builder_field?: StellarInvocationErrorField;
    };

export type StellarExecutionAssemblyResult =
  | StellarExecutionAssemblySuccess
  | StellarExecutionAssemblyFailure;

function isValidIdentifier(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value !== "" && value.trim() !== "" && value === value.trim();
}

function isSafeMonetaryInteger(value: number): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value)
  );
}

function resolveActorAddress(
  signerRole: StellarSignerRole,
  metadata: StellarExecutionPublicMetadata,
): string {
  switch (signerRole) {
    case "admin":
      return metadata.admin_address;
    case "buyer_demo":
      return metadata.buyer_demo_address;
    case "seller_demo":
      return metadata.seller_demo_address;
  }
}

export function assembleStellarExecutionInput(
  input: StellarExecutionAssemblyInput,
): StellarExecutionAssemblyResult {
  // Validate identifiers
  if (!isValidIdentifier(input.operation_id)) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "operation_id" };
  }
  if (!isValidIdentifier(input.deal.id)) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "deal.id" };
  }
  if (!isValidIdentifier(input.metadata.contract_id)) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "metadata.contract_id" };
  }
  if (!isValidIdentifier(input.metadata.admin_address)) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "metadata.admin_address" };
  }
  if (!isValidIdentifier(input.metadata.buyer_demo_address)) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "metadata.buyer_demo_address" };
  }
  if (!isValidIdentifier(input.metadata.seller_demo_address)) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "metadata.seller_demo_address" };
  }

  // Mode check
  if (input.deal.stellar_mode !== "testnet") {
    return { ok: false, error_code: "ERR_INVALID_STELLAR_MODE" };
  }

  // Determine expected local status
  const expectedLocalStatus: DealStatus | null =
    input.action === "create_deal" ? "WAITING_DEPOSITS" : input.deal.status;

  // Resolve canonical plan
  const planResult = resolveStellarActionPlan(input.action, expectedLocalStatus);
  if (!planResult.ok) {
    return { ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" };
  }

  // Contract ID validation
  if (
    input.deal.stellar_contract_id !== null &&
    input.deal.stellar_contract_id !== input.metadata.contract_id
  ) {
    return { ok: false, error_code: "ERR_CONTRACT_ID_MISMATCH" };
  }

  const contractId = input.metadata.contract_id;

  // Build action-specific input
  let buildInput: StellarInvocationBuildInput;

  if (input.action === "create_deal" || input.action === "create_deal_custody") {
    // Validate deal_hash
    if (!input.deal_hash || input.deal_hash.trim() === "") {
      return { ok: false, error_code: "ERR_MISSING_DEAL_HASH" };
    }
    // Validate expires_at
    if (!input.expires_at || input.expires_at.trim() === "") {
      return { ok: false, error_code: "ERR_MISSING_EXPIRES_AT" };
    }

    // Monetary validation
    const monetaryChecks: Array<{ field: StellarExecutionAssemblyMonetaryField; value: number; mustBePositive: boolean }> = [
      { field: "principal_idr", value: input.deal.principal_idr, mustBePositive: true },
      { field: "buyer_bond_idr", value: input.deal.buyer_bond_idr, mustBePositive: false },
      { field: "seller_bond_idr", value: input.deal.seller_bond_idr, mustBePositive: false },
      { field: "buyer_fee_idr", value: input.deal.buyer_fee_idr, mustBePositive: false },
      { field: "seller_fee_idr", value: input.deal.seller_fee_idr, mustBePositive: false },
    ];

    for (const check of monetaryChecks) {
      if (!isSafeMonetaryInteger(check.value)) {
        return { ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: check.field };
      }
      if (check.mustBePositive && check.value <= 0) {
        return { ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: check.field };
      }
      if (!check.mustBePositive && check.value < 0) {
        return { ok: false, error_code: "ERR_UNSAFE_MONETARY_VALUE", field: check.field };
      }
    }

    if (input.action === "create_deal") {
      buildInput = {
        action: "create_deal",
        expected_local_status: expectedLocalStatus,
        contract_id: contractId,
        deal_hash: input.deal_hash,
        buyer_address: input.metadata.buyer_demo_address,
        seller_address: input.metadata.seller_demo_address,
        principal: String(input.deal.principal_idr),
        buyer_bond: String(input.deal.buyer_bond_idr),
        seller_bond: String(input.deal.seller_bond_idr),
        buyer_fee: String(input.deal.buyer_fee_idr),
        seller_fee: String(input.deal.seller_fee_idr),
        expires_at: input.expires_at,
      };
    } else {
      // create_deal_custody
      buildInput = {
        action: "create_deal_custody",
        expected_local_status: expectedLocalStatus,
        contract_id: contractId,
        deal_hash: input.deal_hash,
        token_address: input.metadata.token_address || "CBY4...", // We'll need token_address in metadata
        fee_recipient: input.metadata.fee_recipient || "GD...", // We'll need fee_recipient in metadata
        buyer_address: input.metadata.buyer_demo_address,
        seller_address: input.metadata.seller_demo_address,
        principal: String(input.deal.principal_idr),
        buyer_bond: String(input.deal.buyer_bond_idr),
        seller_bond: String(input.deal.seller_bond_idr),
        buyer_fee: String(input.deal.buyer_fee_idr),
        seller_fee: String(input.deal.seller_fee_idr),
        expires_at: input.expires_at,
      };
    }
  } else {
    // Existing-deal actions require escrow_id
    if (input.deal.stellar_escrow_id === null) {
      return { ok: false, error_code: "ERR_MISSING_ESCROW_ID" };
    }

    const escrowId = input.deal.stellar_escrow_id;
    const actorAddress = resolveActorAddress(planResult.plan.signer_role, input.metadata);

    if (input.action === "submit_proof" || input.action === "submit_proof_custody") {
      if (!input.proof_hash || input.proof_hash.trim() === "") {
        return { ok: false, error_code: "ERR_MISSING_PROOF_HASH" };
      }
      buildInput = {
        action: input.action,
        expected_local_status: expectedLocalStatus,
        contract_id: contractId,
        escrow_id: escrowId,
        actor_address: actorAddress,
        proof_hash: input.proof_hash,
      };
    } else if (input.action === "expire" || input.action === "refund" || input.action === "expire_custody" || input.action === "refund_custody") {
      buildInput = {
        action: input.action,
        expected_local_status: expectedLocalStatus,
        contract_id: contractId,
        escrow_id: escrowId,
      };
    } else if (
      input.action === "buyer_deposit" ||
      input.action === "seller_deposit" ||
      input.action === "buyer_deposit_custody" ||
      input.action === "seller_deposit_custody" ||
      input.action === "accept_delivery" ||
      input.action === "accept_delivery_custody"
    ) {
      buildInput = {
        action: input.action as "buyer_deposit" | "seller_deposit" | "buyer_deposit_custody" | "seller_deposit_custody" | "accept_delivery" | "accept_delivery_custody",
        expected_local_status: expectedLocalStatus,
        idempotency_scope: input.action.includes("seller_deposit") ? input.deal.seller_id : input.deal.buyer_id,
        contract_id: contractId,
        escrow_id: escrowId,
        actor_address: actorAddress,
      };
    } else {
      buildInput = {
        action: input.action as never, // mark_delivered, mark_delivered_custody etc
        expected_local_status: expectedLocalStatus,
        contract_id: contractId,
        escrow_id: escrowId,
        actor_address: actorAddress,
      };
    }
  }

  // Final structural validation through builder
  const buildResult = buildStellarInvocation(buildInput);
  if (!buildResult.ok) {
    return {
      ok: false,
      error_code: "ERR_BUILD_VALIDATION",
      builder_error_code: buildResult.error_code,
      ...(buildResult.field !== undefined ? { builder_field: buildResult.field } : {}),
    };
  }

  return {
    ok: true,
    operation_id: input.operation_id,
    deal_id: input.deal.id,
    build_input: buildInput,
  };
}
