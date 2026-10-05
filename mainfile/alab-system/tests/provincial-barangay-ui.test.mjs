import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import * as jsxRuntime from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';

// Mutations caught: hiding acknowledged groups; acknowledging a stale snapshot;
// submitting the wrong incident/municipality; dispatching before municipal dispatch;
// navigating/dismissing before acknowledgment succeeds; accepting an aborted poll.
const fixture = () => ({
  id: 'alert-1', municipalityId: 'source', municipalityName: 'San Jose', incidentCount: 3,
  openedAt: '2026-10-04T01:00:00Z', updatedAt: '2026-10-04T01:00:00Z',
  acknowledgedAt: null, incidentIds: ['fire-1', 'fire-2', 'fire-3'],
  incidents: [1, 2, 3].map(n => ({
    id: `fire-${n}`, referenceNumber: `ALAB-${n}`, status: 'ON_GOING', fireType: 'STRUCTURAL',
    barangay: 'Poblacion', dispatched: n !== 3,
    nearbyMunicipalities: [
      { municipalityId: 'near', municipalityName: 'Sibalom', stationId: 'station-near', stationName: 'Sibalom BFP', distanceMeters: 2100 },
      { municipalityId: 'far', municipalityName: 'Hamtic', stationId: 'station-far', stationName: 'Hamtic BFP', distanceMeters: 4200 },
    ], commands: [],
  })),
});

function hooks() {
  const slots = [], effects = [];
  let cursor = 0;
  return {
    render(fn) { cursor = 0; return fn(); },
    commit() { for (const effect of effects.splice(0)) effect(); },
    cleanup() { for (const slot of slots) slot?.cleanup?.(); },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
      useCallback(fn) { return fn; },
      useEffect(fn, deps) {
        const index = cursor++;
        const prior = slots[index];
        if (!prior || !deps || deps.some((dep, i) => !Object.is(dep, prior.deps?.[i]))) {
          effects.push(() => { prior?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
        }
      },
    },
  };
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...elements(node.props?.children)];
}
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (!node || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return textOf(node.props?.children);
}
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function loadFeed(harness) {
  const mod = loadServerModule('app/_components/use-provincial-barangay-alerts.ts', { react: harness.react });
  return () => harness.render(() => mod.useProvincialBarangayAlerts());
}

test('acknowledgment waits for server confirmation and preserves the coordination group', async () => {
  const originalFetch = globalThis.fetch, originalDocument = globalThis.document;
  const harness = hooks(), render = loadFeed(harness), alert = fixture(), pending = deferred();
  const calls = [];
  try {
    globalThis.document = { visibilityState: 'visible' };
    globalThis.fetch = async (url, init) => {
      calls.push({ url, ...init });
      return init.method === 'PATCH' ? pending.promise : response({ alerts: [alert] });
    };
    await render().refresh();
    const acknowledgment = render().acknowledge(alert);
    await render().refresh();
    assert.equal(calls.length, 2, 'polling pauses until the acknowledgment completes');
    assert.equal(render().alerts[0].acknowledgedAt, null);
    assert.deepEqual(JSON.parse(calls[1].body), { alertId: 'alert-1', incidentIds: ['fire-1', 'fire-2', 'fire-3'] });
    pending.resolve(response({ acknowledged: true }));
    await acknowledgment;
    assert.equal(render().alerts.length, 1);
    assert.ok(render().alerts[0].acknowledgedAt);
    assert.deepEqual(render().alerts[0].incidentIds, ['fire-1', 'fire-2', 'fire-3']);
    assert.equal(calls[0].cache, 'no-store');
  } finally { globalThis.fetch = originalFetch; globalThis.document = originalDocument; }
});

