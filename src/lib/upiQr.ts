import QRCode from 'qrcode';

/** Build a spec-compliant UPI deep link for QR encoding. */
export function upiPayString(pa: string, pn?: string, am?: number): string {
  const params = new URLSearchParams({ pa });
  if (pn) params.set('pn', pn);
  if (am && am > 0) params.set('am', am.toFixed(2));
  params.set('cu', 'INR');
  return `upi://pay?${params.toString()}`;
}

/** Generate a QR data URL from a UPI ID (payee), name and optional amount. */
export async function generateUpiQrDataUrl(pa: string, pn?: string, am?: number): Promise<string> {
  if (!pa || !pa.includes('@')) return '';
  try {
    return await QRCode.toDataURL(upiPayString(pa, pn, am), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512
    });
  } catch {
    return '';
  }
}

/**
 * Resolve the QR image to show for a store: the uploaded image wins; otherwise
 * one is generated from the UPI ID. `amount` only applies to the generated QR
 * (an uploaded bank QR is static).
 */
export async function resolveUpiQr(
  profile: { upiId?: string; upiName?: string; upiQrDataUrl?: string },
  amount?: number
): Promise<string> {
  if (profile.upiQrDataUrl) return profile.upiQrDataUrl;
  return generateUpiQrDataUrl(profile.upiId || '', profile.upiName, amount);
}

/** Downscale an uploaded image file to a square-ish PNG data URL, capped at `max` px. */
export function fileToQrDataUrl(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (PNG or JPG).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be loaded.'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not available.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
