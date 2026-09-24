import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

const hamticId = "0b8f2f4e-6a3b-4c1d-9e2f-1a2b3c4d5e6f";
const stationId = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const now = new Date("2026-09-24T02:00:00Z");

function loadService(database) {
  return loadServerModule("lib/fire-trucks/service.ts", {
    "../db": {
      getDatabase: () => database,
      withTransaction: async (work) => work(database),
    },
  });
}

function validInput(overrides = {}) {
  return {
    municipalityId: hamticId,
    stationId,
    make: "  Isuzu FVR34  ",
    capacityGallons: "1000",
    manufacturedYear: "2023",
    acquiredOn: "2024-03-15",
    operationalStatus: "SERVICEABLE",
    ownership: "BFP",
    remarks: "  ",
    ...overrides,
  };
}

test("fire truck validation normalizes a provincial entry", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  assert.deepEqual(service.validateFireTruckInput(validInput(), now), {
    municipalityId: hamticId,
    stationId,
    make: "Isuzu FVR34",
    capacityGallons: 1000,
    manufacturedYear: 2023,
    acquiredOn: "2024-03-15",
    operationalStatus: "SERVICEABLE",
    ownership: "BFP",
    remarks: null,
  });
});

test("fire truck validation allows unknown year model and acquired date", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  const input = service.validateFireTruckInput(validInput({ manufacturedYear: "", acquiredOn: "" }), now);
  assert.equal(input.manufacturedYear, null);
  assert.equal(input.acquiredOn, null);
});

test("fire truck validation rejects bad values with field issues", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  assert.throws(
    () => service.validateFireTruckInput(validInput({
      municipalityId: "hamtic",
      stationId: "",
      make: "x",
      capacityGallons: "12.5",
      manufacturedYear: "23",
      acquiredOn: "2026-02-30",
      operationalStatus: "BROKEN",
      ownership: "PRIVATE",
    }), now),
    (error) => {
      assert.equal(error.name, "FireTruckValidationError");
      assert.deepEqual(Object.keys(error.issues).sort(), [
        "acquiredOn", "capacityGallons", "make", "manufacturedYear",
        "municipalityId", "operationalStatus", "ownership", "stationId",
      ]);
      return true;
    },
  );
});

test("fire truck validation rejects an acquired date in the future", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  assert.throws(
    () => service.validateFireTruckInput(validInput({ acquiredOn: "2026-09-25" }), now),
    (error) => Boolean(error.issues?.acquiredOn),
  );
  assert.equal(service.validateFireTruckInput(validInput({ acquiredOn: "2026-09-24" }), now).acquiredOn, "2026-09-24");
});

test("fire truck summary separates serviceable and out-of-service trucks", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  assert.deepEqual(service.summarizeFireTrucks([
    { capacityGallons: 1000, operationalStatus: "SERVICEABLE" },
    { capacityGallons: 2500, operationalStatus: "UNSERVICEABLE" },
    { capacityGallons: 1000, operationalStatus: "BER" },
  ]), { truckCount: 3, serviceableCount: 1, outOfServiceCount: 2, totalCapacityGallons: 4500 });
});

test("provincial create refuses a station outside the chosen municipality", async () => {
  const queries = [];
  const service = loadService({
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [] };
    },
  });
  await assert.rejects(
    service.createProvincialFireTruck("provincial-1", validInput(), now),
    (error) => error.name === "FireTruckStationNotFoundError",
  );
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /station\.municipality_id = \$2/);
  assert.match(queries[0].sql, /station\.status = 'ACTIVE'/);
  assert.deepEqual(queries[0].params, [stationId, hamticId]);
});

test("provincial create records the truck and an audit event", async () => {
  const queries = [];
  const created = { id: "truck-1", municipalityId: hamticId, stationId, make: "Isuzu FVR34" };
  const service = loadService({
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (queries.length === 1) return { rows: [{ id: stationId }] };
      if (queries.length === 2) return { rows: [created] };
      return { rows: [] };
    },
  });
  const truck = await service.createProvincialFireTruck("provincial-1", validInput(), now);
  assert.equal(truck, created);
  assert.match(queries[1].sql, /'PROVINCIAL_ENTRY'/);
  assert.equal(queries[1].params.at(-1), "provincial-1");
  assert.match(queries[2].sql, /insert into fire_truck_events/);
  assert.deepEqual(queries[2].params.slice(0, 3), ["truck-1", hamticId, "provincial-1"]);
});

test("municipal fire truck route is read-only and provincial route can add", () => {
  const municipal = readFileSync("app/api/municipal-bfp/fire-trucks/route.ts", "utf8");
  const provincial = readFileSync("app/api/provincial-bfp/fire-trucks/route.ts", "utf8");
  assert.match(municipal, /export async function GET/);
  assert.doesNotMatch(municipal, /export async function (POST|PATCH|PUT|DELETE)/);
  assert.match(provincial, /export async function POST/);
  assert.match(provincial, /requireProvincialBfp/);
});
