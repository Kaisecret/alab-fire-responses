import "server-only";

import { getDatabase } from "../db";
import type { NearbyObserver, AssistanceRequestSummary } from "./types";

export type ProvincialIncidentSummary = {
  id: string;
  referenceNumber: string;
  originMunicipality: string;
  barangay: string | null;
  fireType: string;
  calculatedSeverity: string | null;
  status: string;
  submittedAt: string;
  dispatchedAt: string | null;
  assignedStationCount: number;
  observers: NearbyObserver[];
  openAssistanceCount: number;
  nearbySelectionDegraded: boolean;
};

export type ProvincialIncidentDetail = ProvincialIncidentSummary & {
  latitude: number;
  longitude: number;
  landmark: string | null;
  assignedRecipientCount: number;
  assistanceRequests: ProvincialAssistanceRequest[];
  coordinationEvents: Array<{
    eventType: string;
    recipientMunicipality: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    createdAt: string;
  }>;
};

export type ProvincialAssistanceRequest = AssistanceRequestSummary & {
  fireReportId: string;
  referenceNumber: string;
  requesterMunicipalityId: string;
  requesterMunicipalityName: string;
  responderUserId?: string | null;
  responderName?: string | null;
};

type DbIncidentRow = {
  id: string;
  reference_number: string;
  origin_municipality: string;
  barangay: string | null;
  fire_type: string;
  calculated_severity: string | null;
  status: string;
  submitted_at: Date | string;
  dispatched_at: Date | string | null;
  assigned_station_count: string | number;
  open_assistance_count: string | number;
  nearby_selection_degraded: boolean;
  latitude?: number;
  longitude?: number;
  landmark?: string | null;
  assigned_recipient_count?: string | number;
};

type DbObserverRow = {
  fire_report_id: string;
  id: string;
  observer_municipality_id: string;
  observer_municipality_name: string;
  observer_station_id: string;
  observer_station_name: string;
  distance_meters: number | string;
  status: "ACTIVE" | "ENDED";
  acknowledged_at: Date | string | null;
  acknowledged_by_user_id: string | null;
  acknowledged_by_name: string | null;
  assistance_status: AssistanceRequestSummary["status"] | null;
};

type DbAssistanceRow = {
  id: string;
  fire_report_id: string;
  reference_number: string;
  requester_municipality_id: string;
  requester_municipality_name: string;
  recipient_municipality_id: string;
  recipient_municipality_name: string;
  status: "REQUESTED" | "ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  requested_firetrucks: number;
  requested_personnel: number;
  requested_at: Date | string;
  request_note: string | null;
  offered_firetrucks: number | null;
  offered_personnel: number | null;
  responded_at: Date | string | null;
  completed_at: Date | string | null;
  response_note: string | null;
  responder_user_id: string | null;
  responder_name: string | null;
};

type DbCoordinationEventRow = {
  event_type: string;
  recipient_municipality: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: Date | string;
};

function mapObserverRow(row: DbObserverRow): NearbyObserver {
  let monitoringState: "WAITING" | "SEEN" | "BACKUP_REQUESTED" = "WAITING";
  if (row.assistance_status) {
    monitoringState = "BACKUP_REQUESTED";
  } else if (row.acknowledged_at) {
    monitoringState = "SEEN";
  }

  return {
    observerId: row.id,
    municipalityId: row.observer_municipality_id,
    municipalityName: row.observer_municipality_name,
    stationId: row.observer_station_id,
    stationName: row.observer_station_name,
    distanceMeters: Number(row.distance_meters),
    status: row.status,
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : null,
    acknowledgedByUserId: row.acknowledged_by_user_id,
    acknowledgedByDisplayName: row.acknowledged_by_name,
    monitoringState,
    assistanceStatus: row.assistance_status,
  };
}

