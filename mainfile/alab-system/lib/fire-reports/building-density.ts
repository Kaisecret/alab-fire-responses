import type { PoolClient } from "pg";

import type { HouseDensity } from "./types";
import type { SeverityInput } from "./severity";

export const BUILDING_DENSITY_SOURCE = "GOOGLE_OPEN_BUILDINGS_V3_2023_05" as const;

export type BuildingDensityStatus =
  | "DENSE_CLUSTER_DETECTED"
  | "NO_DENSE_CLUSTER_DETECTED"
  | "INSUFFICIENT_DATA";

export type BuildingDensityConfidence = "HIGH" | "MEDIUM" | "UNAVAILABLE";

export type BuildingDensityEvidence = {
  sourceFeatureId: string;
  geometry: Record<string, unknown>;
  sourceConfidence: number;
  distanceToIncidentMeters: number;
};

export type BuildingDensityAssessment = {
  status: BuildingDensityStatus;
  confidence: BuildingDensityConfidence;
  buildingCount: number;
  minimumGapMeters: number | null;
  source: typeof BUILDING_DENSITY_SOURCE | null;
  assessedAt: Date;
  evidence: BuildingDensityEvidence[];
};

type CandidateRow = {
  sourceFeatureId: string;
  geometry: string | Record<string, unknown>;
  sourceConfidence: string | number;
  distanceToIncidentMeters: string | number;
  neighborIds: string[] | string | null;
  minimumNeighborGapMeters: string | number | null;
};

type Candidate = BuildingDensityEvidence & {
  neighborIds: string[];
  minimumNeighborGapMeters: number | null;
};

function insufficientData(assessedAt = new Date()): BuildingDensityAssessment {
  return {
    status: "INSUFFICIENT_DATA",
    confidence: "UNAVAILABLE",
    buildingCount: 0,
    minimumGapMeters: null,
    source: null,
    assessedAt,
    evidence: [],
  };
}

function parseNeighborIds(value: CandidateRow["neighborIds"]): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (!value || value === "{}") return [];
  return value.replace(/^\{|\}$/g, "").split(",").map((id) => id.replace(/^"|"$/g, "")).filter(Boolean);
}

function parseGeometry(value: CandidateRow["geometry"]): Record<string, unknown> | null {
  try {
    const geometry = typeof value === "string" ? JSON.parse(value) : value;
    return geometry && typeof geometry === "object" ? geometry : null;
  } catch {
    return null;
  }
}

