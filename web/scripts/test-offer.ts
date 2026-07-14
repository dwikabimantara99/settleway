
import { repository } from '../src/lib/repositories/index.js';
import { buildOfferFromListing } from '../src/lib/offers/helpers.js';

async function run() {
  const listing = await repository.getListing('listing-cabai-001');
  const offer = buildOfferFromListing({
    id: 'offer-' + Date.now(),
    listing,
    buyerId: 'buyer-surabaya-restaurant',
    openingMessage: 'Hello',
    volumeKg: 100,
    pricePerKgIdr: 45000,
    termsNote: null,
    now: new Date().toISOString()
  });
  
  try {
    await repository.createOffer(offer);
    console.log('Success!');
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
