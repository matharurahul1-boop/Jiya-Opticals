import { t } from '../lib/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Tag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { catalogKey } from '../lib/catalog';
import { unitCode } from '../lib/barcodes';
import { code128Svg } from '../lib/code128';
import { resolveTagBase, TAG_PRESETS, TagSettings } from '../lib/tags';
import { buildTspl } from '../lib/tspl';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const SETTINGS_KEY = 'JIYA_TAG_SETTINGS_V2';

const loadSettings = (): TagSettings => {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (raw && (raw.layout === 'strip' || raw.layout === 'standard') && raw.width >= 20 && raw.height >= 8) return { gap: 3, ...raw } as TagSettings;
  } catch { /* storage may be unavailable */ }
  return TAG_PRESETS[0].settings;
};

/** Shop-floor tags: one label per physical piece, each with its own scannable Code 128 code. */
export const BarcodePrintModal: React.FC = () => {
  const { selectedProductForBarcode: product, setSelectedProductForBarcode, storeProfile, allProducts, reserveTagSerials, ensureTagCode } = useApp();
  const [count, setCount] = useState(1);
  const [start, setStart] = useState(1);
  const [settings, setSettings] = useState<TagSettings>(loadSettings);

  const update = (patch: Partial<TagSettings>) => setSettings((prev) => {
    const next = { ...prev, ...patch };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

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

  const { base, assign } = resolveTagBase(product, allProducts);
  const tags = Array.from({ length: count }, (_, i) => unitCode(base, start + i));
  const price = product.mrp || product.salePrice;
  const brand = (product.brand || product.name || '').toUpperCase();
  const model = (product.modelNo || (product.brand ? product.name : '') || '').trim();
  const detail = [product.color, product.size].map((x) => (x || '').trim()).filter(Boolean).join('   ')
    || (product.category === 'Contact Lens' ? [product.baseCurve && `BC ${product.baseCurve}`, product.expiry && `EXP ${product.expiry}`].filter(Boolean).join('  ') : '');
  const { layout, width, height, leftMargin, gap } = settings;
  let barcodeOk = true;
  try { code128Svg(tags[0]); } catch { barcodeOk = false; }

  // The codes are now in use: give the material its short code and move the serial counter on (not for a reprint).
  const commitTags = () => {
    if (assign) ensureTagCode(product.id, assign);
    if (start + count > nextFree) reserveTagSerials(product.id, count, start);
  };

  // A file in the printer's own language (TSPL) for TSC printers: sent straight to the printer, it needs no driver paper size.
  const handleDownloadTsc = () => {
    if (!barcodeOk) return;
    commitTags();
    const text = buildTspl({ layout, width, height, gap, leftMargin, labels: tags.map((code) => ({ brand: product.brand || product.name, model, detail, shop: storeProfile.name, mrp: price, code })) });
    const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tags-${base.replace(/[^A-Za-z0-9_-]+/g, '-')}.prn`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handlePrint = () => {
    if (!barcodeOk) return;
    commitTags();
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
    // A page a hair shorter than the label stops the printer from pushing a blank label out after every tag.
    const pageH = Math.max(5, height - 0.4);
    const labels = layout === 'strip'
      ? tags.map(code => `<div class="label"><div class="left"><p class="brand">${escapeHtml(brand)}</p><p class="model">${escapeHtml(model)}</p><p class="detail">${escapeHtml(detail)}</p></div><div class="right"><p class="mrp">MRP. ${price}</p><div class="bars">${code128Svg(code, 40)}</div><p class="code">${escapeHtml(code)}</p></div></div>`).join('')
      : tags.map(code => `<div class="label std"><p class="shop">${escapeHtml(storeProfile.name)}</p><p class="name">${escapeHtml([`${product.brand} ${product.modelNo}`.trim() || product.name, product.color?.trim() ? `Colour ${product.color.trim()}` : ''].filter(Boolean).join(' · '))}</p><div class="bars">${code128Svg(code, 40)}</div><p class="code">${escapeHtml(code)}</p><p class="mrp">MRP &#8377;${price}</p></div>`).join('');
    const css = `@page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,Helvetica,sans-serif;color:#000}p{margin:0;white-space:nowrap;overflow:hidden}.label{width:${width}mm;height:${pageH}mm;overflow:hidden;break-after:page;page-break-after:always;break-inside:avoid}.label:last-child{break-after:auto;page-break-after:auto}.bars svg{display:block;width:100%;height:100%}`
      + (layout === 'strip'
        ? `.label{display:flex;align-items:stretch;padding:0.8mm 2mm 0.8mm ${leftMargin}mm;gap:2.5mm}.left{flex:0 0 46%;display:flex;flex-direction:column;justify-content:center;gap:.6mm}.right{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}.brand{font-size:8.5pt;font-weight:bold;letter-spacing:.2px}.model{font-size:8.5pt}.detail{font-size:8pt;font-family:'Courier New',monospace;white-space:pre}.mrp{font-size:8.5pt;font-weight:bold;font-family:'Courier New',monospace}.right .bars{flex:1;min-height:0;margin:.4mm 0}.code{font:7pt 'Courier New',monospace}`
        : `.std{padding:1.5mm 2mm;text-align:center;display:flex;flex-direction:column;justify-content:space-between}.shop{font-size:6pt;font-weight:bold;text-transform:uppercase}.name{font-size:7pt}.std .bars{flex:1;min-height:0;margin:.5mm 0}.code{font:7pt monospace;letter-spacing:.3px}.mrp{font-size:8pt;font-weight:bold}`);
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>Tags</title><style>${css}</style></head><body>${labels}</body></html>`;
    document.body.appendChild(frame);
  };

  const num = (value: string, min: number, max: number, fallback: number) => Math.min(max, Math.max(min, Number(value) || fallback));
  const longCode = barcodeOk && tags[tags.length - 1].length > 16 && width < 70;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 flex-wrap no-print shrink-0">
          <span className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
            <Tag className="w-4 h-4 text-amber-600" />
            {t("Item Tags (one barcode per piece)")}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadTsc} disabled={!barcodeOk} className="px-3 py-1.5 bg-white border border-amber-500 hover:bg-amber-50 disabled:opacity-50 text-amber-900 rounded-lg text-xs font-bold shadow-xs" title={t("For TSC label printers (TTP-244 Pro and others): a file you send straight to the printer")}>
              {t("TSC file (.prn)")}
            </button>
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
            <label className="flex flex-col gap-0.5">{t("Tag type")}
              <select className="border rounded px-2 py-1 bg-white" value={TAG_PRESETS.find(p => p.settings.layout === layout && p.settings.width === width && p.settings.height === height)?.id || 'custom'} onChange={e => { const p = TAG_PRESETS.find(x => x.id === e.target.value); if (p) update(p.settings); }}>
                {TAG_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                <option value="custom">{t("Custom size")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-0.5">{t("Width (mm)")}<input type="number" min="20" max="150" className="border rounded px-2 py-1 w-20" value={width} onChange={e => update({ width: num(e.target.value, 20, 150, 100) })} /></label>
            <label className="flex flex-col gap-0.5">{t("Height (mm)")}<input type="number" min="8" max="150" className="border rounded px-2 py-1 w-20" value={height} onChange={e => update({ height: num(e.target.value, 8, 150, 15) })} /></label>
            {layout === 'strip' && <label className="flex flex-col gap-0.5">{t("Left gap for tail (mm)")}<input type="number" min="0" max="40" className="border rounded px-2 py-1 w-20" value={leftMargin} onChange={e => update({ leftMargin: num(e.target.value, 0, 40, 10) })} /></label>}
          </div>
          <p className="text-stone-500">{t("Codes")}: {tags[0]}{tags.length > 1 ? ` … ${tags[tags.length - 1]}` : ''}{start < nextFree ? ` · ${t("reprint of earlier tags")}` : ''}</p>
          <p className="text-stone-600">{t("In the print window choose your label printer and set its paper size to")} <strong>{width} × {height} mm</strong>, {t("margins None, scale 100%. Print one tag first to check it.")}</p>
          <details className="text-stone-600">
            <summary className="cursor-pointer font-semibold text-amber-900">{t("TSC printer (TTP-244 Pro): print straight to the printer")}</summary>
            <div className="mt-1.5 space-y-1.5">
              <label className="flex items-center gap-2">{t("Gap between labels (mm)")}<input type="number" min="0" max="10" step="0.5" className="border rounded px-2 py-1 w-16" value={gap} onChange={e => update({ gap: Math.min(10, Math.max(0, Number(e.target.value) || 0)) })} /></label>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>{t('Click "TSC file (.prn)". A file such as tags-FR00001.prn is saved.')}</li>
                <li>{t('Open TSC Diagnostic Tool (free from tscprinters.com), pick your printer, go to "Command Tool", choose "Load File", select the .prn file and press Send.')}</li>
                <li>{t('Or, if the printer is shared as TSC, run this in Command Prompt:')} <code className="bg-white border rounded px-1">copy /b tags-FR00001.prn \\localhost\TSC</code></li>
              </ol>
              <p>{t("The label size, gap and barcode are set by the file, so the Windows paper size does not matter. If labels drift, run the printer's gap calibration once.")}</p>
            </div>
          </details>
          {longCode && <p role="status" className="text-amber-800">{t("This code is long for a small tag. Use a wider label (70 mm or more) for a reliable scan.")}</p>}
          {!barcodeOk && <p role="alert" className="text-red-700">{t("This barcode has characters that cannot be printed as a tag. Edit the material's barcode.")}</p>}
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-stone-100 text-stone-900 printable-area">
          {layout === 'strip' ? (
            <div className="space-y-2 overflow-x-auto">
              {barcodeOk && tags.slice(0, 30).map(code => (
                <div key={code} className="bg-white border border-stone-300 rounded-sm shadow-xs flex items-stretch gap-[2.5mm] overflow-hidden" style={{ width: `${width}mm`, height: `${height}mm`, padding: `0.8mm 2mm 0.8mm ${leftMargin}mm`, boxSizing: 'border-box' }}>
                  <div className="flex flex-col justify-center" style={{ flex: '0 0 46%' }}>
                    <span className="font-bold leading-tight" style={{ fontSize: '8.5pt' }}>{brand}</span>
                    <span className="leading-tight" style={{ fontSize: '8.5pt' }}>{model}</span>
                    <span className="leading-tight font-mono whitespace-pre" style={{ fontSize: '8pt' }}>{detail}</span>
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="font-bold font-mono leading-tight" style={{ fontSize: '8.5pt' }}>MRP. {price}</span>
                    <div className="flex-1 min-h-0" dangerouslySetInnerHTML={{ __html: code128Svg(code, 40).replace('<svg ', '<svg style="width:100%;height:100%;display:block" ') }} />
                    <span className="font-mono leading-tight" style={{ fontSize: '7pt' }}>{code}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barcodeOk && tags.slice(0, 60).map(code => (
                <div key={code} className="bg-white border-2 border-stone-300 rounded-md p-2 text-center shadow-xs flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-stone-600 truncate">{storeProfile.name}</span>
                  <span className="text-[11px] text-stone-800 truncate">{[`${product.brand} ${product.modelNo}`.trim() || product.name, product.color?.trim() ? `Colour ${product.color.trim()}` : ''].filter(Boolean).join(' · ')}</span>
                  <div className="h-14 w-full" dangerouslySetInnerHTML={{ __html: code128Svg(code, 40).replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
                  <span className="font-mono text-[10px] tracking-wide">{code}</span>
                  <span className="text-xs font-bold">MRP ₹{price}</span>
                </div>
              ))}
            </div>
          )}
          {tags.length > (layout === 'strip' ? 30 : 60) && <p className="text-center text-xs text-stone-500 mt-3">{t("Preview shows the first tags; all will print.")}</p>}
        </div>
      </div>
    </div>
  );
};