function mapAssistanceRow(row: DbAssistanceRow): ProvincialAssistanceRequest {
  return {
    id: row.id,
    fireReportId: row.fire_report_id,
    referenceNumber: row.reference_number,
    requesterMunicipalityId: row.requester_municipality_id,
    requesterMunicipalityName: row.requester_municipality_name,
    recipientMunicipalityId: row.recipient_municipality_id,
    recipientMunicipalityName: row.recipient_municipality_name,
    status: row.status,
    requestedFiretrucks: row.requested_firetrucks,
    requestedPersonnel: row.requested_personnel,
    requestedAt: new Date(row.requested_at).toISOString(),
    requestNote: row.request_note,
    offeredFiretrucks: row.offered_firetrucks,
    offeredPersonnel: row.offered_personnel,
    respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : null,
    responseNote: row.response_note,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    responderUserId: row.responder_user_id,
    responderName: row.responder_name,
  };
}

export async function listProvincialCoordinationIncidents(
  includeHistory: boolean,
): Promise<ProvincialIncidentSummary[]> {
  const db = getDatabase();

  const historyClause = includeHistory
    ? ""
    : "and fr.status not in ('RESOLVED', 'CLOSED', 'REJECTED', 'FALSE_REPORT', 'DUPLICATE')";

  const incidentQuery = `
    select
      fr.id,
      fr.reference_number,
      m.name as origin_municipality,
      b.name as barangay,
      fr.fire_type,
      fr.calculated_severity,
      fr.status,
      fr.submitted_at,
      disp.dispatched_at,
      coalesce((
        select count(distinct ids.station_id)
        from incident_dispatch_stations ids
        join incident_dispatches d on d.id = ids.dispatch_id
        where d.fire_report_id = fr.id
      ), 0) as assigned_station_count,
      coalesce((
        select count(*)
        from intermunicipal_assistance_requests iar
        where iar.fire_report_id = fr.id
          and iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED')
      ), 0) as open_assistance_count,
      coalesce((
        select bool_or(event.event_type = 'SELECTION_DEGRADED')
        from intermunicipal_coordination_events event
        where event.fire_report_id = fr.id
      ), false) as nearby_selection_degraded
    from fire_reports fr
    join municipalities m on m.id = fr.municipality_id
    left join barangays b on b.id = fr.barangay_id
    left join lateral (
      select idisp.dispatched_at
      from incident_dispatches idisp
      where idisp.fire_report_id = fr.id
      order by idisp.created_at desc
      limit 1
    ) disp on true
    where 1=1
      ${historyClause}
    order by fr.submitted_at desc
  `;

  const incidentsRes = await db.query<DbIncidentRow>(incidentQuery);
  if (!incidentsRes.rows.length) return [];

  const incidentIds = incidentsRes.rows.map((r) => r.id);

  const observersRes = await db.query<DbObserverRow>(
    `select
       imo.fire_report_id,
       imo.id,
       imo.observer_municipality_id,
       obs_m.name as observer_municipality_name,
       imo.nearest_station_id as observer_station_id,
       st.station_name as observer_station_name,
       imo.distance_meters,
       imo.status,
       imo.acknowledged_at,
       imo.acknowledged_by_user_id,
       ack_p.display_name as acknowledged_by_name,
       (
         select iar.status
         from intermunicipal_assistance_requests iar
         where iar.dispatch_id = imo.dispatch_id
           and iar.recipient_municipality_id = imo.observer_municipality_id
           and iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED')
         order by iar.requested_at desc limit 1
       ) as assistance_status
     from incident_municipal_observers imo
     join municipalities obs_m on obs_m.id = imo.observer_municipality_id
     join municipal_bfp_stations st on st.id = imo.nearest_station_id
     left join users ack_u on ack_u.id = imo.acknowledged_by_user_id
     left join bfp_personnel_profiles ack_p on ack_p.user_id = ack_u.id
     where imo.fire_report_id = any($1::uuid[])
     order by imo.distance_meters asc, imo.observer_municipality_id`,
    [incidentIds],
  );

  const observersByIncident = new Map<string, NearbyObserver[]>();
  for (const obs of observersRes.rows) {
    const list = observersByIncident.get(obs.fire_report_id) ?? [];
    list.push(mapObserverRow(obs));
    observersByIncident.set(obs.fire_report_id, list);
  }

  return incidentsRes.rows.map((row) => ({
    id: row.id,
    referenceNumber: row.reference_number,
    originMunicipality: row.origin_municipality,
    barangay: row.barangay,
    fireType: row.fire_type,
    calculatedSeverity: row.calculated_severity,
    status: row.status,
    submittedAt: new Date(row.submitted_at).toISOString(),
    dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at).toISOString() : null,
    assignedStationCount: Number(row.assigned_station_count),
    observers: observersByIncident.get(row.id) ?? [],
    openAssistanceCount: Number(row.open_assistance_count),
    nearbySelectionDegraded: Boolean(row.nearby_selection_degraded),
  }));
}

