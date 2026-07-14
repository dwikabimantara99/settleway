import { createClient } from '@supabase/supabase-js';
import fs from 'fs';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('stellar_operations').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.error("Supabase Error:", error);
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
}

run();
