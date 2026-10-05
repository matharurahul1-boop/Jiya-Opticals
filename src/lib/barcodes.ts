import type { Product } from '../types';

/** One physical piece of a material: base barcode plus a 3+ digit serial, e.g. 890180663928-007. */
export const unitCode = (barcode: string, serial: number) => `${barcode}-${String(serial).padStart(3, '0')}`;

export function splitUnitCode(raw: string): { base: string; serial: number } | undefined {
  const m = raw.trim().match(/^(.+)-(\d{3,})$/);
  return m ? { base: m[1], serial: Number(m[2]) } : undefined;
}

function matchBase(products: Product[], code: string): Product | undefined {
  const matches = products.filter(p => p.barcode === code || p.qrCode === code);
  return matches.length === 1 ? matches[0] : undefined;
}

// Keep leading zeroes and letter case. Never parse QR text as a URL or number.
// A per-piece tag code (barcode-serial) resolves to its material.
export function findScannedProduct(products: Product[], raw: string): Product | undefined {
  const code = raw.trim();
  if (!code) return undefined;
  const direct = matchBase(products, code);
  if (direct) return direct;
  const unit = splitUnitCode(code);
  return unit ? matchBase(products, unit.base) : undefined;
}

/** The scanned code when it identifies one specific piece, otherwise undefined. */
export function scannedUnitCode(products: Product[], raw: string): string | undefined {
  const code = raw.trim();
  if (matchBase(products, code)) return undefined;
  const unit = splitUnitCode(code);
  return unit && matchBase(products, unit.base) ? code : undefined;
}
