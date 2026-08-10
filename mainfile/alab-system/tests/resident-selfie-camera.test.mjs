import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident selfie uses a dedicated camera dialog and confirms before completion", () => {
  const markup = readFileSync(join(appRoot, "app", "_content", "signup-content.ts"), "utf8");
  const component = readFileSync(join(appRoot, "app", "_components", "signup-page.tsx"), "utf8");

  assert.match(markup, /id="selfieCameraPanel"[^>]*role="dialog"/);
  assert.match(markup, /<video id="selfieVideo" autoplay playsinline muted><\/video>/);
  assert.match(markup, /id="captureSelfie"/);
  assert.match(markup, /id="retakeSelfie"/);
  assert.match(markup, /id="useSelfie"/);
  assert.match(markup, /@media \(max-width: 950px\)[\s\S]*\.selfie-camera-panel[\s\S]*inset: 0/);
  assert.match(component, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(component, /const handleSelfieClick = async \(\) => \{\s*await startSelfieCamera\(\);\s*\};/);
  assert.match(component, /const handleCaptureSelfie = \(\) => \{[\s\S]*showSelfieReview\(/);
  assert.match(component, /const handleUseSelfie = \(\) => \{[\s\S]*showSelfieCaptured\(\)/);
  assert.match(component, /const handleRetakeSelfie = async \(\) => \{/);
  assert.match(component, /selfieStream\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.doesNotMatch(component, /selfieInput/);
});
