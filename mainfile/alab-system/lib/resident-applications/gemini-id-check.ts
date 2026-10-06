import { ACCEPTED_ID_TYPES, REFUSED_ID_TYPES, interpretIdCheck } from "./id-check-result.mjs";

/*
 * Reads an uploaded ID with Gemini. The model only describes the image (is it
 * an ID, which kind, is it readable, what name is printed); interpretIdCheck
 * makes the decision. The key stays on the server in GEMINI_API_KEY.
 */

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Tried in order when the main model is overloaded or out of quota, so a busy
// model does not stop sign-ups. Each model has its own quota.
const DEFAULT_FALLBACK_MODELS = "gemini-3.1-flash-lite,gemini-flash-latest";
const ATTEMPT_TIMEOUT_MS = 30_000;
const TOTAL_BUDGET_MS = 55_000;

export type IdCheckCode =
  | "VERIFIED" | "NOT_AN_ID" | "ID_NOT_ACCEPTED" | "WRONG_SIDE" | "UNREADABLE" | "NAME_NOT_FOUND" | "NAME_MISMATCH" | "TAMPERED"
  | "BACK_REQUIRED" | "BACK_NOT_ID" | "BACK_MISMATCH" | "SERVICE_UNAVAILABLE";

export type IdCheckOutcome =
  | { ok: true; code: "VERIFIED"; detectedName: string; documentType: string }
  | { ok: false; side: "front" | "back"; code: Exclude<IdCheckCode, "VERIFIED">; message: string; detectedName?: string; frontVerified?: boolean };

const INSTRUCTIONS = `You check identification documents uploaded during a resident registration in the Philippines.
Image 1 is the FRONT of the uploaded ID. Image 2, when present, is the BACK. Report only what you see; do not guess or invent text.

For "front":
- is_identification_document: true only when Image 1 is a real photo or scan of one person's identification document (a card, a passport or seaman's book data page, or a paper ePhilID or voter's certification). False for screenshots of apps or websites, dashboards, UI designs, collages, posters, mock-ups, drawings, AI-generated or illustrated images, selfies, people, objects, scenery, receipts, certificates of other kinds, letters, school or medical records, and anything else that is not an ID.
- id_type: which ID it is. Accepted government IDs:
  PHILSYS_ID (PhilSys / Philippine National ID, including the paper ePhilID and the Digital National ID from the eGovPH app), PASSPORT (DFA Philippine passport), DRIVERS_LICENSE (LTO driver's license or student permit), UMID (Unified Multi-Purpose ID), PRC_ID (Professional Regulation Commission ID), SSS_ID, GSIS_ID, POSTAL_ID (PHLPost postal ID), VOTERS_ID (COMELEC voter's ID or voter's certification), SENIOR_CITIZEN_ID (OSCA / LGU senior citizen ID), PWD_ID (NCDA / LGU persons with disability ID), TIN_ID (BIR taxpayer ID), OFW_ID (OWWA / iDOLE / OFW e-card), IBP_ID (Integrated Bar of the Philippines ID), SEAFARERS_BOOK (MARINA seafarer's record book).
  Other IDs: STUDENT_ID (any school, college or university ID, including student IDs), COMPANY_ID (employee or office ID), BARANGAY_ID, PHILHEALTH_ID, PAGIBIG_ID, OTHER_ID (any other ID card).
  NOT_AN_ID whenever is_identification_document is false.
- shows_back_side: true when Image 1 is the back of an ID (for example a QR code, issue date or return address with no holder photo and name) instead of the front.
- image_quality: GOOD only when the document is in focus, well lit, fully inside the frame and the name, ID number and other printed details are sharp and easy to read. Slight phone-camera grain or a small tilt are still GOOD. BLURRY when blur, motion or soft focus makes any letters fuzzy or smeared. TOO_DARK for an underexposed or dim photo even if some text can still be made out. CROPPED if any edge of the document is cut off. GLARE if reflections hide details. Otherwise UNREADABLE.
- name_readable: true only if the holder's name can be read with confidence.
- full_name, first_name, middle_name, last_name: the holder's name exactly as printed (empty strings if not readable). For "SURNAME, GIVEN NAMES" formats, split accordingly.
- id_number: the ID, card, license, passport or PCN number exactly as printed, or an empty string if it cannot be read with confidence.
- edit_suspected: true when there are visible signs the document was edited or forged: a name, number or date in a different font, size, weight, spacing or colour than the rest; text that is misaligned, floating, pasted over or overlapping the printed design; smudged, blurred or blocky patches around the name, number or photo; a background pattern that breaks around a field; a photo pasted onto the card; a digital template, mock-up, "SAMPLE"/"SPECIMEN" card, screenshot or a photo of a screen or printout instead of the original. The official paper ePhilID and the Digital National ID shown in the eGovPH app are originals in that form and are not signs of editing by themselves. False when the document looks like an untouched original. Normal wear, scratches, fading, laminate texture, glare, camera grain, JPEG compression, resizing and a tilted angle are NOT signs of editing. Only report clear visible evidence.
- edit_evidence: one short sentence describing what looks edited, or an empty string.

For "back" (when Image 2 is present; otherwise set booleans to false and strings to empty):
- is_back_of_identification_document: true only if Image 2 is the reverse side of an identification card, or for a passport, seafarer's record book or paper document, another page or the reverse of the same document.
- image_quality, edit_suspected and edit_evidence: as for the front.
- id_number and name: as printed on the back, or empty strings.

back_matches_front: true only when Image 2 is the back of the same document as Image 1: the same ID type and issuer design, and any ID number, name or birth date printed on both sides agree. False if they look like different documents or any shared detail differs. False when there is no Image 2.
reason: one short sentence explaining the overall result.`;

