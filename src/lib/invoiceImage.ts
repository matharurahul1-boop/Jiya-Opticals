import { Invoice, StoreProfile } from '../types';

/**
 * Renders an invoice to a shareable PNG entirely on a <canvas> — no external
 * libraries, works fully offline. Used to put the invoice on the clipboard so
 * the shopkeeper can paste it straight into a WhatsApp chat next to the text
 * template.
 */

const WIDTH = 820;
const PAD = 48;
const INK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#7c3aed';
const LINE = '#e2e8f0';

const rupee = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

type Ctx = CanvasRenderingContext2D;

function draw(
  ctx: Ctx,
  inv: Invoice,
  store: StoreProfile,
  measure: boolean,
  qrImg: HTMLImageElement | null
): number {
  let y = PAD;
  const x = PAD;
  const right = WIDTH - PAD;
  const contentW = WIDTH - PAD * 2;

  const text = (
    s: string,
    px: number,
    py: number,
    font: string,
    color: string,
    align: CanvasTextAlign = 'left'
  ) => {
    if (!measure) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(s, px, py);
    }
  };

  const rule = (py: number, color = LINE) => {
    if (!measure) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(right, py);
      ctx.stroke();
    }
  };

  // ---- Header
  text((store.name || 'JIYA OPTICALS').toUpperCase(), x, y + 30, '800 32px system-ui, sans-serif', INK);
  y += 44;
  if (store.tagline) {
    text(store.tagline, x, y, '400 14px system-ui, sans-serif', MUTED);
    y += 20;
  }
  const addr = [store.addressLine1, store.addressLine2, store.city && `${store.city} - ${store.pincode || ''}`]
    .filter(Boolean)
    .join(', ');
  if (addr) {
    text(addr, x, y, '400 13px system-ui, sans-serif', MUTED);
    y += 18;
  }
  text(
    `Ph: ${store.phone || '-'}${store.email ? '   |   ' + store.email : ''}`,
    x,
    y,
    '500 13px system-ui, sans-serif',
    MUTED
  );
  y += 18;
  if (store.gstin) {
    text(`GSTIN: ${store.gstin}${store.panNo ? '    PAN: ' + store.panNo : ''}`, x, y, '700 12px system-ui, sans-serif', INK);
    y += 18;
  }

  y += 10;
  rule(y);
  y += 26;

  // ---- Invoice meta band
  if (!measure) {
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x, y - 18, 150, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TAX INVOICE', x + 12, y);
  }
  text(`#${inv.invoiceNo}`, x + 168, y, '800 15px system-ui, sans-serif', INK);
  text(`${inv.date}  ${inv.time || ''}`, right, y, '500 13px system-ui, sans-serif', MUTED, 'right');
  y += 30;

  // ---- Customer box
  text('BILLED TO', x, y, '700 11px system-ui, sans-serif', MUTED);
  text('ORDER', right, y, '700 11px system-ui, sans-serif', MUTED, 'right');
  y += 18;
  text(inv.customerName || '-', x, y, '700 15px system-ui, sans-serif', INK);
  text(inv.orderStatus || '-', right, y, '700 14px system-ui, sans-serif', ACCENT, 'right');
  y += 18;
  text(`+91 ${inv.customerMobile || ''}`, x, y, '400 13px system-ui, sans-serif', MUTED);
  if (inv.deliveryDate) text(`Delivery: ${inv.deliveryDate}`, right, y, '400 13px system-ui, sans-serif', MUTED, 'right');
  y += 22;

  // ---- Prescription
  if (inv.prescription) {
    const p = inv.prescription;
    rule(y);
    y += 20;
    text(`EYE POWER   (PD: ${p.pdMm || '-'} mm)`, x, y, '700 11px system-ui, sans-serif', MUTED);
    y += 18;
    const eye = (lbl: string, e: { sph: string; cyl: string; axis: string; add: string }) => {
      text(
        `${lbl}   SPH ${e.sph || '0.00'}   CYL ${e.cyl || '0.00'}   AXIS ${e.axis || '-'}   ADD ${e.add || '-'}`,
        x,
        y,
        '500 13px ui-monospace, monospace',
        INK
      );
      y += 18;
    };
    eye('R (OD)', p.rightEye);
    eye('L (OS)', p.leftEye);
    if (p.notes) {
      text(`Lens / Coating: ${p.notes}`, x, y, '400 12px system-ui, sans-serif', MUTED);
      y += 18;
    }
    y += 4;
  }

  // ---- Items table
  rule(y);
  y += 20;
  const cQty = right - 320;
  const cRate = right - 180;
  const cAmt = right;
  text('ITEM', x, y, '700 11px system-ui, sans-serif', MUTED);
  text('QTY', cQty, y, '700 11px system-ui, sans-serif', MUTED, 'right');
  text('RATE', cRate, y, '700 11px system-ui, sans-serif', MUTED, 'right');
  text('AMOUNT', cAmt, y, '700 11px system-ui, sans-serif', MUTED, 'right');
  y += 10;
  rule(y);
  y += 20;

  for (const it of inv.items) {
    let nm = it.name || '';
    if (!measure) {
      ctx.font = '500 13px system-ui, sans-serif';
      while (ctx.measureText(nm).width > cQty - x - 16 && nm.length > 4) nm = nm.slice(0, -2);
      if (nm !== it.name) nm += '…';
    }
    text(nm, x, y, '500 13px system-ui, sans-serif', INK);
    text(String(it.qty), cQty, y, '500 13px system-ui, sans-serif', INK, 'right');
    text(rupee(it.unitPrice), cRate, y, '400 12px system-ui, sans-serif', MUTED, 'right');
    text(rupee(it.totalAmount), cAmt, y, '700 13px system-ui, sans-serif', INK, 'right');
    y += 20;
    if (it.frameModel) {
      text(`Model: ${it.frameModel}`, x + 10, y, '400 11px system-ui, sans-serif', MUTED);
      y += 16;
    }
  }
  if (inv.fittingTotal > 0) {
    text('Fitting & Glazing Lab Charges', x, y, '500 13px system-ui, sans-serif', INK);
    text(rupee(inv.fittingTotal), cAmt, y, '700 13px system-ui, sans-serif', INK, 'right');
    y += 20;
  }

  y += 6;
  rule(y);
  y += 22;

  // ---- Totals (right aligned block)
  const tl = right - 300;
  const trow = (lbl: string, val: string, bold = false, color = INK) => {
    text(lbl, tl, y, `${bold ? 700 : 400} 13px system-ui, sans-serif`, bold ? INK : MUTED);
    text(val, right, y, `${bold ? 800 : 600} 13px system-ui, sans-serif`, color, 'right');
    y += 22;
  };
  trow('Subtotal', rupee(inv.subtotal));
  if (inv.totalDiscount > 0) trow('Discount', '- ' + rupee(inv.totalDiscount), false, ACCENT);
  trow('CGST', rupee(inv.cgstTotal));
  trow('SGST', rupee(inv.sgstTotal));
  y += 2;
  rule(y - 12, LINE);
  if (!measure) {
    ctx.fillStyle = '#f5f3ff';
    ctx.fillRect(tl - 12, y - 16, right - tl + 12, 30);
  }
  trow('GRAND TOTAL', rupee(inv.netPayable), true, ACCENT);
  y += 4;
  trow(`Paid (${inv.paymentMode || '-'})`, rupee(inv.advancePaid));
  if (inv.balanceDue > 0) trow('Balance Due', rupee(inv.balanceDue), true, '#e11d48');
  else trow('Status', 'FULLY PAID', true, '#059669');

  y += 12;
  rule(y);
  y += 24;
  text(
    `Thank you for choosing ${store.name || 'us'}!`,
    WIDTH / 2,
    y,
    '600 13px system-ui, sans-serif',
    INK,
    'center'
  );
  y += 18;
  const foot = [store.phone && `Call ${store.phone}`, store.upiId && `UPI ${store.upiId}`].filter(Boolean).join('   •   ');
  if (foot) {
    text(foot, WIDTH / 2, y, '400 12px system-ui, sans-serif', MUTED, 'center');
    y += 18;
  }

  if (qrImg) {
    y += 10;
    const size = 132;
    const qx = (WIDTH - size) / 2;
    if (!measure) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qx - 6, y - 6, size + 12, size + 12);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(qx - 6, y - 6, size + 12, size + 12);
      try {
        ctx.drawImage(qrImg, qx, y, size, size);
      } catch {
        /* ignore a broken image */
      }
    }
    y += size + 16;
    text(
      inv.balanceDue > 0 ? `Scan to pay ₹${(Number(inv.balanceDue) || 0).toLocaleString('en-IN')}` : 'Scan to pay via any UPI app',
      WIDTH / 2,
      y,
      '600 12px system-ui, sans-serif',
      INK,
      'center'
    );
    y += 16;
  }

  return y + PAD;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function invoiceToPngBlob(
  inv: Invoice,
  store: StoreProfile,
  opts: { upiQrDataUrl?: string } = {}
): Promise<Blob> {
  const scale = Math.min(2, (window.devicePixelRatio || 1) * 1.5);
  const qrImg = opts.upiQrDataUrl ? await loadImage(opts.upiQrDataUrl) : null;
  const probe = document.createElement('canvas').getContext('2d')!;
  const height = Math.ceil(draw(probe, inv, store, true, qrImg));

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = 'alphabetic';
  // accent top strip
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, WIDTH, 6);
  draw(ctx, inv, store, false, qrImg);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render invoice image'))), 'image/png')
  );
}

/** Copy blob to clipboard; returns true on success. */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    const anyWin = window as unknown as { ClipboardItem?: typeof ClipboardItem };
    if (!navigator.clipboard || !anyWin.ClipboardItem) return false;
    await navigator.clipboard.write([new anyWin.ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
