import assert from 'node:assert/strict';
import test from 'node:test';
import { assertFaceRuntime } from '../scripts/verify-face-runtime.mjs';

const required = [
  '../models/resident-face/face_detection_yunet_2023mar.onnx',
  '../models/resident-face/face_recognition_sface_2021dec.onnx',
  '../models/resident-face/manifest.json',
  '../node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node',
  '../node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1',
];

test('face deployment requires both pinned models and the Linux CPU runtime', () => {
  assert.doesNotThrow(() => assertFaceRuntime(required));
  for (const missing of required) assert.throws(() => assertFaceRuntime(required.filter(file => file !== missing)), /Missing/);
});

test('face deployment refuses GPU or other-platform native binaries', () => {
  for (const extra of ['win32/x64/onnxruntime_binding.node', 'darwin/arm64/libonnxruntime.dylib', 'linux/arm64/libonnxruntime.so.1', 'linux/x64/libonnxruntime_providers_cuda.so']) {
    assert.throws(() => assertFaceRuntime([...required, `../node_modules/onnxruntime-node/bin/napi-v6/${extra}`]), /Unexpected/);
  }
});
