import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const residentContentModules = [
  "resident-reports-content.ts",
  "resident-guide-content.ts",
  "resident-profile-content.ts",
];

test("resident content modules close their HTML template literals", () => {
  for (const moduleName of residentContentModules) {
    const modulePath = join(root, "app", "_content", moduleName);
    const source = readFileSync(
      modulePath,
      "utf8",
    );

    assert.match(source, /^`;$/m, `${moduleName} has an unterminated template`);
    assert.doesNotMatch(source, /^\\`;$/m, `${moduleName} escapes its closing backtick`);
  }
});

test("resident pages render imported shared content modules", () => {
  for (const page of ["reports", "guide", "profile"]) {
    const pagePath = join(root, "app", "resident", page, "page.tsx");
    const source = readFileSync(pagePath, "utf8");

    assert.equal(existsSync(pagePath), true, `${page} page is missing`);
    assert.match(source, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(source, /const \w+Markup = `/);
  }
});
