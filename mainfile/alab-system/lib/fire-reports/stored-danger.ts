import type { PoolClient } from "pg";

import type { BuildingDensityAssessment, BuildingDensityConfidence, BuildingDensityStatus } from "./building-density.ts";
import { assessMultiTypeDanger } from "./danger-assessment.ts";

/** The saved details a report's Level of Danger is scored from. */
export type StoredDangerRow = {
  fire_type: string; fire_types: string[] | null; structure_material: string | null; house_density: string | null;
  latitude: string; longitude: string;
  reported_house_density: string | null; detected_building_density: BuildingDensityStatus;
  building_density_confidence: BuildingDensityConfidence; building_density_building_count: number | null;
  building_density_minimum_gap_meters: string | null; building_density_source: string | null;
  building_density_assessed_at: Date | string | null;
  route_accessibility: string | null; weather_wind_speed: string | null; weather_wind_direction: string | null;
  weather_temperature: string | null; weather_humidity: string | null;
};

export const STORED_DANGER_COLUMNS = `fr.fire_type, fr.fire_types, fr.structure_material, fr.reported_house_density, fr.house_density,
       fr.latitude, fr.longitude,
       fr.detected_building_density, fr.building_density_confidence, fr.building_density_building_count,
       fr.building_density_minimum_gap_meters, fr.building_density_source, fr.building_density_assessed_at,
       fr.route_accessibility,
       fr.weather_wind_speed, fr.weather_wind_direction, fr.weather_temperature, fr.weather_humidity`;

/**
 * Scores a saved report again without new GIS or weather lookups. Changed
 * details override the saved ones.
 */
export function rescoreStoredReport(
  client: Pick<PoolClient, "query">,
  row: StoredDangerRow,
  changes: { structureMaterial: string | null; houseDensity: string | null; routeAccessibility: string | null; fireTypes: readonly string[] },
) {
  const densityAssessment: BuildingDensityAssessment = {
    status: row.detected_building_density ?? "INSUFFICIENT_DATA" as BuildingDensityStatus,
    confidence: row.building_density_confidence ?? "UNAVAILABLE" as BuildingDensityConfidence,
    buildingCount: row.building_density_building_count ?? 0,
    minimumGapMeters: row.building_density_minimum_gap_meters == null ? null : Number(row.building_density_minimum_gap_meters),
    source: row.building_density_source === "GOOGLE_OPEN_BUILDINGS_V3_2023_05"
      ? "GOOGLE_OPEN_BUILDINGS_V3_2023_05"
      : null,
    assessedAt: row.building_density_assessed_at ? new Date(row.building_density_assessed_at) : new Date(),
    evidence: [],
  };
  return assessMultiTypeDanger(client, {
    structureMaterial: changes.structureMaterial,
    houseDensity: changes.houseDensity,
    routeAccessibility: changes.routeAccessibility,
    windSpeedKph: row.weather_wind_speed != null ? Number(row.weather_wind_speed) : undefined,
    windDirectionDeg: row.weather_wind_direction != null ? Number(row.weather_wind_direction) : undefined,
    temperatureC: row.weather_temperature != null ? Number(row.weather_temperature) : undefined,
    relativeHumidity: row.weather_humidity != null ? Number(row.weather_humidity) : undefined,
  }, changes.fireTypes, densityAssessment, Number(row.latitude), Number(row.longitude));
}

/** The fire types a report was saved with, for rows from before multi-type reports. */
export function storedFireTypes(row: Pick<StoredDangerRow, "fire_type" | "fire_types">) {
  return row.fire_types?.length ? row.fire_types : [row.fire_type];
}
