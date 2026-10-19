import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEvidenceRuntime } from './verify-evidence-runtime.mjs';

export function assertFaceRuntime(files) {
  const paths = files.map(file => file.replaceAll('\\', '/'));
  for (const suffix of [
    '/models/resident-face/face_detection_yunet_2023mar.onnx',
    '/models/resident-face/face_recognition_sface_2021dec.onnx',
    '/models/resident-face/manifest.json',
    '/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node',
    '/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1',
  ]) if (!paths.some(file => file.endsWith(suffix))) throw new Error(`Missing face runtime file: ${suffix}`);
  if (paths.some(file => file.includes('/onnxruntime-node/bin/')
    && (/\/(win32|darwin)\//.test(file) || file.includes('/linux/arm64/') || /providers_(cuda|tensorrt)/.test(file)))) {
    throw new Error('Unexpected non-CPU or other-platform ONNX runtime in face function.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tracePath = resolve('.next/server/app/api/auth/register/face-check/route.js.nft.json');
  const { files } = JSON.parse(readFileSync(tracePath, 'utf8'));
  assertFaceRuntime(files);
  // Local builds use the host Sharp package; Vercel builds must pass on Linux.
  assertEvidenceRuntime(files, process.platform, process.arch);
  let bundleBytes = 0;
  for (const file of files) {
    const absolute = resolve(dirname(tracePath), file);
    if (!existsSync(absolute)) throw new Error(`Traced face dependency does not exist: ${file}`);
    bundleBytes += statSync(absolute).size;
  }
  if (bundleBytes > 230 * 1024 * 1024) throw new Error('Face function trace exceeds the 230 MiB build budget.');
  const manifest = JSON.parse(readFileSync('models/resident-face/manifest.json', 'utf8'));
  const ort = await import('onnxruntime-node');
  for (const model of manifest.models) {
    const bytes = readFileSync(resolve('models/resident-face', model.file));
    if (bytes.length !== model.bytes || createHash('sha256').update(bytes).digest('hex') !== model.sha256) {
      throw new Error(`Face model integrity check failed: ${model.file}`);
    }
    const session = await ort.InferenceSession.create(bytes, {
      executionProviders: ['cpu'], intraOpNumThreads: 2, interOpNumThreads: 1, logSeverityLevel: 3,
    });
    try {
      const size = model.file.includes('yunet') ? 640 : 112;
      const shape = [1, 3, size, size];
      if (session.inputMetadata[0].shape.join() !== shape.join()) throw new Error('Unexpected face model input.');
      const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', new Float32Array(3 * size * size), shape) });
      if (!Object.values(outputs).every(output => [...output.data].every(Number.isFinite))) throw new Error('Non-finite face model output.');
    } finally { await session.release(); }
  }
  console.log(`Face runtime verified: Linux CPU assets, model integrity and native inference (${(bundleBytes / 1024 / 1024).toFixed(1)} MiB trace).`);
}
