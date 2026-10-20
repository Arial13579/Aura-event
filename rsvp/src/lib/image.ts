function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('לא ניתן לקרוא את התמונה'));
    img.src = url;
  });
}

/**
 * Compresses an invitation image into a JPEG data URL small enough to live inside a
 * Firestore document and to show as a WhatsApp link preview.
 */
export async function compressInvitation(file: File, maxChars = 420_000): Promise<string> {
  const img = await loadImage(file);
  let width = Math.min(1200, img.naturalWidth);
  for (let attempt = 0; attempt < 6; attempt++) {
    const height = Math.round((img.naturalHeight / img.naturalWidth) * width);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    for (const q of [0.86, 0.78, 0.7, 0.62, 0.54]) {
      const data = canvas.toDataURL('image/jpeg', q);
      if (data.length <= maxChars) return data;
    }
    width = Math.round(width * 0.82);
  }
  throw new Error('התמונה גדולה מדי, נסו תמונה קטנה יותר');
}
