import { randomBytes, randomUUID } from "node:crypto";

import { withTransaction, getDatabase } from "../db";
import { hashPassword } from "../auth/password";
import { createAccountNotifications } from "../notifications/service";

type StationInput = { stationName?: unknown; latitude?: unknown; longitude?: unknown };
type PersonnelInput = {
  displayName?: unknown;
  email?: unknown;
  rankOrPosition?: unknown;
  stationId?: unknown;
  temporaryPassword?: unknown;
};

type Station = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function uuid(value: unknown) {
  const id = text(value, 36);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

function coordinate(value: unknown, minimum: number, maximum: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function validEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function temporaryPassword() {
  return `ALAB-${randomBytes(12).toString("base64url")}`;
}

function stationValues(raw: StationInput) {
  const stationName = text(raw.stationName, 160);
  const latitude = coordinate(raw.latitude, 4, 22);
  const longitude = coordinate(raw.longitude, 116, 127);
  if (stationName.length < 2 || latitude === null || longitude === null) throw new Error("INVALID_STATION_INPUT");
  return { stationName, latitude, longitude };
}

export async function listMunicipalStations(municipalityId: string) {
  const result = await getDatabase().query<Station>(
    `select id, station_name as "stationName", latitude::float as latitude, longitude::float as longitude,
            status, created_at as "createdAt"
       from municipal_bfp_stations
      where municipality_id = $1
      order by status = 'ACTIVE' desc, station_name asc`,
    [municipalityId],
  );
  return result.rows;
}

export async function createMunicipalStation(actorUserId: string, municipalityId: string, raw: StationInput) {
  const input = stationValues(raw);
  const now = new Date();
  return withTransaction(async (client) => {
    const created = await client.query<Station>(
      `insert into municipal_bfp_stations (municipality_id, station_name, latitude, longitude, status, created_at, updated_at)
       values ($1, $2, $3, $4, 'ACTIVE', $5, $5)
       returning id, station_name as "stationName", latitude::float as latitude, longitude::float as longitude,
                 status, created_at as "createdAt"`,
      [municipalityId, input.stationName, input.latitude, input.longitude, now],
    );
    const station = created.rows[0];
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $1, 'STATION_CREATED', $2::jsonb, $3)`,
      [actorUserId, JSON.stringify({ stationId: station.id, stationName: station.stationName, municipalityId }), now],
    );
    return station;
  });
}

export async function updateMunicipalStation(actorUserId: string, municipalityId: string, stationIdInput: unknown, raw: StationInput) {
  const stationId = uuid(stationIdInput);
  const input = stationValues(raw);
  if (!stationId) throw new Error("INVALID_STATION");
  const now = new Date();
  return withTransaction(async (client) => {
    const updated = await client.query<Station>(
      `update municipal_bfp_stations
          set station_name = $1, latitude = $2, longitude = $3, updated_at = $4
        where id = $5 and municipality_id = $6 and status = 'ACTIVE'
        returning id, station_name as "stationName", latitude::float as latitude, longitude::float as longitude,
                  status, created_at as "createdAt"`,
      [input.stationName, input.latitude, input.longitude, now, stationId, municipalityId],
    );
    const station = updated.rows[0];
    if (!station) throw new Error("INVALID_STATION");
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $1, 'STATION_UPDATED', $2::jsonb, $3)`,
      [actorUserId, JSON.stringify({ stationId, stationName: station.stationName, municipalityId }), now],
    );
    return station;
  });
}

