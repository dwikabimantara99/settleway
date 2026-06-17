import { describe, expect, it } from 'vitest';
import { buildDealRoomWalletCards } from './demo-wallets';

describe('deal room demo wallet cards', () => {
  it('returns buyer, seller, and platform Testnet wallet cards', () => {
    const cards = buildDealRoomWalletCards({
      buyer_label: 'Surabaya Spice Co.',
      seller_label: 'Probolinggo Farmer Group',
      buyer_commitment_idr: 21047250,
      seller_commitment_idr: 1097250,
      platform_fee_target_idr: 199500,
      buyer_funding_tx_hash: null,
      seller_funding_tx_hash: null,
      platform_reference_hash: null,
    });

    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatchObject({
      key: 'buyer',
      title: 'Buyer Testnet wallet',
      identity_alias: 'settleway-testnet-buyer-demo',
      public_address: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
    });
    expect(cards[1]).toMatchObject({
      key: 'seller',
      title: 'Seller Testnet wallet',
      identity_alias: 'settleway-testnet-seller-demo',
      public_address: 'GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU',
    });
    expect(cards[2]).toMatchObject({
      key: 'platform',
      title: 'Settleway fee wallet',
      identity_alias: 'settleway-testnet-admin',
      public_address: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
    });
  });

  it('builds a public explorer href only for a valid Testnet tx hash', () => {
    const hash =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const cards = buildDealRoomWalletCards({
      buyer_label: 'Surabaya Spice Co.',
      seller_label: 'Probolinggo Farmer Group',
      buyer_commitment_idr: 21047250,
      seller_commitment_idr: 1097250,
      platform_fee_target_idr: 199500,
      buyer_funding_tx_hash: hash,
      seller_funding_tx_hash: 'mock-tx-hash',
      platform_reference_hash: null,
    });

    expect(cards[0].reference_href).toBe(
      `https://stellar.expert/explorer/testnet/tx/${hash}`,
    );
    expect(cards[1].reference_href).toBeNull();
  });
});
