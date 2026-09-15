import assert from 'node:assert/strict';
import test from 'node:test';
import * as jsx from 'react/jsx-runtime';
import { readFileSync } from 'node:fs';
import { loadServerModule } from './helpers/load-server-module.mjs';

const { validateResidentIdFile } = loadServerModule('app/resident/application/page.tsx', {
  react: { useState() {}, useRef() {}, useCallback() {}, useEffect() {} },
  'react/jsx-runtime': jsx,
  'next/link': { default: 'a' },
  '../../../lib/resident-applications/client-request': { ResidentApplicationRequestError: class extends Error {}, requestResidentApplicationJson() {} },
  '../../_components/resident-selfie-capture': { ResidentSelfieCapture: 'div', residentSelfieCaptureStyles: '' },
});

test('ID validation accepts JPG, PNG, and WebP files up to 6 MiB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(validateResidentIdFile({ type, size: 6 * 1024 * 1024 }), '');
});

test('ID validation returns field-safe errors for unsupported or oversized files', () => {
  assert.match(validateResidentIdFile({ type: 'application/pdf', size: 1024 }), /JPG, PNG or WebP/i);
  assert.match(validateResidentIdFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 + 1 }), /6 MB/i);
});

test('correction page implements accessible selected ID previews and optional back removal', () => {
  const page = readFileSync('app/resident/application/page.tsx', 'utf8');
  assert.match(page, /Choose front photo/);
  assert.match(page, /Choose back photo/);
  assert.match(page, /Change photo/);
  assert.match(page, />Remove</);
  assert.match(page, /aria-describedby=\{frontIdError \? "front-id-help front-id-error" : "front-id-help"\}/);
  assert.match(page, /URL\.revokeObjectURL/);
  assert.match(page, /backInputRef\.current\.value = ""/);
  assert.match(page, /formData\.set\("frontId", frontId\.file\)/);
  assert.match(page, /formData\.delete\("backId"\)/);
  assert.doesNotMatch(page, /className="upload"/);
});
