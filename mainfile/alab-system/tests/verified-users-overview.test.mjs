import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import * as jsx from 'react/jsx-runtime';
import { loadServerModule } from './helpers/load-server-module.mjs';

test('provincial verified-user total counts only active latest-verified residents in the selected scope', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id text primary key, name text, province text);
      create table users(id text primary key, role text, account_status text);
      create table resident_profiles(id text primary key, user_id text);
      create table resident_addresses(id text primary key, resident_profile_id text, municipality_id text, is_primary boolean);
      create table resident_verifications(id text primary key, resident_profile_id text, status text, submitted_at timestamptz, created_at timestamptz);
      create table municipal_bfp_stations(id text, municipality_id text);
      create table bfp_personnel_profiles(id text, user_id text);
      create table bfp_municipality_assignments(personnel_profile_id text, municipality_id text, status text);
      create table fire_reports(id text, municipality_id text, status text, submitted_at timestamptz);
      insert into municipalities values ('m1','Hamtic','Antique'),('m2','San Jose','Antique'),('other','Outside','Iloilo');
    `);
    for (const [id, municipality, account, statuses] of [
      ['ready', 'm1', 'ACTIVE', ['PENDING', 'VERIFIED']],
      ['ready2', 'm2', 'ACTIVE', ['VERIFIED']],
      ['pending', 'm1', 'PENDING_REVIEW', ['PENDING']],
      ['correct', 'm1', 'ACTIVE', ['VERIFIED', 'CHANGES_REQUESTED']],
      ['suspended', 'm1', 'SUSPENDED', ['VERIFIED']],
      ['outside', 'other', 'ACTIVE', ['VERIFIED']],
    ]) {
      await db.query(`insert into users values ($1,'RESIDENT',$2)`, [id, account]);
      await db.query('insert into resident_profiles values ($1,$1)', [id]);
      await db.query('insert into resident_addresses values ($1,$1,$2,true)', [id, municipality]);
      for (const [index, status] of statuses.entries()) {
        await db.query('insert into resident_verifications values ($1,$2,$3,$4,$4)', [`${id}-${index}`, id, status, `2026-10-${10 + index}T00:00:00Z`]);
      }
    }
    const service = loadServerModule('lib/provincial-bfp/management/overview.ts', {
      '../../db': { getDatabase: () => db }, './scope': { assertManagementActor() {} },
      './filters': loadServerModule('lib/provincial-bfp/management/filters.ts', {}),
    });
    const actor = { userId: 'officer', role: 'PROVINCIAL_BFP', province: 'Antique' };
    assert.equal((await service.getManagementSummary(actor)).verifiedResidents, 2);
    assert.equal((await service.getManagementSummary(actor, { municipalityId: 'm1' })).verifiedResidents, 1);
    assert.equal((await service.getManagementSummary(actor, { municipalityId: 'm2' })).verifiedResidents, 1);
  } finally { await db.close(); }
});

function treeNodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(treeNodes);
  return [tree, ...(typeof tree === 'object' ? treeNodes(tree.props?.children) : [])];
}

test('a completed verified signup shows account-ready language and a login action without approval controls', () => {
  let cursor = 0;
  const application = { reference: 'APP-READY', status: 'VERIFIED', accountStatus: 'ACTIVE', firstName: 'Ana', lastName: 'Reyes', municipality: 'Hamtic', submittedAt: '2026-10-20T00:00:00Z' };
  const page = loadServerModule('app/resident/application/page.tsx', {
    react: { useState(initial) { const index = cursor++; return [index === 0 ? application : index === 2 ? false : initial, () => {}]; }, useRef: current => ({ current }), useEffect() {}, useCallback: fn => fn },
    'react/jsx-runtime': jsx, 'next/link': { default: 'a' },
    '../../../lib/resident-applications/id-file': {}, '../../../lib/resident-applications/client-request': {},
    '../../_components/resident-selfie-capture': { ResidentSelfieCapture: 'selfie', residentSelfieCaptureStyles: '' },
    '../../_lib/shrink-photo': {}, '../../_content/emergency-call': { emergencyCallStyles: '' }, '../../_components/resident-offline-emergency': {},
  });
  const nodes = treeNodes(page.default());
  const headings = nodes.filter(node => node?.type === 'h1').flatMap(node => treeNodes(node.props.children)).filter(node => typeof node === 'string').join(' ');
  assert.equal(headings, 'Account verified');
  assert.ok(nodes.some(node => node?.type === 'a' && node.props.href === '/resident/login' && node.props.className === 'primary-action'));
  assert.ok(!nodes.some(node => node?.type === 'form'), 'verified users have no correction form');
});
