import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const residentPages = ["reports", "guide", "profile"];

const guideContent = readFileSync(
  join(root, "app", "_content", "resident-guide-content.ts"),
  "utf8",
);

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

test("resident guide uses deployed WebP assets for every emergency step", () => {
  for (const asset of [
    "burning-house.webp",
    "step1_calm.webp",
    "step2_exit.webp",
    "step3_phone.webp",
    "step4_firefighter.webp",
  ]) {
    assert.match(guideContent, new RegExp(`/images/${asset}`));
    assert.equal(
      readFileSync(join(root, "public", "images", asset)).byteLength > 0,
      true,
    );
  }

  assert.doesNotMatch(guideContent, /\/images\/[^"']+\.png/);
});
