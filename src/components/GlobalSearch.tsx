import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Props {
  /** 'inline' fills its container (sidebar); 'overlay' is a mobile popover trigger. */
  variant?: 'inline';
  placeholder?: string;
}

export const GlobalSearch: React.FC<Props> = ({ placeholder = 'Search invoice, mobile, barcode…' }) => {
  const {
    searchQuery,
    setSearchQuery,
    invoices,
    products,
    customers,
    setSelectedInvoiceForPrint,
    setActiveTab
  } = useApp();
  const [showResults, setShowResults] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const matchedInvoices = q
    ? invoices
        .filter(
          (i) =>
            i.invoiceNo.toLowerCase().includes(q) ||
            i.customerName.toLowerCase().includes(q) ||
            i.customerMobile.includes(searchQuery.trim())
        )
        .slice(0, 4)
    : [];
  const matchedProducts = q
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.barcode.includes(searchQuery.trim()) ||
            p.modelNo.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];
  const matchedCustomers = q
    ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(searchQuery.trim())).slice(0, 4)
    : [];

  const hasResults = matchedInvoices.length + matchedProducts.length + matchedCustomers.length > 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        placeholder={placeholder}
        className="w-full bg-white border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 text-stone-900 placeholder-stone-400 text-xs rounded-xl pl-9 pr-8 py-2 outline-none transition-all"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showResults && q && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-amber-200 rounded-xl shadow-xl overflow-hidden z-50 text-xs divide-y divide-stone-100 max-h-[60vh] overflow-y-auto">
          {matchedInvoices.length > 0 && (
            <div className="p-2 bg-stone-50/80">
              <div className="text-[10px] uppercase font-bold text-amber-800 mb-1 px-1">Invoices</div>
              {matchedInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => {
                    setSelectedInvoiceForPrint(inv);
                    setShowResults(false);
                  }}
                  className="w-full text-left p-1.5 hover:bg-amber-50 rounded flex items-center justify-between cursor-pointer"
                >
                  <span>
                    <span className="font-semibold text-stone-900 block">
                      {inv.invoiceNo} • {inv.customerName}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {inv.date} | ₹{inv.netPayable} ({inv.orderStatus})
                    </span>
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                    View
                  </span>
                </button>
              ))}
            </div>
          )}
          {matchedProducts.length > 0 && (
            <div className="p-2 bg-stone-50/80">
              <div className="text-[10px] uppercase font-bold text-emerald-800 mb-1 px-1">Products</div>
              {matchedProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveTab('inventory');
                    setShowResults(false);
                  }}
                  className="w-full text-left p-1.5 hover:bg-amber-50 rounded flex items-center justify-between cursor-pointer"
                >
                  <span>
                    <span className="font-semibold text-stone-900 block">
                      {p.name} ({p.modelNo})
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Barcode: {p.barcode} • Stock: {p.stockQty}
                    </span>
                  </span>
                  <span className="text-stone-900 font-bold">₹{p.salePrice}</span>
                </button>
              ))}
            </div>
          )}
          {matchedCustomers.length > 0 && (
            <div className="p-2 bg-stone-50/80">
              <div className="text-[10px] uppercase font-bold text-teal-800 mb-1 px-1">Customers</div>
              {matchedCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveTab('customers');
                    setShowResults(false);
                  }}
                  className="w-full text-left p-1.5 hover:bg-amber-50 rounded flex items-center justify-between cursor-pointer"
                >
                  <span>
                    <span className="font-semibold text-stone-900 block">{c.name}</span>
                    <span className="text-[11px] text-stone-500">
                      📱 {c.mobile} • Dues: ₹{c.outstandingBalance}
                    </span>
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium">View</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
