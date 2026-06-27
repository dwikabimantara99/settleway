import { createHash } from 'node:crypto';
import { Keypair, Transaction, TransactionBuilder, StrKey } from '@stellar/stellar-sdk';
import type {
  CustodyV2ActionType,
  DbCustodyDealLink,
  DbCustodyOperation,
} from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';
import type { StellarRpcPort } from '@/lib/stellar/server/stellar-rpc-port';
import type { StellarContractArgument } from '@/lib/stellar/server/adapter-contracts';
import { encodeContractArguments } from '@/lib/stellar/server/stellar-sdk-codec';
import { constructUnsignedSorobanTransaction } from '@/lib/stellar/server/stellar-transaction-factory';
import type { CustodyV2ServerConfig } from './config';
import type { CustodyV2ContractReadPort } from './contract-reader';
import { assertChainDealMatchesLink } from './projection';

export interface CustodyV2ActionSummary {
  network: 'Stellar Testnet';
  contract_id: string;
  function_name: string;
  participant: string;
  settlement_asset: 'XLM';
  amount_base_units: string | null;
  expected_next_state: string;
  expires_at: string;
}

export interface CustodyV2PreparedResponse {
  operation: DbCustodyOperation;
  unsigned_xdr: string;
  network_passphrase: string;
  source_address: string;
  summary: CustodyV2ActionSummary;
}

const BASE_FEE_STROOPS = 100;
const MAX_TIME_SECONDS = 180;

function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertPublicKey(address: string, label: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error(`${label} must be a valid Stellar public address.`);
  }
}

function readTransactionBodyFingerprint(xdrText: string, networkPassphrase: string): string {
  const parsed = TransactionBuilder.fromXDR(xdrText, networkPassphrase);
  if (!(parsed instanceof Transaction)) {
    throw new Error('Prepared transaction must not be a fee-bump transaction.');
  }
  const envelope = parsed.toEnvelope();
  if (envelope.switch().name !== 'envelopeTypeTx') {
    throw new Error('Prepared transaction envelope is not a normal transaction.');
  }
  return sha256Hex(envelope.v1().tx().toXDR('base64'));
}

function contractArgumentsForAction(
  link: DbCustodyDealLink,
  action: CustodyV2ActionType,
  actorAddress: string,
  evidenceHash?: string,
): {
  method: string;
  args: readonly StellarContractArgument[];
  expectedNextState: string;
  amountBaseUnits: string | null;
} {
  const dealIdArg = { kind: 'bytes32', value: link.contract_deal_id } as const;
  switch (action) {
    case 'CREATE_DEAL':
      return {
        method: 'create_deal',
        args: [
          dealIdArg,
          { kind: 'address', value: actorAddress },
          { kind: 'address', value: link.buyer_address },
          { kind: 'address', value: link.seller_address },
          { kind: 'address', value: link.mediator_address },
          { kind: 'bytes32', value: link.terms_hash },
          { kind: 'i128', value: link.principal_base_units },
          { kind: 'i128', value: link.buyer_bond_base_units },
          { kind: 'i128', value: link.seller_bond_base_units },
          { kind: 'u64', value: String(link.funding_deadline_unix) },
          { kind: 'u64', value: String(link.delivery_deadline_unix) },
          { kind: 'u64', value: String(link.inspection_deadline_unix) },
        ],
        expectedNextState: 'TermsPending',
        amountBaseUnits: null,
      };
    case 'ACCEPT_TERMS':
      return {
        method: 'accept_terms',
        args: [dealIdArg, { kind: 'address', value: actorAddress }],
        expectedNextState: 'AwaitingFunding',
        amountBaseUnits: null,
      };
    case 'FUND_BUYER':
      return {
        method: 'fund_buyer',
        args: [dealIdArg, { kind: 'address', value: actorAddress }],
        expectedNextState: 'AwaitingFunding or Active',
        amountBaseUnits: String(BigInt(link.principal_base_units) + BigInt(link.buyer_bond_base_units)),
      };
    case 'FUND_SELLER':
      return {
        method: 'fund_seller',
        args: [dealIdArg, { kind: 'address', value: actorAddress }],
        expectedNextState: 'AwaitingFunding or Active',
        amountBaseUnits: link.seller_bond_base_units,
      };
    case 'SUBMIT_EVIDENCE':
      if (!evidenceHash) throw new Error('SUBMIT_EVIDENCE requires an evidence hash.');
      return {
        method: 'submit_evidence',
        args: [dealIdArg, { kind: 'address', value: actorAddress }, { kind: 'bytes32', value: evidenceHash }],
        expectedNextState: 'EvidenceSubmitted',
        amountBaseUnits: null,
      };
    case 'ACCEPT_DELIVERY':
      return {
        method: 'accept_delivery',
        args: [dealIdArg, { kind: 'address', value: actorAddress }],
        expectedNextState: 'SettledSuccess',
        amountBaseUnits: null,
      };
    case 'EXPIRE_FUNDING':
      return {
        method: 'expire_funding',
        args: [dealIdArg],
        expectedNextState: 'FundingExpired',
        amountBaseUnits: null,
      };
  }
}

