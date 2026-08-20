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

test("resident signup blocks an invalid username on the account-security step", () => {
  const markup = readFileSync(join(appRoot, "app", "_content", "signup-content.ts"), "utf8");
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");
  const register = readFileSync(join(appRoot, "app", "api", "auth", "register", "route.ts"), "utf8");

  const usernameInput = markup.match(/<input[^>]*id="username"[^>]*>/)?.[0] ?? "";
  assert.match(usernameInput, /minlength="3"/);
  assert.match(usernameInput, /pattern="\[A-Za-z0-9_.-\]\{3,30\}"/);
  assert.match(component, /formStatus\.textContent = `Please complete your \$\{fieldLabel\(invalidField\)\} to continue\.`/);
  assert.match(register, /Username must contain 3 to 30 letters, numbers, dots, underscores, or hyphens\./);
});

test("resident signup uses step five for polished OTP verification and a one-minute resend countdown", () => {
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(component, /Verify your phone/);
  assert.match(component, /Sending your verification code/);
  assert.match(component, /const RESEND_COOLDOWN_SECONDS = 60/);
  assert.match(component, /Resend code in/);
  assert.match(component, /Resend code/);
  assert.match(component, /currentStep = 5/);
  assert.match(component, /window\.location\.assign\("\/resident\/application"\)/);
});

test("resident signup restarts the full resend countdown after every successful OTP resend", () => {
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(component, /const startResendCountdown = \(\) =>/);
  assert.match(component, /window\.clearInterval\(resendTimer\)/);
  assert.match(component, /secondsRemaining = RESEND_COOLDOWN_SECONDS/);
  assert.match(component, /startResendCountdown\(\);\s*status\.textContent = "A new code was sent/);
});

test("resident signup prevents duplicate first-code requests while the request is in progress", () => {
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(component, /let isStartingVerification = false/);
  assert.match(component, /if \(isStartingVerification\) return;/);
  assert.match(component, /isStartingVerification = true/);
  assert.match(component, /isStartingVerification = false/);
});

test("resident signup sends one OTP only after account details are confirmed", () => {
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");
  const stepFourContinue = component.slice(
    component.indexOf("const handleToStep5"),
    component.indexOf("const handleBackToStep1"),
  );

  assert.match(stepFourContinue, /goToStep\(5\)/);
  assert.doesNotMatch(stepFourContinue, /\/api\/auth\/register\/start/);
  assert.match(component, /const showAccountConfirmation = \(verificationId: string\) =>/);
  const verificationHandler = component.slice(
    component.indexOf("verifyButton.onclick"),
    component.indexOf("const handleSubmit"),
  );
  const confirmation = component.slice(
    component.indexOf("const showAccountConfirmation"),
    component.indexOf("const showOtpPanel"),
  );
  assert.match(verificationHandler, /showAccountConfirmation\(activeVerificationId\)/);
  assert.doesNotMatch(verificationHandler, /fetch\("\/api\/auth\/register"/);
  assert.match(confirmation, /fetch\("\/api\/auth\/register"/);
});

test("Google login starts OAuth and pre-fills a new resident signup without skipping verification", () => {
  const login = readFileSync(join(appRoot, "app", "_components", "login-page.tsx"), "utf8");
  const signup = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(login, /\/api\/auth\/google\/start/);
  assert.match(signup, /\/api\/auth\/google\/prefill/);
  assert.match(signup, /Google verified your name and email/);
  assert.match(signup, /frontFile/);
  assert.match(signup, /selfieTaken/);
});
