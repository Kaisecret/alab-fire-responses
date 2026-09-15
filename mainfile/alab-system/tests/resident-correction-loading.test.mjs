import assert from 'node:assert/strict';
import test from 'node:test';
import * as jsx from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';
import { existsSync } from 'node:fs';
// A confirmed selfie is required before resubmit(); simulate the camera
// component having already captured and confirmed a photo so these tests
// (which cover network/error handling, not the camera itself — see
// resident-selfie-capture.test.mjs) can still reach the fetch call.
const fakeSelfieFile = { name: 'selfie.jpg', size: 1024, type: 'image/jpeg' };
function harness() {
  const slots = [
    { reference: 'APP-1', status: 'CHANGES_REQUESTED', accountStatus: 'PENDING', submittedAt: new Date().toISOString() },
    '', false, fakeSelfieFile,
  ];
  let cursor = 0;
  const request = existsSync('lib/resident-applications/client-request.ts') ? loadServerModule('lib/resident-applications/client-request.ts', {}) : {};
  const mod = loadServerModule('app/resident/application/page.tsx', {
    react: { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; }, useRef(initial) { const i = cursor++; return slots[i] ??= {current:initial}; }, useCallback: fn => fn, useEffect() {} },
    'react/jsx-runtime': jsx, 'next/link': {default:'a'}, '../../../lib/resident-applications/client-request': request,
    '../../_components/resident-selfie-capture': { ResidentSelfieCapture: 'div', residentSelfieCaptureStyles: '' },
  });
  return () => { cursor = 0; return mod.default(); };
}
function nodes(tree) { if (!tree) return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree?.props?.children)]; }
class FakeFormData { set() {} }
for (const [name, response] of [
  ['network failure', () => Promise.reject(new TypeError('offline'))],
  ['HTML server error', async () => new Response('<html>Bad gateway</html>', {status:502})],
]) test(`correction submission exits loading after ${name}`, async () => {
  const oldFetch = globalThis.fetch, oldForm = globalThis.FormData;
  globalThis.fetch = response; globalThis.FormData = FakeFormData;
  try {
    const render = harness();
    await nodes(render()).find(n => n?.type === 'form').props.onSubmit({preventDefault(){},currentTarget:{}});
    const tree = nodes(render());
    assert.equal(tree.find(n => n?.type === 'button' && n.props.className === 'primary-action').props.disabled, false);
    assert.ok(tree.find(n => n?.props?.role === 'alert'));
  } finally { globalThis.fetch=oldFetch; globalThis.FormData=oldForm; }
});
test('successful correction immediately leaves the correction form', async () => {
  const oldFetch=globalThis.fetch, oldForm=globalThis.FormData;
  globalThis.FormData=FakeFormData;
  globalThis.fetch=async url => { assert.ok(url.endsWith('/resubmit')); return new Response(JSON.stringify({application:{reference:'APP-2',status:'PENDING'}})); };
  try { const render=harness(); await nodes(render()).find(n=>n?.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}}); assert.equal(nodes(render()).some(n=>n?.type==='form'),false); }
  finally { globalThis.fetch=oldFetch; globalThis.FormData=oldForm; }
});

test('resubmit is blocked with no fetch call until a selfie is confirmed', async () => {
  const oldFetch = globalThis.fetch, oldForm = globalThis.FormData;
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; return new Response('{}'); };
  globalThis.FormData = FakeFormData;
  try {
    const slots = [
      { reference: 'APP-1', status: 'CHANGES_REQUESTED', accountStatus: 'PENDING', submittedAt: new Date().toISOString() },
      '', false, null, // no confirmed selfie file
    ];
    let cursor = 0;
    const request = existsSync('lib/resident-applications/client-request.ts') ? loadServerModule('lib/resident-applications/client-request.ts', {}) : {};
    const mod = loadServerModule('app/resident/application/page.tsx', {
      react: { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; }, useRef(initial) { const i = cursor++; return slots[i] ??= {current:initial}; }, useCallback: fn => fn, useEffect() {} },
      'react/jsx-runtime': jsx, 'next/link': {default:'a'}, '../../../lib/resident-applications/client-request': request,
      '../../_components/resident-selfie-capture': { ResidentSelfieCapture: 'div', residentSelfieCaptureStyles: '' },
    });
    const render = () => { cursor = 0; return mod.default(); };
    await nodes(render()).find(n => n?.type === 'form').props.onSubmit({preventDefault(){},currentTarget:{}});
    assert.equal(fetchCalled, false);
    const tree = nodes(render());
    assert.ok(tree.find(n => n?.props?.role === 'alert' && /camera/i.test(n.props.children)));
    assert.equal(tree.find(n => n?.type === 'button' && n.props.className === 'primary-action').props.disabled, true);
  } finally { globalThis.fetch = oldFetch; globalThis.FormData = oldForm; }
});

test('resident requests bound stalled response bodies', async () => {
  const {requestResidentApplicationJson} = loadServerModule('lib/resident-applications/client-request.ts', {});
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({ok:true,json:()=>new Promise(()=>{})});
  try { await assert.rejects(requestResidentApplicationJson('/test', {method:'POST'}, 10), /Check your application status/); }
  finally { globalThis.fetch=previous; }
});
