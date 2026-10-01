import { interpretIdCheck } from "./id-check-result.mjs";

/*
 * Reads an uploaded ID with Gemini. The model only describes the image (is it
 * an ID, is it readable, what name is printed); interpretIdCheck makes the
 * decision. The key stays on the server in GEMINI_API_KEY.
 */

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Tried in order when the main model is overloaded or out of quota, so a busy
// model does not stop sign-ups. Each model has its own quota.
const DEFAULT_FALLBACK_MODELS = "gemini-3.1-flash-lite,gemini-flash-latest";
const ATTEMPT_TIMEOUT_MS = 30_000;
const TOTAL_BUDGET_MS = 55_000;

export type IdCheckCode =
  | "VERIFIED" | "NOT_AN_ID" | "UNREADABLE" | "NAME_NOT_FOUND" | "NAME_MISMATCH" | "TAMPERED"
  | "BACK_REQUIRED" | "BACK_NOT_ID" | "BACK_MISMATCH" | "SERVICE_UNAVAILABLE";

export type IdCheckOutcome =
  | { ok: true; code: "VERIFIED"; detectedName: string; documentType: string }
  | { ok: false; side: "front" | "back"; code: Exclude<IdCheckCode, "VERIFIED">; message: string; detectedName?: string; frontVerified?: boolean };

const INSTRUCTIONS = `You check identification documents uploaded during a resident registration in the Philippines.
Image 1 is the FRONT of the uploaded ID. Image 2, when present, is the BACK. Report only what you see; do not guess or invent text.

For "front":
- is_identification_document: true only for an identification card that identifies a person, such as a PhilSys/national ID, driver's license, passport, UMID, SSS, PhilHealth, Pag-IBIG, postal ID, voter's ID, PRC ID, senior citizen or PWD ID, barangay ID, company or school ID card. False for certificates, receipts, school records, medical documents, letters, screenshots of apps, random photos, or anything that is not an ID.
- image_quality: GOOD only when the card is sharp, evenly and brightly lit, fully inside the frame and every printed detail is easy to read. Use TOO_DARK for an underexposed or dim photo even if some text can still be made out, BLURRY for any noticeable blur, CROPPED if any edge of the card is cut off, GLARE if reflections hide details, otherwise UNREADABLE.
- name_readable: true only if the holder's name can be read with confidence.
- full_name, first_name, middle_name, last_name: the holder's name exactly as printed (empty strings if not readable). For "SURNAME, GIVEN NAMES" formats, split accordingly.
- id_number: the ID or card number exactly as printed, or an empty string.
- document_type: a short label such as "PhilSys ID" or "Driver's License".
- edit_suspected: true when there are visible signs the card was edited or forged: a name, number or date in a different font, size, weight, spacing or colour than the rest of the card; text that is misaligned, floating, pasted over or overlapping the printed design; smudged, blurred or blocky patches around the name, number or photo; a background pattern that breaks around a field; a photo pasted onto the card; a digital template, mock-up, "SAMPLE"/"SPECIMEN" card, screenshot or a photo of a screen or printout instead of a physical card. False when the card looks like an untouched original. Only report clear visible evidence.
- edit_evidence: one short sentence describing what looks edited, or an empty string.

For "back" (when Image 2 is present; otherwise set booleans to false and strings to empty):
- is_back_of_identification_document: true only if Image 2 is the reverse side of an identification card.
- image_quality, edit_suspected and edit_evidence: as for the front.
- id_number and name: as printed on the back, or empty strings.

back_matches_front: true only when Image 2 is the back of the same card as Image 1: the same card type and issuer design, and any ID number, name or birth date printed on both sides agree. False if they look like different cards or any shared detail differs. False when there is no Image 2.
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
        document_type: { type: "STRING" },
        ...SIDE_PROPERTIES,
        name_readable: { type: "BOOLEAN" },
        full_name: { type: "STRING" },
        first_name: { type: "STRING" },
        middle_name: { type: "STRING" },
        last_name: { type: "STRING" },
      },
      required: ["is_identification_document", "document_type", "image_quality", "edit_suspected", "edit_evidence", "id_number", "name_readable", "full_name", "first_name", "middle_name", "last_name"],
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
  return interpretIdCheck(reading, { firstName: input.firstName, lastName: input.lastName }, { hasBack: Boolean(input.back) }) as IdCheckOutcome;
}
