import assert from 'node:assert/strict';
import test from 'node:test';
import * as jsx from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';

const application = {
  reference: 'APP-1', status: 'CHANGES_REQUESTED', accountStatus: 'PENDING', submittedAt: new Date().toISOString(),
  correctionReason: 'Please submit clearer photos.', firstName: 'Ana', lastName: 'Reyes', municipality: 'San Jose',
  barangay: 'Barangay 1', address: '123 Main Street',
};
const fakeSelfieFile = { name: 'selfie.jpg', size: 1024, type: 'image/jpeg' };

function nodes(tree) {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree?.props?.children)];
}

function pageHarness(request) {
  const states = [], refs = [];
  let stateCursor = 0, refCursor = 0;
  const react = {
    useState(initial) {
      const index = stateCursor++;
      if (!(index in states)) states[index] = index === 0 ? application : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useCallback: fn => fn,
    useEffect() {},
  };
  const mod = loadServerModule('app/resident/application/page.tsx', {
    react,
    'react/jsx-runtime': jsx,
    'next/link': { default: 'a' },
    '../../../lib/resident-applications/client-request': request,
    '../../_components/resident-selfie-capture': { ResidentSelfieCapture: 'resident-selfie-capture', residentSelfieCaptureStyles: '' },
  });
  return () => { stateCursor = 0; refCursor = 0; return mod.default(); };
}

class FakeFormData {
  static instances = [];
  values = new Map();
  constructor(form) { this.form = form; FakeFormData.instances.push(this); }
  set(name, value) { this.values.set(name, value); }
  delete(name) { this.values.delete(name); }
  get(name) { return this.values.get(name); }
}

function confirmSelfie(render) {
  nodes(render()).find(node => node?.type === 'resident-selfie-capture').props.onCapture(fakeSelfieFile);
}
function submit(render) {
  return nodes(render()).find(node => node?.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { id: 'correction-form' } });
}
function recoveryButton(render) {
  return nodes(render()).find(node => node?.type === 'button' && /application status/i.test(String(node.props.children)));
}

test('an uncertain POST keeps evidence and requires a successful fresh status read before retry', async () => {
  const oldForm = globalThis.FormData;
  FakeFormData.instances = [];
  globalThis.FormData = FakeFormData;
  let postCount = 0, getCount = 0;
  const RequestError = class extends Error { constructor(message, status = 0, requestId) { super(message); this.status = status; this.requestId = requestId; } };
  const render = pageHarness({
    ResidentApplicationRequestError: RequestError,
    async requestResidentApplicationJson(_url, init) {
      if (init?.method === 'POST') { postCount += 1; throw new RequestError('Unable to connect.', 0); }
      getCount += 1;
      return { application };
    },
  });
  try {
    confirmSelfie(render);
    await submit(render);
    assert.equal(postCount, 1);
    assert.equal(nodes(render()).find(node => node?.type === 'button' && node.props.className === 'primary-action').props.disabled, true);
    assert.match(nodes(render()).find(node => node?.props?.role === 'alert').props.children[1].props.children, /still here/i);
    await submit(render);
    assert.equal(postCount, 1, 'an immediate second submit must stay blocked');
    await recoveryButton(render).props.onClick();
    assert.equal(getCount, 1);
    assert.ok(nodes(render()).some(node => node?.type === 'form'), 'CHANGES_REQUESTED keeps the form mounted');
    assert.match(nodes(render()).find(node => node?.props?.role === 'status').props.children, /still requested/i);
    assert.equal(nodes(render()).find(node => node?.type === 'button' && node.props.className === 'primary-action').props.disabled, false);
    await submit(render);
    assert.equal(postCount, 2, 'a deliberate retry is allowed after the fresh status read');
    assert.equal(FakeFormData.instances.at(-1).get('selfie'), fakeSelfieFile, 'the confirmed selfie survives recovery');
  } finally { globalThis.FormData = oldForm; }
});

test('a status read that finds PENDING immediately leaves the correction form', async () => {
  const oldForm = globalThis.FormData;
  globalThis.FormData = FakeFormData;
  const RequestError = class extends Error { constructor(message, status = 0) { super(message); this.status = status; } };
  const render = pageHarness({
    ResidentApplicationRequestError: RequestError,
    async requestResidentApplicationJson(_url, init) {
      if (init?.method === 'POST') throw new RequestError('Gateway failed', 502);
      return { application: { ...application, status: 'PENDING', correctionReason: null } };
    },
  });
  try {
    confirmSelfie(render);
    await submit(render);
    await recoveryButton(render).props.onClick();
    assert.equal(nodes(render()).some(node => node?.type === 'form'), false);
    assert.match(nodes(render()).find(node => node?.type === 'h1').props.children, /under review/i);
  } finally { globalThis.FormData = oldForm; }
});

