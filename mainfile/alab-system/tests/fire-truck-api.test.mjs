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

class FireTruckValidationError extends Error {
  constructor(issues) {
    super("Check the highlighted fire truck fields.");
    this.code = "INVALID_FIRE_TRUCK_INPUT";
    this.issues = issues;
  }
}
class FireTruckStationNotFoundError extends Error {
  constructor() {
    super("Choose an active station in the selected municipality.");
    this.code = "FIRE_TRUCK_STATION_NOT_FOUND";
  }
}

function provincialRoute(service) {
  return loadServerModule("app/api/provincial-bfp/fire-trucks/route.ts", {
    "next/server": nextServer,
    "../../../../lib/provincial-bfp/auth": {
      requireProvincialBfp: async () => ({ userId: "provincial-1", role: "PROVINCIAL_BFP" }),
      isProvincialAuthorizationResponse: () => false,
    },
    "../../../../lib/fire-trucks/service": {
      listProvincialFireTrucks: async () => ({ municipalities: [], stations: [], trucks: [] }),
      createProvincialFireTruck: async () => ({ id: "truck-1" }),
      FireTruckValidationError,
      FireTruckStationNotFoundError,
      ...service,
    },
  });
}

test("municipal GET loads only the signed-in municipality", async () => {
  let requested = "";
  const route = loadServerModule("app/api/municipal-bfp/fire-trucks/route.ts", {
    "next/server": nextServer,
    "../../../../lib/municipal-bfp/auth": {
      requireMunicipalBfp: async () => ({ municipalityId: "sanjose-id", municipalityName: "San Jose de Buenavista" }),
      isAuthorizationResponse: () => false,
    },
    "../../../../lib/fire-trucks/service": {
      listMunicipalFireTrucks: async (municipalityId) => {
        requested = municipalityId;
        return { municipality: { id: municipalityId, name: "", incomeClass: "1st" }, summary: {}, stations: [], trucks: [{ id: "a" }] };
      },
    },
  });
  const response = await route.GET({});
  assert.equal(requested, "sanjose-id");
  assert.equal(response.status, 200);
  assert.equal(response.body.municipality.name, "San Jose de Buenavista");
  assert.equal(route.POST, undefined);
});

test("provincial POST records the signed-in provincial user as the actor", async () => {
  let creation;
  const route = provincialRoute({
    createProvincialFireTruck: async (actorUserId, raw) => {
      creation = { actorUserId, raw };
      return { id: "truck-1" };
    },
  });
  const response = await route.POST({ json: async () => ({ make: "Isuzu FVR34", actorUserId: "someone-else" }) });
  assert.equal(response.status, 201);
  assert.equal(creation.actorUserId, "provincial-1");
  assert.equal(response.body.truck.id, "truck-1");
});

test("provincial POST returns field issues for invalid input", async () => {
  const route = provincialRoute({
    createProvincialFireTruck: async () => {
      throw new FireTruckValidationError({ make: "Enter a make between 2 and 120 characters." });
    },
  });
  const response = await route.POST({ json: async () => ({}) });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body.issues, { make: "Enter a make between 2 and 120 characters." });
});

test("provincial POST rejects a station outside the municipality and malformed JSON", async () => {
  const route = provincialRoute({
    createProvincialFireTruck: async () => {
      throw new FireTruckStationNotFoundError();
    },
  });
  const wrongStation = await route.POST({ json: async () => ({}) });
  assert.equal(wrongStation.status, 400);
  assert.equal(wrongStation.body.code, "FIRE_TRUCK_STATION_NOT_FOUND");

  const malformed = await route.POST({ json: async () => { throw new SyntaxError("bad"); } });
  assert.equal(malformed.status, 400);
});
