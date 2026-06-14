import { describe, it, expect } from "vitest";
import { constructUnsignedSorobanTransaction } from "./stellar-transaction-factory";
import { TransactionBuilder, Networks, StrKey } from "@stellar/stellar-sdk";
import { encodeContractArguments } from "./stellar-sdk-codec";
import type { StellarContractArgument } from "./adapter-contracts";

const TEST_SOURCE = "GBXZG2PGM62LHQ7CSKZ6HDMK5HOTNCBTS6XTCUWUP3AO3V6D7RHSXEYU";
// Valid contract ID
const TEST_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 1));
const PASSPHRASE = Networks.TESTNET;

function makeArgs(vals: StellarContractArgument[]): ReturnType<typeof encodeContractArguments> extends { ok: true; values: infer V } ? V : never {
  const result = encodeContractArguments(vals);
  if (!result.ok) throw new Error("Encoding failed");
  return result.values;
}

describe("Stellar Transaction Factory", () => {
  it("builds a valid unsigned transaction", () => {
    const args = makeArgs([{ kind: "u64", value: "1" }]);
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: args,
      base_fee_stroops: 100,
      min_time_unix: 0,
      max_time_unix: 1700000000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tx = TransactionBuilder.fromXDR(result.unsigned_transaction_xdr, PASSPHRASE) as import("@stellar/stellar-sdk").Transaction;
    expect(tx.operations.length).toBe(1);
    expect(tx.operations[0].type).toBe("invokeHostFunction");
    expect(tx.signatures.length).toBe(0);
  });

  it("sets explicit time bounds", () => {
    const args = makeArgs([{ kind: "u64", value: "1" }]);
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: args,
      base_fee_stroops: 100,
      min_time_unix: 100,
      max_time_unix: 200,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tx = TransactionBuilder.fromXDR(result.unsigned_transaction_xdr, PASSPHRASE) as import("@stellar/stellar-sdk").Transaction;
    expect(Number(tx.timeBounds?.minTime)).toBe(100);
    expect(Number(tx.timeBounds?.maxTime)).toBe(200);
  });

  it("rejects invalid base fee (zero)", () => {
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: [],
      base_fee_stroops: 0,
      min_time_unix: 0,
      max_time_unix: 1700000000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_BASE_FEE");
  });

  it("rejects invalid base fee (negative)", () => {
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: [],
      base_fee_stroops: -1,
      min_time_unix: 0,
      max_time_unix: 1700000000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_BASE_FEE");
  });

  it("rejects invalid time bounds (max <= min)", () => {
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: [],
      base_fee_stroops: 100,
      min_time_unix: 200,
      max_time_unix: 100,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_TIME_BOUNDS");
  });

  it("rejects negative time bounds", () => {
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: [],
      base_fee_stroops: 100,
      min_time_unix: -1,
      max_time_unix: 100,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("ERR_INVALID_TIME_BOUNDS");
  });

  it("produces deterministic XDR for identical inputs", () => {
    const args = makeArgs([{ kind: "u64", value: "42" }]);
    const input = {
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: args,
      base_fee_stroops: 100,
      min_time_unix: 0,
      max_time_unix: 999999,
    };
    const r1 = constructUnsignedSorobanTransaction(input);
    const r2 = constructUnsignedSorobanTransaction(input);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.unsigned_transaction_xdr).toBe(r2.unsigned_transaction_xdr);
    }
  });

  it("produces one operation with no memo", () => {
    const args = makeArgs([{ kind: "u64", value: "1" }, { kind: "address", value: TEST_SOURCE }]);
    const result = constructUnsignedSorobanTransaction({
      source_address: TEST_SOURCE,
      source_sequence: "100",
      network_passphrase: PASSPHRASE,
      contract_id: TEST_CONTRACT,
      method: "deposit_buyer",
      encoded_arguments: args,
      base_fee_stroops: 100,
      min_time_unix: 0,
      max_time_unix: 1700000000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tx = TransactionBuilder.fromXDR(result.unsigned_transaction_xdr, PASSPHRASE) as import("@stellar/stellar-sdk").Transaction;
    expect(tx.operations.length).toBe(1);
    expect(tx.memo.type).toBe("none");
  });
});
