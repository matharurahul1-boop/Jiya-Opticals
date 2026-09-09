import type { Product } from '../types';

// Keep leading zeroes and letter case. Never parse QR text as a URL or number.
export function findScannedProduct(products: Product[], raw: string): Product | undefined {
  const code = raw.trim();
  if (!code) return undefined;
  const matches = products.filter(p => p.barcode === code || p.qrCode === code);
  return matches.length === 1 ? matches[0] : undefined;
}
