// Phone photos are often several megabytes. The server accepts at most
// 4.5 MB per request, and an ID check sends both sides at once, so photos are
// made smaller in the browser first: upright, at most `maxSize` pixels on the
// longest side, re-encoded as JPEG until they fit `maxBytes`.
//
// The result is always held in memory. A picked file still points at the
// phone's storage, and Android can revoke or change it while the resident
// takes their selfie. A later upload of that file then fails in the browser as
// a network error ("Failed to fetch") before reaching the server.

type ShrinkOptions = { maxSize?: number; maxBytes?: number };

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Older browsers reject the options object; fall back to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The same bytes, detached from the picked file on disk. */
async function inMemory(file: File): Promise<File> {
  try {
    return new File([await file.arrayBuffer()], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

function encode(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** A smaller JPEG copy of the photo, or an in-memory copy of the original bytes. */
export async function shrinkPhoto(file: File, { maxSize = 2000, maxBytes = 1.4 * 1024 * 1024 }: ShrinkOptions = {}): Promise<File> {
  if (typeof document === "undefined") return file;
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    return inMemory(file);
  }
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) return inMemory(file);
  // Already small enough: keep the original bytes untouched.
  if (file.size <= maxBytes && Math.max(width, height) <= maxSize) {
    if ("close" in source) source.close();
    return inMemory(file);
  }

  const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
  let best: Blob | null = null;
  for (const [size, quality] of [[maxSize, 0.88], [maxSize, 0.8], [Math.round(maxSize * 0.8), 0.8], [Math.round(maxSize * 0.65), 0.75]] as const) {
    const scale = Math.min(1, size / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) break;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await encode(canvas, quality);
    if (!blob) break;
    best = blob;
    if (blob.size <= maxBytes) break;
  }
  if ("close" in source) source.close();
  if (!best || best.size >= file.size) return inMemory(file);
  return new File([best], name, { type: "image/jpeg", lastModified: Date.now() });
}
