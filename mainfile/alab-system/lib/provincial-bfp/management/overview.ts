import { dateBoundarySql } from "./filters";

import { getDatabase } from "../../db";
import { assertManagementActor } from "./scope";
import type {
  ManagementActor,
  ManagementFilters,
  ManagementPage,
  MunicipalitySummary,
} from "./types";

export type ManagementSummary = {
  totalMunicipalities: number;
  totalStations: number;
  totalPersonnel: number;
  totalResidents: number;
  pendingApplications: number;
  totalReports: number;
  activeIncidents: number;
  resolvedIncidents: number;
  updatedAt: string;
};

export async function listManagedMunicipalities(
  actor: ManagementActor,
  filters: ManagementFilters,
): Promise<ManagementPage<MunicipalitySummary>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const conditions: string[] = ["m.province = 'Antique'"];
  const params: unknown[] = [];

  if (filters.municipalityId) {
    params.push(filters.municipalityId);
    conditions.push(`m.id = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`m.name ilike $${params.length}`);
  }

  const countParams = [...params];

  // Report date filtering
  let reportDateCondition = "";
  if (filters.from) {
    params.push(filters.from);
    reportDateCondition += ` and fr.submitted_at >= ${dateBoundarySql(`$${params.length}`, filters.from)}`;
  }
  if (filters.to) {
    params.push(filters.to);
    reportDateCondition += ` and fr.submitted_at ${filters.to.length === 10 ? "<" : "<="} ${dateBoundarySql(`$${params.length}`, filters.to, true)}`;
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  // Count total matching municipalities
  const countRes = await db.query<{ count: string }>(
    `select count(*) as count from municipalities m ${whereClause}`,
    countParams,
  );
  const total = Number(countRes.rows[0]?.count ?? 0);

  const offset = (filters.page - 1) * filters.pageSize;
  params.push(filters.pageSize);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const query = `
    select
      m.id,
      m.name,
      m.province,
      coalesce(s.station_count, 0)::int as "stationCount",
      coalesce(p.personnel_count, 0)::int as "personnelCount",
      coalesce(r.resident_count, 0)::int as "residentCount",
      coalesce(app.pending_count, 0)::int as "pendingApplicationCount",
      coalesce(fr.total_reports, 0)::int as "totalReportCount",
      coalesce(fr.active_incidents, 0)::int as "activeIncidentCount",
      coalesce(fr.resolved_incidents, 0)::int as "resolvedIncidentCount",
      m.updated_at as "updatedAt"
    from municipalities m
    left join (
      select municipality_id, count(distinct s.id) as station_count
      from municipal_bfp_stations s
      group by municipality_id
    ) s on s.municipality_id = m.id
    left join (
      select a.municipality_id, count(distinct p.user_id) as personnel_count
      from bfp_personnel_profiles p
      join users u on u.id = p.user_id and u.role = 'MUNICIPAL_BFP'
      join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
      group by a.municipality_id
    ) p on p.municipality_id = m.id
    left join (
      select ra.municipality_id, count(distinct rp.id) as resident_count
      from resident_profiles rp
      join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
      join users u on u.id = rp.user_id and u.role = 'RESIDENT'
      group by ra.municipality_id
    ) r on r.municipality_id = m.id
    left join (
      select ra.municipality_id, count(distinct rv.id) as pending_count
      from resident_verifications rv
      join resident_profiles rp on rp.id = rv.resident_profile_id
      join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
      where rv.status = 'PENDING'
      group by ra.municipality_id
    ) app on app.municipality_id = m.id
    left join (
      select
        fr.municipality_id,
        count(distinct fr.id) as total_reports,
        count(distinct fr.id) filter (where fr.status in ('SUBMITTED', 'UNDER_VERIFICATION', 'CONFIRMED', 'PENDING_VERIFICATION', 'VERIFIED', 'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'NEEDS_MORE_INFO')) as active_incidents,
        count(distinct fr.id) filter (where fr.status in ('CLOSED', 'RESOLVED')) as resolved_incidents
      from fire_reports fr
      where 1=1 ${reportDateCondition}
      group by fr.municipality_id
    ) fr on fr.municipality_id = m.id
    ${whereClause}
    order by m.name asc
    limit ${limitParam} offset ${offsetParam}
  `;

  const rows = await db.query<MunicipalitySummary>(query, params);

  return {
    items: rows.rows.map((row) => ({
      ...row,
      stationCount: Number(row.stationCount),
      personnelCount: Number(row.personnelCount),
      residentCount: Number(row.residentCount),
      pendingApplicationCount: Number(row.pendingApplicationCount),
      totalReportCount: Number(row.totalReportCount),
      totalFireReportCount: Number(row.totalReportCount),
      activeIncidentCount: Number(row.activeIncidentCount),
      resolvedIncidentCount: Number(row.resolvedIncidentCount),
      updatedAt: new Date(row.updatedAt).toISOString(),
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    updatedAt: new Date().toISOString(),
  };
}

export async function getManagedMunicipality(
  actor: ManagementActor,
  municipalityId: string,
): Promise<MunicipalitySummary | null> {
  const page = await listManagedMunicipalities(actor, {
    municipalityId,
    page: 1,
    pageSize: 25,
  });
  return page.items[0] ?? null;
}

export async function getManagementSummary(
  actor: ManagementActor,
  filters?: Partial<ManagementFilters>,
): Promise<ManagementSummary> {
  assertManagementActor(actor);

  const db = getDatabase();
  const params: unknown[] = [];
  let municipalityFilter = "";
  if (filters?.municipalityId) {
    params.push(filters.municipalityId);
    municipalityFilter = `and m.id = $${params.length}`;
  }

  let reportDateCondition = "";
  if (filters?.from) {
    params.push(filters.from);
    reportDateCondition += ` and fr.submitted_at >= ${dateBoundarySql(`$${params.length}`, filters.from)}`;
  }
  if (filters?.to) {
    params.push(filters.to);
    reportDateCondition += ` and fr.submitted_at ${filters.to.length === 10 ? "<" : "<="} ${dateBoundarySql(`$${params.length}`, filters.to, true)}`;
  }

  const query = `
    with scoped_municipalities as (
      select id, name from municipalities m where province = 'Antique' ${municipalityFilter}
    )
    select
      (select count(*) from scoped_municipalities)::int as "totalMunicipalities",
      (
        select count(distinct s.id)::int
        from municipal_bfp_stations s
        join scoped_municipalities sm on sm.id = s.municipality_id
        ) as "totalStations",
      (
        select count(distinct p.user_id)::int
        from bfp_personnel_profiles p
        join users u on u.id = p.user_id and u.role = 'MUNICIPAL_BFP'
        join bfp_municipality_assignments a on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
        join scoped_municipalities sm on sm.id = a.municipality_id
      ) as "totalPersonnel",
      (
        select count(distinct rp.id)::int
        from resident_profiles rp
        left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
        left join scoped_municipalities sm on sm.id = ra.municipality_id
        join users u on u.id = rp.user_id and u.role = 'RESIDENT'
        where sm.id is not null ${filters?.municipalityId ? "" : "or (ra.id is null and not exists (select 1 from resident_addresses known_address join municipalities known_municipality on known_municipality.id = known_address.municipality_id where known_address.resident_profile_id = rp.id and known_municipality.province <> 'Antique'))"}
      ) as "totalResidents",
      (
        select count(distinct rv.id)::int
        from resident_verifications rv
        join resident_profiles rp on rp.id = rv.resident_profile_id
        join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
        join scoped_municipalities sm on sm.id = ra.municipality_id
        where rv.status = 'PENDING'
      ) as "pendingApplications",
      (
        select count(distinct fr.id)::int
        from fire_reports fr
        join scoped_municipalities sm on sm.id = fr.municipality_id
        where 1=1 ${reportDateCondition}
      ) as "totalReports",
      (
        select count(distinct fr.id)::int
        from fire_reports fr
        join scoped_municipalities sm on sm.id = fr.municipality_id
        where fr.status in ('SUBMITTED', 'UNDER_VERIFICATION', 'CONFIRMED', 'PENDING_VERIFICATION', 'VERIFIED', 'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'NEEDS_MORE_INFO')
        ${reportDateCondition}
      ) as "activeIncidents",
      (
        select count(distinct fr.id)::int
        from fire_reports fr
        join scoped_municipalities sm on sm.id = fr.municipality_id
        where fr.status in ('CLOSED', 'RESOLVED')
        ${reportDateCondition}
      ) as "resolvedIncidents"
  `;

  const res = await db.query<ManagementSummary>(query, params);
  const row = res.rows[0];

  return {
    totalMunicipalities: Number(row?.totalMunicipalities ?? 0),
    totalStations: Number(row?.totalStations ?? 0),
    totalPersonnel: Number(row?.totalPersonnel ?? 0),
    totalResidents: Number(row?.totalResidents ?? 0),
    pendingApplications: Number(row?.pendingApplications ?? 0),
    totalReports: Number(row?.totalReports ?? 0),
    activeIncidents: Number(row?.activeIncidents ?? 0),
    resolvedIncidents: Number(row?.resolvedIncidents ?? 0),
    updatedAt: new Date().toISOString(),
  };
}
