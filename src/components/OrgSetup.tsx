import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cloudErrorMessage } from '../lib/cloudErrors';
import { initialStoreProfile, initialWhatsAppTemplates } from '../data/initialData';

interface Answers {
  name: string; tagline: string; phone: string;
  address: string; city: string; state: string; pincode: string; gstin: string;
  shopName: string; shopSame: boolean; shopAddress: string; shopCity: string; shopPhone: string;
  invoicePrefix: string; upiId: string; upiName: string;
}

// Indian financial year (Apr–Mar), e.g. 'INV/26-27/' for October 2026.
function defaultPrefix(now = new Date()) {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `INV/${String(start).slice(-2)}-${String(start + 1).slice(-2)}/`;
}

const STEPS = ['Business', 'Address & tax', 'First shop', 'Billing', 'Review'] as const;

/** Guided first-run setup for a newly registered organization. One question group per screen. */
export function OrgSetup({ email, onDone }: { email: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    name: '', tagline: '', phone: '', address: '', city: '', state: '', pincode: '', gstin: '',
    shopName: '', shopSame: true, shopAddress: '', shopCity: '', shopPhone: '',
    invoicePrefix: defaultPrefix(), upiId: '', upiName: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setA(prev => ({ ...prev, [key]: value }));

  const shop = useMemo(() => ({
    name: a.shopName.trim() || a.name.trim(),
    address: a.shopSame ? a.address.trim() : a.shopAddress.trim(),
    city: a.shopSame ? a.city.trim() : a.shopCity.trim(),
    phone: a.shopSame ? a.phone.trim() : a.shopPhone.trim(),
    gstin: a.gstin.trim().toUpperCase(),
  }), [a]);

  const valid = [
    a.name.trim().length >= 2,
    !a.gstin.trim() || /^[0-9A-Za-z]{15}$/.test(a.gstin.trim()),
    shop.name.length >= 2,
    a.invoicePrefix.trim().length > 0,
    true,
  ][step];

  const create = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const profile = {
        ...initialStoreProfile, name: a.name.trim(), tagline: a.tagline.trim(), phone: a.phone.trim(), email,
        addressLine1: a.address.trim(), city: a.city.trim(), state: a.state.trim(), pincode: a.pincode.trim(),
        gstin: a.gstin.trim().toUpperCase(), invoicePrefix: a.invoicePrefix.trim(), upiId: a.upiId.trim(), upiName: a.upiName.trim() || a.name.trim(),
      };
      const { data, error: rpcError } = await supabase!.rpc('optical_org_create', {
        org_name: a.name.trim(), profile, first_shop: shop, templates: initialWhatsAppTemplates,
      });
      if (rpcError) throw rpcError;
      setCode(data.joinCode);
    } catch (e) { setError(cloudErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const field = 'w-full border rounded-xl p-3 mt-2';
  const label = 'block text-sm';

  if (code) return <div className="space-y-5">
    <img src="/brand/logo.svg" alt="" className="w-12 h-12" />
    <h2 className="text-2xl font-semibold">{a.name.trim()} is ready</h2>
    <div role="status" className="bg-amber-50 rounded-xl p-5 space-y-2">
      <p className="text-sm">Your organization code. Share it with staff you want to add:</p>
      <p className="text-3xl font-bold tracking-[0.3em] select-all">{code}</p>
      <p className="text-sm text-stone-600">They choose <strong>Register new organization → Join an organization</strong> on the sign-in page, sign up, enter this code and pick a shop. You approve them from your dashboard. You can see this code again under Team &amp; Access.</p>
    </div>
    <button className="bg-amber-700 text-white rounded-xl p-3 w-full" onClick={onDone}>Open my workspace</button>
  </div>;

  return <div className="space-y-5">
    <img src="/brand/logo.svg" alt="" className="w-12 h-12" />
    <div>
      <p className="text-xs tracking-widest text-stone-500">STEP {step + 1} OF {STEPS.length} · {STEPS[step].toUpperCase()}</p>
      <div className="h-1.5 bg-stone-100 rounded-full mt-2" aria-hidden><div className="h-1.5 bg-amber-700 rounded-full transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
    </div>

    <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!valid) return; if (step < STEPS.length - 1) setStep(step + 1); else void create(); }}>
      {step === 0 && <>
        <h2 className="text-2xl font-semibold">What is your business called?</h2>
        <label className={label}>Organization name<input autoFocus required minLength={2} className={field} value={a.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Vision Hub Opticals" /></label>
        <label className={label}>Tagline (optional)<input className={field} value={a.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Printed under your name on bills" /></label>
        <label className={label}>Business phone (optional)<input className={field} inputMode="tel" value={a.phone} onChange={e => set('phone', e.target.value)} /></label>
      </>}
      {step === 1 && <>
        <h2 className="text-2xl font-semibold">Where are you, and what is your GSTIN?</h2>
        <p className="text-sm text-stone-600">This appears on your invoices. You can leave anything blank and fill it in later from Masters &amp; Settings.</p>
        <label className={label}>Address<input className={field} value={a.address} onChange={e => set('address', e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>City<input className={field} value={a.city} onChange={e => set('city', e.target.value)} /></label>
          <label className={label}>State<input className={field} value={a.state} onChange={e => set('state', e.target.value)} /></label>
          <label className={label}>Pincode<input className={field} inputMode="numeric" value={a.pincode} onChange={e => set('pincode', e.target.value)} /></label>
          <label className={label}>GSTIN (optional)<input className={field + ' uppercase'} maxLength={15} value={a.gstin} onChange={e => set('gstin', e.target.value)} /></label>
        </div>
        {!valid && <p role="alert" className="text-sm text-red-700">A GSTIN has 15 letters/digits. Leave it empty if you do not have one yet.</p>}
      </>}
      {step === 2 && <>
        <h2 className="text-2xl font-semibold">Set up your first shop</h2>
        <p className="text-sm text-stone-600">Stock, clients and bills are kept per shop. You can add more shops later.</p>
        <label className={label}>Shop name<input className={field} value={a.shopName} onChange={e => set('shopName', e.target.value)} placeholder={a.name.trim() || 'e.g. Main Branch'} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.shopSame} onChange={e => set('shopSame', e.target.checked)} />Same address and phone as the business</label>
        {!a.shopSame && <>
          <label className={label}>Shop address<input className={field} value={a.shopAddress} onChange={e => set('shopAddress', e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>City<input className={field} value={a.shopCity} onChange={e => set('shopCity', e.target.value)} /></label>
            <label className={label}>Phone<input className={field} inputMode="tel" value={a.shopPhone} onChange={e => set('shopPhone', e.target.value)} /></label>
          </div>
        </>}
      </>}
      {step === 3 && <>
        <h2 className="text-2xl font-semibold">How should your bills look?</h2>
        <label className={label}>Invoice number prefix<input required className={field} value={a.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value)} /></label>
        <p className="text-sm text-stone-600">Optional — add a UPI ID to show a payment QR on bills.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>UPI ID<input className={field} value={a.upiId} onChange={e => set('upiId', e.target.value)} placeholder="name@bank" /></label>
          <label className={label}>Name on UPI<input className={field} value={a.upiName} onChange={e => set('upiName', e.target.value)} placeholder={a.name.trim()} /></label>
        </div>
      </>}
      {step === 4 && <>
        <h2 className="text-2xl font-semibold">Check and create</h2>
        <dl className="bg-stone-50 rounded-xl p-4 text-sm space-y-2">
          <div><dt className="text-stone-500">Organization</dt><dd className="font-medium">{a.name.trim()}{a.tagline.trim() ? ` — ${a.tagline.trim()}` : ''}</dd></div>
          <div><dt className="text-stone-500">Address</dt><dd>{[a.address, a.city, a.state, a.pincode].map(x => x.trim()).filter(Boolean).join(', ') || '—'}{a.gstin.trim() ? ` · GSTIN ${a.gstin.trim().toUpperCase()}` : ''}</dd></div>
          <div><dt className="text-stone-500">First shop</dt><dd>{shop.name}</dd></div>
          <div><dt className="text-stone-500">Invoice prefix</dt><dd>{a.invoicePrefix.trim()}</dd></div>
          <div><dt className="text-stone-500">Admin</dt><dd>{email}</dd></div>
        </dl>
      </>}

      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex gap-3">
        {step > 0 && <button type="button" disabled={busy} className="border rounded-xl p-3 px-5 disabled:opacity-50" onClick={() => { setStep(step - 1); setError(''); }}>Back</button>}
        <button disabled={busy || !valid} className="flex-1 bg-amber-700 text-white rounded-xl p-3 disabled:opacity-50">{step === STEPS.length - 1 ? (busy ? 'Creating…' : 'Create organization') : 'Continue'}</button>
      </div>
    </form>
  </div>;
}
