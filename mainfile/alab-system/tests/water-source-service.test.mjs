import assert from "node:assert/strict";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

function loadService(database) {
  return loadServerModule("lib/water-sources/service.ts", {
    "../db": {
      getDatabase: () => database,
      withTransaction: async (work) => work(database),
    },
  });
}

test("water-source validation preserves coordinate precision and normalizes fields", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  const input = service.validateWaterSourceInput({
    sourceKind: "FIRE_HYDRANT",
    quantity: "2",
    exactLocation: "  Hamtic Municipal Hall  ",
    latitude: "10.7013427",
    longitude: "121.9817124",
    typeColor: "  Wet Barrel / Red  ",
  });

  assert.deepEqual(input, {
    sourceKind: "FIRE_HYDRANT",
    quantity: 2,
    exactLocation: "Hamtic Municipal Hall",
    latitude: 10.7013427,
    longitude: 121.9817124,
    typeColor: "Wet Barrel / Red",
  });
});

test("water-source validation removes trailing hydrant-size notation without removing color", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });
  const common = {
    sourceKind: "FIRE_HYDRANT",
    quantity: 1,
    exactLocation: "Poblacion 2",
    latitude: 10.7011186,
    longitude: 121.9817536,
  };

  const sized = service.validateWaterSourceInput({ ...common, typeColor: 'Wet Barrel / 2"' });
  const colored = service.validateWaterSourceInput({ ...common, typeColor: "Wet Barrel/Red" });

  assert.equal(sized.typeColor, "Wet Barrel");
  assert.equal(colored.typeColor, "Wet Barrel/Red");
});

test("water-source validation rejects blank, out-of-range, and unsupported values", () => {
  const service = loadService({ query: async () => ({ rows: [] }) });

  assert.throws(
    () =>
      service.validateWaterSourceInput({
        sourceKind: "RIVER",
        quantity: 0,
        exactLocation: " ",
        latitude: 23,
        longitude: 114,
        typeColor: " ",
      }),
    (error) => {
      assert.equal(error.code, "INVALID_WATER_SOURCE_INPUT");
      assert.deepEqual(Object.keys(error.issues).sort(), [
        "exactLocation",
        "latitude",
        "longitude",
        "quantity",
        "sourceKind",
        "typeColor",
      ]);
      return true;
    },
  );
});

test("creation uses authenticated ownership and writes its audit atomically", async () => {
  const calls = [];
  const database = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/insert into water_sources/i.test(sql)) {
        return {
          rows: [
            {
              id: "source-1",
              municipalityId: "hamtic-id",
              municipalityName: "Hamtic",
              sourceKind: "FIRE_HYDRANT",
              quantity: 1,
              exactLocation: "Municipal Hall",
              latitude: 10.7,
              longitude: 121.98,
              typeColor: "Wet Barrel",
              recordOrigin: "MUNICIPAL_ENTRY",
              createdAt: new Date("2026-09-23T00:00:00.000Z"),
            },
          ],
        };
      }
      return { rows: [] };
    },
  };
  const service = loadService(database);

  const created = await service.createMunicipalWaterSource(
    "actor-1",
    "hamtic-id",
    {
      municipalityId: "other-id",
      sourceKind: "FIRE_HYDRANT",
      quantity: 1,
      exactLocation: "Municipal Hall",
      latitude: 10.7,
      longitude: 121.98,
      typeColor: "Wet Barrel",
    },
  );

  assert.equal(created.municipalityId, "hamtic-id");
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /insert into water_sources/i);
  assert.deepEqual(calls[0].params.slice(0, 2), ["hamtic-id", "actor-1"]);
  assert.ok(calls.every((call) => !call.params?.includes("other-id")));
  assert.match(calls[1].sql, /insert into water_source_events/i);
  assert.deepEqual(calls[1].params.slice(0, 4), [
    "source-1",
    "hamtic-id",
    "actor-1",
    "CREATED",
  ]);
});

test("municipal reads derive totals from only the scoped rows", async () => {
  const database = {
    query: async (_sql, params) => {
      assert.deepEqual(params, ["hamtic-id"]);
      return {
        rows: [
          {
            id: "one",
            municipalityId: "hamtic-id",
            municipalityName: "Hamtic",
            sourceKind: "FIRE_HYDRANT",
            quantity: 1,
            exactLocation: "Poblacion 2",
            latitude: 10.7011186,
            longitude: 121.9817536,
            typeColor: "Wet Barrel / 2\"",
            recordOrigin: "BFP_LOCATOR_CHART_2018",
            createdAt: new Date("2026-09-23T00:00:00.000Z"),
          },
          {
            id: "two",
            municipalityId: "hamtic-id",
            municipalityName: "Hamtic",
            sourceKind: "FIRE_HYDRANT",
            quantity: 1,
            exactLocation: "Poblacion 3",
            latitude: 10.7013427,
            longitude: 121.9817124,
            typeColor: "Wet Barrel / 2\"",
            recordOrigin: "BFP_LOCATOR_CHART_2018",
            createdAt: new Date("2026-09-23T00:00:00.000Z"),
          },
        ],
      };
    },
  };
  const service = loadService(database);
  const registry = await service.listMunicipalWaterSources("hamtic-id");

  assert.equal(registry.municipality.name, "Hamtic");
  assert.equal(registry.sources.length, 2);
  assert.deepEqual(registry.summary, {
    sourceCount: 2,
    totalQuantity: 2,
    fireHydrantCount: 2,
    waterSourceCount: 0,
    importedCount: 2,
    manualCount: 0,
  });
});

test("provincial reads include zero-count municipalities and honor the filter", async () => {
  const calls = [];
  const database = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/group by municipality\.id/i.test(sql)) {
        return {
          rows: [
            {
              municipalityId: "lauaan-id",
              municipalityName: "Laua-an",
              sourceCount: 0,
              totalQuantity: 0,
              fireHydrantCount: 0,
              waterSourceCount: 0,
              importedCount: 0,
              manualCount: 0,
            },
          ],
        };
      }
      return { rows: [] };
    },
  };
  const service = loadService(database);

  const registry = await service.listProvincialWaterSources({
    municipalityId: "lauaan-id",
  });

  assert.equal(registry.municipalities[0].municipalityName, "Laua-an");
  assert.equal(registry.municipalities[0].sourceCount, 0);
  assert.deepEqual(registry.sources, []);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.params[0] === "lauaan-id"));
  assert.ok(calls.every((call) => call.sql.includes("municipality.province = 'Antique'")));
});
