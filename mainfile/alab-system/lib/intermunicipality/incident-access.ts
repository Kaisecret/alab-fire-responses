import "server-only";

import { getDatabase } from "../db";
import type {
  AssistanceRequestSummary,
  NearbyObserver,
} from "./types";

export type ScopedMunicipalIncident = {
  id: string;
  referenceNumber: string;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  residentName: string | null;
  fireType: string;
  status: string;
  barangay: string | null;
  landmark: string | null;
  submittedAt: string;
  latitude: number;
  longitude: number;
  calculatedSeverity: string | null;
  detectedBuildingDensity?: string | null;
  buildingDensityConfidence?: string | null;
  buildingDensityBuildingCount?: number | null;
  buildingDensityMinimumGapMeters?: number | null;
  accessScope: "ORIGIN" | "OBSERVER";
  originMunicipality: string;
};

export type ObserverIncidentDetail = {
  id: string;
  referenceNumber: string;
  status: string;
  fireType: string;
  description: string | null;
  landmark: string | null;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  respondingStationName: string | null;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  structureMaterial: string | null;
  houseDensity: string | null;
  routeAccessibility: string | null;
  calculatedSeverity: string | null;
  severityScore: number | null;
  severityFactors: string[] | null;
  barangay: string | null;
  municipality: string;
  accessScope: "OBSERVER";
};

export async function resolveMunicipalIncidentAccess(
  fireReportId: string,
  municipalityId: string,
): Promise<"ORIGIN" | "OBSERVER" | null> {
  const db = getDatabase();

  const originCheck = await db.query<{ id: string }>(
    `select id from fire_reports where id = $1 and municipality_id = $2`,
    [fireReportId, municipalityId],
  );
  if (originCheck.rows.length > 0) {
    return "ORIGIN";
  }

  try {
    const observerCheck = await db.query<{ id: string }>(
      `select observer.id
         from incident_municipal_observers observer
        where observer.fire_report_id = $1
          and observer.observer_municipality_id = $2
          and observer.status = 'ACTIVE'`,
      [fireReportId, municipalityId],
    );
    if (observerCheck.rows.length > 0) {
      return "OBSERVER";
    }
  } catch (err: any) {
    if (err?.code === "42P01" || err?.message?.includes("incident_municipal_observers")) {
      return null;
    }
    throw err;
  }

  return null;
}

export async function listScopedMunicipalIncidents(
  municipalityId: string,
  includeHistory: boolean,
): Promise<ScopedMunicipalIncident[]> {
  const db = getDatabase();
  const terminalFilter = includeHistory
    ? ""
    : "and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')";

  try {
    const query = `
      select fr.id,
             fr.reference_number as "referenceNumber",
             fr.report_source as "reportSource",
             coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName",
             fr.fire_type as "fireType",
             fr.status,
             barangay.name as barangay,
             fr.nearest_landmark as landmark,
             fr.submitted_at as "submittedAt",
             fr.latitude::float as latitude,
             fr.longitude::float as longitude,
             fr.calculated_severity as "calculatedSeverity",
             fr.detected_building_density as "detectedBuildingDensity",
             fr.building_density_confidence as "buildingDensityConfidence",
             fr.building_density_building_count as "buildingDensityBuildingCount",
             fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters",
             'ORIGIN'::text as "accessScope",
             origin.name as "originMunicipality"
        from fire_reports fr
        join municipalities origin on origin.id = fr.municipality_id
        left join barangays barangay on barangay.id = fr.barangay_id
       where fr.municipality_id = $1
         ${terminalFilter}
      union all
      select fr.id,
             fr.reference_number as "referenceNumber",
             fr.report_source as "reportSource",
             null::text as "residentName",
             fr.fire_type as "fireType",
             fr.status,
             barangay.name as barangay,
             fr.nearest_landmark as landmark,
             fr.submitted_at as "submittedAt",
             fr.latitude::float as latitude,
             fr.longitude::float as longitude,
             fr.calculated_severity as "calculatedSeverity",
             fr.detected_building_density as "detectedBuildingDensity",
             fr.building_density_confidence as "buildingDensityConfidence",
             fr.building_density_building_count as "buildingDensityBuildingCount",
             fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters",
             'OBSERVER'::text as "accessScope",
             origin.name as "originMunicipality"
        from incident_municipal_observers observer
        join fire_reports fr on fr.id = observer.fire_report_id
        join municipalities origin on origin.id = observer.origin_municipality_id
        left join barangays barangay on barangay.id = fr.barangay_id
       where observer.observer_municipality_id = $1
         and observer.status = 'ACTIVE'
         ${terminalFilter}
       order by "submittedAt" desc
    `;

    const result = await db.query<ScopedMunicipalIncident>(query, [municipalityId]);
    return result.rows;
  } catch (err: any) {
    if (
      err?.code === "42P01" ||
      err?.code === "42703" ||
      err?.message?.includes("incident_municipal_observers") ||
      err?.message?.includes("column")
    ) {
      try {
        const originFallback = `
          select fr.id,
                 fr.reference_number as "referenceNumber",
                 fr.report_source as "reportSource",
                 coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName",
                 fr.fire_type as "fireType",
                 fr.status,
                 barangay.name as barangay,
                 fr.nearest_landmark as landmark,
                 fr.submitted_at as "submittedAt",
                 fr.latitude::float as latitude,
                 fr.longitude::float as longitude,
                 fr.calculated_severity as "calculatedSeverity",
                 fr.detected_building_density as "detectedBuildingDensity",
                 fr.building_density_confidence as "buildingDensityConfidence",
                 fr.building_density_building_count as "buildingDensityBuildingCount",
                 fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters",
                 'ORIGIN'::text as "accessScope",
                 origin.name as "originMunicipality"
            from fire_reports fr
            join municipalities origin on origin.id = fr.municipality_id
            left join barangays barangay on barangay.id = fr.barangay_id
           where fr.municipality_id = $1
             ${terminalFilter}
           order by "submittedAt" desc
        `;
        const fallbackResult = await db.query<ScopedMunicipalIncident>(originFallback, [municipalityId]);
        return fallbackResult.rows;
      } catch (colErr: any) {
        if (
          colErr?.code === "42703" ||
          colErr?.message?.includes("report_source") ||
          colErr?.message?.includes("caller_name")
        ) {
          const legacyFallback = `
            select fr.id,
                   fr.reference_number as "referenceNumber",
                   'ALAB_APP'::text as "reportSource",
                   fr.reporter_name_snapshot as "residentName",
                   fr.fire_type as "fireType",
                   fr.status,
                   barangay.name as barangay,
                   fr.nearest_landmark as landmark,
                   fr.submitted_at as "submittedAt",
                   fr.latitude::float as latitude,
                   fr.longitude::float as longitude,
                   fr.calculated_severity as "calculatedSeverity",
                   null::text as "detectedBuildingDensity",
                   null::text as "buildingDensityConfidence",
                   null::integer as "buildingDensityBuildingCount",
                   null::float as "buildingDensityMinimumGapMeters",
                   'ORIGIN'::text as "accessScope",
                   origin.name as "originMunicipality"
              from fire_reports fr
              join municipalities origin on origin.id = fr.municipality_id
              left join barangays barangay on barangay.id = fr.barangay_id
             where fr.municipality_id = $1
               ${terminalFilter}
             order by "submittedAt" desc
          `;
          const legacyResult = await db.query<ScopedMunicipalIncident>(legacyFallback, [municipalityId]);
          return legacyResult.rows;
        }
        throw colErr;
      }
    }
    throw err;
  }
}

