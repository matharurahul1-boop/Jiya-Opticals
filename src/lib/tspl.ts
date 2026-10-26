import type { TagLayout } from './tags';

/** TSC printers (TTP-244 Pro and others) print 203 dots per inch: 8 dots per millimetre. */
const DOTS_PER_MM = 8;
const mm = (v: number) => Math.round(v * DOTS_PER_MM);

export interface TsplLabel { brand: string; model: string; detail: string; shop: string; mrp: number; code: string }
export interface TsplOptions { layout: TagLayout; width: number; height: number; gap: number; leftMargin: number; labels: TsplLabel[] }

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
    'SPEED 4',
    'DENSITY 8',
  ];
  for (const l of o.labels) {
    out.push('CLS');
    if (o.layout === 'strip') {
      const xLeft = mm(o.leftMargin);
      const xRight = mm(o.leftMargin + 0.46 * (o.width - o.leftMargin - 2) + 2.5);
      const room = W - mm(2) - xRight;
      const leftChars = Math.max(6, Math.floor((xRight - xLeft - mm(2)) / 16));
      const top = Math.max(4, Math.round((H - 84) / 2));
      out.push(`TEXT ${xLeft},${top},"3",0,1,1,"${clean(l.brand.toUpperCase(), leftChars)}"`);
      out.push(`TEXT ${xLeft},${top + 32},"2",0,1,1,"${clean(l.model, Math.floor((xRight - xLeft - mm(2)) / 12))}"`);
      if (l.detail) out.push(`TEXT ${xLeft},${top + 60},"2",0,1,1,"${clean(l.detail.replace(/\s+/g, ' '), Math.floor((xRight - xLeft - mm(2)) / 12))}"`);
      const mrpY = Math.max(2, Math.round((H - 100) / 2));
      const narrow = modules(l.code) * 2 <= room ? 2 : 1;
      const barH = Math.max(24, H - (mrpY + 30) - 30);
      out.push(`TEXT ${xRight},${mrpY},"3",0,1,1,"MRP. ${Math.round(l.mrp)}"`);
      out.push(`BARCODE ${xRight},${mrpY + 30},"128",${barH},1,0,${narrow},${narrow},"${clean(l.code, 40)}"`);
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
