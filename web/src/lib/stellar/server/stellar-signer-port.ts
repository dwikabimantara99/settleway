import type { StellarSignerRole } from "./action-policy";

export interface StellarSignRequest {
  readonly prepared_transaction_xdr: string;
  readonly expected_network_passphrase: string;
  readonly signer_role: StellarSignerRole;
  readonly expected_signer_address: string;
}

export type StellarSignResult =
  | { readonly ok: true; readonly signed_transaction_xdr: string }
  | { readonly ok: false; readonly error_code: "ERR_SIGNER_REJECTED" | "ERR_SIGNER_UNAVAILABLE" };

export interface StellarSignerPort {
  signTransaction(request: StellarSignRequest): Promise<StellarSignResult>;
}

export interface StellarTimeSource {
  nowUnixSeconds(): number;
}
