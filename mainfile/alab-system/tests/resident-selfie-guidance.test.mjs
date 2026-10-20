import assert from "node:assert/strict";
import test from "node:test";
import {
  createSelfieGuidanceGate,
  evaluateSelfieGeometry,
  mapLandmarkToPreview,
} from "../lib/resident-applications/selfie-guidance-math.mjs";

// Artificial mesh only: no photos, biometric templates, or model inference.
function face({ x = 0.5, y = 0.5, width = 0.32, height = 0.5, yaw = 0, roll = 0 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x, y, z: 0 }));
  const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  oval.forEach((index, i) => {
    const theta = -Math.PI / 2 + (i / oval.length) * Math.PI * 2;
    points[index] = { x: x + Math.cos(theta) * width / 2, y: y + Math.sin(theta) * height / 2, z: 0 };
  });
  // Eye corners in MediaPipe topology: 33 = subject right, 263 = subject left.
  const eyeY = y - height * 0.13;
  for (const [right, left, ratio] of [[33, 263, 0.62], [133, 362, 0.26], [159, 386, 0.45]]) {
    const eyeSpan = width * ratio;
    const eyeRise = Math.tan(roll * Math.PI / 180) * eyeSpan;
    const depth = Math.tan(yaw * Math.PI / 180) * eyeSpan;
    points[right] = { x: x - eyeSpan / 2, y: eyeY - eyeRise / 2, z: depth / 2 };
    points[left] = { x: x + eyeSpan / 2, y: eyeY + eyeRise / 2, z: -depth / 2 };
  }
  points[1] = { x, y, z: -0.06 };
  return points;
}

const videoRect = { left: 0, top: 0, width: 400, height: 400 };
const guideRect = { left: 100, top: 55, width: 200, height: 290 };
function frame(faces = [face()], overrides = {}) {
  return { faces, videoWidth: 400, videoHeight: 400, videoRect, guideRect, mirrored: true, ...overrides };
}

test("cover crop and CSS mirror map landmarks to the visible preview", () => {
  const layout = { videoWidth: 1600, videoHeight: 900, videoRect: { left: 20, top: 30, width: 300, height: 400 }, mirrored: true };
  assert.deepEqual(mapLandmarkToPreview({ x: 0.5, y: 0.5 }, layout), { x: 170, y: 230 });
  const point = mapLandmarkToPreview({ x: 0.6, y: 0.25 }, layout);
  assert.ok(Math.abs(point.x - 98.88888888888889) < 0.00001);
  assert.equal(point.y, 130);
  assert.ok(mapLandmarkToPreview({ x: 0, y: 0.5 }, layout).x > 320);
});

test("one centered frontal face is acceptable, absent and additional faces are rejected", () => {
  assert.equal(evaluateSelfieGeometry(frame(), "front").acceptable, true);
  assert.equal(evaluateSelfieGeometry(frame([]), "front").code, "no-face");
  assert.equal(evaluateSelfieGeometry(frame([face(), face()]), "front").code, "multiple-faces");
});

test("small, large, off-center, oval-outside and cropped faces cannot become ready", () => {
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.15, height: 0.23 })]), "front").code, "too-small");
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.49, height: 0.73 })]), "front").code, "too-large");
  assert.equal(evaluateSelfieGeometry(frame([face({ x: 0.58 })]), "front").code, "off-center");
  const outside = face();
  outside[338] = { x: 0.72, y: 0.24, z: 0 };
  assert.equal(evaluateSelfieGeometry(frame([outside]), "front").code, "outside-guide");
  const cropped = frame([face({ x: 0.3 })], { videoWidth: 1600, videoHeight: 900 });
  assert.equal(evaluateSelfieGeometry(cropped, "front").code, "clipped");
});

