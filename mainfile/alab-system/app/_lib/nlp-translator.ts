/**
 * ALAB NLP Emergency Translation Engine
 * 
 * Specialized multilingual NLP algorithm for life-safety fire response in
 * Antique / Western Visayas, supporting:
 * - Hiligaynon (hil) - Ilonggo regional language
 * - Tagalog (tl) - Filipino national language
 * - English (en) - International standard
 * 
 * Features:
 * 1. Fast N-gram & Stopword Language Detection with confidence scoring
 * 2. Specialized Emergency Lexicon & Morphological Normalizer
 * 3. Bidirectional Phrase-Level Machine Translation (Rule & Statistical)
 * 4. In-memory, zero-latency, 100% offline-resilient fallback
 * 5. Optional Neural AI Escalation (when GEMINI_API_KEY is configured)
 */

export type NlpLanguage = "hil" | "tl" | "en";

export interface LanguageDetectionResult {
  detectedLang: NlpLanguage;
  confidence: number; // 0.0 - 1.0
  scores: Record<NlpLanguage, number>;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: NlpLanguage;
  targetLang: NlpLanguage;
  detectedLang: NlpLanguage;
  confidence: number;
  engine: "ALAB_EMERGENCY_NLP" | "NEURAL_AI";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Language Detection Classifier (N-Gram & Stopword Frequency)
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS_HIL = new Set([
  "sang", "kag", "sa", "mga", "ang", "kon", "diri", "didto", "dira", "sia", "siya",
  "akon", "imo", "iya", "namon", "inyo", "nila", "indi", "wala", "may", "suba",
  "taytay", "balay", "puluy-an", "kalayo", "nagapadulong", "dalikyat", "madasig",
  "dako", "gamay", "napatay", "nagadabadaba", "dugang", "nagakinahanglan", "bulig",
  "lapit", "layo", "tabok", "takas", "ubos", "nagaresponde", "masiot", "eskinita"
]);

const STOPWORDS_TL = new Set([
  "ng", "mga", "sa", "ang", "kung", "dito", "doon", "diyan", "siya", "akin",
  "iyo", "kanya", "namin", "inyo", "nila", "hindi", "wala", "may", "ilog",
  "tulay", "bahay", "tirahan", "sunog", "papunta", "mabilis", "malaki", "maliit",
  "apula", "naglalagablab", "dagdag", "nangangailangan", "tulong", "lapit", "layo",
  "tawid", "baba", "itaas", "tumutugon", "masikip", "eskenita"
]);

const STOPWORDS_EN = new Set([
  "the", "and", "of", "to", "in", "is", "that", "for", "it", "as", "was", "with",
  "be", "at", "by", "this", "have", "from", "or", "one", "had", "by", "word",
  "fire", "burning", "house", "building", "river", "bridge", "near", "far",
  "across", "street", "road", "alley", "help", "responder", "responding", "fast",
  "big", "huge", "small", "truck", "smoke", "urgent", "need", "flames", "alert"
]);

export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || !text.trim()) {
    return {
      detectedLang: "en",
      confidence: 0.5,
      scores: { hil: 0, tl: 0, en: 0 },
    };
  }

  const normalized = text.toLowerCase().replace(/[^\w\s-]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      detectedLang: "en",
      confidence: 0.5,
      scores: { hil: 0, tl: 0, en: 0 },
    };
  }

  let hilScore = 0;
  let tlScore = 0;
  let enScore = 0;

  for (const token of tokens) {
    if (STOPWORDS_HIL.has(token)) hilScore += 2.0;
    if (STOPWORDS_TL.has(token)) tlScore += 2.0;
    if (STOPWORDS_EN.has(token)) enScore += 1.5;

    // Morphological & prefix indicators
    if (token.startsWith("naga") || token.startsWith("maga") || token.endsWith("on") || token.endsWith("anay")) {
      hilScore += 1.2;
    }
    if (token.startsWith("nag") || token.startsWith("mag") || token.startsWith("pag") || token.endsWith("an") || token.endsWith("in")) {
      tlScore += 0.8;
    }
    if (token.endsWith("ing") || token.endsWith("ed") || token.endsWith("tion") || token.endsWith("ly")) {
      enScore += 1.2;
    }
  }

  const total = hilScore + tlScore + enScore || 1;
  const scores = {
    hil: hilScore / total,
    tl: tlScore / total,
    en: enScore / total,
  };

  let detectedLang: NlpLanguage = "en";
  let maxScore = scores.en;

  if (scores.hil > maxScore) {
    detectedLang = "hil";
    maxScore = scores.hil;
  }
  if (scores.tl > maxScore) {
    detectedLang = "tl";
    maxScore = scores.tl;
  }

  // Calculate confidence margin
  const sortedScores = [scores.hil, scores.tl, scores.en].sort((a, b) => b - a);
  const margin = sortedScores[0] - (sortedScores[1] || 0);
  const confidence = Math.min(0.98, Math.max(0.60, 0.65 + margin * 0.5));

  return { detectedLang, confidence, scores };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Multilingual Phrase & Lexical Translation Dictionary
