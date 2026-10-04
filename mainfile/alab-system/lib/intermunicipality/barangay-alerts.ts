import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "../db";
import { createAssistanceRequests } from "./assistance";
import { validateRequestedResources } from "./assistance-state";
import { rankNearbyMunicipalities } from "./proximity";
import type { StationCandidate } from "./types";
import type { BarangayAlert, BarangayAlertIncident } from "./barangay-alert-types";

const ACTIVE = "fr.duplicate_of_report_id is null and fr.status not in ('RESOLVED','CLOSED','REJECTED','FALSE_REPORT','DUPLICATE')";
type Group = { municipality_id: string; barangay_id: string; incident_ids: string[] };
type AlertRow = Group & { id: string; municipality_name: string; barangay: string; opened_at: Date | string; updated_at: Date | string; acknowledged_at: Date | string | null };

async function synchronize(client: PoolClient) {
  // GET, acknowledgment and assignment take this lock first, in the same order.
  await client.query("select pg_advisory_xact_lock(hashtext('provincial-barangay-alerts'))");
  const groups = await client.query<Group>(`select fr.municipality_id, fr.barangay_id, array_agg(fr.id order by fr.id) as incident_ids
    from fire_reports fr join barangays b on b.id=fr.barangay_id and b.municipality_id=fr.municipality_id
    where ${ACTIVE} group by fr.municipality_id, fr.barangay_id having count(*) >= 3`);
  const open = await client.query<Group & { id: string }>("select id, municipality_id, barangay_id from provincial_barangay_alerts where closed_at is null");
  const keys = new Set(groups.rows.map(g => `${g.municipality_id}:${g.barangay_id}`));
  const closedIds = open.rows.filter(g => !keys.has(`${g.municipality_id}:${g.barangay_id}`)).map(g => g.id);
  if (closedIds.length) await client.query("update provincial_barangay_alerts set closed_at=now(), updated_at=now() where id=any($1::uuid[])", [closedIds]);
  for (const group of groups.rows) {
    await client.query(`insert into provincial_barangay_alerts (municipality_id,barangay_id,incident_ids)
      values ($1,$2,$3::uuid[]) on conflict (municipality_id,barangay_id) where closed_at is null
      do update set incident_ids=excluded.incident_ids, updated_at=now(),
        acknowledged_at=case when provincial_barangay_alerts.incident_ids @> excluded.incident_ids
          then provincial_barangay_alerts.acknowledged_at else null end,
        acknowledged_by_user_id=case when provincial_barangay_alerts.incident_ids @> excluded.incident_ids
          then provincial_barangay_alerts.acknowledged_by_user_id else null end
      where provincial_barangay_alerts.incident_ids is distinct from excluded.incident_ids`,
    [group.municipality_id, group.barangay_id, group.incident_ids]);
  }
}

async function eligibleStations(client: PoolClient) {
  const stations = await client.query<StationCandidate>(`select station.id as "stationId", station.station_name as "stationName",
      station.municipality_id as "municipalityId", m.name as "municipalityName",
      station.latitude::float8 as latitude, station.longitude::float8 as longitude
    from municipal_bfp_stations station join municipalities m on m.id=station.municipality_id
    where station.status='ACTIVE' and station.latitude is not null and station.longitude is not null
      and exists(select 1 from users u join bfp_personnel_profiles p on p.user_id=u.id
        join bfp_municipality_assignments a on a.personnel_profile_id=p.id
        where a.municipality_id=station.municipality_id and a.status='ACTIVE'
          and u.role='MUNICIPAL_BFP' and u.account_status='ACTIVE')`);
  return stations.rows;
}

function nearby(stations: StationCandidate[], incident: { latitude: number; longitude: number; municipality_id: string }) {
  if (!Number.isFinite(incident.latitude) || !Number.isFinite(incident.longitude)) return [];
  return rankNearbyMunicipalities(stations, { latitude: incident.latitude, longitude: incident.longitude, originMunicipalityId: incident.municipality_id }, 100);
}

