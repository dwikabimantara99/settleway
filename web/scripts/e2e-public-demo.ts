const BASE_URL = 'https://settleway.vercel.app';

async function fetchAPI(path: string, actor: string, payload?: any, methodOverride?: string) {
  const url = `${BASE_URL}${path}`;
  const method = methodOverride || (payload ? 'POST' : 'GET');
  console.log(`[REQ] ${method} ${url} (Actor: ${actor})`);
  
  const options: RequestInit = {
    method,
    headers: {
      'Cookie': `mock_actor=${actor}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (payload) {
    options.body = JSON.stringify(payload);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse response from ${url}: ${text}`);
  }

  if (!res.ok || json.ok === false) {
    throw new Error(`API Error: ${url} -> ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function run() {
  const timestamp = Date.now();
  const runId = `E2E-FINAL-ADMINFIX-${timestamp}`;
  const buyerId = 'buyer-surabaya-restaurant';
  const sellerId = 'seller-probolinggo-cabai';
  
  console.log(`=== STARTING PUBLIC E2E RUN: ${runId} ===`);

  try {
    // 1. Create Offer as Buyer
    const offerRes = await fetchAPI('/api/offers', buyerId, {
      listingId: 'listing-cabai-001',
      volumeKg: 100,
      pricePerKgIdr: 28500,
      openingMessage: runId,
      isDemo: true,
      runId: runId,
      termsNote: 'Hackathon Final Public Run'
    });
    
    const offerId = offerRes.offer.id;
    console.log(`[OK] Offer created: ${offerId}`);

    // 2. Accept Terms as Seller
    try {
      await fetchAPI(`/api/offers/${offerId}`, sellerId, {}, 'PATCH');
      console.log(`[OK] Terms accepted by seller`);
    } catch (err: any) {
      console.log(`[WARN] accept-terms failed: ${err.message}`);
    }

    // 3. Open Deal Room as Seller
    const openRes = await fetchAPI(`/api/offers/${offerId}/open-deal-room?runId=${runId}&isDemo=1`, sellerId, { isDemo: true, runId });
    console.log(`[OK] Open deal room seller: ${JSON.stringify(openRes)}`);

    // 4. Open Deal Room as Buyer
    const openRes2 = await fetchAPI(`/api/offers/${offerId}/open-deal-room?runId=${runId}&isDemo=1`, buyerId, { isDemo: true, runId });
    console.log(`[OK] Open deal room buyer: ${JSON.stringify(openRes2)}`);
    
    const dealId = openRes2.deal_id;
    if (!dealId) throw new Error("No deal_id returned");
    console.log(`[OK] Deal Room active: ${dealId}`);

    // 5. Buyer Deposit
    console.log(`[WAIT] Delaying 2s...`);
    await new Promise(r => setTimeout(r, 2000));
    const buyerDep = await fetchAPI(`/api/deals/${dealId}/buyer-deposit`, buyerId, {});
    console.log(`[OK] Buyer deposit: ${JSON.stringify(buyerDep)}`);

    // 6. Seller Deposit
    console.log(`[WAIT] Delaying 2s...`);
    await new Promise(r => setTimeout(r, 2000));
    const sellerDep = await fetchAPI(`/api/deals/${dealId}/seller-deposit`, sellerId, {});
    console.log(`[OK] Seller deposit: ${JSON.stringify(sellerDep)}`);

    // 7. Submit Proof
    console.log(`[WAIT] Delaying 2s...`);
    await new Promise(r => setTimeout(r, 2000));
    const proofRes = await fetchAPI(`/api/deals/${dealId}/submit-proof`, sellerId, {
       evidence_hash: 'mock_proof_hash_e2e_final',
       storage_path: '/demo-evidence.pdf'
    });
    console.log(`[OK] Proof submitted: ${JSON.stringify(proofRes)}`);

    // 8. Accept Delivery
    console.log(`[WAIT] Delaying 2s...`);
    await new Promise(r => setTimeout(r, 2000));
    const acceptRes = await fetchAPI(`/api/deals/${dealId}/accept-delivery`, buyerId, {});
    console.log(`[OK] Delivery accepted: ${JSON.stringify(acceptRes)}`);

  } catch (err: any) {
    console.error(`\n[FATAL] E2E Blocked:`, err.message);
    process.exit(1);
  }
}

run();
