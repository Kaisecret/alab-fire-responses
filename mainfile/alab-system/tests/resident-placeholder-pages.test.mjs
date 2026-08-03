import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const residentPages = ["guide", "profile"];

test("resident placeholder pages close their HTML template literals", () => {
  for (const page of residentPages) {
    const source = readFileSync(
      join(root, "app", "resident", page, "page.tsx"),
      "utf8",
    );

    assert.match(source, /^`;$/m, `${page} page has an unterminated template`);
    assert.doesNotMatch(source, /^\\`;$/m, `${page} page escapes its closing backtick`);
  }
});

test("resident reports use the complete list and detail modules", () => {
  const reportsRoute = readFileSync(
    join(root, "app", "resident", "reports", "page.tsx"),
    "utf8",
  );
  const detailRoutePath = join(
    root,
    "app",
    "resident",
    "reports",
    "[id]",
    "page.tsx",
  );
  const reportsContentPath = join(
    root,
    "app",
    "_content",
    "resident-reports-content.ts",
  );
  const detailContentPath = join(
    root,
    "app",
    "_content",
    "resident-report-detail-content.ts",
  );

  assert.equal(existsSync(detailRoutePath), true, "report detail route is missing");
  assert.equal(existsSync(reportsContentPath), true, "reports content is missing");
  assert.equal(existsSync(detailContentPath), true, "report detail content is missing");
  assert.match(reportsRoute, /resident-reports-content/);

  const detailRoute = readFileSync(detailRoutePath, "utf8");
  const reportsContent = readFileSync(reportsContentPath, "utf8");
  const detailContent = readFileSync(detailContentPath, "utf8");

  assert.match(detailRoute, /resident-report-detail-content/);
  assert.match(reportsContent, /\/resident\/reports\/FR-2026-003/);
  assert.match(reportsContent, /\/resident\/reports\/FR-2026-001/);
  assert.match(reportsContent, /\/resident\/reports\/FR-2026-002/);
  assert.match(detailContent, /href="\/resident\/reports"/);
});

test("resident mobile navigation remains inside narrow zoomed viewports", () => {
  const source = readFileSync(
    join(root, "app", "_content", "resident-home-content.ts"),
    "utf8",
  );

  assert.match(source, /\.dashboard-page-root\s*\{[\s\S]*?overflow-x:\s*clip/);
  assert.match(
    source,
    /\.mobile-bottom-nav\s*\{[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?width:\s*auto;[\s\S]*?max-width:\s*100vw/,
  );
  assert.match(
    source,
    /\.mobile-nav-item\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0/,
  );
  assert.match(
    source,
    /\.mobile-nav-fab-wrapper\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0/,
  );
});

test("resident routes disable mobile browser zoom without changing other modules", () => {
  const layoutPath = join(root, "app", "resident", "layout.tsx");
  assert.equal(existsSync(layoutPath), true, "resident viewport layout is missing");

  const layout = readFileSync(layoutPath, "utf8");
  const styles = readFileSync(
    join(root, "app", "_content", "resident-home-content.ts"),
    "utf8",
  );

  assert.match(layout, /export const viewport:\s*Viewport/);
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(layout, /initialScale:\s*1/);
  assert.match(layout, /minimumScale:\s*1/);
  assert.match(layout, /maximumScale:\s*1/);
  assert.match(layout, /userScalable:\s*false/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /themeColor:\s*\[/);
  assert.match(layout, /media:\s*"\(max-width: 1024px\)"/);
  assert.match(layout, /color:\s*"#DD2213"/);
  assert.match(styles, /\.dashboard-page-root\s*\{[\s\S]*?touch-action:\s*pan-x pan-y/);
});
