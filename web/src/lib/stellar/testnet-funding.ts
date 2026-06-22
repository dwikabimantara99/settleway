import {
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
import type { DbDeal, DbProfile } from '@/lib/db/types';
import type { EscrowAction } from '@/lib/escrow/state-machine';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';

export type SignedFundingAction = Extract<EscrowAction, 'buyer_deposit' | 'seller_deposit'>;
export type FundingParticipantRole = 'buyer' | 'seller';

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const IDR_PER_TESTNET_XLM = 100_000_000;

interface HorizonTransactionRecord {
  hash?: string;
  source_account?: string;
  successful?: boolean;
  memo_type?: string;
  memo?: string;
  created_at?: string;
}

interface HorizonPaymentRecord {
  type?: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  transaction_successful?: boolean;
}

interface HorizonCollection<T> {
  _embedded?: {
    records?: T[];
  };
}

export function resolveFundingRole(action: SignedFundingAction): FundingParticipantRole {
  return action === 'buyer_deposit' ? 'buyer' : 'seller';
}

export function resolveFundingTotalIdr(deal: DbDeal, role: FundingParticipantRole): number {
  return role === 'buyer' ? deal.buyer_total_idr : deal.seller_total_idr;
}

export function resolveManagedProfileWallet(role: FundingParticipantRole): string {
  return role === 'buyer'
    ? TESTNET_DEMO_IDENTITIES.buyer.public_address
    : TESTNET_DEMO_IDENTITIES.seller.public_address;
}

export function resolveFundingProofAmountXlm(deal: DbDeal, role: FundingParticipantRole): string {
  const totalIdr = resolveFundingTotalIdr(deal, role);
  const amount = Math.max(0.0000001, totalIdr / IDR_PER_TESTNET_XLM);
  return amount.toFixed(7);
}

export function resolveSignedFundingTargetStatus(
  currentStatus: DbDeal['status'],
  action: SignedFundingAction,
): DbDeal['status'] {
  if (currentStatus === 'WAITING_DEPOSITS') {
    return action === 'buyer_deposit' ? 'BUYER_FUNDED' : 'SELLER_FUNDED';
  }

  if (
    (currentStatus === 'BUYER_FUNDED' && action === 'seller_deposit') ||
    (currentStatus === 'SELLER_FUNDED' && action === 'buyer_deposit')
  ) {
    return 'CUSTODY_PENDING';
  }

  throw new Error(`Invalid signed funding transition: ${action} from ${currentStatus}`);
}

export function buildFundingMemo(dealId: string, role: FundingParticipantRole): string {
  return `SW:${role[0]}:${dealId.slice(-20)}`;
}

function readMemoText(transaction: Transaction): string | null {
  if (transaction.memo.type !== 'text') return null;
  const value = transaction.memo.value;
  if (value === null) return null;
  return typeof value === 'string' ? value : Buffer.from(value).toString('utf8');
}

export function assertConnectedWalletForFunding(input: {
  profile: DbProfile | null;
  sourceAddress: string;
}) {
  if (!input.profile?.connected_wallet_address) {
    throw new Error('Connect a Stellar Testnet wallet on your profile before funding.');
  }

  if (input.profile.connected_wallet_network !== 'testnet') {
    throw new Error('Connected wallet must be on Stellar Testnet before funding.');
  }

  if (!StrKey.isValidEd25519PublicKey(input.sourceAddress)) {
    throw new Error('Funding source must be a valid Stellar public key.');
  }

  if (input.profile.connected_wallet_address !== input.sourceAddress) {
    throw new Error('Funding wallet must match the Stellar wallet linked to this profile.');
  }
}

export async function buildFundingPaymentXdr(input: {
  deal: DbDeal;
  action: SignedFundingAction;
  sourceAddress: string;
}) {
  const role = resolveFundingRole(input.action);
  const destination = resolveManagedProfileWallet(role);
  const amount = resolveFundingProofAmountXlm(input.deal, role);
  const server = new Horizon.Server(HORIZON_TESTNET_URL);
  const sourceAccount = await server.loadAccount(input.sourceAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addMemo(Memo.text(buildFundingMemo(input.deal.id, role)))
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      }),
    )
    .setTimeout(180)
    .build();

  return {
    unsigned_xdr: tx.toXDR(),
    network_passphrase: Networks.TESTNET,
    source_address: input.sourceAddress,
    destination_address: destination,
    amount_xlm: amount,
    funding_total_idr: resolveFundingTotalIdr(input.deal, role),
  };
}

