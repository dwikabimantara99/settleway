import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getServiceRoleClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL for server-only service client.');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: { fetch: (url, options) => { const headers = new Headers(options?.headers); headers.set('Cache-Control', 'no-cache, no-store, must-revalidate'); return fetch(url, { ...options, headers, cache: 'no-store', next: { revalidate: 0 } } as RequestInit); } })
    }
  });
}
