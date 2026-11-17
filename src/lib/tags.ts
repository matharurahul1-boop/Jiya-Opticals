import type { Product, ProductCategory } from '../types';
import { catalogKey } from './catalog';

/** A barcode up to this long fits a small tag as it is. Longer SKUs get a short tag code for printing. */
export const SHORT_BARCODE_MAX = 14;

const TAG_PREFIX: Partial<Record<ProductCategory, string>> = {
  'Frames': 'FR', 'Sunglasses': 'SG', 'Eyewear Lens': 'EL', 'Contact Lens': 'CL', 'Goggles Lens': 'GL', 'MPS': 'MP', 'Repair': 'RP',
};
export const tagPrefix = (category: ProductCategory) => TAG_PREFIX[category] || 'IT';

/** Next free short code for a category, like FR00001, FR00002 ... */
export function nextTagCode(products: Product[], category: ProductCategory): string {
  const prefix = tagPrefix(category);
  let max = 0;
  for (const p of products) {
    const m = p.tagCode?.match(/^([A-Z]{2})(\d+)$/);
    if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
  }
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

/**
 * The text a piece's tag code starts with. Short barcodes are used as they are. A long SKU would print as a
 * barcode too dense to scan on a small tag, so the material gets a short code (FR00001) instead; scanning
 * either one finds the same material. A reprint of tags that were printed before the short codes keeps the old
 * base, so those pieces still match; new pieces get the short code (old stickers keep scanning through the barcode).
 *
 * A base that another material (for example another colour of the same model) already uses would make every scan
 * of either one ambiguous, so such a base is never used: the material gets a new, unused short code instead.
 */
export function resolveTagBase(product: Product, products: Product[], reprint = false): { base: string; assign?: string } {
  const key = catalogKey(product);
  const rows = products.filter((p) => catalogKey(p) === key);
  const others = products.filter((p) => catalogKey(p) !== key);
  const free = (code: string) => !others.some((p) => p.barcode === code || p.qrCode === code || p.tagCode === code);
  if (product.barcode.length <= SHORT_BARCODE_MAX && free(product.barcode)) return { base: product.barcode };
  const existing = rows.find((r) => r.tagCode)?.tagCode;
  if (existing && free(existing)) return { base: existing };
  // Only a reprint of tags printed before the short codes keeps the long text on the stickers; new pieces get a short code.
  if (!existing && reprint && rows.some((r) => (r.nextSerial || 1) > 1) && free(product.barcode)) return { base: product.barcode };
  let code = nextTagCode(products, product.category);
  const prefix = code.slice(0, 2);
  for (let n = parseInt(code.slice(2), 10); !free(code); n++) code = `${prefix}${String(n + 1).padStart(5, '0')}`;
  return { base: code, assign: code };
}

export type TagLayout = 'strip' | 'standard';
export interface TagSettings { layout: TagLayout; width: number; height: number; leftMargin: number; /** Gap between labels on the roll, mm (used when printing straight to a TSC printer). */ gap: number; /** Print darkness 1-15 for TSC printers (default 8). */ density?: number }
export const TAG_PRESETS: { id: string; label: string; settings: TagSettings }[] = [
  { id: 'strip', label: 'Frame strip tag (100 × 15 mm)', settings: { layout: 'strip', width: 100, height: 15, leftMargin: 33, gap: 3 } },
  { id: 'strip-long', label: 'Frame strip tag (110 × 17 mm)', settings: { layout: 'strip', width: 110, height: 17, leftMargin: 33, gap: 3 } },
  { id: 'standard', label: 'Standard label (50 × 30 mm)', settings: { layout: 'standard', width: 50, height: 30, leftMargin: 0, gap: 3 } },
];
