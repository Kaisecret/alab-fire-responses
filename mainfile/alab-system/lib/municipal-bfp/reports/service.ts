import "server-only";

import { getDatabase } from "../../db";
import { getFireReportPhotoUrl } from "../../supabase/server-storage";
import type { MunicipalAdminIdentity } from "../auth";
import {
  CONFIRMED_STATUSES,
  RESOLVED_STATUSES,
  ADMINISTRATIVE_STATUSES,
  municipalReportWhere,
} from "./filters";
import type {
  MunicipalBarangaySummary,
  MunicipalDispatchRecord,
  MunicipalReportDetail,
  MunicipalReportFilters,
  MunicipalReportRow,
  MunicipalReportSummary,
  MunicipalTimelineEvent,
} from "./types";

function calculateDurationMinutes(
  startIso: string | Date | null | undefined,
  endIso: string | Date | null | undefined,
): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diffMs = end - start;
  if (diffMs < 0) return null;
  return Math.round((diffMs / 60000) * 10) / 10;
}

export async function listMunicipalReports(
  actor: MunicipalAdminIdentity,
  filters: MunicipalReportFilters,
): Promise<{
  items: MunicipalReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = getDatabase();
  const { clauses: whereClauses, values } = municipalReportWhere(actor.municipalityId, filters);
  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  const countResult = await db.query<{ count: string }>(
    `select count(*)::text as count
       from fire_reports fr
       join municipalities m on m.id = fr.municipality_id
       left join barangays b on b.id = fr.barangay_id
     ${whereSql}`,
    values,
  );
  const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

  const offset = (filters.page - 1) * filters.pageSize;
  values.push(filters.pageSize);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const rowsResult = await db.query<{
    id: string;
    referenceNumber: string;
    municipalityId: string;
    municipalityName: string;
    barangay: string | null;
    reportSource: "ALAB_APP" | "PHONE_CALL";
    fireType: string;
    severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN" | null;
    status: string;
    latitude: string | number;
    longitude: string | number;
    submittedAt: Date;
    responseStartedAt: Date | null;
    recordedArrivalAt: Date | null;
    resolvedAt: Date | null;
    latestDispatchSummary: string | null;
  }>(
    `select fr.id,
            fr.reference_number as "referenceNumber",
            fr.municipality_id as "municipalityId",
            m.name as "municipalityName",
            coalesce(b.name, fr.address_label, 'Unknown Barangay') as "barangay",
            fr.report_source as "reportSource",
            fr.fire_type as "fireType",
            coalesce(fr.calculated_severity, 'UNKNOWN') as "severity",
            fr.status,
            fr.latitude,
            fr.longitude,
            fr.submitted_at as "submittedAt",
            coalesce(fr.response_started_at, (
              select min(coalesce(r.acknowledged_at, r.en_route_at))
                from incident_dispatch_recipients r
                join incident_dispatches d on d.id = r.dispatch_id
               where d.fire_report_id = fr.id
            )) as "responseStartedAt",
            (
              select min(arrival_time) from (
                select min(r.on_scene_at) as arrival_time
                  from incident_dispatch_recipients r
                  join incident_dispatches d on d.id = r.dispatch_id
                 where d.fire_report_id = fr.id and r.on_scene_at is not null
                union all
                select min(h.created_at) as arrival_time
                  from fire_report_status_history h
                 where h.fire_report_id = fr.id and h.next_status = 'RESPONDER_ARRIVED'
              ) arrivals
            ) as "recordedArrivalAt",
            (case when fr.status in ('CLOSED', 'RESOLVED') then (
              select max(h.created_at) from fire_report_status_history h
              where h.fire_report_id = fr.id and h.next_status in ('CLOSED', 'RESOLVED')
            ) end) as "resolvedAt",
            (
              select concat(
                'Dispatch ', d.status, ' (',
                (select count(*) from incident_dispatch_stations where dispatch_id = d.id), ' stations, ',
                (select count(*) from incident_dispatch_recipients where dispatch_id = d.id), ' responders)'
              )
                from incident_dispatches d
               where d.fire_report_id = fr.id
               order by d.dispatched_at desc
               limit 1
            ) as "latestDispatchSummary"
       from fire_reports fr
       join municipalities m on m.id = fr.municipality_id
       left join barangays b on b.id = fr.barangay_id
     ${whereSql}
      order by fr.submitted_at desc, fr.id desc
      limit $${limitIdx} offset $${offsetIdx}`,
    values,
  );

  const items: MunicipalReportRow[] = rowsResult.rows.map((row) => {
    const submittedAtIso = row.submittedAt ? new Date(row.submittedAt).toISOString() : new Date().toISOString();
    const responseStartedAtIso = row.responseStartedAt ? new Date(row.responseStartedAt).toISOString() : null;
    const recordedArrivalAtIso = row.recordedArrivalAt ? new Date(row.recordedArrivalAt).toISOString() : null;
    const resolvedAtIso = row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null;

    return {
      id: row.id,
      referenceNumber: row.referenceNumber,
      municipalityId: row.municipalityId,
      municipalityName: row.municipalityName,
      barangay: row.barangay ?? "Unknown Barangay",
      reportSource: row.reportSource,
      fireType: row.fireType,
      severity: row.severity ?? "UNKNOWN",
      status: row.status,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      submittedAt: submittedAtIso,
      responseStartedAt: responseStartedAtIso,
      recordedArrivalAt: recordedArrivalAtIso,
      resolvedAt: resolvedAtIso,
      latestDispatchSummary: row.latestDispatchSummary,
      timeToResponseMinutes: calculateDurationMinutes(submittedAtIso, responseStartedAtIso),
      timeToArrivalMinutes: calculateDurationMinutes(submittedAtIso, recordedArrivalAtIso),
      timeToResolutionMinutes: calculateDurationMinutes(submittedAtIso, resolvedAtIso),
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export async function getMunicipalReportDetail(
  actor: MunicipalAdminIdentity,
  reportId: string,
): Promise<MunicipalReportDetail | null> {
  const db = getDatabase();

  const reportRes = await db.query<{
    id: string;
    referenceNumber: string;
    municipalityId: string;
    municipalityName: string;
    barangay: string | null;
    reportSource: "ALAB_APP" | "PHONE_CALL";
    fireType: string;
    severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN" | null;
    status: string;
    latitude: string | number;
    longitude: string | number;
    submittedAt: Date;
    description: string;
    addressLabel: string | null;
    responseStartedAt: Date | null;
    recordedArrivalAt: Date | null;
    resolvedAt: Date | null;
    latestDispatchSummary: string | null;
  }>(
    `select fr.id,
            fr.reference_number as "referenceNumber",
            fr.municipality_id as "municipalityId",
            m.name as "municipalityName",
            coalesce(b.name, fr.address_label, 'Unknown Barangay') as "barangay",
            fr.report_source as "reportSource",
            fr.fire_type as "fireType",
            coalesce(fr.calculated_severity, 'UNKNOWN') as "severity",
            fr.status,
            fr.latitude,
            fr.longitude,
            fr.submitted_at as "submittedAt",
            fr.description,
            fr.address_label as "addressLabel",
            coalesce(fr.response_started_at, (
              select min(coalesce(r.acknowledged_at, r.en_route_at))
                from incident_dispatch_recipients r
                join incident_dispatches d on d.id = r.dispatch_id
               where d.fire_report_id = fr.id
            )) as "responseStartedAt",
            (
              select min(arrival_time) from (
                select min(r.on_scene_at) as arrival_time
                  from incident_dispatch_recipients r
                  join incident_dispatches d on d.id = r.dispatch_id
                 where d.fire_report_id = fr.id and r.on_scene_at is not null
                union all
                select min(h.created_at) as arrival_time
                  from fire_report_status_history h
                 where h.fire_report_id = fr.id and h.next_status = 'RESPONDER_ARRIVED'
              ) arrivals
            ) as "recordedArrivalAt",
            (case when fr.status in ('CLOSED', 'RESOLVED') then (
              select max(h.created_at) from fire_report_status_history h
              where h.fire_report_id = fr.id and h.next_status in ('CLOSED', 'RESOLVED')
            ) end) as "resolvedAt",
            (
              select concat(
                'Dispatch ', d.status, ' (',
                (select count(*) from incident_dispatch_stations where dispatch_id = d.id), ' stations, ',
                (select count(*) from incident_dispatch_recipients where dispatch_id = d.id), ' responders)'
              )
                from incident_dispatches d
               where d.fire_report_id = fr.id
               order by d.dispatched_at desc
               limit 1
            ) as "latestDispatchSummary"
       from fire_reports fr
       join municipalities m on m.id = fr.municipality_id
       left join barangays b on b.id = fr.barangay_id
      where (fr.id::text = $1 or fr.reference_number = $1)
        and fr.municipality_id = $2
      limit 1`,
    [reportId, actor.municipalityId],
  );

  if (reportRes.rowCount === 0) return null;
  const rep = reportRes.rows[0];

  const submittedAtIso = rep.submittedAt ? new Date(rep.submittedAt).toISOString() : new Date().toISOString();
  const responseStartedAtIso = rep.responseStartedAt ? new Date(rep.responseStartedAt).toISOString() : null;
  const recordedArrivalAtIso = rep.recordedArrivalAt ? new Date(rep.recordedArrivalAt).toISOString() : null;
  const resolvedAtIso = rep.resolvedAt ? new Date(rep.resolvedAt).toISOString() : null;

  // History / Timeline
  const historyRes = await db.query<{ stage: string; timestamp: Date; notes: string | null }>(
    `select next_status as stage, created_at as timestamp, resident_message as notes
       from fire_report_status_history
      where fire_report_id = $1
      order by created_at asc, id asc`,
    [rep.id],
  );

  const timeline: MunicipalTimelineEvent[] = historyRes.rows.map((h) => ({
    stage: h.stage,
    timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : new Date().toISOString(),
    notes: h.notes,
  }));

  // Photos: get signed URLs safely
  const photosRes = await db.query<{ storage_key: string }>(
    `select storage_key from fire_report_photos where fire_report_id = $1`,
    [rep.id],
  );

  const signedPhotos = await Promise.all(
    photosRes.rows.map(async (p) => {
      const url = await getFireReportPhotoUrl(p.storage_key);
      return url;
    }),
  );
  const photos = signedPhotos.filter((url): url is string => Boolean(url));

  // Dispatches
  const dispatchesRes = await db.query<{
    id: string;
    status: string;
    dispatchedAt: Date;
    completedAt: Date | null;
    cancelledAt: Date | null;
  }>(
    `select id, status, dispatched_at as "dispatchedAt", completed_at as "completedAt", cancelled_at as "cancelledAt"
       from incident_dispatches
      where fire_report_id = $1
      order by dispatched_at desc`,
    [rep.id],
  );

  const dispatches: MunicipalDispatchRecord[] = await Promise.all(
    dispatchesRes.rows.map(async (d) => {
      const [stationsRes, recipientsRes] = await Promise.all([
        db.query<{ stationName: string }>(
          `select station_name_snapshot as "stationName"
             from incident_dispatch_stations
            where dispatch_id = $1`,
          [d.id],
        ),
        db.query<{
          userId: string;
          name: string;
          status: string;
          assignedAt: Date;
          acknowledgedAt: Date | null;
          enRouteAt: Date | null;
          onSceneAt: Date | null;
          completedAt: Date | null;
        }>(
          `select recipient_user_id as "userId",
                  recipient_name_snapshot as "name",
                  status,
                  assigned_at as "assignedAt",
                  acknowledged_at as "acknowledgedAt",
                  en_route_at as "enRouteAt",
                  on_scene_at as "onSceneAt",
                  completed_at as "completedAt"
             from incident_dispatch_recipients
            where dispatch_id = $1`,
          [d.id],
        ),
      ]);

      return {
        id: d.id,
        status: d.status,
        dispatchedAt: d.dispatchedAt ? new Date(d.dispatchedAt).toISOString() : new Date().toISOString(),
        completedAt: d.completedAt ? new Date(d.completedAt).toISOString() : null,
        cancelledAt: d.cancelledAt ? new Date(d.cancelledAt).toISOString() : null,
        stationName: stationsRes.rows.map((s) => s.stationName).join(", ") || "Assigned Units",
        recipients: recipientsRes.rows.map((r) => ({
          userId: r.userId,
          name: r.name,
          status: r.status,
          assignedAt: r.assignedAt ? new Date(r.assignedAt).toISOString() : new Date().toISOString(),
          acknowledgedAt: r.acknowledgedAt ? new Date(r.acknowledgedAt).toISOString() : null,
          enRouteAt: r.enRouteAt ? new Date(r.enRouteAt).toISOString() : null,
          onSceneAt: r.onSceneAt ? new Date(r.onSceneAt).toISOString() : null,
          completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
        })),
      };
    }),
  );

  return {
    id: rep.id,
    referenceNumber: rep.referenceNumber,
    municipalityId: rep.municipalityId,
    municipalityName: rep.municipalityName,
    barangay: rep.barangay ?? "Unknown Barangay",
    reportSource: rep.reportSource,
    fireType: rep.fireType,
    severity: rep.severity ?? "UNKNOWN",
    status: rep.status,
    latitude: Number(rep.latitude),
    longitude: Number(rep.longitude),
    submittedAt: submittedAtIso,
    responseStartedAt: responseStartedAtIso,
    recordedArrivalAt: recordedArrivalAtIso,
    resolvedAt: resolvedAtIso,
    latestDispatchSummary: rep.latestDispatchSummary,
    timeToResponseMinutes: calculateDurationMinutes(submittedAtIso, responseStartedAtIso),
    timeToArrivalMinutes: calculateDurationMinutes(submittedAtIso, recordedArrivalAtIso),
    timeToResolutionMinutes: calculateDurationMinutes(submittedAtIso, resolvedAtIso),
    description: rep.description,
    addressLabel: rep.addressLabel,
    photos,
    timeline,
    dispatches,
  };
}

export async function getMunicipalReportSummary(
  actor: MunicipalAdminIdentity,
  filters: MunicipalReportFilters,
): Promise<MunicipalReportSummary> {
  const db = getDatabase();
  const { clauses: whereClauses, values } = municipalReportWhere(actor.municipalityId, filters);
  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  const [countsByStatus, countsBySource, countsByType, countsBySeverity, totalRes] =
    await Promise.all([
      db.query<{ status: string; count: string }>(
        `select fr.status, count(*)::text as count
           from fire_reports fr
           join municipalities m on m.id = fr.municipality_id
           left join barangays b on b.id = fr.barangay_id
         ${whereSql}
          group by fr.status`,
        values,
      ),
      db.query<{ source: string; count: string }>(
        `select fr.report_source as source, count(*)::text as count
           from fire_reports fr
           join municipalities m on m.id = fr.municipality_id
           left join barangays b on b.id = fr.barangay_id
         ${whereSql}
          group by fr.report_source`,
        values,
      ),
      db.query<{ fire_type: string; count: string }>(
        `select fr.fire_type, count(*)::text as count
           from fire_reports fr
           join municipalities m on m.id = fr.municipality_id
           left join barangays b on b.id = fr.barangay_id
         ${whereSql}
          group by fr.fire_type`,
        values,
      ),
      db.query<{ severity: string; count: string }>(
        `select coalesce(fr.calculated_severity, 'UNKNOWN') as severity, count(*)::text as count
           from fire_reports fr
           join municipalities m on m.id = fr.municipality_id
           left join barangays b on b.id = fr.barangay_id
         ${whereSql}
          group by coalesce(fr.calculated_severity, 'UNKNOWN')`,
        values,
      ),
      db.query<{ total: string }>(
        `select count(distinct fr.id)::text as total
           from fire_reports fr
           join municipalities m on m.id = fr.municipality_id
           left join barangays b on b.id = fr.barangay_id
         ${whereSql}`,
        values,
      ),
    ]);

  const totalReports = Number.parseInt(totalRes.rows[0]?.total ?? "0", 10);

  const byStatus: Record<string, number> = {};
  for (const r of countsByStatus.rows) {
    byStatus[r.status] = Number.parseInt(r.count, 10);
  }

  const bySource: Record<string, number> = { ALAB_APP: 0, PHONE_CALL: 0 };
  for (const r of countsBySource.rows) {
    bySource[r.source] = Number.parseInt(r.count, 10);
  }

  const byFireType: Record<string, number> = {};
  for (const r of countsByType.rows) {
    byFireType[r.fire_type] = Number.parseInt(r.count, 10);
  }

  const bySeverity: Record<string, number> = {};
  for (const r of countsBySeverity.rows) {
    bySeverity[r.severity] = Number.parseInt(r.count, 10);
  }

  // Calculate standard high-level buckets
  let confirmedIncidents = 0;
  for (const st of CONFIRMED_STATUSES) {
    confirmedIncidents += byStatus[st] ?? 0;
  }

  let resolvedIncidents = 0;
  for (const st of RESOLVED_STATUSES) {
    resolvedIncidents += byStatus[st] ?? 0;
  }

  let administrativeOutcomes = 0;
  for (const st of ADMINISTRATIVE_STATUSES) {
    administrativeOutcomes += byStatus[st] ?? 0;
  }

  const unresolvedConfirmedIncidents = Math.max(0, confirmedIncidents - resolvedIncidents);
  const pendingIntake = Math.max(0, totalReports - confirmedIncidents - administrativeOutcomes);

  // Timing metrics & sample coverage
  const timingRes = await db.query<{
    avg_response_minutes: string | null;
    avg_arrival_minutes: string | null;
    avg_resolution_minutes: string | null;
    response_count: string;
    arrival_count: string;
    resolution_count: string;
  }>(
    `select avg(extract(epoch from (resp_start.start_time - fr.submitted_at)) / 60.0)::numeric(10, 1)::text as avg_response_minutes,
            avg(extract(epoch from (arrival_data.arrival_time - fr.submitted_at)) / 60.0)::numeric(10, 1)::text as avg_arrival_minutes,
            avg(extract(epoch from (resolution_data.resolved_time - fr.submitted_at)) / 60.0)::numeric(10, 1)::text as avg_resolution_minutes,
            count(resp_start.start_time)::text as response_count,
            count(arrival_data.arrival_time)::text as arrival_count,
            count(resolution_data.resolved_time)::text as resolution_count
       from fire_reports fr
       join municipalities m on m.id = fr.municipality_id
       left join barangays b on b.id = fr.barangay_id
       left join lateral (
         select coalesce(fr.response_started_at, min(coalesce(r.acknowledged_at, r.en_route_at))) as start_time
           from incident_dispatch_recipients r
           join incident_dispatches d on d.id = r.dispatch_id
          where d.fire_report_id = fr.id
         having coalesce(fr.response_started_at, min(coalesce(r.acknowledged_at, r.en_route_at))) >= fr.submitted_at
       ) resp_start on true
       left join lateral (
         select min(arr.arrival_time) as arrival_time from (
           select min(r.on_scene_at) as arrival_time
             from incident_dispatch_recipients r
             join incident_dispatches d on d.id = r.dispatch_id
            where d.fire_report_id = fr.id and r.on_scene_at is not null
           union all
           select min(h.created_at) as arrival_time
             from fire_report_status_history h
            where h.fire_report_id = fr.id and h.next_status = 'RESPONDER_ARRIVED'
         ) arr
         having min(arr.arrival_time) >= fr.submitted_at
       ) arrival_data on true
       left join lateral (
         select max(h.created_at) as resolved_time
           from fire_report_status_history h
          where h.fire_report_id = fr.id
            and fr.status in ('CLOSED', 'RESOLVED')
            and h.next_status in ('CLOSED', 'RESOLVED')
         having max(h.created_at) >= fr.submitted_at
       ) resolution_data on true
     ${whereSql}`,
    values,
  );

  const timingRow = timingRes.rows[0];
  const avgResponse = timingRow?.avg_response_minutes ? Number.parseFloat(timingRow.avg_response_minutes) : null;
  const avgArrival = timingRow?.avg_arrival_minutes ? Number.parseFloat(timingRow.avg_arrival_minutes) : null;
  const avgResolution = timingRow?.avg_resolution_minutes ? Number.parseFloat(timingRow.avg_resolution_minutes) : null;

  // Barangay breakdown for ALL barangays in this municipality
  const barangayValues = [...values];
  const barangayWhereJoin = whereClauses.length > 0 ? `and (${whereClauses.join(" and ")})` : "";

  const barangayRes = await db.query<{
    id: string;
    name: string;
    total: string;
    confirmed: string;
    resolved: string;
    false_report: string;
    avg_arrival_minutes: string | null;
    arrival_count: string;
  }>(
    `select b.id,
            b.name,
            count(fr.id)::text as total,
            count(fr.id) filter (where fr.status in ('CONFIRMED', 'VERIFIED', 'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED', 'CLOSED'))::text as confirmed,
            count(fr.id) filter (where fr.status in ('CLOSED', 'RESOLVED'))::text as resolved,
            count(fr.id) filter (where fr.status in ('FALSE_REPORT', 'DUPLICATE', 'REJECTED'))::text as false_report,
            avg(extract(epoch from (arr_lat.arrival_time - fr.submitted_at)) / 60.0)::numeric(10, 1)::text as avg_arrival_minutes,
            count(arr_lat.arrival_time)::text as arrival_count
       from barangays b
       left join fire_reports fr on fr.barangay_id = b.id ${barangayWhereJoin}
       left join lateral (
         select min(arr.arrival_time) as arrival_time from (
           select min(r.on_scene_at) as arrival_time
             from incident_dispatch_recipients r
             join incident_dispatches d on d.id = r.dispatch_id
            where d.fire_report_id = fr.id and r.on_scene_at is not null
           union all
           select min(h.created_at) as arrival_time
             from fire_report_status_history h
            where h.fire_report_id = fr.id and h.next_status = 'RESPONDER_ARRIVED'
         ) arr
         having min(arr.arrival_time) >= fr.submitted_at
       ) arr_lat on true
      where b.municipality_id = $1
      group by b.id, b.name
      order by b.name asc`,
    barangayValues,
  );

  const byBarangay: MunicipalBarangaySummary[] = barangayRes.rows.map((row) => ({
    barangayId: row.id,
    barangayName: row.name,
    total: Number.parseInt(row.total, 10),
    confirmed: Number.parseInt(row.confirmed, 10),
    resolved: Number.parseInt(row.resolved, 10),
    falseReport: Number.parseInt(row.false_report, 10),
    avgArrivalMinutes: row.avg_arrival_minutes ? Number.parseFloat(row.avg_arrival_minutes) : null,
    arrivalCount: Number.parseInt(row.arrival_count, 10),
  }));

  return {
    totalReports,
    confirmedIncidents,
    resolvedIncidents,
    unresolvedConfirmedIncidents,
    administrativeOutcomes,
    pendingIntake,
    byStatus,
    bySource,
    byFireType,
    bySeverity,
    timingMetrics: {
      avgResponseMinutes: avgResponse !== null && !Number.isNaN(avgResponse) ? avgResponse : null,
      avgArrivalMinutes: avgArrival !== null && !Number.isNaN(avgArrival) ? avgArrival : null,
      avgResolutionMinutes: avgResolution !== null && !Number.isNaN(avgResolution) ? avgResolution : null,
      responseRecordsCount: Number.parseInt(timingRow?.response_count ?? "0", 10),
      arrivalRecordsCount: Number.parseInt(timingRow?.arrival_count ?? "0", 10),
      resolutionRecordsCount: Number.parseInt(timingRow?.resolution_count ?? "0", 10),
    },
    byBarangay,
    dateBoundaries: {
      from: filters.from ?? null,
      to: filters.to ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}
