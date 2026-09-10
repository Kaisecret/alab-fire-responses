import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getDatabase, withTransaction } from "../../db";
import { hashPassword } from "../../auth/password";
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
  ManagedPersonnel,
  PersonnelInput,
  MutationContext,
} from "./types";

function cleanText(value: unknown, limit = 100): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function validEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

function payloadDigest(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function generateTemporaryPassword(): string {
  return `ALAB-${randomBytes(12).toString("base64url")}`;
}

export async function listManagedPersonnel(
  actor: ManagementActor,
  filters: ManagementFilters,
): Promise<ManagementPage<ManagedPersonnel>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const conditions: string[] = [
    "u.role = 'MUNICIPAL_BFP'",
    "m.province = 'Antique'",
  ];
  const params: unknown[] = [];

  if (filters.municipalityId) {
    params.push(filters.municipalityId);
    conditions.push(`a.municipality_id = $${params.length}`);
  }

  if (filters.stationId) {
    params.push(filters.stationId);
    conditions.push(`s.id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status.toUpperCase());
    conditions.push(`u.account_status = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(
      `(p.display_name ilike $${params.length} or u.email ilike $${params.length} or p.rank_or_position ilike $${params.length})`,
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
       join bfp_personnel_profiles p on p.user_id = u.id
       left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
       left join municipalities m on m.id = a.municipality_id
       left join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
       left join municipal_bfp_stations s on s.id = sa.station_id
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
      p.id as "profileId",
      u.email,
      p.display_name as "displayName",
      p.rank_or_position as "rankOrPosition",
      a.municipality_id as "municipalityId",
      m.name as "municipalityName",
      s.id as "stationId",
      s.station_name as "stationName",
      a.assignment_role as "assignmentRole",
      u.account_status as "accountStatus",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    from users u
    join bfp_personnel_profiles p on p.user_id = u.id
    left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
    left join municipalities m on m.id = a.municipality_id
    left join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
    left join municipal_bfp_stations s on s.id = sa.station_id
    ${whereClause}
    order by u.account_status = 'ACTIVE' desc, m.name asc nulls last, p.display_name asc
    limit ${limitParam} offset ${offsetParam}
  `;

  const rows = await db.query<ManagedPersonnel>(query, params);

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

export async function getManagedPersonnel(
  actor: ManagementActor,
  userId: string,
): Promise<ManagedPersonnel | null> {
  assertManagementActor(actor);

  const db = getDatabase();
  const query = `
    select
      u.id as "userId",
      p.id as "profileId",
      u.email,
      p.display_name as "displayName",
      p.rank_or_position as "rankOrPosition",
      a.municipality_id as "municipalityId",
      m.name as "municipalityName",
      s.id as "stationId",
      s.station_name as "stationName",
      a.assignment_role as "assignmentRole",
      u.account_status as "accountStatus",
      u.created_at as "createdAt",
      u.updated_at as "updatedAt"
    from users u
    join bfp_personnel_profiles p on p.user_id = u.id
    left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
    left join municipalities m on m.id = a.municipality_id
    left join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
    left join municipal_bfp_stations s on s.id = sa.station_id
    where u.id = $1 and u.role = 'MUNICIPAL_BFP'
      and m.province = 'Antique'
    limit 1
  `;

  const res = await db.query<ManagedPersonnel>(query, [userId]);
  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function createManagedPersonnel(
  context: MutationContext,
  input: PersonnelInput,
): Promise<ManagedPersonnel> {
  assertManagementActor(context.actor);

  const email = cleanText(input.email, 100).toLowerCase();
  const displayName = cleanText(input.displayName, 100);
  const rankOrPosition = cleanText(input.rankOrPosition, 100) || null;
  const municipalityId = cleanText(input.municipalityId, 36);
  const stationId = input.stationId ? cleanText(input.stationId, 36) : null;
  const assignmentRole = input.assignmentRole ?? "MUNICIPAL_STAFF";

  if (!validEmail(email) || displayName.length < 2 || !municipalityId) {
    throw new Error("INVALID_PERSONNEL_INPUT");
  }

  if (!["MUNICIPAL_ADMIN", "MUNICIPAL_STAFF"].includes(assignmentRole)) throw new Error("INVALID_ASSIGNMENT_ROLE");
  if (typeof input.temporaryPassword !== "string" || input.temporaryPassword.length < 12) throw new Error("INVALID_TEMPORARY_PASSWORD");
  const digest = payloadDigest({ operation: "CREATE_PERSONNEL", email, displayName, rankOrPosition, municipalityId, stationId, assignmentRole, temporaryPassword: input.temporaryPassword, reason: context.reason });

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{ payload_digest: string; saved_result: ManagedPersonnel }>(
      `select payload_digest, saved_result from provincial_management_operations
        where actor_user_id = $1 and request_id = $2 limit 1`,
      [context.actor.userId, context.requestId],
    );
    if (existingOp.rowCount && existingOp.rowCount > 0) {
      if (existingOp.rows[0].payload_digest !== digest) throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
      return existingOp.rows[0].saved_result;
    }

    // Verify Antique municipality
    const municipality = await assertAntiqueMunicipality(client, municipalityId);

    // Verify email uniqueness
    const emailCheck = await client.query(`select 1 from users where lower(email) = $1 limit 1`, [email]);
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    // If municipal admin, check if already exists
    if (assignmentRole === "MUNICIPAL_ADMIN") {
      const adminCheck = await client.query(
        `select 1
           from bfp_municipality_assignments a
           join users u on u.id = (select user_id from bfp_personnel_profiles where id = a.personnel_profile_id)
          where a.municipality_id = $1 and a.assignment_role = 'MUNICIPAL_ADMIN'
            and a.status = 'ACTIVE'
          limit 1`,
        [municipalityId],
      );
      if (adminCheck.rowCount && adminCheck.rowCount > 0) {
        throw new Error("MUNICIPALITY_ALREADY_HAS_ACTIVE_ADMIN");
      }
    }

    // Verify station if provided
    let stationName: string | null = null;
    if (stationId) {
      const stationCheck = await client.query<{ station_name: string }>(
        `select station_name from municipal_bfp_stations where id = $1 and municipality_id = $2 and status = 'ACTIVE' limit 1 for update`,
        [stationId, municipalityId],
      );
      if (stationCheck.rowCount === 0) {
        throw new Error("INVALID_STATION_ASSIGNMENT");
      }
      stationName = stationCheck.rows[0].station_name;
    }

    const tempPassword = input.temporaryPassword || generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    const now = new Date();
    const userId = randomUUID();
    const profileId = randomUUID();
    const assignmentId = randomUUID();

    // 1. Insert User
    await client.query(
      `insert into users (id, email, password_hash, role, account_status, created_at, updated_at)
       values ($1, $2, $3, 'MUNICIPAL_BFP', 'ACTIVE', $4, $4)`,
      [userId, email, passwordHash, now],
    );

    // 2. Insert Profile
    await client.query(
      `insert into bfp_personnel_profiles (
         id, user_id, display_name, rank_or_position, must_change_password, created_by_user_id, created_at, updated_at
       )
       values ($1, $2, $3, $4, true, $5, $6, $6)`,
      [profileId, userId, displayName, rankOrPosition, context.actor.userId, now],
    );

    // 3. Insert Municipality Assignment
    await client.query(
      `insert into bfp_municipality_assignments (
         id, personnel_profile_id, municipality_id, assignment_role, status, issued_by_user_id, issued_at, created_at, updated_at
       )
       values ($1, $2, $3, $4, 'ACTIVE', $5, $6, $6, $6)
         on conflict (personnel_profile_id) do update set municipality_id = excluded.municipality_id, assignment_role = excluded.assignment_role, status = 'ACTIVE', issued_by_user_id = excluded.issued_by_user_id, issued_at = excluded.issued_at, revoked_at = null, revoked_by_user_id = null, updated_at = excluded.updated_at`,
      [assignmentId, profileId, municipalityId, assignmentRole, context.actor.userId, now],
    );

    // 4. Optional Station Assignment
    if (stationId) {
      await client.query(
        `insert into bfp_station_assignments (
           personnel_profile_id, station_id, status, assigned_by_user_id, assigned_at, created_at, updated_at
         )
         values ($1, $2, 'ACTIVE', $3, $4, $4, $4)`,
        [profileId, stationId, context.actor.userId, now],
      );
    }

    const result: ManagedPersonnel = {
      userId,
      profileId,
      email,
      displayName,
      rankOrPosition,
      municipalityId,
      municipalityName: municipality.name,
      stationId,
      stationName,
      assignmentRole,
      accountStatus: "ACTIVE",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Log audit event
    await client.query(
      `insert into provincial_management_events (
         actor_user_id, target_type, target_id, municipality_id, action,
         reason, before_state, after_state, metadata, created_at
       )
       values ($1, 'PERSONNEL', $2, $3, 'CREATE_PERSONNEL', $4, null, $5::jsonb, $6::jsonb, $7)`,
      [
        context.actor.userId,
        userId,
        municipalityId,
        context.reason ?? "Personnel created by Provincial BFP",
        JSON.stringify(result),
        JSON.stringify({ requestId: context.requestId, assignmentRole }),
        now,
      ],
    );

    // Save operation
    await client.query(
      `insert into provincial_management_operations (
         actor_user_id, request_id, action, target_type, target_id,
         payload_digest, result_status, saved_result, created_at
       )
       values ($1, $2, 'CREATE_PERSONNEL', 'PERSONNEL', $3, $4, 'SUCCESS', $5::jsonb, $6)`,
      [context.actor.userId, context.requestId, userId, digest, JSON.stringify(result), now],
    );

    return result;
  });
}

export async function updateManagedPersonnel(
  context: MutationContext,
  userId: string,
  input: PersonnelInput,
): Promise<ManagedPersonnel> {
  assertManagementActor(context.actor);

  const digest = payloadDigest({ operation: "UPDATE_PERSONNEL", userId, input, reason: context.reason, expectedVersion: context.expectedVersion });

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{ payload_digest: string; saved_result: ManagedPersonnel }>(
      `select payload_digest, saved_result from provincial_management_operations
        where actor_user_id = $1 and request_id = $2 limit 1`,
      [context.actor.userId, context.requestId],
    );
    if (existingOp.rowCount && existingOp.rowCount > 0) {
      if (existingOp.rows[0].payload_digest !== digest) throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
      return existingOp.rows[0].saved_result;
    }

    // Lock personnel
    await assertManagementTarget(client, context.actor, "PERSONNEL", userId);

    const existingRes = await client.query<{
      userId: string;
      profileId: string;
      email: string;
      displayName: string;
      rankOrPosition: string | null;
      municipalityId: string | null;
      municipalityName: string | null;
      stationId: string | null;
      stationName: string | null;
      assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
      accountStatus: "ACTIVE" | "SUSPENDED";
      updatedAt: Date;
    }>(
      `select
         u.id as "userId",
         p.id as "profileId",
         u.email,
         p.display_name as "displayName",
         p.rank_or_position as "rankOrPosition",
         a.municipality_id as "municipalityId",
         m.name as "municipalityName",
         s.id as "stationId",
         s.station_name as "stationName",
         a.assignment_role as "assignmentRole",
         u.account_status as "accountStatus",
         u.updated_at as "updatedAt"
       from users u
       join bfp_personnel_profiles p on p.user_id = u.id
       left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
       left join municipalities m on m.id = a.municipality_id
       left join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
       left join municipal_bfp_stations s on s.id = sa.station_id
      where u.id = $1
      limit 1`,
      [userId],
    );

    const existing = existingRes.rows[0];
    const currentVersion = computeRecordVersion({ id: existing.userId, updatedAt: existing.updatedAt });
    assertVersionMatch(currentVersion, context.expectedVersion, existing.updatedAt);

    const action = input.action ?? "UPDATE";
    if (!["UPDATE", "ASSIGN_STATION", "TRANSFER_MUNICIPALITY", "SUSPEND", "REACTIVATE"].includes(action)) throw new Error("INVALID_PERSONNEL_ACTION");
    if (input.assignmentRole && !["MUNICIPAL_ADMIN", "MUNICIPAL_STAFF"].includes(input.assignmentRole)) throw new Error("INVALID_ASSIGNMENT_ROLE");
    const now = new Date();

    if (action === "ASSIGN_STATION" || action === "TRANSFER_MUNICIPALITY") {
      const activeDispatch = await client.query(
        `select 1 from incident_dispatch_recipients r join incident_dispatches d on d.id = r.dispatch_id
          where r.recipient_user_id = $1 and d.status = 'ACTIVE' and r.status <> 'COMPLETED' limit 1`, [userId]);
      if (activeDispatch.rowCount) throw new Error("CANNOT_TRANSFER_ACTIVE_DISPATCH");
    }
    if (input.assignmentRole !== undefined && !["MUNICIPAL_ADMIN", "MUNICIPAL_STAFF"].includes(input.assignmentRole)) throw new Error("INVALID_ASSIGNMENT_ROLE");

    if (action === "SUSPEND") {
      if (!context.reason || context.reason.trim().length < 5) {
        throw new Error("REASON_REQUIRED_FOR_SUSPENSION");
      }
      await client.query(`update users set account_status = 'SUSPENDED', updated_at = $1 where id = $2`, [now, userId]);
    } else if (action === "REACTIVATE") {
      await client.query(`update users set account_status = 'ACTIVE', updated_at = $1 where id = $2`, [now, userId]);
    } else if (action === "UPDATE") {
      const displayName = cleanText(input.displayName, 100);
      const rankOrPosition = input.rankOrPosition !== undefined ? cleanText(input.rankOrPosition, 100) || null : existing.rankOrPosition;

      if (displayName && displayName.length < 2) {
        throw new Error("INVALID_DISPLAY_NAME");
      }

      await client.query(
        `update bfp_personnel_profiles
            set display_name = coalesce($1, display_name),
                rank_or_position = $2,
                updated_at = $3
          where user_id = $4`,
        [displayName || null, rankOrPosition, now, userId],
      );
      await client.query(`update users set updated_at = $1 where id = $2`, [now, userId]);
    } else if (action === "ASSIGN_STATION") {
      const stationId = input.stationId ? cleanText(input.stationId, 36) : null;
      if (!existing.municipalityId) {
        throw new Error("PERSONNEL_HAS_NO_MUNICIPAL_ASSIGNMENT");
      }

      if (stationId) {
        const check = await client.query(
          `select 1 from municipal_bfp_stations where id = $1 and municipality_id = $2 and status = 'ACTIVE' limit 1 for update`,
          [stationId, existing.municipalityId],
        );
        if (check.rowCount === 0) {
          throw new Error("INVALID_STATION_FOR_MUNICIPALITY");
        }
      }

      // End existing station assignment
      await client.query(
        `update bfp_station_assignments set status = 'REVOKED', revoked_at = $1, updated_at = $1 where personnel_profile_id = $2 and status = 'ACTIVE'`,
        [now, existing.profileId],
      );

      // Create new assignment if provided
      if (stationId) {
        await client.query(
          `insert into bfp_station_assignments (personnel_profile_id, station_id, status, assigned_by_user_id, assigned_at, created_at, updated_at)
           values ($1, $2, 'ACTIVE', $3, $4, $4, $4)`,
          [existing.profileId, stationId, context.actor.userId, now],
        );
      }
      await client.query(`update users set updated_at = $1 where id = $2`, [now, userId]);
    } else if (action === "TRANSFER_MUNICIPALITY") {
      const destMuniId = cleanText(input.municipalityId, 36);
      if (!destMuniId) throw new Error("DESTINATION_MUNICIPALITY_REQUIRED");

      // Verify destination municipality in Antique
      await assertAntiqueMunicipality(client, destMuniId);

      // Check active dispatches
      if (existing.stationId) {
        const activeDispatch = await client.query(
          `select 1 from incident_dispatch_recipients r join incident_dispatches d on d.id = r.dispatch_id where r.recipient_user_id = $1 and d.status = 'ACTIVE' and r.status <> 'COMPLETED' limit 1`,
          [userId],
        );
        if (activeDispatch.rowCount && activeDispatch.rowCount > 0) {
          throw new Error("CANNOT_TRANSFER_ACTIVE_DISPATCH");
        }
      }

      const destRole = input.assignmentRole ?? existing.assignmentRole ?? "MUNICIPAL_STAFF";
      if (destRole === "MUNICIPAL_ADMIN") {
        const adminCheck = await client.query(
          `select 1
             from bfp_municipality_assignments a
             join users u on u.id = (select user_id from bfp_personnel_profiles where id = a.personnel_profile_id)
            where a.municipality_id = $1 and a.assignment_role = 'MUNICIPAL_ADMIN'
              and a.status = 'ACTIVE' and u.id <> $2
            limit 1`,
          [destMuniId, userId],
        );
        if (adminCheck.rowCount && adminCheck.rowCount > 0) {
          throw new Error("DESTINATION_ALREADY_HAS_MUNICIPAL_ADMIN");
        }
      }

      // End old assignments
      await client.query(
        `update bfp_municipality_assignments set status = 'REVOKED', revoked_at = $1, updated_at = $1 where personnel_profile_id = $2 and status = 'ACTIVE'`,
        [now, existing.profileId],
      );
      await client.query(
        `update bfp_station_assignments set status = 'REVOKED', revoked_at = $1, updated_at = $1 where personnel_profile_id = $2 and status = 'ACTIVE'`,
        [now, existing.profileId],
      );

      // Insert new municipality assignment
      await client.query(
        `insert into bfp_municipality_assignments (
           id, personnel_profile_id, municipality_id, assignment_role, status, issued_by_user_id, issued_at, created_at, updated_at
         )
         values ($1, $2, $3, $4, 'ACTIVE', $5, $6, $6, $6)
         on conflict (personnel_profile_id) do update set municipality_id = excluded.municipality_id, assignment_role = excluded.assignment_role, status = 'ACTIVE', issued_by_user_id = excluded.issued_by_user_id, issued_at = excluded.issued_at, revoked_at = null, revoked_by_user_id = null, updated_at = excluded.updated_at`,
        [randomUUID(), existing.profileId, destMuniId, destRole, context.actor.userId, now],
      );

      // Optional destination station
      const destStationId = input.stationId ? cleanText(input.stationId, 36) : null;
      if (destStationId) {
        const stCheck = await client.query(
          `select 1 from municipal_bfp_stations where id = $1 and municipality_id = $2 and status = 'ACTIVE' limit 1 for update`,
          [destStationId, destMuniId],
        );
        if (stCheck.rowCount === 0) throw new Error("INVALID_DESTINATION_STATION");

        await client.query(
          `insert into bfp_station_assignments (personnel_profile_id, station_id, status, assigned_by_user_id, assigned_at, created_at, updated_at)
           values ($1, $2, 'ACTIVE', $3, $4, $4, $4)`,
          [existing.profileId, destStationId, context.actor.userId, now],
        );
      }

      await client.query(`update users set updated_at = $1 where id = $2`, [now, userId]);
    }

    // Query updated representation
    const updatedRes = await client.query<{
      userId: string;
      profileId: string;
      email: string;
      displayName: string;
      rankOrPosition: string | null;
      municipalityId: string | null;
      municipalityName: string | null;
      stationId: string | null;
      stationName: string | null;
      assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
      accountStatus: "ACTIVE" | "SUSPENDED";
      createdAt: Date;
      updatedAt: Date;
    }>(
      `select
         u.id as "userId",
         p.id as "profileId",
         u.email,
         p.display_name as "displayName",
         p.rank_or_position as "rankOrPosition",
         a.municipality_id as "municipalityId",
         m.name as "municipalityName",
         s.id as "stationId",
         s.station_name as "stationName",
         a.assignment_role as "assignmentRole",
         u.account_status as "accountStatus",
         u.created_at as "createdAt",
         u.updated_at as "updatedAt"
       from users u
       join bfp_personnel_profiles p on p.user_id = u.id
       left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
       left join municipalities m on m.id = a.municipality_id
       left join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
       left join municipal_bfp_stations s on s.id = sa.station_id
      where u.id = $1
      limit 1`,
      [userId],
    );

    const updated = updatedRes.rows[0];
    const result: ManagedPersonnel = {
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
       values ($1, 'PERSONNEL', $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
      [
        context.actor.userId,
        userId,
        updated.municipalityId,
        `PERSONNEL_${action}`,
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
       values ($1, $2, $3, 'PERSONNEL', $4, $5, 'SUCCESS', $6::jsonb, $7)`,
      [context.actor.userId, context.requestId, `PERSONNEL_${action}`, userId, digest, JSON.stringify(result), now],
    );

    return result;
  });
}
