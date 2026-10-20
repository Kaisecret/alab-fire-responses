import assert from 'node:assert/strict';
import test from 'node:test';
import * as jsx from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';

const text = tree => tree == null || typeof tree === 'boolean' ? '' : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? tree.type === 'style' ? '' : text(tree.props?.children) : String(tree);

test('a cached municipal identity keeps the server and first client render identical before hydration', () => {
  const originalWindow = globalThis.window, originalStorage = globalThis.sessionStorage;
  let hydrated = false;
  const component = loadServerModule('app/_components/municipal-bfp-layout.tsx', {
    'react/jsx-runtime': jsx,
    react: { useEffect() {}, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useSyncExternalStore: (_subscribe, client, server) => hydrated ? client() : server() },
    'next/link': { default: 'a' }, 'next/navigation': { usePathname: () => '/municipal-bfp/verification-queue' },
    '../../lib/auth/municipal-tab-fetch': {}, './notifications/notification-bell': {},
    './municipal-incident-alarm': {}, './municipal-backup-alarm': {}, './municipal-local-backup-alarm': {},
    './municipal-alarm-declaration': {}, './success-toast-host': {},
    './use-municipal-incident-feed': { useMunicipalIncidentFeed: () => ({ incidents: [] }) }, './bfp-logout-dialog': {},
  }).MunicipalBfpLayout;
  try {
    delete globalThis.window;
    const server = component({ children: 'directory' });
    globalThis.window = {};
    globalThis.sessionStorage = { getItem: () => JSON.stringify({ displayName: 'BFP Officer', municipalityName: 'Hamtic' }) };
    const firstClient = component({ children: 'directory' });
    assert.equal(text(firstClient), text(server), 'cached identity must not replace the server shell during hydration');
    hydrated = true;
    assert.ok(text(component({ children: 'directory' })).includes('directory'), 'cached shell can render after hydration');
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = originalStorage;
  }
});
