import assert from 'node:assert/strict';
import test from 'node:test';
import { assertEvidenceRuntime } from '../scripts/verify-evidence-runtime.mjs';

const addon = '../../../../node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node';
const library = '../../../../node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.3';

test('an evidence bundle with its native addon and shared library is deployable', () => {
  assert.doesNotThrow(() => assertEvidenceRuntime([addon, library], 'linux', 'x64'));
});

test('rejects a traced addon whose runtime libvips binary was omitted', () => {
  assert.throws(() => assertEvidenceRuntime([addon, '../../../../node_modules/@img/sharp-libvips-linux-x64/lib/index.js'], 'linux', 'x64'), /libvips/);
});

test('a WASM fallback or different platform does not mask missing native runtime files', () => {
  assert.throws(() => assertEvidenceRuntime([library, '../../../../node_modules/@img/sharp-wasm32/lib/sharp.node.wasm'], 'linux', 'x64'), /native addon/);
  assert.throws(() => assertEvidenceRuntime([addon, library], 'win32', 'x64'), /native addon/);
});

test('supports Windows file traces with backslash paths', () => {
  assert.doesNotThrow(() => assertEvidenceRuntime([
    '..\\node_modules\\@img\\sharp-win32-x64\\lib\\sharp-win32-x64.node',
    '..\\node_modules\\@img\\sharp-win32-x64\\lib\\libvips-cpp-8.18.3.dll',
  ], 'win32', 'x64'));
});