const SIDE_PROPERTIES = {
  image_quality: { type: "STRING", enum: ["GOOD", "BLURRY", "TOO_DARK", "CROPPED", "GLARE", "UNREADABLE"] },
  edit_suspected: { type: "BOOLEAN" },
  edit_evidence: { type: "STRING" },
  id_number: { type: "STRING" },
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    front: {
      type: "OBJECT",
      properties: {
        is_identification_document: { type: "BOOLEAN" },
        id_type: { type: "STRING", enum: [...Object.keys(ACCEPTED_ID_TYPES), ...REFUSED_ID_TYPES, "NOT_AN_ID"] },
        shows_back_side: { type: "BOOLEAN" },
        ...SIDE_PROPERTIES,
        name_readable: { type: "BOOLEAN" },
        full_name: { type: "STRING" },
        first_name: { type: "STRING" },
        middle_name: { type: "STRING" },
        last_name: { type: "STRING" },
      },
      required: ["is_identification_document", "id_type", "shows_back_side", "image_quality", "edit_suspected", "edit_evidence", "id_number", "name_readable", "full_name", "first_name", "middle_name", "last_name"],
    },
    back: {
      type: "OBJECT",
      properties: {
        is_back_of_identification_document: { type: "BOOLEAN" },
        ...SIDE_PROPERTIES,
        name: { type: "STRING" },
      },
      required: ["is_back_of_identification_document", "image_quality", "edit_suspected", "edit_evidence", "id_number", "name"],
    },
    back_matches_front: { type: "BOOLEAN" },
    reason: { type: "STRING" },
  },
  required: ["front", "back", "back_matches_front", "reason"],
};

type IdImage = { data: Buffer; mimeType: string };

async function readIdImages(front: IdImage, back: IdImage | null): Promise<Record<string, unknown> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS)
    .split(",").map((model) => model.trim()).filter((model) => model && model !== primary);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [{
      role: "user",
      parts: [
        { text: "Image 1 (front):" },
        { inlineData: { mimeType: front.mimeType, data: front.data.toString("base64") } },
        ...(back ? [{ text: "Image 2 (back):" }, { inlineData: { mimeType: back.mimeType, data: back.data.toString("base64") } }] : []),
        { text: back ? "Check both sides of this ID." : "Check the front of this ID. There is no Image 2." },
      ],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      // Low thinking keeps a scan to seconds; reading an ID needs little reasoning.
      thinkingConfig: { thinkingLevel: "low" },
    },
  });
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  // A busy (503) model gets one more try after a pause; an exhausted quota
  // (429) will not recover in seconds, so that skips straight to the fallbacks.
  const attempts: Array<{ model: string; waitMs: number; retryOfBusy?: boolean }> = [
    { model: primary, waitMs: 0 },
    { model: primary, waitMs: 1_500, retryOfBusy: true },
    ...fallbacks.map((model) => ({ model, waitMs: 0 })),
  ];
  let lastStatus = 0;
  for (const attempt of attempts) {
    if (attempt.retryOfBusy && lastStatus !== 503) continue;
    if (attempt.waitMs) await new Promise((resolve) => setTimeout(resolve, attempt.waitMs));
    const remaining = deadline - Date.now();
    if (remaining < 3_000) break;
    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(attempt.model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      });
      lastStatus = response.status;
      if (response.status === 429 || response.status >= 500) {
        console.warn("Gemini ID check busy", attempt.model, response.status);
        continue;
      }
      if (!response.ok) {
        console.error("Gemini ID check refused", attempt.model, response.status, (await response.text()).slice(0, 300));
        continue;
      }
      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      return JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      console.error("Gemini ID check attempt failed", attempt.model, error instanceof Error ? error.name : error);
    }
  }
  return null;
}

export async function checkIdWithGemini(input: {
  front: IdImage;
  back: IdImage | null;
  firstName: string;
  lastName: string;
}): Promise<IdCheckOutcome> {
  const reading = await readIdImages(input.front, input.back);
  const outcome = interpretIdCheck(reading, { firstName: input.firstName, lastName: input.lastName }, { hasBack: Boolean(input.back) }) as IdCheckOutcome;
  if (!outcome.ok && outcome.code === "TAMPERED") {
    // What the model saw, so a wrongly rejected genuine ID can be investigated.
    const side = (reading?.[outcome.side] ?? {}) as { edit_evidence?: unknown };
    console.warn("ID check flagged as edited", { side: outcome.side, evidence: String(side.edit_evidence ?? "").slice(0, 200) });
  }
  return outcome;
}