export function validateSignedFundingXdr(input: {
  signedXdr: string;
  deal: DbDeal;
  action: SignedFundingAction;
  sourceAddress: string;
}) {
  const role = resolveFundingRole(input.action);
  const expectedDestination = resolveManagedProfileWallet(role);
  const expectedAmount = resolveFundingProofAmountXlm(input.deal, role);
  const tx = new Transaction(input.signedXdr, Networks.TESTNET);
  const operation = tx.operations[0];
  const expectedMemo = buildFundingMemo(input.deal.id, role);

  if (tx.source !== input.sourceAddress) {
    throw new Error('Signed funding transaction source does not match the connected wallet.');
  }

  if (tx.operations.length !== 1 || operation?.type !== 'payment') {
    throw new Error('Signed funding transaction must contain exactly one payment operation.');
  }

  if (readMemoText(tx) !== expectedMemo) {
    throw new Error('Signed funding transaction memo does not match this deal and participant role.');
  }

  if (operation.source && operation.source !== input.sourceAddress) {
    throw new Error('Signed funding payment operation source does not match the connected wallet.');
  }

  if (operation.destination !== expectedDestination) {
    throw new Error('Signed funding transaction destination does not match the managed profile wallet.');
  }

  if (!operation.asset.isNative()) {
    throw new Error('Signed funding transaction must use Testnet XLM in this funding foundation.');
  }

  if (operation.amount !== expectedAmount) {
    throw new Error('Signed funding transaction amount does not match the expected funding proof amount.');
  }

  const sourceKeypair = Keypair.fromPublicKey(input.sourceAddress);
  const expectedHint = Buffer.from(sourceKeypair.signatureHint());
  const transactionHash = tx.hash();
  const hasValidSourceSignature = tx.signatures.some((signature) => (
    Buffer.from(signature.hint()).equals(expectedHint) &&
    sourceKeypair.verify(transactionHash, signature.signature())
  ));

  if (!hasValidSourceSignature) {
    throw new Error('Signed funding transaction does not contain a valid connected-wallet signature.');
  }

  return tx;
}

async function readHorizonJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Stellar Horizon request failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

async function isConfirmedTransactionHash(
  transactionHash: string,
  fetcher: typeof fetch,
): Promise<boolean> {
  const response = await fetcher(`${HORIZON_TESTNET_URL}/transactions/${transactionHash}`);
  if (response.status === 404) return false;
  const record = await readHorizonJson<HorizonTransactionRecord>(response);
  return record.hash === transactionHash && record.successful === true;
}

export async function findConfirmedFundingTransaction(input: {
  deal: DbDeal;
  action: SignedFundingAction;
  sourceAddress: string;
  fetcher?: typeof fetch;
}): Promise<{ hash: string } | null> {
  const fetcher = input.fetcher ?? fetch;
  const role = resolveFundingRole(input.action);
  const expectedMemo = buildFundingMemo(input.deal.id, role);
  const expectedDestination = resolveManagedProfileWallet(role);
  const expectedAmount = resolveFundingProofAmountXlm(input.deal, role);
  const createdAt = Date.parse(input.deal.created_at);
  const transactionsUrl = new URL(
    `${HORIZON_TESTNET_URL}/accounts/${input.sourceAddress}/transactions`,
  );
  transactionsUrl.searchParams.set('order', 'desc');
  transactionsUrl.searchParams.set('limit', '50');

  const transactionsResponse = await fetcher(transactionsUrl);
  if (transactionsResponse.status === 404) return null;
  const transactions = await readHorizonJson<HorizonCollection<HorizonTransactionRecord>>(
    transactionsResponse,
  );
  const candidates = transactions._embedded?.records ?? [];

  for (const candidate of candidates) {
    if (
      candidate.successful !== true ||
      candidate.source_account !== input.sourceAddress ||
      candidate.memo_type !== 'text' ||
      candidate.memo !== expectedMemo ||
      typeof candidate.hash !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(candidate.hash)
    ) {
      continue;
    }

    if (
      Number.isFinite(createdAt) &&
      typeof candidate.created_at === 'string' &&
      Date.parse(candidate.created_at) < createdAt
    ) {
      continue;
    }

    const operationsResponse = await fetcher(
      `${HORIZON_TESTNET_URL}/transactions/${candidate.hash}/operations?order=asc&limit=2`,
    );
    const operations = await readHorizonJson<HorizonCollection<HorizonPaymentRecord>>(
      operationsResponse,
    );
    const records = operations._embedded?.records ?? [];
    const payment = records[0];

    if (
      records.length === 1 &&
      payment?.type === 'payment' &&
      payment.transaction_successful === true &&
      payment.from === input.sourceAddress &&
      payment.to === expectedDestination &&
      payment.asset_type === 'native' &&
      payment.amount === expectedAmount
    ) {
      return { hash: candidate.hash };
    }
  }

  return null;
}

export async function submitSignedFundingTransaction(
  signedXdr: string,
  dependencies: {
    fetcher?: typeof fetch;
    submitter?: (transaction: Transaction) => Promise<{ hash: string }>;
  } = {},
) {
  const tx = new Transaction(signedXdr, Networks.TESTNET);
  const transactionHash = tx.hash().toString('hex');
  const fetcher = dependencies.fetcher ?? fetch;

  if (await isConfirmedTransactionHash(transactionHash, fetcher)) {
    return {
      hash: transactionHash,
      reused_existing: true,
    };
  }

  const submitter = dependencies.submitter ?? (async (transaction: Transaction) => {
    const server = new Horizon.Server(HORIZON_TESTNET_URL);
    return server.submitTransaction(transaction);
  });

  try {
    const result = await submitter(tx);

    return {
      hash: result.hash,
      reused_existing: false,
    };
  } catch (error) {
    if (await isConfirmedTransactionHash(transactionHash, fetcher)) {
      return {
        hash: transactionHash,
        reused_existing: true,
      };
    }
    throw error;
  }
}
