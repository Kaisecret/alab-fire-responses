import "server-only";

import { reportWhere } from "./filters";
import { getDatabase } from "../../db";
import { assertManagementActor } from "./scope";
import type {
  ManagementActor,
  ProvincialReportSummary,
  ReportFilters,
} from "./types";

export async function getProvincialReportSummary(
  actor: ManagementActor,
  filters: ReportFilters,
): Promise<ProvincialReportSummary> {
  assertManagementActor(actor);

  const db = getDatabase();

  const { clauses: whereClauses, values } = reportWhere(filters);

  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  // 1. Overall counts by status, source, and fire type
  const [countsByStatus, countsBySource, countsByType, totalRes] = await Promise.all([
    db.query<{ status: string; count: string }>(
      `select fr.status, count(*)::text as count
         from fire_reports fr
         join municipalities m on m.id = fr.municipality_id
       ${whereSql}
        group by fr.status`,
      values,
    ),
    db.query<{ source: string; count: string }>(
      `select fr.report_source as source, count(*)::text as count
         from fire_reports fr
         join municipalities m on m.id = fr.municipality_id
       ${whereSql}
        group by fr.report_source`,
      values,
    ),
    db.query<{ fire_type: string; count: string }>(
      `select fr.fire_type, count(*)::text as count
         from fire_reports fr
         join municipalities m on m.id = fr.municipality_id
       ${whereSql}
        group by fr.fire_type`,
      values,
    ),
    db.query<{ total: string }>(
      `select count(distinct fr.id)::text as total
         from fire_reports fr
         join municipalities m on m.id = fr.municipality_id
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

  // 2. Municipal breakdown across all Antique municipalities
  // Note: ensure every Antique municipality is included, even with 0 reports!
  const muniValues = [...values];
  const muniWhereJoin = `and (${whereClauses.join(" and ")})`;
  let muniFilterClause = "";
  if (filters.municipalityId) {
    muniValues.push(filters.municipalityId);
    muniFilterClause = `and m.id = $${muniValues.length}`;
  }

  const muniRes = await db.query<{
    id: string;
    name: string;
    total: string;
    confirmed: string;
    false_report: string;
    resolved: string;
  }>(
    `select m.id,
            m.name,
            count(fr.id)::text as total,
            count(fr.id) filter (where fr.status in ('CONFIRMED', 'VERIFIED', 'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED', 'CLOSED'))::text as confirmed,
            count(fr.id) filter (where fr.status in ('FALSE_REPORT', 'DUPLICATE', 'REJECTED'))::text as false_report,
            count(fr.id) filter (where fr.status in ('CLOSED', 'RESOLVED'))::text as resolved
       from municipalities m
       left join fire_reports fr on fr.municipality_id = m.id ${muniWhereJoin}
      where m.province = 'Antique' ${muniFilterClause}
      group by m.id, m.name
      order by m.name asc`,
    muniValues,
  );

  const byMunicipality = muniRes.rows.map((row) => ({
    municipalityId: row.id,
    municipalityName: row.name,
    total: Number.parseInt(row.total, 10),
    confirmed: Number.parseInt(row.confirmed, 10),
    falseReport: Number.parseInt(row.false_report, 10),
    resolved: Number.parseInt(row.resolved, 10),
  }));

  // 3. Timing metrics: response time & resolution time
  const timingRes = await db.query<{
    avg_response_minutes: string | null;
    avg_resolution_minutes: string | null;
  }>(
    `select avg(extract(epoch from (coalesce(fr.response_started_at, resp_start.first_ack) - fr.submitted_at)) / 60.0)::numeric(10, 1)::text as avg_response_minutes,
            avg(extract(epoch from (case when fr.status in ('CLOSED', 'RESOLVED') then resp_end.completed_at end - fr.submitted_at)) / 60.0)::numeric(10, 1)::text as avg_resolution_minutes
       from fire_reports fr
       join municipalities m on m.id = fr.municipality_id
       left join lateral (
         select min(coalesce(r.acknowledged_at, r.en_route_at)) as first_ack
           from incident_dispatch_recipients r
           join incident_dispatches d on d.id = r.dispatch_id
          where d.fire_report_id = fr.id
       ) resp_start on true
       left join lateral (
         select max(h.created_at) as completed_at
           from fire_report_status_history h
          where h.fire_report_id = fr.id and h.next_status in ('CLOSED', 'RESOLVED')
       ) resp_end on true
     ${whereSql}
       and (coalesce(fr.response_started_at, resp_start.first_ack) is not null or fr.status in ('CLOSED', 'RESOLVED'))`,
    values,
  );

  const avgResp = timingRes.rows[0]?.avg_response_minutes
    ? Number.parseFloat(timingRes.rows[0].avg_response_minutes)
    : null;
  const avgRes = timingRes.rows[0]?.avg_resolution_minutes
    ? Number.parseFloat(timingRes.rows[0].avg_resolution_minutes)
    : null;

  return {
    totalReports,
    byStatus,
    bySource,
    byFireType,
    byMunicipality,
    timingMetrics: {
      avgResponseMinutes: avgResp !== null && !Number.isNaN(avgResp) ? avgResp : null,
      avgResolutionMinutes: avgRes !== null && !Number.isNaN(avgRes) ? avgRes : null,
    },
    dateBoundaries: {
      from: filters.from ?? null,
      to: filters.to ?? null,
    },
  };
}
