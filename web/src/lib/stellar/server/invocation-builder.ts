import type { DealStatus } from "@/lib/escrow/state-machine";
import { isValidU64DecimalString } from "@/lib/stellar/helpers";
import { resolveStellarActionPlan } from "./action-policy";
import type { StellarContractArgument, StellarPreparedInvocation } from "./adapter-contracts";

export type StellarInvocationErrorCode =
  | "ERR_INVALID_STATE"
  | "ERR_MISSING_REQUIRED_VALUE"
  | "ERR_INVALID_IDENTIFIER"
  | "ERR_MALFORMED_U64"
  | "ERR_U64_OUT_OF_RANGE"
  | "ERR_MALFORMED_I128"
  | "ERR_I128_OUT_OF_RANGE"
  | "ERR_MALFORMED_BYTES32";

export type StellarInvocationErrorField =
  | "contract_id"
  | "deal_hash"
  | "buyer_address"
  | "seller_address"
  | "principal"
  | "buyer_bond"
  | "seller_bond"
  | "buyer_fee"
  | "seller_fee"
  | "expires_at"
  | "escrow_id"
  | "actor_address"
  | "proof_hash"
  | "expected_local_status";

export type StellarInvocationBuildInput =
  | {
      action: "create_deal";
      expected_local_status: DealStatus | null;
      contract_id: string;
      deal_hash: string;
      buyer_address: string;
      seller_address: string;
      principal: string;
      buyer_bond: string;
      seller_bond: string;
      buyer_fee: string;
      seller_fee: string;
      expires_at: string;
    }
  | {
      action: "buyer_deposit";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
      actor_address: string;
    }
  | {
      action: "seller_deposit";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
      actor_address: string;
    }
  | {
      action: "submit_proof";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
      actor_address: string;
      proof_hash: string;
    }
  | {
      action: "mark_delivered";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
      actor_address: string;
    }
  | {
      action: "accept_delivery";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
      actor_address: string;
    }
  | {
      action: "expire";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
    }
  | {
      action: "refund";
      expected_local_status: DealStatus | null;
      contract_id: string;
      escrow_id: string;
    };

export type StellarInvocationBuildResult =
  | {
      ok: true;
      invocation: StellarPreparedInvocation;
    }
  | {
      ok: false;
      error_code: StellarInvocationErrorCode;
      field?: StellarInvocationErrorField;
    };

function validateOpaqueIdentifier(value: string, field: StellarInvocationErrorField): StellarInvocationBuildResult | null {
  if (value.trim() === "") {
    return { ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field };
  }
  if (value !== value.trim()) {
    return { ok: false, error_code: "ERR_INVALID_IDENTIFIER", field };
  }
  return null;
}

function validateU64(value: string, field: StellarInvocationErrorField): StellarInvocationBuildResult | null {
  if (value.trim() === "") {
    return { ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field };
  }
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    return { ok: false, error_code: "ERR_MALFORMED_U64", field };
  }
  if (!isValidU64DecimalString(value)) {
    return { ok: false, error_code: "ERR_U64_OUT_OF_RANGE", field };
  }
  return null;
}

function validateI128(value: string, field: StellarInvocationErrorField): StellarInvocationBuildResult | null {
  if (value.trim() === "") {
    return { ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field };
  }
  if (!/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(value)) {
    return { ok: false, error_code: "ERR_MALFORMED_I128", field };
  }
  if (value === "-0") {
    return { ok: false, error_code: "ERR_MALFORMED_I128", field };
  }
  const min = BigInt("-170141183460469231731687303715884105728");
  const max = BigInt("170141183460469231731687303715884105727");
  try {
    const num = BigInt(value);
    if (num < min || num > max) {
      return { ok: false, error_code: "ERR_I128_OUT_OF_RANGE", field };
    }
  } catch {
    return { ok: false, error_code: "ERR_MALFORMED_I128", field };
  }
  return null;
}

