import type { PoolClient } from "pg";
import { prepareDensitySeverityContext, type BuildingDensityAssessment } from "./building-density.ts";
import { findNearestBuildingDistance } from "./nearest-building-distance.ts";
import { calculateFireSeverity, type SeverityInput } from "./severity.ts";

export async function assessReportDanger(
  client: Pick<PoolClient, "query">,
  input: SeverityInput,
  densityAssessment: BuildingDensityAssessment,
  latitude: number,
  longitude: number,
) {
  const densityContext = prepareDensitySeverityContext(input, densityAssessment);
  const isVegetation = input.fireType === "GRASS" || input.fireType === "FOREST";
  const nearestBuildingDistanceMeters = isVegetation
    ? await findNearestBuildingDistance(client, latitude, longitude)
    : null;
  const baseAssessment = calculateFireSeverity({
    ...densityContext.severityInput,
    nearestBuildingDistanceMeters,
  });
  return {
    densityContext,
    assessment: {
      ...baseAssessment,
      factors: isVegetation ? baseAssessment.factors : [...baseAssessment.factors, ...densityContext.densityFactors],
    },
  };
}
