import { describe, it, expect } from "vitest";
import { projectDealSyncStatus } from "./deal-sync-policy";

describe("Deal Sync Policy", () => {
  it("mock_only → idle", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "mock_only",
      operation_status: "pending",
      deal_persistence_success: null,
    })).toBe("idle");
  });

  it("pending operation → pending", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "pending",
      deal_persistence_success: null,
    })).toBe("pending");
  });

  it("submitted operation → pending", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "submitted",
      deal_persistence_success: null,
    })).toBe("pending");
  });

  it("pre-submit failure → idle", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "failed",
      deal_persistence_success: null,
    })).toBe("idle");
  });

  it("confirmed contract failure → idle", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "failed", // Failed operations result in idle, whether pre-submit or contract.
      deal_persistence_success: null,
    })).toBe("idle");
  });

  it("unknown operation → unknown", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "unknown",
      deal_persistence_success: null,
    })).toBe("unknown");
  });

  it("confirmed success + local deal persistence success → idle", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "confirmed",
      deal_persistence_success: true,
    })).toBe("idle");
  });

  it("confirmed success + local deal persistence failure → out_of_sync", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "confirmed",
      deal_persistence_success: false,
    })).toBe("out_of_sync");
  });

  it("confirmed success with null persistence falls back to idle", () => {
    expect(projectDealSyncStatus({
      stellar_mode: "testnet",
      operation_status: "confirmed",
      deal_persistence_success: null,
    })).toBe("idle");
  });
});
