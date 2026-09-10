import assert from 'node:assert/strict';
import test from 'node:test';
import { loadServerModule as load } from './helpers/load-server-module.mjs';
import * as state from '../lib/intermunicipality/assistance-state.ts';
import { rankNearbyMunicipalities } from '../lib/intermunicipality/proximity.ts';

const origin = '11111111-1111-4111-8111-111111111111';
const recipient = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const reportId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const row = {
  id: requestId, fire_report_id: reportId, dispatch_id: 'dispatch', observer_id: 'observer',
  requester_municipality_id: origin, recipient_municipality_id: recipient,
  requester_municipality_name: 'Origin', recipient_municipality_name: 'Recipient',
  requested_firetrucks: 1, requested_personnel: 4, request_note: null,
  status: 'REQUESTED', offered_firetrucks: null, offered_personnel: null,
  report_status: 'RESPONDING', dispatch_status: 'ACTIVE', observer_status: 'ACTIVE',
  response_note: null, reference_number: 'TEST', requested_at: '2026-09-10T00:00:00Z',
};

function service(query) {
  const notifications = [];
  const exports = load('lib/intermunicipality/assistance.ts', {
    '../db': { withTransaction: work => work({ query }) },
    '../notifications/service': {
      listMunicipalNotificationRecipients: async (_client, municipality) => [municipality],
      listProvincialNotificationRecipients: async () => ['province'],
      createAccountNotifications: async (_client, payload) => notifications.push(payload),
    },
    './assistance-state': state,
    './audit': { recordCoordinationEvent: async () => {} },
  });
  return { ...exports, notifications };
}

test('cancellation preserves the database null-offer shape and informs the recipient', async () => {
  const api = service(async (sql, values) => {
    if (sql.includes('select r.*')) return { rows: [row] };
    if (sql.includes('update intermunicipal_assistance_requests')) {
      assert.equal(values[0], 'CANCELLED');
      assert.equal(values[1], null, 'cancelled requests cannot have offered firetrucks');
      assert.equal(values[2], null, 'cancelled requests cannot have offered personnel');
    }
    return { rows: [] };
  });
  const result = await api.transitionAssistanceRequest({
    requestId, actorMunicipalityId: origin, actorUserId: actor,
    action: 'CANCEL', offeredFiretrucks: 0, offeredPersonnel: 0,
  });
  assert.equal(result.status, 'CANCELLED');
  assert.ok(api.notifications.some(n => n.recipientUserIds.includes(recipient)), 'recipient must learn that origin cancelled');
});

for (const change of [{ requestedFiretrucks: 2 }, { requestNote: 'Different request' }]) {
  test(`conflicting creation retry is rejected: ${JSON.stringify(change)}`, async () => {
    const api = service(async sql => {
      if (sql.includes('from fire_reports fr')) return { rows: [{ fire_report_id: reportId, dispatch_id: 'dispatch', municipality_id: origin }] };
      if (sql.includes('from incident_municipal_observers')) return { rows: [{ id: 'observer', observer_municipality_id: recipient }] };
      if (sql.includes('from intermunicipal_assistance_requests')) return { rows: [row] };
      return { rows: [] };
    });
    await assert.rejects(api.createAssistanceRequests({
      fireReportId: reportId, requesterMunicipalityId: origin, actorUserId: actor,
      recipientMunicipalityIds: [recipient], requestedFiretrucks: 1, requestedPersonnel: 4, ...change,
    }), /ASSISTANCE_(ALREADY_OPEN|STATE_CONFLICT)/);
    assert.equal(api.notifications.length, 0);
  });
}

test('a changed response note is a conflicting retry rather than a successful save', async () => {
  const api = service(async () => ({ rows: [{ ...row, status: 'REJECTED', offered_firetrucks: 0, offered_personnel: 0, response_note: 'Busy' }] }));
  await assert.rejects(api.transitionAssistanceRequest({
    requestId, actorMunicipalityId: recipient, actorUserId: actor, action: 'REJECT',
    offeredFiretrucks: 0, offeredPersonnel: 0, responseNote: 'Available now',
  }), /ASSISTANCE_STATE_CONFLICT/);
});

test('unknown actions cannot become partial acceptance', () => {
  assert.throws(() => state.validateAssistanceTransition('REQUESTED', 'TYPO', 1, 4, 0, 2), /INVALID_ASSISTANCE/);
});

