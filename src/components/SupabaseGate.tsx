import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configurationError, supabase } from '../lib/supabase';

export function SupabaseGate({ children }: { children: (id?: string) => React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session); setLoading(false);
      if (error) setError(error.message);
    }).catch(e => { if (active) { setError(String(e)); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value); setLoading(false);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  // Record the signed-in person in the Supabase user directory so admins can
  // see and manage them in Team & Access. Best-effort: silently ignored if
  // supabase/users-directory.sql has not been run yet.
  useEffect(() => {
    if (!supabase || !session) return;
    const meta = (session.user.user_metadata || {}) as Record<string, string>;
    const name = meta.full_name || meta.name || '';
    supabase.rpc('optical_user_sync', { display_name: name, uname: '', phone: meta.phone || '' }).then(() => {});
  }, [session]);

  if (configurationError) return <div className="p-8 text-red-700" role="alert">{configurationError}</div>;
  if (!supabase) return <><div className="bg-amber-100 p-2 text-center text-sm">Local demo mode — add Supabase URL and publishable key to .env.local to enable cloud storage.</div>{children()}</>;
  if (loading) return <div className="p-10">Connecting to Supabase…</div>;
  if (session) return <>{children(session.user.id)}</>;
  return <div className="min-h-screen bg-[#eef1f7] flex items-center justify-center p-6">
    <form className="bg-white rounded-2xl shadow p-8 w-full max-w-md space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (busy) return;
      setError(''); setMessage('');
      if (mode === 'signup' && password !== confirmPassword) {
        setError('Passwords do not match.'); return;
      }
      setBusy(true);
      try {
        if (mode === 'signup') {
          const { data, error } = await supabase!.auth.signUp({
            email: email.trim(), password,
            options: { emailRedirectTo: window.location.origin },
          });
          if (error) throw error;
          if (!data.session) {
            setMessage('Check your email for a confirmation link, then sign in. If you already have an account, sign in with your existing password.');
            setMode('signin'); setPassword(''); setConfirmPassword('');
          }
        } else {
          const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw error;
        }
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
      finally { setBusy(false); }
    }}>
      <h1 className="text-2xl font-bold">JIYA OPTICALS</h1>
      <p>{mode === 'signup' ? 'Create your account' : 'Sign in to your shops'}</p>
      <fieldset disabled={busy} className="space-y-4">
      <label className="block">Email<input className="border rounded p-2 w-full" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">Password<input className="border rounded p-2 w-full" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {mode === 'signup' && <>
        <p className="text-sm text-stone-500">Use at least 8 characters.</p>
        <label className="block">Confirm password<input className="border rounded p-2 w-full" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
      </>}
      </fieldset>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {message && <p role="status" className="text-green-800">{message}</p>}
      <button disabled={busy} className="bg-amber-700 text-white rounded p-3 w-full disabled:opacity-60">{busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Sign up' : 'Sign in')}</button>
      <button type="button" disabled={busy} className="text-amber-800 underline w-full disabled:opacity-60" onClick={() => {
        setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); setPassword(''); setConfirmPassword('');
      }}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
      {mode === 'signup' && <p className="text-sm text-stone-500">After sign-in, create a business as an admin or join shops assigned to your email by your admin.</p>}
    </form>
  </div>;
}
