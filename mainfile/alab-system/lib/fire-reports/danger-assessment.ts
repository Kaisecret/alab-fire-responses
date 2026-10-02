import type { PoolClient } from "pg";
import { prepareDensitySeverityContext, type BuildingDensityAssessment } from "./building-density.ts";
import { findNearestBuildingDistance } from "./nearest-building-distance.ts";
import { calculateFireSeverity, type SeverityInput } from "./severity.ts";

const VEGETATION_TYPES = new Set(["GRASS", "FOREST"]);

const FIRE_TYPE_LABELS: Record<string, string> = {
  HOUSE_BUILDING: "House/Building",
  GRASS: "Grass",
  FOREST: "Forest",
  VEHICLE: "Vehicle",
  OTHER: "Rubbish",
};

export function fireTypeLabel(fireType: string) {
  return FIRE_TYPE_LABELS[fireType] ?? "Fire";
}

export async function assessReportDanger(
  client: Pick<PoolClient, "query">,
  input: SeverityInput,
  densityAssessment: BuildingDensityAssessment,
  latitude: number,
  longitude: number,
  nearestBuildingDistance?: () => Promise<number | null>,
) {
  const densityContext = prepareDensitySeverityContext(input, densityAssessment);
  const isVegetation = VEGETATION_TYPES.has(input.fireType ?? "");
  const nearestBuildingDistanceMeters = isVegetation
    ? await (nearestBuildingDistance ? nearestBuildingDistance() : findNearestBuildingDistance(client, latitude, longitude))
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

/**
 * Level of Danger when the resident reports more than one kind of fire. Each
 * type is scored with its own model (the structural or vegetation AHP, or the
 * vehicle/rubbish rules) and the highest score is the report's level, so the
 * most dangerous part of the fire decides the response. A tie keeps the
 * resident's earlier pick. The other types are listed as factors.
 */
export async function assessMultiTypeDanger(
  client: Pick<PoolClient, "query">,
  input: Omit<SeverityInput, "fireType">,
  fireTypes: readonly string[],
  densityAssessment: BuildingDensityAssessment,
  latitude: number,
  longitude: number,
) {
  let nearest: Promise<number | null> | null = null;
  const nearestOnce = () => (nearest ??= findNearestBuildingDistance(client, latitude, longitude));
  const scored = [];
  for (const fireType of fireTypes) {
    const result = await assessReportDanger(client, { ...input, fireType }, densityAssessment, latitude, longitude, nearestOnce);
    scored.push({ fireType, ...result });
  }
  if (scored.length === 0) throw new Error("Select what is burning.");
  const winner = scored.reduce((best, item) => (item.assessment.score > best.assessment.score ? item : best));
  if (scored.length === 1) return { primaryFireType: winner.fireType, densityContext: winner.densityContext, assessment: winner.assessment };

  const others = scored.filter((item) => item !== winner);
  const factors = [
    `${fireTypeLabel(winner.fireType)} fire sets the level (highest of ${scored.map((item) => fireTypeLabel(item.fireType)).join(" + ")})`,
    ...winner.assessment.factors,
    ...others.map((item) => `Also burning: ${fireTypeLabel(item.fireType)} fire (${item.assessment.level}, ${item.assessment.score}/100)`),
  ];
  return {
    primaryFireType: winner.fireType,
    densityContext: winner.densityContext,
    assessment: { ...winner.assessment, factors },
  };
}
