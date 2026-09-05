"use client";

import { useState, useTransition } from "react";
import type { NlpLanguage, TranslationResult } from "../_lib/nlp-translator";

const SAMPLE_PHRASES = [
  {
    lang: "hil",
    label: "Hiligaynon (Landmark & River)",
    text: "Diri dampi sa may suba malapit sa taytay nasunog ang balay.",
  },
  {
    lang: "tl",
    label: "Tagalog (Alley & Fast Spread)",
    text: "Mabilis kumalat ang apoy sa eskenita kailangan ng dagdag na firetruck.",
  },
  {
    lang: "en",
    label: "English (Dense Houses & Evacuation)",
    text: "Densely packed houses burning near the church, please evacuate.",
  },
];

export function NlpEmergencyTranslator({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputText, setInputText] = useState("");
  const [targetLang, setTargetLang] = useState<NlpLanguage>("en");
  const [sourceLang, setSourceLang] = useState<NlpLanguage | "auto">("auto");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/nlp/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: inputText,
            targetLang,
            sourceLang: sourceLang === "auto" ? undefined : sourceLang,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Translation failed.");
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error translating text.");
      }
    });
  };

  const handleSwap = () => {
    if (!result) return;
    setInputText(result.translatedText);
    const newTarget = result.sourceLang;
    setTargetLang(newTarget);
    setSourceLang(result.targetLang);
    setResult(null);
  };

  const copyResult = () => {
    if (!result?.translatedText) return;
    navigator.clipboard.writeText(result.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="nlp-translator-wrapper" aria-label="ALAB NLP Language Translator">
      <style>{`
        .nlp-translator-card {
          background: #ffffff;
          border: 1.5px solid #E2E8F0;
          border-radius: 1.15rem;
          padding: 1.35rem 1.4rem;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          margin-bottom: 1.5rem;
          font-family: inherit;
        }
        .nlp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          margin-bottom: 1rem;
        }
        .nlp-header-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .nlp-header-title h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.01em;
        }
        .nlp-ai-badge {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .nlp-toggle-btn {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 0.6rem;
          padding: 0.35rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .nlp-toggle-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
        .nlp-controls-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.9rem;
        }
        .nlp-lang-select {
          width: 100%;
          padding: 0.5rem 0.7rem;
          border-radius: 0.65rem;
          border: 1.5px solid #CBD5E1;
          background: #F8FAFC;
          font-size: 0.82rem;
          font-weight: 700;
          color: #1E293B;
          cursor: pointer;
        }
        .nlp-swap-btn {
          width: 2.3rem;
          height: 2.3rem;
          border-radius: 50%;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #475569;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-size: 0.95rem;
          transition: all 0.15s ease;
        }
        .nlp-swap-btn:hover {
          border-color: #DC2626;
          color: #DC2626;
          transform: rotate(180deg);
        }
        .nlp-textarea {
          width: 100%;
          min-height: 80px;
          padding: 0.75rem 0.9rem;
          border: 1.5px solid #E2E8F0;
          border-radius: 0.85rem;
          font-family: inherit;
          font-size: 0.88rem;
          color: #0F172A;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s;
        }
        .nlp-textarea:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
        }
        .nlp-presets-label {
          font-size: 0.74rem;
          font-weight: 750;
          color: #64748B;
          margin: 0.6rem 0 0.4rem;
        }
        .nlp-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.85rem;
        }
        .nlp-preset-pill {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 999px;
          padding: 0.3rem 0.65rem;
          font-size: 0.73rem;
          font-weight: 650;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .nlp-preset-pill:hover {
          background: #FEE2E2;
          border-color: #FECACA;
          color: #DC2626;
        }
        .nlp-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.6rem;
          margin-top: 0.6rem;
        }
        .nlp-translate-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #DC2626;
          color: #FFFFFF;
          border: none;
          border-radius: 0.75rem;
          padding: 0.6rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
          transition: all 0.15s ease;
        }
        .nlp-translate-btn:hover {
          background: #B91C1C;
          transform: translateY(-1px);
        }
        .nlp-translate-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .nlp-result-box {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 0.85rem;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          position: relative;
        }
        .nlp-result-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          font-weight: 750;
          color: #64748B;
          margin-bottom: 0.45rem;
        }
        .nlp-result-text {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 650;
          color: #0F172A;
          line-height: 1.45;
        }
        .nlp-copy-btn {
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 0.5rem;
          padding: 0.25rem 0.55rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .nlp-copy-btn:hover {
          border-color: #DC2626;
          color: #DC2626;
        }
        .nlp-error-msg {
          margin-top: 0.6rem;
          color: #DC2626;
          font-size: 0.78rem;
          font-weight: 700;
        }
      `}</style>

      <div className="nlp-translator-card">
        <div className="nlp-header">
          <div className="nlp-header-title">
            <i className="fa-solid fa-language" style={{ color: "#DC2626", fontSize: "1.25rem" }} />
            <div>
              <h3>ALAB NLP Emergency Translator</h3>
              <small style={{ color: "#64748B", fontSize: "0.74rem" }}>
                Trilingual Machine Translation for Hiligaynon, Tagalog & English
              </small>
            </div>
            <span className="nlp-ai-badge">NLP Algorithm</span>
          </div>
          <button
            type="button"
            className="nlp-toggle-btn"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
          >
            {isOpen ? "▲ Itago / Hide" : "▼ Buksan / Open"}
          </button>
        </div>

        {isOpen && (
          <div className="nlp-body">
            <div className="nlp-controls-row">
              <select
                className="nlp-lang-select"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as any)}
                aria-label="Source Language"
              >
                <option value="auto">✨ Auto-Detect Language</option>
                <option value="hil">Hiligaynon (Ilonggo)</option>
                <option value="tl">Tagalog (Filipino)</option>
                <option value="en">English</option>
              </select>

              <button
                type="button"
                className="nlp-swap-btn"
                onClick={handleSwap}
                title="Swap Languages"
                aria-label="Swap Languages"
              >
                ⇄
              </button>

              <select
                className="nlp-lang-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as NlpLanguage)}
                aria-label="Target Language"
              >
                <option value="en">English</option>
                <option value="tl">Tagalog (Filipino)</option>
                <option value="hil">Hiligaynon (Ilonggo)</option>
              </select>
            </div>

            <textarea
              className="nlp-textarea"
              placeholder="I-type o i-paste ang landmark, sitwasyon sang sunog, ukon mensahe..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
            />

            <div className="nlp-presets-label">Subukan ang mga sample ng emergency:</div>
            <div className="nlp-presets">
              {SAMPLE_PHRASES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="nlp-preset-pill"
                  onClick={() => {
                    setInputText(sample.text);
                    setSourceLang(sample.lang as NlpLanguage);
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="nlp-actions">
              <button
                type="button"
                className="nlp-translate-btn"
                onClick={handleTranslate}
                disabled={isPending || !inputText.trim()}
              >
                <i className="fa-solid fa-wand-magic-sparkles" />
                <span>{isPending ? "Translating..." : "Translate with NLP"}</span>
              </button>
            </div>

            {error && <p className="nlp-error-msg">{error}</p>}

            {result && (
              <div className="nlp-result-box" role="status">
                <div className="nlp-result-meta">
                  <span>
                    Detected: <strong>{result.detectedLang.toUpperCase()}</strong> (
                    {Math.round(result.confidence * 100)}% confidence) · Engine:{" "}
                    <strong>{result.engine}</strong>
                  </span>
                  <button type="button" className="nlp-copy-btn" onClick={copyResult}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p className="nlp-result-text">{result.translatedText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