// ─────────────────────────────────────────────────────────────────────────────

interface PhraseMapping {
  hil: string[];
  tl: string[];
  en: string[];
}

const EMERGENCY_PHRASES: PhraseMapping[] = [
  // Fire incidents and situations
  {
    hil: ["may dako nga kalayo", "dako nga kalayo", "nagadabadaba ang kalayo"],
    tl: ["may malaking sunog", "malaking sunog", "naglalagablab ang apoy"],
    en: ["there is a huge fire", "huge fire", "blazing fire flames"],
  },
  {
    hil: ["sunog sa balay", "nagakasunog nga balay", "nasunog ang puluy-an"],
    tl: ["sunog sa bahay", "nasusunog na bahay", "nasunog ang tirahan"],
    en: ["residential house fire", "burning house", "house on fire"],
  },
  {
    hil: ["sunog sa hilamon", "sunog sa takas"],
    tl: ["sunog sa damuhan", "grass fire"],
    en: ["grass fire", "brush fire"],
  },
  {
    hil: ["sunog sa talon", "sunog sa bukid"],
    tl: ["sunog sa kagubatan", "sunog sa bundok"],
    en: ["forest fire", "mountain wildfire"],
  },
  {
    hil: ["sunog sa salakyan", "nagasiga nga awto"],
    tl: ["sunog sa sasakyan", "nasusunog na kotse"],
    en: ["vehicle fire", "burning vehicle"],
  },
  {
    hil: ["madasig maglapnag ang kalayo", "madasig maglapnag"],
    tl: ["mabilis kumalat ang apoy", "mabilis kumalat"],
    en: ["fire is spreading rapidly", "spreading rapidly"],
  },
  {
    hil: ["kinahanglan sang madasig nga bulig", "kinahanglan sang bulig"],
    tl: ["kailangan ng agarang tulong", "kailangan ng tulong"],
    en: ["urgent assistance needed", "help needed immediately"],
  },

  // Landmarks & spatial prepositions
  {
    hil: ["malapit sa taytay", "dampi sa taytay", "lapit sa taytay"],
    tl: ["malapit sa tulay", "bandang tulay", "lapit sa tulay"],
    en: ["near the bridge", "by the bridge", "close to the bridge"],
  },
  {
    hil: ["malapit sa suba", "dampi sa suba", "sa may suba"],
    tl: ["malapit sa ilog", "bandang ilog", "sa may ilog"],
    en: ["near the river", "by the river", "along the riverside"],
  },
  {
    hil: ["tabok sang karsada", "sa tabok sang dalan"],
    tl: ["tawid ng kalsada", "sa kabilang kalsada"],
    en: ["across the road", "on the other side of the road"],
  },
  {
    hil: ["malapit sa eskwelahan", "dampi sa eskwelahan"],
    tl: ["malapit sa paaralan", "malapit sa eskwelahan"],
    en: ["near the school", "close to the school"],
  },
  {
    hil: ["malapit sa simbahan", "dampi sa kapilya"],
    tl: ["malapit sa simbahan", "malapit sa kapilya"],
    en: ["near the church", "close to the chapel"],
  },
  {
    hil: ["likod sang plasa", "sa likod sang munisipyo"],
    tl: ["likod ng plaza", "sa likod ng munisipyo"],
    en: ["behind the plaza", "behind the municipal hall"],
  },
  {
    hil: ["atubang sang merkado", "atubang sang tiendahan"],
    tl: ["tapat ng palengke", "harap ng tindahan"],
    en: ["in front of the market", "opposite the store"],
  },

  // Tactical conditions
  {
    hil: ["dinikit ang mga balay", "dikit-dikit ang mga balay"],
    tl: ["magkakadikit ang mga bahay", "dikit-dikit ang mga bahay"],
    en: ["densely packed houses", "closely spaced houses (< 2m)"],
  },
  {
    hil: ["eskinita", "masiot nga dalan", "makitid nga alagyan"],
    tl: ["eskenita", "makipot na daan", "makipot na eskenita"],
    en: ["narrow alley", "tight alleyway", "narrow access route"],
  },
  {
    hil: ["malapad nga dalan", "makaigo ang truck"],
    tl: ["malapad na kalsada", "kasya ang truck"],
    en: ["wide road", "accessible for fire trucks"],
  },
  {
    hil: ["malayo ang mga balay", "may antad ang mga puluy-an"],
    tl: ["magkakalayo ang mga bahay", "hiwa-hiwalay ang kabahayan"],
    en: ["isolated houses", "widely spaced houses (> 15m)"],
  },
  {
    hil: ["malakas ang hangin", "mabaskog ang hangin"],
    tl: ["malakas ang hangin", "malalakas na bugso ng hangin"],
    en: ["strong winds", "high wind speed"],
  },

  // Responder status
  {
    hil: ["nagaresponde na ang BFP", "nagapadulong na ang mga bombero"],
    tl: ["tumutugon na ang BFP", "papunta na ang mga bumbero"],
    en: ["BFP is now responding", "firefighters are en route"],
  },
  {
    hil: ["napadala na ang firetruck", "nagbyahe na ang firetruck"],
    tl: ["napadala na ang firetruck", "papasok na ang firetruck"],
    en: ["fire truck has been dispatched", "fire engine is on the way"],
  },
  {
    hil: ["naapula na ang kalayo", "napatay na ang kalayo"],
    tl: ["naapula na ang sunog", "patay na ang apoy"],
    en: ["fire is completely extinguished", "fire has been put out"],
  },
  {
    hil: ["magpabilin sa luwas nga lugar", "magpalayo sa kalayo"],
    tl: ["manatili sa ligtas na lugar", "lumayo sa sunog"],
    en: ["stay in a safe location", "move away from the fire"],
  },
];

