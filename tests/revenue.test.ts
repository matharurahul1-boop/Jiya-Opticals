import assert from 'node:assert/strict';
import test from 'node:test';
import { monthlyRevenue } from '../src/lib/revenue';
import type { Invoice, PaymentReceipt } from '../src/types';

test('collections use receipt month, branches stay separate, cancelled revenue is excluded', () => {
  const invoices = [
    { id: 'one', shopId: 'a', date: '2026-01-05', netPayable: 1000, advancePaid: 700, balanceDue: 300, orderStatus: 'Order Booked' },
    { id: 'two', shopId: 'b', date: '2026-02-05', netPayable: 500, advancePaid: 100, balanceDue: 400, orderStatus: 'Order Booked' },
    { id: 'cancel', shopId: 'a', date: '2026-02-01', netPayable: 900, advancePaid: 0, balanceDue: 900, orderStatus: 'Cancelled' },
  ] as Invoice[];
  const payments = [
    { invoiceId: 'one', shopId: 'a', date: '2026-01-05', amount: 200 },
    { invoiceId: 'one', shopId: 'a', date: '2026-02-10', amount: 500 },
    { invoiceId: 'two', shopId: 'b', date: '2026-02-05', amount: 100 },
  ] as PaymentReceipt[];
  const single = monthlyRevenue(invoices, payments, 2026, 'a');
  assert.equal(single.rows[0].revenue, 1000);
  assert.equal(single.rows[0].received, 200);
  assert.equal(single.rows[0].pending, 300);
  assert.equal(single.rows[1].revenue, 0);
  assert.equal(single.rows[1].received, 500);
  assert.equal(single.undatedReceived, 0);
  const combined = monthlyRevenue(invoices, payments, 2026);
  assert.equal(combined.rows[1].received, 600);
  assert.equal(combined.rows[1].pending, 400);
  assert.equal(monthlyRevenue(invoices, payments, 2025).rows.reduce((n, r) => n + r.revenue, 0), 0);
});

test('legacy paid amounts are not assigned fictitious collection dates', () => {
  const invoices = [{ id: 'old', shopId: 'a', date: '2026-01-01', netPayable: 100, advancePaid: 60, balanceDue: 40, orderStatus: 'Direct Sale' }] as Invoice[];
  const result = monthlyRevenue(invoices, [], 2026);
  assert.equal(result.undatedReceived, 60);
  assert.equal(result.rows[0].received, 0);
  assert.equal(result.rows[0].pending, 40);
  assert.equal(monthlyRevenue([], [], 2026).rows.length, 12);
});
