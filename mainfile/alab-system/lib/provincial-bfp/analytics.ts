import type { Pool, PoolClient } from "pg";

import { getDatabase } from "../db.ts";
import {
  analyticsPeriod,
  fillTrend,
  median,
  rateChange,
  summarizeDangerConditions,
  summarizeResponseTimes,
} from "./analytics-rules.mjs";

type Queryable = Pick<Pool | PoolClient, "query">;
export type AnalyticsRange = "today" | "7d" | "30d" | "ytd";
export type AnalyticsFilters = { range: AnalyticsRange; municipalityId: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES = ["VERIFIED", "CONFIRMED", "RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED", "UNDER_CONTROL"];
const DANGER_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;

export function parseAnalyticsFilters(params: URLSearchParams): AnalyticsFilters {
  const range = (params.get("range") || "30d") as AnalyticsRange;
  if (!["today", "7d", "30d", "ytd"].includes(range)) throw new Error("INVALID_ANALYTICS_RANGE");
  const municipalityId = params.get("municipalityId") || null;
  if (municipalityId && !UUID.test(municipalityId)) throw new Error("INVALID_MUNICIPALITY");
  return { range, municipalityId };
}

// Reports in the window. A unique report is not linked to another one; an
// incident is a unique report that was not marked false or rejected.
const REPORTS = `
  select fr.*, m.name as municipality_name
    from fire_reports fr
    join municipalities m on m.id = fr.municipality_id
   where m.province = 'Antique'
     and fr.submitted_at >= $1 and fr.submitted_at < $2
     and ($3::uuid is null or fr.municipality_id = $3::uuid)`;
const UNIQUE = `duplicate_of_report_id is null and status <> 'DUPLICATE'`;
const INCIDENT = `${UNIQUE} and status not in ('FALSE_REPORT', 'REJECTED')`;
const HIGH = `calculated_severity in ('HIGH', 'CRITICAL')`;

type Window = [Date, Date, string | null];

async function windowSummary(db: Queryable, window: Window) {
  const { rows } = await db.query<{
    incidents: number; high_danger: number; unique_reports: number; false_reports: number; duplicates: number; pending: number;
  }>(
    `with reports as (${REPORTS})
     select count(*) filter (where ${INCIDENT})::int as incidents,
            count(*) filter (where ${INCIDENT} and ${HIGH})::int as high_danger,
            count(*) filter (where ${UNIQUE})::int as unique_reports,
            count(*) filter (where ${UNIQUE} and status in ('FALSE_REPORT', 'REJECTED'))::int as false_reports,
            count(*) filter (where not (${UNIQUE}))::int as duplicates,
            count(*) filter (where ${UNIQUE} and status in ('SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_VERIFICATION', 'NEEDS_MORE_INFO'))::int as pending
       from reports`,
    window,
  );
  return rows[0];
}

type TimelineRow = {
  municipalityId: string; submittedAt: string; verifiedAt: string | null; dispatchedAt: string | null;
  arrivedAt: string | null; controlledAt: string | null; resolvedAt: string | null;
};

/** The first time each incident reached each Incident Timeline status. */
async function timelines(db: Queryable, window: Window) {
  const { rows } = await db.query<TimelineRow>(
    `with incidents as (select * from (${REPORTS}) reports where ${INCIDENT})
     select i.municipality_id as "municipalityId", i.submitted_at as "submittedAt",
            min(h.created_at) filter (where h.next_status in ('VERIFIED', 'CONFIRMED', 'RESPONDING', 'FIRETRUCK_DISPATCHED')) as "verifiedAt",
            min(h.created_at) filter (where h.next_status in ('RESPONDING', 'FIRETRUCK_DISPATCHED')) as "dispatchedAt",
            min(h.created_at) filter (where h.next_status = 'RESPONDER_ARRIVED') as "arrivedAt",
            min(h.created_at) filter (where h.next_status = 'UNDER_CONTROL') as "controlledAt",
            min(h.created_at) filter (where h.next_status in ('RESOLVED', 'CLOSED')) as "resolvedAt"
       from incidents i
       left join fire_report_status_history h on h.fire_report_id = i.id
      group by i.id, i.municipality_id, i.submitted_at`,
    window,
  );
  return rows;
}

const TREND_FORMAT = { hour: `YYYY-MM-DD"T"HH24`, day: "YYYY-MM-DD", month: "YYYY-MM" } as const;

export async function getProvincialAnalytics(filters: AnalyticsFilters, now = new Date(), db: Queryable = getDatabase()) {
  const period = analyticsPeriod(filters.range, now);
  const current: Window = [period.from, period.to, filters.municipalityId];
  const previous: Window = [period.previousFrom, period.previousTo, filters.municipalityId];
  const incidents = `with incidents as (select * from (${REPORTS}) reports where ${INCIDENT})`;

  const [
    summary, previousSummary, timelineRows, previousTimelines, trend, heat, municipalities, active,
    backupsAsked, barangays, danger, highFactors, fireTypes, reporting, assistance, backupCalls, alarms, allMunicipalities,
  ] = await Promise.all([
    windowSummary(db, current),
    windowSummary(db, previous),
    timelines(db, current),
    timelines(db, previous),
    db.query<{ bucket: string; incidents: number; highDanger: number }>(
      `${incidents}
       select to_char(submitted_at at time zone 'Asia/Manila', $4) as bucket,
              count(*)::int as incidents, count(*) filter (where ${HIGH})::int as "highDanger"
         from incidents group by 1`,
      [...current, TREND_FORMAT[period.bucket as keyof typeof TREND_FORMAT]],
    ),
    db.query<{ day: number; hour: number; incidents: number }>(
      `${incidents}
       select extract(isodow from submitted_at at time zone 'Asia/Manila')::int as day,
              extract(hour from submitted_at at time zone 'Asia/Manila')::int as hour,
              count(*)::int as incidents
         from incidents group by 1, 2`,
      current,
    ),
    db.query<{ id: string; name: string; incidents: number; highDanger: number }>(
      `${incidents}
       select m.id, m.name, count(i.id)::int as incidents, count(i.id) filter (where i.${HIGH})::int as "highDanger"
         from municipalities m
         left join incidents i on i.municipality_id = m.id
        where m.province = 'Antique' and ($3::uuid is null or m.id = $3::uuid)
        group by m.id, m.name`,
      current,
    ),
    db.query<{ municipalityId: string; active: number }>(
      `select fr.municipality_id as "municipalityId", count(*)::int as active
         from fire_reports fr
        where fr.status = any($1::text[]) and fr.duplicate_of_report_id is null
          and ($2::uuid is null or fr.municipality_id = $2::uuid)
        group by 1`,
      [ACTIVE_STATUSES, filters.municipalityId],
    ),
    db.query<{ municipalityId: string; asked: number }>(
      `select municipality_id as "municipalityId", count(*)::int as asked from (
         select fr.municipality_id from intermunicipal_assistance_requests r
           join fire_reports fr on fr.id = r.fire_report_id
          where r.requested_at >= $1 and r.requested_at < $2 and ($3::uuid is null or fr.municipality_id = $3::uuid)
         union all
         select b.municipality_id from incident_backup_requests b
          where b.created_at >= $1 and b.created_at < $2 and ($3::uuid is null or b.municipality_id = $3::uuid)
       ) asked group by 1`,
      current,
    ),
    db.query<{ barangay: string; municipality: string; incidents: number }>(
      `${incidents}
       select b.name as barangay, i.municipality_name as municipality, count(*)::int as incidents
         from incidents i join barangays b on b.id = i.barangay_id
        group by b.name, i.municipality_name
        order by incidents desc, b.name asc limit 7`,
      current,
    ),
    db.query<{ level: string; incidents: number }>(
      `${incidents}
       select calculated_severity as level, count(*)::int as incidents from incidents
        where calculated_severity is not null group by 1`,
      current,
    ),
    db.query<{ factors: unknown }>(
      `${incidents} select severity_factors as factors from incidents where ${HIGH}`,
      current,
    ),
    db.query<{ fireTypes: string[] }>(
      `${incidents} select coalesce(fire_types, array[fire_type]) as "fireTypes" from incidents`,
      current,
    ),
    db.query<{ app: number; phone: number; withPhotos: number; appReports: number; preciseGps: number; gpsKnown: number }>(
      `${incidents}
       select count(*) filter (where report_source = 'ALAB_APP')::int as app,
              count(*) filter (where report_source = 'PHONE_CALL')::int as phone,
              count(*) filter (where report_source = 'ALAB_APP'
                and exists (select 1 from fire_report_photos p where p.fire_report_id = incidents.id))::int as "withPhotos",
              count(*) filter (where report_source = 'ALAB_APP')::int as "appReports",
              count(*) filter (where report_source = 'ALAB_APP' and location_accuracy_meters <= 50)::int as "preciseGps",
              count(*) filter (where report_source = 'ALAB_APP' and location_accuracy_meters is not null)::int as "gpsKnown"
         from incidents`,
      current,
    ),
    db.query<{ status: string; requestedAt: string; respondedAt: string | null; helper: string }>(
      `select r.status, r.requested_at as "requestedAt", r.responded_at as "respondedAt", m.name as helper
         from intermunicipal_assistance_requests r
         join fire_reports fr on fr.id = r.fire_report_id
         join municipalities m on m.id = r.recipient_municipality_id
        where r.requested_at >= $1 and r.requested_at < $2 and ($3::uuid is null or fr.municipality_id = $3::uuid)`,
      current,
    ),
    db.query<{ calls: number; forwarded: number }>(
      `select count(*)::int as calls, count(*) filter (where forwarded_at is not null)::int as forwarded
         from incident_backup_requests b
        where b.created_at >= $1 and b.created_at < $2 and ($3::uuid is null or b.municipality_id = $3::uuid)`,
      current,
    ),
    db.query<{ level: number; declared: number }>(
      `select a.alarm_level as level, count(*)::int as declared
         from incident_alarm_levels a join fire_reports fr on fr.id = a.fire_report_id
        where a.alarm_level >= 2 and a.declared_at >= $1 and a.declared_at < $2
          and ($3::uuid is null or fr.municipality_id = $3::uuid)
        group by 1`,
      current,
    ),
    db.query<{ id: string; name: string }>("select id, name from municipalities where province = 'Antique' order by name"),
  ]);

  const response = summarizeResponseTimes(timelineRows);
  const previousResponse = summarizeResponseTimes(previousTimelines);
  const share = (part: number, whole: number) => (whole ? part / whole : null);
  const highShare = share(summary.high_danger, summary.incidents);
  const falseShare = share(summary.false_reports, summary.unique_reports);

  const activeBy = new Map(active.rows.map((row) => [row.municipalityId, row.active]));
  const askedBy = new Map(backupsAsked.rows.map((row) => [row.municipalityId, row.asked]));
  const timelinesBy = new Map<string, TimelineRow[]>();
  for (const row of timelineRows) timelinesBy.set(row.municipalityId, [...(timelinesBy.get(row.municipalityId) ?? []), row]);
  const municipalityRows = municipalities.rows
    .map((row) => {
      const times = summarizeResponseTimes(timelinesBy.get(row.id) ?? []);
      return {
        id: row.id,
        name: row.name,
        incidents: row.incidents,
        highDangerShare: share(row.highDanger, row.incidents),
        medianArrivalMinutes: times.arrival.medianMinutes,
        stageMinutes: times.stages.slice(0, 3).map((stage) => stage.medianMinutes),
        activeNow: activeBy.get(row.id) ?? 0,
        assistanceAsked: askedBy.get(row.id) ?? 0,
      };
    })
    .filter((row) => row.incidents > 0 || row.activeNow > 0 || row.assistanceAsked > 0)
    .sort((a, b) => b.incidents - a.incidents || a.name.localeCompare(b.name));

  const typeCounts = new Map<string, number>();
  const combos = new Map<string, number>();
  for (const { fireTypes: types } of fireTypes.rows) {
    for (const type of types) typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    if (types.length > 1) {
      const combo = [...types].sort().join("+");
      combos.set(combo, (combos.get(combo) ?? 0) + 1);
    }
  }
  const topCombo = [...combos.entries()].sort((a, b) => b[1] - a[1])[0];

  const responded = assistance.rows.filter((row) => row.respondedAt);
  const helped = new Map<string, number>();
  for (const row of assistance.rows) {
    if (["ACCEPTED", "PARTIALLY_ACCEPTED", "COMPLETED"].includes(row.status)) helped.set(row.helper, (helped.get(row.helper) ?? 0) + 1);
  }
  const reportsPerIncident = summary.unique_reports
    ? (summary.unique_reports + summary.duplicates) / summary.unique_reports
    : null;

  return {
    range: period.range,
    municipalityId: filters.municipalityId,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    generatedAt: now.toISOString(),
    allMunicipalities: allMunicipalities.rows,
    headline: {
      incidents: summary.incidents,
      previousIncidents: previousSummary.incidents,
      pendingVerification: summary.pending,
      activeNow: active.rows.reduce((total, row) => total + row.active, 0),
      medianArrivalMinutes: response.arrival.medianMinutes,
      previousMedianArrivalMinutes: previousResponse.arrival.medianMinutes,
      slowestTenthArrivalMinutes: response.arrival.slowestTenthMinutes,
      arrivalsMeasured: response.arrival.incidents,
      highDangerShare: highShare,
      highDangerIncidents: summary.high_danger,
      highDangerChangePoints: rateChange(highShare, share(previousSummary.high_danger, previousSummary.incidents)),
      falseReportShare: falseShare,
      falseReports: summary.false_reports,
      uniqueReports: summary.unique_reports,
      falseReportChangePoints: rateChange(falseShare, share(previousSummary.false_reports, previousSummary.unique_reports)),
      duplicatesMerged: summary.duplicates,
    },
    responseStages: response.stages,
    trend: fillTrend(trend.rows, period),
    bucket: period.bucket,
    heatmap: heat.rows,
    municipalities: municipalityRows,
    barangays: barangays.rows,
    danger: {
      levels: DANGER_LEVELS.map((level) => ({ level, incidents: danger.rows.find((row) => row.level === level)?.incidents ?? 0 })),
      conditions: summarizeDangerConditions(highFactors.rows.map((row) => row.factors)),
      highDangerIncidents: highFactors.rows.length,
    },
    fireTypes: {
      counts: [...typeCounts.entries()].map(([type, incidents]) => ({ type, incidents })).sort((a, b) => b.incidents - a.incidents),
      multiType: [...combos.values()].reduce((total, count) => total + count, 0),
      topCombination: topCombo ? { types: topCombo[0].split("+"), incidents: topCombo[1] } : null,
    },
    reporting: {
      app: reporting.rows[0].app,
      phone: reporting.rows[0].phone,
      reportsPerIncident: reportsPerIncident == null ? null : Math.round(reportsPerIncident * 10) / 10,
      photoShare: share(reporting.rows[0].withPhotos, reporting.rows[0].appReports),
      preciseGpsShare: share(reporting.rows[0].preciseGps, reporting.rows[0].gpsKnown),
      medianVerifyMinutes: response.stages[0].medianMinutes,
    },
    coordination: {
      assistanceRequests: assistance.rows.length,
      accepted: assistance.rows.filter((row) => ["ACCEPTED", "COMPLETED"].includes(row.status)).length,
      partiallyAccepted: assistance.rows.filter((row) => row.status === "PARTIALLY_ACCEPTED").length,
      rejected: assistance.rows.filter((row) => row.status === "REJECTED").length,
      medianResponseMinutes: (() => {
        const minutes = responded.map((row) => (new Date(row.respondedAt!).getTime() - new Date(row.requestedAt).getTime()) / 60000);
        const value = median(minutes.filter((minute) => minute >= 0));
        return value == null ? null : Math.round(value * 10) / 10;
      })(),
      backupCalls: backupCalls.rows[0].calls,
      backupCallsForwarded: backupCalls.rows[0].forwarded,
      alarms: [2, 3, 4].map((level) => ({ level, declared: alarms.rows.find((row) => row.level === level)?.declared ?? 0 })),
      topHelpers: [...helped.entries()].map(([name, responses]) => ({ name, responses }))
        .sort((a, b) => b.responses - a.responses || a.name.localeCompare(b.name)).slice(0, 3),
    },
  };
}

export type ProvincialAnalytics = Awaited<ReturnType<typeof getProvincialAnalytics>>;
