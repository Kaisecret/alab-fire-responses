import test from 'node:test';
import assert from 'node:assert/strict';
import { bfpSessionCookieName, createBfpSession, verifyBfpSession } from '../lib/auth/session.ts';

test('two municipal tabs retain different signed accounts when one logs out', () => {
  process.env.AUTH_SECRET = 'tab-isolation-test-secret-with-more-than-32-characters';
  const a = new Headers({ 'x-alab-municipal-tab': 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' });
  const b = new Headers({ 'x-alab-municipal-tab': 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' });
  const nameA = bfpSessionCookieName('MUNICIPAL_BFP', a);
  const nameB = bfpSessionCookieName('MUNICIPAL_BFP', b);
  assert.notEqual(nameA, nameB);
  const jar = new Map();
  for (const [name, userId] of [[nameA, 'officer-a'], [nameB, 'officer-b']]) {
    jar.set(name, createBfpSession({ userId, displayName: userId, role: 'MUNICIPAL_BFP', municipalityId: userId, mustChangePassword: false }));
  }
  assert.equal(verifyBfpSession(jar.get(nameA)).userId, 'officer-a');
  jar.delete(nameA);
  assert.equal(verifyBfpSession(jar.get(nameB)).userId, 'officer-b');
});

test('browser requests isolate tabs, duplicated tabs, reloads and unrelated portals', async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const held = new Set();
  const requestLog = [];
  const storage = (initial = []) => {
    const values = new Map(initial);
    return { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k), values };
  };
  const makeWindow = () => ({ location: { origin: 'https://alab.test', pathname: '/municipal-bfp' }, events: {}, addEventListener(name, fn) { this.events[name] = fn; } });
  const a = storage(), b = storage();
  const wa = makeWindow(), wb = makeWindow();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { async request(name, options, callback) {
    if (held.has(name)) return callback(null);
    held.add(name);
    try { await callback({ name }); } finally { held.delete(name); }
  } } } });
  globalThis.fetch = async (input, init) => { requestLog.push({ input, init }); return new Response('{}'); };
  const activate = (s,w) => { globalThis.window = w; globalThis.sessionStorage = s; };
  try {
    const fa = (await import('../lib/auth/municipal-tab-fetch.ts?tab=a')).municipalTabFetch;
    const fb = (await import('../lib/auth/municipal-tab-fetch.ts?tab=b')).municipalTabFetch;
    activate(a,wa);
    await fa('/api/municipal-bfp/me');
    const idA = requestLog.at(-1).init.headers.get('x-alab-municipal-tab');
    activate(b,wb);
    await fb('/api/municipal-bfp/me');
    const idB = requestLog.at(-1).init.headers.get('x-alab-municipal-tab');
    assert.notEqual(idA,idB);
    await fb(new Request('https://alab.test/api/municipal-bfp/me', { headers: { 'x-test': 'preserved' } }));
    assert.equal(requestLog.at(-1).init.headers.get('x-test'), 'preserved');
    const clone = storage(a.values), wc = makeWindow();
    activate(clone,wc);
    await (await import('../lib/auth/municipal-tab-fetch.ts?tab=clone')).municipalTabFetch('/api/municipal-bfp/me');
    assert.notEqual(requestLog.at(-1).init.headers.get('x-alab-municipal-tab'), idA);
    activate(a,wa);
    await fa('/api/auth/bfp/logout', { method:'POST', body:'portal=MUNICIPAL' });
    assert.equal(requestLog.at(-1).init.headers.get('x-alab-municipal-tab'), idA);
    activate(b,wb);
    await fb('/api/municipal-bfp/me');
    assert.equal(requestLog.at(-1).init.headers.get('x-alab-municipal-tab'), idB);
    wb.events.pagehide();
    await new Promise(resolve => setTimeout(resolve,0));
    activate(b,makeWindow());
    await (await import('../lib/auth/municipal-tab-fetch.ts?tab=reload')).municipalTabFetch('/api/municipal-bfp/me');
    assert.equal(requestLog.at(-1).init.headers.get('x-alab-municipal-tab'),idB);
    await fb('https://external.test/api/municipal-bfp/me');
    assert.equal(requestLog.at(-1).init,undefined);
    window.location.pathname = '/provincial-bfp/login';
    await fb('/api/auth/bfp/login');
    assert.equal(requestLog.at(-1).init,undefined);
  } finally {
    globalThis.window = originalWindow;
    globalThis.sessionStorage = originalStorage;
    globalThis.fetch = originalFetch;
    if (originalNavigator) Object.defineProperty(globalThis,'navigator',originalNavigator);
  }
});

test('missing or malformed tab selectors never fall back to the shared municipal cookie', () => {
  const legacy = bfpSessionCookieName('MUNICIPAL_BFP');
  assert.notEqual(bfpSessionCookieName('MUNICIPAL_BFP', new Headers()), legacy);
  assert.notEqual(bfpSessionCookieName('MUNICIPAL_BFP', new Headers({ 'x-alab-municipal-tab': '../bad' })), legacy);
  assert.equal(bfpSessionCookieName('PROVINCIAL_BFP', new Headers()), bfpSessionCookieName('PROVINCIAL_BFP'));
});
