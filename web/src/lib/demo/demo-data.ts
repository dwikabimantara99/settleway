import { Profile, Listing, Deal } from '../types';

export const demoProfiles: Record<string, Profile> = {
  'seller-probolinggo-cabai': {
    id: 'seller-probolinggo-cabai',
    displayName: 'Probolinggo Chili Supplier',
    roleLabel: 'Aggregator & Farmer Group',
    location: 'Probolinggo, East Java',
    userType: 'seller',
    sellerScore: 48,
    buyerScore: 0,
    sellerCompletedCount: 12,
    buyerCompletedCount: 0,
    verifiedVolumeIdr: 450000000,
    proofVisibility: 'public',
  },
  'buyer-surabaya-restaurant': {
    id: 'buyer-surabaya-restaurant',
    displayName: 'Surabaya Restaurant Group',
    roleLabel: 'Wholesale Buyer',
    location: 'Surabaya, East Java',
    userType: 'buyer',
    sellerScore: 0,
    buyerScore: 95,
    sellerCompletedCount: 0,
    buyerCompletedCount: 24,
    verifiedVolumeIdr: 1200000000,
    proofVisibility: 'public',
  },
};

export const demoListings: Listing[] = [
  {
    id: 'listing-cabai-001',
    sellerId: 'seller-probolinggo-cabai',
    commodity: 'Red Chili (Cabai Rawit Merah)',
    variety: 'Rawit Merah Grade A',
    status: 'ready_stock',
    location: 'Probolinggo',
    estimatedVolumeKg: 700,
    pricePerKgIdr: 28500,
    estimatedValueIdr: 19950000,
    description: 'Fresh harvest from Probolinggo group. Sorted and ready for pickup or delivery.',
  },
];

export const demoDeals: Record<string, Deal> = {
  'demo-cabai-001': {
    id: 'demo-cabai-001',
    listingId: 'listing-cabai-001',
    buyerId: 'buyer-surabaya-restaurant',
    sellerId: 'seller-probolinggo-cabai',
    commodity: 'Red Chili (Cabai Rawit Merah)',
    volumeKg: 700,
    principalIdr: 20000000,
    buyerBondIdr: 1000000,
    sellerBondIdr: 1000000,
    buyerFeeIdr: 100000,
    sellerFeeIdr: 100000,
    buyerTotalIdr: 21100000,
    sellerTotalIdr: 1100000,
    status: 'WAITING_DEPOSITS',
    stellarMode: 'not_configured',
  },
};
