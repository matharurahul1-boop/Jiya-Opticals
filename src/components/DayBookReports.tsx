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

export const DayBookReports: React.FC = () => {
  const { 
    invoices, 
    expenses, 
    addExpense, 
    deleteExpense, 
    storeProfile 
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeReportTab, setActiveReportTab] = useState<'DayBook' | 'GSTR1' | 'Expenses'>('DayBook');

  // Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<Expense['category']>('Tea & Refreshments');
  const [expAmount, setExpAmount] = useState<number>(150);
  const [expPaidTo, setExpPaidTo] = useState('Pantry / Local');
  const [expRemarks, setExpRemarks] = useState('');
  const [expPayMode, setExpPayMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');

  // Date filtered Invoices
  const dateInvoices = invoices.filter((i) => i.date === selectedDate);
  const dateExpenses = expenses.filter((e) => e.date === selectedDate);

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
  const totalOutflow = dateExpenses.reduce((sum, e) => sum + e.amount, 0);

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

    addExpense({
      category: expCategory,
      amount: expAmount,
      paidTo: expPaidTo,
      remarks: expRemarks,
      paymentMode: expPayMode
    });

    setShowExpenseModal(false);
    setExpRemarks('');
  };

  const handlePrintDayBook = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Day Book & Reports
            </h1>
            <p className="text-xs text-stone-500">
              Daily collections, store expenses, and GST summaries.
            </p>
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
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
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
          Daily Cash Register
        </button>
        <button
          onClick={() => setActiveReportTab('Expenses')}
          className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'Expenses' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          Expenses ({dateExpenses.length})
        </button>
        <button
          onClick={() => setActiveReportTab('GSTR1')}
          className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'GSTR1' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          GSTR-1 Tax Summary
        </button>
      </div>

      {/* Tab 1: Day Book Cash Tally */}
      {activeReportTab === 'DayBook' && (
        <div className="space-y-6">
          {/* Day Tally Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">Total Inflow</span>
              <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                ₹{totalInflow.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">{dateInvoices.length} Bills Booked</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">UPI / Digital</span>
              <div className="text-xl font-bold text-teal-800 mt-1">₹{totalUpiCollected.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">Bank Inflow</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">Cash Receipts</span>
              <div className="text-xl font-bold text-amber-800 mt-1">₹{totalCashCollected.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">Drawer Cash</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">Expenses Outflow</span>
              <div className="text-xl font-bold text-rose-700 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                ₹{totalOutflow.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-500 mt-0.5 block">{dateExpenses.length} Entries</span>
            </div>
          </div>

          {/* Detailed Invoices on Date */}
          <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase">
                Bills on {selectedDate} ({dateInvoices.length})
              </span>
              <span className="text-xs font-bold text-emerald-700">
                Booked Value: ₹{totalSalesBooked}
              </span>
            </div>

            {dateInvoices.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                No invoices recorded on this date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="p-2">Invoice #</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Items</th>
                      <th className="p-2 text-right">Net (₹)</th>
                      <th className="p-2 text-right">Paid (₹)</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {dateInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-amber-50/40">
                        <td className="p-2 font-mono font-bold text-stone-900">{inv.invoiceNo}</td>
                        <td className="p-2 text-stone-500">{inv.time}</td>
                        <td className="p-2 font-medium text-stone-900">{inv.customerName}</td>
                        <td className="p-2 text-stone-500 truncate max-w-[200px]">
                          {inv.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                        </td>
                        <td className="p-2 text-right font-bold text-stone-900">₹{inv.netPayable}</td>
                        <td className="p-2 text-right font-bold text-emerald-700">₹{inv.advancePaid}</td>
                        <td className="p-2 text-stone-600 font-mono text-[11px]">{inv.paymentMode}</td>
                        <td className="p-2 text-right font-bold text-rose-600">₹{inv.balanceDue}</td>
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
              <span className="text-xs font-bold text-stone-900 uppercase">Store Expenses</span>
              <p className="text-[11px] text-stone-500">Track petty cash, refreshments, fitting charges, and lab payments.</p>
            </div>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Expense
            </button>
          </div>

          <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Paid To</th>
                  <th className="p-2.5">Remarks</th>
                  <th className="p-2.5">Mode</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-amber-50/40">
                    <td className="p-2.5 text-stone-500">{exp.date}</td>
                    <td className="p-2.5 font-bold text-stone-900">{exp.category}</td>
                    <td className="p-2.5 text-stone-700">{exp.paidTo}</td>
                    <td className="p-2.5 text-stone-500">{exp.remarks || '-'}</td>
                    <td className="p-2.5 font-mono text-[11px] text-stone-600">{exp.paymentMode}</td>
                    <td className="p-2.5 text-right font-bold text-rose-600">₹{exp.amount}</td>
                    <td className="p-2.5 text-right">
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
      )}

      {/* Tab 3: GSTR-1 Summary Table */}
      {activeReportTab === 'GSTR1' && (
        <div className="space-y-4">
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">GST Output Tax Summary (GSTR-1)</h3>
                <p className="text-xs text-stone-500">Optical Frames (12%), Lenses (12%), Sunglasses (18%), Solutions (5%).</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 uppercase block">Total Tax Liability:</span>
                <span className="text-lg font-bold text-amber-900">
                  ₹{(gstBreakdown.slab12.cgst + gstBreakdown.slab12.sgst + gstBreakdown.slab18.cgst + gstBreakdown.slab18.sgst).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700 border border-stone-200">
                <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-2.5">GST Rate Slab</th>
                    <th className="p-2.5 text-right">Taxable Value (₹)</th>
                    <th className="p-2.5 text-right">CGST (₹)</th>
                    <th className="p-2.5 text-right">SGST (₹)</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-mono">
                  <tr>
                    <td className="p-2.5 font-bold font-sans text-stone-900">12% GST (Frames & Rx Lenses)</td>
                    <td className="p-2.5 text-right text-stone-900">₹{gstBreakdown.slab12.taxable.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab12.cgst.toFixed(2)} (6%)</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab12.sgst.toFixed(2)} (6%)</td>
                    <td className="p-2.5 text-right font-bold text-stone-900">₹{gstBreakdown.slab12.total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold font-sans text-stone-900">18% GST (Sunglasses & Accessories)</td>
                    <td className="p-2.5 text-right text-stone-900">₹{gstBreakdown.slab18.taxable.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab18.cgst.toFixed(2)} (9%)</td>
                    <td className="p-2.5 text-right text-stone-700">₹{gstBreakdown.slab18.sgst.toFixed(2)} (9%)</td>
                    <td className="p-2.5 text-right font-bold text-stone-900">₹{gstBreakdown.slab18.total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold font-sans text-stone-900">5% GST (Contact Lens Solutions)</td>
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

      {/* Add Expense Voucher Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900">Add Store Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">Expense Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                >
                  <option value="Tea & Refreshments">Tea & Refreshments</option>
                  <option value="Lab Fitting Charges">Lab Fitting Charges</option>
                  <option value="Shop Rent">Shop Rent</option>
                  <option value="Electricity">Electricity / Utilities</option>
                  <option value="Staff Salary">Staff Salary / Advance</option>
                  <option value="Packaging & Printing">Packaging & Printing</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Expense Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-rose-700 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Paid To / Vendor</label>
                <input
                  type="text"
                  required
                  value={expPaidTo}
                  onChange={(e) => setExpPaidTo(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Payment Mode</label>
                <select
                  value={expPayMode}
                  onChange={(e) => setExpPayMode(e.target.value as any)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                >
                  <option value="Cash">Cash (Counter Drawer)</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Courier charges"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
