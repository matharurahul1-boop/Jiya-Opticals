import { t } from '../lib/i18n';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { monthlyRevenue } from '../lib/revenue';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const series = [{ key: 'revenue', label: 'Revenue', color: '#078574' }, { key: 'received', label: 'Received', color: '#0d9488' }, { key: 'pending', label: 'Pending now', color: '#f59e0b' }] as const;
export function MonthlyRevenueChart() {
  const { invoices, payments, selectedShopFilter, shops } = useApp();
  const [year, setYear] = useState(new Date().getFullYear());
  const years = [...new Set([new Date().getFullYear(), ...invoices.map(i => Number(i.date.slice(0, 4))), ...payments.map(p => Number(p.date.slice(0, 4)))])].filter(y => Number.isFinite(y) && y > 1900).sort((a, b) => b - a);
  const { rows, undatedReceived } = monthlyRevenue(invoices, payments, year, selectedShopFilter);
  const peak = Math.max(1, ...rows.flatMap(r => [r.revenue, r.received, r.pending]));
  const totals = rows.reduce((sum, r) => ({ revenue: sum.revenue + r.revenue, received: sum.received + r.received, pending: sum.pending + r.pending }), { revenue: 0, received: 0, pending: 0 });
  return <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-lg">{t("Monthly revenue & collections")}</h2><p className="text-sm text-stone-500">{selectedShopFilter === 'all' ? t("All accessible shops combined") : shops.find(s => s.id === selectedShopFilter)?.name}</p></div><label className="text-sm">{t("Year ")}<select aria-label={t("Revenue year")} className="border rounded p-2 ml-2" value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select></label></header>
    <div className="grid sm:grid-cols-3 gap-3">{series.map(s => <div key={s.key} className="rounded-xl bg-stone-50 p-3"><div className="text-sm flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: s.color }} />{t(s.label)}</div><strong className="text-xl">{money(totals[s.key])}</strong></div>)}</div>
    <div className="overflow-x-auto"><svg role="img" aria-label={`Monthly revenue, receipts and current pending balances for ${year}`} viewBox="0 0 920 290" className="w-full min-w-[680px]">
      <title>{t("Monthly revenue, receipts and current outstanding balances")}</title>
      {[0, 1, 2, 3, 4].map(t => <g key={t}><line x1="80" x2="910" y1={240 - t * 52} y2={240 - t * 52} stroke="#e7e5e4" /><text x="74" y={244 - t * 52} textAnchor="end" fontSize="11" fill="#57534e">{money(peak * t / 4)}</text></g>)}
      {rows.map((row, index) => <g key={row.key}>{series.map((s, i) => {
        const height = row[s.key] / peak * 208;
        return <rect key={s.key} x={89 + index * 68 + i * 16} y={240 - height} width="13" height={height} rx="2" fill={s.color}><title>{row.month}: {t(s.label)} {money(row[s.key])}</title></rect>;
      })}<text x={112 + index * 68} y="263" textAnchor="middle" fontSize="12" fill="#57534e">{row.month}</text></g>)}
    </svg></div>
    {!totals.revenue && !totals.received && <p className="text-sm text-stone-500">{t("No billing or receipt activity for this year yet.")}</p>}
    {undatedReceived > 0 && <p className="text-xs text-amber-800">{t("Earlier receipts of ")}{money(undatedReceived)} {t("have no recorded payment dates and are excluded from monthly received totals.")}</p>}
  </section>;
}
