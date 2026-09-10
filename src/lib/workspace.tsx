import { initialStoreProfile } from '../data/initialData';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export type Snapshot = Record<string, unknown>;
export interface WorkspaceAccess { ownerId: string; user: import('../types').UserAccount; }
export function CloudWorkspace({ ownerId, children }: { ownerId: string; children: (data: Snapshot, version: number, access: WorkspaceAccess) => React.ReactNode }) {
  const [teams, setTeams] = useState<{ ownerId: string; name: string; role: string }[] | null>(null);
  const [selected, setSelected] = useState('');
  const [row, setRow] = useState<(WorkspaceAccess & { data: Snapshot; version: number }) | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  // One store per deployment. Whichever store the account can reach is opened straight away —
  // there is no "organisation" to choose. Shop selection happens inside the app.
  useEffect(() => {
    let active = true; setError('');
    supabase!.rpc('optical_team_list').then(({data,error}) => {
      if (!active) return;
      if (error) setError(error.message);
      else { setTeams(data); if (data.length) setSelected(data[0].ownerId); }
    });
    return () => { active=false; };
  }, [ownerId,attempt]);
  useEffect(() => {
    if (!selected) return;
    let active=true; setRow(null); setError('');
    supabase!.rpc('optical_team_load',{team_owner:selected}).then(({data,error}) => {
      if (!active) return;
      if (error) setError(error.message); else setRow(data);
    });
    return () => { active=false; };
  },[selected,attempt]);
  if (row) return <>{children(row.data,row.version,row)}</>;
  const noAccess = teams && teams.length === 0;
  return <div className="min-h-screen bg-[#eef1f7] p-6 flex items-center justify-center"><div className="bg-white p-8 rounded-2xl border max-w-lg w-full space-y-4">
    <h1 className="text-2xl font-bold">Jiya Opticals</h1>
    {error && <div role="alert" className="text-red-700">{error}<p className="text-sm">If the store functions are missing, run supabase/LIVE_SETUP.sql in the Supabase SQL Editor.</p></div>}
    {!teams && !error && <p>Opening your store…</p>}
    {selected && !error && <p>Loading store…</p>}
    {noAccess && !error && <p className="text-stone-600">You're signed in, but this account isn't part of the store yet. Ask the owner to add your sign-up email under <strong>Team &amp; Access</strong>, then refresh.</p>}
    {noAccess && <details className="border-t pt-4"><summary className="cursor-pointer text-sm text-stone-500">First-time setup (only if no store exists yet)</summary>
      <form className="space-y-3 pt-3" onSubmit={async e=>{
        e.preventDefault(); if(busy)return; setBusy(true); setError('');
        try {
          const {data,error}=await supabase!.rpc('optical_team_create',{business_name:businessName.trim(),profile:initialStoreProfile});
          if(error)throw error; setSelected(data);setAttempt(n=>n+1);
        }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
      }}><label className="block text-sm">Store name<input className="w-full border rounded p-2" required minLength={2} value={businessName} onChange={e=>setBusinessName(e.target.value)} /></label><button disabled={busy} className="bg-amber-700 text-white p-3 rounded">{busy?'Creating…':'Create the store'}</button></form>
    </details>}
    <button className="underline mr-4" onClick={()=>setAttempt(n=>n+1)}>Refresh</button>
    <button className="underline" onClick={()=>void supabase!.auth.signOut()}>Sign out</button>
  </div></div>;
}

// A single conditional write keeps invoice, stock and balances together.
// Concurrent sessions cannot silently overwrite each other's workspace.
export function useCloudSave(ownerId: string | undefined, initialVersion: number, snapshot: Snapshot, onRemote?: (data: Snapshot) => void) {
  const applyRemote = useRef(onRemote);
  applyRemote.current = onRemote;
  const serialized = JSON.stringify(snapshot);
  const version = useRef(initialVersion);
  const saved = useRef(initialVersion ? serialized : '');
  const latest = useRef(serialized);
  latest.current = serialized;
  const running = useRef(false);
  const [status, setStatus] = useState(ownerId ? 'Saved to Supabase' : 'Local storage');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const conflict = useRef(false);
  const failed = useRef(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    const timer = window.setInterval(async () => {
      if (running.current || locked) return;
      const checkedVersion = version.current;
      const { data, error } = await supabase!.rpc('optical_team_load', { team_owner: ownerId });
      if (!active || running.current || version.current !== checkedVersion) return;
      if (data && data.version !== checkedVersion && latest.current === saved.current && applyRemote.current) {
        const normalized = JSON.parse(latest.current);
        for (const key of Object.keys(normalized)) normalized[key] = data.data[key] ?? (Array.isArray(normalized[key]) ? [] : normalized[key]);
        const next = JSON.stringify(normalized);
        version.current = data.version; saved.current = next; latest.current = next;
        applyRemote.current(normalized); setStatus('Saved to Supabase');
      } else if (error?.code === '42501' || error?.code === 'PT409' || (data && data.version !== checkedVersion)) {
        conflict.current = true; failed.current = true; setLocked(true);
        setStatus('Reload required');
        setError(error ? 'Your store access has changed. Reload to continue.' : 'The store or shop assignments changed in another session. Download any unsaved data, then reload.');
      }
    }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [ownerId, locked]);
  useEffect(() => {
    if (!ownerId) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (latest.current !== saved.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [ownerId]);
  useEffect(() => {
    if (!ownerId) return;
    let disposed = false;
    const timer = window.setInterval(async () => {
      if (running.current || failed.current || conflict.current || saved.current === latest.current) return;
      running.current = true; setStatus('Saving…'); setError('');
      try {
        do {
          const payload = latest.current;
          const { data, error } = await supabase!.rpc('optical_team_save', {team_owner:ownerId, expected_version:version.current, payload:JSON.parse(payload)});
          if (error || !data) {
            if (!data && !error || error?.code === '40001' || error?.code === 'PT409' || error?.code === '42501') conflict.current = true;
            if (conflict.current) setLocked(true);
            throw new Error(conflict.current ? 'Another session changed this store. Download your unsaved data, then reload before editing again.' : error!.message);
          }
          version.current = data; saved.current = payload;
        } while (latest.current !== saved.current && !disposed);
        if (!disposed) setStatus('Saved to Supabase');
      } catch (e) {
        failed.current = true;
        if (!disposed) { setError(e instanceof Error ? e.message : String(e)); setStatus('Not saved'); }
      } finally { running.current = false; }
    }, 350);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [ownerId, retry]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([latest.current], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'jiya-opticals-backup.json'; link.click(); URL.revokeObjectURL(url);
  };
  return { locked, status: saved.current !== serialized && !error ? 'Saving…' : status, error, retry: () => { failed.current = false; setRetry(n => n + 1); }, download, isDirty: () => latest.current !== saved.current };
}
