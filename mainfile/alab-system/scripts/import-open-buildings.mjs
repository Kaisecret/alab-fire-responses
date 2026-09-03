import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

export const ANTIQUE_BOUNDS = { west: 121.25, south: 10.15, east: 122.35, north: 12.2 };
export const DATASET = "GOOGLE_OPEN_BUILDINGS_V3_2023_05";

function coordinatesOf(value, output = []) {
  if (!Array.isArray(value)) return output;
  if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
    output.push([Number(value[0]), Number(value[1])]);
    return output;
  }
  for (const child of value) coordinatesOf(child, output);
  return output;
}

export function normalizeBuildingFeature(feature) {
  if (!feature || feature.type !== "Feature" || !feature.geometry) return null;
  const geometryType = feature.geometry.type;
  if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") return null;
  const coordinates = coordinatesOf(feature.geometry.coordinates);
  if (coordinates.length < 4) return null;
  const confidence = Number(feature.properties?.confidence ?? feature.properties?.source_confidence);
  const sourceFeatureId = String(feature.id ?? feature.properties?.source_feature_id ?? feature.properties?.id ?? "").trim();
  if (!sourceFeatureId || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const intersectsAntique = coordinates.some(([longitude, latitude]) =>
    longitude >= ANTIQUE_BOUNDS.west && longitude <= ANTIQUE_BOUNDS.east
      && latitude >= ANTIQUE_BOUNDS.south && latitude <= ANTIQUE_BOUNDS.north);
  if (!intersectsAntique) return { skipped: true };
  return {
    sourceFeatureId,
    sourceConfidence: confidence,
    geometry: geometryType === "Polygon"
      ? { type: "MultiPolygon", coordinates: [feature.geometry.coordinates] }
      : { type: "MultiPolygon", coordinates: feature.geometry.coordinates },
  };
}

async function* readFeatures(file) {
  if (/\.(?:ndjson|geojsonl)$/i.test(file)) {
    const lines = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        yield null;
      }
    }
    return;
  }
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (parsed?.type === "FeatureCollection" && Array.isArray(parsed.features)) {
    yield* parsed.features;
  } else {
    yield parsed;
  }
}

export async function importBuildingFootprints({ file, dryRun = false, writer }) {
  const summary = { imported: 0, updated: 0, skipped: 0, rejected: 0 };
  const seen = new Set();
  for await (const rawFeature of readFeatures(file)) {
    const feature = normalizeBuildingFeature(rawFeature);
    if (!feature) {
      summary.rejected += 1;
      continue;
    }
    if (feature.skipped || seen.has(feature.sourceFeatureId)) {
      summary.skipped += 1;
      continue;
    }
    seen.add(feature.sourceFeatureId);
    if (dryRun) {
      summary.imported += 1;
      continue;
    }
    const outcome = await writer(feature);
    summary[outcome === "updated" ? "updated" : "imported"] += 1;
  }
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--file");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : "";
  const dryRun = args.includes("--dry-run");
  if (!file) throw new Error("Usage: npm run gis:import-buildings -- --file <extract.geojson|extract.ndjson> [--dry-run]");

  let pool;
  let writer = async () => "imported";
  if (!dryRun) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required outside dry-run mode.");
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    writer = async (feature) => {
      const result = await pool.query(
        `insert into gis.building_footprints
          (source_feature_id, geometry, source_confidence, source_dataset, imported_at)
         values ($1, extensions.ST_Multi(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON($2), 4326)), $3, $4, now())
         on conflict (source_feature_id) do update set
           geometry = excluded.geometry,
           source_confidence = excluded.source_confidence,
           source_dataset = excluded.source_dataset,
           imported_at = excluded.imported_at
         returning (xmax = 0) as inserted`,
        [feature.sourceFeatureId, JSON.stringify(feature.geometry), feature.sourceConfidence, DATASET],
      );
      return result.rows[0]?.inserted ? "imported" : "updated";
    };
  }

  try {
    const summary = await importBuildingFootprints({ file: resolve(file), dryRun, writer });
    process.stdout.write(`${JSON.stringify({ dryRun, ...summary })}\n`);
  } finally {
    await pool?.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