export async function deactivateMunicipalStation(actorUserId: string, municipalityId: string, stationIdInput: unknown) {
  const stationId = uuid(stationIdInput);
  if (!stationId) throw new Error("INVALID_STATION");
  const now = new Date();
  return withTransaction(async (client) => {
    const station = await client.query<{ id: string }>(
      "select id from municipal_bfp_stations where id = $1 and municipality_id = $2 and status = 'ACTIVE' for update",
      [stationId, municipalityId],
    );
    if (!station.rowCount) throw new Error("INVALID_STATION");
    const assigned = await client.query<{ id: string }>(
      "select id from bfp_station_assignments where station_id = $1 and status = 'ACTIVE' limit 1",
      [stationId],
    );
    if (assigned.rowCount) throw new Error("STATION_HAS_ACTIVE_PERSONNEL");
    await client.query(
      "update municipal_bfp_stations set status = 'INACTIVE', deactivated_at = $1, updated_at = $1 where id = $2",
      [now, stationId],
    );
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $1, 'STATION_DEACTIVATED', $2::jsonb, $3)`,
      [actorUserId, JSON.stringify({ stationId, municipalityId }), now],
    );
  });
}

export async function listMunicipalPersonnel(municipalityId: string) {
  const result = await getDatabase().query<{
    userId: string; displayName: string; email: string; rankOrPosition: string | null; accountStatus: string;
    stationId: string; stationName: string;
  }>(
    `select u.id as "userId", p.display_name as "displayName", u.email, p.rank_or_position as "rankOrPosition",
            u.account_status as "accountStatus", s.id as "stationId", s.station_name as "stationName"
       from bfp_municipality_assignments ma
       join bfp_personnel_profiles p on p.id = ma.personnel_profile_id
       join users u on u.id = p.user_id
       join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
       join municipal_bfp_stations s on s.id = sa.station_id
      where ma.municipality_id = $1 and ma.status = 'ACTIVE' and ma.assignment_role = 'MUNICIPAL_STAFF'
      order by s.station_name, p.display_name`,
    [municipalityId],
  );
  return result.rows;
}

export async function provisionMunicipalPersonnel(actorUserId: string, municipalityId: string, raw: PersonnelInput) {
  const displayName = text(raw.displayName, 100);
  const email = text(raw.email, 100).toLowerCase();
  const rankOrPosition = text(raw.rankOrPosition, 100) || null;
  const stationId = uuid(raw.stationId);
  const suppliedPassword = typeof raw.temporaryPassword === "string" ? raw.temporaryPassword : "";
  if (displayName.length < 2 || !validEmail(email) || !stationId) throw new Error("INVALID_PERSONNEL_INPUT");
  if (suppliedPassword && suppliedPassword.length < 12) throw new Error("TEMPORARY_PASSWORD_TOO_SHORT");
  const issuedPassword = suppliedPassword || temporaryPassword();
  const passwordHash = await hashPassword(issuedPassword);
  const now = new Date();
  const userId = randomUUID();
  const profileId = randomUUID();
  const municipalityAssignmentId = randomUUID();
  const stationAssignmentId = randomUUID();

  const account = await withTransaction(async (client) => {
    const station = await client.query<{ id: string; stationName: string }>(
      `select id, station_name as "stationName" from municipal_bfp_stations
        where id = $1 and municipality_id = $2 and status = 'ACTIVE' for share`,
      [stationId, municipalityId],
    );
    if (!station.rowCount) throw new Error("INVALID_STATION");
    await client.query(
      `insert into users (id, email, password_hash, role, account_status, created_at, updated_at)
       values ($1, $2, $3, 'MUNICIPAL_BFP', 'ACTIVE', $4, $4)`,
      [userId, email, passwordHash, now],
    );
    await client.query(
      `insert into bfp_personnel_profiles (id, user_id, display_name, rank_or_position, must_change_password, created_by_user_id, created_at, updated_at)
       values ($1, $2, $3, $4, true, $5, $6, $6)`,
      [profileId, userId, displayName, rankOrPosition, actorUserId, now],
    );
    await client.query(
      `insert into bfp_municipality_assignments (id, personnel_profile_id, municipality_id, assignment_role, status, issued_by_user_id, issued_at, created_at, updated_at)
       values ($1, $2, $3, 'MUNICIPAL_STAFF', 'ACTIVE', $4, $5, $5, $5)`,
      [municipalityAssignmentId, profileId, municipalityId, actorUserId, now],
    );
    await client.query(
      `insert into bfp_station_assignments (id, personnel_profile_id, station_id, status, assigned_by_user_id, assigned_at, created_at, updated_at)
       values ($1, $2, $3, 'ACTIVE', $4, $5, $5, $5)`,
      [stationAssignmentId, profileId, stationId, actorUserId, now],
    );
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $2, 'ACCOUNT_ISSUED', $3::jsonb, $4),
              ($1, $2, 'STATION_ASSIGNED', $5::jsonb, $4)`,
      [userId, actorUserId, JSON.stringify({ municipalityId, assignmentRole: "MUNICIPAL_STAFF" }), now,
        JSON.stringify({ municipalityId, stationId, stationName: station.rows[0].stationName })],
    );
    await createAccountNotifications(client, {
      recipientUserIds: [userId], actorUserId, eventType: "MUNICIPAL_ACCOUNT_CREATED", category: "ACCOUNT",
      title: "BFP personnel account ready", summary: `${station.rows[0].stationName} · Change your temporary password.`,
      actionHref: "/municipal-bfp/change-password", entityType: "user", entityId: userId,
      dedupeKey: `municipal-personnel-account:${userId}:created`, createdAt: now,
    });
    return { userId, stationName: station.rows[0].stationName };
  });

  return { ...account, displayName, email, temporaryPassword: issuedPassword };
}

