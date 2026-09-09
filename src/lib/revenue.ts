import type { Invoice, PaymentReceipt } from '../types';

export function monthlyRevenue(invoices: Invoice[], payments: PaymentReceipt[], year: number, shopId = 'all') {
  const rows = Array.from({ length: 12 }, (_, month) => ({
    month: new Date(year, month, 1).toLocaleString('en-IN', { month: 'short' }),
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    revenue: 0, received: 0, pending: 0,
  }));
  const visibleInvoices = invoices.filter(i => (shopId === 'all' || i.shopId === shopId) && i.orderStatus !== 'Cancelled');
  for (const invoice of visibleInvoices) {
    const row = rows.find(r => r.key === invoice.date.slice(0, 7));
    if (row) { row.revenue += invoice.netPayable; row.pending += Math.max(0, invoice.balanceDue); }
  }
  for (const payment of payments) {
    if (shopId !== 'all' && payment.shopId !== shopId) continue;
    const row = rows.find(r => r.key === payment.date.slice(0, 7));
    if (row) row.received += payment.amount;
  }
  // Existing paid invoices lack receipt dates. Do not invent historical cash-flow dates.
  const undatedReceived = visibleInvoices.reduce((sum, invoice) => sum + Math.max(0,
    invoice.advancePaid - payments.filter(p => p.invoiceId === invoice.id).reduce((n, p) => n + p.amount, 0)), 0);
  return { rows, undatedReceived };
}
