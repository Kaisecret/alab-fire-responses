import { getDatabase, withTransaction } from "../db";
import type {
  CreateWaterSourceInput,
  MunicipalWaterSourceRegistry,
  MunicipalityWaterSourceSummary,
  ProvincialWaterSourceRegistry,
  WaterSource,
  WaterSourceSummary,
} from "./types";

type ValidationIssues = Record<string, string>;

export class WaterSourceValidationError extends Error {
  readonly code = "INVALID_WATER_SOURCE_INPUT";
  readonly issues: ValidationIssues;

  constructor(issues: ValidationIssues) {
    super("Check the highlighted water-source fields.");
    this.name = "WaterSourceValidationError";
    this.issues = issues;
  }
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength + 1) : "";
}

function finiteNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateWaterSourceInput(raw: Record<string, unknown>): CreateWaterSourceInput {
  const issues: ValidationIssues = {};
  const sourceKind = raw.sourceKind;
  const quantity = finiteNumber(raw.quantity);
  const exactLocation = cleanText(raw.exactLocation, 500);
  const latitude = finiteNumber(raw.latitude);
  const longitude = finiteNumber(raw.longitude);
  const typeColor = cleanText(raw.typeColor, 120);

  if (sourceKind !== "FIRE_HYDRANT" && sourceKind !== "WATER_SOURCE") {
    issues.sourceKind = "Choose fire hydrant or other water source.";
  }
  if (quantity === null || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    issues.quantity = "Quantity must be a whole number from 1 to 999.";
  }
  if (exactLocation.length < 2 || exactLocation.length > 500) {
    issues.exactLocation = "Enter a location between 2 and 500 characters.";
  }
  if (latitude === null || latitude < 4 || latitude > 22) {
    issues.latitude = "Latitude must be between 4 and 22.";
  }
  if (longitude === null || longitude < 116 || longitude > 127) {
    issues.longitude = "Longitude must be between 116 and 127.";
  }
  if (typeColor.length < 2 || typeColor.length > 120) {
    issues.typeColor = "Enter a type/color between 2 and 120 characters.";
  }

  if (Object.keys(issues).length > 0) throw new WaterSourceValidationError(issues);

  return {
    sourceKind: sourceKind as CreateWaterSourceInput["sourceKind"],
    quantity: quantity as number,
    exactLocation,
    latitude: latitude as number,
    longitude: longitude as number,
    typeColor,
  };
}

export function summarizeWaterSources(sources: WaterSource[]): WaterSourceSummary {
  return sources.reduce<WaterSourceSummary>(
    (summary, source) => {
      summary.sourceCount += 1;
      summary.totalQuantity += source.quantity;
      if (source.sourceKind === "FIRE_HYDRANT") summary.fireHydrantCount += 1;
      else summary.waterSourceCount += 1;
      if (source.recordOrigin === "BFP_LOCATOR_CHART_2018") summary.importedCount += 1;
      else summary.manualCount += 1;
      return summary;
    },
    {
      sourceCount: 0,
      totalQuantity: 0,
      fireHydrantCount: 0,
      waterSourceCount: 0,
      importedCount: 0,
      manualCount: 0,
    },
  );
}

const waterSourceSelect = `
  select ws.id,
         ws.municipality_id as "municipalityId",
         municipality.name as "municipalityName",
         ws.source_kind as "sourceKind",
         ws.quantity,
         ws.exact_location as "exactLocation",
         ws.latitude::float as latitude,
         ws.longitude::float as longitude,
         ws.type_color as "typeColor",
         ws.record_origin as "recordOrigin",
         ws.created_at as "createdAt"
  from water_sources ws
  join municipalities municipality on municipality.id = ws.municipality_id`;

