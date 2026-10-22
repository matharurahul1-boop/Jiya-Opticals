export type RoundMode = 'exact' | 10 | 50 | 100 | 'custom';

/**
 * Amount the customer pays. "exact" is the usual rounding to the nearest rupee; 10 / 50 / 100 round DOWN
 * to that multiple (the shop gives up the small remainder); "custom" is a final amount typed by hand,
 * which can never be above the exact bill.
 */
export function finalAmount(raw: number, mode: RoundMode, custom = 0): number {
  const exact = Math.max(0, Math.round(raw));
  if (mode === 'exact') return exact;
  if (mode === 'custom') return Math.max(0, Math.min(exact, Math.floor(Number(custom) || 0)));
  return Math.max(0, Math.floor(raw / mode) * mode);
}
