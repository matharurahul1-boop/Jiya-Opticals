import { useState } from 'react';
import { X } from 'lucide-react';
import type { InvoiceItem } from '../types';

import { COATINGS, INDEXES, LENS_COMPANIES as COMPANIES, LENS_TYPES } from '../lib/lens';

/** A lens (or any one-off item) typed in at billing time, because lenses are made to order and are not kept in stock. */
export function ManualItemModal({ onAdd, onClose }: { onAdd: (item: InvoiceItem) => void; onClose: () => void }) {
  const [company, setCompany] = useState('');
  const [lensType, setLensType] = useState(LENS_TYPES[0]);
  const [coating, setCoating] = useState('');
  const [index, setIndex] = useState('');
  const [power, setPower] = useState('');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) { setError('Enter the company / brand name.'); return; }
    if (!Number.isInteger(qty) || qty < 1) { setError('Quantity must be a whole number, at least 1.'); return; }
    if (!Number.isFinite(rate) || rate <= 0) { setError('Enter the rate.'); return; }
    const pct = Math.max(0, Math.min(100, discount || 0));
    const total = Number((rate * qty - (rate * qty * pct) / 100).toFixed(2));
    const name = [company.trim(), lensType !== 'Other' ? `${lensType} lens` : 'Lens', index && `Index ${index}`, coating.trim()].filter(Boolean).join(' · ');
    const details = [power.trim() && `Power: ${power.trim()}`, note.trim()].filter(Boolean).join(' — ');
    onAdd({
      productId: `custom:${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      barcode: '',
      name,
      category: 'Eyewear Lens',
      hsnCode: '9001',
      qty,
      unitPrice: rate,
      discountPercent: pct,
      taxableAmount: total,
      gstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: total,
      lensDetails: details || undefined,
    });
  };

  const field = 'w-full border border-stone-300 rounded-lg p-2 bg-white';
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Add lens or manual item">
      <form onSubmit={submit} className="bg-white border border-stone-200 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-3 text-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-900 text-base">Add lens / manual item</h3>
            <p className="text-stone-500 mt-0.5">For made-to-order lenses and anything not kept in Inventory. No stock is deducted.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-lg shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <label className="block">Company / brand *
          <input list="lens-companies" className={field} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Essilor" autoFocus />
          <datalist id="lens-companies">{COMPANIES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Lens type
            <select className={field} value={lensType} onChange={(e) => setLensType(e.target.value)}>{LENS_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label className="block">Index
            <input list="lens-indexes" className={field} value={index} onChange={(e) => setIndex(e.target.value)} placeholder="1.56" inputMode="decimal" />
            <datalist id="lens-indexes">{INDEXES.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
        </div>
        <label className="block">Coating
          <input list="lens-coatings" className={field} value={coating} onChange={(e) => setCoating(e.target.value)} placeholder="e.g. Blue Guard" />
          <datalist id="lens-coatings">{COATINGS.map((x) => <option key={x} value={x} />)}</datalist>
        </label>
        <label className="block">Power (optional)
          <input className={field} value={power} onChange={(e) => setPower(e.target.value)} placeholder="R -1.00 / L -1.25" />
        </label>
        <label className="block">Note (optional)
          <input className={field} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">Qty
            <input type="number" min={1} className={field} value={qty} onChange={(e) => setQty(Math.floor(Number(e.target.value) || 0))} />
          </label>
          <label className="block">Rate (₹) *
            <input type="number" min={0} step="any" className={field} value={rate || ''} onChange={(e) => setRate(Number(e.target.value) || 0)} />
          </label>
          <label className="block">Discount %
            <input type="number" min={0} max={100} step="any" className={field} value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
          </label>
        </div>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border font-bold">Cancel</button>
          <button className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold">Add to bill</button>
        </div>
      </form>
    </div>
  );
}
