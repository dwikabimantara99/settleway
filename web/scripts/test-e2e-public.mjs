const BASE_URL = 'http://localhost:3000';
const BUYER = 'buyer-surabaya-restaurant';
const SELLER = 'seller-probolinggo-cabai';

async function fetchApi(endpoint, actor, method = 'GET', body = null) {
  const headers = {
    'Cookie': `mock_actor=${actor}`
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API ${method} ${endpoint} failed: ${res.status} ${res.statusText} - ${errorText}`);
  }
  return res.json();
}

async function run() {
  try {
    const timestamp = Date.now();
    const MARKER = `LOCAL-REAL-CUSTODY-FINAL-${Date.now()}`;
    console.log(`Starting Public E2E flow. Marker: ${MARKER}`);

    // Phase 5: Create Offer
    const offerRes = await fetchApi('/api/offers', BUYER, 'POST', {
      listingId: 'listing-cabai-001',
      openingMessage: MARKER,
      volumeKg: 10,
      pricePerKgIdr: 45000
    });
    const offer = offerRes.data.offer;
    console.log(`1. Offer created: ${offer.id} (listing: ${offer.listing_id}, buyer: ${offer.buyer_id}, seller: ${offer.seller_id})`);

    // Fetch negotiation thread
    const offerDetailRes = await fetchApi(`/api/offers/${offer.id}`, SELLER);
    console.log(`Offer fetched by seller: ${offerDetailRes.data.offer.id}`);

    // Phase 5b: Accept Offer Terms
    const acceptTermsRes = await fetchApi(`/api/offers/${offer.id}`, SELLER, 'PATCH', {});
    console.log(`Offer terms accepted by seller: ${acceptTermsRes.data.offer.status}`);

    // Phase 6: Open Deal Room
    const sellerOpenRes = await fetchApi(`/api/offers/${offer.id}/open-deal-room`, SELLER, 'POST', {});
    const buyerOpenRes = await fetchApi(`/api/offers/${offer.id}/open-deal-room`, BUYER, 'POST', {});
    
    const dealId = buyerOpenRes.data.deal_id;
    console.log(`2. Deal Room created: ${dealId}`);
    
    // Fetch deal
    const dealRes = await fetchApi(`/api/deals/${dealId}`, BUYER);
    const deal = dealRes.data;
    
    // Check deal mode
    console.log(`Deal mode: ${deal.stellar_mode}, status: ${deal.status}`);
    
    // Phase 7: Buyer Funding
    console.log(`3. Buyer Funding...`);
    const buyerFundRes = await fetchApi(`/api/deals/${deal.id}/buyer-deposit`, BUYER, 'POST', {});
    const updatedDeal1 = buyerFundRes.data;
    console.log(`Buyer funded. Deal status: ${updatedDeal1.status}`);
    console.log(`Buyer Tx Hash: ${buyerFundRes.meta?.transaction_hash}`);
    
    // Phase 8: Seller Funding
    console.log(`4. Seller Funding...`);
    const sellerFundRes = await fetchApi(`/api/deals/${deal.id}/seller-deposit`, SELLER, 'POST', {});
    const updatedDeal2 = sellerFundRes.data;
    console.log(`Seller funded. Deal status: ${updatedDeal2.status}`);
    console.log(`Seller Tx Hash: ${sellerFundRes.meta?.transaction_hash}`);
    
    // Phase 9: Delivery Proof
    console.log(`5. Delivery Proof...`);
    const proofRes = await fetchApi(`/api/deals/${deal.id}/submit-proof`, SELLER, 'POST', {
      proof_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    });
    const updatedDeal3 = proofRes.data;
    console.log(`Proof submitted. Deal status: ${updatedDeal3.status}`);
    
    // Phase 10a: Mark Delivered
    console.log(`5b. Mark Delivered...`);
    const deliveredRes = await fetchApi(`/api/deals/${deal.id}/mark-delivered`, SELLER, 'POST', {});
    const updatedDealDelivered = deliveredRes.data;
    console.log(`Delivered. Deal status: ${updatedDealDelivered.status}`);
    
    // Phase 10b: Accept Delivery
    console.log(`6. Settlement...`);
    const settleRes = await fetchApi(`/api/deals/${deal.id}/accept-delivery`, BUYER, 'POST', {});
    const updatedDeal4 = settleRes.data;
    console.log(`Settled. Deal status: ${updatedDeal4.status}`);
    console.log(`Settlement Tx Hash: ${settleRes.meta?.transaction_hash}`);

    // Fetch Reputation
    const buyerRep = await fetchApi(`/api/profiles/${BUYER}/reputation`, BUYER);
    const sellerRep = await fetchApi(`/api/profiles/${SELLER}/reputation`, SELLER);
    
    console.log(`Buyer Rep entries: ${buyerRep.data.length}`);
    console.log(`Seller Rep entries: ${sellerRep.data.length}`);
    
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err);
  }
}

run();
