import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../lib/resident-applications/selfie-guidance.ts", import.meta.url);
const require = createRequire(sourceUrl);

function centeredMesh(yaw = 0) {
  const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  oval.forEach((index, i) => { const theta = -Math.PI / 2 + i / oval.length * Math.PI * 2; points[index] = { x: 0.5 + Math.cos(theta) * 0.325, y: 0.5 + Math.sin(theta) * 0.35, z: 0 }; });
  for (const [right, left, span] of [[33, 263, 0.4], [133, 362, 0.18], [159, 386, 0.3]]) {
    const depth = Math.tan(yaw * Math.PI / 180) * span;
    points[right] = { x: 0.5 - span / 2, y: 0.4, z: depth / 2 };
    points[left] = { x: 0.5 + span / 2, y: 0.4, z: -depth / 2 };
  }
  return points;
}

function harness({ failWorker = false, deferredInit = false, deferredCpuInit = false, fallbackInferenceMs = 0 } = {}) {
  const code = ts.transpileModule(readFileSync(sourceUrl, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let clock = 0;
  let nextTimer = 0;
  const timers = new Map();
  const workers = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }) };
  const fakeWindow = {
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay, dueAt: clock + delay }); return id; },
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
  const fallbackTask = { closed: false, close() { this.closed = true; }, detectForVideo() { clock += fallbackInferenceMs; return { faceLandmarks: [] }; } };
  let finishCpuInit;
  const cpuTask = new Promise((resolve) => { finishCpuInit = () => resolve(fallbackTask); });
  const options = [];
  const mediapipe = {
    FilesetResolver: { forVisionTasks: async (url) => ({ wasmLoaderPath: url }) },
    FaceLandmarker: { createFromOptions: async (_fileset, value) => { options.push(value); return deferredCpuInit ? cpuTask : fallbackTask; } },
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
  async function advance(now) {
    clock = now;
    for (;;) {
      const due = [...timers.entries()].find(([, value]) => value.dueAt <= clock);
      if (!due) break;
      timers.delete(due[0]);
      due[1].fn();
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  return { start: exported.startSelfieGuidance, createSession: exported.createSelfieGuidanceSession, args, updates, workers, canvas, timers, tick, advance, finishCpuInit, options, fallbackTask, document, setClock(now) { clock = now; }, get readyCount() { return readyCount; } };
}

test("side capture runs with a hidden guide and accepts a stable face away from the frame center", async () => {
  const runtime = harness();
  runtime.args.video.videoWidth = 400;
  runtime.args.video.videoHeight = 400;
  runtime.args.guide.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
  const points = centeredMesh(24).map((point) => ({ x: 0.25 + (point.x - 0.5) * 0.6, y: 0.33 + (point.y - 0.5) * 0.6, z: point.z * 0.6 }));
  const handle = await runtime.start({ ...runtime.args, view: "right" });
  for (const now of [0, 180, 360, 540, 720]) {
    runtime.args.video.currentTime++;
    await runtime.tick(now);
    runtime.workers[0].respond([points]);
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(runtime.readyCount, 1);
  assert.equal(runtime.updates.at(-1).ready, true);
  assert.equal(runtime.workers[0].terminated, true);
  handle.stop();
});

test("a healthy cold worker can finish after 47 seconds without being killed or starting a second model", async () => {
  const runtime = harness({ deferredInit: true });
  const owner = runtime.createSession();
  const starting = owner.start(runtime.args);
  try {
    await runtime.advance(47_450);
    assert.equal(runtime.workers[0].terminated, false);
    assert.equal(runtime.options.length, 0, "slow download must not trigger a CPU reload");
    runtime.workers[0].onmessage({ data: { type: "ready" } });
    const handle = await starting;
    assert.equal(runtime.workers.length, 1);
    handle.stop();
  } finally { owner.close(); await starting.catch(() => {}); }
});

test("the overall initialization budget expires at 90 seconds without retrying CPU", async () => {
  const runtime = harness({ deferredInit: true });
  const owner = runtime.createSession();
  const starting = owner.start(runtime.args);
  const rejection = assert.rejects(starting, (error) => error.name === "SelfieGuidanceInitializationTimeoutError");
  void rejection.catch(() => {});
  await runtime.advance(90_000);
  await rejection;
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.options.length, 0);
  assert.equal(runtime.timers.size, 0);
  assert.equal(runtime.readyCount, 0);
  owner.close();
});

test("an explicit worker failure can finish CPU fallback within the same remaining budget", async () => {
  const runtime = harness({ deferredInit: true, deferredCpuInit: true });
  const owner = runtime.createSession();
  const starting = owner.start(runtime.args);
  await runtime.advance(20_000);
  runtime.workers[0].onmessage({ data: { type: "error" } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.options.length, 1);
  await runtime.advance(85_000);
  runtime.finishCpuInit();
  const handle = await starting;
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.fallbackTask.closed, false);
  assert.equal([...runtime.timers.values()].filter((timer) => timer.delay > 1000).length, 0);
  handle.stop();
  owner.close();
  assert.equal(runtime.fallbackTask.closed, true);
});

test("CPU fallback shares the original deadline and closes a task that finishes after expiry", async () => {
  const runtime = harness({ deferredInit: true, deferredCpuInit: true });
  const owner = runtime.createSession();
  const starting = owner.start(runtime.args);
  // Ensure the old implementation can fail this test without leaving a pending
  // initialization rejection unobserved when the owner is closed in cleanup.
  void starting.catch(() => {});
  try {
    await runtime.advance(20_000);
    runtime.workers[0].onmessage({ data: { type: "error" } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(runtime.options.length, 1);
    assert.ok([...runtime.timers.values()].some((timer) => timer.dueAt === 90_000), "fallback retains the original total deadline");
    const rejection = assert.rejects(starting, (error) => error.name === "SelfieGuidanceInitializationTimeoutError");
    void rejection.catch(() => {});
    await runtime.advance(90_000);
    await rejection;
    const count = runtime.updates.length;
    runtime.finishCpuInit();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(runtime.fallbackTask.closed, true);
    assert.equal(runtime.updates.length, count);
    assert.equal(runtime.timers.size, 0);
  } finally { owner.close(); runtime.finishCpuInit(); await starting.catch(() => {}); }
});

test("owner cancellation during CPU initialization rejects immediately and closes its late task", async () => {
  const runtime = harness({ failWorker: true, deferredCpuInit: true });
  const owner = runtime.createSession();
  const starting = owner.start(runtime.args);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.options.length, 1);
  const rejection = assert.rejects(starting, { name: "AbortError" });
  owner.close();
  await rejection;
  const count = runtime.updates.length;
  runtime.finishCpuInit();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.fallbackTask.closed, true);
  assert.equal(runtime.updates.length, count);
  assert.equal(runtime.timers.size, 0);
});

test("owner cancellation across asynchronous CPU ownership handoffs never leaks the created task", async () => {
  for (let delay = 0; delay < 12; delay++) {
    const runtime = harness({ failWorker: true, deferredCpuInit: true });
    const owner = runtime.createSession();
    const starting = owner.start(runtime.args);
    void starting.catch(() => {});
    await new Promise((resolve) => setImmediate(resolve));
    runtime.finishCpuInit();
    const cancel = (remaining) => remaining > 0 ? queueMicrotask(() => cancel(remaining - 1)) : owner.close();
    cancel(delay);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(runtime.fallbackTask.closed, true, `CPU task is released at cancellation ordering ${delay}`);
    assert.equal(runtime.timers.size, 0);
  }
});

test("per-view abort retains the same cold worker and original owner initialization budget", async () => {
  const runtime = harness({ deferredInit: true });
  const owner = runtime.createSession();
  const abort = new AbortController();
  const first = owner.start({ ...runtime.args, signal: abort.signal });
  await runtime.advance(20_000);
  const rejected = assert.rejects(first, { name: "AbortError" });
  abort.abort();
  await rejected;
  const second = owner.start({ ...runtime.args, view: "left" });
  try {
    await runtime.advance(47_450);
    assert.equal(runtime.workers[0].terminated, false);
    assert.equal(runtime.options.length, 0);
    assert.equal(runtime.workers.length, 1);
    runtime.workers[0].onmessage({ data: { type: "ready" } });
    const handle = await second;
    handle.stop();
  } finally { owner.close(); await second.catch(() => {}); }
});

test("a delayed event loop cannot accept CPU initialization that already exceeded the total budget", async () => {
  const runtime = harness({ failWorker: true, deferredCpuInit: true });
  const owner = runtime.createSession();
  const starting = owner.start(runtime.args);
  await new Promise((resolve) => setImmediate(resolve));
  const rejected = assert.rejects(starting, (error) => error.name === "SelfieGuidanceInitializationTimeoutError");
  void rejected.catch(() => {});
  // A synchronous compile can delay the timer callback; elapsed time still wins.
  runtime.setClock(92_000);
  runtime.finishCpuInit();
  await rejected;
  assert.equal(runtime.fallbackTask.closed, true);
  assert.equal(runtime.timers.size, 0);
  owner.close();
});

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
  const points = centeredMesh();
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

test("frame cadence subtracts inference time instead of adding a fixed delay after each frame", async () => {
  for (const [inferenceMs, expectedDelay] of [[25, 95], [140, 0], [300, 0]]) {
    const runtime = harness();
    const handle = await runtime.start(runtime.args);
    await runtime.tick(0);
    runtime.setClock(inferenceMs);
    runtime.workers[0].respond([]);
    await new Promise((resolve) => setImmediate(resolve));
    const frameTimers = [...runtime.timers.values()].filter((value) => value.delay <= 200);
    assert.equal(frameTimers.length, 1);
    assert.equal(frameTimers[0].delay, expectedDelay);
    handle.stop();
  }
});

test("slow main-thread fallback yields a paint interval rather than immediately running another blocking inference", async () => {
  const runtime = harness({ failWorker: true, fallbackInferenceMs: 300 });
  const handle = await runtime.start(runtime.args);
  await runtime.tick(0);
  const next = [...runtime.timers.values()];
  assert.equal(next.length, 1);
  assert.equal(next[0].delay, 50);
  handle.stop();
});

test("one dialog session reuses one runtime across views and only owner close terminates it", async () => {
  const runtime = harness();
  assert.equal(typeof runtime.createSession, "function");
  const session = runtime.createSession();
  assert.equal(runtime.workers.length, 0, "owner is lazy until a view starts");
  const first = await session.start(runtime.args);
  first.stop();
  assert.equal(runtime.workers[0].terminated, false);
  const next = await session.start({ ...runtime.args, view: "right" });
  assert.equal(runtime.workers.length, 1);
  next.stop();
  assert.equal(runtime.workers[0].terminated, false);
  session.close();
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.timers.size, 0);
  await assert.rejects(session.start(runtime.args), { name: "AbortError" });
});

test("stopping a view during initialization permits a new view to use that same pending runtime", async () => {
  const runtime = harness({ deferredInit: true });
  assert.equal(typeof runtime.createSession, "function");
  const session = runtime.createSession();
  const abort = new AbortController();
  const first = session.start({ ...runtime.args, signal: abort.signal });
  abort.abort();
  await assert.rejects(first, { name: "AbortError" });
  assert.equal(runtime.workers[0].terminated, false);
  const second = session.start({ ...runtime.args, view: "left" });
  runtime.workers[0].onmessage({ data: { type: "ready" } });
  const handle = await second;
  assert.equal(runtime.workers.length, 1);
  handle.stop();
  session.close();
});

test("a replacement view discards an old in-flight result before sending its own frame", async () => {
  const runtime = harness();
  assert.equal(typeof runtime.createSession, "function");
  const session = runtime.createSession();
  const firstUpdates = [];
  await session.start({ ...runtime.args, onUpdate: (state) => firstUpdates.push(state) });
  await runtime.tick(0);
  const worker = runtime.workers[0];
  const count = firstUpdates.length;
  runtime.args.video.currentTime = 2;
  await session.start({ ...runtime.args, view: "right" });
  await runtime.tick(120);
  assert.equal(worker.requests.filter(({ message }) => message.type === "frame").length, 1, "new view must wait for old inference");
  worker.respond([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(firstUpdates.length, count, "stopped view ignores the completed old frame");
  assert.equal(worker.requests.filter(({ message }) => message.type === "frame").length, 2);
  worker.respond([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.updates.at(-1).code, "no-face");
  session.close();
  assert.equal(worker.terminated, true);
  assert.equal(runtime.timers.size, 0);
});

test("closing the owner aborts pending initialization and emits no later callbacks", async () => {
  const runtime = harness({ deferredInit: true });
  assert.equal(typeof runtime.createSession, "function");
  const session = runtime.createSession();
  const promise = session.start(runtime.args);
  const count = runtime.updates.length;
  session.close();
  await assert.rejects(promise, { name: "AbortError" });
  runtime.workers[0].onmessage?.({ data: { type: "ready" } });
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.updates.length, count);
  assert.equal(runtime.timers.size, 0);
});

test("three automatic pose captures share one dialog runtime and owner close silences a pending frame", async () => {
  const runtime = harness();
  const session = runtime.createSession();
  runtime.args.video.videoWidth = 400;
  runtime.args.video.videoHeight = 400;
  let now = 0;
  for (const [index, [view, yaw]] of [["front", 0], ["right", 24], ["left", -24]].entries()) {
    await session.start({ ...runtime.args, view });
    // The front hold is 900 ms; side holds finish after 600 ms.
    for (let step = 0; step <= (view === "front" ? 5 : 4); step++) {
      runtime.args.video.currentTime++;
      await runtime.tick(now);
      runtime.workers[0].respond([centeredMesh(yaw)]);
      await new Promise((resolve) => setImmediate(resolve));
      now += 180;
    }
    assert.equal(runtime.readyCount, index + 1);
    assert.equal(runtime.workers.length, 1);
    assert.equal(runtime.workers[0].terminated, false, "automatic view completion retains the dialog model");
    assert.equal(runtime.timers.size, 0, "completed view has no polling timer");
  }
  await session.start(runtime.args);
  runtime.args.video.currentTime++;
  await runtime.tick(now);
  const count = runtime.updates.length;
  session.close();
  runtime.workers[0].respond([centeredMesh()]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.updates.length, count);
  assert.equal(runtime.readyCount, 3);
  assert.equal(runtime.workers[0].terminated, true);
  assert.equal(runtime.timers.size, 0);
});
