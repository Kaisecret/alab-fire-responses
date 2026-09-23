import assert from "node:assert/strict";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

class FakeNextResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
  }

  static json(body, init) {
    return new FakeNextResponse(body, init);
  }
}

const nextServer = { NextResponse: FakeNextResponse };

test("municipal GET returns only the registry resolved from the signed identity", async () => {
  let requestedMunicipality = "";
  const registry = {
    municipality: { id: "hamtic-id", name: "" },
    summary: { sourceCount: 2 },
    sources: [{ id: "one" }, { id: "two" }],
  };
  const route = loadServerModule("app/api/municipal-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/municipal-bfp/auth": {
      requireMunicipalBfp: async () => ({
        municipalityId: "hamtic-id",
        municipalityName: "Hamtic",
      }),
      requireMunicipalAdmin: async () => {
        throw new Error("POST guard should not run for GET");
      },
      isAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listMunicipalWaterSources: async (municipalityId) => {
        requestedMunicipality = municipalityId;
        return registry;
      },
      createMunicipalWaterSource: async () => {
        throw new Error("create should not run for GET");
      },
      WaterSourceValidationError: class extends Error {},
    },
  });

  const response = await route.GET({});

  assert.equal(requestedMunicipality, "hamtic-id");
  assert.equal(response.status, 200);
  assert.equal(response.body.municipality.name, "Hamtic");
  assert.equal(response.body.sources.length, 2);
});

test("municipal POST assigns actor and municipality from the admin identity", async () => {
  let creation;
  const route = loadServerModule("app/api/municipal-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/municipal-bfp/auth": {
      requireMunicipalBfp: async () => {
        throw new Error("GET guard should not run for POST");
      },
      requireMunicipalAdmin: async () => ({
        userId: "admin-1",
        municipalityId: "hamtic-id",
      }),
      isAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listMunicipalWaterSources: async () => ({ sources: [] }),
      createMunicipalWaterSource: async (actorUserId, municipalityId, raw) => {
        creation = { actorUserId, municipalityId, raw };
        return { id: "created-1", municipalityId };
      },
      WaterSourceValidationError: class extends Error {},
    },
  });
  const request = {
    json: async () => ({
      municipalityId: "other-id",
      sourceKind: "FIRE_HYDRANT",
      quantity: 1,
      exactLocation: "Hamtic Municipal Hall",
      latitude: 10.7,
      longitude: 121.98,
      typeColor: "Wet Barrel",
    }),
  };

  const response = await route.POST(request);

  assert.equal(response.status, 201);
  assert.deepEqual(
    { actorUserId: creation.actorUserId, municipalityId: creation.municipalityId },
    { actorUserId: "admin-1", municipalityId: "hamtic-id" },
  );
  assert.equal(response.body.source.id, "created-1");
});

test("municipal POST maps duplicate sites to a safe conflict", async () => {
  const route = loadServerModule("app/api/municipal-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/municipal-bfp/auth": {
      requireMunicipalBfp: async () => ({}),
      requireMunicipalAdmin: async () => ({ userId: "admin-1", municipalityId: "hamtic-id" }),
      isAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listMunicipalWaterSources: async () => ({ sources: [] }),
      createMunicipalWaterSource: async () => Object.assign(new Error("private SQL"), { code: "23505" }),
      WaterSourceValidationError: class extends Error {},
    },
  });
  route.POST = loadServerModule("app/api/municipal-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/municipal-bfp/auth": {
      requireMunicipalBfp: async () => ({}),
      requireMunicipalAdmin: async () => ({ userId: "admin-1", municipalityId: "hamtic-id" }),
      isAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listMunicipalWaterSources: async () => ({ sources: [] }),
      createMunicipalWaterSource: async () => {
        throw Object.assign(new Error("private SQL"), { code: "23505" });
      },
      WaterSourceValidationError: class extends Error {},
    },
  }).POST;

  const response = await route.POST({ json: async () => ({}) });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, "A water source already exists at this location.");
  assert.equal(JSON.stringify(response.body).includes("private SQL"), false);
});

