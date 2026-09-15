import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();
const source = (path) => readFileSync(join(appRoot, path), "utf8");

test("resident correction selfie capture component exists with camera-only states", () => {
  const path = "app/_components/resident-selfie-capture.tsx";
  const component = source(path);

  assert.match(component, /getUserMedia\(\{\s*video: \{ facingMode: \{ ideal: "user" \} \}/);
  assert.match(component, /audio: false/);
  assert.match(component, /"idle" \| "requesting" \| "live" \| "captured" \| "error"/);
  assert.match(component, /type="button"/);
  assert.doesNotMatch(component, /type="file"/);
  assert.doesNotMatch(component, /accept=/);
  assert.doesNotMatch(component, /<input/);
});

test("capture component stops media tracks on cancel, retake, and unmount", () => {
  const component = source("app/_components/resident-selfie-capture.tsx");

  assert.match(component, /streamRef\.current\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(component, /mountedRef\.current = false;\s*stopStream\(\);/);
  assert.match(component, /stream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/); // permission-resolved-after-unmount guard
});

test("capture component releases object URLs and enforces the evidence size limit", () => {
  const component = source("app/_components/resident-selfie-capture.tsx");

  assert.match(component, /URL\.revokeObjectURL\(objectUrlRef\.current\)/);
  assert.match(component, /MAX_SELFIE_BYTES = 6 \* 1024 \* 1024/);
  assert.match(component, /blob\.size > MAX_SELFIE_BYTES/);
});

test("capture component handles permission denied, no camera, camera busy, and insecure context distinctly", () => {
  const component = source("app/_components/resident-selfie-capture.tsx");

  assert.match(component, /"permission-denied"/);
  assert.match(component, /"no-camera"/);
  assert.match(component, /"camera-busy"/);
  assert.match(component, /"insecure-context"/);
  assert.match(component, /"encoding-failed"/);
  assert.match(component, /window\.isSecureContext/);
  assert.match(component, /role="alert"/);
});

test("resident application page uses the camera-only capture component instead of a selfie file input", () => {
  const page = source("app/resident/application/page.tsx");

  assert.match(page, /import \{ ResidentSelfieCapture, residentSelfieCaptureStyles \} from "\.\.\/\.\.\/_components\/resident-selfie-capture"/);
  assert.match(page, /<ResidentSelfieCapture onCapture=\{setSelfieFile\} disabled=\{saving\} \/>/);
  assert.doesNotMatch(page, /name="selfie"/);
  assert.match(page, /Take a new selfie using your camera/);
});

test("resubmission form data always carries the confirmed selfie under the existing field name", () => {
  const page = source("app/resident/application/page.tsx");
  assert.match(page, /formData\.set\("selfie", selfieFile\)/);
  assert.match(page, /if \(!selfieFile\) \{ setError\(.*?\); return; \}/);
  assert.match(page, /disabled=\{saving \|\| !selfieFile\}/);
});

test("resident application page reserves space below its fixed bottom navigation so form controls stay reachable", () => {
  // Regression: the shared ResidentMobileNavigation (app/_components/resident-mobile-navigation.tsx)
  // is position:fixed at the bottom on every /resident/* route. Without matching
  // bottom padding here, it overlapped the last form fields and made the page
  // feel unscrollable past them.
  const page = source("app/resident/application/page.tsx");
  const nav = source("app/_components/resident-mobile-navigation.tsx");

  assert.match(nav, /position:\s*fixed/);
  assert.match(page, /@media\(max-width:950px\)\{[\s\S]*?\.approval-page\{padding-bottom:calc\(6\.5rem \+ env\(safe-area-inset-bottom\)\)\}/);
});
