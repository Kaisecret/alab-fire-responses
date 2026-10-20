import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const app = (id, status = 'VERIFIED', accountStatus = 'ACTIVE') => ({
  id, reference: `APP-${id}`, residentProfileId: `profile-${id}`, userId: `user-${id}`,
  firstName: id, lastName: 'Resident', email: `${id}@example.test`, phone: '09171234567', username: id,
  municipalityId: 'hamtic', municipalityName: 'Hamtic', barangayId: 'mapatag', barangayName: 'Mapatag',
  address: 'Mapatag, Hamtic, Antique', status, accountStatus, submissionNumber: 1,
  correctionReason: null, submittedAt: '2026-10-20T00:00:00Z', reviewedAt: '2026-10-20T00:01:00Z',
  reviewedByUserId: null, evidence: { frontUrl: '/private/front', backUrl: '/private/back', selfieUrl: '/private/selfie' },
  events: [{ id: 'event-1', eventType: 'AUTO_APPROVED', notes: 'Identity and phone checks passed.', createdAt: '2026-10-20T00:01:00Z' }],
});

// Execute the real component and list hook. Only browser/network surfaces and
// separately tested layout components are adapted; filtering and handlers run.
function mount({ items = [app('verified'), app('pending', 'PENDING'), app('corrections', 'CHANGES_REQUESTED'), app('suspended', 'VERIFIED', 'SUSPENDED')], detail = app('verified'), query = '' } = {}) {
  const slots = [], effects = [], timers = new Map(), listeners = new Map(), requests = [];
  let cursor = 0, dirty = true, tree, timerId = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { const next = typeof value === 'function' ? value(slots[index]) : value; if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; } }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index];
      if (!same(previous?.deps, deps)) effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    },
    useMemo(factory, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() }; return slots[index].value; },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
  };
  const location = new URL(`https://example.test/provincial-bfp/resident-applications${query}`);
  const window = {
    location,
    history: { state: null, replaceState(_state, _title, url) { location.href = String(url); } },
    addEventListener(name, callback) { listeners.set(name, callback); }, removeEventListener(name) { listeners.delete(name); },
    setInterval: () => 0, clearInterval() {},
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); },
  };
  const document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  const request = async url => { requests.push({ url, method: 'GET' }); return { items, total: items.filter(item => item.status === 'VERIFIED' && item.accountStatus === 'ACTIVE').length, metrics: {}, page: 1, pageSize: 7 }; };
  const fetch = async (url, options = {}) => { requests.push({ url, method: options.method ?? 'GET' }); return Response.json({ application: detail }); };
  const layout = name => Object.assign(() => null, { displayName: name });
  const toolbar = Object.fromEntries(['ProvincialTableToolbar', 'ProvincialManagementToolbar', 'ProvincialMunicipalityFilter', 'ProvincialManagementPagination'].map(name => [name, layout(name)]));
  const modules = new Map();
  function load(path) {
    if (modules.has(path)) return modules.get(path);
    const exports = {}; modules.set(path, exports);
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const require = name => {
      if (name === 'react') return { ...hooks, default: hooks };
      if (name === 'react/jsx-runtime') return jsx;
      if (name === './use-provincial-management-list') return load('app/_components/use-provincial-management-list.ts');
      if (name.endsWith('/client-request')) return { requestProvincialJson: request, ProvincialRequestError: class extends Error {} };
      if (name === './provincial-management-toolbar') return toolbar;
      if (name === './use-management-dialog') return { useManagementDialog() {} };
      if (name === './fire-command-header') return { FireCommandHeader: layout('FireCommandHeader') };
      if (name === './municipal-stat-cards') return { StatCards: layout('StatCards') };
      if (name === './photo-lightbox') return { PhotoLightbox: layout('PhotoLightbox') };
      if (name === './skeleton-loader') return { SkeletonDetail: layout('SkeletonDetail') };
      throw new Error(`Unexpected dependency ${name}`);
    };
    new Function('require', 'exports', 'window', 'document', 'fetch', code)(require, exports, window, document, fetch);
    return exports;
  }
  const Component = load('app/_components/provincial-resident-application-review.tsx').ProvincialResidentApplicationReview;
  async function settle() {
    for (let count = 0; count < 30; count++) {
      if (dirty) { dirty = false; cursor = 0; tree = Component({}); }
      while (effects.length) effects.shift()();
      if (dirty) continue;
      if (timers.size) { const pending = [...timers.values()]; timers.clear(); for (const callback of pending) await callback(); }
      await new Promise(setImmediate);
      if (!dirty && !effects.length && !timers.size) return;
    }
    throw new Error('Component did not settle');
  }
  const walk = (node, all = []) => { if (Array.isArray(node)) node.forEach(child => walk(child, all)); else if (node && typeof node === 'object' && node.props) { all.push(node); walk(node.props.children, all); } return all; };
  const text = node => Array.isArray(node) ? node.map(text).join(' ') : node && typeof node === 'object' ? node.type === 'style' ? '' : text(node.props?.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  return {
    settle, requests, text: () => text(tree).replace(/\s+/g, ' ').trim(),
    nodes: predicate => walk(tree).filter(predicate),
    button: pattern => walk(tree).find(node => node.type === 'button' && pattern.test(text(node))),
    child: name => walk(tree).find(node => node.type?.displayName === name),
    async act(callback) { await callback(); await settle(); },
    async popstate(query) { location.search = query; listeners.get('popstate')(); await settle(); },
    cleanup() { for (const value of slots) value?.cleanup?.(); },
  };
}