function assertActionEligibility(
  link: DbCustodyDealLink,
  action: CustodyV2ActionType,
  actorAddress: string,
  effectiveState = link.latest_contract_state,
) {
  assertPublicKey(actorAddress, 'actorAddress');
  const isBuyer = actorAddress === link.buyer_address;
  const isSeller = actorAddress === link.seller_address;

  if (action === 'CREATE_DEAL' && !isBuyer) {
    throw new Error('Only the buyer may create this Custody V2 deal in the application corridor.');
  }
  if (action === 'ACCEPT_TERMS' && !isSeller) {
    throw new Error('Only the seller may accept terms after buyer creation in this application corridor.');
  }
  if (action === 'FUND_BUYER' && !isBuyer) throw new Error('Only the buyer may fund buyer commitment.');
  if (action === 'FUND_SELLER' && !isSeller) throw new Error('Only the seller may fund seller performance bond.');
  if (action === 'SUBMIT_EVIDENCE' && !isSeller) throw new Error('Only the seller may submit evidence.');
  if (action === 'ACCEPT_DELIVERY' && !isBuyer) throw new Error('Only the buyer may accept delivery.');

  const state = effectiveState;
  const allowed =
    (action === 'CREATE_DEAL' && state === 'TermsPending') ||
    (action === 'ACCEPT_TERMS' && state === 'TermsPending') ||
    ((action === 'FUND_BUYER' || action === 'FUND_SELLER' || action === 'EXPIRE_FUNDING') && state === 'AwaitingFunding') ||
    (action === 'SUBMIT_EVIDENCE' && state === 'Active') ||
    (action === 'ACCEPT_DELIVERY' && state === 'EvidenceSubmitted');
  if (!allowed) {
    throw new Error(`Custody V2 action ${action} is not allowed from ${state}.`);
  }
}

