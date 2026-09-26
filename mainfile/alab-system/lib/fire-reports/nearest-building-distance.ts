import type { PoolClient } from "pg";

/** Distance to the nearest mapped building footprint within 1 km, or null if unavailable. */
export async function findNearestBuildingDistance(
  client: Pick<PoolClient, "query">,
  latitude: number,
  longitude: number,
): Promise<number | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  try {
    const result = await client.query<{ distanceMeters: string | number }>(`
      WITH incident AS (
        SELECT extensions.ST_SetSRID(extensions.ST_MakePoint($2, $1), 4326) AS point,
               set_config('statement_timeout', '3000', true)
      )
      SELECT extensions.ST_Distance(
               bf.geometry::extensions.geography, incident.point::extensions.geography
             ) AS "distanceMeters"
      FROM gis.building_footprints bf
      CROSS JOIN incident
      WHERE bf.source_confidence >= 0.75
        AND extensions.ST_DWithin(bf.geometry, incident.point, 0.01)
        AND extensions.ST_DWithin(
          bf.geometry::extensions.geography, incident.point::extensions.geography, 1000
        )
      ORDER BY "distanceMeters"
      LIMIT 1
    `, [latitude, longitude]);
    const distance = result.rows[0] == null ? null : Number(result.rows[0].distanceMeters);
    return distance != null && Number.isFinite(distance) && distance >= 0 ? distance : null;
  } catch (error) {
    console.warn("Nearest mapped building assessment unavailable", error);
    return null;
  }
}
