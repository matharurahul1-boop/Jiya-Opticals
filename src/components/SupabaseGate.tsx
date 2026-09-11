import { cloudErrorMessage } from '../lib/cloudErrors';
import { t } from '../lib/i18n';
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
      if (error) setError(cloudErrorMessage(error));
    }).catch(e => { if (active) { setError(cloudErrorMessage(e)); setLoading(false); } });
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
    supabase.rpc('optical_user_sync', { display_name: '', uname: '', phone: null }).then(() => {});
  }, [session]);

  if (configurationError) return <div className="p-8 text-red-700" role="alert">{configurationError}</div>;
  if (!supabase) return <><div className="bg-amber-100 p-2 text-center text-sm">{t("Local demo mode — add Supabase URL and publishable key to .env.local to enable cloud storage.")}</div>{children()}</>;
  if (loading) return <div className="p-10">{t("Connecting to Supabase…")}</div>;
  if (session) return <>{children(session.user.id)}</>;
  return <div className="optical-auth">
    <section className="optical-auth-story" aria-label="Optical practice">
      <div className="optical-brand"><img src="/brand/logo.svg" alt="" /><div><strong>JIYA OPTICALS</strong><span>EYE CARE · PRACTICE MANAGEMENT</span></div></div>
      <div className="optical-story-copy"><span className="optical-eyebrow">A CLEARER WAY TO WORK</span><h1>Exceptional care.<br/>Beautifully managed.</h1><p>Your clients, prescriptions and optical stores.<br/>Together in one thoughtful workspace.</p></div>
      <div className="optical-story-footer"><span>01 / CLIENT CARE</span><span>02 / PRECISION</span><span>03 / PRACTICE</span></div>
    </section>
    <section className="optical-auth-panel">
    <form className="optical-auth-form" onSubmit={async e => {
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
      } catch (e) { setError(cloudErrorMessage(e)); }
      finally { setBusy(false); }
    }}>
      <img className="auth-logo" src="/brand/logo.svg" alt="Jiya Opticals logo" />
      <span className="optical-eyebrow">{mode === 'signup' ? 'START YOUR PRACTICE WORKSPACE' : 'YOUR OPTICAL WORKSPACE'}</span>
      <h2>{mode === 'signup' ? t("Create your account") : t("Welcome back")}</h2>
      <p className="auth-intro">{mode === 'signup' ? 'A little less admin. More time for eye care.' : 'Sign in to take care of your day, your clients and your stores.'}</p>
      <fieldset disabled={busy} className="space-y-4">
      <label className="block">{t("Email")}<input className="border rounded p-2 w-full" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">{t("Password")}<input className="border rounded p-2 w-full" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {mode === 'signup' && <>
        <p className="text-sm text-stone-500">{t("Use at least 8 characters.")}</p>
        <label className="block">{t("Confirm password")}<input className="border rounded p-2 w-full" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
      </>}
      </fieldset>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {message && <p role="status" className="text-green-800">{message}</p>}
      <button disabled={busy} className="bg-amber-700 text-white rounded p-3 w-full disabled:opacity-60">{busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Sign up' : 'Sign in')}</button>
      <button type="button" disabled={busy} className="text-amber-800 underline w-full disabled:opacity-60" onClick={() => {
        setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); setPassword(''); setConfirmPassword('');
      }}>{mode === 'signin' ? t("New here? Create an account") : t("Already have an account? Sign in")}</button>
      {mode === 'signup' && <p className="text-sm text-stone-500">{t("After sign-in, select your shop and request access. Your workspace opens after the admin approves.")}</p>}
    </form>
    <p className="auth-footnote">JIYA OPTICALS <span>•</span> Designed around better eye care</p>
    <p className="auth-credit">Made with ❤️ by Handysolver © 2026</p>
    </section>
  </div>;
}
