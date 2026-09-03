import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ELIGIBLE_REPORT_WHERE = "report_source = 'ALAB_APP' and detected_building_density is null";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for density backfill.");
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const [{ Pool }, densityModule, severityModule] = await Promise.all([
    import("pg"),
    import("../lib/fire-reports/building-density.ts"),
    import("../lib/fire-reports/severity.ts"),
  ]);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const summary = { assessed: 0, dense: 0, insufficient: 0, failed: 0 };
  try {
    const eligible = await pool.query(
      `select id, latitude::float as latitude, longitude::float as longitude,
              fire_type, structure_material, reported_house_density, house_density,
              route_accessibility, weather_wind_speed, weather_wind_direction,
              weather_temperature, weather_humidity
         from fire_reports where ${ELIGIBLE_REPORT_WHERE}
        order by id limit 1000`,
    );
    for (const report of eligible.rows) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const assessment = await densityModule.assessBuildingDensity(client, report.latitude, report.longitude);
        const context = densityModule.prepareDensitySeverityContext({
          fireType: report.fire_type,
          structureMaterial: report.structure_material,
          houseDensity: report.reported_house_density ?? report.house_density,
          routeAccessibility: report.route_accessibility,
          windSpeedKph: report.weather_wind_speed == null ? undefined : Number(report.weather_wind_speed),
          windDirectionDeg: report.weather_wind_direction == null ? undefined : Number(report.weather_wind_direction),
          temperatureC: report.weather_temperature == null ? undefined : Number(report.weather_temperature),
          relativeHumidity: report.weather_humidity == null ? undefined : Number(report.weather_humidity),
        }, assessment);
        const baseSeverity = severityModule.calculateFireSeverity(context.severityInput);
        if (!dryRun) {
          await client.query(
            `update fire_reports set reported_house_density = $1, house_density = $2,
                    detected_building_density = $3, building_density_confidence = $4,
                    building_density_building_count = $5, building_density_minimum_gap_meters = $6,
                    building_density_source = $7, building_density_assessed_at = $8,
                    calculated_severity = $9, severity_score = $10, severity_factors = $11, updated_at = now()
              where id = $12 and detected_building_density is null`,
            [context.reportedHouseDensity, context.effectiveHouseDensity, assessment.status, assessment.confidence,
              assessment.buildingCount, assessment.minimumGapMeters, assessment.source, assessment.assessedAt,
              baseSeverity.level, baseSeverity.score, JSON.stringify([...baseSeverity.factors, ...context.densityFactors]), report.id],
          );
          for (const evidence of assessment.evidence) {
            await client.query(
              `insert into gis.fire_report_density_evidence
                (fire_report_id, source_feature_id, geometry, source_confidence, distance_to_incident_meters)
               values ($1, $2, extensions.ST_Multi(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON($3), 4326)), $4, $5)
               on conflict (fire_report_id, source_feature_id) do nothing`,
              [report.id, evidence.sourceFeatureId, JSON.stringify(evidence.geometry), evidence.sourceConfidence, evidence.distanceToIncidentMeters],
            );
          }
        }
        await client.query(dryRun ? "rollback" : "commit");
        summary.assessed += 1;
        if (assessment.status === "DENSE_CLUSTER_DETECTED") summary.dense += 1;
        if (assessment.status === "INSUFFICIENT_DATA") summary.insufficient += 1;
      } catch (error) {
        await client.query("rollback");
        summary.failed += 1;
        process.stderr.write(`Backfill failed for report ${report.id}: ${error instanceof Error ? error.message : String(error)}\n`);
      } finally {
        client.release();
      }
    }
    process.stdout.write(`${JSON.stringify({ dryRun, ...summary })}\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
