export async function prepareImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: Bitte JPEG, PNG oder WebP verwenden. HEIC/HEIF zuerst als JPEG exportieren.`);
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name}: Datei zu groß (maximal 40 MB vor Verkleinerung).`);
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`${file.name}: Foto konnte nicht gelesen werden.`); });
  try {
    if (Math.max(bitmap.width, bitmap.height) <= 2000 && file.size <= 2 * 1024 * 1024) return file;
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Foto konnte nicht verkleinert werden.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Foto konnte nicht verkleinert werden.')), 'image/jpeg', 0.85));
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally { bitmap.close(); }
}