test('a pending request cannot be accepted after its observer access ends', async () => {
  const api = service(async () => ({ rows: [{ ...row, observer_status: 'ENDED' }] }));
  await assert.rejects(api.transitionAssistanceRequest({
    requestId, actorMunicipalityId: recipient, actorUserId: actor, action: 'ACCEPT',
    offeredFiretrucks: 1, offeredPersonnel: 4,
  }), /ASSISTANCE_STATE_CONFLICT/);
});

test('ended observers receive a controlled ended-access result', async () => {
  const api = load('lib/intermunicipality/incident-access.ts', {
    '../db': { getDatabase: () => ({ query: async sql => ({ rows: sql.includes('from fire_reports where') ? [] : [{ id: 'observer', status: 'ENDED' }] }) }) },
  });
  await assert.rejects(api.resolveMunicipalIncidentAccess(reportId, recipient), /OBSERVER_ACCESS_ENDED/);
});

test('observer detail SQL excludes unreviewed resident descriptions', async () => {
  let query;
  const api = load('lib/intermunicipality/incident-access.ts', {
    '../db': { getDatabase: () => ({ query: async sql => {
      query = sql;
      return { rows: [] };
    } }) },
  });
  await api.getObserverIncidentDetail(reportId, recipient);
  assert.doesNotMatch(query, /fr\.description\b/);
});

test('observer API does not return resident history notes and maps ended access to 410', async () => {
  let ended = false;
  const queries = [];
  const api = load('app/api/municipal-bfp/incidents/[id]/route.ts', {
    'next/server': { NextResponse: Response },
    '../../../../../lib/auth/bfp-accounts': { getBfpIdentity: async () => ({ municipalityId: recipient }) },
    '../../../../../lib/auth/local-ui-preview': { isLocalUiPreviewEnabled: () => false },
    '../../../../../lib/auth/session': { bfpSessionCookieName: () => 'session', verifyBfpSession: () => ({ userId: actor, role: 'MUNICIPAL_BFP' }) },
    '../../../../../lib/db': { getDatabase: () => ({ query: async sql => { queries.push(sql); return { rows: [] }; } }) },
    '../../../../../lib/intermunicipality/incident-access': {
      resolveMunicipalIncidentAccess: async () => { if (ended) throw Error('OBSERVER_ACCESS_ENDED'); return 'OBSERVER'; },
      getObserverIncidentDetail: async () => ({ id: reportId }),
      getIncidentCoordinationContext: async () => ({ observers: [], assistanceRequests: [] }),
    },
    '../../../../../lib/supabase/server-storage': {},
  });
  const request = { cookies: { get: () => ({ value: 'session' }) }, headers: new Headers() };
  assert.equal((await api.GET(request, { params: Promise.resolve({ id: reportId }) })).status, 200);
  assert.ok(queries.length > 0);
  assert.ok(queries.every(sql => !sql.includes('resident_message')));
  ended = true;
  assert.equal((await api.GET(request, { params: Promise.resolve({ id: reportId }) })).status, 410);
});

test('degraded monitoring links each role to its portal and ending monitoring notifies observers', async () => {
  const notifications = [];
  const api = load('lib/intermunicipality/observers.ts', {
    '../db': {}, './proximity': { rankNearbyMunicipalities }, './audit': { recordCoordinationEvent: async () => {} },
    '../notifications/service': {
      listMunicipalNotificationRecipients: async (_client, municipality) => [municipality],
      listProvincialNotificationRecipients: async () => ['province'],
      createAccountNotifications: async (_client, payload) => notifications.push(payload),
    },
  });
  const input = { fireReportId: reportId, dispatchId: requestId, originMunicipalityId: origin,
    originMunicipalityName: 'Origin', actorUserId: actor, referenceNumber: 'TEST', latitude: 10.7, longitude: 122, createdAt: new Date() };
  await api.createNearbyIncidentObservers({ query: async () => ({ rows: [] }) }, input);
  const degraded = notifications.filter(n => n.eventType === 'NEARBY_SELECTION_DEGRADED');
  assert.ok(degraded.some(n => n.recipientUserIds.includes('province') && n.actionHref.startsWith('/provincial-bfp/')));
  notifications.length = 0;
  await api.endIncidentObservers({ query: async () => ({ rows: [{ id: 'observer', observer_municipality_id: recipient }] }) }, { ...input, endedAt: new Date() });
  assert.ok(notifications.some(n => n.recipientUserIds.includes(recipient)));
  assert.ok(notifications.some(n => n.recipientUserIds.includes('province')));
});
