import jsQR from "jsqr";

// Reads the QR code on a PhilSys card. The back of the card prints no name or
// card number, so any PhilSys back looks like a match for any front. The QR,
// signed by the PSA, carries the holder's name and PCN, and ties the back
// photo to the front and to the name the resident registered.

/** The holder in a PhilSys QR payload, or null when the text is not one. */
export function parsePhilSysQr(text) {
  let payload;
  try {
    payload = JSON.parse(String(text ?? ""));
  } catch {
    return null;
  }
  const subject = payload?.subject ?? payload?.Subject;
  if (!subject || typeof subject !== "object") return null;
  const firstName = String(subject.fName ?? "").trim();
  const lastName = String(subject.lName ?? "").trim();
  const pcn = String(subject.PCN ?? "").replace(/\D/g, "");
  if (!firstName || !lastName || !pcn) return null;
  return { firstName, middleName: String(subject.mName ?? "").trim(), lastName, pcn };
}

// A phone photo's QR is often found at one scale and missed at another.
const SIZES = [1000, 1400, 800, 2000];

/** Finds and reads a PhilSys QR in an image, or returns null. */
export async function readPhilSysQr(bytes) {
  try {
    const sharp = (await import("sharp")).default;
    const tried = new Set();
    for (const size of SIZES) {
      const { data, info } = await sharp(bytes)
        .rotate()
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (tried.has(info.width)) continue;
      tried.add(info.width);
      const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height, { inversionAttempts: "dontInvert" });
      const holder = code ? parsePhilSysQr(code.data) : null;
      if (holder) return holder;
    }
  } catch {
    // An image sharp cannot read has no QR to offer; the caller decides.
  }
  return null;
}