export async function listMunicipalWaterSources(
  municipalityId: string,
): Promise<MunicipalWaterSourceRegistry> {
  const result = await getDatabase().query<WaterSource>(
    `${waterSourceSelect}
     where ws.municipality_id = $1
     order by lower(ws.exact_location), ws.id`,
    [municipalityId],
  );
  const sources = result.rows;
  return {
    municipality: {
      id: municipalityId,
      name: sources[0]?.municipalityName ?? "",
    },
    summary: summarizeWaterSources(sources),
    sources,
  };
}

export async function listProvincialWaterSources(filters?: {
  municipalityId?: string;
}): Promise<ProvincialWaterSourceRegistry> {
  const municipalityId = filters?.municipalityId?.trim() || null;
  const municipalityResult = await getDatabase().query<MunicipalityWaterSourceSummary>(
    `select municipality.id as "municipalityId",
            municipality.name as "municipalityName",
            count(source.id)::int as "sourceCount",
            coalesce(sum(source.quantity), 0)::int as "totalQuantity",
            count(source.id) filter (where source.source_kind = 'FIRE_HYDRANT')::int as "fireHydrantCount",
            count(source.id) filter (where source.source_kind = 'WATER_SOURCE')::int as "waterSourceCount",
            count(source.id) filter (where source.record_origin = 'BFP_LOCATOR_CHART_2018')::int as "importedCount",
            count(source.id) filter (where source.record_origin = 'MUNICIPAL_ENTRY')::int as "manualCount"
       from municipalities municipality
       left join water_sources source on source.municipality_id = municipality.id
      where municipality.province = 'Antique'
        and ($1::uuid is null or municipality.id = $1::uuid)
      group by municipality.id, municipality.name
      order by lower(municipality.name), municipality.id`,
    [municipalityId],
  );
  const sourceResult = await getDatabase().query<WaterSource>(
    `${waterSourceSelect}
     where municipality.province = 'Antique'
       and ($1::uuid is null or ws.municipality_id = $1::uuid)
     order by lower(municipality.name), lower(ws.exact_location), ws.id`,
    [municipalityId],
  );
  return { municipalities: municipalityResult.rows, sources: sourceResult.rows };
}

export async function createMunicipalWaterSource(
  actorUserId: string,
  municipalityId: string,
  raw: Record<string, unknown>,
): Promise<WaterSource> {
  const input = validateWaterSourceInput(raw);
  return withTransaction(async (client) => {
    const inserted = await client.query<WaterSource>(
      `with created as (
         insert into water_sources (
           municipality_id, created_by_user_id, source_kind, quantity,
           exact_location, latitude, longitude, type_color, record_origin
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'MUNICIPAL_ENTRY')
         returning *
       )
       select created.id,
              created.municipality_id as "municipalityId",
              municipality.name as "municipalityName",
              created.source_kind as "sourceKind",
              created.quantity,
              created.exact_location as "exactLocation",
              created.latitude::float as latitude,
              created.longitude::float as longitude,
              created.type_color as "typeColor",
              created.record_origin as "recordOrigin",
              created.created_at as "createdAt"
         from created
         join municipalities municipality on municipality.id = created.municipality_id`,
      [
        municipalityId,
        actorUserId,
        input.sourceKind,
        input.quantity,
        input.exactLocation,
        input.latitude,
        input.longitude,
        input.typeColor,
      ],
    );
    const source = inserted.rows[0];
    if (!source) throw new Error("WATER_SOURCE_CREATE_FAILED");

    await client.query(
      `insert into water_source_events (
         water_source_id, municipality_id, actor_user_id, action, metadata
       ) values ($1, $2, $3, $4, $5::jsonb)`,
      [
        source.id,
        municipalityId,
        actorUserId,
        "CREATED",
        JSON.stringify({
          sourceKind: source.sourceKind,
          quantity: source.quantity,
          exactLocation: source.exactLocation,
          latitude: source.latitude,
          longitude: source.longitude,
          typeColor: source.typeColor,
        }),
      ],
    );
    return source;
  });
}