test("provincial GET passes only a validated optional municipality filter", async () => {
  let filters;
  const route = loadServerModule("app/api/provincial-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/provincial-bfp/auth": {
      requireProvincialBfp: async () => ({ userId: "province-1" }),
      isProvincialAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listProvincialWaterSources: async (value) => {
        filters = value;
        return { municipalities: [{ municipalityName: "Hamtic" }], sources: [] };
      },
    },
  });

  const response = await route.GET({ url: "http://localhost/api/provincial-bfp/water-sources?municipalityId=a4ba607b-8863-4f0f-bcaf-a86beb0acb29" });

  assert.equal(response.status, 200);
  assert.deepEqual(filters, { municipalityId: "a4ba607b-8863-4f0f-bcaf-a86beb0acb29" });
  assert.equal(response.body.municipalities[0].municipalityName, "Hamtic");
});

test("municipal PATCH scopes edits to the signed municipal admin", async () => {
  let update;
  const route = loadServerModule("app/api/municipal-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/municipal-bfp/auth": {
      requireMunicipalBfp: async () => ({}),
      requireMunicipalAdmin: async () => ({ userId: "admin-1", municipalityId: "hamtic-id" }),
      isAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listMunicipalWaterSources: async () => ({ sources: [] }),
      createMunicipalWaterSource: async () => ({}),
      updateMunicipalWaterSource: async (...args) => { update = args; return { id: args[2] }; },
      WaterSourceValidationError: class extends Error {},
      WaterSourceNotFoundError: class extends Error {},
    },
  });

  const response = await route.PATCH({ json: async () => ({ id: "source-1", exactLocation: "Poblacion 2", quantity: 2, latitude: 1 }) });

  assert.equal(response.status, 200);
  assert.deepEqual(update.slice(0, 3), ["admin-1", "hamtic-id", "source-1"]);
});

test("provincial PATCH sends only an authenticated provincial coordinate edit", async () => {
  let update;
  const route = loadServerModule("app/api/provincial-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/provincial-bfp/auth": {
      requireProvincialBfp: async () => ({ userId: "province-1" }),
      isProvincialAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listProvincialWaterSources: async () => ({ municipalities: [], sources: [] }),
      updateProvincialWaterSourceCoordinates: async (...args) => { update = args; return { id: args[1] }; },
      WaterSourceValidationError: class extends Error {},
      WaterSourceNotFoundError: class extends Error {},
    },
  });

  const response = await route.PATCH({ json: async () => ({ id: "source-1", latitude: 10.7, longitude: 121.98, exactLocation: "Forbidden" }) });

  assert.equal(response.status, 200);
  assert.deepEqual(update.slice(0, 2), ["province-1", "source-1"]);
});

test("provincial PATCH maps a coordinate collision to a safe conflict", async () => {
  const route = loadServerModule("app/api/provincial-bfp/water-sources/route.ts", {
    "next/server": nextServer,
    "../../../../lib/provincial-bfp/auth": {
      requireProvincialBfp: async () => ({ userId: "province-1" }),
      isProvincialAuthorizationResponse: () => false,
    },
    "../../../../lib/water-sources/service": {
      listProvincialWaterSources: async () => ({ municipalities: [], sources: [] }),
      updateProvincialWaterSourceCoordinates: async () => {
        throw Object.assign(new Error("private SQL"), { code: "23505" });
      },
      WaterSourceValidationError: class extends Error {},
      WaterSourceNotFoundError: class extends Error {},
    },
  });

  const response = await route.PATCH({ json: async () => ({ id: "source-1", latitude: 10.7, longitude: 121.98 }) });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, "Another water source already uses this location and coordinates.");
  assert.equal(JSON.stringify(response.body).includes("private SQL"), false);
});
