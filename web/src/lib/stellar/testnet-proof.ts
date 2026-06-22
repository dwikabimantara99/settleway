import {
  Account,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';
import type { DbDeal } from '@/lib/db/types';
import type { StellarSignerPort } from '@/lib/stellar/server/stellar-signer-port';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';

export interface ProofReferenceTransport {
  loadSequence(address: string): Promise<string>;
  submitTransaction(signedXdr: string): Promise<{ hash: string }>;
}

export class HorizonProofReferenceTransport implements ProofReferenceTransport {
  readonly #server = new Horizon.Server(HORIZON_TESTNET_URL);

  async loadSequence(address: string): Promise<string> {
    const account = await this.#server.loadAccount(address);
    return account.sequenceNumber();
  }

  async submitTransaction(signedXdr: string): Promise<{ hash: string }> {
    const transaction = new Transaction(signedXdr, Networks.TESTNET);
    const result = await this.#server.submitTransaction(transaction);
    return { hash: result.hash };
  }
}

function buildProofDataKey(dealId: string): string {
  return `SWP:${dealId.slice(-20)}`;
}

function buildDeliveryDataKey(dealId: string): string {
  return `SWD:${dealId.slice(-20)}`;
}

function proofHashToBytes(proofHash: string): Buffer {
  if (!/^[a-f0-9]{64}$/.test(proofHash)) {
    throw new Error('Proof hash must be a lowercase SHA-256 hex string.');
  }

  return Buffer.from(proofHash, 'hex');
}

function buildDeliveryReferenceBytes(deal: DbDeal): Buffer {
  const payload = [
    'settleway-delivery',
    deal.id,
    deal.proof_hash ?? '',
    deal.latest_stellar_tx_hash ?? '',
  ].join(':');

  return createHash('sha256').update(payload).digest();
}

function hasSignature(transaction: Transaction, publicAddress: string): boolean {
  const keypair = Keypair.fromPublicKey(publicAddress);
  const expectedHint = Buffer.from(keypair.signatureHint());
  const transactionHash = transaction.hash();

  return transaction.signatures.some((signature) => (
    Buffer.from(signature.hint()).equals(expectedHint) &&
    keypair.verify(transactionHash, signature.signature())
  ));
}

export async function executeCustodyProofReference(input: {
  deal: DbDeal;
  proofHash: string;
  signer: StellarSignerPort;
  transport?: ProofReferenceTransport;
  custodyAddress?: string;
}) {
  if (input.deal.status !== 'LOCKED') {
    throw new Error('Proof reference requires a LOCKED deal.');
  }
  if (!input.deal.latest_stellar_tx_hash) {
    throw new Error('Proof reference requires an existing custody lock transaction.');
  }

  const proofBytes = proofHashToBytes(input.proofHash);
  const custodyAddress = input.custodyAddress ?? TESTNET_DEMO_IDENTITIES.platform.public_address;
  const transport = input.transport ?? new HorizonProofReferenceTransport();
  const platformSequence = await transport.loadSequence(custodyAddress);

  const transaction = new TransactionBuilder(
    new Account(custodyAddress, platformSequence),
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    },
  )
    .addMemo(Memo.hash(proofBytes))
    .addOperation(
      Operation.manageData({
        name: buildProofDataKey(input.deal.id),
        value: proofBytes,
      }),
    )
    .setTimeout(180)
    .build();

  const signed = await input.signer.signTransaction({
    prepared_transaction_xdr: transaction.toXDR(),
    expected_network_passphrase: Networks.TESTNET,
    signer_role: 'admin',
    expected_signer_address: custodyAddress,
  });

  if (!signed.ok) {
    throw new Error('Managed proof signer unavailable for admin.');
  }

  const signedTransaction = new Transaction(signed.signed_transaction_xdr, Networks.TESTNET);
  if (!hasSignature(signedTransaction, custodyAddress)) {
    throw new Error('Proof reference transaction is missing the custody wallet signature.');
  }

  const submitted = await transport.submitTransaction(signed.signed_transaction_xdr);
  return {
    transactionHash: submitted.hash,
    custodyAddress,
    proofHash: input.proofHash,
    proofDataKey: buildProofDataKey(input.deal.id),
  };
}

export async function executeCustodyDeliveryReference(input: {
  deal: DbDeal;
  signer: StellarSignerPort;
  transport?: ProofReferenceTransport;
  custodyAddress?: string;
}) {
  if (input.deal.status !== 'PROOF_SUBMITTED') {
    throw new Error('Delivery reference requires a PROOF_SUBMITTED deal.');
  }
  if (!input.deal.proof_hash) {
    throw new Error('Delivery reference requires an existing proof hash.');
  }
  if (!input.deal.latest_stellar_tx_hash) {
    throw new Error('Delivery reference requires an existing proof transaction.');
  }

  const deliveryBytes = buildDeliveryReferenceBytes(input.deal);
  const custodyAddress = input.custodyAddress ?? TESTNET_DEMO_IDENTITIES.platform.public_address;
  const transport = input.transport ?? new HorizonProofReferenceTransport();
  const platformSequence = await transport.loadSequence(custodyAddress);

  const transaction = new TransactionBuilder(
    new Account(custodyAddress, platformSequence),
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    },
  )
    .addMemo(Memo.hash(deliveryBytes))
    .addOperation(
      Operation.manageData({
        name: buildDeliveryDataKey(input.deal.id),
        value: deliveryBytes,
      }),
    )
    .setTimeout(180)
    .build();

  const signed = await input.signer.signTransaction({
    prepared_transaction_xdr: transaction.toXDR(),
    expected_network_passphrase: Networks.TESTNET,
    signer_role: 'admin',
    expected_signer_address: custodyAddress,
  });

  if (!signed.ok) {
    throw new Error('Managed delivery signer unavailable for admin.');
  }

  const signedTransaction = new Transaction(signed.signed_transaction_xdr, Networks.TESTNET);
  if (!hasSignature(signedTransaction, custodyAddress)) {
    throw new Error('Delivery reference transaction is missing the custody wallet signature.');
  }

  const submitted = await transport.submitTransaction(signed.signed_transaction_xdr);
  return {
    transactionHash: submitted.hash,
    custodyAddress,
    deliveryDataKey: buildDeliveryDataKey(input.deal.id),
  };
}
