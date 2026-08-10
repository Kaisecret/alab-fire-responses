import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../app/_content/resident-home-content.ts", import.meta.url),
  "utf8",
);

test("resident mobile home keeps animated content within the viewport", () => {
  assert.match(source, /\.dashboard-page-root\s*\{[\s\S]*?overflow-x:\s*clip;/);
  assert.match(source, /\.mobile-emergency-wrapper\s*\{[\s\S]*?overflow:\s*clip;/);
});

test("resident mobile home keeps a visible notification control without a title", () => {
  assert.match(source, /\.mobile-page-title\s*\{\s*display:\s*none;/);
  assert.match(source, /\.mobile-notif-btn\s*\{[\s\S]*?position:\s*static;/);
  assert.match(source, /\.mobile-notif-btn svg\s*\{[\s\S]*?display:\s*block;/);
});

test("resident mobile emergency button goes directly to the fire report form", () => {
  assert.match(
    source,
    /<a href="\/resident\/report-fire" class="mobile-emergency-btn" aria-label="Report a fire">/,
  );
});
