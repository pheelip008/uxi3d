import type { ImageAsset } from '../types.ts';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This image could not be opened.'));
    img.src = src;
  });
}

/** Check and read an uploaded file. The original pixels are kept for print. */
export async function readImageFile(file: File): Promise<Omit<ImageAsset, 'id'>> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please upload a PNG, JPG, WebP or SVG image.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Images must be 10 MB or smaller.');
  }
  const src = await readAsDataUrl(file);
  const img = await decode(src);
  // SVGs without a fixed size report 0, so give them a sensible default.
  return { name: file.name, src, width: img.naturalWidth || 1000, height: img.naturalHeight || 1000 };
}

// Decoded images for the renderer. Canvas drawImage needs an image that has
// finished loading, so we decode once and tell listeners when it is ready.
const cache = new Map<string, { img: HTMLImageElement; ready: boolean }>();
const listeners = new Set<() => void>();

export function onImageLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDecodedImage(asset: ImageAsset): HTMLImageElement | null {
  let entry = cache.get(asset.id);
  if (!entry) {
    const img = new Image();
    const created = { img, ready: false };
    img.onload = () => {
      created.ready = true;
      listeners.forEach((listener) => listener());
    };
    img.src = asset.src;
    cache.set(asset.id, created);
    entry = created;
  }
  return entry.ready ? entry.img : null;
}