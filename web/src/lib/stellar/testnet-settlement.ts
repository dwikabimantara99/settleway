import {
  Account,
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { DbDeal } from '@/lib/db/types';
import type { StellarSignerPort } from '@/lib/stellar/server/stellar-signer-port';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';
import { resolveManagedProfileWallet } from '@/lib/stellar/testnet-funding';

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const IDR_PER_TESTNET_XLM = 100_000_000;

export interface SettlementTransport {
  loadSequence(address: string): Promise<string>;
  submitTransaction(signedXdr: string): Promise<{ hash: string }>;
}

export class HorizonSettlementTransport implements SettlementTransport {
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

function idrToProofAmountXlm(valueIdr: number): string {
  const amount = Math.max(0.0000001, valueIdr / IDR_PER_TESTNET_XLM);
  return amount.toFixed(7);
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

function buildSettlementMemo(dealId: string): string {
  return `SW:s:${dealId.slice(-20)}`;
}

export function resolveSuccessSettlementProofAmounts(deal: DbDeal) {
  return {
    buyerBondReturnXlm: idrToProofAmountXlm(deal.buyer_bond_idr),
    sellerPayoutXlm: idrToProofAmountXlm(deal.principal_idr + deal.seller_bond_idr),
    platformFeeRetainedXlm: idrToProofAmountXlm(deal.buyer_fee_idr + deal.seller_fee_idr),
  };
}

export async function executeSuccessSettlement(input: {
  deal: DbDeal;
  signer: StellarSignerPort;
  transport?: SettlementTransport;
  custodyAddress?: string;
  buyerManagedAddress?: string;
  sellerManagedAddress?: string;
}) {
  if (input.deal.status !== 'DELIVERED') {
    throw new Error('Success settlement requires a DELIVERED deal.');
  }
  if (!input.deal.proof_hash || !input.deal.latest_stellar_tx_hash) {
    throw new Error('Success settlement requires completed proof and delivery references.');
  }

  const custodyAddress = input.custodyAddress ?? TESTNET_DEMO_IDENTITIES.platform.public_address;
  const buyerManagedAddress = input.buyerManagedAddress ?? resolveManagedProfileWallet('buyer');
  const sellerManagedAddress = input.sellerManagedAddress ?? resolveManagedProfileWallet('seller');
  const amounts = resolveSuccessSettlementProofAmounts(input.deal);
  const transport = input.transport ?? new HorizonSettlementTransport();
  const platformSequence = await transport.loadSequence(custodyAddress);

  const transaction = new TransactionBuilder(
    new Account(custodyAddress, platformSequence),
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    },
  )
    .addMemo(Memo.text(buildSettlementMemo(input.deal.id)))
    .addOperation(
      Operation.payment({
        destination: buyerManagedAddress,
        asset: Asset.native(),
        amount: amounts.buyerBondReturnXlm,
      }),
    )
    .addOperation(
      Operation.payment({
        destination: sellerManagedAddress,
        asset: Asset.native(),
        amount: amounts.sellerPayoutXlm,
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
    throw new Error('Managed settlement signer unavailable for admin.');
  }

  const signedTransaction = new Transaction(signed.signed_transaction_xdr, Networks.TESTNET);
  if (!hasSignature(signedTransaction, custodyAddress)) {
    throw new Error('Settlement transaction is missing the custody wallet signature.');
  }

  const submitted = await transport.submitTransaction(signed.signed_transaction_xdr);
  return {
    transactionHash: submitted.hash,
    custodyAddress,
    buyerManagedAddress,
    sellerManagedAddress,
    assetCode: 'XLM',
    ...amounts,
  };
}
