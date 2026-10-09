"use client";

import { getStoredLanguage, useResidentLanguage, type ResidentLanguage } from "./resident-i18n";

/**
 * Resident screen text, keyed by its English wording. English is shown as
 * written; Tagalog and Hiligaynon come from the dictionary.
 */
export type ResidentTextDictionary = Record<string, { tl: string; hil: string }>;

/** Text with a number or name inside it, matched by pattern rather than exactly. */
export type ResidentTextPattern = [RegExp, (match: RegExpMatchArray) => { tl: string; hil: string }];

const LANGUAGE_EVENT = "alab:resident-language-changed";

export function translateResidentText(
  dictionary: ResidentTextDictionary,
  english: string,
  lang: ResidentLanguage,
  patterns: readonly ResidentTextPattern[] = [],
): string {
  if (lang === "en") return english;
  const exact = dictionary[english]?.[lang];
  if (exact) return exact;
  for (const [pattern, words] of patterns) {
    const match = english.match(pattern);
    if (match) return words(match)[lang];
  }
  return english;
}

function known(dictionary: ResidentTextDictionary, english: string, patterns: readonly ResidentTextPattern[]) {
  return Boolean(dictionary[english]) || patterns.some(([pattern]) => pattern.test(english));
}

/** Returns a function that puts English text into the resident's language. */
export function useResidentText(dictionary: ResidentTextDictionary, patterns: readonly ResidentTextPattern[] = []) {
  const { lang } = useResidentLanguage();
  return (english: string) => translateResidentText(dictionary, english, lang, patterns);
}

const TRANSLATED_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"] as const;
const originalText = new WeakMap<Text, string>();

/**
 * Switches a server-built HTML block between languages. Each text node and
 * labelled attribute remembers its English, so switching back restores it.
 * Text the page script writes later in English is picked up the same way.
 */
export function translateResidentMarkup(
  root: ParentNode,
  lang: ResidentLanguage,
  dictionary: ResidentTextDictionary,
  patterns: readonly ResidentTextPattern[] = [],
) {
  if (typeof document === "undefined") return;
  const say = (english: string) => translateResidentText(dictionary, english, lang, patterns);
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      return parent && !parent.closest("script, style") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const current = node.nodeValue ?? "";
    const remembered = originalText.get(node);
    // A script may have written new English into the node since it was translated.
    const english = remembered !== undefined && current === remembered.replace(remembered.trim(), say(remembered.trim()))
      ? remembered
      : current;
    const key = english.trim();
    if (!key || !known(dictionary, key, patterns)) continue;
    originalText.set(node, english);
    const next = english.replace(key, say(key));
    if (next !== current) node.nodeValue = next;
  }
  root.querySelectorAll<HTMLElement>(TRANSLATED_ATTRIBUTES.map((name) => `[${name}]`).join(",")).forEach((element) => {
    for (const name of TRANSLATED_ATTRIBUTES) {
      const current = element.getAttribute(name);
      if (!current) continue;
      const stored = element.getAttribute(`data-en-${name}`);
      const english = stored !== null && current === say(stored) ? stored : current.trim();
      if (!known(dictionary, english, patterns)) continue;
      if (stored !== english) element.setAttribute(`data-en-${name}`, english);
      const next = say(english);
      if (next !== current) element.setAttribute(name, next);
    }
  });
}

/**
 * Keeps a server-built HTML block in the resident's language: now, whenever
 * the language changes, and whenever the page script writes new text into it.
 * Returns a function that stops watching.
 */
export function watchResidentMarkup(
  root: HTMLElement,
  dictionary: ResidentTextDictionary,
  patterns: readonly ResidentTextPattern[] = [],
): () => void {
  const options: MutationObserverInit = {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...TRANSLATED_ATTRIBUTES],
  };
  let observer: MutationObserver | null = null;
  const apply = () => {
    observer?.disconnect();
    translateResidentMarkup(root, getStoredLanguage(), dictionary, patterns);
    observer?.takeRecords();
    observer?.observe(root, options);
  };
  observer = new MutationObserver(apply);
  apply();
  window.addEventListener(LANGUAGE_EVENT, apply);
  return () => {
    observer?.disconnect();
    observer = null;
    window.removeEventListener(LANGUAGE_EVENT, apply);
  };
}
