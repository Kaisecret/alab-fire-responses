import type { PoolClient } from "pg";

/**
 * Records that the report's own municipal station has seen it. The first
 * acknowledgement is kept; later ones change nothing. Returns null when the
 * report does not belong to that station.
 */
export async function acknowledgeMunicipalReport(
  client: Pick<PoolClient, "query">,
  input: { reportId: string; municipalityId: string; userId: string; at?: Date },
): Promise<{ acknowledgedAt: string } | null> {
  const result = await client.query<{ acknowledgedAt: string }>(
    `update fire_reports
        set municipal_acknowledged_at = coalesce(municipal_acknowledged_at, $3::timestamptz),
            municipal_acknowledged_by_user_id = coalesce(municipal_acknowledged_by_user_id, $4::uuid)
      where id = $1::uuid and municipality_id = $2::uuid
      returning municipal_acknowledged_at as "acknowledgedAt"`,
    [input.reportId, input.municipalityId, (input.at ?? new Date()).toISOString(), input.userId],
  );
  return result.rows[0] ?? null;
}
