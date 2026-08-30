import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { getDatabase, withTransaction } from "../db";
import { canTransitionReportStatus } from "../fire-reports/validation";
import type { FireReportStatus } from "../fire-reports/types";
import { createAccountNotifications, listProvincialNotificationRecipients } from "../notifications/service";
import { sendDispatchPush } from "../notifications/fcm";

type Queryable = Pick<PoolClient, "query">;

export type DispatchableStation = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  activePersonnelCount: number;
};

type DispatchInput = {
  fireReportId: string;
  municipalityId: string;
  actorUserId: string;
  municipalityName: string;
  stationIds: string[];
  selectAllStations?: boolean;
};

type DispatchStationRow = {
  id: string;
  station_name: string;
  latitude: number;
  longitude: number;
};

type RecipientRow = {
  station_id: string;
  user_id: string;
  display_name: string;
};

function validId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function uniqueIds(values: string[]) {
  return [...new Set(values.filter(validId))];
}

async function queryDispatchableStations(queryable: Queryable, municipalityId: string) {
  const result = await queryable.query<DispatchableStation>(
    `select s.id, s.station_name as "stationName", s.latitude::float as latitude, s.longitude::float as longitude,
            count(u.id)::int as "activePersonnelCount"
       from municipal_bfp_stations s
       left join bfp_station_assignments station_assignment
         on station_assignment.station_id = s.id and station_assignment.status = 'ACTIVE'
       left join bfp_personnel_profiles profile on profile.id = station_assignment.personnel_profile_id
       left join users u on u.id = profile.user_id and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE'
      where s.municipality_id = $1 and s.status = 'ACTIVE'
      group by s.id, s.station_name, s.latitude, s.longitude
      order by lower(s.station_name) asc`,
    [municipalityId],
  );
  return result.rows;
}

export async function listDispatchableStations(municipalityId: string): Promise<DispatchableStation[]> {
  return queryDispatchableStations(getDatabase(), municipalityId);
}

async function getSelectedStations(client: Queryable, municipalityId: string, requestedStationIds: string[]) {
  const rows = await client.query<DispatchStationRow>(
    `select id, station_name, latitude::float as latitude, longitude::float as longitude
       from municipal_bfp_stations
      where municipality_id = $1 and status = 'ACTIVE' and id = any($2::uuid[])
      order by lower(station_name) asc
      for update`,
    [municipalityId, requestedStationIds],
  );
  if (rows.rowCount !== requestedStationIds.length) throw new Error("INVALID_STATION_SELECTION");
  return rows.rows;
}

