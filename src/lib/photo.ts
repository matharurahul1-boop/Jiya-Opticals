/** Shrinks a photo (e.g. a vendor bill taken on a phone) to a small JPEG data URL so it can be stored with the record. */
export async function compressImage(file: File, maxSide = 1400, quality = 0.65): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo (image file).');
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This photo could not be read. Try another one.'));
      el.src = bitmapUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process the photo.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
