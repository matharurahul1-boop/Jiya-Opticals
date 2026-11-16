import type { TagLayout } from './tags';

/** TSC printers (TTP-244 Pro and others) print 203 dots per inch: 8 dots per millimetre. */
const DOTS_PER_MM = 8;
const mm = (v: number) => Math.round(v * DOTS_PER_MM);

export interface TsplLabel { brand: string; model: string; detail: string; shop: string; mrp: number; code: string }
export interface TsplOptions { layout: TagLayout; width: number; height: number; gap: number; leftMargin: number; /** Print darkness 1-15 (the printer's default scale). */ density?: number; labels: TsplLabel[] }

// TSPL text must be plain ASCII and cannot hold a double quote.
const clean = (s: string, max: number) => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, "'").trim().slice(0, max);

/** Number of Code 128 modules (bars/spaces units) for a code printed as subset B. */
const modules = (code: string) => (code.length + 2) * 11 + 13;

/**
 * Commands for a TSC label printer, one label per tag. The file can be sent straight to the printer, so the
 * label size, gap and barcode are set by the printer itself and the Windows driver's paper size does not matter.
 */
export function buildTspl(o: TsplOptions): string {
  const W = mm(o.width);
  const H = mm(o.height);
  const out: string[] = [
    `SIZE ${o.width} mm,${o.height} mm`,
    `GAP ${o.gap} mm,0 mm`,
    'DIRECTION 1',
    'REFERENCE 0,0',
    // Slow printing keeps thin bars crisp; darkness can be tuned to the label stock.
    'SPEED 2',
    `DENSITY ${Math.min(15, Math.max(1, Math.round(o.density ?? 8)))}`,
  ];
  for (const l of o.labels) {
    out.push('CLS');
    if (o.layout === 'strip') {
      const xLeft = mm(o.leftMargin);
      // Row 1: brand, model and MRP. Row 2: the barcode, as wide as the tag allows (3-dot bars scan far more easily than 2-dot).
      // Row 3: the code's own text and the colour/size. 5 mm stay empty at the right edge, and the empty tail is the barcode's left clear zone.
      const xBar = xLeft >= mm(4) ? xLeft : xLeft + mm(3);
      const avail = W - mm(5) - xBar;
      const narrow = [3, 2].find((n) => modules(l.code) * n <= avail) ?? 1;
      const top = Math.max(2, Math.round(H * 0.05));
      const mrpText = `MRP. ${Math.round(l.mrp)}`;
      const mrpX = W - mm(5) - mrpText.length * 16;
      const brandText = clean(l.brand.toUpperCase(), 12);
      const modelX = xLeft + (brandText.length + 1) * 16;
      const modelChars = Math.floor((mrpX - modelX - mm(2)) / 12);
      const barY = top + 32;
      const barH = Math.max(24, H - barY - 34);
      out.push(`TEXT ${xLeft},${top},"3",0,1,1,"${brandText}"`);
      if (modelChars >= 4) out.push(`TEXT ${modelX},${top + 4},"2",0,1,1,"${clean(l.model, modelChars)}"`);
      out.push(`TEXT ${mrpX},${top},"3",0,1,1,"${mrpText}"`);
      out.push(`BARCODE ${xBar},${barY},"128",${barH},1,0,${narrow},${narrow},"${clean(l.code, 40)}"`);
      const detailX = xBar + l.code.length * 16 + mm(3);
      const detailChars = Math.floor((W - mm(5) - detailX) / 12);
      if (l.detail && detailChars >= 4) out.push(`TEXT ${detailX},${barY + barH + 6},"2",0,1,1,"${clean(l.detail.replace(/\s+/g, ' '), detailChars)}"`);
    } else {
      const narrow = modules(l.code) * 2 <= W - mm(4) ? 2 : 1;
      const barW = modules(l.code) * narrow;
      const barX = Math.max(mm(2), Math.round((W - barW) / 2));
      out.push(`TEXT ${mm(2)},${mm(1.5)},"1",0,1,1,"${clean(l.shop.toUpperCase(), 30)}"`);
      out.push(`TEXT ${mm(2)},${mm(4.5)},"2",0,1,1,"${clean(`${l.brand} ${l.model}`, Math.floor((W - mm(4)) / 12))}"`);
      out.push(`BARCODE ${barX},${mm(9)},"128",${Math.max(24, H - mm(9) - 56)},1,0,${narrow},${narrow},"${clean(l.code, 40)}"`);
      out.push(`TEXT ${mm(2)},${H - mm(4.5)},"3",0,1,1,"MRP ${Math.round(l.mrp)}"`);
    }
    out.push('PRINT 1,1');
  }
  return out.join('\r\n') + '\r\n';
}
