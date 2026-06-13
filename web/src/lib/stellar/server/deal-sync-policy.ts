import type { DealStellarSyncStatus, StellarMode } from "../types";

export type ProjectDealSyncStatusInput = {
  stellar_mode: StellarMode;
  operation_status: "pending" | "submitted" | "failed" | "unknown" | "confirmed";
  deal_persistence_success: boolean | null;
};

export function projectDealSyncStatus(
  input: ProjectDealSyncStatusInput
): DealStellarSyncStatus {
  if (input.stellar_mode === "mock_only") {
    return "idle";
  }

  if (input.operation_status === "pending" || input.operation_status === "submitted") {
    return "pending";
  }

  if (input.operation_status === "failed") {
    return "idle";
  }

  if (input.operation_status === "unknown") {
    return "unknown";
  }

  if (input.operation_status === "confirmed") {
    if (input.deal_persistence_success === true) {
      return "idle";
    }
    if (input.deal_persistence_success === false) {
      return "out_of_sync";
    }
    // If null (e.g. no local commit), then confirmed doesn't change sync status to out_of_sync immediately unless we failed.
    // Wait, the policy says: "confirmed success + local deal persistence success → idle", "confirmed success + local deal persistence failure → out_of_sync"
    // What if there is no local commit to persist? Then success is implicitly true for synchronization.
    // The policy just projects based on the boolean.
  }

  return "idle"; // Fallback, though we shouldn't really hit this if we cover all branches for confirmed
}
