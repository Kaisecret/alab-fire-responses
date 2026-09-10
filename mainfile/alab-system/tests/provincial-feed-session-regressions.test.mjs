import assert from 'node:assert/strict';
import test from 'node:test';
import { loadServerModule } from './helpers/load-server-module.mjs';

function hooks() {
  const slots = [];
  let cursor = 0;
  return {
    reset() { cursor = 0; },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef(initial) {
        const index = cursor++;
        return slots[index] ??= { current: initial };
      },
      useCallback(fn) { return fn; },
      useEffect() {},
    },
  };
}

for (const [file, hookName, payloadKey] of [
  ['incident', 'useProvincialIncidentFeed', 'incidents'],
  ['assistance', 'useProvincialAssistanceFeed', 'assistanceRequests'],
]) {
  test(`${file} feed retains data on a network failure but clears it after session denial`, async () => {
    const originalFetch = globalThis.fetch;
    const harness = hooks();
    const mod = loadServerModule(`app/_components/use-provincial-${file}-feed.ts`, { react: harness.react });
    const render = () => { harness.reset(); return mod[hookName](); };
    try {
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ [payloadKey]: [{ id: 'private-record' }] }) });
      await render().refresh();
      assert.equal(render().rows.length, 1);
      globalThis.fetch = async () => { throw new Error('Network unavailable'); };
      await render().refresh();
      assert.equal(render().rows.length, 1);
      globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: 'Session denied' }) });
      await render().refresh();
      assert.deepEqual(render().rows, []);
      assert.equal(render().lastCheckedAt, null);
      const nextUser = hooks();
      const nextMod = loadServerModule(`app/_components/use-provincial-${file}-feed.ts`, { react: nextUser.react });
      assert.deepEqual(nextMod[hookName]().rows, []);
    } finally { globalThis.fetch = originalFetch; }
  });
}

test('management mutations keep their request key across response retries', async () => {
  const originalFetch = globalThis.fetch;
  const harness = hooks();
  const mod = loadServerModule('app/_components/use-management-mutation.ts', {react: harness.react});
  const keys = [];
  try {
    globalThis.fetch = async (_, init) => { keys.push(init.headers.get('x-request-id')); return {ok:true}; };
    const mutate = mod.useManagementMutation();
    await mutate('/api/provincial-bfp/stations', {method:'POST',body:'{"stationName":"Central"}'});
    await mutate('/api/provincial-bfp/stations', {method:'POST',body:'{"stationName":"Central"}'});
    await mutate('/api/provincial-bfp/stations', {method:'POST',body:'{"stationName":"Updated"}'});
    assert.ok(keys[0]);
    assert.equal(keys[0],keys[1]);
    assert.notEqual(keys[1],keys[2]);
  } finally { globalThis.fetch = originalFetch; }
});