test('a changed incident snapshot keeps the popup pending after a refused acknowledgment', async () => {
  const originalFetch = globalThis.fetch, originalDocument = globalThis.document;
  const harness = hooks(), render = loadFeed(harness), alert = fixture();
  let snapshots = 0;
  try {
    globalThis.document = { visibilityState: 'visible' };
    globalThis.fetch = async (_, init) => init.method === 'PATCH'
      ? response({ error: 'Incidents changed. Review the current alert.' }, 409)
      : response({ alerts: [snapshots++ === 0 ? alert : { ...alert, incidentCount: 4, incidentIds: [...alert.incidentIds, 'fire-4'] }] });
    await render().refresh();
    await assert.rejects(render().acknowledge(alert), /Incidents changed/);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(render().alerts[0].acknowledgedAt, null);
    assert.equal(render().alerts[0].incidentCount, 4, 'conflict reloads the current unseen incident snapshot');
  } finally { globalThis.fetch = originalFetch; globalThis.document = originalDocument; }
});

test('the feed ignores late aborted polls and clears private alerts on session denial', async () => {
  const originalFetch = globalThis.fetch, originalDocument = globalThis.document;
  const harness = hooks(), render = loadFeed(harness), alert = fixture(), slow = deferred();
  let requestSignal;
  try {
    globalThis.document = { visibilityState: 'visible' };
    globalThis.fetch = async (_, init) => { requestSignal = init.signal; return slow.promise; };
    const oldRequest = render().refresh();
    globalThis.fetch = async () => response({ acknowledged: true });
    await render().acknowledge(alert);
    assert.equal(requestSignal.aborted, true);
    slow.resolve(response({ alerts: [alert] }));
    await oldRequest;
    assert.deepEqual(render().alerts, []);
    globalThis.fetch = async () => response({ alerts: [alert] });
    await render().refresh();
    globalThis.fetch = async () => { throw new Error('Offline'); };
    await render().refresh();
    assert.equal(render().alerts.length, 1);
    globalThis.fetch = async () => response({ error: 'Session denied' }, 403);
    await render().refresh();
    assert.deepEqual(render().alerts, []);
    assert.equal(render().lastCheckedAt, null);
    globalThis.document.visibilityState = 'hidden';
    let fetched = false;
    globalThis.fetch = async () => { fetched = true; return response({ alerts: [alert] }); };
    await render().refresh();
    assert.equal(fetched, false);
  } finally { globalThis.fetch = originalFetch; globalThis.document = originalDocument; }
});

function componentDependencies(harness, feed, siren = []) {
  const card = loadServerModule('app/_components/emergency-alert-card.tsx', { 'react/jsx-runtime': jsxRuntime });
  return {
    react: harness.react, 'react/jsx-runtime': jsxRuntime,
    './emergency-alert-card': card,
    '../../lib/intermunicipality/barangay-clusters': loadServerModule('lib/intermunicipality/barangay-clusters.ts', {}),
    './alarm-siren': { useAlarmSiren: on => { siren.push(on); return { audioBlocked: false }; } },
    './fire-command-header': { FireCommandHeader: () => null },
    './use-provincial-barangay-alerts': { useProvincialBarangayAlerts: () => feed },
    'next/navigation': { useSearchParams: () => new URLSearchParams('alert=alert-1') },
  };
}
const coordinationCard = section => elements(section).find(el => el.type?.name === 'MunicipalCoordinationCard');

test('the popup opens the first unacknowledged group and navigates only after acknowledgment', async () => {
  const originalWindow = globalThis.window;
  const harness = hooks(), pending = deferred(), acknowledged = fixture(), unread = { ...fixture(), id: 'alert-2' };
  acknowledged.acknowledgedAt = '2026-10-04T01:05:00Z';
  const feed = { alerts: [acknowledged, unread], acknowledge: () => pending.promise, error: '' };
  const mod = loadServerModule('app/_components/provincial-barangay-alert.tsx', componentDependencies(harness, feed));
  const navigate = [];
  try {
    globalThis.window = { location: { assign: target => navigate.push(target) } };
    const tree = harness.render(() => mod.ProvincialBarangayAlert());
    assert.ok(elements(tree).some(el => el.type === 'dialog' && el.props.role === 'alertdialog'));
    const cardElement = elements(tree).find(el => typeof el.type === 'function');
    const card = cardElement.type(cardElement.props);
    const manage = elements(card).find(el => el.type === 'button' && /Open Coordination/.test(textOf(el)));
    assert.ok(manage);
    const action = manage.props.onClick();
    await Promise.resolve();
    assert.deepEqual(navigate, []);
    pending.resolve();
    await action;
    assert.deepEqual(navigate, ['/provincial-bfp/incident-clusters?alert=alert-2']);
  } finally { globalThis.window = originalWindow; }
});

