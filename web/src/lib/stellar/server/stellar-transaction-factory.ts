import {
  TransactionBuilder,
  Contract,
  xdr,
  Account,
} from "@stellar/stellar-sdk";

export interface TransactionFactoryInput {
  readonly source_address: string;
  readonly source_sequence: string;
  readonly network_passphrase: string;
  readonly contract_id: string;
  readonly method: string;
  readonly encoded_arguments: readonly xdr.ScVal[];
  readonly base_fee_stroops: number;
  readonly min_time_unix: number;
  readonly max_time_unix: number;
}

export type TransactionFactoryResult =
  | { readonly ok: true; readonly unsigned_transaction_xdr: string }
  | { readonly ok: false; readonly error_code: TransactionFactoryErrorCode };

export type TransactionFactoryErrorCode =
  | "ERR_INVALID_BASE_FEE"
  | "ERR_INVALID_TIME_BOUNDS"
  | "ERR_BUILD_FAILURE";

export function constructUnsignedSorobanTransaction(
  input: TransactionFactoryInput,
): TransactionFactoryResult {
  if (
    !Number.isInteger(input.base_fee_stroops) ||
    input.base_fee_stroops <= 0 ||
    !Number.isSafeInteger(input.base_fee_stroops)
  ) {
    return { ok: false, error_code: "ERR_INVALID_BASE_FEE" };
  }

  if (
    !Number.isInteger(input.min_time_unix) ||
    !Number.isInteger(input.max_time_unix) ||
    input.min_time_unix < 0 ||
    input.max_time_unix <= input.min_time_unix ||
    !Number.isSafeInteger(input.min_time_unix) ||
    !Number.isSafeInteger(input.max_time_unix)
  ) {
    return { ok: false, error_code: "ERR_INVALID_TIME_BOUNDS" };
  }

  try {
    const source = new Account(input.source_address, input.source_sequence);
    const contract = new Contract(input.contract_id);

    const invokeOp = contract.call(
      input.method,
      ...input.encoded_arguments,
    );

    const builder = new TransactionBuilder(source, {
      fee: String(input.base_fee_stroops),
      networkPassphrase: input.network_passphrase,
    });

    builder.addOperation(invokeOp);

    builder.setTimebounds(input.min_time_unix, input.max_time_unix);

    const tx = builder.build();

    return { ok: true, unsigned_transaction_xdr: tx.toXDR() };
  } catch {
    return { ok: false, error_code: "ERR_BUILD_FAILURE" };
  }
}
