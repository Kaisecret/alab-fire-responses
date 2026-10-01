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

export type IdCheckOutcome =
  | { ok: true; code: "VERIFIED"; detectedName: string; documentType: string }
  | { ok: false; code: "NOT_AN_ID" | "UNREADABLE" | "NAME_NOT_FOUND" | "NAME_MISMATCH" | "SERVICE_UNAVAILABLE"; message: string; detectedName?: string };

const INSTRUCTIONS = `You check identification documents uploaded during a resident registration in the Philippines.
Look only at the attached image and report what you see. Do not guess or invent text.
- is_identification_document: true only for an identification card or ID document that identifies a person, such as a PhilSys/national ID, driver's license, passport, UMID, SSS, PhilHealth, Pag-IBIG, postal ID, voter's ID, PRC ID, senior citizen or PWD ID, barangay ID, company or school ID card. False for certificates, receipts, school records, medical documents, letters, screenshots of apps, random photos, or anything that is not an ID.
- image_quality: GOOD only when the card is sharp, evenly and brightly lit, fully inside the frame and every printed detail is easy to read. Use TOO_DARK for an underexposed or dim photo even if some text can still be made out, BLURRY for any noticeable blur, CROPPED if any edge of the card is cut off, GLARE if reflections hide details, otherwise UNREADABLE.
- name_readable: true only if the holder's name can be read with confidence.
- full_name, first_name, middle_name, last_name: the holder's name exactly as printed (empty strings if not readable). For "SURNAME, GIVEN NAMES" formats, split accordingly.
- document_type: a short label such as "PhilSys ID" or "Driver's License".
- reason: one short sentence explaining the result.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_identification_document: { type: "BOOLEAN" },
    document_type: { type: "STRING" },
    image_quality: { type: "STRING", enum: ["GOOD", "BLURRY", "TOO_DARK", "CROPPED", "GLARE", "UNREADABLE"] },
    name_readable: { type: "BOOLEAN" },
    full_name: { type: "STRING" },
    first_name: { type: "STRING" },
    middle_name: { type: "STRING" },
    last_name: { type: "STRING" },
    reason: { type: "STRING" },
  },
  required: ["is_identification_document", "document_type", "image_quality", "name_readable", "full_name", "first_name", "middle_name", "last_name", "reason"],
};

async function readIdImage(image: Buffer, mimeType: string): Promise<Record<string, unknown> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS)
    .split(",").map((model) => model.trim()).filter((model) => model && model !== primary);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: "Check this uploaded file." }] }],
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
  image: Buffer;
  mimeType: string;
  firstName: string;
  lastName: string;
}): Promise<IdCheckOutcome> {
  const reading = await readIdImage(input.image, input.mimeType);
  return interpretIdCheck(reading, { firstName: input.firstName, lastName: input.lastName }) as IdCheckOutcome;
}
