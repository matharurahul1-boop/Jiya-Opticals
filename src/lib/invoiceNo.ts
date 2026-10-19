/** Invoice numbers look like JO/26-27/C1/001: company code / financial year / branch / running number. */

/** Indian financial year, 1 April to 31 March: 15 Oct 2026 and 20 Feb 2027 are both "26-27". */
export function financialYear(date: Date): string {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(start % 100).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Letters printed first on every bill: the store's own code, or the initials of its name ("Jiya Opticals" -> "JO"). */
export function companyCode(storeName: string, override?: string): string {
  const own = (override || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (own) return own;
  const initials = storeName.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, 4);
  return initials || 'INV';
}

/** Branch part from the shop name: "Centre 1" -> "C1", "Centre 2 (Gurugram)" -> "C2", "Main Branch" -> "MB". */
export function branchCode(shopName: string): string {
  const base = shopName.split(' - ')[0].split('(')[0];
  const words = base.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const letters = words.filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0].toUpperCase()).join('');
  const numbers = words.filter((w) => /^\d+$/.test(w)).join('');
  return (letters + numbers).slice(0, 6) || 'S';
}

export function invoiceNoPrefix(opts: { storeName: string; invoiceCode?: string; shopName: string; date: Date }): string {
  return `${companyCode(opts.storeName, opts.invoiceCode)}/${financialYear(opts.date)}/${branchCode(opts.shopName)}/`;
}

/** The next free number for this company, financial year and branch: numbering restarts at 001 each 1 April. */
export function nextInvoiceNo(prefix: string, existing: { invoiceNo: string }[]): string {
  let max = 0;
  for (const inv of existing) {
    if (!inv.invoiceNo.startsWith(prefix)) continue;
    const tail = inv.invoiceNo.slice(prefix.length);
    if (/^\d+$/.test(tail)) max = Math.max(max, parseInt(tail, 10));
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}
