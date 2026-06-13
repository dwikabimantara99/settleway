import { describe, it, expect } from "vitest";
import {
  createStellarIdempotencyKey,
  buildCanonicalDealHashInput,
  isValidU64DecimalString,
  canTransitionStellarOperation,
} from "./helpers";
import type { StellarOperationStatus } from "./types";

describe("createStellarIdempotencyKey", () => {
  it("produces deterministic output for repeated identical inputs", () => {
    const key1 = createStellarIdempotencyKey("deal-1", "LOCKED", "submit_proof");
    const key2 = createStellarIdempotencyKey("deal-1", "LOCKED", "submit_proof");
    expect(key1).toBe(key2);
  });

  it("uses the exact CREATE marker when expected status is null", () => {
    const key = createStellarIdempotencyKey("deal-1", null, "create_deal");
    expect(key).toBe("v1:deal-1:CREATE:create_deal");
  });

  it("encodes delimiter-bearing IDs exactly", () => {
    const key = createStellarIdempotencyKey("deal:1", "LOCKED", "submit_proof");
    expect(key).toBe("v1:deal%3A1:LOCKED:submit_proof");
  });

  it("rejects an empty deal ID", () => {
    expect(() => createStellarIdempotencyKey("", "LOCKED", "submit_proof")).toThrowError("Deal ID cannot be empty");
  });

  it("rejects a whitespace-only deal ID", () => {
    expect(() => createStellarIdempotencyKey("   ", "LOCKED", "submit_proof")).toThrowError("Deal ID cannot be empty");
  });

  it("preserves and encodes surrounding non-empty whitespace", () => {
    const key = createStellarIdempotencyKey(" deal-1 ", "DELIVERED", "accept_delivery");
    expect(key).toBe("v1:%20deal-1%20:DELIVERED:accept_delivery");
  });
});

describe("buildCanonicalDealHashInput", () => {
  it("produces exact serialized property order for valid inputs", () => {
    const input = {
      version: "1",
      deal_id: " deal-001 ",
      buyer_id: " buyer-001 ",
      seller_id: " seller-001 ",
      commodity: "  Red Chili  ",
      volume_kg: "10.25",
      principal_idr: "25000000",
    } as const;
    const result = buildCanonicalDealHashInput(input);
    expect(result).toBe(
      '{"version":"1","deal_id":"deal-001","buyer_id":"buyer-001","seller_id":"seller-001","commodity":"red chili","volume_kg":"10.25","principal_idr":"25000000"}'
    );
  });

  it.each([
    ["1"],
    ["1.25"],
    ["10.25"],
    ["0.5"],
    ["0.05"],
  ])("accepts volume_kg: %s", (volume_kg) => {
    expect(() =>
      buildCanonicalDealHashInput({
        version: "1",
        deal_id: "d1",
        buyer_id: "b1",
        seller_id: "s1",
        commodity: "c1",
        volume_kg,
        principal_idr: "100",
      })
    ).not.toThrow();
  });

  it.each([
    ["0"],
    ["0.0"],
    ["1.0"],
    ["1.20"],
    ["01"],
    ["01.5"],
    [".5"],
    ["1."],
    ["-1"],
    ["+1"],
    [" 1"],
    ["1 "],
    ["1e3"],
    [""],
  ])("rejects volume_kg: '%s'", (volume_kg) => {
    expect(() =>
      buildCanonicalDealHashInput({
        version: "1",
        deal_id: "d1",
        buyer_id: "b1",
        seller_id: "s1",
        commodity: "c1",
        volume_kg,
        principal_idr: "100",
      })
    ).toThrowError("Invalid volume_kg format");
  });

  it.each([
    ["1"],
    ["25000000"],
    ["999999999999999999999999"],
  ])("accepts principal_idr: %s", (principal_idr) => {
    expect(() =>
      buildCanonicalDealHashInput({
        version: "1",
        deal_id: "d1",
        buyer_id: "b1",
        seller_id: "s1",
        commodity: "c1",
        volume_kg: "1",
        principal_idr,
      })
    ).not.toThrow();
  });

  it.each([
    ["0"],
    ["00"],
    ["01"],
    ["1.0"],
    ["-1"],
    ["+1"],
    [" 1"],
    ["1 "],
    ["1e3"],
    [""],
  ])("rejects principal_idr: '%s'", (principal_idr) => {
    expect(() =>
      buildCanonicalDealHashInput({
        version: "1",
        deal_id: "d1",
        buyer_id: "b1",
        seller_id: "s1",
        commodity: "c1",
        volume_kg: "1",
        principal_idr,
      })
    ).toThrowError("Invalid principal_idr format");
  });

  it("rejects non-'1' version", () => {
    expect(() =>
      buildCanonicalDealHashInput({
        version: "2",
        deal_id: "d1",
        buyer_id: "b1",
        seller_id: "s1",
        commodity: "c1",
        volume_kg: "1",
        principal_idr: "100",
      } as unknown as Parameters<typeof buildCanonicalDealHashInput>[0])
    ).toThrowError("Version must be '1'");
  });

  it.each([
    ["deal_id", "Invalid deal_id"],
    ["buyer_id", "Invalid buyer_id"],
    ["seller_id", "Invalid seller_id"],
    ["commodity", "Invalid commodity"],
  ])("rejects empty %s", (field, errorMsg) => {
    const input: Record<string, string> = {
      version: "1",
      deal_id: "d1",
      buyer_id: "b1",
      seller_id: "s1",
      commodity: "c1",
      volume_kg: "1",
      principal_idr: "100",
    };
    input[field] = "";
    expect(() => buildCanonicalDealHashInput(input as unknown as Parameters<typeof buildCanonicalDealHashInput>[0])).toThrowError(errorMsg);
    input[field] = "   ";
    expect(() => buildCanonicalDealHashInput(input as unknown as Parameters<typeof buildCanonicalDealHashInput>[0])).toThrowError(errorMsg);
  });

  it("ignores unstable properties like created_at", () => {
    const input = {
      version: "1",
      deal_id: "d1",
      buyer_id: "b1",
      seller_id: "s1",
      commodity: "c1",
      volume_kg: "1",
      principal_idr: "100",
      created_at: "2023-01-01T00:00:00Z",
    } as unknown as Parameters<typeof buildCanonicalDealHashInput>[0];
    const result = buildCanonicalDealHashInput(input);
    expect(result).not.toContain("created_at");
    expect(result).toBe(
      '{"version":"1","deal_id":"d1","buyer_id":"b1","seller_id":"s1","commodity":"c1","volume_kg":"1","principal_idr":"100"}'
    );
  });

  it("returns a string", () => {
    const result = buildCanonicalDealHashInput({
      version: "1",
      deal_id: "d1",
      buyer_id: "b1",
      seller_id: "s1",
      commodity: "c1",
      volume_kg: "1",
      principal_idr: "100",
    });
    expect(typeof result).toBe("string");
  });
});

