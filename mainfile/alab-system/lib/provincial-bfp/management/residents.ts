import { createHash } from "node:crypto";

import { getDatabase, withTransaction } from "../../db";
import {
  assertManagementActor,
  assertManagementTarget,
  computeRecordVersion,
  assertVersionMatch,
} from "./scope";
import type {
  ManagementActor,
  ManagementFilters,
  ManagementPage,
  ManagedResident,
  MutationContext,
} from "./types";

export type ResidentInput = {
  action?: "UPDATE_ADMINISTRATIVE_DETAILS" | "SUSPEND" | "REACTIVATE";
  completeAddress?: string;
  sitioOrPurok?: string;
  nearbyLandmark?: string;
};

function payloadDigest(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function listManagedResidents(
  actor: ManagementActor,
  filters: ManagementFilters,
): Promise<ManagementPage<ManagedResident>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const conditions: string[] = [
    "u.role = 'RESIDENT'",
    "(m.province = 'Antique' or (ra.id is null and not exists (select 1 from resident_addresses known_address join municipalities known_municipality on known_municipality.id = known_address.municipality_id where known_address.resident_profile_id = rp.id and known_municipality.province <> 'Antique')))",
  ];
  const params: unknown[] = [];

  if (filters.municipalityId) {
    params.push(filters.municipalityId);
    conditions.push(`ra.municipality_id = $${params.length}`);
  }

  if (filters.barangayId) {
    params.push(filters.barangayId);
    conditions.push(`ra.barangay_id = $${params.length}`);
  }

  if (filters.status) {
    const s = filters.status.toUpperCase();
    if (s === "NO_APPLICATION") {
      conditions.push(`lv.status is null`);
    } else if (["PENDING", "VERIFIED", "CHANGES_REQUESTED"].includes(s)) {
      params.push(s);
      conditions.push(`lv.status = $${params.length}`);
    } else if (["ACTIVE", "SUSPENDED", "PENDING_REVIEW"].includes(s)) {
      params.push(s);
      conditions.push(`u.account_status = $${params.length}`);
    } else { throw new Error("INVALID_RESIDENT_STATUS"); }
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(
      `(rp.first_name ilike $${params.length} or rp.last_name ilike $${params.length} or u.email ilike $${params.length} or u.phone ilike $${params.length} or u.username ilike $${params.length} or lv.application_reference ilike $${params.length})`,
    );
  }

  for (const [value, end] of [[filters.from, false], [filters.to, true]] as const) {
    if (value) {
      params.push(value);
      const ref = `$${params.length}`;
      const boundary = value.length === 10
        ? `(${ref}::date::timestamp ${end ? "+ interval '1 day'" : ""} at time zone 'Asia/Manila')`
        : `${ref}::timestamptz`;
      conditions.push(`u.created_at ${end ? (value.length === 10 ? "<" : "<=") : ">="} ${boundary}`);
    }
  }

  const whereClause = `where ${conditions.join(" and ")}`;

  const countRes = await db.query<{ count: string }>(
    `select count(distinct u.id) as count
       from users u
       join resident_profiles rp on rp.user_id = u.id
       left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       left join municipalities m on m.id = ra.municipality_id
       left join lateral (
         select rv.status, rv.application_reference
           from resident_verifications rv
          where rv.resident_profile_id = rp.id
          order by rv.submitted_at desc nulls last, rv.created_at desc, rv.id desc
          limit 1
       ) lv on true
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
      u.id as "userId",
      rp.id as "profileId",
      rp.first_name as "firstName",
      rp.last_name as "lastName",
      u.email,
      u.phone,
      u.username,
      ra.municipality_id as "municipalityId",
      m.name as "municipalityName",
      ra.barangay_id as "barangayId",
      b.name as "barangayName",
      ra.complete_address as "completeAddress",
      u.account_status as "accountStatus",
      coalesce(lv.status, 'NO_APPLICATION') as "latestApplicationStatus",
      lv.application_reference as "latestApplicationReference",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    from users u
    join resident_profiles rp on rp.user_id = u.id
    left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
    left join municipalities m on m.id = ra.municipality_id
    left join barangays b on b.id = ra.barangay_id
    left join lateral (
      select rv.status, rv.application_reference
        from resident_verifications rv
       where rv.resident_profile_id = rp.id
       order by rv.submitted_at desc nulls last, rv.created_at desc, rv.id desc
       limit 1
    ) lv on true
    ${whereClause}
    order by u.created_at desc, rp.last_name asc
    limit ${limitParam} offset ${offsetParam}
  `;

  const rows = await db.query<ManagedResident>(query, params);

  return {
    items: rows.rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    updatedAt: new Date().toISOString(),
  };
}

export async function getManagedResident(
  actor: ManagementActor,
  residentId: string,
): Promise<ManagedResident | null> {
  assertManagementActor(actor);

  const db = getDatabase();
  const query = `
    select
      u.id as "userId",
      rp.id as "profileId",
      rp.first_name as "firstName",
      rp.last_name as "lastName",
      u.email,
      u.phone,
      u.username,
      ra.municipality_id as "municipalityId",
      m.name as "municipalityName",
      ra.barangay_id as "barangayId",
      b.name as "barangayName",
      ra.complete_address as "completeAddress",
      u.account_status as "accountStatus",
      coalesce(lv.status, 'NO_APPLICATION') as "latestApplicationStatus",
      lv.application_reference as "latestApplicationReference",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    from users u
    join resident_profiles rp on rp.user_id = u.id
    left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
    left join municipalities m on m.id = ra.municipality_id
    left join barangays b on b.id = ra.barangay_id
    left join lateral (
      select rv.status, rv.application_reference
        from resident_verifications rv
       where rv.resident_profile_id = rp.id
       order by rv.submitted_at desc nulls last, rv.created_at desc, rv.id desc
       limit 1
    ) lv on true
    where (u.id = $1 or rp.id = $1) and u.role = 'RESIDENT'
      and (m.province = 'Antique' or (ra.id is null and not exists (select 1 from resident_addresses known_address join municipalities known_municipality on known_municipality.id = known_address.municipality_id where known_address.resident_profile_id = rp.id and known_municipality.province <> 'Antique')))
    limit 1
  `;

  const res = await db.query<ManagedResident>(query, [residentId]);
  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function updateManagedResident(
  context: MutationContext,
  residentId: string,
  input: ResidentInput,
): Promise<ManagedResident> {
  assertManagementActor(context.actor);

  const digest = payloadDigest({ operation: "UPDATE_RESIDENT", residentId, input, reason: context.reason, expectedVersion: context.expectedVersion });

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{ payload_digest: string; saved_result: ManagedResident }>(
      `select payload_digest, saved_result from provincial_management_operations
        where actor_user_id = $1 and request_id = $2 limit 1`,
      [context.actor.userId, context.requestId],
    );
    if (existingOp.rowCount && existingOp.rowCount > 0) {
      if (existingOp.rows[0].payload_digest !== digest) throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
      return existingOp.rows[0].saved_result;
    }

    // Lock resident
    await assertManagementTarget(client, context.actor, "RESIDENT", residentId);

    const existingRes = await client.query<{
      userId: string;
      profileId: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      username: string;
      municipalityId: string | null;
      municipalityName: string | null;
      barangayId: string | null;
      barangayName: string | null;
      completeAddress: string | null;
      accountStatus: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
      latestApplicationStatus: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED" | "NO_APPLICATION";
      latestApplicationReference: string | null;
      updatedAt: Date;
    }>(
      `select
         u.id as "userId",
         rp.id as "profileId",
         rp.first_name as "firstName",
         rp.last_name as "lastName",
         u.email,
         u.phone,
         u.username,
         ra.municipality_id as "municipalityId",
         m.name as "municipalityName",
         ra.barangay_id as "barangayId",
         b.name as "barangayName",
         ra.complete_address as "completeAddress",
         u.account_status as "accountStatus",
         coalesce(lv.status, 'NO_APPLICATION') as "latestApplicationStatus",
         lv.application_reference as "latestApplicationReference",
         u.updated_at as "updatedAt"
       from users u
       join resident_profiles rp on rp.user_id = u.id
       left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       left join municipalities m on m.id = ra.municipality_id
       left join barangays b on b.id = ra.barangay_id
       left join lateral (
         select rv.status, rv.application_reference
           from resident_verifications rv
          where rv.resident_profile_id = rp.id
          order by rv.submitted_at desc nulls last, rv.created_at desc, rv.id desc
          limit 1
       ) lv on true
      where u.id = $1
      limit 1`,
      [residentId],
    );

    const existing = existingRes.rows[0];
    const currentVersion = computeRecordVersion({ id: existing.userId, updatedAt: existing.updatedAt });
    assertVersionMatch(currentVersion, context.expectedVersion, existing.updatedAt);

    const action = input.action ?? "UPDATE_ADMINISTRATIVE_DETAILS";
    if (!["UPDATE_ADMINISTRATIVE_DETAILS", "SUSPEND", "REACTIVATE"].includes(action)) throw new Error("INVALID_RESIDENT_ACTION");
    const now = new Date();

    if (action === "SUSPEND") {
      if (!context.reason || context.reason.trim().length < 5) {
        throw new Error("REASON_REQUIRED_FOR_SUSPENSION");
      }
      await client.query(`update users set account_status = 'SUSPENDED', updated_at = $1 where id = $2`, [now, residentId]);
    } else if (action === "REACTIVATE") {
      if (!context.reason || context.reason.trim().length < 5) {
        throw new Error("REASON_REQUIRED_FOR_REACTIVATION");
      }

      // Check verification status
      if (existing.latestApplicationStatus !== "VERIFIED") {
        throw new Error("CANNOT_ACTIVATE_UNVERIFIED_RESIDENT");
      }
      await client.query(`update users set account_status = 'ACTIVE', updated_at = $1 where id = $2`, [now, residentId]);
    } else if (action === "UPDATE_ADMINISTRATIVE_DETAILS") {
      if (input.completeAddress) {
        await client.query(
          `update resident_addresses
              set complete_address = $1,
                  sitio_or_purok = coalesce($2, sitio_or_purok),
                  nearby_landmark = coalesce($3, nearby_landmark),
                  updated_at = $4
            where resident_profile_id = $5 and is_primary`,
          [input.completeAddress.trim().slice(0, 200), input.sitioOrPurok?.trim() || null, input.nearbyLandmark?.trim() || null, now, existing.profileId],
        );
      }
      await client.query(`update users set updated_at = $1 where id = $2`, [now, residentId]);
    }

    const updatedRes = await client.query<{
      userId: string;
      profileId: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      username: string;
      municipalityId: string | null;
      municipalityName: string | null;
      barangayId: string | null;
      barangayName: string | null;
      completeAddress: string | null;
      accountStatus: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
      latestApplicationStatus: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED" | "NO_APPLICATION";
      latestApplicationReference: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>(
      `select
         u.id as "userId",
         rp.id as "profileId",
         rp.first_name as "firstName",
         rp.last_name as "lastName",
         u.email,
         u.phone,
         u.username,
         ra.municipality_id as "municipalityId",
         m.name as "municipalityName",
         ra.barangay_id as "barangayId",
         b.name as "barangayName",
         ra.complete_address as "completeAddress",
         u.account_status as "accountStatus",
         coalesce(lv.status, 'NO_APPLICATION') as "latestApplicationStatus",
         lv.application_reference as "latestApplicationReference",
         u.created_at as "createdAt",
         u.updated_at as "updatedAt"
       from users u
       join resident_profiles rp on rp.user_id = u.id
       left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       left join municipalities m on m.id = ra.municipality_id
       left join barangays b on b.id = ra.barangay_id
       left join lateral (
         select rv.status, rv.application_reference
           from resident_verifications rv
          where rv.resident_profile_id = rp.id
          order by rv.submitted_at desc nulls last, rv.created_at desc, rv.id desc
          limit 1
       ) lv on true
      where u.id = $1
      limit 1`,
      [residentId],
    );

    const updated = updatedRes.rows[0];
    const result: ManagedResident = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    // Log audit event
    await client.query(
      `insert into provincial_management_events (
         actor_user_id, target_type, target_id, municipality_id, action,
         reason, before_state, after_state, metadata, created_at
       )
       values ($1, 'RESIDENT', $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
      [
        context.actor.userId,
        residentId,
        updated.municipalityId,
        `RESIDENT_${action}`,
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
       values ($1, $2, $3, 'RESIDENT', $4, $5, 'SUCCESS', $6::jsonb, $7)`,
      [context.actor.userId, context.requestId, `RESIDENT_${action}`, residentId, digest, JSON.stringify(result), now],
    );

    return result;
  });
}
