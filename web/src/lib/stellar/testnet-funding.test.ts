import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { DbDeal } from '@/lib/db/types';
import {
  resolveFundingProofAmountXlm,
  resolveManagedProfileWallet,
  resolveSignedFundingTargetStatus,
  findConfirmedFundingTransaction,
  submitSignedFundingTransaction,
  validateSignedFundingXdr,
} from './testnet-funding';

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: 'deal-signed-funding-test',
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
    status: 'WAITING_DEPOSITS',
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

function buildPaymentXdr(input: {
  source: Keypair;
  destination: string;
  amount: string;
  memo: string;
}) {
  const account = new Account(input.source.publicKey(), '1');
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addMemo(Memo.text(input.memo))
    .addOperation(
      Operation.payment({
        destination: input.destination,
        asset: Asset.native(),
        amount: input.amount,
      }),
    )
    .setTimeout(180)
    .build();
  transaction.sign(input.source);
  return transaction.toXDR();
}

describe('testnet funding helpers', () => {
  it('keeps the second wallet funding confirmation pending until custody transfer completes', () => {
    expect(resolveSignedFundingTargetStatus('WAITING_DEPOSITS', 'buyer_deposit')).toBe('BUYER_FUNDED');
    expect(resolveSignedFundingTargetStatus('BUYER_FUNDED', 'seller_deposit')).toBe('CUSTODY_PENDING');
    expect(resolveSignedFundingTargetStatus('SELLER_FUNDED', 'buyer_deposit')).toBe('CUSTODY_PENDING');
  });

  it('validates the expected connected-wallet payment intent', () => {
    const deal = makeDeal();
    const source = Keypair.random();
    const sourceAddress = source.publicKey();
    const signedXdr = buildPaymentXdr({
      source,
      destination: resolveManagedProfileWallet('buyer'),
      amount: resolveFundingProofAmountXlm(deal, 'buyer'),
      memo: `SW:b:${deal.id.slice(-20)}`,
    });

    expect(() =>
      validateSignedFundingXdr({
        signedXdr,
        deal,
        action: 'buyer_deposit',
        sourceAddress,
      }),
    ).not.toThrow();
  });

  it('rejects a payment to the wrong managed profile wallet', () => {
    const deal = makeDeal();
    const source = Keypair.random();
    const sourceAddress = source.publicKey();
    const signedXdr = buildPaymentXdr({
      source,
      destination: resolveManagedProfileWallet('seller'),
      amount: resolveFundingProofAmountXlm(deal, 'buyer'),
      memo: `SW:b:${deal.id.slice(-20)}`,
    });

    expect(() =>
      validateSignedFundingXdr({
        signedXdr,
        deal,
        action: 'buyer_deposit',
        sourceAddress,
      }),
    ).toThrow('destination');
  });

  it('rejects an unsigned payment even when its body matches', () => {
    const deal = makeDeal();
    const source = Keypair.random();
    const account = new Account(source.publicKey(), '1');
    const unsignedXdr = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addMemo(Memo.text(`SW:b:${deal.id.slice(-20)}`))
      .addOperation(
        Operation.payment({
          destination: resolveManagedProfileWallet('buyer'),
          asset: Asset.native(),
          amount: resolveFundingProofAmountXlm(deal, 'buyer'),
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

    expect(() =>
      validateSignedFundingXdr({
        signedXdr: unsignedXdr,
        deal,
        action: 'buyer_deposit',
        sourceAddress: source.publicKey(),
      }),
    ).toThrow('signature');
  });

  it('finds an existing confirmed funding payment without preparing a duplicate', async () => {
    const deal = makeDeal({
      id: 'demo-cabai-001',
      created_at: '2026-06-21T09:32:31.134Z',
    });
    const source = Keypair.random().publicKey();
    const hash = 'a'.repeat(64);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _embedded: {
          records: [{
            hash,
            source_account: source,
            successful: true,
            memo_type: 'text',
            memo: 'SW:s:demo-cabai-001',
            created_at: '2026-06-21T09:34:28Z',
          }],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _embedded: {
          records: [{
            type: 'payment',
            from: source,
            to: resolveManagedProfileWallet('seller'),
            amount: resolveFundingProofAmountXlm(deal, 'seller'),
            asset_type: 'native',
            transaction_successful: true,
          }],
        },
      }), { status: 200 }));

    const result = await findConfirmedFundingTransaction({
      deal,
      action: 'seller_deposit',
      sourceAddress: source,
      fetcher: fetcher as typeof fetch,
    });

    expect(result).toEqual({ hash });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reuses the exact signed transaction when Horizon already confirms its hash', async () => {
    const deal = makeDeal();
    const source = Keypair.random();
    const signedXdr = buildPaymentXdr({
      source,
      destination: resolveManagedProfileWallet('buyer'),
      amount: resolveFundingProofAmountXlm(deal, 'buyer'),
      memo: `SW:b:${deal.id.slice(-20)}`,
    });
    const expectedHash = new Transaction(signedXdr, Networks.TESTNET).hash().toString('hex');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      hash: expectedHash,
      successful: true,
    }), { status: 200 }));
    const submitter = vi.fn();

    const result = await submitSignedFundingTransaction(signedXdr, {
      fetcher: fetcher as typeof fetch,
      submitter,
    });

    expect(result).toEqual({
      hash: expectedHash,
      reused_existing: true,
    });
    expect(submitter).not.toHaveBeenCalled();
  });
});
