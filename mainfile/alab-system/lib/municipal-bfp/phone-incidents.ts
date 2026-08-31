import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "../db";
import type { FireType } from "../fire-reports/types";
import { sendDispatchPush } from "../notifications/fcm";
import { createAccountNotifications, listProvincialNotificationRecipients } from "../notifications/service";

type Queryable = Pick<PoolClient, "query">;

const FIRE_TYPES: readonly FireType[] = ["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

export type PhoneCallIncidentInput = {
  callerName: string; callerPhone: string; fireType: FireType; description: string;
  barangayId: string; landmark: string; latitude: number; longitude: number;
  reportedAt: Date; stationId: string; responderIds: string[];
};

export type PhoneCallIncidentDispatch = {
  fireReportId: string; referenceNumber: string; dispatchId: string;
  stationName: string; responderCount: number; dispatchedAt: Date;
};

export type PhoneCallIncidentScope = {
  municipalityId: string;
  actorUserId: string;
  municipalityName: string;
};

type StationRow = { id: string; station_name: string; latitude: number; longitude: number };
type ResponderRow = { user_id: string; display_name: string };

function validId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function requiredText(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum
    ? value.trim()
    : null;
}

function asReportedAt(value: unknown) {
  const reportedAt = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  return reportedAt && !Number.isNaN(reportedAt.getTime()) ? reportedAt : null;
}

function referenceNumber() {
  return `ALAB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function validatePhoneCallIncidentInput(raw: unknown): PhoneCallIncidentInput {
  const candidate = raw && typeof raw === "object" ? raw as Record<string, unknown> : null;
  const callerName = requiredText(candidate?.callerName, 2, 120);
  const callerPhone = typeof candidate?.callerPhone === "string" && PHONE_PATTERN.test(candidate.callerPhone.trim())
    ? candidate.callerPhone.trim()
    : null;
  const description = requiredText(candidate?.description, 1, 1200);
  const landmark = typeof candidate?.landmark === "string" ? candidate.landmark.trim().slice(0, 200) : null;
  const reportedAt = asReportedAt(candidate?.reportedAt);
  const fireType = candidate?.fireType;
  const latitude = candidate?.latitude;
  const longitude = candidate?.longitude;
  const responderIds = Array.isArray(candidate?.responderIds) ? [...new Set(candidate.responderIds)] : [];

  if (!responderIds.length) throw new Error("STATION_RESPONDER_SELECTION_REQUIRED");
  if (!callerName || !callerPhone || !description || landmark === null || !reportedAt
    || !FIRE_TYPES.includes(fireType as FireType)
    || typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < 4 || latitude > 22
    || typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < 116 || longitude > 127
    || !validId(candidate?.barangayId) || !validId(candidate?.stationId) || !responderIds.every(validId)) {
    throw new Error("INVALID_PHONE_CALL_INPUT");
  }

  return {
    callerName,
    callerPhone,
    fireType: fireType as FireType,
    description,
    barangayId: candidate.barangayId,
    landmark,
    latitude,
    longitude,
    reportedAt,
    stationId: candidate.stationId,
    responderIds,
  };
}

async function requireBarangay(client: Queryable, barangayId: string, municipalityId: string) {
  const result = await client.query<{ id: string; name: string }>(
    "select id, name from barangays where id = $1 and municipality_id = $2",
    [barangayId, municipalityId],
  );
  if (!result.rowCount) throw new Error("BARANGAY_NOT_IN_MUNICIPALITY");
  return result.rows[0];
}

async function lockStation(client: Queryable, municipalityId: string, stationId: string) {
  const result = await client.query<StationRow>(
    `select id, station_name, latitude::float as latitude, longitude::float as longitude
       from municipal_bfp_stations
      where id = $1 and municipality_id = $2 and status = 'ACTIVE'
      for update`,
    [stationId, municipalityId],
  );
  if (!result.rowCount) throw new Error("INVALID_STATION_RESPONDER_SELECTION");
  return result.rows[0];
}

async function selectedActiveResponders(client: Queryable, municipalityId: string, stationId: string, responderIds: string[]) {
  const result = await client.query<ResponderRow>(
    `select eligible.recipient_user_id as user_id, eligible.display_name
       from (
         select u.id as recipient_user_id, profile.display_name
           from bfp_station_assignments station_assignment
           join bfp_personnel_profiles profile on profile.id = station_assignment.personnel_profile_id
           join bfp_municipality_assignments municipality_assignment
             on municipality_assignment.personnel_profile_id = profile.id and municipality_assignment.status = 'ACTIVE'
           join users u on u.id = profile.user_id
          where station_assignment.station_id = $1 and station_assignment.status = 'ACTIVE'
            and municipality_assignment.municipality_id = $3
            and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE'
       ) eligible
      where recipient_user_id = any($2::uuid[])
      order by eligible.display_name asc`,
    [stationId, responderIds, municipalityId],
  );
  if (result.rowCount !== responderIds.length) throw new Error("INVALID_STATION_RESPONDER_SELECTION");
  return result.rows;
}

export async function createPhoneCallIncidentAndDispatch(raw: unknown, scope: PhoneCallIncidentScope): Promise<PhoneCallIncidentDispatch> {
  const input = validatePhoneCallIncidentInput(raw);
  if (!validId(scope.municipalityId) || !validId(scope.actorUserId) || !requiredText(scope.municipalityName, 1, 160)) {
    throw new Error("INVALID_PHONE_CALL_INPUT");
  }

  const dispatched = await withTransaction(async (client) => {
    const barangay = await requireBarangay(client, input.barangayId, scope.municipalityId);
    const station = await lockStation(client, scope.municipalityId, input.stationId);
    const responders = await selectedActiveResponders(client, scope.municipalityId, input.stationId, input.responderIds);
    if (!responders.length) throw new Error("STATION_RESPONDER_SELECTION_REQUIRED");

    const now = new Date();
    const fireReportId = randomUUID();
    const dispatchId = randomUUID();
    const dispatchStationId = randomUUID();
    const reference = referenceNumber();
    const stationName = station.station_name;

    await client.query(
      `insert into fire_reports (
         id, reference_number, resident_profile_id, report_source, caller_name, caller_phone, created_by_user_id,
         reporter_name_snapshot, reporter_phone_snapshot, fire_type, description, status, latitude, longitude,
         location_method, location_quality, is_within_antique, municipality_id, barangay_id, address_label,
         nearest_landmark, reported_at, submitted_at, response_started_at, responding_bfp_user_id, responding_station_name, updated_at
       ) values (
         $1,$2,null,'PHONE_CALL',$3,$4,$5,$3,$4,$6,$7,'RESPONDING',$8,$9,
         'MANUAL_PIN','PHONE_CALL_MANUAL_PIN',true,$10,$11,$12,$13,$14,$15,$15,null,$16,$15
       )`,
      [fireReportId, reference, input.callerName, input.callerPhone, scope.actorUserId, input.fireType, input.description,
        input.latitude, input.longitude, scope.municipalityId, barangay.id, `${barangay.name}, ${scope.municipalityName}`,
        input.landmark || null, input.reportedAt, now, stationName],
    );
    await client.query(
      `insert into incident_dispatches (id, fire_report_id, municipality_id, dispatched_by_user_id, status, dispatched_at, created_at, updated_at)
       values ($1,$2,$3,$4,'ACTIVE',$5,$5,$5)`,
      [dispatchId, fireReportId, scope.municipalityId, scope.actorUserId, now],
    );
    await client.query(
      `insert into incident_dispatch_stations (
         id, dispatch_id, station_id, station_name_snapshot, station_latitude_snapshot, station_longitude_snapshot, created_at
       ) values ($1,$2,$3,$4,$5,$6,$7)`,
      [dispatchStationId, dispatchId, station.id, stationName, station.latitude, station.longitude, now],
    );
    for (const responder of responders) {
      await client.query(
        `insert into incident_dispatch_recipients (
           id, dispatch_id, dispatch_station_id, recipient_user_id, recipient_name_snapshot, status, assigned_at, created_at, updated_at
         ) values ($1,$2,$3,$4,$5,'ASSIGNED',$6,$6,$6)`,
        [randomUUID(), dispatchId, dispatchStationId, responder.user_id, responder.display_name, now],
      );
    }
    await client.query(
      `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
       values ($1,null,'RESPONDING',$2,'Municipal BFP responders have been assigned to this phone-call incident.',$3)`,
      [fireReportId, scope.actorUserId, now],
    );

    const recipientUserIds = responders.map((responder) => responder.user_id);
    await createAccountNotifications(client, {
      recipientUserIds, actorUserId: scope.actorUserId, eventType: "INCIDENT_DISPATCH_ASSIGNED", category: "INCIDENT",
      title: "Emergency dispatch assigned", summary: `${reference} · ${stationName}`,
      actionHref: `/municipal-bfp/incidents/${fireReportId}`, entityType: "fire_report", entityId: fireReportId,
      context: { dispatchId, reference, stationId: station.id, barangay: barangay.name, municipality: scope.municipalityName },
      dedupeKey: `incident-dispatch:${dispatchId}:assigned`, createdAt: now,
    });
    await createAccountNotifications(client, {
      recipientUserIds: await listProvincialNotificationRecipients(client), actorUserId: scope.actorUserId,
      eventType: "INCIDENT_DISPATCH_STATUS_CHANGED", category: "RESPONSE", title: "Municipal station responders assigned",
      summary: `${reference} · ${scope.municipalityName}`, actionHref: "/provincial-bfp/incidents",
      entityType: "fire_report", entityId: fireReportId, context: { dispatchId, reference, stationName, barangay: barangay.name },
      dedupeKey: `incident-dispatch:${dispatchId}:provincial`, createdAt: now,
    });
    return {
      fireReportId, referenceNumber: reference, dispatchId, stationName, responderCount: recipientUserIds.length, dispatchedAt: now,
      recipientUserIds, barangay: barangay.name, municipalityName: scope.municipalityName,
    };
  });

  try {
    await sendDispatchPush(dispatched);
  } catch (error) {
    console.error("Dispatch FCM send failed", error);
  }
  return {
    fireReportId: dispatched.fireReportId, referenceNumber: dispatched.referenceNumber, dispatchId: dispatched.dispatchId,
    stationName: dispatched.stationName, responderCount: dispatched.responderCount, dispatchedAt: dispatched.dispatchedAt,
  };
}
