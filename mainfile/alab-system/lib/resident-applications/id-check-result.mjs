import { matchRegisteredName } from "./id-name-match.mjs";

// Turns the model's reading of an uploaded file into a pass/fail decision.
// The model only describes the image; the name comparison and the final
// decision happen here, in code that cannot be talked out of a mismatch.

const QUALITY_MESSAGES = {
  BLURRY: "Your ID photo is blurry. Retake it in focus and upload again.",
  TOO_DARK: "Your ID photo is too dark. Retake it in good light and upload again.",
  CROPPED: "Part of your ID is cut off. Show the whole card and upload again.",
  GLARE: "Glare is hiding details on your ID. Retake it without reflections.",
  UNREADABLE: "We could not read your ID. Upload a clearer photo of the card.",
};

function display(parts) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function interpretIdCheck(result, registered) {
  if (!result || typeof result !== "object") {
    return { ok: false, code: "SERVICE_UNAVAILABLE", message: "ID checking is unavailable right now. Please try again in a moment." };
  }
  if (result.is_identification_document !== true) {
    return {
      ok: false,
      code: "NOT_AN_ID",
      message: "This file is not a valid ID. Upload a photo of your ID card, such as a PhilSys ID, driver's license, passport or UMID.",
    };
  }
  const quality = String(result.image_quality ?? "UNREADABLE").toUpperCase();
  if (quality !== "GOOD" || result.name_readable !== true) {
    return { ok: false, code: "UNREADABLE", message: QUALITY_MESSAGES[quality] ?? QUALITY_MESSAGES.UNREADABLE };
  }
  const detected = {
    fullName: String(result.full_name ?? ""),
    firstName: String(result.first_name ?? ""),
    middleName: String(result.middle_name ?? ""),
    lastName: String(result.last_name ?? ""),
  };
  const detectedName = detected.fullName.trim() || display([detected.firstName, detected.middleName, detected.lastName]);
  if (!detectedName) {
    return { ok: false, code: "NAME_NOT_FOUND", message: "We could not find a name on this ID. Upload a clearer photo of the front of your ID." };
  }
  if (!matchRegisteredName(registered, detected).match) {
    return {
      ok: false,
      code: "NAME_MISMATCH",
      detectedName,
      message: `The name on your ID (${detectedName}) does not match the name you entered (${display([registered?.firstName, registered?.lastName])}).`,
    };
  }
  return { ok: true, code: "VERIFIED", detectedName, documentType: String(result.document_type ?? "ID").slice(0, 80) };
}
