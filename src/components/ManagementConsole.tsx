import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cloudErrorMessage } from '../lib/cloudErrors';

interface Org { ownerId: string; name: string; ownerEmail: string; kind: 'classic' | 'organization'; joinCode: string | null; createdAt: string; updatedAt: string; shops: string[]; customers: number; invoices: number; products: number; sales: number; pendingRequests: number; subscriptionActive: boolean; subscriptionTrial: boolean; subscriptionExpiresAt: string | null; members: { email: string; role: string; shopIds: string[] }[] }
interface Person { id: string; email: string; fullName: string; phone: string; createdAt: string; lastSignIn: string | null; confirmed: boolean; owns: string[]; memberOf: string[]; pending: string[] }
interface Log { id: number; at: string; actor: string | null; org: string | null; ownerId: string | null; action: string; detail: Record<string, unknown> }

const when = (v?: string | null) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const ACTIONS: Record<string, string> = {
  signed_up: 'Signed up', user_first_seen: 'First visit', sign_in: 'Signed in', organization_created: 'Organization created', store_created: 'Store created', organization_deleted: 'Organization deleted',
  join_requested: 'Asked to join', join_approved: 'Join approved', join_rejected: 'Join rejected', member_assigned: 'Member assigned', member_shops_changed: 'Member shops changed',
  member_removed: 'Member removed', role_changed: 'Role changed', data_saved: 'Data saved', subscription_changed: 'Subscription changed',
};
const describe = (l: Log) => {
  const d = l.detail || {};
  const bits = [d.name, d.applicant, d.member, d.role, d.intent && `via ${d.intent === 'org' ? 'new organization' : d.intent === 'join' ? 'join organization' : d.intent}`,
    d.shop && `shop ${d.shop}`, d.expiresAt !== undefined && `${d.active === false ? 'OFF' : 'ON'}, until ${when(String(d.expiresAt))}`, d.invoices !== undefined && `${d.invoices} invoices · ${d.customers} clients · ${d.products} items`].filter(Boolean);
  return bits.join(' · ');
};