test("subject right and left yaw use unmirrored geometry and require a modest turn", () => {
  for (const mirrored of [true, false]) {
    assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24 })], { mirrored }), "right").acceptable, true);
    assert.equal(evaluateSelfieGeometry(frame([face({ yaw: -24 })], { mirrored }), "left").acceptable, true);
    assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24 })], { mirrored }), "left").code, "turn-left");
    assert.equal(evaluateSelfieGeometry(frame([face({ yaw: -24 })], { mirrored }), "right").code, "turn-right");
  }
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24 })]), "front").code, "face-front");
  assert.equal(evaluateSelfieGeometry(frame(), "right").code, "turn-right");
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 45 })]), "right").code, "turn-back");
  assert.equal(evaluateSelfieGeometry(frame([face({ roll: 16 })]), "front").code, "head-level");
});

test("malformed geometry and hidden or missing layout fail closed", () => {
  assert.equal(evaluateSelfieGeometry(frame([[]]), "front").acceptable, false);
  const bad = face();
  bad[33].z = Number.NaN;
  assert.equal(evaluateSelfieGeometry(frame([bad]), "front").acceptable, false);
  assert.equal(evaluateSelfieGeometry(frame(undefined, { guideRect: { ...guideRect, width: 0 } }), "front").code, "camera-pending");
});

function gate(view = "front") {
  const updates = [];
  const events = [];
  const controller = createSelfieGuidanceGate({ view, onUpdate: (state) => updates.push(state), onReady: () => events.push("ready"), onStop: () => events.push("stop") });
  return { controller, updates, events };
}

test("continuous stable geometry produces real progress, fires once, and stops", () => {
  const { controller, updates, events } = gate();
  for (const now of [0, 180, 360, 540, 720]) controller.sample(frame(), now);
  assert.equal(events.length, 0);
  assert.equal(updates.at(-1).ready, false);
  assert.ok(updates.at(-1).progress > 0.7);
  controller.sample(frame(), 900);
  assert.deepEqual(events, ["ready", "stop"]);
  assert.equal(updates.at(-1).ready, true);
  assert.equal(updates.at(-1).progress, 1);
  const count = updates.length;
  controller.sample(frame(), 1200);
  controller.stop();
  assert.equal(updates.length, count);
  assert.deepEqual(events, ["ready", "stop"]);
});

test("face disappearance, second face, wrong pose, and a frame gap reset the hold", () => {
  for (const interrupted of [frame([]), frame([face(), face()]), frame([face({ yaw: 24 })])]) {
    const { controller, updates, events } = gate();
    for (const now of [0, 180, 360, 540]) controller.sample(frame(), now);
    controller.sample(interrupted, 720);
    assert.equal(updates.at(-1).progress, 0);
    for (const now of [900, 1080, 1260, 1440, 1620]) controller.sample(frame(), now);
    assert.equal(events.length, 0);
    controller.sample(frame(), 1800);
    assert.deepEqual(events, ["ready", "stop"]);
  }
  const { controller, updates, events } = gate();
  controller.sample(frame(), 0);
  controller.sample(frame(), 180);
  controller.sample(frame(), 1200);
  assert.equal(updates.at(-1).progress, 0);
  assert.equal(events.length, 0);
});

test("movement inside the accepted area restarts stability, and explicit stop silences callbacks", () => {
  const { controller, updates, events } = gate();
  controller.sample(frame(), 0);
  controller.sample(frame(), 180);
  controller.sample(frame([face({ x: 0.54 })]), 360);
  assert.equal(updates.at(-1).progress, 0);
  controller.stop();
  const count = updates.length;
  controller.sample(frame(), 1800);
  assert.equal(updates.length, count);
  assert.deepEqual(events, ["stop"]);
});

test("side views never finish with frontal geometry or the opposite anatomical turn", () => {
  for (const view of ["right", "left"]) {
    const { controller, events } = gate(view);
    for (let now = 0; now < 1800; now += 180) controller.sample(frame(), now);
    for (let now = 1800; now < 3600; now += 180) controller.sample(frame([face({ yaw: view === "right" ? -24 : 24 })]), now);
    assert.equal(events.length, 0);
    for (let now = 3600; now <= 4500; now += 180) controller.sample(frame([face({ yaw: view === "right" ? 24 : -24 })]), now);
    assert.deepEqual(events, ["ready", "stop"]);
  }
});

