import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const appRoot = process.cwd();
const source = (path) => readFileSync(join(appRoot, path), "utf8");

function loadSelfieModule() {
  const component = source("app/_components/resident-selfie-capture.tsx");
  const code = ts.transpileModule(component, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  const reactStub = {
    useCallback: (callback) => callback,
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, () => {}],
  };
  new Function("require", "exports", code)((name) => {
    if (name === "react") return reactStub;
    if (name === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports);
  return exports;
}

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

  assert.match(component, /function stopMediaStream[\s\S]*?stream\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(component, /mountedRef\.current = false;\s*coordinator\.cancel\(\);\s*stopStream\(\);/);
  assert.match(component, /settleRequestedStream\(coordinatorRef\.current, attempt, stream\)/);
});

test("a cancelled permission request rejects and stops its late camera stream", () => {
  const { createCameraAttemptCoordinator, settleRequestedStream } = loadSelfieModule();
  const coordinator = createCameraAttemptCoordinator();
  const request = coordinator.begin();
  const stopped = [];
  const stream = {
    getTracks: () => [
      { stop: () => stopped.push("video") },
      { stop: () => stopped.push("audio") },
    ],
  };

  coordinator.cancel();

  assert.equal(settleRequestedStream(coordinator, request, stream), false);
  assert.deepEqual(stopped, ["video", "audio"]);
});

test("only one encoding operation can run and a cancelled result stays ignored", () => {
  const { createCameraAttemptCoordinator } = loadSelfieModule();
  const coordinator = createCameraAttemptCoordinator();
  const request = coordinator.begin();

  assert.equal(coordinator.beginEncoding(request), true);
  assert.equal(coordinator.beginEncoding(request), false);

  coordinator.cancel();

  assert.equal(coordinator.finishEncoding(request), false);
});

test("capture readiness requires loaded video data and a non-zero frame", () => {
  const { hasUsableVideoFrame } = loadSelfieModule();

  assert.equal(hasUsableVideoFrame({ readyState: 1, videoWidth: 640, videoHeight: 480 }), false);
  assert.equal(hasUsableVideoFrame({ readyState: 2, videoWidth: 0, videoHeight: 480 }), false);
  assert.equal(hasUsableVideoFrame({ readyState: 2, videoWidth: 640, videoHeight: 0 }), false);
  assert.equal(hasUsableVideoFrame({ readyState: 2, videoWidth: 640, videoHeight: 480 }), true);
});

test("dialog Tab handling wraps focus at both ends", () => {
  const { trapDialogFocus } = loadSelfieModule();
  const focused = [];
  const first = { focus: () => focused.push("first") };
  const middle = { focus: () => focused.push("middle") };
  const last = { focus: () => focused.push("last") };
  const dialog = { querySelectorAll: () => [first, middle, last] };
  const makeEvent = (shiftKey) => ({
    key: "Tab",
    shiftKey,
    preventDefaultCalled: false,
    preventDefault() { this.preventDefaultCalled = true; },
  });

  const backwards = makeEvent(true);
  assert.equal(trapDialogFocus(backwards, dialog, first), true);
  assert.equal(backwards.preventDefaultCalled, true);
  assert.deepEqual(focused, ["last"]);

  const forwards = makeEvent(false);
  assert.equal(trapDialogFocus(forwards, dialog, last), true);
  assert.equal(forwards.preventDefaultCalled, true);
  assert.deepEqual(focused, ["last", "first"]);
});

test("dialog focus restoration uses the remounted camera action when its opener is gone", () => {
  const { restoreDialogFocus } = loadSelfieModule();
  const focused = [];
  const removedOpener = { isConnected: false, focus: () => focused.push("removed") };
  const remountedAction = { isConnected: true, focus: () => focused.push("fallback") };

  assert.equal(restoreDialogFocus(removedOpener, remountedAction), true);
  assert.deepEqual(focused, ["fallback"]);
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

test("camera takes over the full screen and locks background scrolling while open", () => {
  const component = source("app/_components/resident-selfie-capture.tsx");

  // Fixed to the viewport so the camera covers the page and the fixed
  // resident bottom navigation rather than sitting in the form flow.
  assert.match(component, /\.selfie-overlay\{position:fixed;inset:0/);
  assert.match(component, /role="dialog" aria-modal="true"/);
  assert.match(component, /document\.body\.style\.overflow = "hidden"/);
  assert.match(component, /event\.key === "Escape"/);
  // The old inline, in-flow camera box is gone.
  assert.doesNotMatch(component, /selfie-video-frame/);
});

test("a captured frame is only committed to the form once the resident confirms it", () => {
  const component = source("app/_components/resident-selfie-capture.tsx");

  assert.match(component, /pendingFileRef\.current = file/);
  assert.match(component, /const confirmPhoto = useCallback\(\(\) => \{[\s\S]*?onCapture\(file\)/);
  assert.match(component, /onClick=\{confirmPhoto\}/);
  // Capturing alone must not hand a file to the form.
  assert.doesNotMatch(component, /onCapture\(file\);\s*\}, "image\/jpeg"/);
});

test("resident application page uses the camera-only capture component instead of a selfie file input", () => {
  const page = source("app/resident/application/page.tsx");

  assert.match(page, /import \{ ResidentSelfieCapture, residentSelfieCaptureStyles \} from "\.\.\/\.\.\/_components\/resident-selfie-capture"/);
  assert.match(page, /<ResidentSelfieCapture onCapture=\{setSelfieFile\} disabled=\{busy\} \/>/);
  assert.doesNotMatch(page, /name="selfie"/);
  assert.match(page, /Take a new selfie using your camera/);
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