export async function transferMunicipalPersonnel(actorUserId: string, municipalityId: string, personnelUserIdInput: unknown, stationIdInput: unknown) {
  const personnelUserId = uuid(personnelUserIdInput);
  const stationId = uuid(stationIdInput);
  if (!personnelUserId || !stationId) throw new Error("INVALID_PERSONNEL_INPUT");
  const now = new Date();
  return withTransaction(async (client) => {
    const personnel = await client.query<{ profileId: string }>(
      `select p.id as "profileId" from users u join bfp_personnel_profiles p on p.user_id = u.id
       join bfp_municipality_assignments ma on ma.personnel_profile_id = p.id and ma.status = 'ACTIVE'
       where u.id = $1 and ma.municipality_id = $2 and ma.assignment_role = 'MUNICIPAL_STAFF' for update`,
      [personnelUserId, municipalityId],
    );
    if (!personnel.rowCount) throw new Error("INVALID_PERSONNEL");
    const station = await client.query<{ stationName: string }>(
      "select station_name as \"stationName\" from municipal_bfp_stations where id = $1 and municipality_id = $2 and status = 'ACTIVE'",
      [stationId, municipalityId],
    );
    if (!station.rowCount) throw new Error("INVALID_STATION");
    await client.query(
      `update bfp_station_assignments set status = 'REVOKED', revoked_by_user_id = $1, revoked_at = $2, updated_at = $2
        where personnel_profile_id = $3 and status = 'ACTIVE'`,
      [actorUserId, now, personnel.rows[0].profileId],
    );
    await client.query(
      `insert into bfp_station_assignments (personnel_profile_id, station_id, status, assigned_by_user_id, assigned_at, created_at, updated_at)
       values ($1, $2, 'ACTIVE', $3, $4, $4, $4)`,
      [personnel.rows[0].profileId, stationId, actorUserId, now],
    );
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $2, 'STATION_TRANSFERRED', $3::jsonb, $4)`,
      [personnelUserId, actorUserId, JSON.stringify({ municipalityId, stationId, stationName: station.rows[0].stationName }), now],
    );
  });
}

export async function setMunicipalPersonnelStatus(actorUserId: string, municipalityId: string, personnelUserIdInput: unknown, active: boolean) {
  const personnelUserId = uuid(personnelUserIdInput);
  if (!personnelUserId) throw new Error("INVALID_PERSONNEL");
  const now = new Date();
  return withTransaction(async (client) => {
    const updated = await client.query<{ id: string }>(
      `update users u set account_status = $1, updated_at = $2
        from bfp_personnel_profiles p join bfp_municipality_assignments ma on ma.personnel_profile_id = p.id and ma.status = 'ACTIVE'
       where u.id = p.user_id and u.id = $3 and u.role = 'MUNICIPAL_BFP'
         and ma.municipality_id = $4 and ma.assignment_role = 'MUNICIPAL_STAFF'
       returning u.id`,
      [active ? "ACTIVE" : "SUSPENDED", now, personnelUserId, municipalityId],
    );
    if (!updated.rowCount) throw new Error("INVALID_PERSONNEL");
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $2, $3, $4::jsonb, $5)`,
      [personnelUserId, actorUserId, active ? "REACTIVATED" : "SUSPENDED", JSON.stringify({ municipalityId }), now],
    );
  });
}
