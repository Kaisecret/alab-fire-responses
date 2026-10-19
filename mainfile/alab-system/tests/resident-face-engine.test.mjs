import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import sharp from "sharp";

const require = createRequire(new URL("../lib/resident-applications/face-match.ts", import.meta.url));
const code = ts.transpileModule(readFileSync(new URL("../lib/resident-applications/face-match.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const exports = {};
new Function("require", "exports", code)((name) => name === "server-only" ? {} : require(name), exports);
const { compareResidentFaces } = exports;

test("corrupt identity images fail closed with the correct side before inference", async () => {
  const blank = await sharp({ create: { width: 320, height: 240, channels: 3, background: "white" } }).png().toBuffer();
  assert.equal((await compareResidentFaces(Buffer.from("not an image"), blank)).code, "ID_IMAGE_INVALID");
  assert.equal((await compareResidentFaces(blank, Buffer.from("not an image"))).code, "SELFIE_IMAGE_INVALID");
  assert.equal((await compareResidentFaces(Buffer.alloc(6 * 1024 * 1024 + 1), blank)).code, "ID_IMAGE_INVALID");
});

test("oversized image dimensions are rejected rather than silently scaled into acceptance", async () => {
  const wide = await sharp({ create: { width: 5001, height: 4, channels: 3, background: "white" } }).png().toBuffer();
  assert.equal((await compareResidentFaces(wide, wide)).code, "ID_IMAGE_INVALID");
});

test("a real CPU detector session rejects a blank ID image without accepting a match", async () => {
  const blank = await sharp({ create: { width: 320, height: 240, channels: 3, background: "white" } }).png().toBuffer();
  const result = await compareResidentFaces(blank, blank);
  assert.equal(result.ok, false);
  assert.equal(result.code, "ID_FACE_NOT_FOUND");
});

test("one instance admits only two simultaneous comparisons and does not queue excess evidence", async () => {
  const blank = await sharp({ create: { width: 320, height: 240, channels: 3, background: "white" } }).png().toBuffer();
  const results = await Promise.all(Array.from({ length: 3 }, () => compareResidentFaces(blank, blank)));
  assert.equal(results.filter((result) => result.code === "FACE_SERVICE_BUSY").length, 1);
  assert.equal(results.filter((result) => result.code === "ID_FACE_NOT_FOUND").length, 2);
});

test("pinned native CPU models load and SFace emits a finite 128-feature tensor", async () => {
  const ort = await import("onnxruntime-node");
  const options = { executionProviders: ["cpu"], intraOpNumThreads: 2, interOpNumThreads: 1, logSeverityLevel: 3 };
  const model = await ort.InferenceSession.create("models/resident-face/face_recognition_sface_2021dec.onnx", options);
  try {
    assert.deepEqual(model.inputMetadata[0].shape, [1, 3, 112, 112]);
    const result = await model.run({ [model.inputNames[0]]: new ort.Tensor("float32", new Float32Array(3 * 112 * 112), [1, 3, 112, 112]) });
    const feature = result[model.outputNames[0]];
    assert.deepEqual(feature.dims, [1, 128]);
    assert.ok([...feature.data].every(Number.isFinite));
  } finally {
    await model.release();
  }
});
