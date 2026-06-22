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
  executeSuccessSettlement,
  resolveSuccessSettlementProofAmounts,
  type SettlementTransport,
} from '@/lib/stellar/testnet-settlement';

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: 'deal-settlement-test',
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
    status: 'DELIVERED',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: 'd'.repeat(64),
    stellar_sync_status: 'idle',
    proof_hash: 'b'.repeat(64),
    terms: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Testnet success settlement', () => {
  it('builds one custody-signed settlement transaction to buyer and seller managed wallets', async () => {
    const custodyKeypair = Keypair.random();
    const buyerManagedKeypair = Keypair.random();
    const sellerManagedKeypair = Keypair.random();
    const deal = makeDeal();
    const amounts = resolveSuccessSettlementProofAmounts(deal);
    const submitTransaction = vi.fn(async (signedXdr: string) => {
      const transaction = new Transaction(signedXdr, Networks.TESTNET);

      expect(transaction.source).toBe(custodyKeypair.publicKey());
      expect(transaction.operations).toHaveLength(2);

      const buyerPayment = transaction.operations[0];
      const sellerPayment = transaction.operations[1];
      expect(buyerPayment?.type).toBe('payment');
      expect(sellerPayment?.type).toBe('payment');
      if (buyerPayment?.type === 'payment') {
        expect(buyerPayment.destination).toBe(buyerManagedKeypair.publicKey());
        expect(buyerPayment.amount).toBe(amounts.buyerBondReturnXlm);
      }
      if (sellerPayment?.type === 'payment') {
        expect(sellerPayment.destination).toBe(sellerManagedKeypair.publicKey());
        expect(sellerPayment.amount).toBe(amounts.sellerPayoutXlm);
      }

      return { hash: 'e'.repeat(64) };
    });
    const transport: SettlementTransport = {
      loadSequence: vi.fn(async () => '3'),
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

    const result = await executeSuccessSettlement({
      deal,
      signer,
      transport,
      custodyAddress: custodyKeypair.publicKey(),
      buyerManagedAddress: buyerManagedKeypair.publicKey(),
      sellerManagedAddress: sellerManagedKeypair.publicKey(),
    });

    expect(result).toMatchObject({
      transactionHash: 'e'.repeat(64),
      custodyAddress: custodyKeypair.publicKey(),
      buyerManagedAddress: buyerManagedKeypair.publicKey(),
      sellerManagedAddress: sellerManagedKeypair.publicKey(),
      assetCode: 'XLM',
      buyerBondReturnXlm: amounts.buyerBondReturnXlm,
      sellerPayoutXlm: amounts.sellerPayoutXlm,
      platformFeeRetainedXlm: amounts.platformFeeRetainedXlm,
    });
    expect(submitTransaction).toHaveBeenCalledOnce();
  });

  it('refuses settlement before delivery is confirmed', async () => {
    await expect(
      executeSuccessSettlement({
        deal: makeDeal({ status: 'PROOF_SUBMITTED' }),
        signer: {
          signTransaction: vi.fn(),
        },
        transport: {
          loadSequence: vi.fn(),
          submitTransaction: vi.fn(),
        },
        custodyAddress: Keypair.random().publicKey(),
      }),
    ).rejects.toThrow('DELIVERED');
  });
});