export async function prepareCustodyV2Operation(input: {
  repository: IRepository;
  rpcPort: StellarRpcPort;
  config: CustodyV2ServerConfig;
  applicationDealId: string;
  actionType: CustodyV2ActionType;
  actorAddress: string;
  evidenceHash?: string;
  contractReader?: CustodyV2ContractReadPort;
  now?: Date;
}): Promise<CustodyV2PreparedResponse> {
  const link = await input.repository.getCustodyDealLink(input.applicationDealId);
  if (!link) throw new Error('Custody V2 deal link was not found.');
  if (link.rail_version !== 'custody_v2_testnet') throw new Error('Deal is not on the Custody V2 Testnet rail.');
  if (link.contract_id !== input.config.contractId) throw new Error('Custody V2 contract ID mismatch.');
  if (link.asset_contract_id !== input.config.assetContractId) throw new Error('Custody V2 asset contract ID mismatch.');
  let effectiveState = link.latest_contract_state;
  if (input.contractReader) {
    if (input.actionType === 'CREATE_DEAL') {
      const exists = await input.contractReader.dealExists(input.actorAddress, link.contract_deal_id);
      if (exists.ok && exists.value) throw new Error('Custody V2 on-chain deal already exists.');
      if (!exists.ok) throw new Error(`Custody V2 direct existence read failed: ${exists.message}`);
    } else {
      const chainDeal = await input.contractReader.getDeal(input.actorAddress, link.contract_deal_id);
      if (!chainDeal.ok) throw new Error(`Custody V2 direct deal read failed: ${chainDeal.message}`);
      assertChainDealMatchesLink({ link, chainDeal: chainDeal.value });
      effectiveState = chainDeal.value.state;
    }
  }
  assertActionEligibility(link, input.actionType, input.actorAddress, effectiveState);

  const networkOk = await input.rpcPort.verifyNetworkIdentity(input.config.networkPassphrase);
  if (!networkOk) throw new Error('Stellar RPC network identity did not match Testnet.');

  const source = await input.rpcPort.loadSourceAccount(input.actorAddress);
  if (!source.ok) throw new Error('Could not load the actor source account from Stellar RPC.');

  const now = input.now ?? new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);
  const expiresAt = new Date((nowUnix + MAX_TIME_SECONDS) * 1000).toISOString();
  const minTimeUnix = Math.max(0, nowUnix - 60);
  const call = contractArgumentsForAction(link, input.actionType, input.actorAddress, input.evidenceHash);
  const encoded = encodeContractArguments(call.args);
  if (!encoded.ok) {
    throw new Error(`Could not encode Custody V2 contract arguments: ${encoded.error_code}`);
  }

  const unsigned = constructUnsignedSorobanTransaction({
    source_address: input.actorAddress,
    source_sequence: source.sequence,
    network_passphrase: input.config.networkPassphrase,
    contract_id: input.config.contractId,
    method: call.method,
    encoded_arguments: encoded.values,
    base_fee_stroops: BASE_FEE_STROOPS,
    min_time_unix: minTimeUnix,
    max_time_unix: nowUnix + MAX_TIME_SECONDS,
  });
  if (!unsigned.ok) throw new Error(`Could not construct Custody V2 transaction: ${unsigned.error_code}`);

  const parsedUnsigned = TransactionBuilder.fromXDR(unsigned.unsigned_transaction_xdr, input.config.networkPassphrase);
  if (!(parsedUnsigned instanceof Transaction)) {
    throw new Error('Constructed Custody V2 transaction was not a normal transaction.');
  }
  const simulated = await input.rpcPort.simulateAndPrepareTransaction(parsedUnsigned);
  if (!simulated.ok) throw new Error(`Custody V2 simulation failed: ${simulated.error_code}`);
  if (!(simulated.prepared_transaction instanceof Transaction)) {
    throw new Error('Custody V2 prepared transaction must be a normal transaction.');
  }

  const unsignedXdr = simulated.prepared_transaction.toXDR();
  const fingerprint = readTransactionBodyFingerprint(unsignedXdr, input.config.networkPassphrase);
  const idempotencyKey = sha256Hex([
    input.applicationDealId,
    link.contract_deal_id,
    input.actionType,
    input.actorAddress,
    link.latest_contract_state,
    input.evidenceHash ?? '',
  ].join(':'));
  const createdAt = now.toISOString();
  const operation: DbCustodyOperation = {
    operation_id: `custody-v2:${idempotencyKey}`,
    application_deal_id: input.applicationDealId,
    contract_deal_id: link.contract_deal_id,
    action_type: input.actionType,
    actor_address: input.actorAddress,
    idempotency_key: idempotencyKey,
    prepared_transaction_body_fingerprint: fingerprint,
    unsigned_transaction_xdr: unsignedXdr,
    prepared_expires_at: expiresAt,
    transaction_hash: null,
    status: 'prepared',
    rpc_result_category: null,
    confirmed_ledger: null,
    failure_code: null,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const stored = await input.repository.createCustodyOperation(operation);
  return {
    operation: stored.operation,
    unsigned_xdr: stored.operation.unsigned_transaction_xdr,
    network_passphrase: input.config.networkPassphrase,
    source_address: input.actorAddress,
    summary: {
      network: 'Stellar Testnet',
      contract_id: input.config.contractId,
      function_name: call.method,
      participant: input.actorAddress,
      settlement_asset: 'XLM',
      amount_base_units: call.amountBaseUnits,
      expected_next_state: call.expectedNextState,
      expires_at: stored.operation.prepared_expires_at,
    },
  };
}

export function verifySignedCustodyV2Envelope(input: {
  signedXdr: string;
  preparedOperation: DbCustodyOperation;
  networkPassphrase: string;
  expectedSigner: string;
}) {
  const fingerprint = readTransactionBodyFingerprint(input.signedXdr, input.networkPassphrase);
  if (fingerprint !== input.preparedOperation.prepared_transaction_body_fingerprint) {
    throw new Error('Signed transaction body does not match the prepared Custody V2 operation.');
  }
  const signed = TransactionBuilder.fromXDR(input.signedXdr, input.networkPassphrase);
  if (!(signed instanceof Transaction)) {
    throw new Error('Signed Custody V2 envelope must be a normal transaction.');
  }
  const keypair = StrKey.isValidEd25519PublicKey(input.expectedSigner)
    ? Keypair.fromPublicKey(input.expectedSigner)
    : null;
  if (!keypair) throw new Error('Expected signer is not a valid Stellar public address.');
  const hash = signed.hash();
  const hasSignature = signed.signatures.some((signature) => (
    Buffer.from(signature.hint()).equals(Buffer.from(keypair.signatureHint())) &&
    keypair.verify(hash, signature.signature())
  ));
  if (!hasSignature) {
    throw new Error('Signed Custody V2 transaction is missing the expected wallet signature.');
  }
  return signed;
}
