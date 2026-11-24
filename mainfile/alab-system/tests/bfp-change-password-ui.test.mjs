import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const changePasswordPath = resolve(root, "app/_components/bfp-change-password.tsx");

test("bfp-change-password is a focused password step, not a copy of the sign-in page", () => {
  assert.ok(existsSync(changePasswordPath), "bfp-change-password.tsx must exist");
  const content = readFileSync(changePasswordPath, "utf-8");

  // No sign-in artwork or split login card.
  assert.doesNotMatch(content, /formunicipallogin\.webp|FOR%20PROVOCIAL%20SIDE\.webp/, "Sign-in banner artwork must not appear");
  assert.doesNotMatch(content, /bfp-auth-card|bfp-banner-side/, "Split login card must not appear");
  assert.match(content, /Change your password/, "Clear title");
  assert.match(content, /Plus Jakarta Sans/, "House font");

  // Labeled fields, reveal toggles, autocomplete hints.
  for (const id of ["bfp-current-password", "bfp-next-password", "bfp-confirm-password"]) {
    assert.match(content, new RegExp(`htmlFor="${id}"`), `${id} has a visible label`);
  }
  assert.match(content, /showCurrentPassword/);
  assert.match(content, /showNextPassword/);
  assert.match(content, /autoComplete="current-password"/);
  assert.match(content, /autoComplete="new-password"/);

  // Live requirements gate the submit button.
  assert.match(content, /const MIN_LENGTH = 12;/);
  assert.match(content, /Both new passwords match/);
  assert.match(content, /disabled=\{loading \|\| !ready\}/);

  assert.match(content, /BfpLoginLoader/, "Loader while saving");
  assert.match(content, /Contact your administrator/, "Administrator hint");
});
