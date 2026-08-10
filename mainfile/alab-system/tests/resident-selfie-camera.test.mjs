import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident selfie opens a preview first and captures only after confirmation", () => {
  const markup = readFileSync(join(appRoot, "app", "_content", "signup-content.ts"), "utf8");
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(markup, /<video id="selfieVideo" autoplay playsinline muted><\/video>/);
  assert.match(markup, /id="captureSelfie"/);
  assert.match(component, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(component, /const handleSelfieClick = async \(\) => \{\s*await startSelfieCamera\(\);\s*\};/);
  assert.match(component, /const handleCaptureSelfie = \(\) => \{[\s\S]*showSelfieCaptured\(\)/);
  assert.doesNotMatch(component, /selfieInput/);
});
