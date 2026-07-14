import { createClient } from '@supabase/supabase-js';

// Prefer server-only env vars, fallback to NEXT_PUBLIC if not strict
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabaseConfig 
  ? createClient(supabaseUrl, supabaseKey, {
      global: { fetch: (url, options) => { const headers = new Headers(options?.headers); headers.set('Cache-Control', 'no-cache, no-store, must-revalidate'); return fetch(url, { ...options, headers, cache: 'no-store', next: { revalidate: 0 } } as RequestInit); } })
      }
    })
  : null;
