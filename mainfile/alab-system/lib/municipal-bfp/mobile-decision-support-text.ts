import { buildResponseGuidance } from "../fire-reports/response-guidance.ts";
import { formatStationDistance, rankStationsForIncident, type NearestStationCandidate } from "./nearest-station.ts";

// Decision support sized for a responder's phone: what the resident saw at
// the scene, the first few steps, and which of the town's stations is
// nearest when there is more than one. The municipal screen shows the full
// version; this is the same advice, shortened.

export type MobileDecisionSupport = {
  /** What was reported at the scene, e.g. "Wood / nipa house". */
  scene: string[];
  /** The first steps, as short instructions. */
  actions: string[];
  /** The town's nearest station, only when the town has two or more. */
  recommendedStation: { name: string; distance: string; isYourStation: boolean } | null;
};

export type MobileDecisionReport = {
  latitude: number;
  longitude: number;
  fireType: string;
  fireTypes: string[] | null;
  structureMaterial: string | null;
  houseDensity: string | null;
  routeAccessibility: string | null;
  windSpeed: number | string | null;
  windDirection: number | string | null;
  temperature: number | string | null;
  humidity: number | string | null;
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
  factors: string[] | null;
};

const MAX_ACTIONS = 4;
const STRONG_WIND_KMH = 25;

const MATERIAL_TEXT: Record<string, string> = {
  LIGHT_MATERIALS: "Wood / nipa house",
  MIXED_SEMI_CONCRETE: "Semi-concrete house",
  CONCRETE: "Concrete house",
  COMMERCIAL_STORAGE: "Storage / flammable goods inside",
  LIGHT_WITH_FLAMMABLE: "Wood / nipa house with flammable goods",
  MIXED_WITH_FLAMMABLE: "Semi-concrete house with flammable goods",
};

const ROUTE_TEXT: Record<string, string> = {
  INTERIOR_ALLEY_ESKINITA: "Narrow alley: truck may not enter",
  NARROW_STREET: "Narrow street",
  DEAD_END_OR_BLOCKED: "Road blocked or dead-end",
};

export function sceneSummary(report: MobileDecisionReport): string[] {
  const types = report.fireTypes?.length ? report.fireTypes : [report.fireType];
  const scene: string[] = [];
  if (types.includes("HOUSE_BUILDING")) {
    scene.push(report.structureMaterial ? MATERIAL_TEXT[report.structureMaterial] ?? "House material not reported" : "House material not reported");
  }
  if (report.houseDensity === "PACKED_MAGKAKADIKIT") scene.push("Houses close together");
  if (report.routeAccessibility && ROUTE_TEXT[report.routeAccessibility]) scene.push(ROUTE_TEXT[report.routeAccessibility]);
  const wind = Number(report.windSpeed);
  if (Number.isFinite(wind) && wind >= STRONG_WIND_KMH) scene.push(`Strong wind ${Math.round(wind)} km/h`);
  return scene;
}

export function buildMobileDecisionSupport(
  report: MobileDecisionReport,
  stations: readonly NearestStationCandidate[],
  assignedStationId: string | null,
): MobileDecisionSupport {
  const actions = buildResponseGuidance({
    level: report.level,
    fireType: report.fireType,
    fireTypes: report.fireTypes,
    houseDensity: report.houseDensity,
    structureMaterial: report.structureMaterial,
    routeAccessibility: report.routeAccessibility,
    windSpeedKmh: report.windSpeed,
    windDirectionDeg: report.windDirection,
    temperatureC: report.temperature,
    humidity: report.humidity,
    factors: report.factors,
  }).slice(0, MAX_ACTIONS).map((action) => action.title);

  // A crew summoned from another town is not choosing among these stations,
  // and a town with one station has none to choose.
  const ownTown = assignedStationId !== null && stations.some((station) => station.id === assignedStationId);
  const recommended = ownTown && stations.length > 1
    ? rankStationsForIncident({ ...report, calculatedSeverity: report.level }, stations)?.find((station) => station.recommended) ?? null
    : null;

  return {
    scene: sceneSummary(report),
    actions,
    recommendedStation: recommended
      ? {
        name: recommended.displayName,
        distance: formatStationDistance(recommended.distanceMeters),
        isYourStation: recommended.id === assignedStationId,
      }
      : null,
  };
}
