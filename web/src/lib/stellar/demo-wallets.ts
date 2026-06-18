import { TESTNET_DEMO_IDENTITIES } from './testnet-demo-identities';

const TESTNET_TX_HASH = /^[0-9a-fA-F]{64}$/;

export type DemoWalletRole = 'buyer' | 'seller' | 'platform';
export type DealRoomWalletStateTone = 'pending' | 'funded' | 'closed' | 'settled';
export type DealRoomWalletRoomState =
  | 'funding_window'
  | 'post_lock'
  | 'closed_pre_lock'
  | 'completed';

export interface DealRoomWalletCard {
  key: DemoWalletRole;
  title: string;
  owner_label: string;
  identity_alias: string;
  public_address: string;
  network_label: string;
  balance_snapshot_label: string;
  commitment_value: string;
  status_label: string;
  status_tone: DealRoomWalletStateTone;
  movement_label: string;
  movement_value: string;
  reference_label: string;
  reference_value: string;
  reference_href: string | null;
}

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

function buildBuyerWalletState(
  roomState: DealRoomWalletRoomState,
  funded: boolean,
): Pick<DealRoomWalletCard, 'status_label' | 'status_tone' | 'movement_label' | 'movement_value'> {
  if (roomState === 'completed') {
    return {
      status_label: 'Returned after settlement',
      status_tone: 'settled',
      movement_label: 'Funds movement',
      movement_value: 'Buyer bond returns here after settlement and the room is now closed.',
    };
  }

  if (roomState === 'closed_pre_lock') {
    return funded
      ? {
          status_label: 'Refunded before lock',
          status_tone: 'closed',
          movement_label: 'Funds movement',
          movement_value: 'Buyer commitment should route back in full because the room closed before lock.',
        }
      : {
          status_label: 'No funding recorded',
          status_tone: 'closed',
          movement_label: 'Funds movement',
          movement_value: 'Buyer deposit never entered the protected room before the corridor closed.',
        };
  }

  if (roomState === 'post_lock') {
    return {
      status_label: 'Locked in escrow',
      status_tone: 'funded',
      movement_label: 'Funds movement',
      movement_value: 'Buyer commitment is now inside the protected room while proof and delivery continue.',
    };
  }

  if (funded) {
    return {
      status_label: 'Funded and waiting',
      status_tone: 'funded',
      movement_label: 'Funds movement',
      movement_value: 'Buyer deposit is recorded and now waits for the seller commitment to complete the gate.',
    };
  }

  return {
    status_label: 'Awaiting buyer deposit',
    status_tone: 'pending',
    movement_label: 'Funds movement',
    movement_value: 'Buyer deposit is still required before the protected lock can begin.',
  };
}

function buildSellerWalletState(
  roomState: DealRoomWalletRoomState,
  funded: boolean,
): Pick<DealRoomWalletCard, 'status_label' | 'status_tone' | 'movement_label' | 'movement_value'> {
  if (roomState === 'completed') {
    return {
      status_label: 'Returned and paid out',
      status_tone: 'settled',
      movement_label: 'Funds movement',
      movement_value: 'Seller bond returns here after settlement and the seller payout path has completed.',
    };
  }

  if (roomState === 'closed_pre_lock') {
    return funded
      ? {
          status_label: 'Refunded before lock',
          status_tone: 'closed',
          movement_label: 'Funds movement',
          movement_value: 'Seller commitment should route back in full because the room closed before lock.',
        }
      : {
          status_label: 'No funding recorded',
          status_tone: 'closed',
          movement_label: 'Funds movement',
          movement_value: 'Seller deposit never entered the protected room before the corridor closed.',
        };
  }

  if (roomState === 'post_lock') {
    return {
      status_label: 'Locked in escrow',
      status_tone: 'funded',
      movement_label: 'Funds movement',
      movement_value: 'Seller commitment is now inside the protected room while proof and delivery continue.',
    };
  }

  if (funded) {
    return {
      status_label: 'Funded and waiting',
      status_tone: 'funded',
      movement_label: 'Funds movement',
      movement_value: 'Seller deposit is recorded and now waits for the buyer commitment to complete the gate.',
    };
  }

  return {
    status_label: 'Awaiting seller deposit',
    status_tone: 'pending',
    movement_label: 'Funds movement',
    movement_value: 'Seller deposit is still required before the protected lock can begin.',
  };
}