const OBSERVER_INCIDENT_QUERY = `
select fr.id,
       fr.reference_number as "referenceNumber",
       fr.status,
       fr.fire_type as "fireType",
       fr.description,
       fr.nearest_landmark as landmark,
       fr.latitude::float as latitude,
       fr.longitude::float as longitude,
       fr.submitted_at as "submittedAt",
       fr.response_started_at as "responseStartedAt",
       fr.responding_station_name as "respondingStationName",
       fr.report_source as "reportSource",
       fr.structure_material as "structureMaterial",
       fr.house_density as "houseDensity",
       fr.route_accessibility as "routeAccessibility",
       fr.calculated_severity as "calculatedSeverity",
       fr.severity_score as "severityScore",
       fr.severity_factors as "severityFactors",
       barangay.name as barangay,
       origin.name as municipality,
       'OBSERVER'::text as "accessScope"
  from incident_municipal_observers observer
  join fire_reports fr on fr.id = observer.fire_report_id
  join municipalities origin on origin.id = observer.origin_municipality_id
  left join barangays barangay on barangay.id = fr.barangay_id
 where fr.id = $1
   and observer.observer_municipality_id = $2
   and observer.status = 'ACTIVE'
 limit 1
`;

const COORDINATION_CONTEXT_QUERY = `
select o.id as "observerId",
       o.dispatch_id as "dispatchId",
       o.origin_municipality_id as "originMunicipalityId",
       o.observer_municipality_id as "observerMunicipalityId",
       m.name as "observerMunicipalityName",
       o.nearest_station_id as "stationId",
       s.station_name as "stationName",
       o.distance_meters::float as "distanceMeters",
       o.status,
       o.acknowledged_by_user_id as "acknowledgedByUserId",
       coalesce(p.full_name, u.full_name) as "acknowledgedByDisplayName",
       o.acknowledged_at as "acknowledgedAt"
  from incident_municipal_observers o
  join municipalities m on m.id = o.observer_municipality_id
  join municipal_bfp_stations s on s.id = o.nearest_station_id
  left join users u on u.id = o.acknowledged_by_user_id
  left join bfp_personnel_profiles p on p.user_id = u.id
 where o.fire_report_id = $1
`;

export async function getObserverIncidentDetail(
  fireReportId: string,
  municipalityId: string,
): Promise<ObserverIncidentDetail | null> {
  const db = getDatabase();
  try {
    const result = await db.query<ObserverIncidentDetail>(
      OBSERVER_INCIDENT_QUERY,
      [fireReportId, municipalityId],
    );
    return result.rows[0] ?? null;
  } catch (err: any) {
    if (err?.code === "42P01" || err?.message?.includes("incident_municipal_observers")) {
      return null;
    }
    throw err;
  }
}

