import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Status { active: boolean; trial: boolean; expiresAt: string | null }

/** Shown to an organization's admins while the trial/subscription is running. Nothing for the original store. */
export function SubscriptionBanner({ ownerId }: { ownerId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.resolve(supabase?.rpc('optical_org_status', { team_owner: ownerId })).then(r => { if (active && r && !r.error && r.data) setStatus(r.data as Status); }, () => {});
    return () => { active = false; };
  }, [ownerId]);
  if (!status?.expiresAt) return null;
  const left = Math.ceil((new Date(status.expiresAt).getTime() - Date.now()) / 864e5);
  const date = new Date(status.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'long' });
  const soon = left <= 5;
  return <div role="status" className={'rounded-2xl border p-4 text-sm ' + (soon ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900')}>
    {status.trial ? 'Free trial' : 'Subscription'}: <strong>{left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'ends today'}</strong> (until {date}).
    {soon ? ' Contact your software provider to renew before access pauses.' : ''}
  </div>;
}
