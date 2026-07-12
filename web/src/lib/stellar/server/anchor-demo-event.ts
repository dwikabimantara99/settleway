import {
  Account,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_TESTNET_URL);

export interface AnchorDemoEventInput {
  deal_id: string;
  event_type: string;
  actor_id: string;
  payload: Record<string, unknown>;
}

export interface AnchorDemoEventResult {
  proof_hash: string;
  tx_hash: string;
  ledger: number | null;
  created_at: string;
  stellar_network: 'testnet';
}

function buildCanonicalPayloadHash(input: AnchorDemoEventInput): { proofHash: string; proofBytes: Buffer } {
  // Sort keys for deterministic hash
  const canonicalString = JSON.stringify(input.payload, Object.keys(input.payload).sort());
  const hash = createHash('sha256')
    .update(input.deal_id)
    .update(input.event_type)
    .update(input.actor_id)
    .update(canonicalString)
    .digest();
  
  return {
    proofHash: hash.toString('hex'),
    proofBytes: hash,
  };
}

export async function anchorDemoEvent(input: AnchorDemoEventInput): Promise<AnchorDemoEventResult> {
  const secret = process.env.STELLAR_PLATFORM_SECRET;
  if (!secret) {
    throw new Error('STELLAR_PLATFORM_SECRET is not configured for demo anchoring.');
  }

  const adminKeypair = Keypair.fromSecret(secret);
  const adminAddress = adminKeypair.publicKey();
  
  const { proofHash, proofBytes } = buildCanonicalPayloadHash(input);

  // Load account
  const accountResponse = await server.loadAccount(adminAddress);
  const sequence = accountResponse.sequenceNumber();

  // Build transaction
  const transaction = new TransactionBuilder(
    new Account(adminAddress, sequence),
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    }
  )
    .addMemo(Memo.hash(proofBytes))
    .addOperation(
      Operation.manageData({
        name: `EVT:${input.deal_id.slice(-10)}:${input.event_type.slice(0, 10)}`,
        value: proofBytes,
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(adminKeypair);

  // Submit
  const submission = await server.submitTransaction(transaction);
  if (!submission.successful) {
    throw new Error('Failed to submit demo anchor to Stellar Testnet.');
  }

  return {
    proof_hash: proofHash,
    tx_hash: submission.hash,
    ledger: submission.ledger,
    created_at: new Date().toISOString(),
    stellar_network: 'testnet',
  };
}
