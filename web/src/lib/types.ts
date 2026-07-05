import type { DealStatus } from './escrow/state-machine';

export type UserRole = 'seller' | 'buyer' | 'both' | 'operator';
export type ProfileVisibility = 'public' | 'private';
export type PayoutRailPreference = 'wallet' | 'bank';

export type BuyerRequestStatus = 'open' | 'fulfilled' | 'cancelled';

export interface BuyerRequest {
  id: string;
  buyerId: string;
  commodity: string;
  variety: string;
  status: BuyerRequestStatus;
  deliveryLocation: string;
  requiredVolumeKg: number;
  targetPricePerKgIdr: number;
  estimatedTotalIdr: number;
  requiredDate: string;
  description: string;
}

export interface UserWallet {
  userId: string;
  publicAddress: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  roleLabel: string;
  location: string;
  userType: UserRole;
  sellerScore: number;
  buyerScore: number;
  sellerCompletedCount: number;
  buyerCompletedCount: number;
  verifiedVolumeIdr: number;
  proofVisibility: ProfileVisibility;
  payoutRailPreference: PayoutRailPreference;
  payoutWalletLabel: string | null;
  payoutWalletAddress: string | null;
  connectedWalletAddress?: string | null;
  connectedWalletNetwork?: 'testnet' | null;
  connectedWalletProvider?: string | null;
  connectedWalletLinkedAt?: string | null;
  payoutBankName: string | null;
  payoutBankAccountMasked: string | null;
}

export type ListingStatus = 'ready_stock' | 'pre_harvest';

export interface Listing {
  id: string;
  sellerId: string;
  commodity: string;
  variety: string;
  status: ListingStatus;
  location: string;
  estimatedVolumeKg: number;
  pricePerKgIdr: number;
  estimatedValueIdr: number;
  harvestDate?: string;
  description: string;
}

export type EscrowStatus = DealStatus;

export interface Deal {
  id: string;
  listingId?: string;
  buyerRequestId?: string;
  buyerId: string;
  sellerId: string;
  commodity: string;
  volumeKg: number;
  principalIdr: number;
  buyerBondIdr: number;
  sellerBondIdr: number;
  buyerFeeIdr: number;
  sellerFeeIdr: number;
  buyerTotalIdr: number;
  sellerTotalIdr: number;
  status: EscrowStatus;
  stellarMode: string;
  contractId?: string;
  latestTxHash?: string;
  proofHash?: string;
  rail_version?: 'custody_v2_testnet' | 'managed_custody_testnet';
}

export type OfferStatus =
  | 'negotiating'
  | 'awaiting_counterparty_acceptance'
  | 'terms_accepted'
  | 'awaiting_counterparty_open'
  | 'active_escrow';

export interface Offer {
  id: string;
  listingId?: string | null;
  buyerRequestId?: string | null;
  buyerId: string;
  sellerId: string;
  initiatedById: string;
  commodity: string;
  volumeKg: number | null;
  pricePerKgIdr: number | null;
  principalIdr: number;
  termsNote?: string | null;
  status: OfferStatus;
  latestMessagePreview?: string | null;
  termsSubmittedAt?: string | null;
  termsAcceptedAt?: string | null;
  termsAcceptedById?: string | null;
  buyerOpenRoomAt?: string | null;
  sellerOpenRoomAt?: string | null;
  activeDealId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationMessage {
  id: string;
  offerId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type NotificationType =
  | 'offer_received'
  | 'offer_accepted'
  | 'message_received'
  | 'counterparty_opened_room'
  | 'deal_room_activated';

export interface Notification {
  id: string;
  recipientId: string;
  offerId: string;
  type: NotificationType;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