export async function dispatchIncidentToStations(input: DispatchInput) {
  const requestedStationIds = uniqueIds(input.stationIds);
  if (!validId(input.fireReportId) || !validId(input.municipalityId) || !validId(input.actorUserId)) {
    throw new Error("INVALID_DISPATCH_INPUT");
  }

  const dispatch = await withTransaction(async (client) => {
    const current = await client.query<{
      status: FireReportStatus;
      reference_number: string;
      resident_user_id: string;
    }>(
      `select fr.status, fr.reference_number, resident.user_id as resident_user_id
         from fire_reports fr
         join resident_profiles resident on resident.id = fr.resident_profile_id
        where fr.id = $1 and fr.municipality_id = $2
        for update of fr`,
      [input.fireReportId, input.municipalityId],
    );
    if (!current.rowCount) throw new Error("NOT_FOUND");
    if (!canTransitionReportStatus(current.rows[0].status, "RESPONDING")) throw new Error("INVALID_STATUS");

    const activeStations = await queryDispatchableStations(client, input.municipalityId);
    const stationIds = input.selectAllStations
      ? activeStations.filter((station) => station.activePersonnelCount > 0).map((station) => station.id)
      : requestedStationIds;
    if (!stationIds.length) throw new Error("STATION_SELECTION_REQUIRED");
    const stations = await getSelectedStations(client, input.municipalityId, stationIds);

    const recipientResult = await client.query<RecipientRow>(
      `select station_assignment.station_id, u.id as user_id, profile.display_name
         from bfp_station_assignments station_assignment
         join bfp_personnel_profiles profile on profile.id = station_assignment.personnel_profile_id
         join bfp_municipality_assignments municipality_assignment
           on municipality_assignment.personnel_profile_id = profile.id and municipality_assignment.status = 'ACTIVE'
         join users u on u.id = profile.user_id
        where station_assignment.station_id = any($1::uuid[])
          and station_assignment.status = 'ACTIVE'
          and municipality_assignment.municipality_id = $2
          and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE'
        order by station_assignment.station_id, profile.display_name`,
      [stationIds, input.municipalityId],
    );
    const coveredStations = new Set(recipientResult.rows.map((row) => row.station_id));
    if (stations.some((station) => !coveredStations.has(station.id))) throw new Error("STATION_HAS_NO_ACTIVE_PERSONNEL");

    const now = new Date();
    const dispatchId = randomUUID();
    await client.query(
      `insert into incident_dispatches (id, fire_report_id, municipality_id, dispatched_by_user_id, status, dispatched_at, created_at, updated_at)
       values ($1,$2,$3,$4,'ACTIVE',$5,$5,$5)`,
      [dispatchId, input.fireReportId, input.municipalityId, input.actorUserId, now],
    );

    const dispatchStationIds = new Map<string, string>();
    for (const station of stations) {
      const dispatchStationId = randomUUID();
      dispatchStationIds.set(station.id, dispatchStationId);
      await client.query(
        `insert into incident_dispatch_stations (
           id, dispatch_id, station_id, station_name_snapshot, station_latitude_snapshot, station_longitude_snapshot, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7)`,
        [dispatchStationId, dispatchId, station.id, station.station_name, station.latitude, station.longitude, now],
      );
    }

    for (const recipient of recipientResult.rows) {
      await client.query(
        `insert into incident_dispatch_recipients (
           id, dispatch_id, dispatch_station_id, recipient_user_id, recipient_name_snapshot, status, assigned_at, created_at, updated_at
         ) values ($1,$2,$3,$4,$5,'ASSIGNED',$6,$6,$6)`,
        [randomUUID(), dispatchId, dispatchStationIds.get(recipient.station_id), recipient.user_id, recipient.display_name, now],
      );
    }

    const stationLabel = stations.length === 1 ? stations[0].station_name : `${stations.length} BFP stations`;
    await client.query(
      `update fire_reports
          set status = 'RESPONDING', responding_bfp_user_id = null, responding_station_name = $1,
              response_started_at = $2, updated_at = $2
        where id = $3`,
      [stationLabel, now, input.fireReportId],
    );
    await client.query(
      `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
       values ($1,$2,'RESPONDING',$3,'BFP station teams have been assigned to your fire report.',$4)`,
      [input.fireReportId, current.rows[0].status, input.actorUserId, now],
    );

    const recipientUserIds = recipientResult.rows.map((recipient) => recipient.user_id);
    const report = current.rows[0];
    await createAccountNotifications(client, {
      recipientUserIds,
      actorUserId: input.actorUserId,
      eventType: "INCIDENT_DISPATCH_ASSIGNED",
      category: "INCIDENT",
      title: "Emergency dispatch assigned",
      summary: `${report.reference_number} · ${stationLabel}`,
      actionHref: `/municipal-bfp/incidents/${input.fireReportId}`,
      entityType: "fire_report",
      entityId: input.fireReportId,
      context: { dispatchId, reference: report.reference_number, stationIds },
      dedupeKey: `incident-dispatch:${dispatchId}:assigned`,
      createdAt: now,
    });
    await createAccountNotifications(client, {
      recipientUserIds: [report.resident_user_id],
      actorUserId: input.actorUserId,
      eventType: "INCIDENT_DISPATCH_STATUS_CHANGED",
      category: "RESPONSE",
      title: "BFP team assigned",
      summary: `${report.reference_number} · ${stationLabel}`,
      actionHref: `/resident/reports/${input.fireReportId}`,
      entityType: "fire_report",
      entityId: input.fireReportId,
      context: { dispatchId, reference: report.reference_number, stationLabel },
      dedupeKey: `incident-dispatch:${dispatchId}:resident`,
      createdAt: now,
    });
    await createAccountNotifications(client, {
      recipientUserIds: await listProvincialNotificationRecipients(client),
      actorUserId: input.actorUserId,
      eventType: "INCIDENT_DISPATCH_STATUS_CHANGED",
      category: "RESPONSE",
      title: "Municipal station teams assigned",
      summary: `${report.reference_number} · ${input.municipalityName}`,
      actionHref: "/provincial-bfp/incidents",
      entityType: "fire_report",
      entityId: input.fireReportId,
      context: { dispatchId, reference: report.reference_number, stationLabel },
      dedupeKey: `incident-dispatch:${dispatchId}:provincial`,
      createdAt: now,
    });

    return {
      dispatchId,
      fireReportId: input.fireReportId,
      status: "RESPONDING" as const,
      dispatchedAt: now,
      stationCount: stations.length,
      recipientCount: recipientUserIds.length,
      stationNames: stations.map((station) => station.station_name),
      recipientUserIds,
      referenceNumber: report.reference_number,
    };
  });
  try {
    await sendDispatchPush(dispatch);
  } catch (error) {
    console.error("Dispatch FCM send failed", error);
  }
  return dispatch;
}