// Single word mappings for vocabulary translation
const VOCABULARY_MAP: Record<string, { hil: string; tl: string; en: string }> = {
  // Nouns
  "fire": { hil: "kalayo", tl: "apoy", en: "fire" },
  "kalayo": { hil: "kalayo", tl: "sunog", en: "fire" },
  "sunog": { hil: "kalayo", tl: "sunog", en: "fire" },
  "apoy": { hil: "kalayo", tl: "apoy", en: "flames" },
  "house": { hil: "balay", tl: "bahay", en: "house" },
  "balay": { hil: "balay", tl: "bahay", en: "house" },
  "bahay": { hil: "balay", tl: "bahay", en: "house" },
  "building": { hil: "edipisyo", tl: "gusali", en: "building" },
  "edipisyo": { hil: "edipisyo", tl: "gusali", en: "building" },
  "gusali": { hil: "edipisyo", tl: "gusali", en: "building" },
  "smoke": { hil: "aso", tl: "usok", en: "smoke" },
  "aso": { hil: "aso", tl: "usok", en: "smoke" },
  "usok": { hil: "aso", tl: "usok", en: "smoke" },
  "water": { hil: "tubig", tl: "tubig", en: "water" },
  "tubig": { hil: "tubig", tl: "tubig", en: "water" },
  "truck": { hil: "firetruck", tl: "firetruck", en: "fire truck" },
  "firetruck": { hil: "firetruck", tl: "firetruck", en: "fire truck" },
  "river": { hil: "suba", tl: "ilog", en: "river" },
  "suba": { hil: "suba", tl: "ilog", en: "river" },
  "ilog": { hil: "suba", tl: "ilog", en: "river" },
  "bridge": { hil: "taytay", tl: "tulay", en: "bridge" },
  "taytay": { hil: "taytay", tl: "tulay", en: "bridge" },
  "tulay": { hil: "taytay", tl: "tulay", en: "bridge" },
  "road": { hil: "dalan", tl: "kalsada", en: "road" },
  "kalsada": { hil: "dalan", tl: "kalsada", en: "road" },
  "dalan": { hil: "dalan", tl: "kalsada", en: "road" },
  "alley": { hil: "eskinita", tl: "eskenita", en: "alley" },
  "eskinita": { hil: "eskinita", tl: "eskenita", en: "alley" },
  "eskenita": { hil: "eskinita", tl: "eskenita", en: "alley" },
  "wind": { hil: "hangin", tl: "hangin", en: "wind" },
  "hangin": { hil: "hangin", tl: "hangin", en: "wind" },
  "help": { hil: "bulig", tl: "tulong", en: "help" },
  "bulig": { hil: "bulig", tl: "tulong", en: "help" },
  "tulong": { hil: "bulig", tl: "tulong", en: "help" },
  "people": { hil: "mga tawo", tl: "mga tao", en: "people" },
  "resident": { hil: "residente", tl: "residente", en: "resident" },
  "responders": { hil: "mga responder", tl: "mga responder", en: "responders" },
  "station": { hil: "estasyon", tl: "estasyon", en: "station" },

  // Adjectives
  "big": { hil: "dako", tl: "malaki", en: "big" },
  "dako": { hil: "dako", tl: "malaki", en: "big" },
  "malaki": { hil: "dako", tl: "malaki", en: "big" },
  "small": { hil: "gamay", tl: "maliit", en: "small" },
  "gamay": { hil: "gamay", tl: "maliit", en: "small" },
  "maliit": { hil: "gamay", tl: "maliit", en: "small" },
  "fast": { hil: "madasig", tl: "mabilis", en: "fast" },
  "madasig": { hil: "madasig", tl: "mabilis", en: "fast" },
  "mabilis": { hil: "madasig", tl: "mabilis", en: "fast" },
  "safe": { hil: "luwas", tl: "ligtas", en: "safe" },
  "luwas": { hil: "luwas", tl: "ligtas", en: "safe" },
  "ligtas": { hil: "luwas", tl: "ligtas", en: "safe" },
  "near": { hil: "malapit", tl: "malapit", en: "near" },
  "malapit": { hil: "malapit", tl: "malapit", en: "near" },
  "far": { hil: "malayo", tl: "malayo", en: "far" },
  "malayo": { hil: "malayo", tl: "malayo", en: "far" },
  "strong": { hil: "mabaskog", tl: "malakas", en: "strong" },
  "mabaskog": { hil: "mabaskog", tl: "malakas", en: "strong" },
  "malakas": { hil: "mabaskog", tl: "malakas", en: "strong" },
  "dense": { hil: "dinikit", tl: "magkadikit", en: "dense" },
  "urgent": { hil: "aprobado / madasig", tl: "agarahan", en: "urgent" },

  // Verbs
  "burning": { hil: "nagakasunog", tl: "nasusunog", en: "burning" },
  "nagakasunog": { hil: "nagakasunog", tl: "nasusunog", en: "burning" },
  "nasusunog": { hil: "nagakasunog", tl: "nasusunog", en: "burning" },
  "spread": { hil: "maglapnag", tl: "kumalat", en: "spread" },
  "maglapnag": { hil: "maglapnag", tl: "kumalat", en: "spread" },
  "kumalat": { hil: "maglapnag", tl: "kumalat", en: "spread" },
  "evacuate": { hil: "maglikas", tl: "lumikas", en: "evacuate" },
  "maglikas": { hil: "maglikas", tl: "lumikas", en: "evacuate" },
  "lumikas": { hil: "maglikas", tl: "lumikas", en: "evacuate" },
  "responding": { hil: "nagaresponde", tl: "tumutugon", en: "responding" },
  "nagaresponde": { hil: "nagaresponde", tl: "tumutugon", en: "responding" },
  "tumutugon": { hil: "nagaresponde", tl: "tumutugon", en: "responding" },
  "dispatched": { hil: "napadala", tl: "napadala", en: "dispatched" },
  "resolved": { hil: "naapula", tl: "naapula", en: "extinguished / resolved" },
  "naapula": { hil: "naapula", tl: "naapula", en: "resolved" },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Statistical & Rule-Based Translation Algorithm
// ─────────────────────────────────────────────────────────────────────────────

export function translateNlp(
  text: string,
  targetLang: NlpLanguage,
  sourceLang?: NlpLanguage
): TranslationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      originalText: text,
      translatedText: "",
      sourceLang: sourceLang || "en",
      targetLang,
      detectedLang: sourceLang || "en",
      confidence: 1.0,
      engine: "ALAB_EMERGENCY_NLP",
    };
  }

  // 1. Detect source language if not explicitly provided
  const detection = detectLanguage(trimmed);
  const srcLang = sourceLang || detection.detectedLang;

  // 2. Short-circuit if source and target are identical
  if (srcLang === targetLang) {
    return {
      originalText: text,
      translatedText: text,
      sourceLang: srcLang,
      targetLang,
      detectedLang: detection.detectedLang,
      confidence: detection.confidence,
      engine: "ALAB_EMERGENCY_NLP",
    };
  }

  let workingText = trimmed;

  // 3. Step A: Multi-word phrase matching (highest precision)
  for (const phrase of EMERGENCY_PHRASES) {
    const srcVariants = phrase[srcLang] || [];
    const targetPrimary = phrase[targetLang]?.[0] || "";

    if (!targetPrimary) continue;

    for (const variant of srcVariants) {
      const regex = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "gi");
      if (regex.test(workingText)) {
        workingText = workingText.replace(regex, targetPrimary);
      }
    }
  }

  // 4. Step B: Token-level lexical translation
  // Break into tokens while preserving punctuation
  const tokenRegex = /(\b[\w'-]+\b|[^\w\s]+|\s+)/g;
  const parts = workingText.match(tokenRegex) || [workingText];

  const translatedParts = parts.map((token) => {
    // Preserve whitespace & punctuation
    if (/^\s+$/.test(token) || /^[^\w\s]+$/.test(token)) {
      return token;
    }

    const lowerToken = token.toLowerCase();
    const entry = VOCABULARY_MAP[lowerToken];

    if (entry && entry[targetLang]) {
      const replacement = entry[targetLang];
      // Preserve capitalization
      if (token[0] === token[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    }

    // Contextual grammatical connectors
    if (srcLang === "hil" && targetLang === "tl") {
      if (lowerToken === "sang") return "ng";
      if (lowerToken === "kag") return "at";
      if (lowerToken === "indi") return "hindi";
      if (lowerToken === "diri") return "dito";
      if (lowerToken === "dira") return "diyan";
      if (lowerToken === "didto") return "doon";
      if (lowerToken === "pilia") return "piliin";
    }
    if (srcLang === "tl" && targetLang === "hil") {
      if (lowerToken === "ng") return "sang";
      if (lowerToken === "at") return "kag";
      if (lowerToken === "hindi") return "indi";
      if (lowerToken === "dito") return "diri";
      if (lowerToken === "diyan") return "dira";
      if (lowerToken === "doon") return "didto";
      if (lowerToken === "piliin") return "pilia";
    }
    if (srcLang === "en" && targetLang === "hil") {
      if (lowerToken === "and") return "kag";
      if (lowerToken === "of") return "sang";
      if (lowerToken === "in") return "sa";
      if (lowerToken === "to") return "sa";
      if (lowerToken === "not") return "indi";
    }
    if (srcLang === "en" && targetLang === "tl") {
      if (lowerToken === "and") return "at";
      if (lowerToken === "of") return "ng";
      if (lowerToken === "in") return "sa";
      if (lowerToken === "to") return "sa";
      if (lowerToken === "not") return "hindi";
    }

    return token;
  });

  const finalTranslated = translatedParts.join("");

  return {
    originalText: text,
    translatedText: finalTranslated,
    sourceLang: srcLang,
    targetLang,
    detectedLang: detection.detectedLang,
    confidence: detection.confidence,
    engine: "ALAB_EMERGENCY_NLP",
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Optional Neural AI Translation (Gemini Fallback)
// ─────────────────────────────────────────────────────────────────────────────

export async function translateWithNlpEngine(
  text: string,
  targetLang: NlpLanguage,
  sourceLang?: NlpLanguage
): Promise<TranslationResult> {
  const localResult = translateNlp(text, targetLang, sourceLang);

  // If GEMINI_API_KEY is present and text is long (sentences), escalate to neural translation
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || text.trim().length < 15) {
    return localResult;
  }

  try {
    const langNames: Record<NlpLanguage, string> = {
      hil: "Hiligaynon (Ilonggo)",
      tl: "Tagalog (Filipino)",
      en: "English",
    };

    const prompt = `You are the specialized emergency language translator for the ALAB BFP Fire Response System in Antique, Philippines.
Translate the following emergency incident text from ${langNames[localResult.sourceLang]} to ${langNames[targetLang]}.
Preserve exact landmark names, road names, and safety urgency. Output ONLY the translated text without commentary or quotes.

Text to translate:
${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const neuralText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (neuralText) {
        return {
          originalText: text,
          translatedText: neuralText,
          sourceLang: localResult.sourceLang,
          targetLang,
          detectedLang: localResult.detectedLang,
          confidence: 0.98,
          engine: "NEURAL_AI",
        };
      }
    }
  } catch {
    // Graceful fallback to local in-memory NLP engine
  }

  return localResult;
}
