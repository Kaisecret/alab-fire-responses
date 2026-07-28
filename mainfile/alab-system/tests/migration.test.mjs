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

test("landing hero has a mobile-only reference composition", () => {
  const mobileStylesPath = join(
    root,
    "app",
    "_content",
    "landing-mobile-styles.ts",
  );
  const component = readFileSync(
    join(root, "app", "_components", "landing-page.tsx"),
    "utf8",
  );

  assert.equal(existsSync(mobileStylesPath), true);

  const mobileStyles = readFileSync(mobileStylesPath, "utf8");
  assert.match(mobileStyles, /@media \(max-width: 640px\)/);
  assert.match(mobileStyles, /\.hero__content\s*\{[\s\S]*?display:\s*contents/);
  assert.match(mobileStyles, /\.hero__visual\s*\{[\s\S]*?order:\s*5/);
  assert.match(mobileStyles, /\.hero__trust\s*\{[\s\S]*?order:\s*6/);
  assert.match(mobileStyles, /\.hero__actions\s*\{[\s\S]*?order:\s*7/);
  assert.match(mobileStyles, /url\("\/images\/bg images\.png"\)/);
  assert.match(mobileStyles, /@media \(max-width: 370px\)/);
  assert.match(mobileStyles, /--header-h:\s*4\.4rem/);
  assert.match(
    mobileStyles,
    /\.eyebrow\s*\{[\s\S]*?margin:\s*clamp\(3rem,\s*11vw,\s*4rem\)/,
  );
  assert.match(
    mobileStyles,
    /\.hero__visual\s*\{[\s\S]*?min-height:\s*clamp\(18rem,\s*82vw,\s*27rem\)[\s\S]*?margin:\s*1rem/,
  );
  assert.match(
    mobileStyles,
    /\.phone\s*\{[\s\S]*?top:\s*0\.5rem[\s\S]*?bottom:\s*auto[\s\S]*?width:\s*clamp\(12rem,\s*50vw,\s*20rem\)/,
  );
  assert.match(
    mobileStyles,
    /\.firefighter\s*\{[\s\S]*?top:\s*3rem[\s\S]*?bottom:\s*auto[\s\S]*?width:\s*clamp\(13\.5rem,\s*56vw,\s*22rem\)/,
  );
  assert.match(component, /landingMobileStyles/);
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
