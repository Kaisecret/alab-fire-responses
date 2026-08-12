import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident signup uses step-aware validation before account creation", () => {
  const markup = readFileSync(join(appRoot, "app", "_content", "signup-content.ts"), "utf8");
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(markup, /<form id="signupForm" novalidate>/);
  assert.match(component, /const validateRegistration = \(\) => \{/);
  assert.match(component, /showInvalidField\(index \+ 1, invalidField\)/);
  assert.match(component, /Upload the front of your valid ID to continue\./);
  assert.match(component, /Take and confirm your selfie to continue\./);
  assert.match(component, /if \(!validateRegistration\(\)\) return;/);
});

test("resident signup uses step five for polished OTP verification and a one-minute resend countdown", () => {
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(component, /Verify your phone/);
  assert.match(component, /Sending your verification code/);
  assert.match(component, /const RESEND_COOLDOWN_SECONDS = 60/);
  assert.match(component, /Resend code in/);
  assert.match(component, /Resend code/);
  assert.match(component, /currentStep = 5/);
  assert.match(component, /window\.location\.assign\("\/resident"\)/);
});
