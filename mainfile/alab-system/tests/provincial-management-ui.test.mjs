import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial navigation layout includes reports, applications, and resident entries without static badge counts", () => {
  const layout = source("app/_components/provincial-bfp-layout.tsx");

  assert.match(layout, /\/provincial-bfp\/incident-reports/);
  assert.match(layout, /\/provincial-bfp\/resident-applications/);
  assert.match(layout, /\/provincial-bfp\/residents/);
  assert.match(layout, /\/provincial-bfp\/incidents/);
  assert.match(layout, /\/provincial-bfp\/reports/);

  // Assert no static badge counts
  assert.doesNotMatch(layout, /badge:\s*3/);
  assert.doesNotMatch(layout, /badge:\s*1/);
});

test("provincial management toolbar and hook provide shared filters and state management", () => {
  const toolbar = source("app/_components/provincial-management-toolbar.tsx");
  const hook = source("app/_components/use-provincial-management-list.ts");

  assert.match(toolbar, /export function ProvincialManagementToolbar/);
  assert.match(toolbar, /onFilterChange/);
  assert.match(hook, /export function useProvincialManagementList/);
  assert.match(hook, /setFilters/);
  assert.match(hook, /refresh/);
});

test("audit activity page loads real provincial audit logs from the database", () => {
  const page = source("app/provincial-bfp/audit-activity/page.tsx");
  assert.match(page, /api\/provincial-bfp\/audit-events/);
  assert.doesNotMatch(page, /culasi\.bfp@antique\.gov\.ph/);
  assert.doesNotMatch(page, /WS-ANT-003/);
});
