import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("phone call dispatch validates the caller, pin, one station, and selected responders", () => {
  const service = source("lib/municipal-bfp/phone-incidents.ts");
  assert.match(service, /export function validatePhoneCallIncidentInput/);
  assert.match(service, /callerName/);
  assert.match(service, /callerPhone/);
  assert.match(service, /stationId/);
  assert.match(service, /responderIds/);
  assert.match(service, /PHONE_CALL/);
  assert.match(service, /withTransaction/);
});

test("phone call dispatch uses only selected active responders and never creates a resident notification", () => {
  const service = source("lib/municipal-bfp/phone-incidents.ts");
  assert.match(service, /recipient_user_id = any\(\$[0-9]+::uuid\[\]\)/);
  assert.match(service, /STATION_RESPONDER_SELECTION_REQUIRED/);
  assert.match(service, /if \(!responderIds\.length\) throw new Error\("STATION_RESPONDER_SELECTION_REQUIRED"\)/);
  assert.match(service, /INCIDENT_DISPATCH_ASSIGNED/);
  assert.doesNotMatch(service, /resident_user_id/);
});

test("existing dispatch and resolution safely support reports without a resident profile", () => {
  const service = source("lib/municipal-bfp/dispatch.ts");
  assert.match(service, /export type DispatchableResponder/);
  assert.match(service, /export async function listStationResponders/);
  assert.match(service, /left join resident_profiles resident/);
  assert.match(service, /if \(report\.resident_user_id\)/);
  assert.match(service, /if \(row\.resident_user_id\)/);
});

test("phone dispatch pushes are eligible for selected responders and provincial recipients", () => {
  const service = source("lib/municipal-bfp/phone-incidents.ts");
  const fcm = source("lib/notifications/fcm.ts");

  assert.match(service, /const provincialRecipientUserIds = await listProvincialNotificationRecipients\(client\)/);
  assert.match(service, /recipientUserIds: provincialRecipientUserIds,[\s\S]*eventType: "INCIDENT_DISPATCH_ASSIGNED"/);
  assert.match(service, /const pushRecipientUserIds = \[\.\.\.new Set\(\[\.\.\.recipientUserIds, \.\.\.provincialRecipientUserIds\]\)\]/);
  assert.match(service, /recipientUserIds: pushRecipientUserIds,/);
  assert.match(fcm, /notification\.event_type = 'INCIDENT_DISPATCH_ASSIGNED'/);
});
