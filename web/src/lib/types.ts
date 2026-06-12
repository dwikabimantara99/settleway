export type UserRole = 'seller' | 'buyer' | 'both' | 'operator';
export type ProfileVisibility = 'public' | 'private';

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

export type EscrowStatus =
  | 'WAITING_DEPOSITS'
  | 'BUYER_FUNDED'
  | 'SELLER_FUNDED'
  | 'LOCKED'
  | 'PROOF_SUBMITTED'
  | 'DELIVERED'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'CANCELLED';

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
}
