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
import {
  resolveFundingProofAmountXlm,
  resolveManagedProfileWallet,
} from '@/lib/stellar/testnet-funding';

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';

export interface CustodySweepTransport {
  loadSequence(address: string): Promise<string>;
  submitTransaction(signedXdr: string): Promise<{ hash: string }>;
}

export interface CustodySweepIdentities {
  custodyAddress: string;
  buyerManagedAddress: string;
  sellerManagedAddress: string;
}

const DEFAULT_CUSTODY_IDENTITIES: CustodySweepIdentities = {
  custodyAddress: TESTNET_DEMO_IDENTITIES.platform.public_address,
  buyerManagedAddress: resolveManagedProfileWallet('buyer'),
  sellerManagedAddress: resolveManagedProfileWallet('seller'),
};

export class HorizonCustodySweepTransport implements CustodySweepTransport {
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

function buildCustodyMemo(dealId: string): string {
  return `SW:c:${dealId.slice(-20)}`;
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

async function signWithManagedRole(input: {
  xdr: string;
  signer: StellarSignerPort;
  signerRole: 'admin' | 'buyer_demo' | 'seller_demo';
  expectedAddress: string;
}): Promise<string> {
  const result = await input.signer.signTransaction({
    prepared_transaction_xdr: input.xdr,
    expected_network_passphrase: Networks.TESTNET,
    signer_role: input.signerRole,
    expected_signer_address: input.expectedAddress,
  });

  if (!result.ok) {
    throw new Error(`Managed custody signer unavailable for ${input.signerRole}.`);
  }

  return result.signed_transaction_xdr;
}

export async function executeAtomicCustodySweep(input: {
  deal: DbDeal;
  signer: StellarSignerPort;
  transport?: CustodySweepTransport;
  identities?: CustodySweepIdentities;
}) {
  if (input.deal.status !== 'CUSTODY_PENDING') {
    throw new Error('Custody sweep requires CUSTODY_PENDING deal status.');
  }

  const transport = input.transport ?? new HorizonCustodySweepTransport();
  const identities = input.identities ?? DEFAULT_CUSTODY_IDENTITIES;
  const custodyAddress = identities.custodyAddress;
  const buyerAddress = identities.buyerManagedAddress;
  const sellerAddress = identities.sellerManagedAddress;
  const platformSequence = await transport.loadSequence(custodyAddress);

  const transaction = new TransactionBuilder(
    new Account(custodyAddress, platformSequence),
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    },
  )
    .addMemo(Memo.text(buildCustodyMemo(input.deal.id)))
    .addOperation(
      Operation.payment({
        source: buyerAddress,
        destination: custodyAddress,
        asset: Asset.native(),
        amount: resolveFundingProofAmountXlm(input.deal, 'buyer'),
      }),
    )
    .addOperation(
      Operation.payment({
        source: sellerAddress,
        destination: custodyAddress,
        asset: Asset.native(),
        amount: resolveFundingProofAmountXlm(input.deal, 'seller'),
      }),
    )
    .setTimeout(180)
    .build();

  let signedXdr = transaction.toXDR();
  signedXdr = await signWithManagedRole({
    xdr: signedXdr,
    signer: input.signer,
    signerRole: 'admin',
    expectedAddress: custodyAddress,
  });
  signedXdr = await signWithManagedRole({
    xdr: signedXdr,
    signer: input.signer,
    signerRole: 'buyer_demo',
    expectedAddress: buyerAddress,
  });
  signedXdr = await signWithManagedRole({
    xdr: signedXdr,
    signer: input.signer,
    signerRole: 'seller_demo',
    expectedAddress: sellerAddress,
  });

  const signedTransaction = new Transaction(signedXdr, Networks.TESTNET);
  if (
    !hasSignature(signedTransaction, custodyAddress) ||
    !hasSignature(signedTransaction, buyerAddress) ||
    !hasSignature(signedTransaction, sellerAddress)
  ) {
    throw new Error('Atomic custody sweep is missing a required managed-wallet signature.');
  }

  const submitted = await transport.submitTransaction(signedXdr);
  return {
    transactionHash: submitted.hash,
    custodyAddress,
    buyerAmountXlm: resolveFundingProofAmountXlm(input.deal, 'buyer'),
    sellerAmountXlm: resolveFundingProofAmountXlm(input.deal, 'seller'),
    assetCode: 'XLM',
  };
}