function validateBytes32(value: string, field: StellarInvocationErrorField): StellarInvocationBuildResult | null {
  if (value.trim() === "") {
    return { ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field };
  }
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    return { ok: false, error_code: "ERR_MALFORMED_BYTES32", field };
  }
  return null;
}

export function buildStellarInvocation(
  input: StellarInvocationBuildInput,
): StellarInvocationBuildResult {
  const planResult = resolveStellarActionPlan(
    input.action,
    input.expected_local_status,
  );

  if (!planResult.ok) {
    return {
      ok: false,
      error_code: "ERR_INVALID_STATE",
      field: "expected_local_status",
    };
  }

  const cidErr = validateOpaqueIdentifier(input.contract_id, "contract_id");
  if (cidErr) return cidErr;

  let args: StellarContractArgument[] = [];

  switch (input.action) {
    case "create_deal": {
      const dhErr = validateBytes32(input.deal_hash, "deal_hash");
      if (dhErr) return dhErr;
      const baErr = validateOpaqueIdentifier(input.buyer_address, "buyer_address");
      if (baErr) return baErr;
      const saErr = validateOpaqueIdentifier(input.seller_address, "seller_address");
      if (saErr) return saErr;
      const pErr = validateI128(input.principal, "principal");
      if (pErr) return pErr;
      const bbErr = validateI128(input.buyer_bond, "buyer_bond");
      if (bbErr) return bbErr;
      const sbErr = validateI128(input.seller_bond, "seller_bond");
      if (sbErr) return sbErr;
      const bfErr = validateI128(input.buyer_fee, "buyer_fee");
      if (bfErr) return bfErr;
      const sfErr = validateI128(input.seller_fee, "seller_fee");
      if (sfErr) return sfErr;
      const eaErr = validateU64(input.expires_at, "expires_at");
      if (eaErr) return eaErr;

      args = [
        { kind: "bytes32", value: input.deal_hash.toLowerCase() },
        { kind: "address", value: input.buyer_address },
        { kind: "address", value: input.seller_address },
        { kind: "i128", value: input.principal },
        { kind: "i128", value: input.buyer_bond },
        { kind: "i128", value: input.seller_bond },
        { kind: "i128", value: input.buyer_fee },
        { kind: "i128", value: input.seller_fee },
        { kind: "u64", value: input.expires_at },
      ];
      break;
    }
    case "buyer_deposit":
    case "seller_deposit":
    case "mark_delivered":
    case "accept_delivery": {
      const escErr = validateU64(input.escrow_id, "escrow_id");
      if (escErr) return escErr;
      const actErr = validateOpaqueIdentifier(input.actor_address, "actor_address");
      if (actErr) return actErr;

      args = [
        { kind: "u64", value: input.escrow_id },
        { kind: "address", value: input.actor_address },
      ];
      break;
    }
    case "submit_proof": {
      const escErr = validateU64(input.escrow_id, "escrow_id");
      if (escErr) return escErr;
      const actErr = validateOpaqueIdentifier(input.actor_address, "actor_address");
      if (actErr) return actErr;
      const prfErr = validateBytes32(input.proof_hash, "proof_hash");
      if (prfErr) return prfErr;

      args = [
        { kind: "u64", value: input.escrow_id },
        { kind: "address", value: input.actor_address },
        { kind: "bytes32", value: input.proof_hash.toLowerCase() },
      ];
      break;
    }
    case "expire":
    case "refund": {
      const escErr = validateU64(input.escrow_id, "escrow_id");
      if (escErr) return escErr;

      args = [
        { kind: "u64", value: input.escrow_id },
      ];
      break;
    }
  }

  return {
    ok: true,
    invocation: {
      action: input.action,
      method: planResult.plan.stellar_method,
      signer_role: planResult.plan.signer_role,
      contract_id: input.contract_id,
      arguments: args,
    },
  };
}
