import { randomBytes, randomUUID } from "node:crypto";

import { withTransaction, getDatabase } from "../db";
import { hashPassword, verifyPassword } from "./password";
import type { BfpRole } from "./session";
import { createAccountNotifications } from "../notifications/service";

type ProvisionInput = {
  email: string;
  displayName: string;
  rankOrPosition?: string;
  municipalityId: string;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF";
  temporaryPassword?: string;
};

export type BfpIdentity = {
  userId: string;
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  stationName: string | null;
  role: BfpRole;
  accountStatus: "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  municipalityId: string | null;
  municipalityName: string | null;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function makeTemporaryPassword() {
  return `ALAB-${randomBytes(12).toString("base64url")}`;
}

export async function getBfpIdentity(userId: string): Promise<BfpIdentity | null> {
  const result = await getDatabase().query<BfpIdentity>(
    `select u.id as "userId", u.email, p.display_name as "displayName", p.rank_or_position as "rankOrPosition",
            u.role, u.account_status as "accountStatus", p.must_change_password as "mustChangePassword",
            a.municipality_id as "municipalityId", m.name as "municipalityName", a.assignment_role as "assignmentRole",
            s.station_name as "stationName"
       from users u
       join bfp_personnel_profiles p on p.user_id = u.id
       left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
       left join municipalities m on m.id = a.municipality_id
       left join bfp_station_assignments sa on sa.personnel_profile_id = p.id and sa.status = 'ACTIVE'
       left join municipal_bfp_stations s on s.id = sa.station_id and s.status = 'ACTIVE'
      where u.id = $1 and u.role in ('PROVINCIAL_BFP', 'MUNICIPAL_BFP')
      limit 1`,
    [userId],
  );
  const identity = result.rows[0] ?? null;
  if (!identity || identity.accountStatus !== "ACTIVE") return null;
  if (identity.role === "MUNICIPAL_BFP" && !identity.municipalityId) return null;
  return identity;
}

export async function verifyBfpCredentials(emailInput: unknown, passwordInput: unknown, expectedRole: BfpRole) {
  const email = clean(emailInput, 100).toLowerCase();
  const password = typeof passwordInput === "string" ? passwordInput : "";
  if (!validEmail(email) || !password) return null;

  const result = await getDatabase().query<{ id: string; password_hash: string; role: BfpRole; account_status: string }>(
    "select id, password_hash, role, account_status from users where lower(email) = $1 limit 1",
    [email],
  );
  const user = result.rows[0];
  if (!user || user.role !== expectedRole || user.account_status !== "ACTIVE" || !(await verifyPassword(password, user.password_hash))) return null;
  return getBfpIdentity(user.id);
}

export async function provisionMunicipalBfpAccount(actorUserId: string, rawInput: ProvisionInput) {
  const email = clean(rawInput.email, 100).toLowerCase();
  const displayName = clean(rawInput.displayName, 100);
  const rankOrPosition = clean(rawInput.rankOrPosition, 100) || null;
  const municipalityId = clean(rawInput.municipalityId, 36);
  const assignmentRole = rawInput.assignmentRole;
  const suppliedTemporaryPassword = typeof rawInput.temporaryPassword === "string" ? rawInput.temporaryPassword : "";

  if (!validEmail(email) || displayName.length < 2 || !/^[0-9a-f-]{36}$/i.test(municipalityId) ||
    (assignmentRole !== "MUNICIPAL_ADMIN" && assignmentRole !== "MUNICIPAL_STAFF")) {
    throw new Error("INVALID_BFP_ACCOUNT_INPUT");
  }
  if (suppliedTemporaryPassword && suppliedTemporaryPassword.length < 12) throw new Error("TEMPORARY_PASSWORD_TOO_SHORT");

  const temporaryPassword = suppliedTemporaryPassword || makeTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const now = new Date();
  const userId = randomUUID();
  const profileId = randomUUID();
  const assignmentId = randomUUID();

  const account = await withTransaction(async (client) => {
    const municipality = await client.query<{ id: string; name: string }>("select id, name from municipalities where id = $1", [municipalityId]);
    if (!municipality.rowCount) throw new Error("INVALID_MUNICIPALITY");

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
       values ($1, $2, $3, $4, 'ACTIVE', $5, $6, $6, $6)`,
      [assignmentId, profileId, municipalityId, assignmentRole, actorUserId, now],
    );
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $2, 'ACCOUNT_ISSUED', $3::jsonb, $4)`,
      [userId, actorUserId, JSON.stringify({ municipalityId, assignmentRole }), now],
    );
    await createAccountNotifications(client, {
      recipientUserIds: [userId], actorUserId,
      eventType: "MUNICIPAL_ACCOUNT_CREATED", category: "ACCOUNT",
      title: "Municipal account ready", summary: `${municipality.rows[0].name} · Change your temporary password.`,
      actionHref: "/municipal-bfp/change-password", entityType: "user", entityId: userId,
      dedupeKey: `municipal-account:${userId}:created`, createdAt: now,
    });
    return { userId, municipalityName: municipality.rows[0].name };
  });

  return { ...account, email, displayName, assignmentRole, temporaryPassword };
}

export async function changeBfpPassword(userId: string, currentPassword: string, nextPassword: string) {
  if (nextPassword.length < 12) throw new Error("PASSWORD_TOO_SHORT");
  const result = await getDatabase().query<{ password_hash: string }>(
    `select u.password_hash from users u join bfp_personnel_profiles p on p.user_id = u.id
      where u.id = $1 and u.role in ('PROVINCIAL_BFP', 'MUNICIPAL_BFP') and u.account_status = 'ACTIVE'`,
    [userId],
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) throw new Error("CURRENT_PASSWORD_INCORRECT");

  const passwordHash = await hashPassword(nextPassword);
  await withTransaction(async (client) => {
    await client.query("update users set password_hash = $1, updated_at = now() where id = $2", [passwordHash, userId]);
    await client.query("update bfp_personnel_profiles set must_change_password = false, updated_at = now() where user_id = $1", [userId]);
    await client.query(
      `insert into bfp_credential_events (target_user_id, actor_user_id, event_type, metadata)
       values ($1, $1, 'PASSWORD_CHANGED', '{}'::jsonb)`,
      [userId],
    );
  });
}

export async function updateBfpDisplayName(userId: string, displayNameInput: unknown) {
  const displayName = clean(displayNameInput, 100);
  if (displayName.length < 2) throw new Error("INVALID_DISPLAY_NAME");

  const updated = await getDatabase().query<{ userId: string }>(
    `update bfp_personnel_profiles
        set display_name = $1, updated_at = now()
      where user_id = $2
        and exists (
          select 1 from users u
          where u.id = $2 and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE'
        )
      returning user_id as "userId"`,
    [displayName, userId],
  );
  if (!updated.rowCount) throw new Error("PROFILE_NOT_FOUND");
}
