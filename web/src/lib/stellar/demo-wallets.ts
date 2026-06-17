const TESTNET_TX_HASH = /^[0-9a-fA-F]{64}$/;

export type DemoWalletRole = 'buyer' | 'seller' | 'platform';

export interface DealRoomWalletCard {
  key: DemoWalletRole;
  title: string;
  owner_label: string;
  identity_alias: string;
  public_address: string;
  network_label: string;
  balance_snapshot_label: string;
  commitment_value: string;
  reference_label: string;
  reference_value: string;
  reference_href: string | null;
}

interface DemoWalletIdentity {
  identity_alias: string;
  public_address: string;
  balance_snapshot_label: string;
}

const DEMO_TESTNET_IDENTITIES: Record<DemoWalletRole, DemoWalletIdentity> = {
  platform: {
    identity_alias: 'settleway-testnet-admin',
    public_address: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
    balance_snapshot_label: '~9998.42 XLM',
  },
  buyer: {
    identity_alias: 'settleway-testnet-buyer-demo',
    public_address: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
    balance_snapshot_label: '~9999.99 XLM',
  },
  seller: {
    identity_alias: 'settleway-testnet-seller-demo',
    public_address: 'GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU',
    balance_snapshot_label: '~9999.99 XLM',
  },
};

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatWalletReference(hash: string | null, fallback: string): {
  value: string;
  href: string | null;
} {
  if (!hash) {
    return {
      value: fallback,
      href: null,
    };
  }

  if (TESTNET_TX_HASH.test(hash)) {
    return {
      value: hash,
      href: `https://stellar.expert/explorer/testnet/tx/${hash}`,
    };
  }

  return {
    value: hash,
    href: null,
  };
}

export function buildDealRoomWalletCards(input: {
  buyer_label: string;
  seller_label: string;
  buyer_commitment_idr: number;
  seller_commitment_idr: number;
  platform_fee_target_idr: number;
  buyer_funding_tx_hash: string | null;
  seller_funding_tx_hash: string | null;
  platform_reference_hash: string | null;
}): DealRoomWalletCard[] {
  const buyerReference = formatWalletReference(
    input.buyer_funding_tx_hash,
    'Funding proof appears here after buyer deposit is recorded.',
  );
  const sellerReference = formatWalletReference(
    input.seller_funding_tx_hash,
    'Funding proof appears here after seller deposit is recorded.',
  );
  const platformReference = formatWalletReference(
    input.platform_reference_hash,
    'Fee routing stays pending until settlement begins.',
  );

  return [
    {
      key: 'buyer',
      title: 'Buyer Testnet wallet',
      owner_label: input.buyer_label,
      identity_alias: DEMO_TESTNET_IDENTITIES.buyer.identity_alias,
      public_address: DEMO_TESTNET_IDENTITIES.buyer.public_address,
      network_label: 'Stellar Testnet',
      balance_snapshot_label: DEMO_TESTNET_IDENTITIES.buyer.balance_snapshot_label,
      commitment_value: formatCurrency(input.buyer_commitment_idr),
      reference_label: 'Last funding reference',
      reference_value: buyerReference.value,
      reference_href: buyerReference.href,
    },
    {
      key: 'seller',
      title: 'Seller Testnet wallet',
      owner_label: input.seller_label,
      identity_alias: DEMO_TESTNET_IDENTITIES.seller.identity_alias,
      public_address: DEMO_TESTNET_IDENTITIES.seller.public_address,
      network_label: 'Stellar Testnet',
      balance_snapshot_label: DEMO_TESTNET_IDENTITIES.seller.balance_snapshot_label,
      commitment_value: formatCurrency(input.seller_commitment_idr),
      reference_label: 'Last funding reference',
      reference_value: sellerReference.value,
      reference_href: sellerReference.href,
    },
    {
      key: 'platform',
      title: 'Settleway fee wallet',
      owner_label: 'Settleway platform',
      identity_alias: DEMO_TESTNET_IDENTITIES.platform.identity_alias,
      public_address: DEMO_TESTNET_IDENTITIES.platform.public_address,
      network_label: 'Stellar Testnet',
      balance_snapshot_label: DEMO_TESTNET_IDENTITIES.platform.balance_snapshot_label,
      commitment_value: `${formatCurrency(input.platform_fee_target_idr)} after settlement`,
      reference_label: 'Fee route reference',
      reference_value: platformReference.value,
      reference_href: platformReference.href,
    },
  ];
}
