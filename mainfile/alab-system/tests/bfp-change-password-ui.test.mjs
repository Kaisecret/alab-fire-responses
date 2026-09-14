import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const changePasswordPath = resolve(root, "app/_components/bfp-change-password.tsx");

test("bfp-change-password component matches the login page UI design language", () => {
  assert.ok(existsSync(changePasswordPath), "bfp-change-password.tsx must exist");
  const content = readFileSync(changePasswordPath, "utf-8");

  // Grid background and split card structure
  assert.match(content, /bfp-auth-page|muni-login-page/, "Should have login-matching page wrapper");
  assert.match(content, /formunicipallogin\.webp/, "Should include municipal banner artwork");
  assert.match(content, /WHITE%20LOGO\.webp/, "Should include white ALAB logo on banner");
  assert.match(content, /fire%20logo\.webp/, "Should include fire logo badge in header");

  // Typography & less text
  assert.match(content, /Plus Jakarta Sans/, "Should use Plus Jakarta Sans font");
  assert.match(content, /Set New Password/, "Should have clean title");
  assert.doesNotMatch(content, /This is required before you can use the BFP dashboard\. Use at least 12 characters and do not share it\./, "Should eliminate bulky peacetime text");

  // Input fields with reveal toggles & icons
  assert.match(content, /showCurrentPassword/, "Should have toggle for current/temporary password");
  assert.match(content, /showNextPassword/, "Should have toggle for new password");
  assert.match(content, /current-password/, "Should support current-password autocomplete");
  assert.match(content, /new-password/, "Should support new-password autocomplete");

  // Security loader & admin help note
  assert.match(content, /BfpLoginLoader/, "Should use rotating fire loader when submitting");
  assert.match(content, /Need access\?|Need assistance\?|Contact your administrator/, "Should provide administrator contact hint");
});
