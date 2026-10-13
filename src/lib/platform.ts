import { useEffect, useState } from 'react';
import { supabase } from './supabase';

let cached: Promise<boolean> | null = null;

/** True when the signed-in account is listed in optical_platform_admins (the management role). */
export function usePlatformAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    cached ??= Promise.resolve(supabase.rpc('optical_is_platform_admin')).then(r => r.data === true, () => false);
    void cached.then(value => { if (active) setIsAdmin(value); });
    return () => { active = false; };
  }, []);
  return isAdmin;
}