function buildPlatformWalletState(
  roomState: DealRoomWalletRoomState,
): Pick<DealRoomWalletCard, 'status_label' | 'status_tone' | 'movement_label' | 'movement_value'> {
  if (roomState === 'completed') {
    return {
      status_label: 'Fee route completed',
      status_tone: 'settled',
      movement_label: 'Funds movement',
      movement_value: 'Platform fees belong to this wallet after settlement closes successfully.',
    };
  }

  if (roomState === 'closed_pre_lock') {
    return {
      status_label: 'Not charged before lock',
      status_tone: 'closed',
      movement_label: 'Funds movement',
      movement_value: 'No platform fee route starts when the room closes before escrow lock.',
    };
  }

  if (roomState === 'post_lock') {
    return {
      status_label: 'Waiting for settlement',
      status_tone: 'pending',
      movement_label: 'Funds movement',
      movement_value: 'Platform fee routing stays downstream from lock and does not move during funding.',
    };
  }

  return {
    status_label: 'Pending',
    status_tone: 'pending',
    movement_label: 'Funds movement',
    movement_value: 'Fee routing stays pending until the room clears funding and eventually reaches settlement.',
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
  buyer_funded: boolean;
  seller_funded: boolean;
  room_state: DealRoomWalletRoomState;
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
  const buyerState = buildBuyerWalletState(input.room_state, input.buyer_funded);
  const sellerState = buildSellerWalletState(input.room_state, input.seller_funded);
  const platformState = buildPlatformWalletState(input.room_state);

  return [
    {
      key: 'buyer',
      title: 'Buyer Testnet wallet',
      owner_label: input.buyer_label,
      identity_alias: TESTNET_DEMO_IDENTITIES.buyer.identity_alias,
      public_address: TESTNET_DEMO_IDENTITIES.buyer.public_address,
      network_label: 'Stellar Testnet',
      balance_snapshot_label: TESTNET_DEMO_IDENTITIES.buyer.balance_snapshot_label,
      commitment_value: formatCurrency(input.buyer_commitment_idr),
      status_label: buyerState.status_label,
      status_tone: buyerState.status_tone,
      movement_label: buyerState.movement_label,
      movement_value: buyerState.movement_value,
      reference_label: 'Funding proof',
      reference_value: buyerReference.value,
      reference_href: buyerReference.href,
    },
    {
      key: 'seller',
      title: 'Seller Testnet wallet',
      owner_label: input.seller_label,
      identity_alias: TESTNET_DEMO_IDENTITIES.seller.identity_alias,
      public_address: TESTNET_DEMO_IDENTITIES.seller.public_address,
      network_label: 'Stellar Testnet',
      balance_snapshot_label: TESTNET_DEMO_IDENTITIES.seller.balance_snapshot_label,
      commitment_value: formatCurrency(input.seller_commitment_idr),
      status_label: sellerState.status_label,
      status_tone: sellerState.status_tone,
      movement_label: sellerState.movement_label,
      movement_value: sellerState.movement_value,
      reference_label: 'Funding proof',
      reference_value: sellerReference.value,
      reference_href: sellerReference.href,
    },
    {
      key: 'platform',
      title: 'Settleway fee wallet',
      owner_label: 'Settleway platform',
      identity_alias: TESTNET_DEMO_IDENTITIES.platform.identity_alias,
      public_address: TESTNET_DEMO_IDENTITIES.platform.public_address,
      network_label: 'Stellar Testnet',
      balance_snapshot_label: TESTNET_DEMO_IDENTITIES.platform.balance_snapshot_label,
      commitment_value: `${formatCurrency(input.platform_fee_target_idr)} after settlement`,
      status_label: platformState.status_label,
      status_tone: platformState.status_tone,
      movement_label: platformState.movement_label,
      movement_value: platformState.movement_value,
      reference_label: 'Fee route reference',
      reference_value: platformReference.value,
      reference_href: platformReference.href,
    },
  ];
}
