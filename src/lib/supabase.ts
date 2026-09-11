import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export let configurationError = '';
export let supabase: SupabaseClient | null = null;
if (url || key || import.meta.env.PROD) {
  try {
    if (!url || !key) throw new Error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in this deployment environment, then rebuild and redeploy. For localhost, update .env.local and restart Vite.');
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) throw new Error('Use the Supabase project base URL, not a dashboard, REST or Auth endpoint URL.');
    if (key.startsWith('sb_secret_')) throw new Error('Use a publishable key, never a secret key.');
    if (key.startsWith('eyJ')) {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error('Only a legacy anon key or publishable key can be used in the frontend.');
      if (parsedUrl.hostname.endsWith('.supabase.co') && payload.ref && parsedUrl.hostname !== `${payload.ref}.supabase.co`) throw new Error('The Supabase URL and anon key belong to different projects. Use a matching URL and key, then rebuild.');
    } else if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      throw new Error('Invalid Supabase public key format. Paste the publishable or legacy anon key without quotes or extra text, then rebuild.');
    }
    supabase = createClient(url, key);
  } catch (error) { configurationError = error instanceof Error ? error.message : String(error); }
}
