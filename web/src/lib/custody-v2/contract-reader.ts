import {
  Account,
  Contract,
  rpc,
  scValToNative,
  StrKey,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import type { CustodyV2ContractState } from '@/lib/db/types';
import type { CustodyV2ServerConfig } from './config';

export type CustodyV2TerminalOutcome =
  | 'None'
  | 'SettledSuccess'
  | 'FundingExpired'
  | 'SellerBreach'
  | 'BuyerBreach'
  | 'MutualCancellation';

export interface CustodyV2ChainConfig {
  initialized: boolean;
  accepted_asset: string;
  treasury: string;
  policy_version: number;
  interface_version: number;
  success_fee_bps: number;
  seller_breach_treasury_bps: number;
  buyer_breach_treasury_bps: number;
}

export interface CustodyV2ChainDeal {
  deal_id: string;
  buyer: string;
  seller: string;
  mediator: string;
  creator: string;
  terms_hash: string;
  accepted_asset: string;
  treasury: string;
  principal: string;
  buyer_bond: string;
  seller_bond: string;
  funding_deadline: number;
  delivery_deadline: number;
  inspection_deadline: number;
  policy_version: number;
  success_fee_bps: number;
  seller_breach_treasury_bps: number;
  buyer_breach_treasury_bps: number;
  buyer_terms_accepted: boolean;
  seller_terms_accepted: boolean;
  buyer_funded: boolean;
  seller_funded: boolean;
  buyer_cancellation_approved: boolean;
  seller_cancellation_approved: boolean;
  evidence_commitment: string | null;
  disputed: boolean;
  dispute_opener: string | null;
  dispute_reason_hash: string | null;
  state: CustodyV2ContractState;
  terminal_outcome: CustodyV2TerminalOutcome;
  created_ledger_timestamp: number;
  last_updated_ledger_timestamp: number;
}

export interface CustodyV2ContractInfo {
  name: string;
  interface_version: number;
  policy_version: number;
}

export type CustodyV2ReadResult<T> =
  | { ok: true; value: T; latestLedger: number | null }
  | { ok: false; error_code: 'not_found' | 'rpc_error' | 'decode_error' | 'contract_mismatch'; message: string };

export interface CustodyV2ContractReadPort {
  getConfig(sourceAddress: string): Promise<CustodyV2ReadResult<CustodyV2ChainConfig>>;
  getDeal(sourceAddress: string, contractDealId: string): Promise<CustodyV2ReadResult<CustodyV2ChainDeal>>;
  getState(sourceAddress: string, contractDealId: string): Promise<CustodyV2ReadResult<CustodyV2ContractState>>;
  dealExists(sourceAddress: string, contractDealId: string): Promise<CustodyV2ReadResult<boolean>>;
  contractInfo(sourceAddress: string): Promise<CustodyV2ReadResult<CustodyV2ContractInfo>>;
}

const STATES = new Set<CustodyV2ContractState>([
  'TermsPending',
  'AwaitingFunding',
  'Active',
  'EvidenceSubmitted',
  'Disputed',
  'SettledSuccess',
  'FundingExpired',
  'SellerBreach',
  'BuyerBreach',
  'MutualCancellation',
]);

const STATE_BY_DISCRIMINANT: Record<number, CustodyV2ContractState> = {
  0: 'TermsPending',
  1: 'AwaitingFunding',
  2: 'Active',
  3: 'EvidenceSubmitted',
  4: 'Disputed',
  5: 'SettledSuccess',
  6: 'FundingExpired',
  7: 'SellerBreach',
  8: 'BuyerBreach',
  9: 'MutualCancellation',
};

const OUTCOMES = new Set<CustodyV2TerminalOutcome>([
  'None',
  'SettledSuccess',
  'FundingExpired',
  'SellerBreach',
  'BuyerBreach',
  'MutualCancellation',
]);

const OUTCOME_BY_DISCRIMINANT: Record<number, CustodyV2TerminalOutcome> = {
  0: 'None',
  1: 'SettledSuccess',
  2: 'FundingExpired',
  3: 'SellerBreach',
  4: 'BuyerBreach',
  5: 'MutualCancellation',
};

function assertContractId(contractId: string, expected: string) {
  if (contractId !== expected || !StrKey.isValidContract(contractId)) {
    throw new Error('Custody V2 reader contract ID mismatch.');
  }
}

function bytes32ScVal(hex: string): xdr.ScVal {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('Contract deal ID must be bytes32 hex.');
  }
  return xdr.ScVal.scvBytes(Buffer.from(hex, 'hex'));
}

