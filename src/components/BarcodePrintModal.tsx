import { t } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, Tag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';

export const BarcodePrintModal: React.FC = () => {
  const { selectedProductForBarcode, setSelectedProductForBarcode, storeProfile } = useApp();
  const [printCount, setPrintCount] = useState<number>(8);
  const [qrImage, setQrImage] = useState('');
  const [qrError, setQrError] = useState('');
  const [labelWidth, setLabelWidth] = useState(60);
  const [labelHeight, setLabelHeight] = useState(40);
  const payload = selectedProductForBarcode?.qrCode || selectedProductForBarcode?.barcode || '';
  useEffect(() => {
    let active = true; setQrImage(''); setQrError('');
    if (payload) QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 4, width: 512 }).then(url => { if (active) setQrImage(url); }).catch(() => { if (active) setQrError('This code cannot fit in a QR label. Use the original Drishti sticker.'); });
    return () => { active = false; };
  }, [payload]);

  if (!selectedProductForBarcode) return null;

  const product: Product = selectedProductForBarcode;

  const handlePrint = () => {
    if (!qrImage) return;
    const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
    frame.title = 'QR sticker print';
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) { frame.remove(); return; }
      win.onafterprint = () => frame.remove();
      win.focus(); win.print();
      window.setTimeout(() => frame.remove(), 120000);
    };
    const qrSize = Math.min(labelHeight - 14, labelWidth - 4);
    frame.srcdoc = `<!doctype html><html><head><title>QR labels</title><style>@page{size:${labelWidth}mm ${labelHeight}mm;margin:0}*{box-sizing:border-box}body{margin:0;font:9pt Arial}.label{width:${labelWidth}mm;height:${labelHeight}mm;padding:2mm;text-align:center;break-after:page;overflow:hidden}.label:last-child{break-after:auto}img{display:block;width:${qrSize}mm;height:${qrSize}mm;margin:auto}p{margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style></head><body>${Array.from({ length: printCount }, () => `<div class="label"><p>${escape(product.brand)} ${escape(product.modelNo)}</p><img src="${qrImage}" alt="QR"><p>${escape(product.barcode)}</p><p>MRP ${product.mrp}</p></div>`).join('')}</body></html>`;
    document.body.appendChild(frame);
  };

  const tags = Array.from({ length: printCount });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center space-x-3 text-xs">
            <span className="font-bold text-stone-900 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-600" />
              {t("Frame Tags / Barcode Sticker Print ")}</span>

            <div className="flex items-center space-x-2">
              <label className="text-stone-500 text-[11px]">{t("Qty:")}</label>
              <input
                type="number"
                min="1"
                max="50"
                value={printCount}
                onChange={(e) => setPrintCount(Math.min(50, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                className="w-14 bg-white border border-stone-300 rounded px-2 py-0.5 text-center text-stone-800 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={!qrImage}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("Print Stickers ")}</button>
            <button
              onClick={() => setSelectedProductForBarcode(null)}
              className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 text-xs bg-amber-50 space-y-2 no-print"><p>{t("QR reprint uses the original code value. Existing Drishti stickers can still be scanned. Select the TSC driver in the print dialog; set 100% scale and match your actual label roll.")}</p><div className="flex gap-3"><label>{t("Width (mm) ")}<input className="border w-14" type="number" min="25" max="110" value={labelWidth} onChange={e => setLabelWidth(Math.min(110,Math.max(25,Number(e.target.value)||60)))} /></label><label>{t("Height (mm) ")}<input className="border w-14" type="number" min="30" max="150" value={labelHeight} onChange={e => setLabelHeight(Math.min(150,Math.max(30,Number(e.target.value)||40)))} /></label></div>{qrError && <p role="alert" className="text-red-700">{qrError}</p>}</div>

        {/* Printable Stickers Sheet */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-100 text-stone-900 printable-area">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tags.map((_, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-stone-300 rounded-md p-2 flex flex-col justify-between shadow-xs font-mono text-[10px] space-y-1 relative overflow-hidden"
                style={{ width: '100%', minHeight: '90px' }}
              >
                <div className="flex justify-between items-start border-b border-stone-200 pb-0.5">
                  <span className="font-bold text-stone-900 truncate max-w-[120px]">
                    {product.brand}
                  </span>
                  <span className="text-[9px] text-stone-500 font-sans">{product.color || 'STD'}</span>
                </div>

                <div className="space-y-0.5">
                  <div className="font-bold text-stone-800 text-[11px] truncate">
                    {product.modelNo}
                  </div>
                  <div className="text-[9px] text-stone-500 font-sans truncate">
                    {product.name}
                  </div>
                </div>

                {/* Barcode visual representation */}
                <div className="text-center py-0.5 bg-stone-50 border border-stone-200 rounded">
                  {qrImage ? <img src={qrImage} alt={`QR code for ${product.barcode}`} className="w-24 h-24 mx-auto" /> : <span>{t("Generating QR…")}</span>}
                  <span className="text-[9px] font-bold text-stone-700 block">
                    {product.barcode}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-0.5 border-t border-stone-200 text-stone-900 font-sans">
                  <span className="text-[9px] font-bold text-stone-500">{t("MRP:")}</span>
                  <span className="text-xs font-black text-stone-900 font-mono">
                    ₹{product.mrp || product.salePrice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
