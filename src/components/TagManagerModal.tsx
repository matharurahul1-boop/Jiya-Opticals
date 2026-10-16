import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { catalogKey } from '../lib/catalog';
import { unitCode } from '../lib/barcodes';
import type { Product } from '../types';

type Filter = 'all' | 'active' | 'disabled' | 'sold';
const LIMIT = 300;

/** Every printed tag of one material with its status, and a switch to disable / enable each one. */
export function TagManagerModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { allProducts, invoices, setTagDisabled } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => allProducts.filter((p) => catalogKey(p) === catalogKey(product)), [allProducts, product]);
  const sold = useMemo(() => new Set(rows.flatMap((r) => r.soldUnitCodes || [])), [rows]);
  const disabled = useMemo(() => new Set(rows.flatMap((r) => r.disabledUnitCodes || [])), [rows]);
  const printed = Math.max(1, ...rows.map((r) => r.nextSerial || 1)) - 1;
  const invoiceOf = (code: string) => invoices.find((inv) => inv.items.some((it) => it.unitCodes?.includes(code)));

  const tags = Array.from({ length: printed }, (_, i) => {
    const code = unitCode(product.barcode, i + 1);
    const status: Exclude<Filter, 'all'> = sold.has(code) ? 'sold' : disabled.has(code) ? 'disabled' : 'active';
    return { code, status };
  });
  const count = (s: Filter) => (s === 'all' ? tags.length : tags.filter((x) => x.status === s).length);
  const shown = tags.filter((x) => filter === 'all' || x.status === filter);
  const visible = showAll ? shown : shown.slice(0, LIMIT);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-stone-900 break-words">Tags — {product.name}</h3>
            <p className="text-xs text-stone-500 font-mono break-all">{product.barcode}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-lg shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3 flex flex-wrap gap-2 border-b border-stone-100 text-xs">
          {(['all', 'active', 'disabled', 'sold'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={'rounded-full px-3 py-1.5 border ' + (filter === f ? 'bg-amber-600 text-white border-amber-600' : 'bg-white')}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'disabled' ? 'Disabled' : 'Sold'} ({count(f)})
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 divide-y">
          {!printed && <p className="p-5 text-sm text-stone-500">No tags have been printed for this material yet. Print tags first, then manage them here.</p>}
          {printed > 0 && !visible.length && <p className="p-5 text-sm text-stone-500">No tags in this list.</p>}
          {visible.map(({ code, status }) => {
            const inv = status === 'sold' ? invoiceOf(code) : undefined;
            return (
              <div key={code} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="font-mono text-xs break-all flex-1 min-w-0">{code}</span>
                {status === 'sold' && <span className="text-xs rounded-full px-2 py-0.5 bg-stone-100 text-stone-600 whitespace-nowrap">Sold{inv ? ` · ${inv.invoiceNo}` : ''}</span>}
                {status === 'active' && (
                  <>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800">Active</span>
                    <button onClick={() => setTagDisabled(product.id, code, true)} className="text-xs font-bold rounded-lg border border-rose-300 text-rose-700 bg-rose-50 px-3 py-1.5">Disable</button>
                  </>
                )}
                {status === 'disabled' && (
                  <>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-rose-100 text-rose-800">Disabled</span>
                    <button onClick={() => setTagDisabled(product.id, code, false)} className="text-xs font-bold rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50 px-3 py-1.5">Enable</button>
                  </>
                )}
              </div>
            );
          })}
          {!showAll && shown.length > LIMIT && <button onClick={() => setShowAll(true)} className="w-full p-3 text-sm text-amber-800 underline">Show all {shown.length} tags</button>}
        </div>

        <p className="p-3 text-[11px] text-stone-500 border-t">A disabled tag cannot be added to a bill. A sold tag is closed for good. Stock counts are not changed here.</p>
      </div>
    </div>
  );
}
