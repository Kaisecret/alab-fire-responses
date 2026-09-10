import { createHash } from "node:crypto";

import { getDatabase, withTransaction } from "../../db";
import {
  assertManagementActor,
  assertAntiqueMunicipality,
  assertManagementTarget,
  computeRecordVersion,
  assertVersionMatch,
} from "./scope";
import type {
  ManagementActor,
  ManagementFilters,
  ManagementPage,
  ManagedStation,
  StationInput,
  MutationContext,
} from "./types";

function cleanText(value: unknown, limit = 160): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function validCoordinate(value: unknown, min: number, max: number): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : null;
}

function payloadDigest(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function listManagedStations(
  actor: ManagementActor,
  filters: ManagementFilters,
): Promise<ManagementPage<ManagedStation>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const conditions: string[] = ["m.province = 'Antique'"];
  const params: unknown[] = [];

  if (filters.municipalityId) {
    params.push(filters.municipalityId);
    conditions.push(`s.municipality_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status.toUpperCase());
    conditions.push(`s.status = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(s.station_name ilike $${params.length} or m.name ilike $${params.length})`);
  }

  for (const [value, end] of [[filters.from, false], [filters.to, true]] as const) {
    if (value) {
      params.push(value);
      const ref = `$${params.length}`;
      const boundary = value.length === 10
        ? `(${ref}::date::timestamp ${end ? "+ interval '1 day'" : ""} at time zone 'Asia/Manila')`
        : `${ref}::timestamptz`;
      conditions.push(`s.created_at ${end ? (value.length === 10 ? "<" : "<=") : ">="} ${boundary}`);
    }
  }

  if (filters.stationId) { params.push(filters.stationId); conditions.push(`s.id = $${params.length}`); }

  const whereClause = `where ${conditions.join(" and ")}`;

  const countRes = await db.query<{ count: string }>(
    `select count(*) as count
       from municipal_bfp_stations s
       join municipalities m on m.id = s.municipality_id
     ${whereClause}`,
    params,
  );
  const total = Number(countRes.rows[0]?.count ?? 0);

  const offset = (filters.page - 1) * filters.pageSize;
  params.push(filters.pageSize);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const query = `
    select
      s.id,
      s.station_name as "stationName",
      s.station_name as name,
      'MUNICIPAL_FIRE_STATION' as "stationType",
      (select count(*)::int from incident_dispatch_stations ds join incident_dispatches d on d.id = ds.dispatch_id where ds.station_id = s.id and d.status = 'ACTIVE') as "activeDispatchCount",
      (select count(*)::int from bfp_station_assignments a join bfp_personnel_profiles p on p.id = a.personnel_profile_id join users u on u.id = p.user_id where a.station_id = s.id and a.status = 'ACTIVE' and u.account_status = 'ACTIVE') as "activePersonnelCount",
      s.municipality_id as "municipalityId",
      m.name as "municipalityName",
      s.latitude::float as latitude,
      s.longitude::float as longitude,
      s.status,
      coalesce(sa.personnel_count, 0)::int as "personnelCount",
      s.created_at as "createdAt",
      s.updated_at as "updatedAt"
    from municipal_bfp_stations s
    join municipalities m on m.id = s.municipality_id
    left join (
      select station_id, count(distinct personnel_profile_id) as personnel_count
      from bfp_station_assignments
      where status = 'ACTIVE'
      group by station_id
    ) sa on sa.station_id = s.id
    ${whereClause}
    order by s.status = 'ACTIVE' desc, m.name asc, s.station_name asc
    limit ${limitParam} offset ${offsetParam}
  `;

  const rows = await db.query<ManagedStation>(query, params);

  return {
    items: rows.rows.map((r) => ({
      ...r,
      personnelCount: Number(r.personnelCount),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    updatedAt: new Date().toISOString(),
  };
}

export async function getManagedStation(
  actor: ManagementActor,
  stationId: string,
): Promise<ManagedStation | null> {
  assertManagementActor(actor);

  const db = getDatabase();
  const query = `
    select
      s.id,
      s.station_name as "stationName",
      s.station_name as name,
      'MUNICIPAL_FIRE_STATION' as "stationType",
      (select count(*)::int from incident_dispatch_stations ds join incident_dispatches d on d.id = ds.dispatch_id where ds.station_id = s.id and d.status = 'ACTIVE') as "activeDispatchCount",
      (select count(*)::int from bfp_station_assignments a join bfp_personnel_profiles p on p.id = a.personnel_profile_id join users u on u.id = p.user_id where a.station_id = s.id and a.status = 'ACTIVE' and u.account_status = 'ACTIVE') as "activePersonnelCount",
      s.municipality_id as "municipalityId",
      m.name as "municipalityName",
      s.latitude::float as latitude,
      s.longitude::float as longitude,
      s.status,
      coalesce(sa.personnel_count, 0)::int as "personnelCount",
      s.created_at as "createdAt",
      s.updated_at as "updatedAt"
    from municipal_bfp_stations s
    join municipalities m on m.id = s.municipality_id
    left join (
      select station_id, count(distinct personnel_profile_id) as personnel_count
      from bfp_station_assignments
      where status = 'ACTIVE'
      group by station_id
    ) sa on sa.station_id = s.id
    where s.id = $1 and m.province = 'Antique'
    limit 1
  `;

  const res = await db.query<ManagedStation>(query, [stationId]);
  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  return {
    ...row,
    personnelCount: Number(row.personnelCount),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function createManagedStation(
  context: MutationContext,
  input: StationInput,
): Promise<ManagedStation> {
  assertManagementActor(context.actor);

  const stationName = cleanText(input.stationName ?? input.name, 160);
  const municipalityId = cleanText(input.municipalityId, 36);
  const latitude = validCoordinate(input.latitude, 4, 22);
  const longitude = validCoordinate(input.longitude, 116, 127);

  if (stationName.length < 2 || !municipalityId || latitude === null || longitude === null) {
    throw new Error("INVALID_STATION_INPUT");
  }

  const digest = payloadDigest({ stationName, municipalityId, latitude, longitude });

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{ payload_digest: string; saved_result: ManagedStation }>(
      `select payload_digest, saved_result from provincial_management_operations
        where actor_user_id = $1 and request_id = $2 limit 1`,
      [context.actor.userId, context.requestId],
    );
    if (existingOp.rowCount && existingOp.rowCount > 0) {
      if (existingOp.rows[0].payload_digest !== digest) throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
      return existingOp.rows[0].saved_result;
    }

    const municipality = await assertAntiqueMunicipality(client, municipalityId);

    const now = new Date();
    const insertRes = await client.query<{
      id: string;
      station_name: string;
      municipality_id: string;
      latitude: number;
      longitude: number;
      status: "ACTIVE" | "INACTIVE";
      created_at: Date;
      updated_at: Date;
    }>(
      `insert into municipal_bfp_stations (
         municipality_id, station_name, latitude, longitude, status, created_at, updated_at
       )
       values ($1, $2, $3, $4, 'ACTIVE', $5, $5)
       returning id, station_name, municipality_id, latitude::float as latitude,
                 longitude::float as longitude, status, created_at, updated_at`,
      [municipalityId, stationName, latitude, longitude, now],
    );

    const created = insertRes.rows[0];
    const result: ManagedStation = {
      id: created.id,
      name: created.station_name,
      stationName: created.station_name,
      municipalityId: created.municipality_id,
      municipalityName: municipality.name,
      stationType: "MUNICIPAL_FIRE_STATION",
      latitude: created.latitude,
      longitude: created.longitude,
      status: created.status,
      personnelCount: 0,
      activePersonnelCount: 0,
      activeDispatchCount: 0,
      createdAt: created.created_at.toISOString(),
      updatedAt: created.updated_at.toISOString(),
    };

    // Record audit event
    await client.query(
      `insert into provincial_management_events (
         actor_user_id, target_type, target_id, municipality_id, action,
         reason, before_state, after_state, metadata, created_at
       )
       values ($1, 'STATION', $2, $3, 'CREATE_STATION', $4, null, $5::jsonb, $6::jsonb, $7)`,
      [
        context.actor.userId,
        created.id,
        municipalityId,
        context.reason ?? "Station provisioned by Provincial BFP",
        JSON.stringify(result),
        JSON.stringify({ requestId: context.requestId }),
        now,
      ],
    );

    // Save operation result
    await client.query(
      `insert into provincial_management_operations (
         actor_user_id, request_id, action, target_type, target_id,
         payload_digest, result_status, saved_result, created_at
       )
       values ($1, $2, 'CREATE_STATION', 'STATION', $3, $4, 'SUCCESS', $5::jsonb, $6)`,
      [context.actor.userId, context.requestId, created.id, digest, JSON.stringify(result), now],
    );

    return result;
  });
}

export async function updateManagedStation(
  context: MutationContext,
  stationId: string,
  input: StationInput,
): Promise<ManagedStation> {
  assertManagementActor(context.actor);

  const digest = payloadDigest({ operation: "UPDATE_STATION", stationId, input, reason: context.reason, expectedVersion: context.expectedVersion });

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{ payload_digest: string; saved_result: ManagedStation }>(
      `select payload_digest, saved_result from provincial_management_operations
        where actor_user_id = $1 and request_id = $2 limit 1`,
      [context.actor.userId, context.requestId],
    );
    if (existingOp.rowCount && existingOp.rowCount > 0) {
      if (existingOp.rows[0].payload_digest !== digest) throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
      return existingOp.rows[0].saved_result;
    }

    // Lock station and verify province
    const target = await assertManagementTarget(client, context.actor, "STATION", stationId);

    // Fetch existing station record
    const existingRes = await client.query<{
      id: string;
      station_name: string;
      municipality_id: string;
      latitude: number;
      longitude: number;
      status: "ACTIVE" | "INACTIVE";
      created_at: Date;
      updated_at: Date;
    }>(
      `select id, station_name, municipality_id, latitude::float as latitude,
              longitude::float as longitude, status, created_at, updated_at
         from municipal_bfp_stations
        where id = $1
        limit 1`,
      [stationId],
    );

    const existing = existingRes.rows[0];
    const currentVersion = computeRecordVersion({ id: existing.id, updatedAt: existing.updated_at });
    assertVersionMatch(currentVersion, context.expectedVersion, existing.updated_at);

    const now = new Date();
    const action = input.action ?? "UPDATE";
    if (!["UPDATE", "DEACTIVATE", "REACTIVATE"].includes(action)) throw new Error("INVALID_STATION_ACTION");
    let nextName = existing.station_name;
    let nextLat = existing.latitude;
    let nextLng = existing.longitude;
    let nextStatus = existing.status;

    if (action === "DEACTIVATE") {
      if (!context.reason || context.reason.trim().length < 5) {
        throw new Error("REASON_REQUIRED_FOR_DEACTIVATION");
      }

      // Check active assigned personnel
      const assigned = await client.query(
        `select 1 from bfp_station_assignments where station_id = $1 and status = 'ACTIVE' limit 1`,
        [stationId],
      );
      if (assigned.rowCount && assigned.rowCount > 0) {
        throw new Error("CANNOT_DEACTIVATE_STATION_WITH_ASSIGNED_PERSONNEL");
      }

      // Check active dispatches
      const dispatches = await client.query(
        `select 1 from incident_dispatch_stations ds join incident_dispatches d on d.id = ds.dispatch_id where ds.station_id = $1 and d.status = 'ACTIVE' limit 1`,
        [stationId],
      );
      if (dispatches.rowCount && dispatches.rowCount > 0) {
        throw new Error("CANNOT_DEACTIVATE_STATION_WITH_ACTIVE_DISPATCHES");
      }

      nextStatus = "INACTIVE";
    } else if (action === "REACTIVATE") {
      nextStatus = "ACTIVE";
    } else if (action === "UPDATE") {
      const stationName = cleanText(input.stationName ?? input.name, 160);
      const latitude = validCoordinate(input.latitude, 4, 22);
      const longitude = validCoordinate(input.longitude, 116, 127);

      if (stationName.length < 2 || latitude === null || longitude === null) {
        throw new Error("INVALID_STATION_INPUT");
      }
      nextName = stationName;
      nextLat = latitude;
      nextLng = longitude;
    }

    const updateRes = await client.query<{
      id: string;
      station_name: string;
      municipality_id: string;
      latitude: number;
      longitude: number;
      status: "ACTIVE" | "INACTIVE";
      created_at: Date;
      updated_at: Date;
    }>(
      `update municipal_bfp_stations
          set station_name = $1, latitude = $2, longitude = $3, status = $4, deactivated_at = case when $4 = 'INACTIVE' then coalesce(deactivated_at, $5) else null end, updated_at = $5
        where id = $6
        returning id, station_name, municipality_id, latitude::float as latitude,
                  longitude::float as longitude, status, created_at, updated_at`,
      [nextName, nextLat, nextLng, nextStatus, now, stationId],
    );

    const updated = updateRes.rows[0];

    // Count assigned personnel
    const countRes = await client.query<{ count: string }>(
      `select count(distinct personnel_profile_id) as count
         from bfp_station_assignments
        where station_id = $1 and status = 'ACTIVE'`,
      [stationId],
    );

    const personnelCount = Number(countRes.rows[0]?.count ?? 0);
    const result: ManagedStation = {
      id: updated.id,
      name: updated.station_name,
      stationName: updated.station_name,
      municipalityId: updated.municipality_id,
      municipalityName: target.municipalityName,
      stationType: "MUNICIPAL_FIRE_STATION",
      latitude: updated.latitude,
      longitude: updated.longitude,
      status: updated.status,
      personnelCount,
      activePersonnelCount: personnelCount,
      activeDispatchCount: 0,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };

    // Log audit event
    await client.query(
      `insert into provincial_management_events (
         actor_user_id, target_type, target_id, municipality_id, action,
         reason, before_state, after_state, metadata, created_at
       )
       values ($1, 'STATION', $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
      [
        context.actor.userId,
        stationId,
        target.municipalityId,
        `STATION_${action}`,
        context.reason ?? null,
        JSON.stringify(existing),
        JSON.stringify(result),
        JSON.stringify({ requestId: context.requestId, version: currentVersion }),
        now,
      ],
    );

    // Save operation
    await client.query(
      `insert into provincial_management_operations (
         actor_user_id, request_id, action, target_type, target_id,
         payload_digest, result_status, saved_result, created_at
       )
       values ($1, $2, $3, 'STATION', $4, $5, 'SUCCESS', $6::jsonb, $7)`,
      [
        context.actor.userId,
        context.requestId,
        `STATION_${action}`,
        stationId,
        digest,
        JSON.stringify(result),
        now,
      ],
    );

    return result;
  });
}