function toHexBytes32(value: unknown, field: string): string {
  if (Buffer.isBuffer(value)) return value.toString('hex');
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (typeof value === 'string' && /^[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase();
  throw new Error(`Invalid bytes32 field: ${field}`);
}

function toAddress(value: unknown, field: string): string {
  if (typeof value === 'string' && (StrKey.isValidEd25519PublicKey(value) || StrKey.isValidContract(value))) {
    return value;
  }
  throw new Error(`Invalid address field: ${field}`);
}

function toStringAmount(value: unknown, field: string): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return value;
  throw new Error(`Invalid amount field: ${field}`);
}

function toSafeNumber(value: unknown, field: string): number {
  const parsed = typeof value === 'bigint' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric field: ${field}`);
  }
  return parsed;
}

function toBool(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value;
  throw new Error(`Invalid boolean field: ${field}`);
}

function toNullableBytes32(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return toHexBytes32(value, field);
}

function toNullableAddress(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return toAddress(value, field);
}

function toState(value: unknown): CustodyV2ContractState {
  if (typeof value === 'number' && STATE_BY_DISCRIMINANT[value]) {
    return STATE_BY_DISCRIMINANT[value];
  }
  if (typeof value === 'string' && STATES.has(value as CustodyV2ContractState)) {
    return value as CustodyV2ContractState;
  }
  throw new Error(`Unknown Custody V2 state: ${String(value)}`);
}

function toOutcome(value: unknown): CustodyV2TerminalOutcome {
  if (typeof value === 'number' && OUTCOME_BY_DISCRIMINANT[value]) {
    return OUTCOME_BY_DISCRIMINANT[value];
  }
  if (typeof value === 'string' && OUTCOMES.has(value as CustodyV2TerminalOutcome)) {
    return value as CustodyV2TerminalOutcome;
  }
  throw new Error(`Unknown Custody V2 terminal outcome: ${String(value)}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error('Expected decoded Soroban map.');
}

export function decodeCustodyV2Config(value: unknown): CustodyV2ChainConfig {
  const record = asRecord(value);
  return {
    initialized: toBool(record.initialized, 'initialized'),
    accepted_asset: toAddress(record.accepted_asset, 'accepted_asset'),
    treasury: toAddress(record.treasury, 'treasury'),
    policy_version: toSafeNumber(record.policy_version, 'policy_version'),
    interface_version: toSafeNumber(record.interface_version, 'interface_version'),
    success_fee_bps: toSafeNumber(record.success_fee_bps, 'success_fee_bps'),
    seller_breach_treasury_bps: toSafeNumber(record.seller_breach_treasury_bps, 'seller_breach_treasury_bps'),
    buyer_breach_treasury_bps: toSafeNumber(record.buyer_breach_treasury_bps, 'buyer_breach_treasury_bps'),
  };
}

export function decodeCustodyV2Deal(value: unknown): CustodyV2ChainDeal {
  const record = asRecord(value);
  return {
    deal_id: toHexBytes32(record.deal_id, 'deal_id'),
    buyer: toAddress(record.buyer, 'buyer'),
    seller: toAddress(record.seller, 'seller'),
    mediator: toAddress(record.mediator, 'mediator'),
    creator: toAddress(record.creator, 'creator'),
    terms_hash: toHexBytes32(record.terms_hash, 'terms_hash'),
    accepted_asset: toAddress(record.accepted_asset, 'accepted_asset'),
    treasury: toAddress(record.treasury, 'treasury'),
    principal: toStringAmount(record.principal, 'principal'),
    buyer_bond: toStringAmount(record.buyer_bond, 'buyer_bond'),
    seller_bond: toStringAmount(record.seller_bond, 'seller_bond'),
    funding_deadline: toSafeNumber(record.funding_deadline, 'funding_deadline'),
    delivery_deadline: toSafeNumber(record.delivery_deadline, 'delivery_deadline'),
    inspection_deadline: toSafeNumber(record.inspection_deadline, 'inspection_deadline'),
    policy_version: toSafeNumber(record.policy_version, 'policy_version'),
    success_fee_bps: toSafeNumber(record.success_fee_bps, 'success_fee_bps'),
    seller_breach_treasury_bps: toSafeNumber(record.seller_breach_treasury_bps, 'seller_breach_treasury_bps'),
    buyer_breach_treasury_bps: toSafeNumber(record.buyer_breach_treasury_bps, 'buyer_breach_treasury_bps'),
    buyer_terms_accepted: toBool(record.buyer_terms_accepted, 'buyer_terms_accepted'),
    seller_terms_accepted: toBool(record.seller_terms_accepted, 'seller_terms_accepted'),
    buyer_funded: toBool(record.buyer_funded, 'buyer_funded'),
    seller_funded: toBool(record.seller_funded, 'seller_funded'),
    buyer_cancellation_approved: toBool(record.buyer_cancellation_approved, 'buyer_cancellation_approved'),
    seller_cancellation_approved: toBool(record.seller_cancellation_approved, 'seller_cancellation_approved'),
    evidence_commitment: toNullableBytes32(record.evidence_commitment, 'evidence_commitment'),
    disputed: toBool(record.disputed, 'disputed'),
    dispute_opener: toNullableAddress(record.dispute_opener, 'dispute_opener'),
    dispute_reason_hash: toNullableBytes32(record.dispute_reason_hash, 'dispute_reason_hash'),
    state: toState(record.state),
    terminal_outcome: toOutcome(record.terminal_outcome),
    created_ledger_timestamp: toSafeNumber(record.created_ledger_timestamp, 'created_ledger_timestamp'),
    last_updated_ledger_timestamp: toSafeNumber(record.last_updated_ledger_timestamp, 'last_updated_ledger_timestamp'),
  };
}

export function decodeCustodyV2ContractInfo(value: unknown): CustodyV2ContractInfo {
  const record = asRecord(value);
  if (typeof record.name !== 'string') throw new Error('Invalid contract_info name.');
  return {
    name: record.name,
    interface_version: toSafeNumber(record.interface_version, 'interface_version'),
    policy_version: toSafeNumber(record.policy_version, 'policy_version'),
  };
}

export class StellarCustodyV2ContractReader implements CustodyV2ContractReadPort {
  private readonly server: rpc.Server;

  constructor(private readonly config: CustodyV2ServerConfig) {
    if (!StrKey.isValidContract(config.contractId)) {
      throw new Error('Custody V2 reader contract ID must be a valid contract ID.');
    }
    this.server = new rpc.Server(config.rpcUrl, { allowHttp: false });
  }

  async getConfig(sourceAddress: string) {
    return this.callAndDecode('get_config', [], decodeCustodyV2Config, sourceAddress, (value) => {
      if (
        value.accepted_asset !== this.config.assetContractId ||
        String(value.interface_version) !== this.config.interfaceVersion ||
        String(value.policy_version) !== this.config.policyVersion
      ) {
        throw new ContractMismatchError('Custody V2 contract config does not match the configured application target.');
      }
    });
  }

  async getDeal(sourceAddress: string, contractDealId: string) {
    return this.callAndDecode('get_deal', [bytes32ScVal(contractDealId)], decodeCustodyV2Deal, sourceAddress);
  }

  async getState(sourceAddress: string, contractDealId: string) {
    return this.callAndDecode('get_state', [bytes32ScVal(contractDealId)], toState, sourceAddress);
  }

  async dealExists(sourceAddress: string, contractDealId: string) {
    return this.callAndDecode('deal_exists', [bytes32ScVal(contractDealId)], (value) => toBool(value, 'deal_exists'), sourceAddress);
  }

  async contractInfo(sourceAddress: string) {
    return this.callAndDecode('contract_info', [], decodeCustodyV2ContractInfo, sourceAddress, (value) => {
      if (
        value.name !== 'settleway_trade_assurance_v2_1' ||
        String(value.interface_version) !== this.config.interfaceVersion ||
        String(value.policy_version) !== this.config.policyVersion
      ) {
        throw new ContractMismatchError('Custody V2 contract info does not match the expected V2.1 interface.');
      }
    });
  }

  private async callAndDecode<T>(
    method: string,
    args: readonly xdr.ScVal[],
    decode: (value: unknown) => T,
    sourceAddress: string,
    validate?: (value: T) => void,
  ): Promise<CustodyV2ReadResult<T>> {
    if (!StrKey.isValidEd25519PublicKey(sourceAddress)) {
      return { ok: false, error_code: 'decode_error', message: 'Read source address is not a Stellar public key.' };
    }

    let retval: xdr.ScVal | undefined;
    let latestLedger: number | null = null;
    try {
      assertContractId(this.config.contractId, this.config.contractId);
      const source = await this.server.getAccount(sourceAddress);
      const contract = new Contract(this.config.contractId);
      const tx = new TransactionBuilder(new Account(sourceAddress, source.sequenceNumber()), {
        fee: '100',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();
      const simulated = await this.server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simulated)) {
        const message = simulated.error ?? 'Custody V2 read simulation failed.';
        return {
          ok: false,
          error_code: message.includes('Error(Contract, #11)') ? 'not_found' : 'rpc_error',
          message,
        };
      }
      retval = simulated.result?.retval;
      latestLedger = typeof simulated.latestLedger === 'number' ? simulated.latestLedger : null;
      if (!retval) {
        return { ok: false, error_code: 'decode_error', message: 'Custody V2 read returned no value.' };
      }
    } catch (error) {
      return {
        ok: false,
        error_code: 'rpc_error',
        message: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      const value = decode(scValToNative(retval));
      validate?.(value);
      return {
        ok: true,
        value,
        latestLedger,
      };
    } catch (error) {
      if (error instanceof ContractMismatchError) {
        return {
          ok: false,
          error_code: 'contract_mismatch',
          message: error.message,
        };
      }
      return {
        ok: false,
        error_code: 'decode_error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

class ContractMismatchError extends Error {}
