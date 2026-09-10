import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { ManagementActor } from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertManagementActor(actor: unknown): asserts actor is ManagementActor {
  if (!actor || typeof actor !== "object") {
    throw new Error("UNAUTHORIZED_ACTOR");
  }
  const candidate = actor as Partial<ManagementActor>;
  if (candidate.role !== "PROVINCIAL_BFP") {
    throw new Error("FORBIDDEN_ROLE");
  }
  if (candidate.province !== "Antique") {
    throw new Error("FORBIDDEN_PROVINCE");
  }
  if (!candidate.userId || !UUID_REGEX.test(candidate.userId)) {
    throw new Error("INVALID_ACTOR_ID");
  }
}

export function computeRecordVersion(record: { id: string; updatedAt?: Date | string | null }): string {
  const dateStr = record.updatedAt ? new Date(record.updatedAt).toISOString() : "genesis";
  return createHash("sha256")
    .update(`${record.id}:${dateStr}`)
    .digest("hex")
    .slice(0, 16);
}

export function assertVersionMatch(currentVersion: string, expectedVersion?: string, updatedAt?: Date | string): void {
  if (!expectedVersion || (currentVersion !== expectedVersion && (!updatedAt || expectedVersion !== new Date(updatedAt).toISOString()))) {
    throw new Error("STALE_REVISION_CONFLICT");
  }
}

export async function assertAntiqueMunicipality(
  client: PoolClient,
  municipalityId: string,
): Promise<{ id: string; name: string; province: string }> {
  const result = await client.query<{ id: string; name: string; province: string }>(
    `select id, name, province from municipalities where id = $1 limit 1`,
    [municipalityId],
  );
  if (result.rowCount === 0) {
    throw new Error("MUNICIPALITY_NOT_FOUND");
  }
  const row = result.rows[0];
  if (row.province !== "Antique") {
    throw new Error("MUNICIPALITY_NOT_IN_ANTIQUE");
  }
  return row;
}

export async function validateFilterHierarchy(
  client: PoolClient,
  filters: { municipalityId?: string; stationId?: string; barangayId?: string },
): Promise<void> {
  if (filters.stationId && filters.municipalityId) {
    const station = await client.query(
      `select 1 from municipal_bfp_stations where id = $1 and municipality_id = $2`,
      [filters.stationId, filters.municipalityId],
    );
    if (station.rowCount === 0) {
      throw new Error("MISMATCHED_MUNICIPALITY_STATION");
    }
  }

  if (filters.barangayId && filters.municipalityId) {
    const barangay = await client.query(
      `select 1 from barangays where id = $1 and municipality_id = $2`,
      [filters.barangayId, filters.municipalityId],
    );
    if (barangay.rowCount === 0) {
      throw new Error("MISMATCHED_MUNICIPALITY_BARANGAY");
    }
  }
}

export async function assertManagementTarget(
  client: PoolClient,
  actor: ManagementActor,
  targetType: "MUNICIPALITY" | "STATION" | "PERSONNEL" | "RESIDENT" | "APPLICATION" | "FIRE_REPORT",
  targetId: string,
): Promise<{ targetId: string; municipalityId: string; municipalityName: string }> {
  assertManagementActor(actor);

  switch (targetType) {
    case "MUNICIPALITY": {
      const row = await assertAntiqueMunicipality(client, targetId);
      return { targetId: row.id, municipalityId: row.id, municipalityName: row.name };
    }
    case "STATION": {
      const res = await client.query<{ id: string; municipality_id: string; municipality_name: string }>(
        `select s.id, s.municipality_id, m.name as municipality_name
           from municipal_bfp_stations s
           join municipalities m on m.id = s.municipality_id
          where s.id = $1 and m.province = 'Antique'
          for update of s`,
        [targetId],
      );
      if (res.rowCount === 0) throw new Error("TARGET_NOT_FOUND");
      return {
        targetId: res.rows[0].id,
        municipalityId: res.rows[0].municipality_id,
        municipalityName: res.rows[0].municipality_name,
      };
    }
    case "PERSONNEL": {
      const res = await client.query<{ id: string; municipality_id: string; municipality_name: string }>(
        `select u.id, a.municipality_id, m.name as municipality_name
           from users u
           join bfp_personnel_profiles p on p.user_id = u.id
           left join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
           left join municipalities m on m.id = a.municipality_id
          where u.id = $1 and u.role = 'MUNICIPAL_BFP'
            and m.province = 'Antique'
          for update of u`,
        [targetId],
      );
      if (res.rowCount === 0) throw new Error("TARGET_NOT_FOUND");
      return {
        targetId: res.rows[0].id,
        municipalityId: res.rows[0].municipality_id,
        municipalityName: res.rows[0].municipality_name ?? "Unassigned",
      };
    }
    case "RESIDENT": {
      const res = await client.query<{ id: string; municipality_id: string; municipality_name: string }>(
        `select u.id, ra.municipality_id, m.name as municipality_name
           from users u
           join resident_profiles rp on rp.user_id = u.id
           left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
           left join municipalities m on m.id = ra.municipality_id
          where u.id = $1 and u.role = 'RESIDENT'
            and m.province = 'Antique'
          for update of u`,
        [targetId],
      );
      if (res.rowCount === 0) throw new Error("TARGET_NOT_FOUND");
      return {
        targetId: res.rows[0].id,
        municipalityId: res.rows[0].municipality_id,
        municipalityName: res.rows[0].municipality_name ?? "Unassigned",
      };
    }
    case "APPLICATION": {
      const res = await client.query<{ id: string; municipality_id: string; municipality_name: string }>(
        `select rv.id, ra.municipality_id, m.name as municipality_name
           from resident_verifications rv
           join resident_profiles rp on rp.id = rv.resident_profile_id
           join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
           join municipalities m on m.id = ra.municipality_id
          where rv.id = $1 and m.province = 'Antique'
          for update of rv`,
        [targetId],
      );
      if (res.rowCount === 0) throw new Error("TARGET_NOT_FOUND");
      return {
        targetId: res.rows[0].id,
        municipalityId: res.rows[0].municipality_id,
        municipalityName: res.rows[0].municipality_name,
      };
    }
    case "FIRE_REPORT": {
      const res = await client.query<{ id: string; municipality_id: string; municipality_name: string }>(
        `select fr.id, fr.municipality_id, m.name as municipality_name
           from fire_reports fr
           join municipalities m on m.id = fr.municipality_id
          where fr.id = $1 and m.province = 'Antique'
          for update of fr`,
        [targetId],
      );
      if (res.rowCount === 0) throw new Error("TARGET_NOT_FOUND");
      return {
        targetId: res.rows[0].id,
        municipalityId: res.rows[0].municipality_id,
        municipalityName: res.rows[0].municipality_name,
      };
    }
    default:
      throw new Error(`UNSUPPORTED_TARGET_TYPE: ${targetType}`);
  }
}
