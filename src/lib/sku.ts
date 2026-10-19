const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Start of every generated SKU: the first word of the store name ("Jiya Opticals" -> "JIYA"). */
export const skuPrefix = (storeName: string) => clean(storeName.split(/\s+/)[0] || '').slice(0, 8) || 'ITEM';

/** Numeric placeholder codes made by older versions of the form (890 + 9 digits). */
export const isPlaceholderSku = (code: string) => /^890\d{9}$/.test(code.trim());

/**
 * One consistent SKU style for every material, same as the catalogue items:
 * JIYA-FRAMES-ARMANI-2232-C1, JIYA-CONTACT-LENS-ALCON-AIR-OPTIX-M1499.
 * A contact lens with several MRPs gets the MRP at the end, so each price stays a separate, scannable item.
 */
export function suggestSku(
  m: { prefix: string; category: string; brand: string; modelNo: string; name: string; color: string; mrp?: number },
  taken: Iterable<string> = []
): string {
  const isContact = m.category === 'Contact Lens';
  const model = clean(m.modelNo).slice(0, 14);
  const parts = [
    m.prefix,
    clean(m.category),
    clean(m.brand).slice(0, 14),
    model || clean(m.name).slice(0, 16),
    isContact ? '' : clean(m.color).slice(0, 14),
    isContact && m.mrp && m.mrp > 0 ? `M${Math.round(m.mrp)}` : '',
  ].filter(Boolean);
  const base = parts.join('-');
  const used = new Set(Array.from(taken, (c) => c.toUpperCase()));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
