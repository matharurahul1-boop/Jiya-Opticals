import { t } from '../lib/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Tag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { catalogKey } from '../lib/catalog';
import { unitCode } from '../lib/barcodes';
import { code128Svg } from '../lib/code128';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Shop-floor tag sheet: one label per physical piece, each with its own scannable Code 128 code. */
export const BarcodePrintModal: React.FC = () => {
  const { selectedProductForBarcode: product, setSelectedProductForBarcode, storeProfile, allProducts, reserveTagSerials } = useApp();
  const [count, setCount] = useState(1);
  const [start, setStart] = useState(1);
  const [labelWidth, setLabelWidth] = useState(50);
  const [labelHeight, setLabelHeight] = useState(30);

  const nextFree = useMemo(() => {
    if (!product) return 1;
    const key = catalogKey(product);
    return Math.max(1, ...allProducts.filter(p => catalogKey(p) === key).map(p => p.nextSerial || 1));
  }, [product, allProducts]);

  // One tag per piece in stock by default; new pieces continue after the last printed serial.
  useEffect(() => {
    if (!product) return;
    setCount(Math.min(200, Math.max(1, product.stockQty || 1)));
    setStart(nextFree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const tags = Array.from({ length: count }, (_, i) => unitCode(product.barcode, start + i));
  const price = product.mrp || product.salePrice;
  const title = [`${product.brand} ${product.modelNo}`.trim() || product.name, product.color && product.color.trim() ? `Colour ${product.color.trim()}` : ''].filter(Boolean).join(' · ');
  let barcodeOk = true;
  try { code128Svg(tags[0]); } catch { barcodeOk = false; }

  const handlePrint = () => {
    if (!barcodeOk) return;
    // Only advance the counter when printing new serials (not for a reprint of old ones).
    if (start + count > nextFree) reserveTagSerials(product.id, count, start);
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
    frame.title = 'Tag print';
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) { frame.remove(); return; }
      win.onafterprint = () => frame.remove();
      win.focus(); win.print();
      window.setTimeout(() => frame.remove(), 120000);
    };
    const labels = tags.map(code => `<div class="label"><p class="shop">${escapeHtml(storeProfile.name)}</p><p class="name">${escapeHtml(title)}</p><div class="bars">${code128Svg(code, 40)}</div><p class="code">${escapeHtml(code)}</p><p class="mrp">MRP &#8377;${price}</p></div>`).join('');
    frame.srcdoc = `<!doctype html><html><head><title>Tags</title><style>@page{size:${labelWidth}mm ${labelHeight}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.label{width:${labelWidth}mm;height:${labelHeight}mm;padding:1.5mm 2mm;text-align:center;break-after:page;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}.label:last-child{break-after:auto}p{margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shop{font-size:6pt;font-weight:bold;text-transform:uppercase}.name{font-size:7pt}.bars{flex:1;min-height:0;margin:.5mm 0}.bars svg{display:block;width:100%;height:100%}.code{font:7pt monospace;letter-spacing:.3px}.mrp{font-size:8pt;font-weight:bold}</style></head><body>${labels}</body></html>`;
    document.body.appendChild(frame);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 flex-wrap no-print shrink-0">
          <span className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
            <Tag className="w-4 h-4 text-amber-600" />
            {t("Item Tags (one barcode per piece)")}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={!barcodeOk} className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Printer className="w-3.5 h-3.5" />
              {t("Print Tags")}
            </button>
            <button onClick={() => setSelectedProductForBarcode(null)} aria-label={t("Close")} className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 text-xs bg-amber-50 space-y-2 no-print">
          <p>{t("Every piece gets its own code. Stick the tag on the piece; scanning it in Billing adds that exact piece to the bill (and it cannot be sold twice), and scanning it in Inventory shows the material details.")}</p>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-0.5">{t("Pieces / tags")}<input type="number" min="1" max="200" className="border rounded px-2 py-1 w-20" value={count} onChange={e => setCount(Math.min(200, Math.max(1, Math.floor(Number(e.target.value) || 1))))} /></label>
            <label className="flex flex-col gap-0.5">{t("Start serial")}<input type="number" min="1" className="border rounded px-2 py-1 w-20" value={start} onChange={e => setStart(Math.max(1, Math.floor(Number(e.target.value) || 1)))} /></label>
            <label className="flex flex-col gap-0.5">{t("Width (mm)")}<input type="number" min="25" max="110" className="border rounded px-2 py-1 w-20" value={labelWidth} onChange={e => setLabelWidth(Math.min(110, Math.max(25, Number(e.target.value) || 50)))} /></label>
            <label className="flex flex-col gap-0.5">{t("Height (mm)")}<input type="number" min="20" max="150" className="border rounded px-2 py-1 w-20" value={labelHeight} onChange={e => setLabelHeight(Math.min(150, Math.max(20, Number(e.target.value) || 30)))} /></label>
          </div>
          <p className="text-stone-500">{t("Codes")}: {tags[0]}{tags.length > 1 ? ` … ${tags[tags.length - 1]}` : ''}{start < nextFree ? ` · ${t("reprint of earlier tags")}` : ''}</p>
          {barcodeOk && tags[tags.length - 1].length > 30 && labelWidth < 70 && <p role="status" className="text-amber-800">{t("This code is long. For a reliable scan use a wider label (70 mm or more) or shorten the SKU.")}</p>}
          {!barcodeOk && <p role="alert" className="text-red-700">{t("This barcode has characters that cannot be printed as a tag. Edit the material's barcode.")}</p>}
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-stone-100 text-stone-900 printable-area">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {barcodeOk && tags.slice(0, 60).map(code => (
              <div key={code} className="bg-white border-2 border-stone-300 rounded-md p-2 text-center shadow-xs flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase text-stone-600 truncate">{storeProfile.name}</span>
                <span className="text-[11px] text-stone-800 truncate">{title}</span>
                <div className="h-14 w-full" dangerouslySetInnerHTML={{ __html: code128Svg(code, 40).replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
                <span className="font-mono text-[10px] tracking-wide">{code}</span>
                <span className="text-xs font-bold">MRP ₹{price}</span>
              </div>
            ))}
          </div>
          {tags.length > 60 && <p className="text-center text-xs text-stone-500 mt-3">{t("Preview shows the first 60 tags; all will print.")}</p>}
        </div>
      </div>
    </div>
  );
};
