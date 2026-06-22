import {
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { DbDeal } from '@/lib/db/types';
import type {
  StellarSignRequest,
  StellarSignerPort,
} from '@/lib/stellar/server/stellar-signer-port';
import {
  executeCustodyDeliveryReference,
  executeCustodyProofReference,
  type ProofReferenceTransport,
} from '@/lib/stellar/testnet-proof';

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: 'deal-proof-reference-test',
    listing_id: null,
    buyer_request_id: null,
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    commodity: 'Red Chili',
    volume_kg: 700,
    principal_idr: 19_950_000,
    buyer_bond_idr: 997_500,
    seller_bond_idr: 997_500,
    buyer_fee_idr: 99_750,
    seller_fee_idr: 99_750,
    buyer_total_idr: 21_047_250,
    seller_total_idr: 1_097_250,
    status: 'LOCKED',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: 'a'.repeat(64),
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Testnet custody proof reference', () => {
  it('records the proof hash in a custody-signed Stellar transaction', async () => {
    const custodyKeypair = Keypair.random();
    const proofHash = 'b'.repeat(64);
    const submitTransaction = vi.fn(async (signedXdr: string) => {
      const transaction = new Transaction(signedXdr, Networks.TESTNET);

      expect(transaction.source).toBe(custodyKeypair.publicKey());
      expect(transaction.memo.type).toBe('hash');
      expect(transaction.operations).toHaveLength(1);
      expect(transaction.operations[0]?.type).toBe('manageData');

      return { hash: 'c'.repeat(64) };
    });
    const transport: ProofReferenceTransport = {
      loadSequence: vi.fn(async () => '1'),
      submitTransaction,
    };
    const signer: StellarSignerPort = {
      async signTransaction(request: StellarSignRequest) {
        expect(request.signer_role).toBe('admin');
        expect(request.expected_signer_address).toBe(custodyKeypair.publicKey());

        const transaction = TransactionBuilder.fromXDR(
          request.prepared_transaction_xdr,
          request.expected_network_passphrase,
        );
        transaction.sign(custodyKeypair);
        return {
          ok: true as const,
          signed_transaction_xdr: transaction.toXDR(),
        };
      },
    };

    const result = await executeCustodyProofReference({
      deal: makeDeal(),
      proofHash,
      signer,
      transport,
      custodyAddress: custodyKeypair.publicKey(),
    });

    expect(result).toMatchObject({
      transactionHash: 'c'.repeat(64),
      custodyAddress: custodyKeypair.publicKey(),
      proofHash,
      proofDataKey: 'SWP:proof-reference-test',
    });
    expect(submitTransaction).toHaveBeenCalledOnce();
  });

  it('refuses proof reference before custody lock is confirmed', async () => {
    await expect(
      executeCustodyProofReference({
        deal: makeDeal({ status: 'CUSTODY_PENDING', latest_stellar_tx_hash: null }),
        proofHash: 'b'.repeat(64),
        signer: {
          signTransaction: vi.fn(),
        },
        transport: {
          loadSequence: vi.fn(),
          submitTransaction: vi.fn(),
        },
        custodyAddress: Keypair.random().publicKey(),
      }),
    ).rejects.toThrow('LOCKED');
  });

  it('records the delivery milestone in a custody-signed Stellar transaction', async () => {
    const custodyKeypair = Keypair.random();
    const submitTransaction = vi.fn(async (signedXdr: string) => {
      const transaction = new Transaction(signedXdr, Networks.TESTNET);

      expect(transaction.source).toBe(custodyKeypair.publicKey());
      expect(transaction.memo.type).toBe('hash');
      expect(transaction.operations).toHaveLength(1);
      expect(transaction.operations[0]?.type).toBe('manageData');

      return { hash: 'd'.repeat(64) };
    });
    const transport: ProofReferenceTransport = {
      loadSequence: vi.fn(async () => '2'),
      submitTransaction,
    };
    const signer: StellarSignerPort = {
      async signTransaction(request: StellarSignRequest) {
        expect(request.signer_role).toBe('admin');
        expect(request.expected_signer_address).toBe(custodyKeypair.publicKey());

        const transaction = TransactionBuilder.fromXDR(
          request.prepared_transaction_xdr,
          request.expected_network_passphrase,
        );
        transaction.sign(custodyKeypair);
        return {
          ok: true as const,
          signed_transaction_xdr: transaction.toXDR(),
        };
      },
    };

    const result = await executeCustodyDeliveryReference({
      deal: makeDeal({
        status: 'PROOF_SUBMITTED',
        proof_hash: 'b'.repeat(64),
        latest_stellar_tx_hash: 'c'.repeat(64),
      }),
      signer,
      transport,
      custodyAddress: custodyKeypair.publicKey(),
    });

    expect(result).toMatchObject({
      transactionHash: 'd'.repeat(64),
      custodyAddress: custodyKeypair.publicKey(),
      deliveryDataKey: 'SWD:proof-reference-test',
    });
    expect(submitTransaction).toHaveBeenCalledOnce();
  });
});
