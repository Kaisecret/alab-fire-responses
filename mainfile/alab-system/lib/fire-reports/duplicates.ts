import type { PoolClient } from "pg";

import { getDatabase } from "../db.ts";
import {
  CLOSED_INCIDENT_STATUSES,
  DUPLICATE_RADIUS_METERS,
  DUPLICATE_WINDOW_HOURS,
  incidentStage,
  searchBox,
} from "./duplicate-rules.mjs";
import { MAX_FIRE_TYPES } from "./fire-type-situation.ts";
import { rescoreStoredReport, STORED_DANGER_COLUMNS, storedFireTypes, type StoredDangerRow } from "./stored-danger.ts";
import type { FireReportStatus, FireType } from "./types";

export type OpenIncident = {
  id: string; referenceNumber: string; status: FireReportStatus; residentProfileId: string | null; fireTypes: string[];
};

/**
 * The earliest open, unlinked report within 50 m that shares at least one
 * fire type, submitted in the last 12 hours. A house fire reported again as
 * "house + grass" is the same fire. Callers hold a lock so two simultaneous
 * reports cannot both miss each other.
 */
export async function findOpenIncidentNear(client: Pick<PoolClient, "query">, latitude: number, longitude: number, fireTypes: FireType[]): Promise<OpenIncident | null> {
  if (fireTypes.length === 0) return null;
  const { latitudeDelta, longitudeDelta } = searchBox(latitude);
  const result = await client.query<OpenIncident>(
    `select fr.id, fr.reference_number as "referenceNumber", fr.status, fr.resident_profile_id as "residentProfileId",
            coalesce(fr.fire_types, array[fr.fire_type]) as "fireTypes"
       from fire_reports fr
      where fr.duplicate_of_report_id is null
        and coalesce(fr.fire_types, array[fr.fire_type]) && $8::text[]
        and fr.status <> all($5::text[])
        and fr.submitted_at > now() - make_interval(hours => $6::int)
        and fr.latitude between $1::float8 - $3::float8 and $1::float8 + $3::float8
        and fr.longitude between $2::float8 - $4::float8 and $2::float8 + $4::float8
        and 6371000 * 2 * asin(sqrt(
              power(sin(radians(fr.latitude::float8 - $1::float8) / 2), 2)
              + cos(radians($1::float8)) * cos(radians(fr.latitude::float8))
              * power(sin(radians(fr.longitude::float8 - $2::float8) / 2), 2)
            )) <= $7::float8
      order by fr.submitted_at asc
      limit 1`,
    [latitude, longitude, latitudeDelta, longitudeDelta, CLOSED_INCIDENT_STATUSES, DUPLICATE_WINDOW_HOURS, DUPLICATE_RADIUS_METERS, fireTypes],
  );
  return result.rows[0] ?? null;
}

/**
 * Adds the fire types a linked report saw that the incident does not list yet,
 * up to the 3-type limit, and scores the incident's Level of Danger again
 * from its own saved details. The linked report adds no alarm, so this is how
 * BFP learns the grass around the house is burning too.
 */
export async function addFireTypesToIncident(client: Pick<PoolClient, "query">, incidentId: string, fireTypes: readonly string[]) {
  const listed = await client.query<{ fireTypes: string[] }>(
    `select coalesce(fr.fire_types, array[fr.fire_type]) as "fireTypes" from fire_reports fr where fr.id = $1`,
    [incidentId],
  );
  const known = listed.rows[0]?.fireTypes;
  if (!known || fireTypes.every((type) => known.includes(type))) return;

  const current = await client.query<StoredDangerRow>(
    `select ${STORED_DANGER_COLUMNS} from fire_reports fr where fr.id = $1 for update`,
    [incidentId],
  );
  const row = current.rows[0];
  if (!row) return;
  const existing = storedFireTypes(row);
  const added = fireTypes.filter((type) => !existing.includes(type));
  const merged = [...existing, ...added].slice(0, MAX_FIRE_TYPES);
  if (merged.length === existing.length) return;

  const { primaryFireType, densityContext, assessment } = await rescoreStoredReport(client, row, {
    structureMaterial: row.structure_material,
    houseDensity: row.reported_house_density ?? row.house_density,
    routeAccessibility: row.route_accessibility,
    fireTypes: merged,
  });
  await client.query(
    `update fire_reports
        set fire_types = $2::text[],
            fire_type = $3,
            calculated_severity = $4,
            severity_score = $5,
            severity_factors = $6,
            house_density = $7,
            updated_at = now()
      where id = $1`,
    [
      incidentId, merged, primaryFireType, assessment.level, assessment.score, JSON.stringify(assessment.factors),
      densityContext.effectiveHouseDensity,
    ],
  );
}

export type OwnOpenReport = { id: string; referenceNumber: string; incidentId: string; incidentFireTypes: string[] };

/**
 * The resident's own latest report within 50 m that shares a fire type and
 * whose fire is still open, so reporting the same place again opens that
 * report instead of a new one. A report linked to another resident's follows
 * that incident's status; incidentId is the report BFP works from.
 */
