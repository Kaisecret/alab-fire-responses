import assert from "node:assert/strict";
import test from "node:test";

import {
  cosineSimilarity,
  decodeYuNet,
  selectSingleFace,
  similarityTransform,
  alignRgbFace,
} from "../lib/resident-applications/face-match-math.mjs";

// Literal OpenCV FaceRecognizerSF five-point destination, in YuNet order.
const template = [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366], [41.5493, 92.3655], [70.7299, 92.2041]];
const face = { box: [15, 20, 85, 90], landmarks: template, score: 0.99 };

test("cosine comparison normalizes magnitude, retains direction, and rejects invalid embeddings", () => {
  assert.ok(Math.abs(cosineSimilarity([3, 4], [6, 8]) - 1) < 1e-12);
  assert.equal(cosineSimilarity([1, 0], [0, 8]), 0);
  assert.equal(cosineSimilarity([1, 0], [-2, 0]), -1);
  for (const [a, b] of [[[], []], [[0, 0], [1, 0]], [[1], [1, 2]], [[NaN], [1]], [[Infinity], [1]]]) {
    assert.throws(() => cosineSimilarity(a, b), /embedding/i);
  }
});

test("selection refuses no faces, multiple faces, and landmarks outside the actual image", () => {
  assert.throws(() => selectSingleFace([], "ID", 112, 112), { code: "ID_FACE_NOT_FOUND" });
  assert.throws(() => selectSingleFace([], "SELFIE", 112, 112), { code: "SELFIE_FACE_NOT_FOUND" });
  assert.throws(() => selectSingleFace([face, face], "SELFIE", 112, 112), { code: "SELFIE_MULTIPLE_FACES" });
  assert.deepEqual(selectSingleFace([face], "ID", 112, 112), face);
  assert.throws(() => selectSingleFace([{ ...face, landmarks: [[112, 50], ...template.slice(1)] }], "ID", 112, 112), { code: "ID_FACE_UNCLEAR" });
  assert.throws(() => selectSingleFace([{ ...face, box: [15, 20, 0, 90] }], "ID", 112, 112), { code: "ID_FACE_UNCLEAR" });
});

test("an ID's small ghost portrait is ignored, but similar faces on an ID or any second face in a selfie still fail", () => {
  const ghost = { box: [70, 70, 30, 34], landmarks: template, score: 0.95 };
  assert.deepEqual(selectSingleFace([ghost, face], "ID", 112, 112), face, "the main portrait is used whatever the detection order");
  assert.deepEqual(selectSingleFace([face, ghost, { ...ghost, box: [5, 5, 20, 22] }], "ID", 112, 112), face);
  const similar = { ...face, box: [60, 20, 50, 60] };
  assert.throws(() => selectSingleFace([face, similar], "ID", 112, 112), { code: "ID_MULTIPLE_FACES" });
  assert.throws(() => selectSingleFace([face, ghost], "SELFIE", 112, 112), { code: "SELFIE_MULTIPLE_FACES" });
  const cutOffMain = { ...face, landmarks: [[112, 50], ...template.slice(1)] };
  assert.throws(() => selectSingleFace([cutOffMain, ghost], "ID", 112, 112), { code: "ID_FACE_UNCLEAR" }, "a cut-off main portrait never falls back to the ghost");
});

function predictions() {
  const result = {};
  for (const stride of [8, 16, 32]) {
    const count = (32 / stride) ** 2;
    for (const [name, channels] of [["cls", 1], ["obj", 1], ["bbox", 4], ["kps", 10]]) {
      result[`${name}_${stride}`] = { dims: [1, count, channels], data: new Float32Array(count * channels) };
    }
  }
  return result;
}

test("YuNet decodes published stride offsets and suppresses duplicate boxes across strides", () => {
  const outputs = predictions();
  // Stride 8, grid (1,1): center (16,16), size (16,16), landmarks (12,12).
  outputs.cls_8.data[5] = outputs.obj_8.data[5] = 1;
  outputs.bbox_8.data.set([1, 1, Math.log(2), Math.log(2)], 20);
  outputs.kps_8.data.fill(0.5, 50, 60);
  // The same box from stride 16 is an NMS duplicate, not a second person.
  outputs.cls_16.data[0] = outputs.obj_16.data[0] = 0.95;
  outputs.bbox_16.data.set([1, 1, 0, 0], 0);
  outputs.kps_16.data.fill(0.75, 0, 10);
  const faces = decodeYuNet(outputs, 32, 32);
  assert.equal(faces.length, 1);
  assert.ok(Math.abs(faces[0].box[0] - 8) < 1e-5);
  assert.ok(Math.abs(faces[0].box[2] - 16) < 1e-5);
  assert.deepEqual(faces[0].landmarks, [[12, 12], [12, 12], [12, 12], [12, 12], [12, 12]]);
  assert.equal(faces[0].score, 1);
  outputs.kps_32.dims = [1, 1, 9];
  assert.throws(() => decodeYuNet(outputs, 32, 32), /output shape/i);
});

test("five-point alignment removes rotation, scale and translation without reflection", () => {
  // Source = destination rotated 90 degrees, scaled twice, and translated.
  const source = template.map(([x, y]) => [250 - 2 * y, 10 + 2 * x]);
  const matrix = similarityTransform(source);
  for (let i = 0; i < 5; i++) {
    const [x, y] = source[i];
    assert.ok(Math.abs(matrix[0] * x + matrix[1] * y + matrix[2] - template[i][0]) < 1e-6);
    assert.ok(Math.abs(matrix[3] * x + matrix[4] * y + matrix[5] - template[i][1]) < 1e-6);
  }
  assert.throws(() => similarityTransform(Array.from({ length: 5 }, () => [1, 1])), /landmarks/i);
});

test("alignment samples RGB channels at identity and black-pads outside image bounds", () => {
  const pixels = new Uint8Array(112 * 112 * 3);
  for (let y = 0; y < 112; y++) for (let x = 0; x < 112; x++) pixels.set([x, y, 200], (y * 112 + x) * 3);
  const aligned = alignRgbFace(pixels, 112, 112, template);
  const at = 60 * 112 + 45;
  assert.deepEqual([aligned[at], aligned[112 * 112 + at], aligned[2 * 112 * 112 + at]], [45, 60, 200]);
  const shifted = alignRgbFace(pixels, 112, 112, template.map(([x, y]) => [x + 100, y]));
  assert.equal(shifted[60 * 112 + 45], 0);
  assert.equal(shifted[2 * 112 * 112 + 60 * 112 + 45], 0);
});
