import "server-only";

import { getDatabase } from "../../db";
import { assertManagementActor } from "./scope";
import type {
  ManagementActor,
  ManagementFilters,
  ManagementPage,
} from "./types";

export type ProvincialAuditEvent = {
  id: string;
  actorUserId: string;
  actorRole: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetMunicipalityId: string | null;
  targetMunicipalityName: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function listProvincialAuditEvents(
  actor: ManagementActor,
  filters: ManagementFilters,
): Promise<ManagementPage<ProvincialAuditEvent>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const whereClauses: string[] = ["1=1"];
  const values: unknown[] = [];

  if (filters.municipalityId) {
    values.push(filters.municipalityId);
    whereClauses.push(`pme.municipality_id = $${values.length}`);
  }

  if (filters.from) {
    values.push(filters.from);
    whereClauses.push(`pme.created_at >= $${values.length}::timestamptz`);
  }

  if (filters.to) {
    values.push(filters.to);
    whereClauses.push(`pme.created_at <= $${values.length}::timestamptz`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const sIdx = values.length;
    whereClauses.push(`(
      pme.action ilike $${sIdx} or
      pme.target_type ilike $${sIdx} or
      pme.target_id ilike $${sIdx} or
      pme.reason ilike $${sIdx} or
      p.display_name ilike $${sIdx} or
      m.name ilike $${sIdx}
    )`);
  }

  const whereSql = `where ${whereClauses.join(" and ")}`;

  const countRes = await db.query<{ count: string }>(
    `select count(*)::text as count
       from provincial_management_events pme
       left join users u on u.id = pme.actor_user_id
       left join bfp_personnel_profiles p on p.user_id = u.id
       left join municipalities m on m.id = pme.municipality_id
     ${whereSql}`,
    values,
  );
  const total = Number.parseInt(countRes.rows[0]?.count ?? "0", 10);

  const offset = (filters.page - 1) * filters.pageSize;
  values.push(filters.pageSize);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const rowsRes = await db.query<{
    id: string;
    actor_user_id: string;
    actor_role: string;
    actor_name: string | null;
    action: string;
    target_type: string;
    target_id: string;
    target_municipality_id: string | null;
    target_municipality_name: string | null;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `select pme.id,
            pme.actor_user_id,
            u.role as actor_role,
            coalesce(p.display_name, 'System Administrator') as actor_name,
            pme.action,
            pme.target_type,
            pme.target_id,
            pme.municipality_id as target_municipality_id,
            m.name as target_municipality_name,
            pme.reason,
            pme.metadata,
            pme.created_at
       from provincial_management_events pme
       left join users u on u.id = pme.actor_user_id
       left join bfp_personnel_profiles p on p.user_id = u.id
       left join municipalities m on m.id = pme.municipality_id
     ${whereSql}
      order by pme.created_at desc
      limit $${limitIdx} offset $${offsetIdx}`,
    values,
  );

  const items: ProvincialAuditEvent[] = rowsRes.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    actorName: row.actor_name ?? "Provincial Officer",
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetMunicipalityId: row.target_municipality_id,
    targetMunicipalityName: row.target_municipality_name,
    reason: row.reason,
    metadata: row.metadata ?? {},
    createdAt: new Date(row.created_at).toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages,
    updatedAt: new Date().toISOString(),
  };
}
