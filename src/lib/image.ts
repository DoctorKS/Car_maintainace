import imageCompression from 'browser-image-compression';

/**
 * Compress a chosen image down to ≤ 1 MB / 1600 px on the longest side.
 * Encodes to JPEG (smaller than PNG for photos; receipts compress well).
 */
export async function compressImage(file: File): Promise<{ blob: Blob; mime: string }> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.85,
    fileType: 'image/jpeg',
  });
  return { blob: compressed, mime: 'image/jpeg' };
}
