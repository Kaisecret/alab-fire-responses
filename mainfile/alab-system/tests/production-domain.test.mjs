import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server.js';

const configPath = fileURLToPath(new URL('../next.config.ts', import.meta.url));
const code = ts.transpileModule(readFileSync(configPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const configExports = {};
new Function('exports', '__dirname', code)(configExports, dirname(configPath));
const nextConfig = configExports.default;

for (const [url, location] of [
  ['https://alab-fire-responses-bynr.vercel.app/', 'https://www.alabfireresponse.dev/'],
  ['https://alab-fire-responses-bynr.vercel.app/resident/login?next=%2Fresident%2Freports', 'https://www.alabfireresponse.dev/resident/login?next=%2Fresident%2Freports'],
  ['https://alab-fire-responses-bynr.vercel.app/resident/reports/123?from=email&lang=en', 'https://www.alabfireresponse.dev/resident/reports/123?from=email&lang=en'],
  ['https://alab-fire-responses-bynr.vercel.app/apiary', 'https://www.alabfireresponse.dev/apiary'],
]) {
  test(`permanently redirects ${url} to the same page on the public domain`, async () => {
    const response = await unstable_getResponseFromNextConfig({ url, nextConfig });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), location);
  });
}

for (const url of [
  'https://www.alabfireresponse.dev/',
  'https://www.alabfireresponse.dev/resident/login',
  'http://localhost:3000/',
  'https://alab-preview.vercel.app/',
  'https://alab-fire-responses-bynr.vercel.app/api/mobile-bfp/login',
  'https://alab-fire-responses-bynr.vercel.app/api/resident/me',
  'https://alab-fire-responses-bynr.vercel.app/api',
  'https://alab-fire-responses-bynr.vercel.app/_next/static/chunk.js',
]) {
  test(`does not redirect ${url}`, async () => {
    const response = await unstable_getResponseFromNextConfig({ url, nextConfig });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
  });
}
