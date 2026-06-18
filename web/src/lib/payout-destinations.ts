import type { DbProfile } from '@/lib/db/types';

export interface PayoutDestinationSnapshot {
  rail_preference: 'wallet' | 'bank';
  wallet_label: string | null;
  wallet_address: string | null;
  bank_name: string | null;
  bank_account_masked: string | null;
}

type ProfilePayoutFields = Pick<
  DbProfile,
  | 'payout_rail_preference'
  | 'payout_wallet_label'
  | 'payout_wallet_address'
  | 'payout_bank_name'
  | 'payout_bank_account_masked'
>;

export function createProfilePayoutDestinationSnapshot(
  profile: ProfilePayoutFields,
): PayoutDestinationSnapshot {
  return {
    rail_preference: profile.payout_rail_preference,
    wallet_label: profile.payout_wallet_label,
    wallet_address: profile.payout_wallet_address,
    bank_name: profile.payout_bank_name,
    bank_account_masked: profile.payout_bank_account_masked,
  };
}

export function createWalletPayoutDestinationSnapshot(
  label: string,
  address: string | null,
): PayoutDestinationSnapshot {
  return {
    rail_preference: 'wallet',
    wallet_label: label,
    wallet_address: address,
    bank_name: null,
    bank_account_masked: null,
  };
}

export function isPayoutDestinationSnapshot(
  value: unknown,
): value is PayoutDestinationSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.rail_preference === 'wallet' || candidate.rail_preference === 'bank') &&
    ('wallet_label' in candidate || 'bank_name' in candidate)
  );
}

export function formatPayoutDestinationLabel(
  snapshot: PayoutDestinationSnapshot | null,
  fallbackLabel: string,
): string {
  if (!snapshot) {
    return fallbackLabel;
  }

  if (snapshot.rail_preference === 'bank') {
    return snapshot.bank_name?.trim() || 'Local bank payout';
  }

  return snapshot.wallet_label?.trim() || fallbackLabel;
}

export function formatPayoutDestinationReference(
  snapshot: PayoutDestinationSnapshot | null,
): string {
  if (!snapshot) {
    return 'Destination pending';
  }

  if (snapshot.rail_preference === 'bank') {
    return snapshot.bank_account_masked?.trim() || 'Not live in MVP';
  }

  return snapshot.wallet_address?.trim() || 'Wallet destination pending';
}

export function formatPayoutDestinationRail(
  snapshot: PayoutDestinationSnapshot | null,
): string {
  if (!snapshot) {
    return 'Pending';
  }

  return snapshot.rail_preference === 'bank' ? 'Local bank (not live)' : 'Linked wallet';
}
