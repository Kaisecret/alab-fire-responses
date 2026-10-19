const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_DIMENSION = 5000;
const MAX_PIXELS = 12_000_000;
const FORMATS = new Map([["image/jpeg", "jpeg"], ["image/png", "png"], ["image/webp", "webp"]]);
const PANEL_WIDTH = 600;
const PHOTO_HEIGHT = 800;
const LABEL_HEIGHT = 80;

function signatureMatches(bytes, type) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return type === "image/webp" && bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

async function normalizedPanel(file, label, sharp) {
  if (!(file instanceof File) || !FORMATS.has(file.type) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${label} selfie must be a JPG, PNG, or WebP image no larger than 6 MB.`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) throw new Error(`${label} selfie is not a readable image.`);
  try {
    const decoder = sharp(bytes, { failOn: "error", limitInputPixels: MAX_PIXELS });
    const metadata = await decoder.metadata();
    if (metadata.format !== FORMATS.get(file.type) || !metadata.width || !metadata.height
        || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION
        || metadata.width * metadata.height > MAX_PIXELS || (metadata.pages ?? 1) !== 1) throw new Error("INVALID_IMAGE");
    // Decode the complete pixel stream, orient the capture, and keep the whole
    // frame visible. The output has no source EXIF or other embedded metadata.
    return await decoder.rotate().resize(PANEL_WIDTH, PHOTO_HEIGHT, { fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" }).toColourspace("srgb").jpeg({ quality: 92 }).toBuffer();
  } catch {
    throw new Error(`${label} selfie must be a readable image up to 5000 pixels per side and 12 megapixels.`);
  }
}

/**
 * A private evidence sheet for the existing selfie storage slot. These labels
 * describe the requested captures; they do not certify pose or liveness.
 * The caller provides its lazily loaded Sharp implementation and handles storage.
 */
export async function composeSelfieContactSheet({ selfie, selfieRight, selfieLeft }, sharp) {
  if (!selfie || !selfieRight || !selfieLeft) throw new Error("SELFIE_VIEWS_REQUIRED");
  const panels = [];
  for (const [index, [file, label]] of [[selfie, "Front"], [selfieRight, "Right"], [selfieLeft, "Left"]].entries()) {
    panels.push({ input: await normalizedPanel(file, label, sharp), left: index * PANEL_WIDTH, top: 0 });
  }
  const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="80">
    <rect width="1800" height="80" fill="#ffffff"/>
    <g fill="#111827" font-family="Arial, sans-serif" font-size="32" font-weight="700" text-anchor="middle">
      <text x="300" y="51">Front</text><text x="900" y="51">Right</text><text x="1500" y="51">Left</text>
    </g>
  </svg>`);
  const bytes = await sharp({ create: { width: PANEL_WIDTH * 3, height: PHOTO_HEIGHT + LABEL_HEIGHT, channels: 3, background: "#ffffff" } })
    .composite([...panels, { input: labels, left: 0, top: PHOTO_HEIGHT }])
    .jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  if (bytes.length < 1 || bytes.length > MAX_IMAGE_BYTES) throw new Error("Selfie contact sheet exceeds the 6 MB image limit.");
  return new File([bytes], "selfie-views.jpg", { type: "image/jpeg" });
}
