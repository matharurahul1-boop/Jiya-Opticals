import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

interface Member {
  email: string;
  shopIds: string[];
  registered: boolean;
  fullName?: string;
  username?: string;
  phone?: string;
  role?: UserRole;
  isAdmin?: boolean;
}

const ROLES: UserRole[] = ['Shop Manager', 'Optometrist', 'Cashier', 'Lab Technician'];

// Supabase RPC failures come back as a plain PostgrestError object, not an Error
// instance, so `String(err)` would render "[object Object]". Pull out the useful text.
function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint].filter((p): p is string => typeof p === 'string' && p.length > 0);
    if (parts.length) return parts.join(' — ');
  }
  return typeof err === 'string' ? err : 'Something went wrong. Try again.';
}

export function TeamManager() {
  const { ownerId, currentUser, shops, saveStatus, setActiveTab } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ownerId || currentUser.role !== 'Admin') {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    setNote('');
    (async () => {
      // Prefer the rich directory list; fall back to the basic list if
      // supabase/users-directory.sql has not been run yet.
      const rich = await supabase!.rpc('optical_team_users', { team_owner: ownerId });
      if (!active) return;
      if (!rich.error) {
        setMembers(rich.data as Member[]);
      } else {
        const basic = await supabase!.rpc('optical_team_members', { team_owner: ownerId });
        if (!active) return;
        if (basic.error) setError(errText(basic.error));
        else {
          setMembers(basic.data as Member[]);
          setNote('Run supabase/users-directory.sql in the SQL Editor to show names, usernames and editable roles here.');
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [ownerId, currentUser.role, attempt]);

  if (currentUser.role !== 'Admin') return <div className="p-6">Only admins can manage team access.</div>;
  if (!ownerId) return <div className="p-6">Sign in with Supabase to manage team access.</div>;

  const assign = async (memberEmail: string, shopIds: string[], remove = false) => {
    if (busy || saveStatus !== 'Saved to Supabase') return;
    if (remove && !confirm(`Remove ${memberEmail}'s access to this business?`)) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase!.rpc('optical_team_assign', {
        team_owner: ownerId,
        member_email: memberEmail.trim().toLowerCase(),
        assigned_shops: shopIds,
        remove_member: remove
      });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setError(errText(error));
      setBusy(false);
    }
  };

  const setRole = async (memberEmail: string, role: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase!.rpc('optical_member_set_role', {
        team_owner: ownerId,
        member_email: memberEmail,
        new_role: role
      });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setError(errText(error));
      setBusy(false);
    }
  };

  return (
    <section className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Team &amp; shop access</h1>
        <p className="text-stone-600 mt-1">
          Admins see every shop. A team member appears here once you assign them a shop; their name and username fill in
          after they sign up with that email. You can change their role and shops any time — the email stays fixed.
        </p>
      </header>

      {error && (
        <div role="alert" className="p-3 bg-red-50 text-red-700 rounded">
          {error}{' '}
          <button className="underline" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}
      {note && <div className="p-3 bg-amber-50 text-amber-800 rounded text-sm">{note}</div>}

      <form
        className="bg-white border rounded-2xl p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void assign(email, selected);
        }}
      >
        <h2 className="font-bold">Assign a team member</h2>
        <p className="text-sm text-stone-600">
          Enter the email they will sign up with, then pick their shops. No invitation email is sent from here — share
          the app link and ask them to sign up with this exact email.
        </p>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block">
            Member email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border rounded-lg p-2"
              placeholder="member@example.com"
            />
          </label>
          <legend className="font-medium">Assigned shops</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {shops.map((shop) => (
              <label key={shop.id} className="border rounded-lg p-3 flex gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(shop.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, shop.id] : selected.filter((id) => id !== shop.id)
                    )
                  }
                />
                {shop.name}
              </label>
            ))}
          </div>
        </fieldset>
        {!shops.length && (
          <button type="button" className="underline" onClick={() => setActiveTab('shops')}>
            Create a shop first
          </button>
        )}
        {saveStatus !== 'Saved to Supabase' && (
          <p className="text-amber-800 text-sm">Wait for store changes to save before assigning access.</p>
        )}
        <button
          disabled={busy || selected.length === 0 || saveStatus !== 'Saved to Supabase'}
          className="px-4 py-2 bg-amber-700 text-white rounded-lg disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save assignment'}
        </button>
      </form>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <h2 className="font-bold p-4 border-b">Team members</h2>
        {loading ? (
          <p className="p-4">Loading…</p>
        ) : !members.length ? (
          <p className="p-4 text-stone-500">No team members assigned yet.</p>
        ) : (
          members.map((member) => (
            <div key={member.email} className="p-4 border-b flex flex-wrap gap-3 justify-between items-start">
              <div className="min-w-0">
                <strong>{member.fullName || member.email}</strong>
                {member.username && <span className="text-stone-400 text-sm"> · @{member.username}</span>}
                {member.fullName && <span className="block text-xs text-stone-500">{member.email}</span>}
                <p className="text-sm text-stone-600">
                  {member.isAdmin
                    ? 'All branches'
                    : member.shopIds.map((id) => shops.find((s) => s.id === id)?.name || 'Removed shop').join(', ') ||
                      'No shop'}
                </p>
                <span className="text-xs text-stone-500">
                  {member.isAdmin
                    ? 'Business owner'
                    : member.registered
                    ? 'Email verified'
                    : 'Awaiting sign-up / email verification'}
                </span>
              </div>

              {!member.isAdmin && (
                <div className="flex flex-wrap items-center gap-3">
                  {member.role !== undefined && (
                    <select
                      disabled={busy}
                      value={member.role || 'Shop Manager'}
                      onChange={(e) => void setRole(member.email, e.target.value)}
                      className="border rounded-lg p-1.5 text-sm bg-white"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    disabled={busy}
                    className="text-amber-800 underline text-sm"
                    onClick={() => {
                      setEmail(member.email);
                      setSelected(member.shopIds);
                    }}
                  >
                    Edit shops
                  </button>
                  <button
                    disabled={busy || saveStatus !== 'Saved to Supabase'}
                    className="text-red-700 underline text-sm disabled:opacity-50"
                    onClick={() => void assign(member.email, [], true)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