const endOfDay = (yyyyMmDd: string) => { const [y, m, d] = yyyyMmDd.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59).toISOString(); };
const dayValue = (v: string | null) => { if (!v) return ''; const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Switch an organization on/off and set its renewal date. */
function SubscriptionControls({ org, onChanged, onError }: { org: Org; onChanged: () => void; onError: (m: string) => void }) {
  const [date, setDate] = useState(dayValue(org.subscriptionExpiresAt));
  const [busy, setBusy] = useState(false);
  useEffect(() => setDate(dayValue(org.subscriptionExpiresAt)), [org.subscriptionExpiresAt]);
  const expiresMs = org.subscriptionExpiresAt ? new Date(org.subscriptionExpiresAt).getTime() : 0;
  const expired = !!org.subscriptionExpiresAt && expiresMs <= Date.now();
  const left = Math.ceil((expiresMs - Date.now()) / 864e5);
  const status = !org.subscriptionActive ? ['Switched off', 'bg-red-100 text-red-800'] : expired ? ['Expired', 'bg-red-100 text-red-800'] : [`${org.subscriptionTrial ? 'Trial' : 'Active'} · ${left} day${left === 1 ? '' : 's'} left`, left <= 5 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'];
  const call = async (active: boolean | null, expires: string | null) => {
    if (busy) return;
    setBusy(true);
    const r = await supabase!.rpc('optical_platform_set_subscription', { team_owner: org.ownerId, p_active: active, p_expires: expires });
    setBusy(false);
    if (r.error) onError(cloudErrorMessage(r.error)); else onChanged();
  };
  const plus30 = () => { const base = Math.max(Date.now(), expiresMs); const d = new Date(base + 30 * 864e5); void call(true, endOfDay(dayValue(d.toISOString()))); };
  return <div className="rounded-xl bg-stone-50 border p-3 space-y-2 text-sm">
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-medium">Subscription</span>
      <span className={'text-xs rounded-full px-2 py-0.5 ' + status[1]}>{status[0]}</span>
      <button role="switch" aria-checked={org.subscriptionActive} aria-label={`Subscription for ${org.name}`} disabled={busy} onClick={() => void call(!org.subscriptionActive, null)}
        className={'ml-auto relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ' + (org.subscriptionActive ? 'bg-emerald-600' : 'bg-stone-400')}>
        <span className={'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ' + (org.subscriptionActive ? 'left-6' : 'left-0.5')} /></button>
    </div>
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-stone-500">Renewal date<input type="date" value={date} onChange={e => setDate(e.target.value)} className="block border rounded-lg px-2 py-1.5 text-sm text-stone-900 bg-white" /></label>
      <button disabled={busy || !date || date === dayValue(org.subscriptionExpiresAt)} onClick={() => void call(true, endOfDay(date))} className="rounded-lg bg-amber-700 text-white px-3 py-2 disabled:opacity-50">Save date &amp; switch on</button>
      <button disabled={busy} onClick={plus30} className="rounded-lg border px-3 py-2 disabled:opacity-50 bg-white">Renew +30 days</button>
    </div>
    <p className="text-xs text-stone-500">Access stops automatically after the date (the whole day counts). Switching off blocks it immediately; the data is never deleted.</p>
  </div>;
}

/** Read-only view of every organization, person and event on the platform. Visible only to platform admins. */
export function ManagementConsole() {
  const [tab, setTab] = useState<'orgs' | 'users' | 'logs'>('orgs');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [more, setMore] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [o, l] = await Promise.all([supabase!.rpc('optical_platform_overview'), supabase!.rpc('optical_platform_logs', { max_rows: 200, before_id: null })]);
      if (o.error) throw o.error;
      if (l.error) throw l.error;
      setOrgs(o.data.orgs); setPeople(o.data.users); setLogs(l.data); setMore(l.data.length === 200);
    } catch (e) { setError(cloudErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const loadMore = async () => {
    const last = logs[logs.length - 1];
    if (!last) return;
    const r = await supabase!.rpc('optical_platform_logs', { max_rows: 200, before_id: last.id });
    if (r.error) { setError(cloudErrorMessage(r.error)); return; }
    setLogs(prev => [...prev, ...r.data]); setMore(r.data.length === 200);
  };

  const q = query.trim().toLowerCase();
  const shownOrgs = useMemo(() => orgs.filter(o => !q || [o.name, o.ownerEmail, ...o.members.map(m => m.email)].join(' ').toLowerCase().includes(q)), [orgs, q]);
  const shownPeople = useMemo(() => people.filter(p => !q || [p.email, p.fullName, p.phone].join(' ').toLowerCase().includes(q)), [people, q]);
  const shownLogs = useMemo(() => logs.filter(l => (!orgFilter || l.ownerId === orgFilter) && (!q || [l.actor, l.org, l.action, describe(l)].join(' ').toLowerCase().includes(q))), [logs, orgFilter, q]);
  const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  return <section className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
    <header className="flex flex-wrap items-center gap-3 justify-between">
      <div><h1 className="text-2xl font-bold">Management</h1><p className="text-sm text-stone-600">Every organization, person and activity on the platform. Read-only.</p></div>
      <button onClick={() => void load()} disabled={loading} className="border rounded-lg px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
    </header>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded">{error}{/Management access|42501|function/i.test(error) ? ' If this is new, re-run supabase/LIVE_SETUP.sql in Supabase.' : ''}</p>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['Organizations', orgs.filter(o => o.kind === 'organization').length], ['Stores (all)', orgs.length], ['People', people.length], ['Waiting for approval', orgs.reduce((n, o) => n + o.pendingRequests, 0)]].map(([label, value]) =>
        <div key={String(label)} className="bg-white border rounded-2xl p-4"><p className="text-xs text-stone-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}
    </div>
    <div className="flex flex-wrap gap-2 items-center">
      {([['orgs', 'Organizations'], ['users', 'People'], ['logs', 'Activity log']] as const).map(([id, label]) =>
        <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={'rounded-full px-4 py-2 text-sm border ' + (tab === id ? 'bg-amber-700 text-white border-amber-700' : 'bg-white')}>{label}</button>)}
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" aria-label="Search" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
      {tab === 'logs' && <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} aria-label="Filter by organization" className="border rounded-lg px-3 py-2 text-sm bg-white"><option value="">All organizations</option>{orgs.map(o => <option key={o.ownerId} value={o.ownerId}>{o.name}</option>)}</select>}
    </div>

    {tab === 'orgs' && <div className="space-y-3">
      {!shownOrgs.length && !loading && <p className="text-stone-500">Nothing to show.</p>}
      {shownOrgs.map(o => <article key={o.ownerId} className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><h2 className="font-bold break-words">{o.name} <span className={'ml-1 text-[11px] rounded-full px-2 py-0.5 ' + (o.kind === 'organization' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-600')}>{o.kind === 'organization' ? 'Organization' : 'Original store'}</span></h2>
            <p className="text-sm text-stone-600 break-all">Owner: {o.ownerEmail || '—'}{o.joinCode ? <> · Code <strong className="tracking-widest">{o.joinCode}</strong></> : null}</p></div>
          <div className="text-xs text-stone-500 sm:text-right">Created {when(o.createdAt)}<br />Last saved {when(o.updatedAt)}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <span>{o.shops.length} shops</span><span>{o.customers} clients</span><span>{o.invoices} invoices</span><span>{o.products} stock rows</span><span>Sales {money(o.sales)}</span>
        </div>
        {o.kind === 'organization' && <SubscriptionControls org={o} onChanged={() => void load()} onError={setError} />}
        <p className="text-sm"><span className="text-stone-500">Shops:</span> {o.shops.join(', ') || '—'}</p>
        <div className="text-sm"><span className="text-stone-500">Team ({o.members.length}){o.pendingRequests ? ` · ${o.pendingRequests} waiting for approval` : ''}:</span>
          {o.members.length ? <ul className="mt-1 space-y-0.5">{o.members.map(m => <li key={m.email} className="break-all">{m.email} <span className="text-stone-500">— {m.role}</span></li>)}</ul> : <span> none yet</span>}</div>
        <button className="text-sm text-amber-800 underline" onClick={() => { setOrgFilter(o.ownerId); setTab('logs'); }}>See activity</button>
      </article>)}
    </div>}

    {tab === 'users' && <div className="bg-white border rounded-2xl divide-y">
      {!shownPeople.length && !loading && <p className="p-4 text-stone-500">Nothing to show.</p>}
      {shownPeople.map(p => <div key={p.id} className="p-4 text-sm space-y-1">
        <p className="break-all"><strong>{p.fullName || p.email}</strong>{p.fullName && <span className="text-stone-500"> · {p.email}</span>}{p.phone && <span className="text-stone-500"> · {p.phone}</span>}</p>
        <p className="text-stone-600">{p.owns.length ? `Owns: ${p.owns.join(', ')}. ` : ''}{p.memberOf.length ? `Member of: ${p.memberOf.join(', ')}. ` : ''}{p.pending.length ? `Waiting to join: ${p.pending.join(', ')}. ` : ''}{!p.owns.length && !p.memberOf.length && !p.pending.length ? 'Not in any organization yet.' : ''}</p>
        <p className="text-xs text-stone-500">{p.confirmed ? 'Email confirmed' : 'Email not confirmed'} · Joined {when(p.createdAt)} · Last sign-in {when(p.lastSignIn)}</p>
      </div>)}
    </div>}

    {tab === 'logs' && <div className="bg-white border rounded-2xl divide-y">
      {!shownLogs.length && !loading && <p className="p-4 text-stone-500">No activity recorded yet. Events appear here as people use the software.</p>}
      {shownLogs.map(l => <div key={l.id} className="p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-xs text-stone-500 w-36 shrink-0">{when(l.at)}</span>
        <span className="font-medium w-44 shrink-0">{ACTIONS[l.action] || l.action}</span>
        <span className="break-all flex-1 min-w-40">{l.actor || 'system'}{l.org ? <span className="text-stone-500"> · {l.org}</span> : null}{describe(l) ? <span className="text-stone-500"> — {describe(l)}</span> : null}</span>
      </div>)}
      {more && <button onClick={() => void loadMore()} className="w-full p-3 text-sm text-amber-800 underline">Load older activity</button>}
    </div>}
  </section>;
}