test("slow inference completes after four stable samples while two or three frames cannot finish", () => {
  const slow = gate();
  for (const now of [0, 500, 1000]) slow.controller.sample(frame(), now);
  assert.equal(slow.events.length, 0);
  assert.ok(slow.updates.at(-1).progress < 1);
  slow.controller.sample(frame(), 1500);
  assert.deepEqual(slow.events, ["ready", "stop"]);
  const sparse = gate();
  for (const now of [0, 950, 1900]) sparse.controller.sample(frame(), now);
  assert.equal(sparse.events.length, 0);
  assert.ok(sparse.updates.at(-1).progress < 1);
  sparse.controller.sample(frame(), 2850);
  assert.deepEqual(sparse.events, ["ready", "stop"]);
});

test("a modest side turn may shift slightly while the whole face still fits the oval", () => {
  for (const yaw of [24, -24]) {
    const result = evaluateSelfieGeometry(frame([face({ x: 0.55, yaw })]), yaw > 0 ? "right" : "left");
    assert.equal(result.acceptable, true);
  }
});

test("median eye-pair pose resists one noisy landmark without accepting the wrong anatomical turn", () => {
  const correct = face({ yaw: 24 });
  correct[33].z += 0.12;
  assert.equal(evaluateSelfieGeometry(frame([correct]), "right").acceptable, true);
  assert.equal(evaluateSelfieGeometry(frame([correct]), "left").acceptable, false);
  const frontal = face();
  frontal[33].z += 0.12;
  assert.equal(evaluateSelfieGeometry(frame([frontal]), "right").acceptable, false);
  assert.equal(evaluateSelfieGeometry(frame([frontal]), "front").acceptable, true);
});

test("missing or malformed extra eye geometry cannot fall back to a single noisy pair", () => {
  for (const invalid of [null, { x: 0.5, y: 0.4, z: Number.NaN }, { x: 0.8, y: 0.4, z: 0 }]) {
    const points = face({ yaw: 24 });
    points[133] = invalid;
    assert.equal(evaluateSelfieGeometry(frame([points]), "right").acceptable, false);
  }
});

test("direction cues describe preview movement while side labels remain anatomical", () => {
  const cases = [
    [{ x: 0.58 }, "front", "right"],
    [{ x: 0.42 }, "front", "left"],
    [{ y: 0.6 }, "front", "up"],
    [{ y: 0.4 }, "front", "down"],
    [{ width: 0.15, height: 0.23 }, "front", "closer"],
    [{ width: 0.49, height: 0.73 }, "front", "farther"],
    [{}, "right", "right"],
    [{}, "left", "left"],
    [{ yaw: 24 }, "front", "left"],
    [{ yaw: -24 }, "front", "right"],
    [{ yaw: 45 }, "right", "left"],
    [{ yaw: -45 }, "left", "right"],
  ];
  for (const [options, view, direction] of cases) assert.equal(evaluateSelfieGeometry(frame([face(options)]), view).direction, direction);
  const holding = gate("right");
  holding.controller.sample(frame([face({ yaw: 24 })]), 0);
  assert.equal(holding.updates.at(-1).direction, "hold");
  holding.controller.stop();
});

test("small in-oval landmark jitter can finish a side hold without hiding disappearance or wrong turns", () => {
  const { controller, events } = gate("right");
  for (const [index, x] of [0.5, 0.52, 0.49, 0.515, 0.5, 0.505].entries()) controller.sample(frame([face({ x, yaw: 24 })]), index * 180);
  assert.deepEqual(events, ["ready", "stop"]);
  for (const interrupted of [frame([]), frame([face({ yaw: -24 })]), frame([face({ yaw: 24 }), face()])]) {
    const invalid = gate("right");
    for (const now of [0, 180, 360, 540]) invalid.controller.sample(frame([face({ yaw: 24 })]), now);
    invalid.controller.sample(interrupted, 720);
    assert.equal(invalid.events.length, 0);
    assert.equal(invalid.updates.at(-1).progress, 0);
  }
});

