// Probe Production Vercel env config via /api/deals and operation records
// Safe: reads only public deal data and stellar operation status, no secrets
import https from 'node:https';
import { createClient } from '@supabase/supabase-js';

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ raw: body.substring(0, 500) }); }
      });
    }).on('error', reject);
  });
}

// Check the recent operation records for the diagnostic deal
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log('Missing SUPABASE env vars - set them locally to run this script');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey);

// Find recent failed create_deal operations
const { data: ops, error: opsError } = await sb
  .from('custody_v2_operations')
  .select('operation_id,requested_action,operation_status,public_error_code,transaction_hash,created_at,updated_at')
  .eq('requested_action', 'create_deal')
  .eq('operation_status', 'failed')
  .order('created_at', { ascending: false })
  .limit(5);

if (opsError) {
  console.error('Error querying operations:', opsError.message);
} else {
  console.log('\n=== Recent failed create_deal operations ===');
  console.log(JSON.stringify(ops, null, 2));
}

// Also check the diagnostic deal room
const diagnosticDealId = 'deal-offer-live-cabai-1784029105632-3hr6kr';
const { data: deal, error: dealError } = await sb
  .from('deals')
  .select('id,status,stellar_mode,stellar_contract_id,stellar_escrow_id,latest_stellar_tx_hash,rail_version,updated_at')
  .eq('id', diagnosticDealId)
  .single();

if (dealError) {
  console.log('\nDiagnostic deal not found:', dealError.message);
} else {
  console.log('\n=== Diagnostic deal state ===');
  console.log(JSON.stringify(deal, null, 2));
}

// Also check the most recent E2E deal
const { data: recentDeals, error: recentError } = await sb
  .from('deals')
  .select('id,status,stellar_mode,stellar_contract_id,stellar_escrow_id,rail_version,updated_at')
  .order('updated_at', { ascending: false })
  .limit(3);

if (!recentError) {
  console.log('\n=== 3 most recent deals ===');
  console.log(JSON.stringify(recentDeals, null, 2));
}
