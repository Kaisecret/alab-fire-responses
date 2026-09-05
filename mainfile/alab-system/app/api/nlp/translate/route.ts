import { NextResponse } from "next/server";
import {
  translateWithNlpEngine,
  detectLanguage,
  type NlpLanguage,
} from "../../../_lib/nlp-translator";

export const dynamic = "force-dynamic";

const VALID_LANGS = new Set<NlpLanguage>(["hil", "tl", "en"]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text, targetLang, sourceLang } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Text to translate is required." },
        { status: 400 }
      );
    }

    if (!targetLang || !VALID_LANGS.has(targetLang)) {
      return NextResponse.json(
        { error: "Valid targetLang ('hil' | 'tl' | 'en') is required." },
        { status: 400 }
      );
    }

    if (sourceLang && !VALID_LANGS.has(sourceLang)) {
      return NextResponse.json(
        { error: "sourceLang must be one of 'hil', 'tl', or 'en' if provided." },
        { status: 400 }
      );
    }

    const result = await translateWithNlpEngine(
      text,
      targetLang,
      sourceLang as NlpLanguage | undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[NLP_TRANSLATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process translation request." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text") || "";

  const detection = detectLanguage(text);
  return NextResponse.json({
    text,
    detection,
  });
}