test("side views accept a fully visible face outside the oval and require no guide layout", () => {
  for (const [view, yaw, x] of [["right", 24, 0.23], ["left", -24, 0.77]]) {
    const points = face({ x, y: 0.4, yaw });
    for (const guide of [guideRect, { left: 0, top: 0, width: 0, height: 0 }, undefined]) {
      assert.equal(evaluateSelfieGeometry(frame([points], { guideRect: guide }), view).acceptable, true);
    }
    assert.equal(evaluateSelfieGeometry(frame([points]), "front").code, "off-center");
    assert.equal(evaluateSelfieGeometry(frame([points], { guideRect: undefined }), "front").code, "camera-pending");
  }
});

test("side framing accepts usable faces near every corner and large faces while front framing keeps its limits", () => {
  for (const x of [0.13, 0.87]) {
    for (const y of [0.15, 0.85]) {
      assert.equal(evaluateSelfieGeometry(frame([face({ x, y, width: 0.2, height: 0.25, yaw: 24 })]), "right").acceptable, true);
    }
  }
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.74, height: 0.88, yaw: 24 })]), "right").acceptable, true);
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.74, height: 0.88 })]), "front").code, "too-large");
});

test("side minimum size uses actual inference pixels rather than CSS preview size or oval size", () => {
  assert.equal(evaluateSelfieGeometry(frame([face({ x: 0.2, width: 0.16, height: 0.2, yaw: 24 })]), "right").acceptable, true);
  for (const options of [{ width: 0.159, height: 0.2 }, { width: 0.16, height: 0.199 }]) {
    const rejected = evaluateSelfieGeometry(frame([face({ ...options, yaw: 24 })]), "right");
    assert.equal(rejected.code, "too-small");
    assert.doesNotMatch(rejected.message, /oval/i);
  }
  const fullHd = { videoWidth: 1920, videoHeight: 1080, videoRect: { left: 0, top: 0, width: 1920, height: 1080 }, guideRect: undefined };
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.1, height: 0.23, yaw: 24 })], fullHd), "right").acceptable, true);
  const enlargedPreview = { ...fullHd, videoRect: { left: 0, top: 0, width: 3840, height: 2160 } };
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.09, height: 0.3, yaw: 24 })], enlargedPreview), "right").code, "too-small");
  assert.equal(evaluateSelfieGeometry(frame([face({ width: 0.14, height: 0.2, yaw: 24 })], enlargedPreview), "right").code, "too-small");
});

test("side views still reject absent, extra, partial, crop-hidden, malformed and wrong-pose faces", () => {
  const noGuide = { guideRect: undefined };
  const absent = evaluateSelfieGeometry(frame([], noGuide), "right");
  assert.equal(absent.code, "no-face");
  assert.doesNotMatch(absent.message, /oval/i);
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24 }), face()], noGuide), "right").code, "multiple-faces");
  assert.equal(evaluateSelfieGeometry(frame([face({ x: 0.05, yaw: 24 })], noGuide), "right").code, "clipped");
  assert.equal(evaluateSelfieGeometry(frame([face({ x: 0.3, yaw: 24 })], { ...noGuide, videoWidth: 1600, videoHeight: 900 }), "right").code, "clipped");
  for (const yaw of [0, -24, 45]) assert.equal(evaluateSelfieGeometry(frame([face({ x: 0.23, yaw })], noGuide), "right").acceptable, false);
  const malformed = face({ x: 0.23, yaw: 24 });
  malformed[133].z = Number.NaN;
  assert.equal(evaluateSelfieGeometry(frame([malformed], noGuide), "right").acceptable, false);
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24 })], { ...noGuide, videoRect: { ...videoRect, width: 0 } }), "right").code, "camera-pending");
});

