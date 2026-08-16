import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("the established resident report layout submits the selected photo and verified location through the report API", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /return <LegacyResidentReportFirePage \/>;/);
  assert.match(page, /initializeReportSubmission\(root\)/);
  assert.match(page, /fetch\("\/api\/resident\/fire-reports", \{ method: "POST", body: form \}\)/);
  assert.match(page, /form\.set\("latitude", locationLatitude\)/);
  assert.match(page, /form\.set\("photo", photoInput\.files\[0\]\)/);
});

test("resident report status uses the shared report surface and constrains private incident photos", () => {
  const status = readFileSync(join(root, "app", "_components", "resident-report-status.tsx"), "utf8");

  assert.match(status, /reportFireStyles/);
  assert.match(status, /className="report-page-root report-status-page"/);
  assert.match(status, /className="resident-report-photo"/);
  assert.match(status, /max-height:\s*clamp\(12rem, 52vw, 22rem\)/);
  assert.match(status, /object-fit:\s*cover/);
});
