import assert from "node:assert/strict";
import test from "node:test";

import * as alarmAlert from "../lib/municipal-bfp/alarm-alert.mjs";

const {
  buildAlarmNotificationContext,
  getMunicipalAlarmAction,
  selectPendingMunicipalAlarm,
  shouldShowMutualAidBoard,
  shouldShowStationAssignment,
} = alarmAlert;

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

test("an unread inter-municipality assistance request becomes a response alert", () => {
  const notification = {
    ...baseNotification,
    eventType: "ASSISTANCE_REQUESTED",
    category: "INCIDENT",
    entityType: "assistance_request",
    entityId: "00000000-0000-4000-8000-000000000030",
    context: {
      audience: "ASSISTANCE",
      fireReportId: baseNotification.entityId,
      assistanceRequestId: "00000000-0000-4000-8000-000000000030",
      referenceNumber: "ALAB-2026-001",
      location: "Hamtic, Antique",
      requesterMunicipalityName: "Hamtic",
      requestedFiretrucks: 1,
      requestedPersonnel: 4,
      requestNote: "Immediate structural-fire backup",
      isProvincialCommand: false,
    },
  };

  assert.equal(selectPendingMunicipalAlarm([notification])?.id, notification.id);
  assert.deepEqual(getMunicipalAlarmAction(notification), {
    audience: "ASSISTANCE",
    incidentId: baseNotification.entityId,
    assistanceRequestId: notification.entityId,
    destination: `/municipal-bfp/active-incidents?incident=${baseNotification.entityId}`,
  });
});

test("a user gesture starts the repeating tone after browser autoplay suspension", async () => {
  assert.equal(typeof alarmAlert.ensureAlertTone, "function");
  let starts = 0;
  const stop = () => undefined;
  const context = {
    state: "suspended",
    async resume() { this.state = "running"; },
  };

  const result = await alarmAlert.ensureAlertTone(context, false, receivedContext => {
    assert.equal(receivedContext, context);
    starts += 1;
    return stop;
  });

  assert.equal(starts, 1);
  assert.equal(result, stop);
  assert.equal(await alarmAlert.ensureAlertTone(context, true, () => { starts += 1; }), null);
  assert.equal(starts, 1, "an active tone must not be duplicated");
});

test("audio recovery cannot start a stale tone after its alert is cancelled", async () => {
  let finishResume;
  let cancelled = false;
  let starts = 0;
  const context = {
    state: "suspended",
    resume() {
      return new Promise(resolve => {
        finishResume = () => {
          this.state = "running";
          resolve();
        };
      });
    },
  };

  const pending = alarmAlert.ensureAlertTone(
    context,
    false,
    () => {
      starts += 1;
      return () => undefined;
    },
    () => cancelled,
  );
  cancelled = true;
  finishResume();

  assert.equal(await pending, null);
  assert.equal(starts, 0);
});

test("a provincial command assistance notice does not duplicate its alarm declaration popup", () => {
  const notification = {
    ...baseNotification,
    eventType: "ASSISTANCE_REQUESTED",
    category: "INCIDENT",
    context: {
      audience: "ASSISTANCE",
      fireReportId: baseNotification.entityId,
      assistanceRequestId: "00000000-0000-4000-8000-000000000030",
      referenceNumber: "ALAB-2026-001",
      location: "Hamtic, Antique",
      requesterMunicipalityName: "Hamtic",
      requestedFiretrucks: 1,
      requestedPersonnel: 4,
      requestNote: null,
      isProvincialCommand: true,
    },
  };

  assert.equal(selectPendingMunicipalAlarm([notification]), null);
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