export async function getProvincialCoordinationIncident(
  fireReportId: string,
): Promise<ProvincialIncidentDetail | null> {
  const db = getDatabase();

  const incidentRes = await db.query<DbIncidentRow>(
    `select
       fr.id,
       fr.reference_number,
       m.name as origin_municipality,
       b.name as barangay,
       fr.fire_type,
       fr.calculated_severity,
       fr.status,
       fr.submitted_at,
       fr.latitude,
       fr.longitude,
       fr.nearest_landmark as landmark,
       disp.dispatched_at,
       coalesce((
         select count(distinct ids.station_id)
         from incident_dispatch_stations ids
         join incident_dispatches d on d.id = ids.dispatch_id
         where d.fire_report_id = fr.id
       ), 0) as assigned_station_count,
       coalesce((
         select count(distinct idr.recipient_user_id)
         from incident_dispatch_recipients idr
         join incident_dispatches d on d.id = idr.dispatch_id
         where d.fire_report_id = fr.id
       ), 0) as assigned_recipient_count,
       coalesce((
         select count(*)
         from intermunicipal_assistance_requests iar
         where iar.fire_report_id = fr.id
           and iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED')
       ), 0) as open_assistance_count,
       coalesce((
         select bool_or(event.event_type = 'SELECTION_DEGRADED')
         from intermunicipal_coordination_events event
         where event.fire_report_id = fr.id
       ), false) as nearby_selection_degraded
     from fire_reports fr
     join municipalities m on m.id = fr.municipality_id
     left join barangays b on b.id = fr.barangay_id
     left join lateral (
       select idisp.dispatched_at
       from incident_dispatches idisp
       where idisp.fire_report_id = fr.id
       order by idisp.created_at desc
       limit 1
     ) disp on true
     where fr.id = $1`,
    [fireReportId],
  );

  if (!incidentRes.rows.length) return null;
  const row = incidentRes.rows[0];

  const observersRes = await db.query<DbObserverRow>(
    `select
       imo.fire_report_id,
       imo.id,
       imo.observer_municipality_id,
       obs_m.name as observer_municipality_name,
       imo.nearest_station_id as observer_station_id,
       st.station_name as observer_station_name,
       imo.distance_meters,
       imo.status,
       imo.acknowledged_at,
       imo.acknowledged_by_user_id,
       ack_p.display_name as acknowledged_by_name,
       (
         select iar.status
         from intermunicipal_assistance_requests iar
         where iar.dispatch_id = imo.dispatch_id
           and iar.recipient_municipality_id = imo.observer_municipality_id
           and iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED')
         order by iar.requested_at desc limit 1
       ) as assistance_status
     from incident_municipal_observers imo
     join municipalities obs_m on obs_m.id = imo.observer_municipality_id
     join municipal_bfp_stations st on st.id = imo.nearest_station_id
     left join users ack_u on ack_u.id = imo.acknowledged_by_user_id
     left join bfp_personnel_profiles ack_p on ack_p.user_id = ack_u.id
     where imo.fire_report_id = $1
     order by imo.distance_meters asc, imo.observer_municipality_id`,
    [fireReportId],
  );

  const assistanceRes = await db.query<DbAssistanceRow>(
    `select
       iar.id,
       iar.fire_report_id,
       fr.reference_number,
       iar.requester_municipality_id,
       req_m.name as requester_municipality_name,
       iar.recipient_municipality_id,
       rec_m.name as recipient_municipality_name,
       iar.status,
       iar.requested_firetrucks,
       iar.requested_personnel,
       iar.requested_at,
       iar.request_note,
       iar.offered_firetrucks,
       iar.offered_personnel,
       iar.responded_at,
       iar.completed_at,
       iar.response_note,
       iar.responded_by_user_id as responder_user_id,
       resp_p.display_name as responder_name
     from intermunicipal_assistance_requests iar
     join fire_reports fr on fr.id = iar.fire_report_id
     join municipalities req_m on req_m.id = iar.requester_municipality_id
     join municipalities rec_m on rec_m.id = iar.recipient_municipality_id
     left join users resp_u on resp_u.id = iar.responded_by_user_id
     left join bfp_personnel_profiles resp_p on resp_p.user_id = resp_u.id
     where iar.fire_report_id = $1
     order by
       case when iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED') then 0 else 1 end,
       iar.requested_at desc`,
    [fireReportId],
  );

  const eventsRes = await db.query<DbCoordinationEventRow>(
    `select
       ice.event_type,
       rec_m.name as recipient_municipality,
       ice.old_status,
       ice.new_status,
       ice.created_at
     from intermunicipal_coordination_events ice
     left join municipalities rec_m on rec_m.id = ice.recipient_municipality_id
     where ice.fire_report_id = $1
     order by ice.created_at desc`,
    [fireReportId],
  );

  return {
    id: row.id,
    referenceNumber: row.reference_number,
    originMunicipality: row.origin_municipality,
    barangay: row.barangay,
    fireType: row.fire_type,
    calculatedSeverity: row.calculated_severity,
    status: row.status,
    submittedAt: new Date(row.submitted_at).toISOString(),
    dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at).toISOString() : null,
    assignedStationCount: Number(row.assigned_station_count),
    observers: observersRes.rows.map(mapObserverRow),
    openAssistanceCount: Number(row.open_assistance_count),
    nearbySelectionDegraded: Boolean(row.nearby_selection_degraded),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    landmark: row.landmark ?? null,
    assignedRecipientCount: Number(row.assigned_recipient_count),
    assistanceRequests: assistanceRes.rows.map(mapAssistanceRow),
    coordinationEvents: eventsRes.rows.map((ev) => ({
      eventType: ev.event_type,
      recipientMunicipality: ev.recipient_municipality,
      oldStatus: ev.old_status,
      newStatus: ev.new_status,
      createdAt: new Date(ev.created_at).toISOString(),
    })),
  };
}

