import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const demoProfiles = [
  {
    id: 'buyer-surabaya-restaurant',
    display_name: 'Surabaya Spice Co.',
    role_label: 'Wholesale Buyer',
    location: 'Surabaya, East Java',
    user_type: 'buyer',
    seller_score: 0,
    buyer_score: 98,
    seller_completed_count: 0,
    buyer_completed_count: 42,
    verified_volume_idr: 1200000000,
    proof_visibility: 'public'
  },
  {
    id: 'seller-probolinggo-cabai',
    display_name: 'Probolinggo Farmer Group',
    role_label: 'Farmer Group',
    location: 'Probolinggo, East Java',
    user_type: 'seller',
    seller_score: 100,
    buyer_score: 0,
    seller_completed_count: 156,
    buyer_completed_count: 0,
    verified_volume_idr: 450000000,
    proof_visibility: 'public'
  }
];

const demoListing = {
  id: 'listing-cabai-001',
  seller_id: 'seller-probolinggo-cabai',
  commodity: "Red Chili (Bird's Eye Chili)",
  variety: "Bird's Eye Chili Grade A",
  status: 'ready_stock',
  location: 'Probolinggo',
  estimated_volume_kg: 700,
  price_per_kg_idr: 28500,
  estimated_value_idr: 19950000,
  description: 'Fresh harvest from Probolinggo group. Sorted and ready for pickup or delivery.'
};

const demoDeal = {
  id: 'demo-cabai-001',
  listing_id: 'listing-cabai-001',
  buyer_request_id: null,
  buyer_id: 'buyer-surabaya-restaurant',
  seller_id: 'seller-probolinggo-cabai',
  commodity: "Red Chili (Bird's Eye Chili)",
  volume_kg: 700,
  principal_idr: 19950000,
  buyer_bond_idr: 997500,
  seller_bond_idr: 997500,
  buyer_fee_idr: 99750,
  seller_fee_idr: 99750,
  buyer_total_idr: 21047250,
  seller_total_idr: 1097250,
  status: 'WAITING_DEPOSITS',
  stellar_mode: 'mock_only',
  rail_version: 'legacy_demo',
  stellar_contract_id: null,
  stellar_escrow_id: null,
  latest_stellar_tx_hash: null,
  stellar_sync_status: 'idle',
  proof_hash: null,
  terms: { offer_id: 'offer-demo-cabai-001' }
};

async function seed() {
  console.log(`Seeding Supabase Project: ${supabaseUrl}`);
  console.log(`Intended Profiles: ${demoProfiles.map(p => p.id).join(', ')}`);
  console.log(`Intended Listing: ${demoListing.id}`);
  console.log(`Intended Deal: ${demoDeal.id}`);

  // Profiles
  for (const profile of demoProfiles) {
    const { error } = await supabase.from('profiles').upsert(profile);
    if (error) {
      console.error(`Failed to upsert profile ${profile.id}:`, error);
    } else {
      console.log(`Upserted profile ${profile.id}`);
    }
  }

  // Listing
  const { error: listingError } = await supabase.from('listings').upsert(demoListing);
  if (listingError) {
    console.error(`Failed to upsert listing ${demoListing.id}:`, listingError);
  } else {
    console.log(`Upserted listing ${demoListing.id}`);
  }

  // Deal
  const { error: dealError } = await supabase.from('deals').upsert(demoDeal);
  if (dealError) {
    console.error(`Failed to upsert deal ${demoDeal.id}:`, dealError);
  } else {
    console.log(`Upserted deal ${demoDeal.id}`);
  }

  // Verify
  const { data: verifyProfiles } = await supabase.from('profiles').select('id').in('id', demoProfiles.map(p => p.id));
  console.log(`Verified Profiles in DB:`, verifyProfiles?.map(p => p.id));

  const { data: verifyListing } = await supabase.from('listings').select('id').eq('id', demoListing.id).single();
  console.log(`Verified Listing in DB:`, verifyListing?.id);

  const { data: verifyDeal } = await supabase.from('deals').select('id').eq('id', demoDeal.id).single();
  console.log(`Verified Deal in DB:`, verifyDeal?.id);
}

seed().catch(console.error);
