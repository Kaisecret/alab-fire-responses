import type { PoolClient } from "pg";

import { CLOSED_INCIDENT_STATUSES, DUPLICATE_RADIUS_METERS, searchBox } from "./duplicate-rules.mjs";
import { addFireTypesToIncident } from "./duplicates.ts";
import type { FireReportStatus, FireType } from "./types";

export const SAME_DEVICE_WINDOW_SECONDS = 300;
export const SAME_DEVICE_DUPLICATE_MESSAGE =
  "This phone already sent the same fire report using another account. No new report was sent to BFP. You can follow the existing incident's status from this account.";

type QueryClient = Pick<PoolClient, "query">;
type DeviceIncident = { id: string; referenceNumber: string; status: FireReportStatus };

export async function findSameDeviceIncident(
  client: QueryClient, userId: string, deviceId: string,
  latitude: number, longitude: number, fireTypes: FireType[],
): Promise<DeviceIncident | null> {
  if (fireTypes.length === 0) return null;
  const { latitudeDelta, longitudeDelta } = searchBox(latitude);
  const result = await client.query<DeviceIncident>(
    `select coalesce(root.id, fr.id) as id,
            coalesce(root.reference_number, fr.reference_number) as "referenceNumber",
            coalesce(root.status, fr.status) as status
       from resident_fire_report_follows follow
       join resident_profiles rp on rp.id = follow.resident_profile_id
       join fire_reports fr on fr.id = follow.fire_report_id
       left join fire_reports root on root.id = fr.duplicate_of_report_id
      where follow.reporting_device_id = $8::uuid and rp.user_id <> $9::uuid
        and rp.id = fr.resident_profile_id
        and follow.created_at > now() - make_interval(secs => $10::int)
        and coalesce(root.status, fr.status) <> all($5::text[])
        and coalesce(fr.fire_types, array[fr.fire_type]) && $6::text[]
        and fr.latitude between $1::float8 - $3::float8 and $1::float8 + $3::float8
        and fr.longitude between $2::float8 - $4::float8 and $2::float8 + $4::float8
        and 6371000 * 2 * asin(sqrt(
              power(sin(radians(fr.latitude::float8 - $1::float8) / 2), 2)
              + cos(radians($1::float8)) * cos(radians(fr.latitude::float8))
              * power(sin(radians(fr.longitude::float8 - $2::float8) / 2), 2)
            )) <= $7::float8
      order by follow.created_at asc limit 1`,
    [latitude, longitude, latitudeDelta, longitudeDelta, CLOSED_INCIDENT_STATUSES,
      fireTypes, DUPLICATE_RADIUS_METERS, deviceId, userId, SAME_DEVICE_WINDOW_SECONDS],
  );
  return result.rows[0] ?? null;
}

export async function recordResidentIncidentFollow(client: QueryClient, userId: string, reportId: string, deviceId: string) {
  await client.query(
    `insert into resident_fire_report_follows (fire_report_id, resident_profile_id, reporting_device_id)
     select $1::uuid, rp.id, $3::uuid from resident_profiles rp where rp.user_id = $2::uuid
     on conflict (fire_report_id, resident_profile_id) do nothing`,
    [reportId, userId, deviceId],
  );
}

/**
 * Grants read-only status access; no fire report, photos, or BFP alarm are
 * created. A fire type the incident does not list yet is added to it.
 */
export async function followSameDeviceIncident(
  client: QueryClient, userId: string, deviceId: string | null | undefined,
  latitude: number, longitude: number, fireTypes: FireType[],
) {
  if (!deviceId) return null;
  const incident = await findSameDeviceIncident(client, userId, deviceId, latitude, longitude, fireTypes);
  if (!incident) return null;
  await recordResidentIncidentFollow(client, userId, incident.id, deviceId);
  await addFireTypesToIncident(client, incident.id, fireTypes);
  return { ...incident, sameDeviceDuplicate: true as const, existing: true as const };
}
