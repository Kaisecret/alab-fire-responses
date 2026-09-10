import assert from 'node:assert/strict';
import test from 'node:test';
import * as jsx from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';

test('open incident detail polls visible tabs, retains data on refresh failure, clears ended access, and cleans up', async () => {
  const effects = [], intervals = new Map(), timeouts = [], listeners = new Map(), states = [];
  let reply = { incident: { id: 'incident-a', accessScope: 'OBSERVER', status: 'RESPONDING' } }, status = 200;
  let fetchCount = 0;
  const oldWindow = global.window, oldDocument = global.document;
  global.window = {
    setTimeout: fn => { timeouts.push(fn); return timeouts.length; }, clearTimeout() {},
    setInterval: (fn, delay) => { intervals.set(delay, fn); return delay; }, clearInterval: id => intervals.delete(id),
    addEventListener() {}, removeEventListener() {},
  };
  global.document = {
    visibilityState: 'visible', body: { style: {} },
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: event => listeners.delete(event),
  };
  const react = {
    useState: initial => { const i = states.length; states.push(initial); return [initial, value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => ({ current: initial }), useCallback: fn => fn,
    useEffect: fn => effects.push(fn),
  };
  const tick = async fn => { fn(); await new Promise(resolve => setImmediate(resolve)); };
  let cleanup = [];
  try {
    const module = loadServerModule('app/_components/municipal-incident-detail.tsx', {
      react, 'react/jsx-runtime': jsx, 'react-dom': { createPortal: node => node },
      '../../lib/auth/municipal-tab-fetch': { municipalTabFetch: async () => { fetchCount++; return Response.json(reply, { status }); } },
      './bfp-data-loader': { BfpDataLoader() {} }, './municipal-incident-map': { MunicipalIncidentMap() {} },
      '../../lib/fire-reports/validation': { canMunicipalResolveReport: () => false },
      '../../lib/fire-reports/types': { fireReportStatusLabels: {} },
      './intermunicipality-coordination-panel': { IntermunicipalityCoordinationPanel() {} },
    });
    module.MunicipalIncidentDetail({ incidentId: 'incident-a' });
    cleanup = effects.map(effect => effect()).filter(fn => typeof fn === 'function');
    for (const fn of timeouts) await tick(fn);
    assert.equal(fetchCount, 1);
    assert.ok(intervals.has(5000), 'open detail must poll every five seconds');
    reply = { incident: { id: 'incident-a', status: 'RESPONDER_ARRIVED' } };
    await tick(intervals.get(5000));
    assert.equal(states[1].status, 'RESPONDER_ARRIVED');
    global.document.visibilityState = 'hidden';
    await tick(intervals.get(5000));
    assert.equal(fetchCount, 2);
    global.document.visibilityState = 'visible';
    reply = { error: 'Temporary connection failure' }; status = 503;
    await tick(listeners.get('visibilitychange'));
    assert.equal(states[1].status, 'RESPONDER_ARRIVED', 'transient failure must retain last successful detail');
    reply = { incident: { id: 'incident-a', status: 'UNDER_CONTROL' } }; status = 200;
    await tick(intervals.get(5000));
    assert.equal(states[2], '', 'successful refresh clears the previous error');
    reply = { error: 'This nearby incident is no longer active.' }; status = 410;
    await tick(intervals.get(5000));
    assert.equal(states[1], null, 'ended observer access clears previously visible incident');
  } finally {
    cleanup.forEach(fn => fn());
    assert.equal(intervals.size, 0);
    global.window = oldWindow; global.document = oldDocument;
  }
});

test('backup form opens from its own button and allows deselecting every recipient', () => {
  const states = [], effects = [];
  let cursor = 0;
  const react = {
    useState: initial => { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect: effect => effects.push(effect),
  };
  const module = loadServerModule('app/_components/intermunicipality-coordination-panel.tsx', {
    react: { ...react, default: react }, 'react/jsx-runtime': jsx,
    '../../lib/auth/municipal-tab-fetch': {},
  });
  const props = { incidentId: 'incident', accessScope: 'ORIGIN', showRequestModal: false,
    observers: [{ municipalityId: 'recipient', municipalityName: 'Recipient', distanceMeters: 100, status: 'ACTIVE' }],
    assistanceRequests: [], onChanged() {} };
  const render = () => { cursor = 0; effects.length = 0; const tree = module.IntermunicipalityCoordinationPanel(props); effects.forEach(fn => fn()); return tree; };
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
    ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const button = nodes(render()).find(node => node.type === 'button' && node.props.title === 'Request mutual aid assistance');
  button.props.onClick();
  const checkbox = nodes(render()).find(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.ok(checkbox, 'panel request button must open the form even when the external modal flag is false');
  checkbox.props.onChange({ target: { checked: false } });
  render();
  const unchecked = nodes(render()).find(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.equal(unchecked.props.checked, false, 'deselecting the last recipient must not reselect it');
});
