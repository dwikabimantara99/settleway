import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log('Missing SUPABASE env vars');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey);

const { data, error } = await sb.from('deals').select('id, stellar_contract_id, rail_version, status').eq('id', 'deal-offer-1784034797071');
if (error) {
  console.error(error);
} else {
  console.log(JSON.stringify(data, null, 2));
}
