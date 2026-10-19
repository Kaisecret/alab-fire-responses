import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const TITLE = "A GIS-Based Provincial Inter-Municipal Fire Response and Decision Support System for BFP Antique";
const read = (path) => readFileSync(path, "utf8");
const landing = async () => (await import("../app/_content/landing-content.ts")).landingMarkup;

test("the landing page carries the official title of the system", async () => {
  const markup = await landing();
  assert.match(markup, new RegExp(`<p class="hero__copy">\\s*${TITLE}\\.\\s*</p>`));
  assert.match(markup, new RegExp(`ALAB · ${TITLE}`));
  assert.doesNotMatch(markup, /Smart Dispatch and Inter-Municipality Coordination for BFP in Antique/);
});

test("the hero's first button opens How to Use instead of jumping to a report section", async () => {
  const markup = await landing();
  const hero = markup.slice(markup.indexOf('<div class="hero__actions">'), markup.indexOf("</div>", markup.indexOf('<div class="hero__actions">')));
  assert.match(hero, /<button type="button" class="button button--primary" data-how-to-use aria-haspopup="dialog">/);
  assert.match(hero, /<span>HOW TO USE<\/span>/);
  assert.doesNotMatch(markup, /REPORT A FIRE/);
});

test("the landing page no longer describes the resident app as coming soon or out of scope", async () => {
  const markup = await landing();
  assert.doesNotMatch(markup, /coming soon/i);
  assert.doesNotMatch(markup, /Demonstration links only/);
  assert.doesNotMatch(markup, /future Citizen Emergency Application/);
  assert.doesNotMatch(markup, /preliminary severity/);
  assert.match(markup, /Level of Danger/);
  // Barangay officials do not sign in to ALAB; the four roles that do remain.
  assert.doesNotMatch(markup, /Barangay officials/);
  assert.equal((markup.match(/<article class="access-role">/g) ?? []).length, 4);
  assert.doesNotMatch(markup, /across the Philippines/);
});

test("every How to Use trigger opens the same dialog", async () => {
  const markup = await landing();
  // The hero button, the report section button, and the footer link.
  assert.equal((markup.match(/data-how-to-use/g) ?? []).length, 3);
  const page = read("app/_components/landing-page.tsx");
  assert.match(page, /querySelectorAll\("\[data-how-to-use\]"\)/);
  assert.match(page, /new Event\(OPEN_HOW_TO_USE\)/);
  assert.match(page, /<LandingHowToUse \/>/);
});

test("How to Use shows a video slot, the resident steps, and sign-up and login links", async () => {
  const dialog = read("app/_components/landing-how-to-use.tsx");
  const { HOW_TO_USE_STEPS, HOW_TO_USE_VIDEO_SRC } = await import("../app/_components/landing-how-to-use-content.ts");
  assert.equal(HOW_TO_USE_VIDEO_SRC, "", "no video yet: the dialog shows its placeholder");
  assert.deepEqual(HOW_TO_USE_STEPS.map((step) => step.title), [
    "Create your resident account",
    "Wait for Municipal BFP approval",
    "Log in to the resident app",
    "Report a fire and follow its status",
  ]);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /Video coming soon/);
  assert.match(dialog, /<video[^>]*src=\{HOW_TO_USE_VIDEO_SRC\}/);
  assert.match(dialog, /href="\/resident\/signup"/);
  assert.match(dialog, /href="\/resident\/login"/);
  assert.match(dialog, /event\.key === "Escape"/);
});
