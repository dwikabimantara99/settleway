import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftlaqvgsinkbpbkwnnxh.supabase.co';
const supabaseAnonKey = 'sb_publishable_HXh6LySifRi0HoCA8P2PkQ_ocz99I4l';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const timestamp = Date.now();
  const offer = {
    id: `test-offer-${timestamp}`,
    listing_id: 'listing-cabai-001',
    buyer_request_id: null,
    buyer_id: 'buyer-surabaya-restaurant',
    seller_id: 'seller-probolinggo-cabai',
    initiated_by_id: 'buyer-surabaya-restaurant',
    commodity: 'Red Chili',
    volume_kg: 10,
    price_per_kg_idr: 45000,
    principal_idr: 450000,
    status: 'awaiting_counterparty_acceptance',
    terms_submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('offers').insert(offer);
  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }
}
run();
