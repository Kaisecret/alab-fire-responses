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

// The only IDs accepted at registration, with the label saved on the account.
// The model names the type; whether it is accepted is decided here.
export const ACCEPTED_ID_TYPES = {
  PHILSYS_ID: "PhilSys National ID",
  PASSPORT: "Philippine Passport",
  DRIVERS_LICENSE: "LTO Driver's License",
  UMID: "UMID Card",
  PRC_ID: "PRC ID",
  SSS_ID: "SSS ID",
  GSIS_ID: "GSIS ID",
  POSTAL_ID: "Postal ID",
  VOTERS_ID: "Voter's ID",
  SENIOR_CITIZEN_ID: "Senior Citizen ID",
  PWD_ID: "PWD ID",
  TIN_ID: "TIN ID",
  OFW_ID: "OWWA / OFW ID",
  IBP_ID: "IBP ID",
  SEAFARERS_BOOK: "Seafarer's Record Book",
};

// Types the model can name that are real IDs but not on the accepted list.
export const REFUSED_ID_TYPES = ["STUDENT_ID", "COMPANY_ID", "BARANGAY_ID", "PHILHEALTH_ID", "PAGIBIG_ID", "OTHER_ID"];

const ACCEPTED_LIST = "a PhilSys ID, passport, driver's license, UMID, PRC, SSS, GSIS, postal, voter's, senior citizen, PWD, TIN, OFW or IBP ID";

const REFUSED_MESSAGES = {
  STUDENT_ID: `School and student IDs are not accepted. Upload a government ID such as ${ACCEPTED_LIST}.`,
  COMPANY_ID: `Company IDs are not accepted. Upload a government ID such as ${ACCEPTED_LIST}.`,
};
const REFUSED_MESSAGE = `This type of ID is not accepted. Upload a government ID such as ${ACCEPTED_LIST}.`;

function display(parts) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** Two card numbers from different cards; one or two misread digits are allowed. */
function differentNumbers(a, b) {
  if (a.length < 12 || a.length !== b.length) return false;
  let differ = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
  return differ > 2;
}

function quality(value) {
  return String(value ?? "UNREADABLE").toUpperCase();
}

/**
 * @param result  the model's JSON reading ({ front, back, back_matches_front })
 * @param registered  { firstName, lastName } typed by the resident
 * @param options  { hasBack, qr } whether a back photo was uploaded, and the
 *                 PhilSys QR holder read from the back or front ({ back, front })
 */
export function interpretIdCheck(result, registered, options = {}) {
  const front = result?.front;
  if (!result || typeof result !== "object" || !front || typeof front !== "object") {
    return { ok: false, side: "front", code: "SERVICE_UNAVAILABLE", message: "ID checking is unavailable right now. Please try again in a moment." };
  }
  const idType = String(front.id_type ?? "").toUpperCase();
  const frontQuality = quality(front.image_quality);
  if (front.shows_back_side === true && idType && idType !== "NOT_AN_ID") {
    return { ok: false, side: "front", code: "WRONG_SIDE", message: "This is the back of your ID. Upload the front, with your photo and name, here." };
  }
  if (front.is_identification_document !== true || idType === "NOT_AN_ID") {
    // Too blurry, dark or glary to tell what it is: ask for a better photo first.
    if (["BLURRY", "TOO_DARK", "GLARE"].includes(frontQuality)) {
      return { ok: false, side: "front", code: "UNREADABLE", message: QUALITY_MESSAGES[frontQuality] };
    }
    return {
      ok: false,
      side: "front",
      code: "NOT_AN_ID",
      message: "This photo is not an ID. Upload a clear photo of your government ID, such as a PhilSys ID, driver's license, passport or UMID.",
    };
  }
  if (!Object.hasOwn(ACCEPTED_ID_TYPES, idType)) {
    return { ok: false, side: "front", code: "ID_NOT_ACCEPTED", message: REFUSED_MESSAGES[idType] ?? REFUSED_MESSAGE };
  }
  if (front.edit_suspected === true) {
    return { ok: false, side: "front", code: "TAMPERED", message: TAMPERED_MESSAGE };
  }
  if (frontQuality !== "GOOD" || front.name_readable !== true) {
    return { ok: false, side: "front", code: "UNREADABLE", message: QUALITY_MESSAGES[frontQuality] ?? QUALITY_MESSAGES.UNREADABLE };
  }
  // Every accepted ID carries a number; one that cannot be read means the photo is too blurry.
  if (!String(front.id_number ?? "").trim()) {
    return { ok: false, side: "front", code: "UNREADABLE", message: "We could not read the ID number. Retake a sharp, close photo of your ID and upload again." };
  }
  const detected = {
    fullName: String(front.full_name ?? ""),
    firstName: String(front.first_name ?? ""),
    middleName: String(front.middle_name ?? ""),
    lastName: String(front.last_name ?? ""),
  };
  // Shown as "given middle surname" from the separate fields; the model's full_name order varies.
  const detectedName = (detected.lastName.trim() && display([detected.firstName, detected.middleName, detected.lastName])) || detected.fullName.trim() || display([detected.firstName, detected.middleName, detected.lastName]);
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
  const documentType = ACCEPTED_ID_TYPES[idType];

  // The front passed. The back is required and must belong to the same card.
  if (!options.hasBack) {
    return { ok: false, side: "back", code: "BACK_REQUIRED", frontVerified: true, detectedName, documentType, message: "Front checked. Now upload the back of the same ID." };
  }
  const back = result.back;
  if (back && typeof back === "object" && back.shows_front_side === true) {
    return { ok: false, side: "back", code: "BACK_NOT_ID", frontVerified: true, detectedName, message: "This is the front of an ID. Upload the back of the same ID here." };
  }
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
  // A PhilSys back prints no name or number, so its QR has to prove the card.
  let qrProvesBack = false;
  if (idType === "PHILSYS_ID") {
    const qr = options.qr?.back ?? options.qr?.front ?? null;
    if (!qr) {
      return { ok: false, side: "back", code: "UNREADABLE", frontVerified: true, detectedName, message: "We could not read the QR code on your PhilSys ID. Retake the back closer and in focus, with the whole QR code showing." };
    }
    if (!matchRegisteredName(registered, qr).match) {
      return { ok: false, side: "back", code: "BACK_MISMATCH", frontVerified: true, detectedName, message: "The QR code on this back belongs to a different person. Upload the back of your own ID." };
    }
    if (differentNumbers(digits(front.id_number), digits(qr.pcn))) {
      return { ok: false, side: "back", code: "BACK_MISMATCH", frontVerified: true, detectedName, message: "The back is from a different card than the front. Upload both sides of one card." };
    }
    qrProvesBack = Boolean(options.qr?.back);
  }
  if (result.back_matches_front !== true && !qrProvesBack) {
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
