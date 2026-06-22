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
  executeAtomicCustodySweep,
  type CustodySweepIdentities,
  type CustodySweepTransport,
} from '@/lib/stellar/testnet-custody';

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: 'deal-custody-test',
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
    status: 'CUSTODY_PENDING',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createTestRuntime(): {
  signer: StellarSignerPort;
  identities: CustodySweepIdentities;
} {
  const keypairs = {
    admin: Keypair.random(),
    buyer_demo: Keypair.random(),
    seller_demo: Keypair.random(),
  };

  const expectedAddresses = {
    admin: keypairs.admin.publicKey(),
    buyer_demo: keypairs.buyer_demo.publicKey(),
    seller_demo: keypairs.seller_demo.publicKey(),
  };

  return {
    identities: {
      custodyAddress: expectedAddresses.admin,
      buyerManagedAddress: expectedAddresses.buyer_demo,
      sellerManagedAddress: expectedAddresses.seller_demo,
    },
    signer: {
      async signTransaction(request: StellarSignRequest) {
        if (request.expected_signer_address !== expectedAddresses[request.signer_role]) {
          return { ok: false as const, error_code: 'ERR_SIGNER_REJECTED' as const };
        }

        const transaction = TransactionBuilder.fromXDR(
          request.prepared_transaction_xdr,
          request.expected_network_passphrase,
        );
        transaction.sign(keypairs[request.signer_role]);
        return {
          ok: true as const,
          signed_transaction_xdr: transaction.toXDR(),
        };
      },
    },
  };
}

describe('atomic Testnet custody sweep', () => {
  it('builds one sponsored transaction with buyer and seller payment operations', async () => {
    const runtime = createTestRuntime();
    const submitTransaction = vi.fn(async (signedXdr: string) => {
      const transaction = new Transaction(signedXdr, Networks.TESTNET);
      expect(transaction.source).toBe(runtime.identities.custodyAddress);
      expect(transaction.operations).toHaveLength(2);
      expect(transaction.operations[0]?.source).toBe(runtime.identities.buyerManagedAddress);
      expect(transaction.operations[1]?.source).toBe(runtime.identities.sellerManagedAddress);
      return { hash: 'a'.repeat(64) };
    });
    const transport: CustodySweepTransport = {
      loadSequence: vi.fn(async () => '1'),
      submitTransaction,
    };

    const result = await executeAtomicCustodySweep({
      deal: makeDeal(),
      signer: runtime.signer,
      transport,
      identities: runtime.identities,
    });

    expect(result.transactionHash).toBe('a'.repeat(64));
    expect(result.assetCode).toBe('XLM');
    expect(submitTransaction).toHaveBeenCalledOnce();
  });

  it('refuses to sweep a deal before both funding transactions are confirmed', async () => {
    const runtime = createTestRuntime();
    await expect(
      executeAtomicCustodySweep({
        deal: makeDeal({ status: 'BUYER_FUNDED' }),
        signer: runtime.signer,
        identities: runtime.identities,
        transport: {
          loadSequence: vi.fn(),
          submitTransaction: vi.fn(),
        },
      }),
    ).rejects.toThrow('CUSTODY_PENDING');
  });
});
