import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

test("the established resident report layout submits the selected photo and verified location through the report API", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /return <LegacyResidentReportFirePage \/>;/);
  assert.match(page, /initializeReportSubmission\(root\)/);
  assert.match(page, /fetch\("\/api\/resident\/fire-reports", \{ method: "POST", body: form \}\)/);
  assert.match(page, /form\.set\("latitude", locationLatitude\)/);
  assert.match(page, /form\.set\("photo", photoInput\.files\[0\]\)/);
});

test("resident report status uses the established report detail screen for live status data", () => {
  const status = readFileSync(join(root, "app", "_components", "resident-report-status.tsx"), "utf8");

  assert.match(status, /resident-report-detail/);
  assert.match(status, /\/images\/fire logo\.webp/);
  // Where the report stands is the first card, before the danger level,
  // and BFP's latest message is shown inside it.
  const statusAt = status.indexOf('className={`rrs-status tone-');
  assert.ok(statusAt > 0, "status card exists");
  assert.ok(statusAt < status.indexOf("rrs-danger ${level}"), "status comes before the danger level");
  assert.match(status, /latest\?\.resident_message \|\| view\.message/);
  assert.match(status, /className="rrs-track"/);
});

test("resident reports keep the established report cards while loading live API data", () => {
  const reportsPage = read("app/resident/reports/page.tsx");

  assert.match(reportsPage, /import \{ reportsStyles \} from "\.\.\/\.\.\/_content\/resident-reports-content"/);
  assert.match(reportsPage, /fetch\("\/api\/resident\/fire-reports", \{ cache: "no-store" \}\)/);
  assert.match(reportsPage, /className="mobile-reports-list"/);
  assert.match(reportsPage, /mobile-report-card/);
  assert.match(reportsPage, /className="reports-table-card"/);
  assert.match(reportsPage, /\/images\/fire logo\.webp/);
  assert.match(reportsPage, /resident-fire-logo/);
  assert.doesNotMatch(reportsPage, /style=\{\{display:"block",padding:"1rem"/);
});

test("resident reports center the full workspace on desktop without changing mobile rules", () => {
  const reportsPage = read("app/resident/reports/page.tsx");

  assert.match(reportsPage, /@media \(min-width: 951px\)/);
  assert.match(reportsPage, /\.reports-main-layout \{ max-width: 1200px; margin: 0 auto; grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(reportsPage, /@media \(max-width: 950px\)/);
});

test("resident report View details links do not inherit browser underlining", () => {
  const reportStyles = read("app/_content/resident-reports-content.ts");

  assert.match(reportStyles, /\.view-details-btn \{[^}]*text-decoration: none;/);
});

test("incident photos open in a controlled dialog instead of expanding in the report view", () => {
  const status = read("app/_components/resident-report-status.tsx");

  assert.match(status, /useState\(false\)/);
  // Tapping a thumbnail opens the viewer.
  assert.match(status, /aria-haspopup="dialog"\s*aria-label=\{`Open photo \$\{idx \+ 1\}`\}/);
  assert.match(status, /role="dialog"/);
  assert.match(status, /className="resident-photo-dialog"/);
  assert.match(status, /resident-photo-dialog-image/);
});

test("resident fire report requires user selection for burning type and requires at least 1 photo", () => {
  const content = read("app/_content/resident-report-fire-content.ts");
  const page = read("app/resident/report-fire/page.tsx");
  const status = read("app/_components/resident-report-status.tsx");

  // Fire type is not preselected
  assert.doesNotMatch(content, /class="type-btn selected" data-fire-type="HOUSE_BUILDING"/);
  assert.match(content, /data-fire-type-hint/);
  assert.match(page, /if \(fireTypes\.length === 0\) \{/);

  // Photo required
  assert.match(content, /REQUIRED · AT LEAST 1 PHOTO/);
  assert.match(content, /data-photo-required-dialog/);
  assert.match(page, /totalPhotos === 0/);
  assert.match(page, /showPhotoWarning\(\)/);

  // The house material is asked in "Situation at the scene", only for a
  // burning house, and sent with the report; nothing is asked afterwards.
  assert.match(content, /data-quick-material="LIGHT_MATERIALS"/);
  assert.match(content, /data-quick-material="MIXED_SEMI_CONCRETE"/);
  assert.match(content, /data-quick-material="COMMERCIAL_STORAGE"/);
  assert.match(page, /materialGroup\.hidden = !houseBurning/);
  assert.match(page, /form\.set\('structureMaterial', selectedMaterial\)/);
  assert.doesNotMatch(status, /Tulong sa Responders|help-responders/);
});

test("resident fire report triggers confirmation popup with false alarm warning before sending alert", () => {
  const content = read("app/_content/resident-report-fire-content.ts");
  const page = read("app/resident/report-fire/page.tsx");

  assert.match(content, /data-confirm-alert-dialog/);
  assert.match(content, /BABALA SA FALSE ALARM/);
  assert.match(content, /GPS location at device details/);
  assert.match(content, /data-confirm-alert-send/);
  assert.match(content, /data-confirm-alert-cancel/);
  assert.match(page, /showConfirmDialog\(\)/);
  assert.match(page, /executeFinalSubmission/);
  assert.match(page, /data-confirm-alert-send/);
  assert.match(page, /data-confirm-alert-cancel/);
});


test("the report detail shows the danger level with icons and asks nothing more of the resident", () => {
  const status = read("app/_components/resident-report-status.tsx");
  // One icon per level, a four-step meter and an icon for each reason.
  for (const level of ["LOW", "MODERATE", "HIGH", "CRITICAL"]) assert.match(status, new RegExp(`${level}: "fa-`));
  assert.match(status, /className="rrs-meter"/);
  assert.match(status, /factorIcon\(factor\)/);
  // No "Help responders" prompt or buttons once the report is sent.
  assert.doesNotMatch(status, /help-responders|rrs-jump/);
});

test("the report form points to Situation at the scene when it opens below the fold", () => {
  const page = read("app/resident/report-fire/page.tsx");
  assert.match(page, /'\[data-quick-tactical-row\]'/);
  assert.match(page, /new MutationObserver\(update\)/);
  assert.match(page, /'Situation at the scene'/);
  assert.match(page, /situationRow\.scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  const content = read("app/_content/resident-report-fire-content.ts");
  assert.doesNotMatch(content, /🏘️|🚶/, "drawn icons, not emoji, in the situation choices");
});
