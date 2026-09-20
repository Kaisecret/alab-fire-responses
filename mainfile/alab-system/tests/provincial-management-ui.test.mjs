import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial navigation layout includes reports and applications without static badge counts or deprecated resident tab", () => {
  const layout = source("app/_components/provincial-bfp-layout.tsx");

  assert.match(layout, /\/provincial-bfp\/incident-reports/);
  assert.match(layout, /\/provincial-bfp\/resident-applications/);
  assert.doesNotMatch(layout, /\/provincial-bfp\/residents/);
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

test("the audit activity tab is gone from the provincial portal", () => {
  assert.equal(existsSync("app/provincial-bfp/audit-activity/page.tsx"), false);
  assert.equal(existsSync("app/api/provincial-bfp/audit-events/route.ts"), false);
  assert.equal(existsSync("lib/provincial-bfp/management/audit.ts"), false);

  const layout = source("app/_components/provincial-bfp-layout.tsx");
  assert.doesNotMatch(layout, /audit-activity/);
  assert.doesNotMatch(layout, /Audit Activity/);
});
