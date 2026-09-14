import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import * as jsx from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';

function harness(path, name) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn) { return fn(); },
    useCallback(fn) { return fn; },
    useEffect(fn) { effects.push(fn); },
    useLayoutEffect(fn) { effects.push(fn); },
  };
  const requestPath = 'lib/provincial-bfp/client-request.ts';
  const request = existsSync(requestPath) ? loadServerModule(requestPath, {}) : {};
  const mod = loadServerModule(path, {
    react, 'react/jsx-runtime': jsx,
    'react-dom': { createPortal: (children, target) => ({ type: 'portal', props: { children, target } }) },
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => '/provincial-bfp/municipal-accounts' },
    './notifications/notification-bell': { NotificationBell: 'notification-bell' },
    '../../lib/provincial-bfp/client-request': request,
    './provincial-account-dialog': { ProvincialAccountDialog: 'account-dialog' },
    './provincial-profile-popover': { ProvincialProfilePopover: 'profile-popover' },
  });
  return { render() { cursor = 0; effects.length = 0; return mod[name]({ children: null }); }, effects };
}

function all(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(all);
  return [tree, ...all(tree?.props?.children)];
}
function text(tree) { return all(tree).filter(node => typeof node === 'string').join(' '); }
function find(tree, predicate) { return all(tree).find(node => node?.props && predicate(node)); }

test('account creation errors stay visible inside the open form', async () => {
  const originalFetch = globalThis.fetch;
  const h = harness('app/_components/provincial-municipal-accounts.tsx', 'ProvincialMunicipalAccounts');
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'This municipality already has an administrator.' }), { status: 400 });
    let tree = h.render();
    find(tree, node => node.type === 'button' && text(node).includes('Issue New Account')).props.onClick();
    tree = h.render();
    await find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    tree = h.render();
    const dialog = find(tree, node => node.type === 'account-dialog' || node.props['aria-label'] === 'Issue municipal BFP account');
    assert.ok(text(dialog).includes('This municipality already has an administrator.'));
  } finally { globalThis.fetch = originalFetch; }
});

test('the account popup cannot be dismissed while a request is being submitted', async () => {
  const originalFetch = globalThis.fetch;
  const h = harness('app/_components/provincial-municipal-accounts.tsx', 'ProvincialMunicipalAccounts');
  let finish;
  try {
    globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
    find(h.render(), node => node.type === 'button' && text(node).includes('Issue New Account')).props.onClick();
    const pending = find(h.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    const cancel = find(h.render(), node => node.type === 'button' && text(node) === 'Cancel');
    assert.equal(cancel.props.disabled, true);
    finish(new Response(JSON.stringify({ error: 'Test rejection' }), { status: 400 }));
    await pending;
  } finally {
    if (finish) finish(new Response('{}', { status: 400 }));
    globalThis.fetch = originalFetch;
  }
});

test('provincial identity never shows a fabricated officer while loading or after failure', async () => {
  const originalFetch = globalThis.fetch;
  const h = harness('app/_components/provincial-bfp-layout.tsx', 'ProvincialBfpLayout');
  try {
    assert.equal(text(h.render()).includes('Juan Dela Cruz'), false);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Profile unavailable' }), { status: 500 });
    const cleanup = h.effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(text(h.render()).includes('Juan Dela Cruz'), false);
    cleanup?.();
  } finally { globalThis.fetch = originalFetch; }
});

test('page content does not establish a transformed containing block for fixed provincial popups', () => {
  const source = readFileSync('app/_components/provincial-bfp-layout.tsx', 'utf8');
  const content = source.match(/\.pbfp-content\s*\{([^}]+)\}/)[1];
  assert.doesNotMatch(content, /will-change\s*:[^;]*(?:transform|opacity)/);
  const entrance = source.slice(source.indexOf('@keyframes pbfpContentEntrance'), source.indexOf('.pbfp-content {'));
  assert.doesNotMatch(entrance, /transform\s*:/);
});

test('provincial requests terminate a stalled response body and retain HTTP errors', async () => {
  assert.ok(existsSync('lib/provincial-bfp/client-request.ts'), 'Bounded provincial request helper is required');
  const { requestProvincialJson } = loadServerModule('lib/provincial-bfp/client-request.ts', {});
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) });
    await assert.rejects(requestProvincialJson('/test', {}, 10), /timed out/i);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Please sign in again.' }), { status: 401 });
    await assert.rejects(requestProvincialJson('/test'), error => error.status === 401 && /sign in/.test(error.message));
  } finally { globalThis.fetch = originalFetch; }
});