export async function listProvincialAssistanceRequests(
  includeClosed: boolean,
): Promise<ProvincialAssistanceRequest[]> {
  const db = getDatabase();

  const statusClause = includeClosed
    ? ""
    : "where iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED')";

  const res = await db.query<DbAssistanceRow>(
    `select
       iar.id,
       iar.fire_report_id,
       fr.reference_number,
       iar.requester_municipality_id,
       req_m.name as requester_municipality_name,
       iar.recipient_municipality_id,
       rec_m.name as recipient_municipality_name,
       iar.status,
       iar.requested_firetrucks,
       iar.requested_personnel,
       iar.requested_at,
       iar.request_note,
       iar.offered_firetrucks,
       iar.offered_personnel,
       iar.responded_at,
       iar.completed_at,
       iar.response_note,
       iar.responded_by_user_id as responder_user_id,
       resp_p.display_name as responder_name
     from intermunicipal_assistance_requests iar
     join fire_reports fr on fr.id = iar.fire_report_id
     join municipalities req_m on req_m.id = iar.requester_municipality_id
     join municipalities rec_m on rec_m.id = iar.recipient_municipality_id
     left join users resp_u on resp_u.id = iar.responded_by_user_id
     left join bfp_personnel_profiles resp_p on resp_p.user_id = resp_u.id
     ${statusClause}
     order by
       case when iar.status in ('REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED') then 0 else 1 end,
       iar.requested_at desc`,
  );

  return res.rows.map(mapAssistanceRow);
}
