import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export let configurationError = '';
export let supabase: SupabaseClient | null = null;
if (url || key) {
  try {
    if (!url || !key) throw new Error('Set both Supabase variables in .env.local, then restart Vite.');
    if (key.startsWith('sb_secret_')) throw new Error('Use a publishable key, never a secret key.');
    if (key.startsWith('eyJ')) {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error('Only a legacy anon key or publishable key can be used in the frontend.');
    }
    supabase = createClient(url, key);
  } catch (error) { configurationError = error instanceof Error ? error.message : String(error); }
}
