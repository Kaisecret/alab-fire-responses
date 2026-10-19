import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../lib/resident-applications/selfie-guidance.ts", import.meta.url);
const require = createRequire(sourceUrl);

function harness({ failWorker = false, deferredInit = false } = {}) {
  const code = ts.transpileModule(readFileSync(sourceUrl, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let clock = 0;
  let nextTimer = 0;
  const timers = new Map();
  const workers = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }) };
  const fakeWindow = {
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  class FakeWorker {
    constructor(url) {
      this.url = url;
      this.terminated = false;
      this.requests = [];
      workers.push(this);
    }
    postMessage(message, transfer) {
      this.requests.push({ message, transfer });
      if (message.type === "init" && !deferredInit) queueMicrotask(() => this.onmessage?.({ data: failWorker ? { type: "error", message: "Worker unavailable" } : { type: "ready" } }));
    }
    terminate() { this.terminated = true; }
    respond(faces = []) { this.onmessage?.({ data: { type: "result", faces } }); }
  }
  const fallbackTask = { closed: false, close() { this.closed = true; }, detectForVideo() { return { faceLandmarks: [] }; } };
  const options = [];
  const mediapipe = {
    FilesetResolver: { forVisionTasks: async (url) => ({ wasmLoaderPath: url }) },
    FaceLandmarker: { createFromOptions: async (_fileset, value) => { options.push(value); return fallbackTask; } },
  };
  const exported = {};
  const document = { createElement: () => canvas, visibilityState: "visible" };
  new Function("require", "exports", "window", "document", "Worker", "OffscreenCanvas", "createImageBitmap", "performance", code)(
    (name) => name === "@mediapipe/tasks-vision" ? mediapipe : require(name), exported,
    fakeWindow, document, FakeWorker, class {},
    async () => ({ closed: false, close() { this.closed = true; } }), { now: () => clock },
  );
  const rect = { left: 0, top: 0, width: 400, height: 400 };
  const video = { videoWidth: 1280, videoHeight: 720, readyState: 4, currentTime: 1, paused: false, ended: false, getBoundingClientRect: () => rect };
  const updates = [];
  let readyCount = 0;
  const args = { video, guide: { getBoundingClientRect: () => rect }, view: "front", onUpdate: (state) => updates.push(state), onReady: () => readyCount++ };
  async function tick(now) {
    clock = now;
    const scheduled = [...timers.entries()].find(([, value]) => value.delay <= 200);
    assert.ok(scheduled, "a frame tick is scheduled");
    timers.delete(scheduled[0]);
    scheduled[1].fn();
    await new Promise((resolve) => setImmediate(resolve));
  }
  return { start: exported.startSelfieGuidance, args, updates, workers, canvas, timers, tick, options, fallbackTask, document, get readyCount() { return readyCount; } };
}

test("worker inference has one in-flight small frame and stop cancels timers, worker and callbacks", async () => {
  const runtime = harness();
  const handle = await runtime.start(runtime.args);
  await runtime.tick(0);
  const worker = runtime.workers[0];
  assert.equal(runtime.canvas.width, 640);
  assert.equal(runtime.canvas.height, 360);
  assert.equal(worker.requests.filter(({ message }) => message.type === "frame").length, 1);
  assert.equal([...runtime.timers.values()].filter((value) => value.delay <= 200).length, 0, "no inference queue or timer while waiting");
  worker.respond([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.updates.at(-1).code, "no-face");
  await runtime.tick(180);
  assert.equal(worker.requests.filter(({ message }) => message.type === "frame").length, 1, "unchanged video time is not inferred twice");
  handle.stop();
  const count = runtime.updates.length;
  worker.respond([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.updates.length, count);
  assert.equal(runtime.readyCount, 0);
  assert.equal(worker.terminated, true);
  assert.equal(runtime.timers.size, 0);
});

test("abort during model initialization terminates its worker and silences later ready messages", async () => {
  const runtime = harness({ deferredInit: true });
  const abort = new AbortController();
  const promise = runtime.start({ ...runtime.args, signal: abort.signal });
  await new Promise((resolve) => setImmediate(resolve));
  const count = runtime.updates.length;
  abort.abort();
  await assert.rejects(promise, { name: "AbortError" });
  runtime.workers[0].onmessage?.({ data: { type: "ready" } });
  assert.equal(runtime.updates.length, count);
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.timers.size, 0);
});

test("worker startup failure falls back to a private CPU task configured to see a second face", async () => {
  const runtime = harness({ failWorker: true });
  const handle = await runtime.start(runtime.args);
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.options[0].numFaces, 2);
  assert.equal(runtime.options[0].baseOptions.delegate, "CPU");
  assert.equal(runtime.options[0].runningMode, "VIDEO");
  assert.match(runtime.options[0].baseOptions.modelAssetPath, /^\/models\/selfie-guidance\/.+\/face_landmarker\.task$/);
  await runtime.tick(0);
  assert.equal(runtime.updates.at(-1).code, "no-face");
  handle.stop();
  assert.equal(runtime.fallbackTask.closed, true);
  assert.equal(runtime.timers.size, 0);
});

test("camera hidden, paused, ended, not ready or reoriented during inference discards the stale valid result", async () => {
  const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  oval.forEach((index, i) => { const theta = -Math.PI / 2 + i / oval.length * Math.PI * 2; points[index] = { x: 0.5 + Math.cos(theta) * 0.325, y: 0.5 + Math.sin(theta) * 0.35, z: 0 }; });
  points[33] = { x: 0.3, y: 0.4, z: 0 };
  points[263] = { x: 0.7, y: 0.4, z: 0 };
  for (const interrupt of [
    (runtime) => { runtime.document.visibilityState = "hidden"; },
    (runtime) => { runtime.args.video.paused = true; },
    (runtime) => { runtime.args.video.ended = true; },
    (runtime) => { runtime.args.video.readyState = 1; },
    (runtime) => { runtime.args.video.videoWidth = 720; runtime.args.video.videoHeight = 1280; },
  ]) {
    const runtime = harness();
    runtime.args.video.videoWidth = 400;
    runtime.args.video.videoHeight = 400;
    const handle = await runtime.start(runtime.args);
    await runtime.tick(0);
    interrupt(runtime);
    runtime.workers[0].respond([points]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(runtime.updates.at(-1).code, "camera-pending");
    assert.equal(runtime.updates.at(-1).progress, 0);
    assert.equal(runtime.readyCount, 0);
    handle.stop();
  }
});

test("a stalled worker frame surfaces a retry message and releases the worker within ten seconds", async () => {
  const runtime = harness();
  await runtime.start(runtime.args);
  await runtime.tick(0);
  const timeout = [...runtime.timers.entries()].find(([, value]) => value.delay === 10_000);
  assert.ok(timeout, "each outstanding inference has a ten-second timeout");
  runtime.timers.delete(timeout[0]);
  timeout[1].fn();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.updates.at(-1).code, "unavailable");
  assert.equal(runtime.updates.at(-1).ready, false);
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.timers.size, 0);
  assert.equal(runtime.readyCount, 0);
});