test('account loading settles on failure and exposes a retry action', async () => {
  const originalFetch = globalThis.fetch;
  const h = harness('app/_components/provincial-municipal-accounts.tsx', 'ProvincialMunicipalAccounts');
  try {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    h.render();
    const cleanup = h.effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    const tree = h.render();
    assert.ok(text(tree).includes('Unable to connect.'));
    assert.equal(text(tree).includes('Loading municipal account roster'), false);
    assert.ok(find(tree, node => node.type === 'button' && text(node) === 'Retry'));
    cleanup();
  } finally { globalThis.fetch = originalFetch; }
});

test('successful account creation keeps issued credentials if roster refresh fails', async () => {
  const originalFetch = globalThis.fetch;
  const h = harness('app/_components/provincial-municipal-accounts.tsx', 'ProvincialMunicipalAccounts');
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      account: { email: 'test@example.invalid', municipalityName: 'Test Municipality' },
      temporaryPassword: 'test-only-generated-value',
    }), { status: 201 });
    find(h.render(), node => node.type === 'button' && text(node).includes('Issue New Account')).props.onClick();
    await find(h.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    globalThis.fetch = async () => new Response('{}', { status: 500 });
    h.render();
    const cleanup = h.effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    const tree = h.render();
    assert.ok(text(tree).includes('test-only-generated-value'));
    assert.equal(find(tree, node => node.type === 'form'), undefined);
    cleanup();
  } finally { globalThis.fetch = originalFetch; }
});

test('cancelling a provincial read interrupts a stalled body and malformed responses are retryable', async () => {
  const { requestProvincialJson } = loadServerModule('lib/provincial-bfp/client-request.ts', {});
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) });
    const controller = new AbortController();
    const pending = requestProvincialJson('/test', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, error => error.name === 'AbortError');
    globalThis.fetch = async () => new Response('<html>Unavailable</html>', { status: 502 });
    await assert.rejects(requestProvincialJson('/test'), error => error.status === 502 && /retry/i.test(error.message));
    globalThis.fetch = async () => new Response('not json', { status: 200 });
    await assert.rejects(requestProvincialJson('/test'), /invalid response/i);
  } finally { globalThis.fetch = originalFetch; }
});

test('profile popup stays within the viewport at either trigger and on resize', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const listeners = new Map();
  const panel = { style: {}, offsetWidth: 240, offsetHeight: 180, querySelector: () => null };
  let bounds = { left: 940, right: 990, top: 20, bottom: 60 };
  const anchor = { getBoundingClientRect: () => bounds };
  let mount;
  try {
    globalThis.window = { innerWidth: 1000, innerHeight: 700,
      addEventListener: (name, fn) => listeners.set(`window:${name}`, fn),
      removeEventListener: name => listeners.delete(`window:${name}`) };
    globalThis.document = { body: {},
      addEventListener: (name, fn) => listeners.set(`document:${name}`, fn),
      removeEventListener: name => listeners.delete(`document:${name}`) };
    const { ProvincialProfilePopover } = loadServerModule('app/_components/provincial-profile-popover.tsx', {
      react: { useRef: () => ({ current: panel }), useLayoutEffect: fn => { mount = fn; } },
      'react/jsx-runtime': jsx,
      'react-dom': { createPortal: (children, target) => ({ children, target }) },
    });
    const output = ProvincialProfilePopover({ anchor, children: null, onClose() {} });
    assert.equal(output.target, document.body);
    const cleanup = mount();
    assert.equal(panel.style.left, '748px');
    assert.equal(panel.style.top, '68px');
    bounds = { left: 10, right: 60, top: 640, bottom: 690 };
    listeners.get('window:scroll')();
    assert.equal(panel.style.left, '12px');
    assert.equal(panel.style.top, '452px');
    window.innerWidth = 320;
    bounds = { left: 260, right: 310, top: 20, bottom: 60 };
    listeners.get('window:resize')();
    assert.ok(parseFloat(panel.style.left) + panel.offsetWidth <= 308);
    cleanup();
    assert.equal(listeners.size, 0);
  } finally { globalThis.window = originalWindow; globalThis.document = originalDocument; }
});
