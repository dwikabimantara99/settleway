import {
  Address,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import type { StellarContractArgument } from "./adapter-contracts";

export type CodecErrorCode =
  | "ERR_UNSUPPORTED_ARGUMENT_KIND"
  | "ERR_INVALID_ADDRESS"
  | "ERR_INVALID_U64"
  | "ERR_INVALID_I128"
  | "ERR_INVALID_BYTES32";

export type CodecResult =
  | { readonly ok: true; readonly values: readonly xdr.ScVal[] }
  | { readonly ok: false; readonly error_code: CodecErrorCode; readonly index: number };

function encodeAddress(value: string): xdr.ScVal {
  // Address constructor validates the format
  return new Address(value).toScVal();
}

function encodeU64(value: string): xdr.ScVal {
  const n = BigInt(value);
  if (n < BigInt(0)) {
    throw new RangeError("u64 must be non-negative");
  }
  if (n > BigInt("18446744073709551615")) {
    throw new RangeError("u64 overflow");
  }
  return nativeToScVal(n, { type: "u64" });
}

function encodeI128(value: string): xdr.ScVal {
  const n = BigInt(value);
  const min = BigInt("-170141183460469231731687303715884105728");
  const max = BigInt("170141183460469231731687303715884105727");
  if (n < min || n > max) {
    throw new RangeError("i128 out of range");
  }
  return nativeToScVal(n, { type: "i128" });
}

function encodeBytes32(value: string): xdr.ScVal {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new RangeError("bytes32 must be exactly 64 hex characters");
  }
  const buf = Buffer.from(value, "hex");
  if (buf.length !== 32) {
    throw new RangeError("bytes32 decode produced wrong length");
  }
  return xdr.ScVal.scvBytes(buf);
}

export function encodeContractArguments(
  args: readonly StellarContractArgument[],
): CodecResult {
  const values: xdr.ScVal[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    try {
      switch (arg.kind) {
        case "address":
          values.push(encodeAddress(arg.value));
          break;
        case "u64":
          values.push(encodeU64(arg.value));
          break;
        case "i128":
          values.push(encodeI128(arg.value));
          break;
        case "bytes32":
          values.push(encodeBytes32(arg.value));
          break;
        case "string":
          return { ok: false, error_code: "ERR_UNSUPPORTED_ARGUMENT_KIND", index: i };
        case "bool":
          return { ok: false, error_code: "ERR_UNSUPPORTED_ARGUMENT_KIND", index: i };
        default: {
          const _exhaustive: never = arg;
          return { ok: false, error_code: "ERR_UNSUPPORTED_ARGUMENT_KIND", index: i + (_exhaustive as { kind: string }).kind.length * 0 };
        }
      }
    } catch {
      switch (arg.kind) {
        case "address":
          return { ok: false, error_code: "ERR_INVALID_ADDRESS", index: i };
        case "u64":
          return { ok: false, error_code: "ERR_INVALID_U64", index: i };
        case "i128":
          return { ok: false, error_code: "ERR_INVALID_I128", index: i };
        case "bytes32":
          return { ok: false, error_code: "ERR_INVALID_BYTES32", index: i };
        default:
          return { ok: false, error_code: "ERR_UNSUPPORTED_ARGUMENT_KIND", index: i };
      }
    }
  }
  return { ok: true, values };
}

export function decodeEscrowIdResult(val: xdr.ScVal): string {
  const switchVal = val.switch();
  if (switchVal.name !== "scvU64") {
    throw new Error(
      `ERR_MALFORMED_CREATE_ESCROW_RESULT: Result was not u64, got ${switchVal.name}`,
    );
  }
  return val.u64().toString();
}