test('coordination keeps acknowledged cards and submits selected incident, municipality and resources', async () => {
  const harness = hooks(), alert = fixture(), submissions = [];
  alert.acknowledgedAt = '2026-10-04T01:05:00Z';
  const feed = { alerts: [alert], loading: false, checking: false, error: '', lastCheckedAt: new Date(), refresh: async () => {}, submitCommand: async payload => submissions.push(payload) };
  const mod = loadServerModule('app/_components/provincial-barangay-coordination.tsx', componentDependencies(harness, feed));
  const section = mod.ProvincialBarangayCoordination();
  const card = coordinationCard(section);
  assert.ok(card, 'acknowledgment must not hide the coordination card');
  const render = () => harness.render(() => card.type(card.props));
  let tree = render();
  const select = id => elements(tree).find(el => el.type === 'select' && el.props.id?.endsWith(id));
  select('-incident').props.onChange({ target: { value: 'fire-2' } });
  tree = render();
  select('-municipality').props.onChange({ target: { value: 'far' } });
  tree = render();
  const trucks = elements(tree).find(el => el.type === 'input' && el.props.id?.endsWith('-trucks'));
  const personnel = elements(tree).find(el => el.type === 'input' && el.props.id?.endsWith('-personnel'));
  trucks.props.onChange({ target: { value: '2' } });
  personnel.props.onChange({ target: { value: '4' } });
  tree = render();
  await elements(tree).find(el => el.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(submissions, [{ alertId: 'alert-1', fireReportId: 'fire-2', recipientMunicipalityId: 'far', requestedFiretrucks: 2, requestedPersonnel: 4 }]);
  tree = render();
  select('-incident').props.onChange({ target: { value: 'fire-3' } });
  tree = render();
  assert.ok(/Waiting for municipal dispatch/.test(textOf(tree)));
  assert.equal(elements(tree).find(el => el.type === 'button' && el.props.type === 'submit').props.disabled, true);
});

test('the native popup traps focus, acknowledges Escape, and restores focus after confirmed closure', async () => {
  const originalDocument = globalThis.document, originalHTMLElement = globalThis.HTMLElement;
  const harness = hooks(), alert = fixture(), pending = deferred();
  let focused = 0, opened = 0, closed = 0, prevented = 0;
  class FocusTarget { isConnected = true; focus() { focused++; } }
  const previous = new FocusTarget();
  const feed = { alerts: [alert], acknowledge: async () => { await pending.promise; feed.alerts = [{ ...alert, acknowledgedAt: '2026-10-04T01:05:00Z' }]; } };
  const mod = loadServerModule('app/_components/provincial-barangay-alert.tsx', componentDependencies(harness, feed));
  const render = () => harness.render(() => mod.ProvincialBarangayAlert());
  try {
    globalThis.document = { activeElement: previous };
    globalThis.HTMLElement = FocusTarget;
    const tree = render();
    const dialog = elements(tree).find(el => el.type === 'dialog');
    dialog.props.ref.current = {
      showModal() { opened++; }, close() { closed++; },
      querySelector: () => ({ focus() { focused++; } }),
    };
    harness.commit();
    assert.equal(opened, 1, 'showModal places the dialog in the native modal layer');
    assert.equal(focused, 1);
    dialog.props.onCancel({ preventDefault() { prevented++; } });
    assert.equal(prevented, 1);
    assert.ok(render(), 'Escape cannot silently dismiss an unacknowledged alert');
    pending.resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(render(), null);
    harness.commit();
    assert.equal(closed, 1);
    assert.equal(focused, 2, 'the officer returns to the control used before the alert');
  } finally { harness.cleanup(); globalThis.document = originalDocument; globalThis.HTMLElement = originalHTMLElement; }
});

test('resource command validation refuses excessive resources and shows receiving-municipality status', async () => {
  const harness = hooks(), alert = fixture(), submissions = [];
  alert.incidents[1].commands = [{ id: 'command-1', recipientMunicipalityId: 'near', recipientMunicipalityName: 'Sibalom', status: 'PARTIALLY_ACCEPTED' }];
  const feed = { alerts: [alert], loading: false, checking: false, error: '', lastCheckedAt: new Date(), refresh: async () => {}, submitCommand: async payload => submissions.push(payload) };
  const mod = loadServerModule('app/_components/provincial-barangay-coordination.tsx', componentDependencies(harness, feed));
  const card = coordinationCard(mod.ProvincialBarangayCoordination());
  const render = () => harness.render(() => card.type(card.props));
  let tree = render();
  assert.match(textOf(tree), /Sibalom Partially accepted/);
  const input = elements(tree).find(el => el.type === 'input' && el.props.id.endsWith('-trucks'));
  input.props.onChange({ target: { value: '501' } });
  tree = render();
  await elements(tree).find(el => el.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(submissions, []);
  assert.ok(elements(render()).some(el => el.props?.role === 'alert'));
});

test('five-second polling cancels hidden and unmounted requests without retaining private records', async () => {
  const originalWindow = globalThis.window, originalDocument = globalThis.document, originalFetch = globalThis.fetch;
  const harness = hooks(), render = loadFeed(harness);
  const listeners = new Map(), timers = new Map(), calls = [];
  let initial, poll, nextId = 0, interval;
  try {
    globalThis.document = {
      visibilityState: 'visible',
      addEventListener(name, callback) { listeners.set(name, callback); },
      removeEventListener(name) { listeners.delete(name); },
    };
    globalThis.window = {
      setTimeout(callback) { initial = callback; const id = ++nextId; timers.set(id, callback); return id; },
      setInterval(callback, ms) { poll = callback; interval = ms; const id = ++nextId; timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); }, clearInterval(id) { timers.delete(id); },
      addEventListener() {}, removeEventListener() {},
    };
    globalThis.fetch = (_, init) => {
      const pending = deferred();
      calls.push({ signal: init.signal, pending });
      return pending.promise;
    };
    render(); harness.commit();
    assert.equal(interval, 5000);
    initial();
    assert.equal(calls.length, 1);
    globalThis.document.visibilityState = 'hidden';
    listeners.get('visibilitychange')();
    assert.equal(calls[0].signal.aborted, true);
    poll();
    assert.equal(calls.length, 1);
    globalThis.document.visibilityState = 'visible';
    listeners.get('visibilitychange')();
    assert.equal(calls.length, 2);
    harness.cleanup();
    assert.equal(calls[1].signal.aborted, true);
    for (const call of calls) call.pending.resolve(response({ alerts: [fixture()] }));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(render().alerts, []);
    assert.equal(timers.size, 0);
    assert.equal(listeners.size, 0);
    assert.deepEqual(loadFeed(hooks())().alerts, []);
  } finally { globalThis.window = originalWindow; globalThis.document = originalDocument; globalThis.fetch = originalFetch; }
});

test('a refused server acknowledgment keeps the popup visible and prevents navigation', async () => {
  const originalWindow = globalThis.window;
  const harness = hooks(), feed = { alerts: [fixture()], acknowledge: async () => { throw new Error('Server rejected acknowledgment'); } };
  const mod = loadServerModule('app/_components/provincial-barangay-alert.tsx', componentDependencies(harness, feed));
  let navigated = false;
  const render = () => harness.render(() => mod.ProvincialBarangayAlert());
  try {
    globalThis.window = { location: { assign() { navigated = true; } } };
    let card = elements(render()).find(el => typeof el.type === 'function');
    await elements(card.type(card.props)).find(el => el.type === 'button' && /Open Coordination/.test(textOf(el))).props.onClick();
    assert.equal(navigated, false);
    const tree = render();
    assert.ok(elements(tree).some(el => el.type === 'dialog'));
    card = elements(tree).find(el => typeof el.type === 'function');
    assert.match(textOf(card.type(card.props)), /Server rejected acknowledgment/);
  } finally { globalThis.window = originalWindow; }
});

test('the popup sounds the shared siren only while an alert waits for acknowledgment', () => {
  const harness = hooks(), siren = [], unread = fixture();
  const feed = { alerts: [unread], acknowledge: async () => {} };
  const mod = loadServerModule('app/_components/provincial-barangay-alert.tsx', componentDependencies(harness, feed, siren));
  const tree = harness.render(() => mod.ProvincialBarangayAlert());
  assert.ok(tree);
  assert.equal(siren.at(-1), true);
  feed.alerts = [{ ...unread, acknowledgedAt: '2026-10-04T01:05:00Z' }];
  assert.equal(harness.render(() => mod.ProvincialBarangayAlert()), null);
  assert.equal(siren.at(-1), false, 'acknowledging silences the siren');
});

test('the shared siren starts when turned on and stops when turned off', async () => {
  const originalWindow = globalThis.window;
  const harness = hooks();
  let started = 0, stopped = 0;
  const param = () => ({ value: 0.0001, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  class FakeAudioContext {
    state = 'running'; currentTime = 0; destination = {};
    async resume() {}
    createGain() { return { gain: param(), connect() {} }; }
    createOscillator() { return { type: '', frequency: param(), connect() {}, start() { started++; }, stop() { stopped++; } }; }
  }
  try {
    globalThis.window = { AudioContext: FakeAudioContext, setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {} };
    const mod = loadServerModule('app/_components/alarm-siren.ts', { react: harness.react });
    harness.render(() => mod.useAlarmSiren(true));
    harness.commit();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(started, 1);
    harness.render(() => mod.useAlarmSiren(true));
    harness.commit();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(started, 1, 'a running siren is not started twice');
    harness.render(() => mod.useAlarmSiren(false));
    harness.commit();
    assert.equal(stopped, 1);
  } finally { harness.cleanup(); globalThis.window = originalWindow; }
});

test('coordination puts incidents ready for support first, folds the rest, and flags a barangay with three or more reports', () => {
  const harness = hooks(), alert = fixture();
  alert.incidents[0].dispatched = false;
  alert.incidents[2].dispatched = true;
  const feed = { alerts: [alert], loading: false, checking: false, error: '', lastCheckedAt: new Date(), refresh: async () => {}, submitCommand: async () => {} };
  const mod = loadServerModule('app/_components/provincial-barangay-coordination.tsx', componentDependencies(harness, feed));
  const card = coordinationCard(mod.ProvincialBarangayCoordination());
  const tree = harness.render(() => card.type(card.props));
  const incident = elements(tree).find(el => el.type === 'select' && el.props.id?.endsWith('-incident'));
  assert.equal(incident.props.value, 'fire-2', 'the form starts on the first incident the province can support');
  assert.match(textOf(tree), /Poblacion · 3 reports/);
  const folded = elements(tree).find(el => el.type === 'details');
  assert.ok(folded, 'incidents waiting for dispatch are folded away');
  assert.match(textOf(folded), /1 waiting for verification or dispatch/);
  assert.match(textOf(folded), /ALAB-1/);
});

test('coordination lives on its own screen instead of the Assistance Requests page', () => {
  assert.doesNotMatch(readFileSync('app/provincial-bfp/assistance-requests/page.tsx', 'utf8'), /ProvincialBarangayCoordination/);
  assert.ok(existsSync('app/provincial-bfp/incident-clusters/page.tsx'));
  assert.match(readFileSync('app/provincial-bfp/incident-clusters/page.tsx', 'utf8'), /ProvincialBarangayCoordination/);
  assert.match(readFileSync('app/_components/provincial-bfp-layout.tsx', 'utf8'), /href: '\/provincial-bfp\/incident-clusters'/);
});
