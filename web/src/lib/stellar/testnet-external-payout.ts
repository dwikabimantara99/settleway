import {
  Account,
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { DbDeal } from '@/lib/db/types';
import type { StellarSignerPort } from '@/lib/stellar/server/stellar-signer-port';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';
import { resolveManagedProfileWallet } from '@/lib/stellar/testnet-funding';
import { resolveSuccessSettlementProofAmounts } from '@/lib/stellar/testnet-settlement';

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';

export interface ExternalPayoutTransport {
  loadSequence(address: string): Promise<string>;
  submitTransaction(signedXdr: string): Promise<{ hash: string }>;
}

export class HorizonExternalPayoutTransport implements ExternalPayoutTransport {
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

function buildExternalPayoutMemo(dealId: string): string {
  return `SW:x:${dealId.slice(-20)}`;
}

function assertValidDestination(address: string, label: string): void {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error(`${label} must be a valid Stellar public key.`);
  }
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
  const signed = await input.signer.signTransaction({
    prepared_transaction_xdr: input.xdr,
    expected_network_passphrase: Networks.TESTNET,
    signer_role: input.signerRole,
    expected_signer_address: input.expectedAddress,
  });

  if (!signed.ok) {
    throw new Error(`Managed external payout signer unavailable for ${input.signerRole}.`);
  }

  return signed.signed_transaction_xdr;
}

export async function executeExternalWalletPayouts(input: {
  deal: DbDeal;
  buyerConnectedAddress: string;
  sellerConnectedAddress: string;
  signer: StellarSignerPort;
  transport?: ExternalPayoutTransport;
  custodyAddress?: string;
  buyerManagedAddress?: string;
  sellerManagedAddress?: string;
}) {
  if (input.deal.status !== 'COMPLETED') {
    throw new Error('External payout requires a COMPLETED deal.');
  }
  if (!input.deal.latest_stellar_tx_hash) {
    throw new Error('External payout requires a confirmed settlement transaction.');
  }

  assertValidDestination(input.buyerConnectedAddress, 'Buyer connected wallet');
  assertValidDestination(input.sellerConnectedAddress, 'Seller connected wallet');

  const custodyAddress = input.custodyAddress ?? TESTNET_DEMO_IDENTITIES.platform.public_address;
  const buyerManagedAddress = input.buyerManagedAddress ?? resolveManagedProfileWallet('buyer');
  const sellerManagedAddress = input.sellerManagedAddress ?? resolveManagedProfileWallet('seller');
  const amounts = resolveSuccessSettlementProofAmounts(input.deal);
  const transport = input.transport ?? new HorizonExternalPayoutTransport();
  const platformSequence = await transport.loadSequence(custodyAddress);

  const transaction = new TransactionBuilder(
    new Account(custodyAddress, platformSequence),
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    },
  )
    .addMemo(Memo.text(buildExternalPayoutMemo(input.deal.id)))
    .addOperation(
      Operation.payment({
        source: buyerManagedAddress,
        destination: input.buyerConnectedAddress,
        asset: Asset.native(),
        amount: amounts.buyerBondReturnXlm,
      }),
    )
    .addOperation(
      Operation.payment({
        source: sellerManagedAddress,
        destination: input.sellerConnectedAddress,
        asset: Asset.native(),
        amount: amounts.sellerPayoutXlm,
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
    expectedAddress: buyerManagedAddress,
  });
  signedXdr = await signWithManagedRole({
    xdr: signedXdr,
    signer: input.signer,
    signerRole: 'seller_demo',
    expectedAddress: sellerManagedAddress,
  });

  const signedTransaction = new Transaction(signedXdr, Networks.TESTNET);
  if (
    !hasSignature(signedTransaction, custodyAddress) ||
    !hasSignature(signedTransaction, buyerManagedAddress) ||
    !hasSignature(signedTransaction, sellerManagedAddress)
  ) {
    throw new Error('External payout transaction is missing a required managed-wallet signature.');
  }

  const submitted = await transport.submitTransaction(signedXdr);
  return {
    transactionHash: submitted.hash,
    custodyAddress,
    buyerManagedAddress,
    sellerManagedAddress,
    buyerConnectedAddress: input.buyerConnectedAddress,
    sellerConnectedAddress: input.sellerConnectedAddress,
    buyerBondReturnXlm: amounts.buyerBondReturnXlm,
    sellerPayoutXlm: amounts.sellerPayoutXlm,
    assetCode: 'XLM',
  };
}
