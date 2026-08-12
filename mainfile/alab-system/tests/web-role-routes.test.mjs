import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("web app exposes top-level role module routes", () => {
  const routes = [
    ["resident", "ResidentHomePage", "Resident Home - ALAB"],
    ["municipal-bfp", "MunicipalBfpDashboard", "Municipal BFP Dashboard - ALAB"],
    [
      "provincial-bfp",
      "ProvincialBfpModule",
      "Provincial BFP Module - ALAB",
    ],
  ];

  for (const [route, componentName, title] of routes) {
    const pagePath = join(root, "app", route, "page.tsx");

    assert.equal(existsSync(pagePath), true, `${route} route is missing`);

    const page = readFileSync(pagePath, "utf8");

    assert.match(page, new RegExp(componentName));
    assert.match(
      page,
      new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.match(page, /export const metadata/);
  }
});

test("web app does not create firefighter routes", () => {
  assert.equal(existsSync(join(root, "app", "firefighter")), false);
  assert.equal(existsSync(join(root, "app", "dashboard", "firefighter")), false);
});
