import type { DealStatus } from "@/lib/escrow/state-machine";
import type {
  CanonicalDealHashInput,
  StellarAction,
  StellarOperationStatus,
} from "./types";

export function createStellarIdempotencyKey(
  dealId: string,
  scope: string | null,
  action: StellarAction,
): string {
  if (!dealId || dealId.trim() === "") {
    throw new Error("Deal ID cannot be empty");
  }
  let scopeMarker = scope ? scope : "CREATE";
  if (action === 'buyer_deposit' || action === 'seller_deposit') {
    scopeMarker = scope ? `${scope}:DEPOSIT` : "DEPOSIT";
  }
  return `v1:${encodeURIComponent(dealId)}:${encodeURIComponent(scopeMarker)}:${encodeURIComponent(action)}`;
}

export function buildCanonicalDealHashInput(
  input: CanonicalDealHashInput,
): string {
  if (input.version !== "1") {
    throw new Error("Version must be '1'");
  }
  if (!input.deal_id || input.deal_id.trim() === "") {
    throw new Error("Invalid deal_id");
  }
  if (!input.buyer_id || input.buyer_id.trim() === "") {
    throw new Error("Invalid buyer_id");
  }
  if (!input.seller_id || input.seller_id.trim() === "") {
    throw new Error("Invalid seller_id");
  }
  if (!input.commodity || input.commodity.trim() === "") {
    throw new Error("Invalid commodity");
  }

  const commodity = input.commodity.trim().toLowerCase();

  const volumeRegex = /^(0\.[0-9]*[1-9]|[1-9][0-9]*(\.[0-9]*[1-9])?)$/;
  if (!volumeRegex.test(input.volume_kg)) {
    throw new Error("Invalid volume_kg format");
  }

  const principalRegex = /^[1-9][0-9]*$/;
  if (!principalRegex.test(input.principal_idr)) {
    throw new Error("Invalid principal_idr format");
  }

  return JSON.stringify({
    version: input.version,
    deal_id: input.deal_id.trim(),
    buyer_id: input.buyer_id.trim(),
    seller_id: input.seller_id.trim(),
    commodity: commodity,
    volume_kg: input.volume_kg,
    principal_idr: input.principal_idr,
  });
}

export function isValidU64DecimalString(value: string): boolean {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return false;
  try {
    const num = BigInt(value);
    return num >= BigInt(0) && num <= BigInt("18446744073709551615");
  } catch {
    return false;
  }
}

export function canTransitionStellarOperation(
  current: StellarOperationStatus,
  next: StellarOperationStatus,
): boolean {
  if (current === "pending" && next === "submitted") return true;
  if (current === "pending" && next === "failed") return true;
  if (current === "submitted" && next === "confirmed") return true;
  if (current === "submitted" && next === "failed") return true;
  if (current === "submitted" && next === "unknown") return true;
  if (current === "unknown" && next === "confirmed") return true;
  if (current === "unknown" && next === "failed") return true;
  return false;
}
