// Browser-only helpers: resizing a captured photo before upload, and cropping
// each fighter's portrait out of that same resized photo. No React here.

import type { Arena } from "./types";

type Drawable = ImageBitmap | HTMLImageElement;

function isImageBitmap(drawable: Drawable): drawable is ImageBitmap {
  return typeof ImageBitmap !== "undefined" && drawable instanceof ImageBitmap;
}

function loadImageElement(file: File): Promise<{ bitmap: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ bitmap: img, width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

async function loadDrawable(file: File): Promise<{ bitmap: Drawable; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    return loadImageElement(file);
  }
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/** Shrinks a photo so its longest side is at most `maxSize`, exporting a JPEG.
 * A 1024px JPEG keeps vision-model image cost low. */
export async function resizeImage(
  file: File,
  maxSize = 1024,
  quality = 0.8
): Promise<{ dataUrl: string; base64: string; width: number; height: number }> {
  const { bitmap, width: srcWidth, height: srcHeight } = await loadDrawable(file);

  const scale = Math.min(1, maxSize / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  if (isImageBitmap(bitmap)) bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

  return { dataUrl, base64, width, height };
}

/** Crops one fighter's portrait out of the resized photo. `box` is
 * [ymin, xmin, ymax, xmax] normalized 0-1000 relative to that same image. */
export async function cropFighter(
  dataUrl: string,
  box: [number, number, number, number],
  size = 256,
  pad = 0.08
): Promise<string> {
  const img = await loadImageFromDataUrl(dataUrl);
  const [ymin, xmin, ymax, xmax] = box;

  const toPxX = (v: number) => (v / 1000) * img.naturalWidth;
  const toPxY = (v: number) => (v / 1000) * img.naturalHeight;

  let left = toPxX(xmin);
  let right = toPxX(xmax);
  let top = toPxY(ymin);
  let bottom = toPxY(ymax);

  let boxWidth = Math.max(1, right - left);
  let boxHeight = Math.max(1, bottom - top);

  // Grow by `pad` of width/height on each side.
  left -= boxWidth * pad;
  right += boxWidth * pad;
  top -= boxHeight * pad;
  bottom += boxHeight * pad;
  boxWidth = right - left;
  boxHeight = bottom - top;

  // Make it square around the centre, using the longer side.
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const side = Math.max(boxWidth, boxHeight);
  left = centerX - side / 2;
  right = centerX + side / 2;
  top = centerY - side / 2;
  bottom = centerY + side / 2;

  // Clamp inside the image.
  left = Math.max(0, Math.min(left, img.naturalWidth));
  right = Math.max(0, Math.min(right, img.naturalWidth));
  top = Math.max(0, Math.min(top, img.naturalHeight));
  bottom = Math.max(0, Math.min(bottom, img.naturalHeight));

  const sourceWidth = Math.max(1, right - left);
  const sourceHeight = Math.max(1, bottom - top);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, left, top, sourceWidth, sourceHeight, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Returns a new arena where every fighter with a `box` gets an `imageUrl`
 * cropped from `dataUrl`. A failed crop is silently skipped (never throws),
 * so the fighter just falls back to its emoji in the UI. */
export async function attachPortraits(arena: Arena, dataUrl: string): Promise<Arena> {
  const fighters = await Promise.all(
    arena.fighters.map(async (fighter) => {
      if (!fighter.box) return fighter;
      try {
        const imageUrl = await cropFighter(dataUrl, fighter.box);
        return { ...fighter, imageUrl };
      } catch {
        return fighter;
      }
    })
  );

  return { ...arena, fighters };
}
