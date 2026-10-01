import { matchRegisteredName } from "./id-name-match.mjs";

// Turns the model's reading of the uploaded ID into a pass/fail decision.
// The model only describes the images; the name comparison and the final
// decision happen here, in code that cannot be talked out of a mismatch.

const QUALITY_MESSAGES = {
  BLURRY: "Your ID photo is blurry. Retake it in focus and upload again.",
  TOO_DARK: "Your ID photo is too dark. Retake it in good light and upload again.",
  CROPPED: "Part of your ID is cut off. Show the whole card and upload again.",
  GLARE: "Glare is hiding details on your ID. Retake it without reflections.",
  UNREADABLE: "We could not read your ID. Upload a clearer photo of the card.",
};

const BACK_QUALITY_MESSAGES = {
  BLURRY: "The back of your ID is blurry. Retake it in focus.",
  TOO_DARK: "The back of your ID is too dark. Retake it in good light.",
  CROPPED: "Part of the back of your ID is cut off. Show the whole card.",
  GLARE: "Glare is hiding details on the back of your ID. Retake it.",
  UNREADABLE: "We could not read the back of your ID. Upload a clearer photo.",
};

const TAMPERED_MESSAGE = "This ID looks edited or altered. Upload a photo of your original, unedited ID card.";

function display(parts) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function quality(value) {
  return String(value ?? "UNREADABLE").toUpperCase();
}

/**
 * @param result  the model's JSON reading ({ front, back, back_matches_front })
 * @param registered  { firstName, lastName } typed by the resident
 * @param options  { hasBack } whether a back photo was uploaded
 */
export function interpretIdCheck(result, registered, options = {}) {
  const front = result?.front;
  if (!result || typeof result !== "object" || !front || typeof front !== "object") {
    return { ok: false, side: "front", code: "SERVICE_UNAVAILABLE", message: "ID checking is unavailable right now. Please try again in a moment." };
  }
  if (front.is_identification_document !== true) {
    return {
      ok: false,
      side: "front",
      code: "NOT_AN_ID",
      message: "This file is not a valid ID. Upload a photo of your ID card, such as a PhilSys ID, driver's license, passport or UMID.",
    };
  }
  if (front.edit_suspected === true) {
    return { ok: false, side: "front", code: "TAMPERED", message: TAMPERED_MESSAGE };
  }
  const frontQuality = quality(front.image_quality);
  if (frontQuality !== "GOOD" || front.name_readable !== true) {
    return { ok: false, side: "front", code: "UNREADABLE", message: QUALITY_MESSAGES[frontQuality] ?? QUALITY_MESSAGES.UNREADABLE };
  }
  const detected = {
    fullName: String(front.full_name ?? ""),
    firstName: String(front.first_name ?? ""),
    middleName: String(front.middle_name ?? ""),
    lastName: String(front.last_name ?? ""),
  };
  const detectedName = detected.fullName.trim() || display([detected.firstName, detected.middleName, detected.lastName]);
  if (!detectedName) {
    return { ok: false, side: "front", code: "NAME_NOT_FOUND", message: "We could not find a name on this ID. Upload a clearer photo of the front of your ID." };
  }
  if (!matchRegisteredName(registered, detected).match) {
    return {
      ok: false,
      side: "front",
      code: "NAME_MISMATCH",
      detectedName,
      message: `The name on your ID (${detectedName}) does not match the name you entered (${display([registered?.firstName, registered?.lastName])}).`,
    };
  }
  const documentType = String(front.document_type ?? "ID").slice(0, 80);

  // The front passed. The back is required and must belong to the same card.
  if (!options.hasBack) {
    return { ok: false, side: "back", code: "BACK_REQUIRED", frontVerified: true, detectedName, documentType, message: "Front checked. Now upload the back of the same ID." };
  }
  const back = result.back;
  if (!back || typeof back !== "object" || back.is_back_of_identification_document !== true) {
    return { ok: false, side: "back", code: "BACK_NOT_ID", frontVerified: true, detectedName, message: "This photo is not the back of an ID card. Upload the back of the same ID." };
  }
  if (back.edit_suspected === true) {
    return { ok: false, side: "back", code: "TAMPERED", frontVerified: true, detectedName, message: TAMPERED_MESSAGE };
  }
  const backQuality = quality(back.image_quality);
  if (backQuality !== "GOOD") {
    return { ok: false, side: "back", code: "UNREADABLE", frontVerified: true, detectedName, message: BACK_QUALITY_MESSAGES[backQuality] ?? BACK_QUALITY_MESSAGES.UNREADABLE };
  }
  if (result.back_matches_front !== true) {
    return {
      ok: false,
      side: "back",
      code: "BACK_MISMATCH",
      frontVerified: true,
      detectedName,
      message: "The front and back do not belong to the same ID. Upload both sides of one card.",
    };
  }
  return { ok: true, code: "VERIFIED", detectedName, documentType };
}