export type MobileDispatchAssignment = {
  dispatchId: string;
  recipientId: string;
  recipientStatus: "ASSIGNED" | "ACKNOWLEDGED" | "EN_ROUTE" | "ON_SCENE" | "COMPLETED";
  assignedAt: string;
  referenceNumber: string;
  fireType: string;
  reportStatus: FireReportStatus;
  latitude: number;
  longitude: number;
  landmark: string | null;
  stationName: string;
  stationLatitude: number;
  stationLongitude: number;
};

export async function listMobileDispatchAssignments(userId: string): Promise<MobileDispatchAssignment[]> {
  const result = await getDatabase().query<MobileDispatchAssignment>(
    `select d.id as "dispatchId", recipient.id as "recipientId", recipient.status as "recipientStatus",
            recipient.assigned_at as "assignedAt", report.reference_number as "referenceNumber", report.fire_type as "fireType",
            report.status as "reportStatus", report.latitude::float as latitude, report.longitude::float as longitude,
            report.nearest_landmark as landmark, station.station_name_snapshot as "stationName",
            station.station_latitude_snapshot::float as "stationLatitude", station.station_longitude_snapshot::float as "stationLongitude"
       from incident_dispatch_recipients recipient
       join incident_dispatches d on d.id = recipient.dispatch_id and d.status = 'ACTIVE'
       join incident_dispatch_stations station on station.id = recipient.dispatch_station_id
       join fire_reports report on report.id = d.fire_report_id
      where recipient.recipient_user_id = $1 and recipient.status <> 'COMPLETED'
      order by recipient.assigned_at desc`,
    [userId],
  );
  return result.rows;
}

