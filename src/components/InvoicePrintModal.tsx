import { t } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import { Download, Mail, MessageSquare, Printer, Share2, X, ImageDown, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import { invoiceToPngBlob, copyBlobToClipboard, downloadBlob } from '../lib/invoiceImage';
import { resolveUpiQr } from '../lib/upiQr';

export const InvoicePrintModal: React.FC = () => {
  const { selectedInvoiceForPrint, setSelectedInvoiceForPrint, storeProfile, openEmailModal, customers } = useApp();
  const [printFormat, setPrintFormat] = useState<'A4' | 'Thermal'>('A4');
  const [busyImg, setBusyImg] = useState(false);
  const [toast, setToast] = useState<{ tone: 'ok' | 'info' | 'err'; msg: string } | null>(null);
  const [upiQrSrc, setUpiQrSrc] = useState('');

  const invoiceDue = selectedInvoiceForPrint?.balanceDue ?? 0;
  useEffect(() => {
    let active = true;
    resolveUpiQr(storeProfile, invoiceDue > 0 ? invoiceDue : undefined).then((src) => {
      if (active) setUpiQrSrc(src);
    });
    return () => {
      active = false;
    };
  }, [storeProfile.upiId, storeProfile.upiName, storeProfile.upiQrDataUrl, invoiceDue]);

  if (!selectedInvoiceForPrint) return null;

  const inv: Invoice = selectedInvoiceForPrint;
  const matchedCustomer = customers.find((c) => c.id === inv.customerId || c.mobile === inv.customerMobile);

  const flash = (tone: 'ok' | 'info' | 'err', msg: string) => {
    setToast({ tone, msg });
    window.setTimeout(() => setToast(null), 6000);
  };

  const handlePrint = () => {
    window.print();
  };

  const buildInvoiceText = () =>
    `*${storeProfile.name}* \n` +
    `🧾 Tax Invoice: *${inv.invoiceNo}*\n` +
    `👤 Customer: ${inv.customerName}\n` +
    `📅 Date: ${inv.date}\n` +
    `👓 Items: ${inv.items.map((i) => `${i.name} (Qty: ${i.qty})`).join(', ')}\n` +
    `💰 Grand Total: ₹${inv.netPayable}\n` +
    `💵 Advance Paid: ₹${inv.advancePaid}\n` +
    `${inv.balanceDue > 0 ? `⚠️ Balance Due: *₹${inv.balanceDue}*\n` : '✅ Fully Paid\n'}` +
    `📦 Status: *${inv.orderStatus}*\n` +
    `Thank you for visiting ${storeProfile.name}! Contact: ${storeProfile.phone}`;

  // Build the invoice image and drop it on the clipboard so the shopkeeper can
  // paste it straight into the WhatsApp chat, then open WhatsApp with the text.
  const handleWhatsApp = async () => {
    const text = buildInvoiceText();
    const openChat = () =>
      window.open(
        `https://api.whatsapp.com/send?phone=91${inv.customerMobile}&text=${encodeURIComponent(text)}`,
        '_blank'
      );

    setBusyImg(true);
    try {
      const blob = await invoiceToPngBlob(inv, storeProfile, { upiQrDataUrl: upiQrSrc });
      const copied = await copyBlobToClipboard(blob);
      if (copied) {
        flash('ok', 'Invoice image copied ✓  — in WhatsApp press Ctrl/Cmd + V to paste it with the message.');
      } else {
        downloadBlob(blob, `Invoice-${inv.invoiceNo.replace(/[^\w-]+/g, '_')}.png`);
        flash('info', 'Clipboard blocked by the browser — invoice image downloaded instead. Attach it in WhatsApp.');
      }
    } catch {
      flash('err', 'Could not create the invoice image. Opening WhatsApp with the text only.');
    } finally {
      setBusyImg(false);
      openChat();
    }
  };

  const handleCopyImage = async () => {
    setBusyImg(true);
    try {
      const blob = await invoiceToPngBlob(inv, storeProfile, { upiQrDataUrl: upiQrSrc });
      const copied = await copyBlobToClipboard(blob);
      if (copied) flash('ok', 'Invoice image copied to clipboard ✓  — paste anywhere with Ctrl/Cmd + V.');
      else {
        downloadBlob(blob, `Invoice-${inv.invoiceNo.replace(/[^\w-]+/g, '_')}.png`);
        flash('info', 'Clipboard blocked — invoice image downloaded instead.');
      }
    } catch {
      flash('err', 'Could not create the invoice image.');
    } finally {
      setBusyImg(false);
    }
  };

  const handleEmailInvoice = () => {
    const taxableAmt = inv.taxableTotal ?? (inv.subtotal - inv.totalDiscount);
    const itemsList = inv.items
      .map((i, idx) => `${idx + 1}. ${i.name} (Qty: ${i.qty}) - ₹${i.totalAmount}`)
      .join('\n');

    const rxDetails = inv.prescription
      ? `\n--- OPTICAL REFRACTION / EYE POWER ---\n` +
        `Right Eye (OD): SPH ${inv.prescription.rightEye.sph} | CYL ${inv.prescription.rightEye.cyl} | AXIS ${inv.prescription.rightEye.axis || '-'} | ADD ${inv.prescription.rightEye.add || '-'}\n` +
        `Left Eye (OS): SPH ${inv.prescription.leftEye.sph} | CYL ${inv.prescription.leftEye.cyl} | AXIS ${inv.prescription.leftEye.axis || '-'} | ADD ${inv.prescription.leftEye.add || '-'}\n` +
        `Pupillary Distance (PD): ${inv.prescription.pdMm} mm\n`
      : '';

    const subject = `Tax Invoice #${inv.invoiceNo} - ${storeProfile.name}`;
    const body = `Dear ${inv.customerName},\n\n` +
      `Thank you for your business at ${storeProfile.name}!\n` +
      `Here are your tax invoice & optical order details:\n\n` +
      `========================================\n` +
      `STORE: ${storeProfile.name}\n` +
      `GSTIN: ${storeProfile.gstin}\n` +
      `PHONE: ${storeProfile.phone}\n` +
      `ADDRESS: ${storeProfile.addressLine1}, ${storeProfile.city} - ${storeProfile.pincode}\n` +
      `========================================\n\n` +
      `INVOICE NUMBER: ${inv.invoiceNo}\n` +
      `DATE: ${inv.date} (${inv.time})\n` +
      `CUSTOMER NAME: ${inv.customerName}\n` +
      `MOBILE: +91 ${inv.customerMobile}\n` +
      `ORDER STATUS: ${inv.orderStatus}\n` +
      `${inv.deliveryDate ? `ESTIMATED DELIVERY: ${inv.deliveryDate}\n` : ''}` +
      `${rxDetails}\n` +
      `--- BILLED ITEMS ---\n` +
      `${itemsList}\n` +
      `${inv.fittingTotal > 0 ? `Fitting & Glazing Charges: ₹${inv.fittingTotal}\n` : ''}` +
      `----------------------------------------\n` +
      `TAXABLE AMOUNT: ₹${taxableAmt.toFixed(2)}\n` +
      `TOTAL GST: ₹${(inv.cgstTotal + inv.sgstTotal).toFixed(2)}\n` +
      `GRAND TOTAL: ₹${inv.netPayable}\n` +
      `ADVANCE PAID: ₹${inv.advancePaid} (${inv.paymentMode})\n` +
      `${inv.balanceDue > 0 ? `BALANCE DUE: ₹${inv.balanceDue}\n` : 'PAYMENT STATUS: FULLY PAID ✅\n'}` +
      `----------------------------------------\n\n` +
      `${storeProfile.upiId ? `UPI Payment ID: ${storeProfile.upiId}\n\n` : ''}` +
      `TERMS & CONDITIONS:\n` +
      `${storeProfile.termsAndConditions.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}\n\n` +
      `For any query, please call us at ${storeProfile.phone} or email ${storeProfile.email}.\n\n` +
      `Best Regards,\n${storeProfile.name}`;

    openEmailModal({
      recipientEmail: inv.customerEmail || matchedCustomer?.email || '',
      recipientName: inv.customerName,
      recipientMobile: inv.customerMobile,
      subject,
      body,
      documentType: 'Tax Invoice'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      {toast && (
        <div
          className={`toast-in fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-sm px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border no-print ${
            toast.tone === 'ok'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toast.tone === 'err'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-stone-900 text-white border-stone-700'
          }`}
        >
          {toast.msg}
        </div>
      )}
      {/* Container */}
      <div className="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Bar (Hidden in @media print) */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 no-print shrink-0 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-stone-700">{t("Print Format:")}</span>
            <div className="flex bg-stone-200 border border-stone-300 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setPrintFormat('A4')}
                className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  printFormat === 'A4' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {t("A4 / A5 Laser Tax Invoice ")}</button>
              <button
                onClick={() => setPrintFormat('Thermal')}
                className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  printFormat === 'Thermal' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {t("80mm Thermal POS Slip ")}</button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              id="btn-whatsapp-invoice"
              onClick={handleWhatsApp}
              disabled={busyImg}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              title={t("Copies the invoice image to the clipboard, then opens WhatsApp — paste the image with Ctrl/Cmd + V")}
            >
              {busyImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              <span>{t("WhatsApp")}</span>
            </button>

            <button
              id="btn-copy-invoice-image"
              onClick={handleCopyImage}
              disabled={busyImg}
              className="px-2.5 sm:px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              title={t("Copy the invoice as an image to the clipboard")}
            >
              <ImageDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("Copy image")}</span>
            </button>

            <button
              id="btn-email-invoice"
              onClick={handleEmailInvoice}
              className="px-2.5 sm:px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={t("Send invoice via Email (Gmail, Outlook, Default Mail)")}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t("Email")}</span>
            </button>

            <button
              id="btn-print-invoice"
              onClick={handlePrint}
              className="px-3 sm:px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t("Print")}</span>
            </button>

            <button
              onClick={() => setSelectedInvoiceForPrint(null)}
              className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white text-stone-900 printable-area">
          {printFormat === 'A4' ? (
            /* =================== A4 / A5 GST TAX INVOICE =================== */
            <div className="max-w-2xl mx-auto space-y-4 text-xs font-sans">
              {/* Header */}
              <div className="border-b-2 border-stone-900 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-stone-900 uppercase">
                    {storeProfile.name}
                  </h1>
                  <p className="text-xs text-stone-600 font-medium">{storeProfile.tagline}</p>
                  <p className="text-[11px] text-stone-600 mt-1 leading-tight">
                    {storeProfile.addressLine1}, {storeProfile.addressLine2}, {storeProfile.city} - {storeProfile.pincode}
                  </p>
                  <p className="text-[11px] text-stone-700 font-semibold mt-0.5">
                    📱 {storeProfile.phone} | ✉️ {storeProfile.email}
                  </p>
                  <div className="flex gap-3 text-[11px] font-bold text-stone-800 mt-1">
                    <span>{t("GSTIN: ")}{storeProfile.gstin}</span>
                    <span>{t("PAN: ")}{storeProfile.panNo}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-stone-900 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded">
                    {t("Tax Invoice / Bill of Supply ")}</div>
                  <div className="mt-2 text-xs space-y-0.5">
                    <p className="font-bold text-stone-900 text-sm">{t("Invoice #: ")}{inv.invoiceNo}</p>
                    <p className="text-stone-600">{t("Date: ")}{inv.date} ({inv.time})</p>
                    {inv.doctorName && (
                      <p className="text-stone-700 font-medium">{t("Ref. Doctor: ")}{inv.doctorName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer & Order Status Box */}
              <div className="grid grid-cols-2 gap-4 bg-stone-50 border border-stone-300 p-2.5 rounded">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">{t("Billed To (Customer):")}</span>
                  <div className="font-bold text-stone-900 text-sm">{inv.customerName}</div>
                  <div className="text-stone-700 text-xs">{t("Mobile: +91 ")}{inv.customerMobile}</div>
                  {inv.customerAddress && (
                    <div className="text-stone-600 text-[11px]">{inv.customerAddress}</div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">{t("Order & Delivery Details:")}</span>
                  <div className="font-bold text-stone-900 text-xs">
                    {t("Type: ")}<span className="text-amber-800">{inv.orderStatus}</span>
                  </div>
                  {inv.deliveryDate && (
                    <div className="text-stone-700 text-xs font-semibold">
                      {t("Delivery Target: ")}{inv.deliveryDate}
                    </div>
                  )}
                  <div className="text-stone-600 text-[11px]">
                    {t("Sales Executive: ")}{inv.salesmanName || 'Store Counter'}
                  </div>
                </div>
              </div>

              {/* Eye Power Prescription Grid (If attached) */}
              {inv.prescription && (
                <div className="border border-stone-300 rounded overflow-hidden">
                  <div className="bg-stone-100 px-2 py-1 text-[10px] uppercase font-bold text-stone-700 border-b border-stone-300 flex justify-between items-center">
                    <span>{t("Optical Refraction / Prescription Details (Power)")}</span>
                    <span>{t("PD: ")}{inv.prescription.pdMm} {t("mm")}</span>
                  </div>
                  <table className="w-full text-center text-[11px]">
                    <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="py-1 px-2 text-left">{t("Eye")}</th>
                        <th className="py-1 px-1">{t("SPH")}</th>
                        <th className="py-1 px-1">{t("CYL")}</th>
                        <th className="py-1 px-1">{t("AXIS")}</th>
                        <th className="py-1 px-1">{t("ADD")}</th>
                        <th className="py-1 px-1">{t("DV")}</th>
                        <th className="py-1 px-1">{t("NV")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      <tr>
                        <td className="py-1 px-2 text-left font-bold text-stone-800">{t("Right (OD)")}</td>
                        <td className="py-1 px-1 font-mono font-bold">{inv.prescription.rightEye.sph || '—'}</td>
                        <td className="py-1 px-1 font-mono font-bold">{inv.prescription.rightEye.cyl || '—'}</td>
                        <td className="py-1 px-1 font-mono">{inv.prescription.rightEye.axis || '-'}</td>
                        <td className="py-1 px-1 font-mono">{inv.prescription.rightEye.add || '-'}</td>
                        <td className="py-1 px-1">{inv.prescription.rightEye.dv}</td>
                        <td className="py-1 px-1">{inv.prescription.rightEye.nv}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 text-left font-bold text-stone-800">{t("Left (OS)")}</td>
                        <td className="py-1 px-1 font-mono font-bold">{inv.prescription.leftEye.sph || '—'}</td>
                        <td className="py-1 px-1 font-mono font-bold">{inv.prescription.leftEye.cyl || '—'}</td>
                        <td className="py-1 px-1 font-mono">{inv.prescription.leftEye.axis || '-'}</td>
                        <td className="py-1 px-1 font-mono">{inv.prescription.leftEye.add || '-'}</td>
                        <td className="py-1 px-1">{inv.prescription.leftEye.dv}</td>
                        <td className="py-1 px-1">{inv.prescription.leftEye.nv}</td>
                      </tr>
                    </tbody>
                  </table>
                  {inv.prescription.notes && (
                    <div className="bg-stone-50 px-2 py-0.5 text-[10px] text-stone-600 border-t border-stone-200">
                      {t("Lens / Coating: ")}{inv.prescription.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-stone-300">
                <thead className="bg-stone-100 text-stone-800 text-[10px] uppercase font-bold border-b border-stone-300">
                  <tr>
                    <th className="py-1.5 px-2">#</th>
                    <th className="py-1.5 px-2">{t("Description")}</th>
                    <th className="py-1.5 px-2 text-center">{t("HSN")}</th>
                    <th className="py-1.5 px-2 text-center">{t("Qty")}</th>
                    <th className="py-1.5 px-2 text-right">{t("Rate (₹)")}</th>
                    <th className="py-1.5 px-2 text-center">{t("GST")}</th>
                    <th className="py-1.5 px-2 text-right">{t("Total (₹)")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {inv.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 text-stone-500">{idx + 1}</td>
                      <td className="py-1.5 px-2">
                        <div className="font-semibold text-stone-900">{item.name}</div>
                        {item.frameModel && (
                          <div className="text-[10px] text-stone-500">{t("Model: ")}{item.frameModel}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono text-[10px] text-stone-600">
                        {item.hsnCode}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold text-stone-900">{item.qty}</td>
                      <td className="py-1.5 px-2 text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-center text-[10px] text-stone-600">
                        {item.gstRate}%
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-stone-900">
                        {item.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {inv.fittingTotal > 0 && (
                    <tr>
                      <td className="py-1.5 px-2 text-stone-500">*</td>
                      <td colSpan={5} className="py-1.5 px-2 font-medium text-stone-800">
                        {t("Optical Fitting & Glazing Lab Charges ")}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-stone-900">
                        {inv.fittingTotal.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Bottom Financials & Bank Info */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Bank / UPI / Terms */}
                <div className="space-y-2 text-[10px] text-stone-600">
                  <div className="bg-stone-50 border border-stone-200 p-2 rounded flex gap-2">
                    <div className="flex-1">
                      <span className="font-bold text-stone-800 block uppercase">{t("Bank & UPI Details:")}</span>
                      <p>{t("Bank: ")}{storeProfile.bankName} {t("| A/c: ")}{storeProfile.bankAccountNo}</p>
                      <p>{t("IFSC: ")}{storeProfile.bankIfsc}</p>
                      <p>{t("UPI ID: ")}<strong className="text-stone-800">{storeProfile.upiId}</strong></p>
                    </div>
                    {upiQrSrc && (
                      <div className="text-center shrink-0">
                        <img src={upiQrSrc} alt="UPI QR" className="w-16 h-16 object-contain border border-stone-300 rounded bg-white" />
                        <span className="block text-[8px] text-stone-500 mt-0.5">{t("Scan to Pay")}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-stone-800 block">{t("Terms & Conditions:")}</span>
                    <ul className="list-disc pl-3.5 space-y-0.5 text-[9px]">
                      {storeProfile.termsAndConditions.slice(0, 3).map((term, i) => (
                        <li key={i}>{term}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Amount Totals */}
                <div className="space-y-1 text-xs text-stone-800">
                  <div className="flex justify-between">
                    <span>{t("Taxable Subtotal:")}</span>
                    <span>₹{inv.subtotal.toFixed(2)}</span>
                  </div>
                  {inv.totalDiscount > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>{t("Discount:")}</span>
                      <span>-₹{inv.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-600 text-[11px]">
                    <span>{t("CGST:")}</span>
                    <span>₹{inv.cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 text-[11px]">
                    <span>{t("SGST:")}</span>
                    <span>₹{inv.sgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-stone-900 border-t border-stone-300 pt-1.5">
                    <span>{t("Grand Total:")}</span>
                    <span>₹{inv.netPayable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-amber-900 bg-amber-50 p-1 rounded">
                    <span>{t("Advance / Amount Paid:")}</span>
                    <span>₹{inv.advancePaid.toFixed(2)} ({inv.paymentMode})</span>
                  </div>
                  {inv.balanceDue > 0 ? (
                    <div className="flex justify-between font-bold text-rose-700 bg-rose-50 p-1 rounded">
                      <span>{t("Balance Due:")}</span>
                      <span>₹{inv.balanceDue.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="text-right text-[10px] font-bold text-emerald-700">
                      {t("✔ FULLY PAID & SETTLED ")}</div>
                  )}

                  <div className="pt-8 text-right">
                    <span className="text-[10px] text-stone-500 block">{t("For ")}{storeProfile.name}</span>
                    <span className="text-[10px] font-bold text-stone-800 border-t border-stone-400 pt-1 inline-block mt-4">
                      {t("Authorised Signatory ")}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =================== 80mm POS THERMAL RECEIPT =================== */
            <div className="max-w-xs mx-auto p-2 font-mono text-xs text-stone-900 space-y-2 border border-stone-200 shadow-xs bg-white">
              <div className="text-center border-b border-dashed border-stone-400 pb-2">
                <h2 className="font-black text-sm uppercase">{storeProfile.name}</h2>
                <p className="text-[10px] text-stone-600">{storeProfile.addressLine1}</p>
                <p className="text-[10px] text-stone-600">{t("Ph: ")}{storeProfile.phone}</p>
                <p className="text-[10px] font-bold mt-0.5">{t("GSTIN: ")}{storeProfile.gstin}</p>
              </div>

              <div className="text-[11px] space-y-0.5 border-b border-dashed border-stone-400 pb-1.5">
                <div className="flex justify-between">
                  <span>{t("Bill: ")}<strong>{inv.invoiceNo}</strong></span>
                  <span>{inv.date}</span>
                </div>
                <div>{t("Cust: ")}{inv.customerName} ({inv.customerMobile})</div>
                <div>{t("Status: ")}<strong>{inv.orderStatus}</strong></div>
              </div>

              {/* Items List */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
                {inv.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[170px]">{item.name} {t("x")}{item.qty}</span>
                    <span className="font-bold">₹{item.totalAmount}</span>
                  </div>
                ))}
                {inv.fittingTotal > 0 && (
                  <div className="flex justify-between">
                    <span>{t("Fitting Glazing")}</span>
                    <span>₹{inv.fittingTotal}</span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span>{t("NET TOTAL:")}</span>
                  <span>₹{inv.netPayable}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("PAID:")}</span>
                  <span>₹{inv.advancePaid} ({inv.paymentMode})</span>
                </div>
                {inv.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>{t("BALANCE DUE:")}</span>
                    <span>₹{inv.balanceDue}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 border-t border-dashed border-stone-400 text-[10px] text-stone-600">
                <p>{t("Thank you for choosing us!")}</p>
                <p>{t("Please preserve this receipt for delivery.")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
