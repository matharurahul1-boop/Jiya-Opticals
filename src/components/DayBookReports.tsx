import { t } from '../lib/i18n';
import { NumberInput } from './NumberInput';
import React, { useState } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Banknote, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Download, 
  FileSpreadsheet, 
  PieChart as PieIcon, 
  Plus, 
  Printer, 
  TrendingUp, 
  Wallet 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { expensePaid, expensePending, paidOnDate } from '../lib/expenses';
import { Row, useAsk } from './ConfirmDialog';

export const DayBookReports: React.FC = () => {
  const { 
    invoices, 
    expenses, 
    addExpense, 
    deleteExpense, 
    payExpense,
    storeProfile,
    customers,
    deleteInvoice,
    setSelectedInvoiceForPrint,
    currentUser
  } = useApp();
  const [showOrphans, setShowOrphans] = useState(false);
  const [ask, askDialog] = useAsk();

  // Bills whose client has since been deleted: still counted in sales, but no longer under anyone.
  const orphanBills = invoices.filter((i) => !customers.some((cu) => cu.id === i.customerId));
  const canClean = currentUser.role === 'Admin' || currentUser.role === 'Shop Manager';
  const cleanOrphans = async () => {
    const total = orphanBills.reduce((s, i) => s + i.netPayable, 0);
    const received = orphanBills.reduce((s, i) => s + i.advancePaid, 0);
    const ok = await ask({
      title: `Delete ${orphanBills.length} bill${orphanBills.length === 1 ? '' : 's'} of deleted clients?`,
      danger: true,
      confirmLabel: `Delete ${orphanBills.length} bill${orphanBills.length === 1 ? '' : 's'}`,
      body: (
        <>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 space-y-1.5">
            <Row label="Bills" value={orphanBills.length} />
            <Row label="Bill amount" value={'₹' + total} strong />
            <Row label="Received on them" value={'₹' + received} />
          </div>
          <ul className="max-h-40 overflow-y-auto divide-y border rounded-xl text-xs">
            {orphanBills.slice(0, 40).map((i) => <li key={i.id} className="flex justify-between gap-3 px-3 py-1.5"><span className="truncate">{i.invoiceNo} · {i.customerName}</span><span className="shrink-0">₹{i.netPayable}</span></li>)}
          </ul>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Stock goes back to each shop</li>
            <li>Tags of these bills become free again</li>
            <li>Sales totals and the money received on them are removed from your books</li>
          </ul>
          <p className="text-stone-500">Only do this for test or wrong entries. This cannot be undone.</p>
        </>
      ),
    });
    if (!ok) return;
    try { for (const inv of orphanBills) deleteInvoice(inv.id); }
    catch (e) { await ask({ title: 'Could not delete these bills', notice: true, body: <p>{e instanceof Error ? e.message : 'Please try again.'}</p> }); }
  };

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeReportTab, setActiveReportTab] = useState<'DayBook' | 'GSTR1' | 'Expenses'>('DayBook');

  // Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<Expense['category']>('Tea & Refreshments');
  const [expAmount, setExpAmount] = useState<number>(150);
  // Paid now. Empty = pay the whole bill; less than the total leaves a pending balance.
  const [expPaidNow, setExpPaidNow] = useState<number | null>(null);
  const [payingExp, setPayingExp] = useState<Expense | null>(null);
  const [payAmt, setPayAmt] = useState<number>(0);
  const [payMode, setPayMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [expSearch, setExpSearch] = useState('');
  const [expFrom, setExpFrom] = useState('');
  const [expTo, setExpTo] = useState('');
  const [expPaidTo, setExpPaidTo] = useState('Pantry / Local');
  const [expRemarks, setExpRemarks] = useState('');
  const [expPayMode, setExpPayMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');

  // Date filtered Invoices
  const dateInvoices = invoices.filter((i) => i.date === selectedDate);
  const dateExpenses = expenses.filter((e) => e.date === selectedDate || paidOnDate(e, selectedDate) > 0);

  // Financial Calculations for selected date
  const totalSalesBooked = dateInvoices.reduce((sum, i) => sum + i.netPayable, 0);
  const totalCashCollected = dateInvoices
    .filter((i) => i.paymentMode === 'Cash')
    .reduce((sum, i) => sum + i.advancePaid, 0);
  const totalUpiCollected = dateInvoices
    .filter((i) => i.paymentMode.includes('UPI'))
    .reduce((sum, i) => sum + i.advancePaid, 0);
  const totalCardCollected = dateInvoices
    .filter((i) => i.paymentMode.includes('Card'))
    .reduce((sum, i) => sum + i.advancePaid, 0);
  const totalInflow = dateInvoices.reduce((sum, i) => sum + i.advancePaid, 0);
  const totalOutflow = expenses.reduce((sum, e) => sum + paidOnDate(e, selectedDate), 0);

  // Expense ledger: filter by vendor / category / remarks and by date range, newest first.
  const ledger = expenses
    .filter((e) => (!expFrom || e.date >= expFrom) && (!expTo || e.date <= expTo))
    .filter((e) => !expSearch.trim() || [e.paidTo, e.category, e.remarks || ''].join(' ').toLowerCase().includes(expSearch.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  const ledgerTotal = ledger.reduce((s, e) => s + e.amount, 0);
  const ledgerPaid = ledger.reduce((s, e) => s + expensePaid(e), 0);
  const ledgerPending = ledger.reduce((s, e) => s + expensePending(e), 0);
  const setPeriod = (days: number | 'all') => {
    if (days === 'all') { setExpFrom(''); setExpTo(''); return; }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setExpFrom(iso(start)); setExpTo(iso(end));
  };

  // GSTR-1 Breakdown (Across all invoices)
  const gstBreakdown = {
    slab12: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    slab18: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    slab5: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    slab0: { taxable: 0, cgst: 0, sgst: 0, total: 0 }
  };

  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const itemTaxable = item.taxableAmount || (item.unitPrice * item.qty);
      if (item.gstRate === 12) {
        gstBreakdown.slab12.taxable += itemTaxable;
        gstBreakdown.slab12.cgst += item.cgstAmount || itemTaxable * 0.06;
        gstBreakdown.slab12.sgst += item.sgstAmount || itemTaxable * 0.06;
        gstBreakdown.slab12.total += item.totalAmount || itemTaxable * 1.12;
      } else if (item.gstRate === 18) {
        gstBreakdown.slab18.taxable += itemTaxable;
        gstBreakdown.slab18.cgst += item.cgstAmount || itemTaxable * 0.09;
        gstBreakdown.slab18.sgst += item.sgstAmount || itemTaxable * 0.09;
        gstBreakdown.slab18.total += item.totalAmount || itemTaxable * 1.18;
      } else if (item.gstRate === 5) {
        gstBreakdown.slab5.taxable += itemTaxable;
        gstBreakdown.slab5.cgst += item.cgstAmount || itemTaxable * 0.025;
        gstBreakdown.slab5.sgst += item.sgstAmount || itemTaxable * 0.025;
        gstBreakdown.slab5.total += item.totalAmount || itemTaxable * 1.05;
      }
    });
  });

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) return;
    const paidNow = expPaidNow ?? expAmount;
    if (paidNow < 0 || paidNow > expAmount) { alert('Paid now must be between 0 and the total amount.'); return; }

    addExpense({
      category: expCategory,
      amount: expAmount,
      paidAmount: paidNow,
      paidTo: expPaidTo,
      remarks: expRemarks,
      paymentMode: expPayMode
    });

    setShowExpenseModal(false);
    setExpRemarks('');
    setExpPaidNow(null);
  };

  const handlePrintDayBook = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {askDialog}
      {orphanBills.length > 0 && (
        <div role="status" className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex-1 min-w-52">
            <strong className="text-amber-900">{orphanBills.length} bill{orphanBills.length === 1 ? '' : 's'} (₹{orphanBills.reduce((s, i) => s + i.netPayable, 0)}) of clients who were deleted</strong>
            <p className="text-stone-600 mt-0.5">These bills are saved and still count in your sales and Day Book. They just do not show under a client any more. Open one to view, print or share it.</p>
          </div>
          <button type="button" onClick={() => setShowOrphans((v) => !v)} aria-expanded={showOrphans} className="px-3.5 py-2 rounded-lg border border-amber-400 bg-white text-amber-900 font-bold">{showOrphans ? 'Hide bills' : 'Show bills'}</button>
          {canClean && <button type="button" onClick={() => void cleanOrphans()} className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold">Delete these bills</button>}
          {showOrphans && (
            <ul className="basis-full divide-y border border-amber-200 rounded-xl bg-white overflow-hidden">
              {[...orphanBills].sort((a, b) => b.date.localeCompare(a.date)).map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => setSelectedInvoiceForPrint(i)} className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-3 py-2 text-left hover:bg-amber-50">
                    <span className="font-mono text-[11px] text-stone-800">{i.invoiceNo}</span>
                    <span className="text-stone-600 flex-1 min-w-24 truncate">{i.customerName} · {i.date}</span>
                    <span className="font-bold text-stone-900">₹{i.netPayable}</span>
                    {i.balanceDue > 0 && <span className="text-rose-600">due ₹{i.balanceDue}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              {t("Day Book & Reports ")}</h1>
            <p className="text-xs text-stone-500">
              {t("Daily collections, store expenses, and GST summaries. ")}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-stone-50 border border-stone-300 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-stone-900 outline-none text-xs"
            />
          </div>

          <button
            onClick={handlePrintDayBook}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> {t("Print ")}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white border border-amber-200/80 p-1.5 rounded-xl text-xs overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveReportTab('DayBook')}
          className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'DayBook' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          {t("Daily Cash Register ")}</button>
        <button
          onClick={() => setActiveReportTab('Expenses')}
          className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'Expenses' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          {t("Expenses (")}{dateExpenses.length})
        </button>
        <button
          onClick={() => setActiveReportTab('GSTR1')}
          className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'GSTR1' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          {t("GSTR-1 Tax Summary ")}</button>
      </div>

      {/* Tab 1: Day Book Cash Tally */}
      {activeReportTab === 'DayBook' && (
        <div className="space-y-6">
          {/* Day Tally Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">{t("Total Inflow")}</span>
              <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                ₹{totalInflow.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">{dateInvoices.length} {t("Bills Booked")}</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">{t("UPI / Digital")}</span>
              <div className="text-xl font-bold text-teal-800 mt-1">₹{totalUpiCollected.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">{t("Bank Inflow")}</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">{t("Cash Receipts")}</span>
              <div className="text-xl font-bold text-amber-800 mt-1">₹{totalCashCollected.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">{t("Drawer Cash")}</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">{t("Expenses Outflow")}</span>
              <div className="text-xl font-bold text-rose-700 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                ₹{totalOutflow.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">{dateExpenses.length} {t("Entries")}</span>
            </div>
          </div>

          {/* Detailed Invoices on Date */}
          <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase">
                {t("Bills on ")}{selectedDate} ({dateInvoices.length})
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {t("Booked Value: ₹")}{totalSalesBooked}
              </span>
            </div>

            {dateInvoices.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                {t("No invoices recorded on this date. ")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="day-book-table w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="p-2">{t("Invoice #")}</th>
                      <th className="p-2">{t("Time")}</th>
                      <th className="p-2">{t("Customer")}</th>
                      <th className="p-2">{t("Items")}</th>
                      <th className="p-2 text-right">{t("Net (₹)")}</th>
                      <th className="p-2 text-right">{t("Paid (₹)")}</th>
                      <th className="p-2">{t("Mode")}</th>
                      <th className="p-2 text-right">{t("Balance (₹)")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {dateInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-amber-50/40">
                        <td data-label={t('Invoice #')} className="p-2 font-mono font-bold text-stone-900">{inv.invoiceNo}</td>
                        <td data-label={t('Time')} className="p-2 text-stone-500">{inv.time}</td>
                        <td data-label={t('Customer')} className="p-2 font-medium text-stone-900">{inv.customerName}</td>
                        <td data-label={t('Items')} className="p-2 text-stone-500 break-words sm:truncate sm:max-w-[200px]">
                          {inv.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                        </td>
                        <td data-label={t('Net (₹)')} className="p-2 text-right font-bold text-stone-900">₹{inv.netPayable}</td>
                        <td data-label={t('Paid (₹)')} className="p-2 text-right font-bold text-emerald-700">₹{inv.advancePaid}</td>
                        <td data-label={t('Mode')} className="p-2 text-stone-600 font-mono text-[11px]">{inv.paymentMode}</td>
                        <td data-label={t('Balance (₹)')} className="p-2 text-right font-bold text-rose-600">₹{inv.balanceDue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Daily Expenses Ledger */}
      {activeReportTab === 'Expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
            <div>
              <span className="text-xs font-bold text-stone-900 uppercase">{t("Store Expenses")}</span>
              <p className="text-[11px] text-stone-500">{t("Track petty cash, refreshments, fitting charges, and lab payments.")}</p>
            </div>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {t("+ Add Expense ")}</button>
          </div>

          <div className="bg-white border border-amber-200/80 rounded-xl p-3 space-y-3 shadow-xs">
            <div className="flex flex-wrap gap-2 items-end text-xs">
              <input value={expSearch} onChange={(e) => setExpSearch(e.target.value)} placeholder={t("Search vendor, category, note")} aria-label="Search expenses" className="flex-1 min-w-40 bg-stone-50 border border-stone-300 rounded-lg px-3 py-2" />
              <label className="text-stone-500">{t("From")}<input type="date" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} className="block bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900" /></label>
              <label className="text-stone-500">{t("To")}<input type="date" value={expTo} onChange={(e) => setExpTo(e.target.value)} className="block bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900" /></label>
              <div className="flex gap-1.5">
                {([['Today', 1], ['7 days', 7], ['30 days', 30], ['All', 'all']] as const).map(([label, d]) => <button key={label} type="button" onClick={() => setPeriod(d)} className="px-2.5 py-2 rounded-lg border bg-white hover:bg-stone-50">{label}</button>)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-stone-50 border p-2"><p className="text-[10px] uppercase text-stone-500">{t("Total bills")}</p><p className="font-bold text-stone-900">₹{ledgerTotal}</p></div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2"><p className="text-[10px] uppercase text-emerald-700">{t("Paid / advance")}</p><p className="font-bold text-emerald-800">₹{ledgerPaid}</p></div>
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2"><p className="text-[10px] uppercase text-rose-700">{t("Pending")}</p><p className="font-bold text-rose-700">₹{ledgerPending}</p></div>
            </div>
          </div>

          <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
            <table className="expenses-table w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                <tr>
                  <th className="p-2.5">{t("Date")}</th>
                  <th className="p-2.5">{t("Category")}</th>
                  <th className="p-2.5">{t("Paid To")}</th>
                  <th className="p-2.5">{t("Remarks")}</th>
                  <th className="p-2.5">{t("Mode")}</th>
                  <th className="p-2.5 text-right">{t("Total (₹)")}</th>
                  <th className="p-2.5 text-right">{t("Paid (₹)")}</th>
                  <th className="p-2.5 text-right">{t("Pending (₹)")}</th>
                  <th className="p-2.5 text-right">{t("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ledger.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-stone-500">{t("No expenses match these filters.")}</td></tr>}
                {ledger.map((exp) => (
                  <tr key={exp.id} className="hover:bg-amber-50/40">
                    <td data-label={t('Date')} className="p-2.5 text-stone-500">{exp.date}</td>
                    <td data-label={t('Category')} className="p-2.5 font-bold text-stone-900">{exp.category}</td>
                    <td data-label={t('Paid To')} className="p-2.5 text-stone-700">{exp.paidTo}</td>
                    <td data-label={t('Remarks')} className="p-2.5 text-stone-500 break-words">{exp.remarks || '-'}{(exp.payments?.length || 0) > 1 && <span className="block text-[10px] text-stone-400 mt-0.5">{exp.payments!.map((p) => `${p.date.slice(5)}: ₹${p.amount}`).join(' · ')}</span>}</td>
                    <td data-label={t('Mode')} className="p-2.5 font-mono text-[11px] text-stone-600">{exp.paymentMode}</td>
                    <td data-label={t('Total (₹)')} className="p-2.5 text-right font-bold text-stone-900">₹{exp.amount}</td>
                    <td data-label={t('Paid (₹)')} className="p-2.5 text-right font-medium text-emerald-700">₹{expensePaid(exp)}</td>
                    <td data-label={t('Pending (₹)')} className={'p-2.5 text-right font-bold ' + (expensePending(exp) > 0 ? 'text-rose-600' : 'text-stone-400')}>₹{expensePending(exp)}</td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      {expensePending(exp) > 0 && <button onClick={() => { setPayingExp(exp); setPayAmt(expensePending(exp)); setPayMode('Cash'); }} className="mr-2 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer">{t("Pay")}</button>}
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="text-stone-400 hover:text-rose-600 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: GSTR-1 Summary Table */}
      {activeReportTab === 'GSTR1' && (
        <div className="space-y-4">
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">{t("GST Output Tax Summary (GSTR-1)")}</h3>
                <p className="text-xs text-stone-500">{t("Optical Frames (12%), Lenses (12%), Sunglasses (18%), Solutions (5%).")}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 uppercase block">{t("Total Tax Liability:")}</span>
                <span className="text-lg font-bold text-amber-900">
                  ₹{(gstBreakdown.slab12.cgst + gstBreakdown.slab12.sgst + gstBreakdown.slab18.cgst + gstBreakdown.slab18.sgst).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700 border border-stone-200">
                <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-2.5">{t("GST Rate Slab")}</th>
                    <th className="p-2.5 text-right">{t("Taxable Value (₹)")}</th>
                    <th className="p-2.5 text-right">{t("CGST (₹)")}</th>
                    <th className="p-2.5 text-right">{t("SGST (₹)")}</th>
                    <th className="p-2.5 text-right">{t("Total (₹)")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-mono">
                  <tr>
                    <td className="p-2.5 font-bold font-sans text-stone-900">{t("12% GST (Frames & Rx Lenses)")}</td>
                    <td className="p-2.5 text-right text-stone-900">₹{gstBreakdown.slab12.taxable.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab12.cgst.toFixed(2)} (6%)</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab12.sgst.toFixed(2)} (6%)</td>
                    <td className="p-2.5 text-right font-bold text-stone-900">₹{gstBreakdown.slab12.total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold font-sans text-stone-900">{t("18% GST (Sunglasses & Accessories)")}</td>
                    <td className="p-2.5 text-right text-stone-900">₹{gstBreakdown.slab18.taxable.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab18.cgst.toFixed(2)} (9%)</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab18.sgst.toFixed(2)} (9%)</td>
                    <td className="p-2.5 text-right font-bold text-stone-900">₹{gstBreakdown.slab18.total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold font-sans text-stone-900">{t("5% GST (Contact Lens Solutions)")}</td>
                    <td className="p-2.5 text-right text-stone-900">₹{gstBreakdown.slab5.taxable.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab5.cgst.toFixed(2)} (2.5%)</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab5.sgst.toFixed(2)} (2.5%)</td>
                    <td className="p-2.5 text-right font-bold text-stone-900">₹{gstBreakdown.slab5.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {payingExp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Pay pending amount">
          <form
            className="bg-white border border-stone-200 rounded-xl p-5 max-w-sm w-full shadow-xl space-y-3 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              try { payExpense(payingExp.id, payAmt, payMode); setPayingExp(null); }
              catch (err) { alert(err instanceof Error ? err.message : 'Could not record this payment.'); }
            }}
          >
            <h3 className="text-sm font-bold text-stone-900">{t("Pay pending amount")}</h3>
            <p className="text-stone-600">{payingExp.paidTo} · {payingExp.category}<br />{t("Total")} ₹{payingExp.amount} · {t("Paid")} ₹{expensePaid(payingExp)} · <strong className="text-rose-600">{t("Pending")} ₹{expensePending(payingExp)}</strong></p>
            <label className="block text-stone-600">{t("Amount paying now (₹)")}
              <NumberInput type="number" min="1" max={String(expensePending(payingExp))} value={payAmt} onChange={(e) => setPayAmt(Number(e.target.value))} className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-emerald-700 font-bold text-base" />
            </label>
            <label className="block text-stone-600">{t("Payment Mode")}
              <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-800">
                <option value="Cash">{t("Cash (Counter Drawer)")}</option>
                <option value="UPI">{t("UPI / QR")}</option>
                <option value="Bank Transfer">{t("Bank Transfer")}</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button type="button" onClick={() => setPayingExp(null)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg cursor-pointer">{t("Cancel ")}</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer">{t("Record payment")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Expense Voucher Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900">{t("Add Store Expense")}</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">{t("Expense Category *")}</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                >
                  <option value="Tea & Refreshments">{t("Tea & Refreshments")}</option>
                  <option value="Lab Fitting Charges">{t("Lab Fitting Charges")}</option>
                  <option value="Shop Rent">{t("Shop Rent")}</option>
                  <option value="Electricity">{t("Electricity / Utilities")}</option>
                  <option value="Staff Salary">{t("Staff Salary / Advance")}</option>
                  <option value="Packaging & Printing">{t("Packaging & Printing")}</option>
                  <option value="Maintenance">{t("Maintenance")}</option>
                  <option value="Delivery">{t("Delivery")}</option>
                  <option value="Miscellaneous">{t("Miscellaneous")}</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">{t("Total bill amount (₹) *")}</label>
                <NumberInput
                  type="number"
                  required
                  min="1"
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-rose-700 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">{t("Paid now / advance (₹)")}</label>
                <NumberInput
                  type="number"
                  min="0"
                  value={expPaidNow ?? expAmount}
                  onChange={(e) => setExpPaidNow(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-emerald-700 font-bold"
                />
                <p className="text-[11px] mt-1 text-stone-500">{t("Pending balance")}: <strong className="text-rose-600">₹{Math.max(0, expAmount - (expPaidNow ?? expAmount))}</strong></p>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">{t("Paid To / Vendor")}</label>
                <input
                  type="text"
                  required
                  value={expPaidTo}
                  onChange={(e) => setExpPaidTo(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">{t("Payment Mode")}</label>
                <select
                  value={expPayMode}
                  onChange={(e) => setExpPayMode(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                >
                  <option value="Cash">{t("Cash (Counter Drawer)")}</option>
                  <option value="UPI">{t("UPI / QR")}</option>
                  <option value="Bank Transfer">{t("Bank Transfer")}</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">{t("Remarks / Note")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Courier charges")}
                  value={expRemarks}
                  onChange={(e) => setExpRemarks(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                >
                  {t("Cancel ")}</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {t("Save Expense ")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
