import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExpensePayment, expensePaid, expensePending, paidOnDate } from '../src/lib/expenses';
import type { Expense } from '../src/types';

const base: Expense = { id: 'e1', date: '2026-10-10', category: 'Lab Fitting Charges', amount: 5000, paymentMode: 'Cash', paidTo: 'Lab' };

test('old fully-paid expenses stay fully paid', () => {
  assert.equal(expensePaid(base), 5000);
  assert.equal(expensePending(base), 0);
  assert.equal(paidOnDate(base, '2026-10-10'), 5000);
  assert.equal(paidOnDate(base, '2026-10-11'), 0);
});

test('advance, pending balance and later payments are tracked by date', () => {
  const advance: Expense = { ...base, paidAmount: 2000, payments: [{ id: 'a', date: '2026-10-10', amount: 2000, mode: 'Cash' }] };
  assert.equal(expensePending(advance), 3000);
  const later = applyExpensePayment(advance, 1000, 'UPI', '2026-10-15');
  assert.equal(expensePaid(later), 3000);
  assert.equal(expensePending(later), 2000);
  assert.equal(paidOnDate(later, '2026-10-10'), 2000);
  assert.equal(paidOnDate(later, '2026-10-15'), 1000);
  assert.equal(paidOnDate(later, '2026-10-15', 'Cash'), 0);
  assert.throws(() => applyExpensePayment(later, 2500, 'Cash', '2026-10-16'), /Only/);
  assert.throws(() => applyExpensePayment(later, 0, 'Cash', '2026-10-16'), /greater than zero/);
});

test('paying a legacy entry keeps its original payment on the original date', () => {
  const part: Expense = { ...base, paidAmount: 1500 };
  const next = applyExpensePayment(part, 500, 'Cash', '2026-10-20');
  assert.equal(paidOnDate(next, '2026-10-10'), 1500);
  assert.equal(paidOnDate(next, '2026-10-20'), 500);
  assert.equal(expensePending(next), 3000);
});
