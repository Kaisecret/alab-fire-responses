import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "../db";
import {
  createAccountNotifications,
  listMunicipalNotificationRecipients,
  listProvincialNotificationRecipients,
} from "../notifications/service";
import { recordCoordinationEvent } from "./audit";
import { rankNearbyMunicipalities } from "./proximity";
import type {
  NearbyObserver,
  StationCandidate,
} from "./types";

type Queryable = Pick<PoolClient, "query">;

export type CreateNearbyObserversInput = {
  fireReportId: string;
  dispatchId: string;
  originMunicipalityId: string;
  originMunicipalityName: string;
  actorUserId: string;
  referenceNumber: string;
  barangay: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

export type CreateNearbyObserversResult = {
  observers: NearbyObserver[];
  degraded: boolean;
};

export async function createNearbyIncidentObservers(
  client: Queryable,
  input: CreateNearbyObserversInput,
): Promise<CreateNearbyObserversResult> {
  const candidateResult = await client.query<StationCandidate>(
    `select station.id as "stationId",
            station.station_name as "stationName",
            station.municipality_id as "municipalityId",
            municipality.name as "municipalityName",
            station.latitude::float as latitude,
            station.longitude::float as longitude
       from municipal_bfp_stations station
       join municipalities municipality on municipality.id = station.municipality_id
      where station.status = 'ACTIVE'
        and station.municipality_id <> $1
        and exists (
          select 1
            from users municipal_user
            join bfp_personnel_profiles profile on profile.user_id = municipal_user.id
            join bfp_municipality_assignments assignment
              on assignment.personnel_profile_id = profile.id
           where assignment.municipality_id = station.municipality_id
             and assignment.status = 'ACTIVE'
             and municipal_user.role = 'MUNICIPAL_BFP'
             and municipal_user.account_status = 'ACTIVE'
        )
      order by station.municipality_id, station.id`,
    [input.originMunicipalityId],
  );

  const ranked = rankNearbyMunicipalities(
    candidateResult.rows,
    {
      latitude: input.latitude,
      longitude: input.longitude,
      originMunicipalityId: input.originMunicipalityId,
    },
    2,
  );

  const observers: NearbyObserver[] = [];
  const locationDesc = input.barangay
    ? `${input.barangay}, ${input.originMunicipalityName}`
    : input.originMunicipalityName;

  for (const candidate of ranked) {
    const observerId = randomUUID();
    await client.query(
      `insert into incident_municipal_observers (
         id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
         nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
         distance_meters, status, selected_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',$10)`,
      [
        observerId,
        input.fireReportId,
        input.dispatchId,
        input.originMunicipalityId,
        candidate.municipalityId,
        candidate.stationId,
        candidate.latitude,
        candidate.longitude,
        candidate.distanceMeters,
        input.createdAt,
      ],
    );

    observers.push({
      observerId,
      municipalityId: candidate.municipalityId,
      municipalityName: candidate.municipalityName,
      stationId: candidate.stationId,
      stationName: candidate.stationName,
      distanceMeters: candidate.distanceMeters,
      status: "ACTIVE",
      acknowledgedByUserId: null,
      acknowledgedByDisplayName: null,
      acknowledgedAt: null,
      monitoringState: "WAITING",
      assistanceStatus: null,
    });

    const observerRecipients = await listMunicipalNotificationRecipients(
      client,
      candidate.municipalityId,
    );

    await createAccountNotifications(client, {
      recipientUserIds: observerRecipients,
      eventType: "NEARBY_INCIDENT_ASSIGNED",
      category: "INCIDENT",
      title: "Nearby Incident Monitoring",
      summary: `Active fire response dispatched in nearby ${locationDesc} (${input.referenceNumber}). Tap for live situational awareness.`,
      actionHref: `/municipal-bfp/active-incidents?incident=${input.fireReportId}`,
      entityType: "fire_report",
      entityId: input.fireReportId,
      dedupeKey: `nearby-incident:${input.dispatchId}:${candidate.municipalityId}`,
      createdAt: input.createdAt,
    });
  }

  await recordCoordinationEvent(client, {
    fireReportId: input.fireReportId,
    dispatchId: input.dispatchId,
    actorUserId: input.actorUserId,
    originMunicipalityId: input.originMunicipalityId,
    eventType: "OBSERVERS_SELECTED",
    metadata: {
      selectedCount: observers.length,
      observers: observers.map((o) => ({
        municipalityId: o.municipalityId,
        municipalityName: o.municipalityName,
        distanceMeters: o.distanceMeters,
      })),
    },
    createdAt: input.createdAt,
  });

  const provincialRecipients = await listProvincialNotificationRecipients(client);
  await createAccountNotifications(client, {
    recipientUserIds: provincialRecipients,
    eventType: "NEARBY_MONITORING_STARTED",
    category: "INCIDENT",
    title: "Nearby Monitoring Activated",
    summary: `Coordination monitoring activated for incident ${input.referenceNumber} in ${locationDesc} with ${observers.length} nearby municipality(ies).`,
    actionHref: `/provincial-bfp/incidents?incident=${input.fireReportId}`,
    entityType: "fire_report",
    entityId: input.fireReportId,
    dedupeKey: `nearby-monitoring:${input.dispatchId}:provincial`,
    createdAt: input.createdAt,
  });

  const degraded = observers.length < 2;
  if (degraded) {
    await recordCoordinationEvent(client, {
      fireReportId: input.fireReportId,
      dispatchId: input.dispatchId,
      actorUserId: input.actorUserId,
      originMunicipalityId: input.originMunicipalityId,
      eventType: "SELECTION_DEGRADED",
      metadata: {
        selectedCount: observers.length,
        requiredCount: 2,
      },
      createdAt: input.createdAt,
    });

    const originRecipients = await listMunicipalNotificationRecipients(
      client,
      input.originMunicipalityId,
    );

    const degradedRecipients = [...new Set([...originRecipients, ...provincialRecipients])];
    await createAccountNotifications(client, {
      recipientUserIds: degradedRecipients,
      eventType: "NEARBY_SELECTION_DEGRADED",
      category: "SYSTEM",
      title: "Degraded Observer Selection",
      summary: `Only ${observers.length} eligible nearby municipality found for incident ${input.referenceNumber} in ${locationDesc}.`,
      actionHref: `/municipal-bfp/active-incidents?incident=${input.fireReportId}`,
      entityType: "fire_report",
      entityId: input.fireReportId,
      dedupeKey: `nearby-selection:${input.dispatchId}:degraded`,
      createdAt: input.createdAt,
    });
  }

  return { observers, degraded };
}

export async function acknowledgeNearbyIncident(input: {
  fireReportId: string;
  observerMunicipalityId: string;
  actorUserId: string;
  acknowledgedAt: Date;
}): Promise<NearbyObserver> {
  return withTransaction(async (client) => {
    const existing = await client.query<{
      id: string;
      fire_report_id: string;
      dispatch_id: string;
      origin_municipality_id: string;
      observer_municipality_id: string;
      observer_municipality_name: string;
      nearest_station_id: string;
      station_name: string;
      distance_meters: string;
      status: "ACTIVE" | "ENDED";
      acknowledged_by_user_id: string | null;
      acknowledged_at: string | null;
    }>(
      `select o.id, o.fire_report_id, o.dispatch_id, o.origin_municipality_id,
              o.observer_municipality_id, m.name as observer_municipality_name,
              o.nearest_station_id, s.station_name, o.distance_meters,
              o.status, o.acknowledged_by_user_id, o.acknowledged_at
         from incident_municipal_observers o
         join municipalities m on m.id = o.observer_municipality_id
         join municipal_bfp_stations s on s.id = o.nearest_station_id
        where o.fire_report_id = $1
          and o.observer_municipality_id = $2
        for update`,
      [input.fireReportId, input.observerMunicipalityId],
    );

    const row = existing.rows[0];
    if (!row) {
      throw new Error("INCIDENT_NOT_FOUND");
    }
    if (row.status !== "ACTIVE") {
      throw new Error("OBSERVER_ACCESS_ENDED");
    }

    const wasUnacknowledged = !row.acknowledged_at;
    if (wasUnacknowledged) {
      await client.query(
        `update incident_municipal_observers
            set acknowledged_by_user_id = coalesce(acknowledged_by_user_id, $1),
                acknowledged_at = coalesce(acknowledged_at, $2)
          where id = $3`,
        [input.actorUserId, input.acknowledgedAt, row.id],
      );

      await recordCoordinationEvent(client, {
        fireReportId: row.fire_report_id,
        dispatchId: row.dispatch_id,
        actorUserId: input.actorUserId,
        originMunicipalityId: row.origin_municipality_id,
        recipientMunicipalityId: row.observer_municipality_id,
        eventType: "OBSERVER_ALERT_ACKNOWLEDGED",
        createdAt: input.acknowledgedAt,
      });
    }

    const userProfile = await client.query<{ display_name: string }>(
      `select coalesce(p.display_name, u.email, 'Municipal Officer') as display_name
         from users u
         left join bfp_personnel_profiles p on p.user_id = u.id
        where u.id = $1`,
      [row.acknowledged_by_user_id || input.actorUserId],
    );

    const assistanceCheck = await client.query<{ status: string }>(
      `select status from intermunicipal_assistance_requests
        where dispatch_id = $1 and recipient_municipality_id = $2
        order by requested_at desc limit 1`,
      [row.dispatch_id, row.observer_municipality_id],
    );

    const assistanceRow = assistanceCheck.rows[0];
    let monitoringState: NearbyObserver["monitoringState"] = "WAITING";
    if (assistanceRow) {
      monitoringState = "BACKUP_REQUESTED";
    } else if (!wasUnacknowledged || row.acknowledged_at || input.acknowledgedAt) {
      monitoringState = "SEEN";
    }

    return {
      observerId: row.id,
      municipalityId: row.observer_municipality_id,
      municipalityName: row.observer_municipality_name,
      stationId: row.nearest_station_id,
      stationName: row.station_name,
      distanceMeters: Number(row.distance_meters),
      status: row.status,
      acknowledgedByUserId: row.acknowledged_by_user_id || input.actorUserId,
      acknowledgedByDisplayName: userProfile.rows[0]?.display_name ?? null,
      acknowledgedAt: row.acknowledged_at || input.acknowledgedAt.toISOString(),
      monitoringState,
      assistanceStatus: (assistanceRow?.status as NearbyObserver["assistanceStatus"]) || null,
    };
  });
}

export async function endIncidentObservers(
  client: Queryable,
  input: {
    fireReportId: string;
    dispatchId: string;
    originMunicipalityId: string;
    actorUserId: string;
    endedAt: Date;
  },
): Promise<string[]> {
  const result = await client.query<{ id: string; observer_municipality_id: string }>(
    `update incident_municipal_observers
        set status = 'ENDED',
            ended_at = $1
      where dispatch_id = $2
        and status = 'ACTIVE'
      returning id, observer_municipality_id`,
    [input.endedAt, input.dispatchId],
  );

  for (const row of result.rows) {
    await recordCoordinationEvent(client, {
      fireReportId: input.fireReportId,
      dispatchId: input.dispatchId,
      actorUserId: input.actorUserId,
      originMunicipalityId: input.originMunicipalityId,
      recipientMunicipalityId: row.observer_municipality_id,
      eventType: "OBSERVER_ACCESS_ENDED",
      oldStatus: "ACTIVE",
      newStatus: "ENDED",
      createdAt: input.endedAt,
    });
  }

  return result.rows.map((r) => r.observer_municipality_id);
}