function distanceMeters(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function acknowledgeDispatchRoute(userId: string, dispatchId: string) {
  if (!validId(userId) || !validId(dispatchId)) throw new Error("INVALID_DISPATCH_INPUT");
  return withTransaction(async (client) => {
    const current = await client.query<{ recipient_id: string; recipient_status: MobileDispatchAssignment["recipientStatus"]; report_id: string; report_status: FireReportStatus }>(
      `select recipient.id as recipient_id, recipient.status as recipient_status, report.id as report_id, report.status as report_status
         from incident_dispatch_recipients recipient
         join incident_dispatches d on d.id = recipient.dispatch_id and d.status = 'ACTIVE'
         join fire_reports report on report.id = d.fire_report_id
        where recipient.dispatch_id = $1 and recipient.recipient_user_id = $2
        for update of recipient, report`,
      [dispatchId, userId],
    );
    if (!current.rowCount) throw new Error("ASSIGNMENT_NOT_FOUND");
    const row = current.rows[0];
    if (row.recipient_status === "COMPLETED" || row.recipient_status === "ON_SCENE") throw new Error("INVALID_RECIPIENT_STATUS");
    const now = new Date();
    await client.query(
      `update incident_dispatch_recipients
          set status = 'EN_ROUTE', acknowledged_at = coalesce(acknowledged_at, $1), en_route_at = coalesce(en_route_at, $1), updated_at = $1
        where id = $2`,
      [now, row.recipient_id],
    );
    if (row.report_status === "RESPONDING") {
      await client.query(
        `update fire_reports set status = 'FIRETRUCK_DISPATCHED', responding_bfp_user_id = $1, updated_at = $2 where id = $3`,
        [userId, now, row.report_id],
      );
      await client.query(
        `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
         values ($1,'RESPONDING','FIRETRUCK_DISPATCHED',$2,'A BFP responder has acknowledged the route.',$3)`,
        [row.report_id, userId, now],
      );
    }
    return { recipientStatus: "EN_ROUTE" as const, startedAt: now };
  });
}

export async function recordDispatchLocation(userId: string, dispatchId: string, latitude: number, longitude: number) {
  if (!validId(userId) || !validId(dispatchId) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("INVALID_LOCATION");
  }
  return withTransaction(async (client) => {
    const result = await client.query<{
      recipient_id: string; recipient_status: MobileDispatchAssignment["recipientStatus"]; candidate_started_at: Date | null;
      report_id: string; report_status: FireReportStatus; report_latitude: number; report_longitude: number;
    }>(
      `select recipient.id as recipient_id, recipient.status as recipient_status,
              recipient.arrival_candidate_started_at as candidate_started_at, report.id as report_id, report.status as report_status,
              report.latitude::float as report_latitude, report.longitude::float as report_longitude
         from incident_dispatch_recipients recipient
         join incident_dispatches d on d.id = recipient.dispatch_id and d.status = 'ACTIVE'
         join fire_reports report on report.id = d.fire_report_id
        where recipient.dispatch_id = $1 and recipient.recipient_user_id = $2
        for update of recipient, report`,
      [dispatchId, userId],
    );
    if (!result.rowCount) throw new Error("ASSIGNMENT_NOT_FOUND");
    const row = result.rows[0];
    const now = new Date();
    const metersAway = distanceMeters(latitude, longitude, row.report_latitude, row.report_longitude);
    if (row.recipient_status !== "EN_ROUTE" && row.recipient_status !== "ON_SCENE") throw new Error("INVALID_RECIPIENT_STATUS");
    if (row.recipient_status === "ON_SCENE") return { onScene: true, metersAway, candidateSeconds: 30 };

    if (metersAway > 100) {
      await client.query(
        `update incident_dispatch_recipients set latest_latitude = $1, latest_longitude = $2, latest_location_at = $3,
          arrival_candidate_started_at = null, updated_at = $3 where id = $4`,
        [latitude, longitude, now, row.recipient_id],
      );
      return { onScene: false, metersAway, candidateSeconds: 0 };
    }
    const candidateStartedAt = row.candidate_started_at ?? now;
    const candidateSeconds = Math.max(0, Math.floor((now.getTime() - candidateStartedAt.getTime()) / 1000));
    if (candidateSeconds < 30) {
      await client.query(
        `update incident_dispatch_recipients set latest_latitude = $1, latest_longitude = $2, latest_location_at = $3,
          arrival_candidate_started_at = $4, updated_at = $3 where id = $5`,
        [latitude, longitude, now, candidateStartedAt, row.recipient_id],
      );
      return { onScene: false, metersAway, candidateSeconds };
    }
    await client.query(
      `update incident_dispatch_recipients set status = 'ON_SCENE', latest_latitude = $1, latest_longitude = $2, latest_location_at = $3,
        on_scene_at = $3, arrival_method = 'AUTO_GEOFENCE', updated_at = $3 where id = $4`,
      [latitude, longitude, now, row.recipient_id],
    );
    if (row.report_status !== "RESPONDER_ARRIVED") {
      await client.query("update fire_reports set status = 'RESPONDER_ARRIVED', updated_at = $1 where id = $2", [now, row.report_id]);
      await client.query(
        `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
         values ($1,$2,'RESPONDER_ARRIVED',$3,'A BFP responder has arrived at the incident location.',$4)`,
        [row.report_id, row.report_status, userId, now],
      );
    }
    return { onScene: true, metersAway, candidateSeconds: 30 };
  });
}

export async function resolveDispatchIncident(userId: string, dispatchId: string) {
  if (!validId(userId) || !validId(dispatchId)) throw new Error("INVALID_DISPATCH_INPUT");
  return withTransaction(async (client) => {
    const current = await client.query<{
      recipient_id: string;
      recipient_status: MobileDispatchAssignment["recipientStatus"];
      report_id: string;
      report_status: FireReportStatus;
    }>(
      `select recipient.id as recipient_id, recipient.status as recipient_status, report.id as report_id, report.status as report_status
         from incident_dispatch_recipients recipient
         join incident_dispatches d on d.id = recipient.dispatch_id and d.status = 'ACTIVE'
         join fire_reports report on report.id = d.fire_report_id
        where recipient.dispatch_id = $1 and recipient.recipient_user_id = $2
        for update of recipient, report`,
      [dispatchId, userId],
    );
    if (!current.rowCount) throw new Error("ASSIGNMENT_NOT_FOUND");
    const row = current.rows[0];
    if (row.recipient_status !== "ON_SCENE" || !canTransitionReportStatus(row.report_status, "RESOLVED")) {
      throw new Error("INVALID_RECIPIENT_STATUS");
    }
    const now = new Date();

    await client.query(
      `update incident_dispatch_recipients
          set status = 'COMPLETED', completed_at = $1, updated_at = $1
        where id = $2`,
      [now, row.recipient_id],
    );

    await client.query(
      `update incident_dispatches
          set status = 'COMPLETED', completed_at = $1, updated_at = $1
        where id = $2`,
      [now, dispatchId],
    );

    await client.query(
      `update fire_reports set status = 'RESOLVED', updated_at = $1 where id = $2`,
      [now, row.report_id],
    );

    await client.query(
      `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
       values ($1, $2, 'RESOLVED', $3, 'Fire incident marked as resolved by responding BFP personnel.', $4)`,
      [row.report_id, row.report_status, userId, now],
    );

    return { recipientStatus: "COMPLETED" as const, resolvedAt: now };
  });
}
