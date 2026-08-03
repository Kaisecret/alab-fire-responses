import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const images = [
  "BFPBACK.webp",
  "bg images.webp",
  "burning-house.webp",
  "ChatGPT Image Aug 3, 2026, 09_51_05 PM.webp",
  "ChatGPT Image Jul 28, 2026, 02_33_55 AM.webp",
  "FAVICON.webp",
  "fire logo.webp",
  "for sign up.webp",
  "Hero section.webp",
  "LOGO FIRE.webp",
  "logo white tint.webp",
  "Logo.webp",
  "panay.webp",
  "phone.webp",
  "side pic for login.webp",
  "step1_calm.webp",
  "step2_exit.webp",
  "step3_phone.webp",
  "step4_firefighter.webp",
];

test("all public images are exposed as WebP", () => {
  for (const image of images) {
    assert.equal(existsSync(join(root, "public", "images", image)), true, image);
  }

  const nonWebpImages = readdirSync(join(root, "public", "images")).filter(
    (image) => !image.toLowerCase().endsWith(".webp"),
  );
  assert.deepEqual(nonWebpImages, []);
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
  assert.equal(content.includes("/images/phone.webp"), true);
  assert.equal(content.includes("/images/BFPBACK.webp"), true);
  assert.equal(content.includes('url(\\"/images/bg images.webp\\")'), true);
  assert.equal(content.includes('href=\\"/resident/login\\"'), true);
  assert.equal(content.includes('href=\\"/login\\"'), false);
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
  assert.match(mobileStyles, /url\("\/images\/bg images\.webp"\)/);
  assert.match(mobileStyles, /@media \(max-width: 370px\)/);
  assert.match(mobileStyles, /--header-h:\s*4\.4rem/);
  assert.match(
    mobileStyles,
    /\.eyebrow\s*\{[\s\S]*?margin:\s*clamp\(2rem,\s*7vw,\s*2\.75rem\)/,
  );
  assert.match(
    mobileStyles,
    /@media \(max-width: 640px\) and \(max-height: 750px\)/,
  );
  assert.match(
    mobileStyles,
    /\.hero__visual\s*\{[\s\S]*?min-height:\s*clamp\(12\.5rem,\s*52vw,\s*18rem\)/,
  );
  assert.match(
    mobileStyles,
    /\.hero__actions \.button\s*\{[\s\S]*?min-height:\s*3\.1rem/,
  );
  assert.match(component, /landingMobileStyles/);
});

test("login content preserves the source form, imagery, and home route", () => {
  const contentPath = join(root, "app", "_content", "login-content.ts");
  const routePath = join(root, "app", "resident", "login", "page.tsx");
  const oldRoutePath = join(root, "app", "login", "page.tsx");
  const componentPath = join(root, "app", "_components", "login-page.tsx");

  assert.equal(existsSync(contentPath), true, "login content module is missing");
  assert.equal(existsSync(routePath), true, "resident login route is missing");
  assert.equal(existsSync(oldRoutePath), true, "legacy login redirect is missing");
  assert.equal(existsSync(componentPath), true, "login component is missing");

  const content = readFileSync(contentPath, "utf8");
  const component = readFileSync(componentPath, "utf8");
  assert.match(content, />Welcome</);
  assert.match(content, /Resident or Citizen Reporter/);
  assert.match(content, /resident fire reporting/i);
  assert.match(content, /id=\\?"username\\?"/);
  assert.match(content, /id=\\?"password\\?"/);
  assert.equal(content.includes("/images/side pic for login.webp"), true);
  assert.equal(content.includes("/images/Logo.webp"), true);
  assert.equal(content.includes('href=\\"/\\"'), true);
  assert.equal(content.includes('action=\\"/resident\\"'), true);
  assert.equal(content.includes("BFP/index.html"), false);
  assert.equal(content.includes("var(--font-plus-jakarta)"), true);
  assert.doesNotMatch(content, /Municipal BFP login/i);
  assert.doesNotMatch(content, /Provincial BFP login/i);
  assert.match(component, /window\.location\.assign\("\/resident"\)/);

  const route = readFileSync(routePath, "utf8");
  assert.match(route, /Resident Login - ALAB/);
  assert.match(route, /next\/font\/google/);
  assert.doesNotMatch(route, /fonts\.googleapis\.com/);

  const oldRoute = readFileSync(oldRoutePath, "utf8");
  assert.match(oldRoute, /redirect\("\/resident\/login"\)/);
});

test("shared layout identifies ALAB and uses the original favicon", () => {
  const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");
  const iconPath = join(root, "app", "icon.png");

  assert.match(layout, /ALAB/);
  assert.doesNotMatch(layout, /Create Next App/);
  assert.match(layout, /\/images\/FAVICON\.webp/);
  assert.equal(existsSync(iconPath), true, "ALAB app icon is missing");
});