describe("isValidU64DecimalString", () => {
  it.each([
    ["0"],
    ["1"],
    ["18446744073709551615"],
  ])("accepts %s", (value) => {
    expect(isValidU64DecimalString(value)).toBe(true);
  });

  it.each([
    ["18446744073709551616"],
    ["00"],
    ["01"],
    ["-1"],
    ["+1"],
    ["1.0"],
    [" 1"],
    ["1 "],
    [""],
  ])("rejects '%s'", (value) => {
    expect(isValidU64DecimalString(value)).toBe(false);
  });
});

describe("canTransitionStellarOperation", () => {
  const allowedEdges = [
    ["pending", "submitted"],
    ["pending", "failed"],
    ["submitted", "confirmed"],
    ["submitted", "failed"],
    ["submitted", "unknown"],
    ["unknown", "confirmed"],
    ["unknown", "failed"],
  ];

  it("allows exact specified edges", () => {
    for (const [current, next] of allowedEdges) {
      expect(
        canTransitionStellarOperation(
          current as StellarOperationStatus,
          next as StellarOperationStatus
        )
      ).toBe(true);
    }
  });

  it("rejects all other combinations", () => {
    const statuses: StellarOperationStatus[] = [
      "pending",
      "submitted",
      "confirmed",
      "failed",
      "unknown",
    ];

    for (const current of statuses) {
      for (const next of statuses) {
        const isAllowed = allowedEdges.some(
          ([c, n]) => c === current && n === next
        );
        expect(canTransitionStellarOperation(current, next)).toBe(isAllowed);
      }
    }
  });

  it("returns false for same-status pairs", () => {
    expect(canTransitionStellarOperation("pending", "pending")).toBe(false);
    expect(canTransitionStellarOperation("confirmed", "confirmed")).toBe(false);
  });

  it("never returns to pending", () => {
    expect(canTransitionStellarOperation("submitted", "pending")).toBe(false);
    expect(canTransitionStellarOperation("unknown", "pending")).toBe(false);
    expect(canTransitionStellarOperation("failed", "pending")).toBe(false);
  });

  it("has no outbound transitions from confirmed", () => {
    expect(canTransitionStellarOperation("confirmed", "pending")).toBe(false);
    expect(canTransitionStellarOperation("confirmed", "submitted")).toBe(false);
    expect(canTransitionStellarOperation("confirmed", "failed")).toBe(false);
    expect(canTransitionStellarOperation("confirmed", "unknown")).toBe(false);
  });

  it("has no outbound transitions from failed", () => {
    expect(canTransitionStellarOperation("failed", "pending")).toBe(false);
    expect(canTransitionStellarOperation("failed", "submitted")).toBe(false);
    expect(canTransitionStellarOperation("failed", "confirmed")).toBe(false);
    expect(canTransitionStellarOperation("failed", "unknown")).toBe(false);
  });
});