test("an off-center side face captures only after a stable correct-pose hold and movement still resets", () => {
  const noGuide = { guideRect: undefined };
  const valid = (x = 0.23, yaw = 24) => frame([face({ x, yaw })], noGuide);
  const stable = gate("right");
  for (const now of [0, 180, 360, 540]) stable.controller.sample(valid(), now);
  assert.equal(stable.events.length, 0);
  stable.controller.sample(valid(), 720);
  assert.deepEqual(stable.events, ["ready", "stop"]);
  const moving = gate("right");
  for (const now of [0, 180, 360]) moving.controller.sample(valid(), now);
  moving.controller.sample(valid(0.32), 540);
  assert.equal(moving.updates.at(-1).progress, 0);
  moving.controller.sample(valid(0.32, 0), 720);
  assert.equal(moving.updates.at(-1).progress, 0);
  assert.equal(moving.events.length, 0);
  moving.controller.stop();
});

test("side views hold for 600 ms with three samples while the front photo keeps its 900 ms hold", () => {
  const side = gate("right");
  for (const now of [0, 200, 400]) side.controller.sample(frame([face({ yaw: 24 })]), now);
  assert.equal(side.events.length, 0);
  side.controller.sample(frame([face({ yaw: 24 })]), 600);
  assert.deepEqual(side.events, ["ready", "stop"]);
  const sparse = gate("left");
  for (const now of [0, 700]) sparse.controller.sample(frame([face({ yaw: -24 })]), now);
  assert.equal(sparse.events.length, 0, "two samples never complete a side hold");
  const front = gate();
  for (const now of [0, 200, 400, 600]) front.controller.sample(frame(), now);
  assert.equal(front.events.length, 0);
  front.controller.sample(frame(), 900);
  assert.deepEqual(front.events, ["ready", "stop"]);
});

test("side views accept a wider natural turn and head tilt; the front photo stays strict", () => {
  for (const yaw of [13, 38]) {
    assert.equal(evaluateSelfieGeometry(frame([face({ yaw })]), "right").acceptable, true);
    assert.equal(evaluateSelfieGeometry(frame([face({ yaw: -yaw })]), "left").acceptable, true);
  }
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 10 })]), "right").code, "turn-right");
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 42 })]), "right").code, "turn-back");
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24, roll: 12 })]), "right").acceptable, true);
  assert.equal(evaluateSelfieGeometry(frame([face({ yaw: 24, roll: 16 })]), "right").code, "head-level");
  assert.equal(evaluateSelfieGeometry(frame([face({ roll: 12 })]), "front").code, "head-level");
});

test("side holds tolerate small yaw wobble but a real pose change still restarts", () => {
  const wobble = gate("right");
  for (const [index, yaw] of [24, 30, 25, 31].entries()) wobble.controller.sample(frame([face({ yaw })]), index * 200);
  assert.deepEqual(wobble.events, ["ready", "stop"]);
  const changed = gate("right");
  for (const [index, yaw] of [16, 16, 30].entries()) changed.controller.sample(frame([face({ yaw })]), index * 200);
  assert.equal(changed.updates.at(-1).progress, 0);
});

test("a dark camera image explains a missing face; a lit empty frame does not", () => {
  for (const view of ["front", "right"]) {
    const dark = evaluateSelfieGeometry(frame([], { brightness: 0.08 }), view);
    assert.equal(dark.code, "too-dark");
    assert.doesNotMatch(dark.message, /oval/i);
    assert.equal(evaluateSelfieGeometry(frame([], { brightness: 0.5 }), view).code, "no-face");
    assert.equal(evaluateSelfieGeometry(frame([], { brightness: Number.NaN }), view).code, "no-face");
  }
  const lit = face({ yaw: 24 });
  assert.equal(evaluateSelfieGeometry(frame([lit], { brightness: 0.05 }), "right").acceptable, true, "a found face is never rejected for darkness");
});
