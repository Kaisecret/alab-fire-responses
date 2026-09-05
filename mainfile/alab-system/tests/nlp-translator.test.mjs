import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("ALAB NLP module and files exist and export required algorithms", async () => {
  const libPath = join(appRoot, "app", "_lib", "nlp-translator.ts");
  const apiPath = join(appRoot, "app", "api", "nlp", "translate", "route.ts");
  const compPath = join(appRoot, "app", "_components", "nlp-emergency-translator.tsx");

  assert.ok(existsSync(libPath), "app/_lib/nlp-translator.ts must exist");
  assert.ok(existsSync(apiPath), "app/api/nlp/translate/route.ts must exist");
  assert.ok(existsSync(compPath), "app/_components/nlp-emergency-translator.tsx must exist");

  const libSource = readFileSync(libPath, "utf8");
  assert.match(libSource, /export function detectLanguage/);
  assert.match(libSource, /export function translateNlp/);
  assert.match(libSource, /export async function translateWithNlpEngine/);
  assert.match(libSource, /EMERGENCY_PHRASES/);
  assert.match(libSource, /VOCABULARY_MAP/);
});

test("Language detection algorithm accurately distinguishes Hiligaynon, Tagalog, and English", async () => {
  const { detectLanguage } = await import("../app/_lib/nlp-translator.ts");

  // Hiligaynon emergency phrases with regional markers
  const hilPhrase = "Diri dampi sa may suba malapit sa taytay nasunog ang balay kag puluy-an.";
  const hilResult = detectLanguage(hilPhrase);
  assert.equal(hilResult.detectedLang, "hil");
  assert.ok(hilResult.confidence >= 0.7, `Hiligaynon confidence should be >= 0.7, got ${hilResult.confidence}`);

  // Tagalog emergency phrases
  const tlPhrase = "Mabilis kumalat ang apoy sa eskenita kailangan ng dagdag na tulong sa mga residente.";
  const tlResult = detectLanguage(tlPhrase);
  assert.equal(tlResult.detectedLang, "tl");
  assert.ok(tlResult.confidence >= 0.7, `Tagalog confidence should be >= 0.7, got ${tlResult.confidence}`);

  // English emergency phrases
  const enPhrase = "Densely packed houses burning near the river bridge, firefighters are responding.";
  const enResult = detectLanguage(enPhrase);
  assert.equal(enResult.detectedLang, "en");
  assert.ok(enResult.confidence >= 0.7, `English confidence should be >= 0.7, got ${enResult.confidence}`);
});

test("NLP Machine Translation translates Hiligaynon emergency phrases to Tagalog and English", async () => {
  const { translateNlp } = await import("../app/_lib/nlp-translator.ts");

  // Hiligaynon ➔ English
  const hilInput = "may dako nga kalayo malapit sa taytay";
  const toEn = translateNlp(hilInput, "en", "hil");
  assert.equal(toEn.sourceLang, "hil");
  assert.equal(toEn.targetLang, "en");
  assert.match(toEn.translatedText.toLowerCase(), /fire/);
  assert.match(toEn.translatedText.toLowerCase(), /bridge/);

  // Hiligaynon ➔ Tagalog
  const toTl = translateNlp("dinikit ang mga balay kag may suba", "tl", "hil");
  assert.equal(toTl.targetLang, "tl");
  assert.match(toTl.translatedText.toLowerCase(), /bahay/);
  assert.match(toTl.translatedText.toLowerCase(), /ilog/);
});

test("NLP Machine Translation translates Tagalog emergency phrases to Hiligaynon and English", async () => {
  const { translateNlp } = await import("../app/_lib/nlp-translator.ts");

  // Tagalog ➔ Hiligaynon
  const tlInput = "malaking sunog sa bahay malapit sa tulay";
  const toHil = translateNlp(tlInput, "hil", "tl");
  assert.equal(toHil.targetLang, "hil");
  assert.match(toHil.translatedText.toLowerCase(), /kalayo|balay|taytay/);

  // Tagalog ➔ English
  const toEn = translateNlp("makipot na eskenita at kailangan ng tulong", "en", "tl");
  assert.equal(toEn.targetLang, "en");
  assert.match(toEn.translatedText.toLowerCase(), /alley|help/);
});

test("NLP Machine Translation translates English emergency phrases to Hiligaynon and Tagalog", async () => {
  const { translateNlp } = await import("../app/_lib/nlp-translator.ts");

  // English ➔ Hiligaynon
  const enInput = "burning house near the river";
  const toHil = translateNlp(enInput, "hil", "en");
  assert.equal(toHil.targetLang, "hil");
  assert.match(toHil.translatedText.toLowerCase(), /balay|suba/);

  // English ➔ Tagalog
  const toTl = translateNlp("burning house near the river", "tl", "en");
  assert.equal(toTl.targetLang, "tl");
  assert.match(toTl.translatedText.toLowerCase(), /bahay|ilog/);
});

test("NLP Translator handles identity translation and empty string safely", async () => {
  const { translateNlp } = await import("../app/_lib/nlp-translator.ts");

  const identity = translateNlp("Same language text", "en", "en");
  assert.equal(identity.translatedText, "Same language text");

  const empty = translateNlp("", "hil");
  assert.equal(empty.translatedText, "");
});

test("Resident report details and guide page integrate ALAB NLP emergency translator", () => {
  const statusPath = join(appRoot, "app", "_components", "resident-report-status.tsx");
  const guidePagePath = join(appRoot, "app", "resident", "guide", "page.tsx");

  const statusSource = readFileSync(statusPath, "utf8");
  const guidePageSource = readFileSync(guidePagePath, "utf8");

  // Report status contains NLP triggers
  assert.match(statusSource, /translateNlp/);
  assert.match(statusSource, /landmarkNlpLang/);
  assert.match(statusSource, /bfpMsgNlpLang/);
  assert.match(statusSource, /nlp-micro-trigger/);
  assert.match(statusSource, /nlp-micro-bubble/);

  // Guide page embeds NlpEmergencyTranslator
  assert.match(guidePageSource, /NlpEmergencyTranslator/);
});