function connectedComponents(candidates: Candidate[]): Candidate[][] {
  const byId = new Map(candidates.map((candidate) => [candidate.sourceFeatureId, candidate]));
  const visited = new Set<string>();
  const components: Candidate[][] = [];

  for (const candidate of candidates) {
    if (visited.has(candidate.sourceFeatureId)) continue;
    const component: Candidate[] = [];
    const queue = [candidate.sourceFeatureId];
    visited.add(candidate.sourceFeatureId);

    while (queue.length > 0) {
      const id = queue.shift()!;
      const current = byId.get(id);
      if (!current) continue;
      component.push(current);
      for (const neighborId of current.neighborIds) {
        if (byId.has(neighborId) && !visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

export async function assessBuildingDensity(
  client: Pick<PoolClient, "query">,
  latitude: number,
  longitude: number,
): Promise<BuildingDensityAssessment> {
  const assessedAt = new Date();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return insufficientData(assessedAt);
  }

  try {
    const result = await client.query<CandidateRow>(`
      WITH incident AS (
        SELECT
          extensions.ST_SetSRID(extensions.ST_MakePoint($2, $1), 4326) AS point,
          set_config('statement_timeout', '3000', true)
      ), candidates AS (
        SELECT
          bf.source_feature_id,
          bf.geometry,
          bf.source_confidence,
          extensions.ST_Distance(bf.geometry::extensions.geography, incident.point::extensions.geography) AS incident_distance
        FROM gis.building_footprints bf
        CROSS JOIN incident
        WHERE bf.source_confidence >= 0.75
          AND extensions.ST_DWithin(bf.geometry::extensions.geography, incident.point::extensions.geography, 50)
      )
      SELECT
        candidate.source_feature_id AS "sourceFeatureId",
        extensions.ST_AsGeoJSON(candidate.geometry) AS geometry,
        candidate.source_confidence AS "sourceConfidence",
        candidate.incident_distance AS "distanceToIncidentMeters",
        COALESCE(
          array_agg(neighbor.source_feature_id) FILTER (WHERE neighbor.source_feature_id IS NOT NULL),
          ARRAY[]::text[]
        ) AS "neighborIds",
        MIN(extensions.ST_Distance(candidate.geometry::extensions.geography, neighbor.geometry::extensions.geography))
          FILTER (WHERE neighbor.source_feature_id IS NOT NULL) AS "minimumNeighborGapMeters"
      FROM candidates candidate
      LEFT JOIN candidates neighbor
        ON candidate.source_feature_id <> neighbor.source_feature_id
       AND extensions.ST_DWithin(candidate.geometry::extensions.geography, neighbor.geometry::extensions.geography, 2)
      GROUP BY candidate.source_feature_id, candidate.geometry,
        candidate.source_confidence, candidate.incident_distance
    `, [latitude, longitude]);

    const candidates = result.rows.flatMap((row): Candidate[] => {
      const geometry = parseGeometry(row.geometry);
      const sourceConfidence = Number(row.sourceConfidence);
      const distanceToIncidentMeters = Number(row.distanceToIncidentMeters);
      if (!geometry || !Number.isFinite(sourceConfidence) || !Number.isFinite(distanceToIncidentMeters)) return [];
      const gap = row.minimumNeighborGapMeters == null ? null : Number(row.minimumNeighborGapMeters);
      return [{
        sourceFeatureId: String(row.sourceFeatureId),
        geometry,
        sourceConfidence,
        distanceToIncidentMeters,
        neighborIds: parseNeighborIds(row.neighborIds),
        minimumNeighborGapMeters: gap != null && Number.isFinite(gap) ? gap : null,
      }];
    }).filter((candidate) => candidate.distanceToIncidentMeters <= 30);

    if (candidates.length === 0) return insufficientData(assessedAt);

    const denseComponent = connectedComponents(candidates)
      .find((component) => component.length >= 3
        && component.some((candidate) => candidate.distanceToIncidentMeters <= 15));

    if (!denseComponent) {
      return {
        status: "NO_DENSE_CLUSTER_DETECTED",
        confidence: "MEDIUM",
        buildingCount: candidates.length,
        minimumGapMeters: null,
        source: BUILDING_DENSITY_SOURCE,
        assessedAt,
        evidence: candidates,
      };
    }

    const gaps = denseComponent
      .map((candidate) => candidate.minimumNeighborGapMeters)
      .filter((gap): gap is number => gap != null);
    const minimumGapMeters = gaps.length > 0 ? Math.min(...gaps) : null;
    const isHighConfidence = denseComponent.every((candidate) => candidate.sourceConfidence >= 0.85)
      && Math.min(...denseComponent.map((candidate) => candidate.distanceToIncidentMeters)) <= 5;

    return {
      status: "DENSE_CLUSTER_DETECTED",
      confidence: isHighConfidence ? "HIGH" : "MEDIUM",
      buildingCount: denseComponent.length,
      minimumGapMeters,
      source: BUILDING_DENSITY_SOURCE,
      assessedAt,
      evidence: denseComponent,
    };
  } catch (error) {
    console.warn("Automatic building-density assessment unavailable", error);
    return insufficientData(assessedAt);
  }
}

export function resolveEffectiveHouseDensity(
  reportedDensity: HouseDensity | string | null | undefined,
  detectedStatus: BuildingDensityStatus,
): HouseDensity | null {
  if (detectedStatus === "DENSE_CLUSTER_DETECTED") return "PACKED_MAGKAKADIKIT";
  if (reportedDensity === "PACKED_MAGKAKADIKIT"
    || reportedDensity === "MODERATE_SPACING"
    || reportedDensity === "ISOLATED_FAR") return reportedDensity;
  return null;
}

export function densitySeverityFactors(assessment: BuildingDensityAssessment): string[] {
  if (assessment.status !== "DENSE_CLUSTER_DETECTED") return [];
  const gap = assessment.minimumGapMeters == null
    ? "minimum mapped gap unavailable"
    : `minimum mapped gap ${Number(assessment.minimumGapMeters.toFixed(2))} m`;
  return [
    "Automatic map assessment: dense building cluster detected",
    `${assessment.buildingCount} mapped structures within 30 m; ${gap}`,
    `Google Open Buildings confidence: ${assessment.confidence === "HIGH" ? "High" : "Medium"}`,
  ];
}

export function prepareDensitySeverityContext(
  input: SeverityInput,
  assessment: BuildingDensityAssessment,
) {
  const reportedHouseDensity = input.houseDensity ?? null;
  const effectiveHouseDensity = resolveEffectiveHouseDensity(reportedHouseDensity, assessment.status);
  return {
    reportedHouseDensity,
    effectiveHouseDensity,
    assessment,
    severityInput: { ...input, houseDensity: effectiveHouseDensity },
    densityFactors: densitySeverityFactors(assessment),
  };
}
