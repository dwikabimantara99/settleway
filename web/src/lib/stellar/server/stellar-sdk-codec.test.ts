import { describe, it, expect } from "vitest";
import { encodeContractArguments, decodeEscrowIdResult } from "./stellar-sdk-codec";
import { nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { StellarContractArgument } from "./adapter-contracts";

// Valid Stellar public keys for testing
const TEST_BUYER = "GBXZG2PGM62LHQ7CSKZ6HDMK5HOTNCBTS6XTCUWUP3AO3V6D7RHSXEYU";
const TEST_SELLER = "GBVNGU2QIQDENWOVV24AH4HXHFGIZWBY4ICXAPCQ6Y7A55E3V6PTN7PM";

describe("Stellar SDK Codec", () => {
  describe("encodeContractArguments", () => {
    it("encodes address argument", () => {
      const args: StellarContractArgument[] = [{ kind: "address", value: TEST_BUYER }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values.length).toBe(1);
        expect(result.values[0].switch().name).toBe("scvAddress");
      }
    });

    it("encodes u64 argument", () => {
      const args: StellarContractArgument[] = [{ kind: "u64", value: "12345" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values.length).toBe(1);
        expect(result.values[0].switch().name).toBe("scvU64");
      }
    });

    it("encodes u64 zero", () => {
      const args: StellarContractArgument[] = [{ kind: "u64", value: "0" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
    });

    it("encodes u64 max value", () => {
      const args: StellarContractArgument[] = [{ kind: "u64", value: "18446744073709551615" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
    });

    it("rejects u64 overflow", () => {
      const args: StellarContractArgument[] = [{ kind: "u64", value: "18446744073709551616" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_U64");
    });

    it("rejects negative u64", () => {
      const args: StellarContractArgument[] = [{ kind: "u64", value: "-1" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_U64");
    });

    it("encodes i128 argument", () => {
      const args: StellarContractArgument[] = [{ kind: "i128", value: "1000" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values.length).toBe(1);
        expect(result.values[0].switch().name).toBe("scvI128");
      }
    });

    it("encodes i128 negative value", () => {
      const args: StellarContractArgument[] = [{ kind: "i128", value: "-500" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
    });

    it("rejects i128 overflow", () => {
      const args: StellarContractArgument[] = [
        { kind: "i128", value: "170141183460469231731687303715884105728" },
      ];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_I128");
    });

    it("encodes bytes32 argument", () => {
      const hash = "a".repeat(64);
      const args: StellarContractArgument[] = [{ kind: "bytes32", value: hash }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values.length).toBe(1);
        expect(result.values[0].switch().name).toBe("scvBytes");
      }
    });

    it("rejects malformed bytes32 (too short)", () => {
      const args: StellarContractArgument[] = [{ kind: "bytes32", value: "abcdef" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_BYTES32");
    });

    it("rejects malformed bytes32 (non-hex)", () => {
      const args: StellarContractArgument[] = [{ kind: "bytes32", value: "g".repeat(64) }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_BYTES32");
    });

    it("rejects invalid address", () => {
      const args: StellarContractArgument[] = [{ kind: "address", value: "INVALID" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_ADDRESS");
    });

    it("rejects string kind", () => {
      const args: StellarContractArgument[] = [{ kind: "string", value: "hello" }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_UNSUPPORTED_ARGUMENT_KIND");
    });

    it("rejects bool kind", () => {
      const args: StellarContractArgument[] = [{ kind: "bool", value: true }];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("ERR_UNSUPPORTED_ARGUMENT_KIND");
    });

    it("encodes create_deal full argument set in order", () => {
      const hash = "b".repeat(64);
      const args: StellarContractArgument[] = [
        { kind: "bytes32", value: hash },
        { kind: "address", value: TEST_BUYER },
        { kind: "address", value: TEST_SELLER },
        { kind: "i128", value: "1000" },
        { kind: "i128", value: "100" },
        { kind: "i128", value: "100" },
        { kind: "i128", value: "10" },
        { kind: "i128", value: "10" },
        { kind: "u64", value: "1700000000" },
      ];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values.length).toBe(9);
        expect(result.values[0].switch().name).toBe("scvBytes");
        expect(result.values[1].switch().name).toBe("scvAddress");
        expect(result.values[2].switch().name).toBe("scvAddress");
        expect(result.values[3].switch().name).toBe("scvI128");
        expect(result.values[8].switch().name).toBe("scvU64");
      }
    });

    it("reports correct index on failure", () => {
      const args: StellarContractArgument[] = [
        { kind: "u64", value: "1" },
        { kind: "address", value: "INVALID" },
      ];
      const result = encodeContractArguments(args);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.index).toBe(1);
      }
    });
  });

  describe("decodeEscrowIdResult", () => {
    it("decodes a valid u64 ScVal", () => {
      const val = nativeToScVal(BigInt(123), { type: "u64" });
      expect(decodeEscrowIdResult(val)).toBe("123");
    });

    it("decodes u64 zero", () => {
      const val = nativeToScVal(BigInt(0), { type: "u64" });
      expect(decodeEscrowIdResult(val)).toBe("0");
    });

    it("rejects non-u64 ScVal", () => {
      const val = nativeToScVal(BigInt(123), { type: "i128" });
      expect(() => decodeEscrowIdResult(val)).toThrow("ERR_MALFORMED_CREATE_ESCROW_RESULT");
    });

    it("rejects void ScVal", () => {
      const val = xdr.ScVal.scvVoid();
      expect(() => decodeEscrowIdResult(val)).toThrow("ERR_MALFORMED_CREATE_ESCROW_RESULT");
    });
  });
});