export async function getIncidentCoordinationContext(
  fireReportId: string,
  municipalityId: string,
  accessScope: "ORIGIN" | "OBSERVER",
): Promise<{
  observers: NearbyObserver[];
  assistanceRequests: AssistanceRequestSummary[];
}> {
  const db = getDatabase();

  try {
    const [observersResult, assistanceResult] = await Promise.all([
      db.query<{
        observerId: string;
        dispatchId: string;
        originMunicipalityId: string;
        observerMunicipalityId: string;
        observerMunicipalityName: string;
        stationId: string;
        stationName: string;
        distanceMeters: number;
        status: "ACTIVE" | "ENDED";
        acknowledgedByUserId: string | null;
        acknowledgedByDisplayName: string | null;
        acknowledgedAt: string | null;
      }>(
        COORDINATION_CONTEXT_QUERY +
          (accessScope === "ORIGIN"
            ? " and o.origin_municipality_id = $2"
            : " and o.observer_municipality_id = $2 and o.status = 'ACTIVE'"),
        [fireReportId, municipalityId],
      ),
      db.query<{
        id: string;
        recipient_municipality_id: string;
        recipient_municipality_name: string;
        requested_firetrucks: number;
        requested_personnel: number;
        offered_firetrucks: number | null;
        offered_personnel: number | null;
        request_note: string | null;
        response_note: string | null;
        status: AssistanceRequestSummary["status"];
        requested_at: string;
        responded_at: string | null;
        completed_at: string | null;
      }>(
        `select r.id,
                r.recipient_municipality_id,
                m.name as recipient_municipality_name,
                r.requested_firetrucks,
                r.requested_personnel,
                r.offered_firetrucks,
                r.offered_personnel,
                r.request_note,
                r.response_note,
                r.status,
                r.requested_at,
                r.responded_at,
                r.completed_at
           from intermunicipal_assistance_requests r
           join municipalities m on m.id = r.recipient_municipality_id
          where r.fire_report_id = $1
          order by r.requested_at desc`,
        [fireReportId],
      ),
    ]);

    const assistanceMap = new Map<string, AssistanceRequestSummary>();
    const allAssistance: AssistanceRequestSummary[] = assistanceResult.rows.map((row) => {
      const summary: AssistanceRequestSummary = {
        id: row.id,
        recipientMunicipalityId: row.recipient_municipality_id,
        recipientMunicipalityName: row.recipient_municipality_name,
        requestedFiretrucks: row.requested_firetrucks,
        requestedPersonnel: row.requested_personnel,
        offeredFiretrucks: row.offered_firetrucks,
        offeredPersonnel: row.offered_personnel,
        requestNote: row.request_note,
        responseNote: row.response_note,
        status: row.status,
        requestedAt: row.requested_at,
        respondedAt: row.responded_at,
        completedAt: row.completed_at,
      };
      if (["REQUESTED", "ACCEPTED", "PARTIALLY_ACCEPTED"].includes(row.status) && !assistanceMap.has(row.recipient_municipality_id)) {
        assistanceMap.set(row.recipient_municipality_id, summary);
      }
      return summary;
    });

    const rawObservers: NearbyObserver[] = observersResult.rows.map((row) => {
      const activeAssistance = assistanceMap.get(row.observerMunicipalityId);
      let monitoringState: NearbyObserver["monitoringState"] = "WAITING";
      if (activeAssistance) {
        monitoringState = "BACKUP_REQUESTED";
      } else if (row.acknowledgedAt) {
        monitoringState = "SEEN";
      }

      return {
        observerId: row.observerId,
        municipalityId: row.observerMunicipalityId,
        municipalityName: row.observerMunicipalityName,
        stationId: row.stationId,
        stationName: row.stationName,
        distanceMeters: Number(row.distanceMeters),
        status: row.status,
        acknowledgedByUserId: row.acknowledgedByUserId,
        acknowledgedByDisplayName: row.acknowledgedByDisplayName,
        acknowledgedAt: row.acknowledgedAt,
        monitoringState,
        assistanceStatus: activeAssistance?.status ?? null,
      };
    });

    if (accessScope === "OBSERVER") {
      // Scoped projection: return only the signed observer's data
      const scopedObservers = rawObservers.filter((o) => o.municipalityId === municipalityId);
      const scopedAssistance = allAssistance.filter((a) => a.recipientMunicipalityId === municipalityId);
      return {
        observers: scopedObservers,
        assistanceRequests: scopedAssistance,
      };
    }

    return {
      observers: rawObservers,
      assistanceRequests: allAssistance,
    };
  } catch (err: any) {
    if (
      err?.code === "42P01" ||
      err?.message?.includes("incident_municipal_observers") ||
      err?.message?.includes("intermunicipal_assistance_requests")
    ) {
      return {
        observers: [],
        assistanceRequests: [],
      };
    }
    throw err;
  }
}
