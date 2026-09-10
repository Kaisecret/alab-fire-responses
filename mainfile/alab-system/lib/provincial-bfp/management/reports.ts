import "server-only";

import { reportWhere } from "./filters";
import { getDatabase } from "../../db";
import { getFireReportPhotoUrl } from "../../supabase/server-storage";
import { assertManagementActor } from "./scope";
import type {
  ManagementActor,
  ManagementPage,
  ProvincialReportDetail,
  ProvincialReportRow,
  ReportFilters,
} from "./types";

export async function listProvincialReports(
  actor: ManagementActor,
  filters: ReportFilters,
): Promise<ManagementPage<ProvincialReportRow>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const { clauses: whereClauses, values } = reportWhere(filters);

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
    severity: string | null;
    status: string;
    latitude: string | number;
    longitude: string | number;
    submittedAt: Date;
    responseStartedAt: Date | null;
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

  const items: ProvincialReportRow[] = rowsResult.rows.map((row) => ({
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
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : new Date().toISOString(),
    responseStartedAt: row.responseStartedAt ? new Date(row.responseStartedAt).toISOString() : null,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null,
    latestDispatchSummary: row.latestDispatchSummary,
  }));

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages,
    updatedAt: new Date().toISOString(),
  };
}

export async function getProvincialReport(
  actor: ManagementActor,
  reportId: string,
): Promise<ProvincialReportDetail | null> {
  assertManagementActor(actor);

  const db = getDatabase();

  const reportRes = await db.query<{
    id: string;
    referenceNumber: string;
    municipalityId: string;
    municipalityName: string;
    barangay: string | null;
    reportSource: "ALAB_APP" | "PHONE_CALL";
    fireType: string;
    severity: string | null;
    status: string;
    latitude: string | number;
    longitude: string | number;
    submittedAt: Date;
    description: string;
    reporterNameSnapshot: string | null;
    reporterPhoneSnapshot: string | null;
    callerName: string | null;
    callerPhone: string | null;
    responseStartedAt: Date | null;
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
            fr.reporter_name_snapshot as "reporterNameSnapshot",
            fr.reporter_phone_snapshot as "reporterPhoneSnapshot",
            fr.caller_name as "callerName",
            fr.caller_phone as "callerPhone",
            coalesce(fr.response_started_at, (
              select min(coalesce(r.acknowledged_at, r.en_route_at))
                from incident_dispatch_recipients r
                join incident_dispatches d on d.id = r.dispatch_id
               where d.fire_report_id = fr.id
            )) as "responseStartedAt",
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
        and m.province = 'Antique'
      limit 1`,
    [reportId],
  );

  if (reportRes.rowCount === 0) return null;
  const rep = reportRes.rows[0];

  const history = await db.query<{ stage: string; timestamp: Date; notes: string | null }>(
    `select next_status as stage, created_at as timestamp, resident_message as notes
       from fire_report_status_history where fire_report_id = $1 order by created_at, id`, [rep.id]);

  // Fetch photos
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

  // Fetch dispatches
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

  const dispatches = await Promise.all(
    dispatchesRes.rows.map(async (d) => {
      const [stationsRes, recipientsRes] = await Promise.all([
        db.query<{ stationId: string; stationName: string }>(
          `select station_id as "stationId", station_name_snapshot as "stationName"
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
        stations: stationsRes.rows,
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
        stationName: stationsRes.rows[0]?.stationName ?? "Assigned Units",
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
    submittedAt: rep.submittedAt ? new Date(rep.submittedAt).toISOString() : new Date().toISOString(),
    responseStartedAt: rep.responseStartedAt ? new Date(rep.responseStartedAt).toISOString() : null,
    resolvedAt: rep.resolvedAt ? new Date(rep.resolvedAt).toISOString() : null,
    latestDispatchSummary: rep.latestDispatchSummary,
    description: rep.description,
    reporterNameSnapshot: rep.reportSource === "PHONE_CALL" ? (rep.callerName ?? "Phone Caller") : (rep.reporterNameSnapshot ?? "Resident"),
    reporterPhoneSnapshot: rep.reportSource === "PHONE_CALL" ? (rep.callerPhone ?? "N/A") : (rep.reporterPhoneSnapshot ?? "N/A"),
    photos,
    dispatches,
    timeline: history.rows.map(row => ({ stage: row.stage, timestamp: new Date(row.timestamp).toISOString(), notes: row.notes, actor: null })),
  };
}
