import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const residentPages = ["reports", "guide", "profile"];

test("resident content pages keep styles in React-owned nodes", () => {
  const styleImports = {
    reports: "reportsStyles",
    guide: "guideStyles",
    profile: "profileStyles",
  };

  for (const page of residentPages) {
    const source = readFileSync(
      join(root, "app", "resident", page, "page.tsx"),
      "utf8",
    );
    const styleName = styleImports[page];

    assert.match(source, new RegExp(`<style>\\{${styleName}\\}</style>`));
    assert.doesNotMatch(source, /["']<style>["']\s*\+/);
  }
});
