import "server-only";

import { getDatabase } from "../db";
import { listDispatchableStations, type DispatchableStation } from "./dispatch";
import { buildMobileDecisionSupport, type MobileDecisionReport, type MobileDecisionSupport } from "./mobile-decision-support-text";

type ReportRow = MobileDecisionReport & {
  recipientId: string;
  assignedStationId: string | null;
  municipalityId: string | null;
};

/**
 * Adds the shortened decision support to each assignment sent to the BFP
 * mobile app. Advice is extra: if it cannot be built, the assignment still
 * goes out without it rather than the responder losing the incident.
 */
export async function addMobileDecisionSupport<T extends { recipientId: string }>(
  assignments: T[],
): Promise<Array<T & { decisionSupport: MobileDecisionSupport | null }>> {
  if (assignments.length === 0) return [];
  try {
    const result = await getDatabase().query<ReportRow>(
      `select recipient.id as "recipientId", station.station_id as "assignedStationId",
              report.municipality_id as "municipalityId",
              report.latitude::float as latitude, report.longitude::float as longitude,
              report.fire_type as "fireType", report.fire_types as "fireTypes",
              report.structure_material as "structureMaterial", report.house_density as "houseDensity",
              report.route_accessibility as "routeAccessibility",
              report.weather_wind_speed as "windSpeed", report.weather_wind_direction as "windDirection",
              report.weather_temperature as temperature, report.weather_humidity as humidity,
              report.calculated_severity as level, report.severity_factors as factors
         from incident_dispatch_recipients recipient
         join incident_dispatch_stations station on station.id = recipient.dispatch_station_id
         join incident_dispatches d on d.id = recipient.dispatch_id
         join fire_reports report on report.id = d.fire_report_id
        where recipient.id = any($1::uuid[])`,
      [assignments.map((assignment) => assignment.recipientId)],
    );
    const reports = new Map(result.rows.map((row) => [row.recipientId, row]));
    const stationsByTown = new Map<string, DispatchableStation[]>();
    for (const row of result.rows) {
      if (row.municipalityId && !stationsByTown.has(row.municipalityId)) {
        stationsByTown.set(row.municipalityId, await listDispatchableStations(row.municipalityId));
      }
    }
    return assignments.map((assignment) => {
      const report = reports.get(assignment.recipientId);
      if (!report) return { ...assignment, decisionSupport: null };
      const stations = report.municipalityId ? stationsByTown.get(report.municipalityId) ?? [] : [];
      return { ...assignment, decisionSupport: buildMobileDecisionSupport(report, stations, report.assignedStationId) };
    });
  } catch (error) {
    console.error("Mobile decision support unavailable", error);
    return assignments.map((assignment) => ({ ...assignment, decisionSupport: null }));
  }
}