export async function findOwnOpenReportNear(
  client: Pick<PoolClient, "query">,
  userId: string,
  latitude: number,
  longitude: number,
  fireTypes: FireType[],
): Promise<OwnOpenReport | null> {
  if (fireTypes.length === 0) return null;
  const { latitudeDelta, longitudeDelta } = searchBox(latitude);
  const result = await client.query<OwnOpenReport>(
    `select fr.id, fr.reference_number as "referenceNumber", coalesce(root.id, fr.id) as "incidentId",
            case when root.id is null then coalesce(fr.fire_types, array[fr.fire_type])
                 else coalesce(root.fire_types, array[root.fire_type]) end as "incidentFireTypes"
       from fire_reports fr
       join resident_profiles rp on rp.id = fr.resident_profile_id
       left join fire_reports root on root.id = fr.duplicate_of_report_id
      where rp.user_id = $8
        and coalesce(fr.fire_types, array[fr.fire_type]) && $9::text[]
        and coalesce(root.status, fr.status) <> all($5::text[])
        and fr.submitted_at > now() - make_interval(hours => $6::int)
        and fr.latitude between $1::float8 - $3::float8 and $1::float8 + $3::float8
        and fr.longitude between $2::float8 - $4::float8 and $2::float8 + $4::float8
        and 6371000 * 2 * asin(sqrt(
              power(sin(radians(fr.latitude::float8 - $1::float8) / 2), 2)
              + cos(radians($1::float8)) * cos(radians(fr.latitude::float8))
              * power(sin(radians(fr.longitude::float8 - $2::float8) / 2), 2)
            )) <= $7::float8
      order by fr.submitted_at desc
      limit 1`,
    [latitude, longitude, latitudeDelta, longitudeDelta, CLOSED_INCIDENT_STATUSES, DUPLICATE_WINDOW_HOURS, DUPLICATE_RADIUS_METERS, userId, fireTypes],
  );
  return result.rows[0] ?? null;
}

/** Opens the resident's own open report here, adding any newly seen fire type to its incident. */
export async function joinOwnOpenReport(
  client: Pick<PoolClient, "query">,
  userId: string,
  latitude: number,
  longitude: number,
  fireTypes: FireType[],
): Promise<OwnOpenReport | null> {
  const report = await findOwnOpenReportNear(client, userId, latitude, longitude, fireTypes);
  if (report) await addFireTypesToIncident(client, report.incidentId, fireTypes);
  return report;
}

export type SharedIncidentReport = {
  id: string;
  referenceNumber: string;
  submittedAt: string;
  isPrimary: boolean;
  isViewer: boolean;
  photoKeys: string[];
};

export type SharedIncident = {
  primaryId: string;
  primaryReference: string;
  status: FireReportStatus;
  stage: ReturnType<typeof incidentStage>;
  stationName: string | null;
  acknowledgedAt: string | null;
  respondingAt: string | null;
  reporterCount: number;
  viewerIsPrimary: boolean;
  reports: SharedIncidentReport[];
  history: Array<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>;
};

const ACKNOWLEDGED_STATUSES = ["VERIFIED", "CONFIRMED", "RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED", "UNDER_CONTROL", "RESOLVED"];
const RESPONDING_STATUSES = ["RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED", "UNDER_CONTROL", "RESOLVED"];

/**
 * Everything one fire's reporters share: the first report's BFP status and
 * the other reports' photos. Null when the report stands alone.
 */
export async function getSharedIncident(reportId: string, primaryId: string | null): Promise<SharedIncident | null> {
  const database = getDatabase();
  const rootId = primaryId ?? reportId;
  const group = await database.query<{
    id: string; reference_number: string; submitted_at: string; status: FireReportStatus;
    duplicate_of_report_id: string | null; responding_station_name: string | null;
  }>(
    `select id, reference_number, submitted_at, status, duplicate_of_report_id, responding_station_name
       from fire_reports
      where id = $1 or duplicate_of_report_id = $1
      order by submitted_at asc`,
    [rootId],
  );
  if (group.rows.length < 2) return null;
  const primary = group.rows.find((row) => row.id === rootId);
  if (!primary) return null;

  const ids = group.rows.map((row) => row.id);
  const [photos, history] = await Promise.all([
    database.query<{ fire_report_id: string; storage_key: string }>(
      "select fire_report_id, storage_key from fire_report_photos where fire_report_id = any($1::uuid[]) order by uploaded_at asc",
      [ids],
    ),
    database.query<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>(
      "select next_status, resident_message, created_at from fire_report_status_history where fire_report_id = $1 order by created_at asc",
      [rootId],
    ),
  ]);
  const firstTime = (statuses: string[]) => history.rows.find((entry) => statuses.includes(entry.next_status))?.created_at ?? null;

  return {
    primaryId: rootId,
    primaryReference: primary.reference_number,
    status: primary.status,
    stage: incidentStage(primary.status),
    stationName: primary.responding_station_name,
    acknowledgedAt: firstTime(ACKNOWLEDGED_STATUSES),
    respondingAt: firstTime(RESPONDING_STATUSES),
    reporterCount: group.rows.length,
    viewerIsPrimary: reportId === rootId,
    reports: group.rows.map((row) => ({
      id: row.id,
      referenceNumber: row.reference_number,
      submittedAt: row.submitted_at,
      isPrimary: row.id === rootId,
      isViewer: row.id === reportId,
      photoKeys: photos.rows.filter((photo) => photo.fire_report_id === row.id).map((photo) => photo.storage_key),
    })),
    history: history.rows,
  };
}