test('a failed status read preserves the form and leaves status checking available', async () => {
  const oldForm = globalThis.FormData;
  globalThis.FormData = FakeFormData;
  const RequestError = class extends Error { constructor(message, status = 0) { super(message); this.status = status; } };
  const render = pageHarness({
    ResidentApplicationRequestError: RequestError,
    async requestResidentApplicationJson(_url, init) {
      if (init?.method === 'POST') throw new RequestError('Gateway failed', 500);
      throw new RequestError('Offline', 0);
    },
  });
  try {
    confirmSelfie(render);
    await submit(render);
    await recoveryButton(render).props.onClick();
    assert.ok(nodes(render()).some(node => node?.type === 'form'));
    assert.match(nodes(render()).find(node => node?.props?.role === 'alert').props.children[1].props.children, /couldn't check your status/i);
    assert.ok(recoveryButton(render));
  } finally { globalThis.FormData = oldForm; }
});

test('an expired session offers sign-in and explains that photos must be selected again', async () => {
  const oldForm = globalThis.FormData;
  globalThis.FormData = FakeFormData;
  const RequestError = class extends Error { constructor(message, status = 0) { super(message); this.status = status; } };
  const render = pageHarness({ ResidentApplicationRequestError: RequestError, async requestResidentApplicationJson() { throw new RequestError('Session expired', 401); } });
  try {
    confirmSelfie(render);
    await submit(render);
    assert.ok(nodes(render()).some(node => node?.type === 'a' && node.props.href === '/resident/login' && /sign in/i.test(node.props.children)));
    assert.match(nodes(render()).find(node => node?.props?.role === 'alert').props.children[1].props.children, /select your photos again/i);
  } finally { globalThis.FormData = oldForm; }
});

test('successful correction immediately leaves the correction form', async () => {
  const oldForm = globalThis.FormData;
  globalThis.FormData = FakeFormData;
  const render = pageHarness({
    ResidentApplicationRequestError: class extends Error {},
    async requestResidentApplicationJson(url) { assert.ok(url.endsWith('/resubmit')); return { application: { reference: 'APP-2', status: 'PENDING' } }; },
  });
  try { confirmSelfie(render); await submit(render); assert.equal(nodes(render()).some(node => node?.type === 'form'), false); }
  finally { globalThis.FormData = oldForm; }
});

test('resubmit is blocked with no request until a selfie is confirmed', async () => {
  const oldForm = globalThis.FormData;
  globalThis.FormData = FakeFormData;
  let called = false;
  const render = pageHarness({ ResidentApplicationRequestError: class extends Error {}, async requestResidentApplicationJson() { called = true; return {}; } });
  try {
    await submit(render);
    assert.equal(called, false);
    assert.ok(nodes(render()).some(node => node?.props?.role === 'alert'));
  } finally { globalThis.FormData = oldForm; }
});

test('resident requests bound stalled response bodies without repeating the POST', async () => {
  const { requestResidentApplicationJson } = loadServerModule('lib/resident-applications/client-request.ts', {});
  const previous = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; return { ok: true, json: () => new Promise(() => {}) }; };
  try {
    await assert.rejects(requestResidentApplicationJson('/test', { method: 'POST' }, 10), /Check your application status/);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = previous; }
});

test('request errors expose only a valid safe request reference', async () => {
  const { requestResidentApplicationJson } = loadServerModule('lib/resident-applications/client-request.ts', {});
  const previous = globalThis.fetch;
  const validId = '123e4567-e89b-42d3-a456-426614174000';
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Safe failure', requestId: validId }), { status: 500 });
    await assert.rejects(requestResidentApplicationJson('/test'), error => error.status === 500 && error.requestId === validId);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Safe failure', requestId: '<script>secret</script>' }), { status: 500 });
    await assert.rejects(requestResidentApplicationJson('/test'), error => error.status === 500 && error.requestId === undefined);
  } finally { globalThis.fetch = previous; }
});

for (const [name, response, expected] of [
  ['HTML HTTP 500', async () => new Response('<html>Bad gateway</html>', { status: 500 }), error => error.status === 500],
  ['network failure', async () => { throw new TypeError('offline'); }, /Unable to connect/],
  ['invalid success body', async () => new Response('null'), /invalid response/i],
]) {
  test(`request helper handles ${name}`, async () => {
    const { requestResidentApplicationJson } = loadServerModule('lib/resident-applications/client-request.ts', {});
    const previous = globalThis.fetch;
    globalThis.fetch = response;
    try { await assert.rejects(requestResidentApplicationJson('/test'), expected); }
    finally { globalThis.fetch = previous; }
  });
}