test('verified users shows only active verified residents even if a list response contains other statuses', async t => {
  const h = mount(); t.after(h.cleanup); await h.settle();
  assert.equal(h.child('FireCommandHeader').props.title, 'Verified Users');
  assert.match(h.text(), /verified Resident/);
  assert.doesNotMatch(h.text(), /pending Resident|corrections Resident|suspended Resident|Pending Review|All Statuses|Approved/);
  assert.equal(h.nodes(node => node.type === 'select').length, 0, 'No review-status selector remains');
  assert.equal(new URL(h.requests[0].url, 'https://example.test').searchParams.get('status'), 'VERIFIED');
});

test('URL restoration, search, municipality, pagination, refresh and clearing filters keep requests verified-only', async t => {
  const h = mount({ query: '?status=PENDING&municipalityId=hamtic&search=Juan&from=2026-10-01&page=1' }); t.after(h.cleanup); await h.settle();
  assert.equal(h.requests.length, 1, 'Restored pending status must be normalized before a request leaves');
  assert.equal(new URL(h.requests[0].url, 'https://example.test').searchParams.get('status'), 'VERIFIED');
  assert.equal(new URL(h.requests[0].url, 'https://example.test').searchParams.get('from'), '2026-10-01');
  await h.act(() => h.nodes(node => node.props.id === 'par-search-input')[0].props.onChange({ target: { value: 'Maria' } }));
  await h.act(() => h.child('ProvincialMunicipalityFilter').props.onChange('san-jose'));
  await h.act(() => h.child('ProvincialManagementPagination').props.setPage(2));
  await h.act(() => h.button(/^\s*Refresh/).props.onClick());
  await h.act(() => h.button(/Clear filters/).props.onClick());
  await h.popstate('?status=CHANGES_REQUESTED');
  assert.ok(h.requests.length >= 6);
  for (const request of h.requests) assert.equal(new URL(request.url, 'https://example.test').searchParams.get('status'), 'VERIFIED');
  assert.equal(h.child('ProvincialManagementToolbar').props.filters.status, 'VERIFIED');
});

test('verified resident details keep evidence inspection and expose no manual decisions', async t => {
  const h = mount({ items: [app('verified')] }); t.after(h.cleanup); await h.settle();
  await h.act(() => h.nodes(node => node.props.className === 'par-btn-review')[0].props.onClick());
  assert.match(h.text(), /verified Resident|Verified/);
  assert.equal(h.nodes(node => node.type === 'img').length, 3);
  assert.doesNotMatch(h.text(), /Approve|Request Corrections|APPROVED|Provincial Command Review Decisions/);
  assert.equal(h.nodes(node => node.type === 'textarea' || node.type === 'form').length, 0);
  await h.act(() => h.nodes(node => node.props.className === 'par-evidence-img-wrap')[0].props.onClick());
  assert.deepEqual(h.child('PhotoLightbox').props.photos, ['/private/front', '/private/back', '/private/selfie']);
  await h.act(() => h.child('PhotoLightbox').props.onClose());
  assert.equal(h.child('PhotoLightbox'), undefined);
  assert.ok(h.requests.every(request => request.method === 'GET'));
});

test('stale pending and suspended detail responses cannot open verified resident details', async t => {
  for (const detail of [app('pending', 'PENDING'), app('suspended', 'VERIFIED', 'SUSPENDED')]) {
    const h = mount({ items: [app('verified')], detail }); t.after(h.cleanup); await h.settle();
    await h.act(() => h.nodes(node => node.props.className === 'par-btn-review')[0].props.onClick());
    assert.doesNotMatch(h.text(), /pending Resident|suspended Resident|Approve Resident|Request Corrections/);
    assert.match(h.text(), /no longer.*verified|not.*verified|unavailable/i);
    assert.equal(h.nodes(node => node.type === 'img').length, 0);
  }
});
