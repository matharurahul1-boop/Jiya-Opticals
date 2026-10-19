import type { Expense } from '../types';

/** What has been paid so far. Expenses saved before part-payments existed were paid in full. */
export const expensePaid = (e: Expense): number => Math.min(e.amount, e.paidAmount ?? e.amount);
export const expensePending = (e: Expense): number => Math.max(0, e.amount - expensePaid(e));

/** Money that actually went out on one date: each payment on that day (legacy entries count on their own date). */
export function paidOnDate(e: Expense, date: string, mode?: Expense['paymentMode']): number {
  if (e.payments?.length) {
    return e.payments.filter((p) => p.date === date && (!mode || p.mode === mode)).reduce((s, p) => s + p.amount, 0);
  }
  return e.date === date && (!mode || e.paymentMode === mode) ? expensePaid(e) : 0;
}

/** Record a payment against an expense; never pays more than what is pending. */
export function applyExpensePayment(e: Expense, amount: number, mode: Expense['paymentMode'], date: string): Expense {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.');
  const pending = expensePending(e);
  if (amount > pending) throw new Error(`Only ₹${pending} is pending on this entry.`);
  const history = e.payments?.length ? e.payments : (expensePaid(e) > 0 ? [{ id: `${e.id}-p0`, date: e.date, amount: expensePaid(e), mode: e.paymentMode }] : []);
  return { ...e, paidAmount: expensePaid(e) + amount, payments: [...history, { id: `${e.id}-p${history.length + 1}`, date, amount, mode }] };
}
