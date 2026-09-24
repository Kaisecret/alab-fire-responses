import { getDatabase, withTransaction } from "../db";
import type {
  CreateFireTruckInput,
  FireTruck,
  FireTruckStation,
  FireTruckSummary,
  MunicipalFireTruckRegistry,
  MunicipalityFireTruckSummary,
  ProvincialFireTruckRegistry,
} from "./types";

type ValidationIssues = Record<string, string>;

export class FireTruckValidationError extends Error {
  readonly code = "INVALID_FIRE_TRUCK_INPUT";
  readonly issues: ValidationIssues;

  constructor(issues: ValidationIssues) {
    super("Check the highlighted fire truck fields.");
    this.name = "FireTruckValidationError";
    this.issues = issues;
  }
}

export class FireTruckStationNotFoundError extends Error {
  readonly code = "FIRE_TRUCK_STATION_NOT_FOUND";

  constructor() {
    super("Choose an active station in the selected municipality.");
    this.name = "FireTruckStationNotFoundError";
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set(["SERVICEABLE", "UNSERVICEABLE", "FOR_BER", "BER"]);
const ownerships = new Set(["BFP", "LGU"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength + 1) : "";
}

function optionalInteger(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function todayInManila(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateFireTruckInput(
  raw: Record<string, unknown>,
  now: Date = new Date(),
): CreateFireTruckInput {
  const issues: ValidationIssues = {};
  const municipalityId = cleanText(raw.municipalityId, 36);
  const stationId = cleanText(raw.stationId, 36);
  const make = cleanText(raw.make, 120);
  const capacityGallons = optionalInteger(raw.capacityGallons);
  const manufacturedYear = optionalInteger(raw.manufacturedYear);
  const acquiredOn = cleanText(raw.acquiredOn, 10) || null;
  const operationalStatus = raw.operationalStatus ?? "SERVICEABLE";
  const ownership = raw.ownership ?? "BFP";
  const remarks = cleanText(raw.remarks, 500) || null;
  const today = todayInManila(now);

  if (!uuidPattern.test(municipalityId)) issues.municipalityId = "Choose a municipality.";
  if (!uuidPattern.test(stationId)) issues.stationId = "Choose a station.";
  if (make.length < 2 || make.length > 120) {
    issues.make = "Enter a make between 2 and 120 characters.";
  }
  if (capacityGallons === null || Number.isNaN(capacityGallons) || capacityGallons < 1 || capacityGallons > 20000) {
    issues.capacityGallons = "Capacity must be a whole number of gallons from 1 to 20,000.";
  }
  if (
    manufacturedYear !== null &&
    (Number.isNaN(manufacturedYear) || manufacturedYear < 1950 || manufacturedYear > Number(today.slice(0, 4)) + 1)
  ) {
    issues.manufacturedYear = "Enter a four-digit year model from 1950 onward.";
  }
  if (acquiredOn !== null && (!isCalendarDate(acquiredOn) || acquiredOn > today)) {
    issues.acquiredOn = "Enter a valid acquired date that is not in the future.";
  }
  if (typeof operationalStatus !== "string" || !statuses.has(operationalStatus)) {
    issues.operationalStatus = "Choose serviceable, unserviceable, for BER, or BER.";
  }
  if (typeof ownership !== "string" || !ownerships.has(ownership)) {
    issues.ownership = "Choose BFP or LGU ownership.";
  }
  if (remarks !== null && remarks.length > 500) {
    issues.remarks = "Remarks must be 500 characters or fewer.";
  }

  if (Object.keys(issues).length > 0) throw new FireTruckValidationError(issues);

  return {
    municipalityId,
    stationId,
    make,
    capacityGallons: capacityGallons as number,
    manufacturedYear,
    acquiredOn,
    operationalStatus: operationalStatus as CreateFireTruckInput["operationalStatus"],
    ownership: ownership as CreateFireTruckInput["ownership"],
    remarks,
  };
}

export function summarizeFireTrucks(trucks: FireTruck[]): FireTruckSummary {
  return trucks.reduce<FireTruckSummary>(
    (summary, truck) => {
      summary.truckCount += 1;
      summary.totalCapacityGallons += truck.capacityGallons;
      if (truck.operationalStatus === "SERVICEABLE") summary.serviceableCount += 1;
      else summary.outOfServiceCount += 1;
      return summary;
    },
    { truckCount: 0, serviceableCount: 0, outOfServiceCount: 0, totalCapacityGallons: 0 },
  );
}

const fireTruckColumns = `
  truck.id,
  truck.municipality_id as "municipalityId",
  municipality.name as "municipalityName",
  municipality.income_class as "incomeClass",
  truck.station_id as "stationId",
  station.station_name as "stationName",
  truck.make,
  truck.capacity_gallons as "capacityGallons",
  truck.manufactured_year::int as "manufacturedYear",
  to_char(truck.acquired_on, 'YYYY-MM-DD') as "acquiredOn",
  truck.acquired_precision as "acquiredPrecision",
  truck.acquired_label as "acquiredLabel",
  truck.operational_status as "operationalStatus",
  truck.ownership,
  truck.remarks,
  truck.record_origin as "recordOrigin",
  truck.created_at as "createdAt"`;

const fireTruckSelect = `
  select ${fireTruckColumns}
    from fire_trucks truck
    join municipalities municipality on municipality.id = truck.municipality_id
    join municipal_bfp_stations station on station.id = truck.station_id`;

const fireTruckOrder = `
  order by lower(municipality.name),
           lower(station.station_name),
           truck.import_sequence nulls last,
           truck.created_at,
           truck.id`;

const stationSelect = `
  select station.id,
         station.municipality_id as "municipalityId",
         station.station_name as "stationName"
    from municipal_bfp_stations station
    join municipalities municipality on municipality.id = station.municipality_id
   where station.status = 'ACTIVE'`;

export async function listMunicipalFireTrucks(
  municipalityId: string,
): Promise<MunicipalFireTruckRegistry> {
  const database = getDatabase();
  const [municipality, stations, trucks] = await Promise.all([
    database.query<{ id: string; name: string; incomeClass: string | null }>(
      `select id, name, income_class as "incomeClass" from municipalities where id = $1`,
      [municipalityId],
    ),
    database.query<FireTruckStation>(
      `${stationSelect} and station.municipality_id = $1
       order by lower(station.station_name), station.id`,
      [municipalityId],
    ),
    database.query<FireTruck>(
      `${fireTruckSelect} where truck.municipality_id = $1 ${fireTruckOrder}`,
      [municipalityId],
    ),
  ]);
  return {
    municipality: municipality.rows[0] ?? { id: municipalityId, name: "", incomeClass: null },
    summary: summarizeFireTrucks(trucks.rows),
    stations: stations.rows,
    trucks: trucks.rows,
  };
}

export async function listProvincialFireTrucks(): Promise<ProvincialFireTruckRegistry> {
  const database = getDatabase();
  const [municipalities, stations, trucks] = await Promise.all([
    database.query<MunicipalityFireTruckSummary>(
      `select municipality.id as "municipalityId",
              municipality.name as "municipalityName",
              municipality.income_class as "incomeClass",
              (select count(*)::int from municipal_bfp_stations station
                where station.municipality_id = municipality.id and station.status = 'ACTIVE') as "stationCount",
              count(truck.id)::int as "truckCount",
              count(truck.id) filter (where truck.operational_status = 'SERVICEABLE')::int as "serviceableCount",
              count(truck.id) filter (where truck.operational_status <> 'SERVICEABLE')::int as "outOfServiceCount",
              coalesce(sum(truck.capacity_gallons), 0)::int as "totalCapacityGallons"
         from municipalities municipality
         left join fire_trucks truck on truck.municipality_id = municipality.id
        where municipality.province = 'Antique'
        group by municipality.id, municipality.name, municipality.income_class
        order by lower(municipality.name), municipality.id`,
    ),
    database.query<FireTruckStation>(
      `${stationSelect} and municipality.province = 'Antique'
       order by lower(municipality.name), lower(station.station_name), station.id`,
    ),
    database.query<FireTruck>(
      `${fireTruckSelect} where municipality.province = 'Antique' ${fireTruckOrder}`,
    ),
  ]);
  return { municipalities: municipalities.rows, stations: stations.rows, trucks: trucks.rows };
}

export async function createProvincialFireTruck(
  actorUserId: string,
  raw: Record<string, unknown>,
  now: Date = new Date(),
): Promise<FireTruck> {
  const input = validateFireTruckInput(raw, now);
  return withTransaction(async (client) => {
    const station = await client.query(
      `select station.id
         from municipal_bfp_stations station
         join municipalities municipality on municipality.id = station.municipality_id
        where station.id = $1
          and station.municipality_id = $2
          and station.status = 'ACTIVE'
          and municipality.province = 'Antique'`,
      [input.stationId, input.municipalityId],
    );
    if (station.rows.length === 0) throw new FireTruckStationNotFoundError();

    const inserted = await client.query<FireTruck>(
      `with truck as (
         insert into fire_trucks (
           municipality_id, station_id, make, capacity_gallons, manufactured_year,
           acquired_on, acquired_precision, operational_status, ownership, remarks,
           record_origin, created_by_user_id
         ) values (
           $1, $2, $3, $4, $5,
           $6::date, case when $6::date is null then null else 'DAY' end, $7, $8, $9,
           'PROVINCIAL_ENTRY', $10
         )
         returning *
       )
       select ${fireTruckColumns}
         from truck
         join municipalities municipality on municipality.id = truck.municipality_id
         join municipal_bfp_stations station on station.id = truck.station_id`,
      [
        input.municipalityId,
        input.stationId,
        input.make,
        input.capacityGallons,
        input.manufacturedYear,
        input.acquiredOn,
        input.operationalStatus,
        input.ownership,
        input.remarks,
        actorUserId,
      ],
    );
    const truck = inserted.rows[0];
    if (!truck) throw new Error("FIRE_TRUCK_CREATE_FAILED");

    await client.query(
      `insert into fire_truck_events (
         fire_truck_id, municipality_id, actor_user_id, action, metadata
       ) values ($1, $2, $3, 'CREATED', $4::jsonb)`,
      [truck.id, truck.municipalityId, actorUserId, JSON.stringify(input)],
    );
    return truck;
  });
}
