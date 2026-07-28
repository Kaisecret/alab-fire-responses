import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const images = [
  "BFPBACK.png",
  "bg images.png",
  "ChatGPT Image Jul 28, 2026, 02_33_55 AM.png",
  "FAVICON.png",
  "Hero section.png",
  "LOGO FIRE.png",
  "logo white tint.png",
  "Logo.png",
  "panay.png",
  "phone.png",
  "side pic for login.png",
];

test("all original images are exposed by the Next.js public directory", () => {
  for (const image of images) {
    assert.equal(existsSync(join(root, "public", "images", image)), true, image);
  }
});

test("landing content preserves the complete source structure", () => {
  const contentPath = join(root, "app", "_content", "landing-content.ts");
  assert.equal(existsSync(contentPath), true, "landing content module is missing");
  const content = readFileSync(
    contentPath,
    "utf8",
  );

  for (const id of [
    "home",
    "incidents",
    "map",
    "resources",
    "about",
    "report",
    "contact",
  ]) {
    assert.match(content, new RegExp(`id=\\\\?"${id}\\\\?"`));
  }

  assert.match(content, /Provincial Fire Response/);
  assert.equal(content.includes("/images/phone.png"), true);
  assert.equal(content.includes("/images/BFPBACK.png"), true);
  assert.equal(content.includes('url(\\"/images/bg images.png\\")'), true);
  assert.equal(content.includes('href=\\"/login\\"'), true);
  assert.equal(content.includes("../login.html"), false);
});

test("landing content includes styles for every lower-page section", () => {
  const content = readFileSync(
    join(root, "app", "_content", "landing-content.ts"),
    "utf8",
  );

  for (const selector of [
    ".landing-content",
    ".stat-card__icon svg",
    ".response-journey",
    ".access-system",
    ".field-ready",
    ".response-connect",
    ".site-footer",
  ]) {
    assert.equal(
      content.includes(selector),
      true,
      `missing lower-page selector: ${selector}`,
    );
  }
});

test("login content preserves the source form, imagery, and home route", () => {
  const contentPath = join(root, "app", "_content", "login-content.ts");
  const routePath = join(root, "app", "login", "page.tsx");

  assert.equal(existsSync(contentPath), true, "login content module is missing");
  assert.equal(existsSync(routePath), true, "login route is missing");

  const content = readFileSync(contentPath, "utf8");
  assert.match(content, />Welcome</);
  assert.match(content, /id=\\?"username\\?"/);
  assert.match(content, /id=\\?"password\\?"/);
  assert.equal(content.includes("/images/side pic for login.png"), true);
  assert.equal(content.includes("/images/Logo.png"), true);
  assert.equal(content.includes('href=\\"/\\"'), true);
  assert.equal(content.includes("BFP/index.html"), false);
  assert.equal(content.includes("var(--font-plus-jakarta)"), true);

  const route = readFileSync(routePath, "utf8");
  assert.match(route, /next\/font\/google/);
  assert.doesNotMatch(route, /fonts\.googleapis\.com/);
});

test("shared layout identifies ALAB and uses the original favicon", () => {
  const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");
  const iconPath = join(root, "app", "icon.png");

  assert.match(layout, /ALAB/);
  assert.doesNotMatch(layout, /Create Next App/);
  assert.equal(existsSync(iconPath), true, "ALAB app icon is missing");
  assert.deepEqual(
    readFileSync(iconPath),
    readFileSync(join(root, "public", "images", "FAVICON.png")),
  );
});
