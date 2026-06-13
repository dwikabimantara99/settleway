import { describe, it, expect } from "vitest";
import { buildStellarInvocation } from "./invocation-builder";
import type { StellarInvocationBuildInput } from "./invocation-builder";
import type { DealStatus } from "@/lib/escrow/state-machine";
import type { StellarAction } from "@/lib/stellar/types";

const allStatuses: (DealStatus | null)[] = [
  null,
  "WAITING_DEPOSITS",
  "BUYER_FUNDED",
  "SELLER_FUNDED",
  "LOCKED",
  "PROOF_SUBMITTED",
  "DELIVERED",
  "COMPLETED",
  "EXPIRED",
  "REFUNDED",
  "CANCELLED",
];

const allActions: StellarAction[] = [
  "create_deal",
  "buyer_deposit",
  "seller_deposit",
  "submit_proof",
  "mark_delivered",
  "accept_delivery",
  "expire",
  "refund",
];

describe("Invocation Builder", () => {
  it("exhaustively tests 88 action/status combinations", () => {
    let validCount = 0;
    let invalidCount = 0;

    for (const action of allActions) {
      for (const expectedLocalStatus of allStatuses) {
        let input: StellarInvocationBuildInput;
        if (action === "create_deal") {
          input = {
            action,
            expected_local_status: expectedLocalStatus,
            contract_id: "C123",
            deal_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            buyer_address: "GBUY",
            seller_address: "GSEL",
            principal: "100",
            buyer_bond: "5",
            seller_bond: "5",
            buyer_fee: "1",
            seller_fee: "1",
            expires_at: "9999",
          };
        } else if (action === "submit_proof") {
          input = {
            action,
            expected_local_status: expectedLocalStatus,
            contract_id: "C123",
            escrow_id: "1",
            actor_address: "GSEL",
            proof_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          };
        } else if (action === "expire" || action === "refund") {
          input = {
            action,
            expected_local_status: expectedLocalStatus,
            contract_id: "C123",
            escrow_id: "1",
          };
        } else {
          input = {
            action,
            expected_local_status: expectedLocalStatus,
            contract_id: "C123",
            escrow_id: "1",
            actor_address: "GACTOR",
          };
        }

        const res = buildStellarInvocation(input);
        if (res.ok) {
          validCount++;
        } else {
          expect(res).toEqual({
            ok: false,
            error_code: "ERR_INVALID_STATE",
            field: "expected_local_status",
          });
          invalidCount++;
        }
      }
    }
    expect(validCount).toBe(13);
    expect(invalidCount).toBe(75);
  });

  it("produces exact 13 valid plan invocations with proper argument order", () => {
    // 1. create_deal + null
    const res1 = buildStellarInvocation({
      action: "create_deal",
      expected_local_status: null,
      contract_id: "C123",
      deal_hash: "0123456789ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef",
      buyer_address: "GBUY",
      seller_address: "GSEL",
      principal: "100",
      buyer_bond: "5",
      seller_bond: "5",
      buyer_fee: "1",
      seller_fee: "1",
      expires_at: "9999",
    } satisfies StellarInvocationBuildInput);
    expect(res1).toEqual({
      ok: true,
      invocation: {
        action: "create_deal",
        method: "create_escrow",
        signer_role: "admin",
        contract_id: "C123",
        arguments: [
          { kind: "bytes32", value: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
          { kind: "address", value: "GBUY" },
          { kind: "address", value: "GSEL" },
          { kind: "i128", value: "100" },
          { kind: "i128", value: "5" },
          { kind: "i128", value: "5" },
          { kind: "i128", value: "1" },
          { kind: "i128", value: "1" },
          { kind: "u64", value: "9999" },
        ],
      },
    });

    // 2. buyer_deposit + WAITING_DEPOSITS
    const res2 = buildStellarInvocation({
      action: "buyer_deposit",
      expected_local_status: "WAITING_DEPOSITS",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GBUY",
    } satisfies StellarInvocationBuildInput);
    expect(res2).toEqual({
      ok: true,
      invocation: {
        action: "buyer_deposit",
        method: "deposit_buyer",
        signer_role: "buyer_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GBUY" },
        ],
      },
    });

    // 3. buyer_deposit + SELLER_FUNDED
    const res3 = buildStellarInvocation({
      action: "buyer_deposit",
      expected_local_status: "SELLER_FUNDED",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GBUY",
    } satisfies StellarInvocationBuildInput);
    expect(res3).toEqual({
      ok: true,
      invocation: {
        action: "buyer_deposit",
        method: "deposit_buyer",
        signer_role: "buyer_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GBUY" },
        ],
      },
    });

    // 4. seller_deposit + WAITING_DEPOSITS
    const res4 = buildStellarInvocation({
      action: "seller_deposit",
      expected_local_status: "WAITING_DEPOSITS",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GSEL",
    } satisfies StellarInvocationBuildInput);
    expect(res4).toEqual({
      ok: true,
      invocation: {
        action: "seller_deposit",
        method: "deposit_seller",
        signer_role: "seller_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GSEL" },
        ],
      },
    });

    // 5. seller_deposit + BUYER_FUNDED
    const res5 = buildStellarInvocation({
      action: "seller_deposit",
      expected_local_status: "BUYER_FUNDED",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GSEL",
    } satisfies StellarInvocationBuildInput);
    expect(res5).toEqual({
      ok: true,
      invocation: {
        action: "seller_deposit",
        method: "deposit_seller",
        signer_role: "seller_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GSEL" },
        ],
      },
    });

    // 6. submit_proof + LOCKED
    const res6 = buildStellarInvocation({
      action: "submit_proof",
      expected_local_status: "LOCKED",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GSEL",
      proof_hash: "112233445566778899001122334455667788990011223344556677889900aabb",
    } satisfies StellarInvocationBuildInput);
    expect(res6).toEqual({
      ok: true,
      invocation: {
        action: "submit_proof",
        method: "submit_proof_hash",
        signer_role: "seller_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GSEL" },
          { kind: "bytes32", value: "112233445566778899001122334455667788990011223344556677889900aabb" },
        ],
      },
    });

    // 7. mark_delivered + PROOF_SUBMITTED
    const res7 = buildStellarInvocation({
      action: "mark_delivered",
      expected_local_status: "PROOF_SUBMITTED",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GSEL",
    } satisfies StellarInvocationBuildInput);
    expect(res7).toEqual({
      ok: true,
      invocation: {
        action: "mark_delivered",
        method: "mark_delivered",
        signer_role: "seller_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GSEL" },
        ],
      },
    });

    // 8. accept_delivery + DELIVERED
    const res8 = buildStellarInvocation({
      action: "accept_delivery",
      expected_local_status: "DELIVERED",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GBUY",
    } satisfies StellarInvocationBuildInput);
    expect(res8).toEqual({
      ok: true,
      invocation: {
        action: "accept_delivery",
        method: "accept_and_complete",
        signer_role: "buyer_demo",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
          { kind: "address", value: "GBUY" },
        ],
      },
    });

    // 9. expire + WAITING_DEPOSITS
    const res9 = buildStellarInvocation({
      action: "expire",
      expected_local_status: "WAITING_DEPOSITS",
      contract_id: "C123",
      escrow_id: "1",
    } satisfies StellarInvocationBuildInput);
    expect(res9).toEqual({
      ok: true,
      invocation: {
        action: "expire",
        method: "expire_if_unfunded",
        signer_role: "admin",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
        ],
      },
    });

    // 10. expire + BUYER_FUNDED
    const res10 = buildStellarInvocation({
      action: "expire",
      expected_local_status: "BUYER_FUNDED",
      contract_id: "C123",
      escrow_id: "1",
    } satisfies StellarInvocationBuildInput);
    expect(res10).toEqual({
      ok: true,
      invocation: {
        action: "expire",
        method: "expire_if_unfunded",
        signer_role: "admin",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
        ],
      },
    });

    // 11. expire + SELLER_FUNDED
    const res11 = buildStellarInvocation({
      action: "expire",
      expected_local_status: "SELLER_FUNDED",
      contract_id: "C123",
      escrow_id: "1",
    } satisfies StellarInvocationBuildInput);
    expect(res11).toEqual({
      ok: true,
      invocation: {
        action: "expire",
        method: "expire_if_unfunded",
        signer_role: "admin",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
        ],
      },
    });

    // 12. refund + BUYER_FUNDED
    const res12 = buildStellarInvocation({
      action: "refund",
      expected_local_status: "BUYER_FUNDED",
      contract_id: "C123",
      escrow_id: "1",
    } satisfies StellarInvocationBuildInput);
    expect(res12).toEqual({
      ok: true,
      invocation: {
        action: "refund",
        method: "refund_before_locked",
        signer_role: "admin",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
        ],
      },
    });

    // 13. refund + SELLER_FUNDED
    const res13 = buildStellarInvocation({
      action: "refund",
      expected_local_status: "SELLER_FUNDED",
      contract_id: "C123",
      escrow_id: "1",
    } satisfies StellarInvocationBuildInput);
    expect(res13).toEqual({
      ok: true,
      invocation: {
        action: "refund",
        method: "refund_before_locked",
        signer_role: "admin",
        contract_id: "C123",
        arguments: [
          { kind: "u64", value: "1" },
        ],
      },
    });
  });

  it("tests valid and invalid u64 numeric bounds", () => {
    const base = {
      action: "buyer_deposit",
      expected_local_status: "WAITING_DEPOSITS",
      contract_id: "C123",
      actor_address: "GACTOR",
    } as const;

    // Valid
    expect(buildStellarInvocation({ ...base, escrow_id: "0" }).ok).toBe(true);
    expect(buildStellarInvocation({ ...base, escrow_id: "18446744073709551615" }).ok).toBe(true);

    // Invalid
    expect(buildStellarInvocation({ ...base, escrow_id: "" })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "escrow_id" });
    expect(buildStellarInvocation({ ...base, escrow_id: "   " })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "escrow_id" });
    expect(buildStellarInvocation({ ...base, escrow_id: "-1" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "escrow_id" });
    expect(buildStellarInvocation({ ...base, escrow_id: "+1" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "escrow_id" });
    expect(buildStellarInvocation({ ...base, escrow_id: "01" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "escrow_id" });
    expect(buildStellarInvocation({ ...base, escrow_id: "1.0" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "escrow_id" });
    expect(buildStellarInvocation({ ...base, escrow_id: "18446744073709551616" })).toEqual({ ok: false, error_code: "ERR_U64_OUT_OF_RANGE", field: "escrow_id" });

    const createBase = {
      action: "create_deal",
      expected_local_status: null,
      contract_id: "C123",
      deal_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      buyer_address: "B",
      seller_address: "S",
      principal: "0",
      buyer_bond: "0",
      seller_bond: "0",
      buyer_fee: "0",
      seller_fee: "0",
    } as const;

    expect(buildStellarInvocation({ ...createBase, expires_at: "0" }).ok).toBe(true);
    expect(buildStellarInvocation({ ...createBase, expires_at: "18446744073709551615" }).ok).toBe(true);
    expect(buildStellarInvocation({ ...createBase, expires_at: "" })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "expires_at" });
    expect(buildStellarInvocation({ ...createBase, expires_at: "   " })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "expires_at" });
    expect(buildStellarInvocation({ ...createBase, expires_at: "-1" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "expires_at" });
    expect(buildStellarInvocation({ ...createBase, expires_at: "+1" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "expires_at" });
    expect(buildStellarInvocation({ ...createBase, expires_at: "01" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "expires_at" });
    expect(buildStellarInvocation({ ...createBase, expires_at: "1.0" })).toEqual({ ok: false, error_code: "ERR_MALFORMED_U64", field: "expires_at" });
    expect(buildStellarInvocation({ ...createBase, expires_at: "18446744073709551616" })).toEqual({ ok: false, error_code: "ERR_U64_OUT_OF_RANGE", field: "expires_at" });
  });

  it("tests valid and invalid i128 numeric bounds", () => {
    const base = {
      action: "create_deal",
      expected_local_status: null,
      contract_id: "C123",
      deal_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      buyer_address: "B",
      seller_address: "S",
      expires_at: "0",
    } as const;

    function testMonetaryField(field: "principal" | "buyer_bond" | "seller_bond" | "buyer_fee" | "seller_fee") {
      const getVal = (val: string): StellarInvocationBuildInput => {
        return {
          ...base,
          principal: field === "principal" ? val : "0",
          buyer_bond: field === "buyer_bond" ? val : "0",
          seller_bond: field === "seller_bond" ? val : "0",
          buyer_fee: field === "buyer_fee" ? val : "0",
          seller_fee: field === "seller_fee" ? val : "0",
        };
      };

      expect(buildStellarInvocation(getVal("0")).ok).toBe(true);
      expect(buildStellarInvocation(getVal("-170141183460469231731687303715884105728")).ok).toBe(true);
      expect(buildStellarInvocation(getVal("170141183460469231731687303715884105727")).ok).toBe(true);

      expect(buildStellarInvocation(getVal(""))).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field });
      expect(buildStellarInvocation(getVal("   "))).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field });
      expect(buildStellarInvocation(getVal("-170141183460469231731687303715884105729"))).toEqual({ ok: false, error_code: "ERR_I128_OUT_OF_RANGE", field });
      expect(buildStellarInvocation(getVal("170141183460469231731687303715884105728"))).toEqual({ ok: false, error_code: "ERR_I128_OUT_OF_RANGE", field });
      expect(buildStellarInvocation(getVal("-0"))).toEqual({ ok: false, error_code: "ERR_MALFORMED_I128", field });
      expect(buildStellarInvocation(getVal("+1"))).toEqual({ ok: false, error_code: "ERR_MALFORMED_I128", field });
      expect(buildStellarInvocation(getVal("01"))).toEqual({ ok: false, error_code: "ERR_MALFORMED_I128", field });
      expect(buildStellarInvocation(getVal("-01"))).toEqual({ ok: false, error_code: "ERR_MALFORMED_I128", field });
      expect(buildStellarInvocation(getVal("1.0"))).toEqual({ ok: false, error_code: "ERR_MALFORMED_I128", field });
    }

    testMonetaryField("principal");
    testMonetaryField("buyer_bond");
    testMonetaryField("seller_bond");
    testMonetaryField("buyer_fee");
    testMonetaryField("seller_fee");
  });

  it("tests bytes32 normalization and validity", () => {
    const base = {
      action: "submit_proof",
      expected_local_status: "LOCKED",
      contract_id: "C123",
      escrow_id: "1",
      actor_address: "GSEL",
    } as const;

    const lower = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const upper = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
    const mixed = "0123456789AbCdEf0123456789aBcDeF0123456789AbCdEf0123456789aBcDeF";

    const resLower = buildStellarInvocation({ ...base, proof_hash: lower });
    expect(resLower.ok).toBe(true);
    if (resLower.ok) expect(resLower.invocation.arguments[2]).toEqual({ kind: "bytes32", value: lower });

    const resUpper = buildStellarInvocation({ ...base, proof_hash: upper });
    expect(resUpper.ok).toBe(true);
    if (resUpper.ok) expect(resUpper.invocation.arguments[2]).toEqual({ kind: "bytes32", value: lower });

    const resMixed = buildStellarInvocation({ ...base, proof_hash: mixed });
    expect(resMixed.ok).toBe(true);
    if (resMixed.ok) expect(resMixed.invocation.arguments[2]).toEqual({ kind: "bytes32", value: lower });

    // Invalid
    expect(buildStellarInvocation({ ...base, proof_hash: "a".repeat(63) })).toEqual({ ok: false, error_code: "ERR_MALFORMED_BYTES32", field: "proof_hash" });
    expect(buildStellarInvocation({ ...base, proof_hash: "a".repeat(65) })).toEqual({ ok: false, error_code: "ERR_MALFORMED_BYTES32", field: "proof_hash" });
    expect(buildStellarInvocation({ ...base, proof_hash: "g".repeat(64) })).toEqual({ ok: false, error_code: "ERR_MALFORMED_BYTES32", field: "proof_hash" });
    expect(buildStellarInvocation({ ...base, proof_hash: "0x" + "a".repeat(62) })).toEqual({ ok: false, error_code: "ERR_MALFORMED_BYTES32", field: "proof_hash" });
    expect(buildStellarInvocation({ ...base, proof_hash: "" })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "proof_hash" });
    expect(buildStellarInvocation({ ...base, proof_hash: "   " })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "proof_hash" });

    // Also test deal_hash
    const createBase = {
      action: "create_deal",
      expected_local_status: null,
      contract_id: "C123",
      buyer_address: "B",
      seller_address: "S",
      principal: "0",
      buyer_bond: "0",
      seller_bond: "0",
      buyer_fee: "0",
      seller_fee: "0",
      expires_at: "0",
    } as const;

    expect(buildStellarInvocation({ ...createBase, deal_hash: "" })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "deal_hash" });
    expect(buildStellarInvocation({ ...createBase, deal_hash: "a".repeat(63) })).toEqual({ ok: false, error_code: "ERR_MALFORMED_BYTES32", field: "deal_hash" });
  });

  it("tests valid and invalid identifier boundaries", () => {
    const base = {
      action: "buyer_deposit",
      expected_local_status: "WAITING_DEPOSITS",
      escrow_id: "1",
    } as const;

    // Valid
    const res1 = buildStellarInvocation({ ...base, contract_id: "C123", actor_address: "GBUY" });
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.invocation.contract_id).toBe("C123");
      expect(res1.invocation.arguments[1]).toEqual({ kind: "address", value: "GBUY" });
    }

    // Invalid empty
    expect(buildStellarInvocation({ ...base, contract_id: "", actor_address: "GBUY" })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "contract_id" });
    expect(buildStellarInvocation({ ...base, contract_id: "  ", actor_address: "GBUY" })).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field: "contract_id" });

    // Invalid whitespace padding
    expect(buildStellarInvocation({ ...base, contract_id: " C123", actor_address: "GBUY" })).toEqual({ ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "contract_id" });
    expect(buildStellarInvocation({ ...base, contract_id: "C123 ", actor_address: "GBUY" })).toEqual({ ok: false, error_code: "ERR_INVALID_IDENTIFIER", field: "contract_id" });

    const createBase = {
      action: "create_deal",
      expected_local_status: null,
      contract_id: "C123",
      deal_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      principal: "0",
      buyer_bond: "0",
      seller_bond: "0",
      buyer_fee: "0",
      seller_fee: "0",
      expires_at: "0",
    } as const;

    function testAddressField(field: "buyer_address" | "seller_address") {
      const getVal = (val: string): StellarInvocationBuildInput => {
        return {
          ...createBase,
          buyer_address: field === "buyer_address" ? val : "B",
          seller_address: field === "seller_address" ? val : "S",
        };
      };

      const validRes = buildStellarInvocation(getVal("GVALID"));
      expect(validRes.ok).toBe(true);
      if (validRes.ok) {
        expect(validRes.invocation.arguments[field === "buyer_address" ? 1 : 2]).toEqual({ kind: "address", value: "GVALID" });
      }

      expect(buildStellarInvocation(getVal(""))).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field });
      expect(buildStellarInvocation(getVal("   "))).toEqual({ ok: false, error_code: "ERR_MISSING_REQUIRED_VALUE", field });
      expect(buildStellarInvocation(getVal(" GINVALID"))).toEqual({ ok: false, error_code: "ERR_INVALID_IDENTIFIER", field });
      expect(buildStellarInvocation(getVal("GINVALID "))).toEqual({ ok: false, error_code: "ERR_INVALID_IDENTIFIER", field });
    }

    testAddressField("buyer_address");
    testAddressField("seller_address");
  });

  it("proves security shape of successful invocations", () => {
    const res = buildStellarInvocation({
      action: "expire",
      expected_local_status: "WAITING_DEPOSITS",
      contract_id: "C123",
      escrow_id: "1",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      const serialized = JSON.stringify(res.invocation);
      expect(serialized).not.toMatch(
        /"(secret|secret_seed|private_key|keypair|rpc|rpc_client|environment|transaction|sdk_transaction)"\s*:/i
      );

      const keys = Object.keys(res.invocation);
      expect(keys).not.toContain("secret");
      expect(keys).not.toContain("secret_seed");
      expect(keys).not.toContain("private_key");
      expect(keys).not.toContain("keypair");
      expect(keys).not.toContain("rpc");
      expect(keys).not.toContain("rpc_client");
      expect(keys).not.toContain("environment");
      expect(keys).not.toContain("transaction");
      expect(keys).not.toContain("sdk_transaction");
    }
  });
});
