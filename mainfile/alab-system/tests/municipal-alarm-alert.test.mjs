import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAlarmNotificationContext,
  getMunicipalAlarmAction,
  selectPendingMunicipalAlarm,
  shouldShowMutualAidBoard,
  shouldShowStationAssignment,
} from "../lib/municipal-bfp/alarm-alert.mjs";

const baseNotification = {
  id: "00000000-0000-4000-8000-000000000010",
  eventType: "ALARM_DECLARED",
  category: "RESPONSE",
  title: "Second alarm: your municipality is called",
  summary: "ALAB-2026-001 · Hamtic",
  actionHref: "/municipal-bfp/active-incidents?incident=00000000-0000-4000-8000-000000000020",
  entityType: "FIRE_REPORT",
  entityId: "00000000-0000-4000-8000-000000000020",
  readAt: null,
  createdAt: "2026-09-20T12:00:00.000Z",
};

test("an unread summoned alarm becomes a station-assignment alert", () => {
  const context = buildAlarmNotificationContext({
    audience: "SUMMONED",
    alarmLevel: 2,
    fireReportId: baseNotification.entityId,
    referenceNumber: "ALAB-2026-001",
    location: "Hamtic, Antique",
    assistanceRequestId: "00000000-0000-4000-8000-000000000030",
    requestedFiretrucks: 1,
    requestedPersonnel: 4,
  });
  const notification = { ...baseNotification, context };

  assert.equal(selectPendingMunicipalAlarm([notification])?.id, notification.id);
  assert.deepEqual(getMunicipalAlarmAction(notification), {
    audience: "SUMMONED",
    incidentId: baseNotification.entityId,
    assistanceRequestId: "00000000-0000-4000-8000-000000000030",
    assistanceBody: {
      action: "ACCEPT",
      offeredFiretrucks: 1,
      offeredPersonnel: 4,
      responseNote: "Provincial alarm acknowledged; preparing municipal BFP deployment.",
    },
    destination: `/municipal-bfp/active-incidents?incident=${baseNotification.entityId}&assign=1`,
  });
});

test("the requesting municipality gets confirmation, not a station-assignment action", () => {
  const context = buildAlarmNotificationContext({
    audience: "ORIGIN",
    alarmLevel: 3,
    fireReportId: baseNotification.entityId,
    referenceNumber: "ALAB-2026-001",
    location: "Hamtic, Antique",
    summonedMunicipalities: ["San Jose de Buenavista", "Tobias Fornier"],
  });
  const notification = { ...baseNotification, id: "origin-notice", context };

  assert.equal(selectPendingMunicipalAlarm([notification])?.id, "origin-notice");
  assert.deepEqual(getMunicipalAlarmAction(notification), {
    audience: "ORIGIN",
    incidentId: baseNotification.entityId,
    destination: `/municipal-bfp/active-incidents?incident=${baseNotification.entityId}`,
  });
});

test("read and malformed notifications never raise the municipal siren", () => {
  const malformed = { ...baseNotification, context: {} };
  const read = {
    ...baseNotification,
    readAt: "2026-09-20T12:01:00.000Z",
    context: buildAlarmNotificationContext({
      audience: "ORIGIN",
      alarmLevel: 2,
      fireReportId: baseNotification.entityId,
      referenceNumber: "ALAB-2026-001",
      location: "Hamtic, Antique",
      summonedMunicipalities: [],
    }),
  };

  assert.equal(selectPendingMunicipalAlarm([malformed, read]), null);
});

test("an older unread level does not resurface after a newer alarm was acknowledged", () => {
  const olderUnread = {
    ...baseNotification,
    id: "older-level",
    createdAt: "2026-09-20T12:00:00.000Z",
    context: buildAlarmNotificationContext({
      audience: "ORIGIN",
      alarmLevel: 2,
      fireReportId: baseNotification.entityId,
      referenceNumber: "ALAB-2026-001",
      location: "Hamtic, Antique",
      summonedMunicipalities: ["San Jose de Buenavista"],
    }),
  };
  const newerRead = {
    ...olderUnread,
    id: "newer-level",
    readAt: "2026-09-20T12:06:00.000Z",
    createdAt: "2026-09-20T12:05:00.000Z",
    context: { ...olderUnread.context, alarmLevel: 3 },
  };

  assert.equal(selectPendingMunicipalAlarm([newerRead, olderUnread]), null);
});

test("the mutual-aid board belongs only to the requesting municipality", () => {
  assert.equal(shouldShowMutualAidBoard("ORIGIN", 2), true);
  assert.equal(shouldShowMutualAidBoard("OBSERVER", 2), false);
});

test("a called municipality may assign stations after accepting the provincial call", () => {
  assert.equal(shouldShowStationAssignment("OBSERVER", "REQUESTED"), false);
  assert.equal(shouldShowStationAssignment("OBSERVER", "ACCEPTED"), true);
  assert.equal(shouldShowStationAssignment("OBSERVER", "PARTIALLY_ACCEPTED"), true);
  assert.equal(shouldShowStationAssignment("OBSERVER", "ACCEPTED", true), false);
  assert.equal(shouldShowStationAssignment("ORIGIN", null), true);
});
