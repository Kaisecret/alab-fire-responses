import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { RESIDENT_GUIDE_TEXT } from "../app/_content/resident-guide-text.ts";
import { RESIDENT_TEXT } from "../app/_content/resident-text.ts";

/*
 * Switching the resident language must change every word on screen, not only
 * the headings. Each screen routes its text through tx("English"), so every
 * English phrase it uses needs a Tagalog and a Hiligaynon entry.
 */
const SCREENS = [
  ["app/_components/resident-guide-page.tsx", RESIDENT_GUIDE_TEXT],
  ["app/_components/resident-report-status.tsx", RESIDENT_TEXT],
  ["app/_components/resident-pwa.tsx", RESIDENT_TEXT],
  ["app/_components/resident-selfie-capture.tsx", RESIDENT_TEXT],
  ["app/_components/resident-profile-photo-editor.tsx", RESIDENT_TEXT],
  ["app/resident/application/page.tsx", RESIDENT_TEXT],
  ["app/resident/reports/page.tsx", RESIDENT_TEXT],
];

const phrases = (source) => [...source.matchAll(/\btx\(("(?:[^"\\]|\\.)*")\)/g)].map((match) => JSON.parse(match[1]));

/*
 * The home, report and profile screens are HTML templates. Their text is
 * switched in the browser by English wording, so every phrase in them needs
 * an entry too. Sample data the script replaces, language names, and the
 * dialog text the form script rewrites from its own dictionary are exempt.
 */
const TEMPLATE_EXEMPT = new Set([
  "Welcome, Resident Name", "San Jose", "Barangay 8", "Aug 2, 2025", "11:05 AM", "&bull;", "•",
  "Latitude -- | Longitude --", "Tagalog", "Filipino", "Hiligaynon", "Ilonggo / Panay", "English", "Default",
  "© 2024 ALAB - BFP Antique.",
  "• Pumili ng kahit isa (Select at least 1)", "Kailangan ng Larawan",
  "Mag-attach ng kahit 1 larawan ng sunog bago ipadala ang alert.", "Kumpirmahin ang Fire Alert",
  "⚠️ BABALA SA FALSE ALARM:", "Ang pagpapadala ng", "pekeng ulat o false alarm ay may karampatang parusa at pagkakakulong",
  "GPS location at device details", "Oo, Ipadala ang Alert", "sa ilalim ng batas. Naka-record ang iyong eksaktong",
  "na matutunton ng BFP at kapulisan.",
]);

function templateText(path, exportName) {
  const source = readFileSync(path, "utf8");
  const head = `export const ${exportName} = \``;
  const body = source.slice(source.indexOf(head) + head.length);
  const markup = body.slice(0, body.indexOf("`;")).replace(/<svg[\s\S]*?<\/svg>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "");
  const decode = (text) => text.replace(/&middot;/g, "·").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  const found = new Set();
  for (const [, attrs, text] of markup.matchAll(/<[a-z0-9]+([^>]*)>([^<]*)/gi)) {
    const clean = decode(text.replace(/\s+/g, " "));
    if (/[A-Za-z]{2,}/.test(clean) && !/data-i18n=/.test(attrs)) found.add(clean);
    for (const [, value] of attrs.matchAll(/\b(?:placeholder|aria-label|title|alt)="([^"]*)"/g)) {
      if (/[A-Za-z]{3,}/.test(value)) found.add(decode(value));
    }
  }
  for (const [, text] of markup.matchAll(/<\/[a-z0-9]+>([^<]+)</gi)) {
    const clean = decode(text.replace(/\s+/g, " "));
    if (/[A-Za-z]{2,}/.test(clean)) found.add(clean);
  }
  return [...found].filter((text) => !TEMPLATE_EXEMPT.has(text));
}

for (const [path, exportName] of [
  ["app/_content/resident-home-content.ts", "homeMarkup"],
  ["app/_content/resident-report-fire-content.ts", "reportFireMarkup"],
  ["app/_content/resident-profile-content.ts", "profileMarkup"],
]) {
  test(`${exportName} has Tagalog and Hiligaynon for every phrase`, () => {
    const missing = templateText(path, exportName).filter((english) => !RESIDENT_TEXT[english]);
    assert.deepEqual(missing, [], `${path} has phrases with no translation`);
  });
}

for (const [path, dictionary] of SCREENS) {
  test(`${path} has Tagalog and Hiligaynon for every phrase`, () => {
    const used = phrases(readFileSync(path, "utf8"));
    assert.ok(used.length > 0, `${path} routes its text through tx()`);
    const missing = used.filter((english) => !dictionary[english]?.tl || !dictionary[english]?.hil);
    assert.deepEqual([...new Set(missing)], [], `${path} has phrases with no translation`);
  });
}
