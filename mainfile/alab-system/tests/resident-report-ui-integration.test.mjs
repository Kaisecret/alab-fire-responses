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
  assert.match(status, /Status Timeline/);
  assert.match(status, /Latest Update from Municipal BFP/);
  assert.match(status, /\/images\/fire logo\.webp/);
});

test("resident reports keep the established report cards while loading live API data", () => {
  const reportsPage = read("app/resident/reports/page.tsx");

  assert.match(reportsPage, /import \{ reportsStyles \} from "\.\.\/\.\.\/_content\/resident-reports-content"/);
  assert.match(reportsPage, /fetch\("\/api\/resident\/fire-reports"\)/);
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
  assert.match(status, /View incident photo/);
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
  assert.match(page, /if \(!fireType\) \{/);

  // Photo required
  assert.match(content, /REQUIRED · AT LEAST 1 PHOTO/);
  assert.match(content, /data-photo-required-dialog/);
  assert.match(page, /totalPhotos === 0/);
  assert.match(page, /showPhotoWarning\(\)/);

  // Tulong sa responders: Opsyonal word removed
  assert.match(status, /Tulong sa Responders\s*<\/h2>/);
  assert.doesNotMatch(status, /Tulong sa Responders \(Opsyonal\)/);
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

