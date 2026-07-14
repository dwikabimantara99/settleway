import { fileURLToPath } from 'url';

const BASE_URL = 'https://settleway.vercel.app';
const BUYER = 'buyer-surabaya-restaurant';
const SELLER = 'seller-probolinggo-cabai';

async function fetchApi(endpoint, actor, method = 'GET', body = null, retries = 4, retryDelayMs = 8000) {
  const headers = { 'Cookie': `mock_actor=${actor}` };
  if (body) headers['Content-Type'] = 'application/json';
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      console.log(`  ... retry ${attempt}/${retries} in ${retryDelayMs}ms`);
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    if (res.ok) return res.json();
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    const isRecoverable = parsed?.error?.recoverable === true;
    const code = parsed?.error?.code;
    if (!isRecoverable || attempt === retries) {
      throw new Error(`API ${method} ${endpoint} failed: ${res.status} ${res.statusText} - ${text}`);
    }
    console.log(`  Recoverable (${code}), retrying...`);
  }
}

async function run() {
  try {
    const MARKER = `E2E-FULL-${Date.now()}`;
    console.log(`Starting Full E2E. Marker: ${MARKER}`);

    // 1. Create offer
    const offerRes = await fetchApi('/api/offers', BUYER, 'POST', {
      listingId: 'listing-cabai-001',
      openingMessage: MARKER,
      volumeKg: 10,
      pricePerKgIdr: 45000
    }, 0);
    const offer = offerRes.data.offer;
    console.log(`1. Offer: ${offer.id}`);

    // 2. Seller accepts terms
    await fetchApi(`/api/offers/${offer.id}`, SELLER, 'GET', null, 0);
    const acceptRes = await fetchApi(`/api/offers/${offer.id}`, SELLER, 'PATCH', {}, 0);
    console.log(`   Terms: ${acceptRes.data.offer.status}`);

    // 3. Open Deal Room (both sides)
    await fetchApi(`/api/offers/${offer.id}/open-deal-room`, SELLER, 'POST', {}, 0);
    const buyerOpenRes = await fetchApi(`/api/offers/${offer.id}/open-deal-room`, BUYER, 'POST', {}, 0);
    const dealId = buyerOpenRes.data.deal_id;
    const dealRes = await fetchApi(`/api/deals/${dealId}`, BUYER, 'GET', null, 0);
    const deal = dealRes.data;
    console.log(`2. Deal: ${dealId} mode=${deal.stellar_mode} status=${deal.status} rail=${deal.rail_version}`);

    // 4. Buyer Funding
    console.log(`3. Buyer Funding...`);
    const buyerFundRes = await fetchApi(`/api/deals/${deal.id}/buyer-deposit`, BUYER, 'POST', {}, 3, 8000);
    const buyerTx = buyerFundRes.meta?.transaction_hash ?? 'check-db';
    console.log(`   BUYER_FUNDED status=${buyerFundRes.data.status} tx=${buyerTx}`);

    // 5. Seller Funding
    console.log(`4. Seller Funding...`);
    const sellerFundRes = await fetchApi(`/api/deals/${deal.id}/seller-deposit`, SELLER, 'POST', {}, 3, 8000);
    const sellerTx = sellerFundRes.meta?.transaction_hash ?? 'check-db';
    console.log(`   LOCKED status=${sellerFundRes.data.status} tx=${sellerTx}`);

    // 6. Submit Proof
    const PROOF_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    console.log(`5. Submit Proof...`);
    const proofRes = await fetchApi(`/api/deals/${deal.id}/submit-proof`, SELLER, 'POST', { proof_hash: PROOF_HASH }, 6, 10000);
    const proofTx = proofRes.meta?.transaction_hash ?? 'check-db';
    console.log(`   PROOF_SUBMITTED status=${proofRes.data.status} tx=${proofTx}`);

    // 7. Mark Delivered
    console.log(`6. Mark Delivered...`);
    const markRes = await fetchApi(`/api/deals/${deal.id}/mark-delivered`, SELLER, 'POST', {}, 6, 10000);
    const markTx = markRes.meta?.transaction_hash ?? 'check-db';
    console.log(`   DELIVERED status=${markRes.data.status} tx=${markTx}`);

    // 8. Accept Delivery (settlement)
    console.log(`7. Accept & Settle...`);
    const settleRes = await fetchApi(`/api/deals/${deal.id}/accept-delivery`, BUYER, 'POST', {}, 6, 10000);
    const settleTx = settleRes.meta?.transaction_hash ?? 'check-db';
    console.log(`   COMPLETED status=${settleRes.data.status} tx=${settleTx}`);

    // 9. Profile history
    console.log(`8. Profile History...`);
    const buyerProfile = await fetchApi(`/api/profiles/${BUYER}/reputation`, BUYER, 'GET', null, 0);
    const sellerProfile = await fetchApi(`/api/profiles/${SELLER}/reputation`, SELLER, 'GET', null, 0);
    console.log(`   Buyer history entries: ${(buyerProfile.data || []).length}`);
    console.log(`   Seller history entries: ${(sellerProfile.data || []).length}`);

    console.log('');
    console.log('=== FINAL REPORT ===');
    console.log('OFFER_ID:', offer.id);
    console.log('DEAL_ID:', dealId);
    console.log('BUYER_TX:', buyerTx);
    console.log('SELLER_TX:', sellerTx);
    console.log('PROOF_TX:', proofTx);
    console.log('MARK_DELIVERED_TX:', markTx);
    console.log('SETTLEMENT_TX:', settleTx);
    console.log('DEAL_FINAL_STATUS:', settleRes.data.status);
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

run();
