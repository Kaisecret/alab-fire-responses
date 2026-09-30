import type { PoolClient } from "pg";

import { getDatabase } from "../db.ts";
import {
  CLOSED_INCIDENT_STATUSES,
  DUPLICATE_RADIUS_METERS,
  DUPLICATE_WINDOW_HOURS,
  incidentStage,
  searchBox,
} from "./duplicate-rules.mjs";
import type { FireReportStatus } from "./types";

export type OpenIncident = { id: string; referenceNumber: string; status: FireReportStatus; residentProfileId: string | null };

/**
 * The earliest open, unlinked report within 50 m submitted in the last
 * 12 hours. Callers hold a lock so two simultaneous reports cannot both miss
 * each other.
 */
export async function findOpenIncidentNear(client: PoolClient, latitude: number, longitude: number): Promise<OpenIncident | null> {
  const { latitudeDelta, longitudeDelta } = searchBox(latitude);
  const result = await client.query<OpenIncident>(
    `select fr.id, fr.reference_number as "referenceNumber", fr.status, fr.resident_profile_id as "residentProfileId"
       from fire_reports fr
      where fr.duplicate_of_report_id is null
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
    [latitude, longitude, latitudeDelta, longitudeDelta, CLOSED_INCIDENT_STATUSES, DUPLICATE_WINDOW_HOURS, DUPLICATE_RADIUS_METERS],
  );
  return result.rows[0] ?? null;
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
