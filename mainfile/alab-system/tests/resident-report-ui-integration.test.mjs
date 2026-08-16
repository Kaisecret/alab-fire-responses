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

test("resident report status uses the shared report surface for live status data", () => {
  const status = readFileSync(join(root, "app", "_components", "resident-report-status.tsx"), "utf8");

  assert.match(status, /reportFireStyles/);
  assert.match(status, /className="report-page-root report-status-page"/);
  assert.match(status, /className="report-page-root report-status-page"/);
});

test("resident reports keep the established report cards while loading live API data", () => {
  const reportsPage = read("app/resident/reports/page.tsx");

  assert.match(reportsPage, /import \{ reportsStyles \} from "\.\.\/\.\.\/_content\/resident-reports-content"/);
  assert.match(reportsPage, /fetch\("\/api\/resident\/fire-reports"\)/);
  assert.match(reportsPage, /className="mobile-reports-list"/);
  assert.match(reportsPage, /mobile-report-card/);
  assert.match(reportsPage, /className="reports-table-card"/);
  assert.doesNotMatch(reportsPage, /style=\{\{display:"block",padding:"1rem"/);
});

test("incident photos open in a controlled dialog instead of expanding in the report view", () => {
  const status = read("app/_components/resident-report-status.tsx");

  assert.match(status, /useState\(false\)/);
  assert.match(status, /View incident photo/);
  assert.match(status, /role="dialog"/);
  assert.match(status, /className="resident-photo-dialog"/);
  assert.match(status, /resident-photo-dialog-image/);
});
