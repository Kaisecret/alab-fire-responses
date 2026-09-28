import assert from "node:assert/strict";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

test("mobile BFP identity includes the assigned active station coordinates", async () => {
  let sql = "";
  const accounts = loadServerModule("lib/auth/bfp-accounts.ts", {
    "../db": {
      getDatabase: () => ({
        query: async (statement) => {
          sql = statement;
          return { rows: [{
            userId: "responder", role: "MUNICIPAL_BFP", accountStatus: "ACTIVE",
            municipalityId: "belison", stationName: "Belison Fire Station",
            stationLatitude: 10.8306, stationLongitude: 121.9631,
          }] };
        },
      }),
    },
    "./password": {},
    "../notifications/service": {},
  });

  const identity = await accounts.getBfpIdentity("responder");
  assert.equal(identity.stationLatitude, 10.8306);
  assert.equal(identity.stationLongitude, 121.9631);
  assert.match(sql, /s\.latitude::float as "stationLatitude"/);
  assert.match(sql, /s\.longitude::float as "stationLongitude"/);
  assert.match(sql, /s\.status = 'ACTIVE'/);
});

test("mobile session response sends the station position to the phone", () => {
  const auth = loadServerModule("lib/auth/mobile-bfp.ts", {
    "next/server": { NextResponse: class {} },
    "./session": {},
  });
  const identity = auth.mobileBfpIdentity({
    userId: "responder", municipalityId: "belison", stationName: "Belison Fire Station",
    stationLatitude: 10.8306, stationLongitude: 121.9631,
  });
  assert.equal(identity.stationLatitude, 10.8306);
  assert.equal(identity.stationLongitude, 121.9631);
});
