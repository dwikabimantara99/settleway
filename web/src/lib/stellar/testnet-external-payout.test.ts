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
  executeExternalWalletPayouts,
  type ExternalPayoutTransport,
} from '@/lib/stellar/testnet-external-payout';
import { resolveSuccessSettlementProofAmounts } from '@/lib/stellar/testnet-settlement';

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: 'deal-external-payout-test',
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
    status: 'COMPLETED',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: 'e'.repeat(64),
    stellar_sync_status: 'idle',
    proof_hash: 'b'.repeat(64),
    terms: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createRuntime() {
  const keypairs = {
    admin: Keypair.random(),
    buyer_demo: Keypair.random(),
    seller_demo: Keypair.random(),
  };
  const addresses = {
    admin: keypairs.admin.publicKey(),
    buyer_demo: keypairs.buyer_demo.publicKey(),
    seller_demo: keypairs.seller_demo.publicKey(),
  };
  const signer: StellarSignerPort = {
    async signTransaction(request: StellarSignRequest) {
      const expectedAddress = addresses[request.signer_role];
      expect(request.expected_signer_address).toBe(expectedAddress);

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
  };

  return { addresses, signer };
}

describe('Testnet external wallet payouts', () => {
  it('sends buyer and seller managed-wallet payouts to connected wallets', async () => {
    const runtime = createRuntime();
    const buyerConnected = Keypair.random().publicKey();
    const sellerConnected = Keypair.random().publicKey();
    const deal = makeDeal();
    const amounts = resolveSuccessSettlementProofAmounts(deal);
    const submitTransaction = vi.fn(async (signedXdr: string) => {
      const transaction = new Transaction(signedXdr, Networks.TESTNET);

      expect(transaction.source).toBe(runtime.addresses.admin);
      expect(transaction.operations).toHaveLength(2);

      const buyerPayment = transaction.operations[0];
      const sellerPayment = transaction.operations[1];
      expect(buyerPayment?.type).toBe('payment');
      expect(sellerPayment?.type).toBe('payment');
      if (buyerPayment?.type === 'payment') {
        expect(buyerPayment.source).toBe(runtime.addresses.buyer_demo);
        expect(buyerPayment.destination).toBe(buyerConnected);
        expect(buyerPayment.amount).toBe(amounts.buyerBondReturnXlm);
      }
      if (sellerPayment?.type === 'payment') {
        expect(sellerPayment.source).toBe(runtime.addresses.seller_demo);
        expect(sellerPayment.destination).toBe(sellerConnected);
        expect(sellerPayment.amount).toBe(amounts.sellerPayoutXlm);
      }

      return { hash: 'f'.repeat(64) };
    });
    const transport: ExternalPayoutTransport = {
      loadSequence: vi.fn(async () => '4'),
      submitTransaction,
    };

    const result = await executeExternalWalletPayouts({
      deal,
      buyerConnectedAddress: buyerConnected,
      sellerConnectedAddress: sellerConnected,
      signer: runtime.signer,
      transport,
      custodyAddress: runtime.addresses.admin,
      buyerManagedAddress: runtime.addresses.buyer_demo,
      sellerManagedAddress: runtime.addresses.seller_demo,
    });

    expect(result).toMatchObject({
      transactionHash: 'f'.repeat(64),
      buyerConnectedAddress: buyerConnected,
      sellerConnectedAddress: sellerConnected,
      buyerBondReturnXlm: amounts.buyerBondReturnXlm,
      sellerPayoutXlm: amounts.sellerPayoutXlm,
      assetCode: 'XLM',
    });
    expect(submitTransaction).toHaveBeenCalledOnce();
  });

  it('refuses external payout before the deal is completed', async () => {
    await expect(
      executeExternalWalletPayouts({
        deal: makeDeal({ status: 'DELIVERED' }),
        buyerConnectedAddress: Keypair.random().publicKey(),
        sellerConnectedAddress: Keypair.random().publicKey(),
        signer: {
          signTransaction: vi.fn(),
        },
        transport: {
          loadSequence: vi.fn(),
          submitTransaction: vi.fn(),
        },
      }),
    ).rejects.toThrow('COMPLETED');
  });
});