export async function listProvincialBarangayAlerts(): Promise<BarangayAlert[]> {
  return withTransaction(async client => {
    await synchronize(client);
    const alerts = await client.query<AlertRow>(`select a.*, m.name as municipality_name, b.name as barangay
      from provincial_barangay_alerts a join municipalities m on m.id=a.municipality_id
      join barangays b on b.id=a.barangay_id where a.closed_at is null order by a.opened_at, a.id`);
    if (!alerts.rows.length) return [];
    const ids = alerts.rows.flatMap(a => a.incident_ids);
    const reports = await client.query<{ id: string; reference_number: string; status: string; fire_type: string; latitude: number; longitude: number; municipality_id: string; dispatched: boolean }>(
      `select fr.id, fr.reference_number, fr.status, fr.fire_type, fr.latitude::float8 as latitude, fr.longitude::float8 as longitude, fr.municipality_id,
        exists(select 1 from incident_dispatches d where d.fire_report_id=fr.id and d.status='ACTIVE') as dispatched
       from fire_reports fr where fr.id=any($1::uuid[]) order by fr.submitted_at, fr.id`, [ids]);
    const stations = await eligibleStations(client);
    const commands = await client.query<{ id: string; fire_report_id: string; recipient_municipality_id: string; recipient_municipality_name: string; status: string }>(
      `select r.id,r.fire_report_id,r.recipient_municipality_id,m.name as recipient_municipality_name,r.status
        from intermunicipal_assistance_requests r join municipalities m on m.id=r.recipient_municipality_id
        where r.fire_report_id=any($1::uuid[]) and r.is_provincial_command order by r.requested_at`, [ids]);
    const incidents = new Map<string, BarangayAlertIncident>(reports.rows.map(r => [r.id, {
      id:r.id, referenceNumber:r.reference_number, status:r.status, fireType:r.fire_type, dispatched:r.dispatched,
      nearbyMunicipalities:nearby(stations,r),
      commands:commands.rows.filter(c=>c.fire_report_id===r.id).map(c=>({id:c.id,recipientMunicipalityId:c.recipient_municipality_id,recipientMunicipalityName:c.recipient_municipality_name,status:c.status})),
    }]));
    return alerts.rows.map(a => ({id:a.id,municipalityId:a.municipality_id,municipalityName:a.municipality_name,
      barangayId:a.barangay_id,barangay:a.barangay,incidentIds:a.incident_ids,incidentCount:a.incident_ids.length,
      openedAt:new Date(a.opened_at).toISOString(),updatedAt:new Date(a.updated_at).toISOString(),
      acknowledgedAt:a.acknowledged_at ? new Date(a.acknowledged_at).toISOString() : null,
      incidents:a.incident_ids.flatMap(id=>incidents.has(id)?[incidents.get(id)!]:[])}));
  });
}

export async function acknowledgeProvincialBarangayAlert(alertId: string, incidentIds: string[], actorUserId: string) {
  return withTransaction(async client => {
    await synchronize(client);
    const result = await client.query(`update provincial_barangay_alerts set acknowledged_at=coalesce(acknowledged_at,now()),
      acknowledged_by_user_id=coalesce(acknowledged_by_user_id,$3::uuid)
      where id=$1 and closed_at is null and incident_ids @> $2::uuid[] and incident_ids <@ $2::uuid[] returning id`,
    [alertId, incidentIds, actorUserId]);
    if (!result.rows.length) throw new Error("BARANGAY_ALERT_CHANGED");
    return { acknowledged: true as const };
  });
}

export async function assignBarangayIncidentAssistance(input: {
  alertId: string; fireReportId: string; recipientMunicipalityId: string; requestedFiretrucks: number; requestedPersonnel: number; actorUserId: string;
}) {
  const resources = validateRequestedResources(input.requestedFiretrucks,input.requestedPersonnel);
  return withTransaction(async client => {
    await synchronize(client);
    const alerts = await client.query<AlertRow>(`select a.*,b.name as barangay from provincial_barangay_alerts a
      join barangays b on b.id=a.barangay_id where a.id=$1 and a.closed_at is null for update of a`, [input.alertId]);
    const alert=alerts.rows[0];
    if (!alert || !alert.incident_ids.includes(input.fireReportId)) throw new Error("BARANGAY_ALERT_CHANGED");
    // Protect lifecycle changes until commit while allowing foreign-key checks
    // from concurrent alarm enrollment before we acquire the selected observer.
    const reports = await client.query<{id:string;latitude:number;longitude:number;municipality_id:string}>(
      `select fr.id,fr.latitude::float8 as latitude,fr.longitude::float8 as longitude,fr.municipality_id from fire_reports fr
        where fr.municipality_id=$1 and fr.barangay_id=$2 and ${ACTIVE} order by fr.id for no key update of fr`, [alert.municipality_id,alert.barangay_id]);
    const incident=reports.rows.find(r=>r.id===input.fireReportId);
    if (reports.rows.length < 3 || !incident) throw new Error("BARANGAY_ALERT_CHANGED");
    const dispatches=await client.query<{id:string}>("select id from incident_dispatches where fire_report_id=$1 and status='ACTIVE' order by created_at desc limit 1 for no key update",[input.fireReportId]);
    const dispatchId=dispatches.rows[0]?.id;
    if (!dispatchId) throw new Error("BARANGAY_DISPATCH_REQUIRED");
    const selected=nearby(await eligibleStations(client),incident).find(m=>m.municipalityId===input.recipientMunicipalityId);
    if (!selected) throw new Error("INVALID_BARANGAY_RECIPIENT");
    await client.query(`insert into incident_municipal_observers (id,fire_report_id,dispatch_id,origin_municipality_id,observer_municipality_id,
      nearest_station_id,station_latitude_snapshot,station_longitude_snapshot,distance_meters,status,selected_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',now()) on conflict (dispatch_id,observer_municipality_id) do nothing`,
    [randomUUID(),input.fireReportId,dispatchId,alert.municipality_id,selected.municipalityId,selected.stationId,selected.latitude,selected.longitude,selected.distanceMeters]);
    const requests=await createAssistanceRequests({fireReportId:input.fireReportId,requesterMunicipalityId:alert.municipality_id,
      actorUserId:input.actorUserId,recipientMunicipalityIds:[selected.municipalityId],...resources,
      requestNote:`Provincial coordination: three or more active incidents in ${alert.barangay}.`,
      allowProvincialReach:true,isProvincialCommand:true},client);
    // A command does not acknowledge other incidents the officer has not read.
    return requests;
  });
}
